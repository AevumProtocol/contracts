// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {PullOracleConsumerStandard} from "./atlas-oracle/PullOracleConsumerStandard.sol";

interface IAgentIdentity {
    function getAgentByAddress(address agentAddress) external view returns (uint256);
    function addPerformanceCert(uint256 agentId, bytes32 certHash, string calldata metadataURI) external;
}

/// @title VerifiableBacktestOracle v2 — Atlas Oracle pull mode integration
/// @notice VBO pipeline: commit → forward window → attest with Atlas-verified prices → certificate
/// @dev Inherits PullOracleConsumerStandard from Atlas Oracle. Prices come from transaction calldata
///      appended by the TypeScript SDK — no external contract calls, no ETH fee, minimal gas.
contract VerifiableBacktestOracleV2 is PullOracleConsumerStandard {

    // BTC/USD feed ID — Atlas Oracle Feed #626, confirmed by Leonarda August 25 2026
    // 626 decimal = 0x00000272 hex
    bytes4 internal constant BTC_USD_FEED_ID = 0x00000272;

    // Atlas Oracle authorized signer (production key from docs)
    address internal constant ATLAS_SIGNER = 0x59eD4701224fD9e2a85Ef2946c2ab828C1dDC600;

    // Price staleness: 5 minutes for VBO (generous — commits don't need HFT freshness)
    uint256 internal constant MAX_PRICE_DELAY = 300;
    uint256 internal constant MAX_FUTURE_DRIFT = 60;
    uint256 internal constant MAX_PACKAGE_COUNT = 10;

    address public owner;
    bool private _locked; // M-06: reentrancy guard
    IAgentIdentity public immutable agentIdentity;

    uint256 public commitmentBond = 0.001 ether;
    uint256 public minForwardWindow = 7 days;
    uint256 public maxForwardWindow = 90 days;
    uint256 public maxCommitmentsPerWindow = 3;
    uint256 public constant windowTrackingPeriod = 30 days;

    uint256 public certificateCount;
    uint256 public commitmentCount;

    enum CommitmentStatus { Pending, Revealed, Slashed }
    enum RegimeType { Bull, Bear, Chop, Neutral, Unknown }

    struct Commitment {
        address submitter;
        bytes32 strategyHash;
        uint256 commitBlock;
        uint256 commitTimestamp;
        uint256 windowStart;
        uint256 windowEnd;
        uint256 bondAmount;
        // Atlas-verified price at commit (18 decimals, 0 if Atlas payload not provided)
        uint256 priceAtCommit;
        uint256 priceAtCommitTimestamp;
        CommitmentStatus status;
        uint256 certificateId;
    }

    struct Certificate {
        uint256 id;
        uint256 commitmentId;
        address agent;
        uint256 agentId;
        bytes32 strategyHash;
        bytes32 resultsHash;
        uint256 windowStart;
        uint256 windowEnd;
        uint256 issuedAt;
        RegimeType regime;
        int256 returnBps;
        // Atlas-verified prices (18 decimals)
        uint256 priceAtCommit;
        uint256 priceAtWindowEnd;
        bool atlasVerified;  // H-04: true if both commit and attest prices came from Atlas Oracle
        uint256 submissionCount;
        string metadataURI;
        string attestationNote;
        bool revoked;
    }

    mapping(uint256 => Commitment) public commitments;
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256) public identityWindowStart;
    mapping(address => uint256) public identityCommitmentCount;
    mapping(address => bool) public approvedAttestors;

    event StrategyCommitted(
        uint256 indexed commitmentId,
        address indexed submitter,
        bytes32 strategyHash,
        uint256 windowEnd,
        uint256 bond,
        uint256 priceAtCommit
    );
    event CertificateIssued(
        uint256 indexed certificateId,
        uint256 indexed commitmentId,
        address indexed agent,
        bytes32 strategyHash,
        int256 returnBps,
        RegimeType regime,
        uint256 priceAtCommit,
        uint256 priceAtWindowEnd
    );
    event CommitmentSlashed(uint256 indexed commitmentId, address indexed submitter, uint256 bondSlashed);
    event CertificateRevoked(uint256 indexed certificateId, string reason);
    event AttestorAdded(address indexed attestor);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    modifier onlyAttestor() { require(approvedAttestors[msg.sender], "Not approved attestor"); _; }

    // ─── Atlas Oracle hook overrides ───────────────────────────────────────────

    function _isAuthorizedSigner(address recoveredSigner) internal pure override returns (bool) {
        return recoveredSigner == ATLAS_SIGNER;
    }

    function _validateTimestamp(bytes4 /*feedId*/, uint256 parsedAggregateTimestamp) internal view override {
        require(parsedAggregateTimestamp + MAX_PRICE_DELAY >= block.timestamp, "Atlas price too stale");
        require(parsedAggregateTimestamp <= block.timestamp + MAX_FUTURE_DRIFT, "Atlas price too far in future");
    }

    function _getMaxPackageCount() internal pure override returns (uint256) {
        return MAX_PACKAGE_COUNT;
    }

    // ──────────────────────────────────────────────────────────────────────────

    constructor(address _agentIdentityAddress) {
        require(_agentIdentityAddress != address(0), "Invalid AgentIdentity address");
        owner = msg.sender;
        agentIdentity = IAgentIdentity(_agentIdentityAddress);
        approvedAttestors[msg.sender] = true;
        emit AttestorAdded(msg.sender);
    }

    /// @notice Commit strategy hash. If Atlas SDK appends BTC/USD price payload to calldata,
    ///         the price is verified and stored on the commitment. Otherwise price is 0 (graceful fallback).
    function commitStrategy(
        bytes32 strategyHash,
        uint256 forwardWindowDays
    ) external payable returns (uint256) {
        require(strategyHash != bytes32(0), "Invalid strategy hash");
        require(forwardWindowDays * 1 days >= minForwardWindow, "Window too short");
        require(forwardWindowDays * 1 days <= maxForwardWindow, "Window too long");
        require(msg.value >= commitmentBond, "Insufficient bond");

        // Fix M-01: check agent registration at commit time, not just at attest time
        // Prevents users from bonding ETH they can never recover via attestation
        require(agentIdentity.getAgentByAddress(msg.sender) != 0, "Must register agent before committing");

        // Anti-shotgun: max 3 commitments per 30-day window
        if (block.timestamp >= identityWindowStart[msg.sender] + windowTrackingPeriod) {
            identityWindowStart[msg.sender] = block.timestamp;
            identityCommitmentCount[msg.sender] = 0;
        }
        require(identityCommitmentCount[msg.sender] < maxCommitmentsPerWindow, "Exceeded max commitments");

        // CEI: update state before any external interactions
        identityCommitmentCount[msg.sender]++;
        commitmentCount++;
        uint256 newCommitmentId = commitmentCount;

        // Try to get Atlas price from calldata (lenient — returns 0,0 if not present)
        uint256 priceAtCommit = 0;
        uint256 priceTimestamp = block.timestamp;
        (uint256 atlasPrice, uint256 atlasTimestamp) = _getVerifiedFeedDataLenient(BTC_USD_FEED_ID);
        if (atlasTimestamp != 0) {
            priceAtCommit = atlasPrice;
            priceTimestamp = atlasTimestamp;
        }

        uint256 windowEnd = block.timestamp + (forwardWindowDays * 1 days);
        uint256 excess = msg.value - commitmentBond;

        commitments[newCommitmentId] = Commitment({
            submitter: msg.sender,
            strategyHash: strategyHash,
            commitBlock: block.number,
            commitTimestamp: block.timestamp,
            windowStart: block.timestamp,
            windowEnd: windowEnd,
            bondAmount: commitmentBond,
            priceAtCommit: priceAtCommit,
            priceAtCommitTimestamp: priceTimestamp,
            status: CommitmentStatus.Pending,
            certificateId: 0
        });

        if (excess > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Excess refund failed");
        }

        emit StrategyCommitted(newCommitmentId, msg.sender, strategyHash, windowEnd, commitmentBond, priceAtCommit);
        return newCommitmentId;
    }

    /// @notice Attest results after window closes.
    ///         If Atlas SDK appends BTC/USD price payload to calldata, price is verified and stored on certificate.
    function revealAndAttest(
        uint256 commitmentId,
        bytes32 resultsHash,
        int256 returnBps,
        RegimeType regime,
        string calldata metadataURI,
        string calldata attestationNote
    ) external onlyAttestor returns (uint256) {  // L-06: not payable, no ETH needed
        Commitment storage commitment = commitments[commitmentId];
        require(commitment.submitter != address(0), "Commitment not found");
        require(commitment.status == CommitmentStatus.Pending, "Not pending");
        require(block.timestamp >= commitment.windowEnd, "Window not closed");
        require(resultsHash != bytes32(0), "Invalid results hash");

        uint256 agentId = agentIdentity.getAgentByAddress(commitment.submitter);
        require(agentId != 0, "Submitter has no registered agent");

        // CEI: update all state before external calls
        commitment.status = CommitmentStatus.Revealed;
        uint256 bondToReturn = commitment.bondAmount;
        commitment.bondAmount = 0;
        certificateCount++;
        uint256 certId = certificateCount;
        commitment.certificateId = certId;

        // Try to get Atlas price at window end from calldata (lenient)
        uint256 priceAtWindowEnd = 0;
        (uint256 atlasPrice, uint256 atlasTimestamp) = _getVerifiedFeedDataLenient(BTC_USD_FEED_ID);
        if (atlasTimestamp != 0) {
            priceAtWindowEnd = atlasPrice;
        }

        certificates[certId] = Certificate({
            id: certId,
            commitmentId: commitmentId,
            agent: commitment.submitter,
            agentId: agentId,
            strategyHash: commitment.strategyHash,
            resultsHash: resultsHash,
            windowStart: commitment.windowStart,
            windowEnd: commitment.windowEnd,
            issuedAt: block.timestamp,
            regime: regime,
            returnBps: returnBps,
            priceAtCommit: commitment.priceAtCommit,
            priceAtWindowEnd: priceAtWindowEnd,
            atlasVerified: (commitment.priceAtCommit != 0 && priceAtWindowEnd != 0),  // H-04
            submissionCount: identityCommitmentCount[commitment.submitter],
            metadataURI: metadataURI,
            attestationNote: attestationNote,
            revoked: false
        });

        bytes32 certHash = keccak256(abi.encodePacked(certId, commitment.strategyHash, resultsHash));
        agentIdentity.addPerformanceCert(agentId, certHash, metadataURI);

        emit CertificateIssued(certId, commitmentId, commitment.submitter, commitment.strategyHash, returnBps, regime, commitment.priceAtCommit, priceAtWindowEnd);

        // Return bond after all state updates and events
        if (bondToReturn > 0) {
            (bool success, ) = payable(commitment.submitter).call{value: bondToReturn}("");
            require(success, "Bond refund failed");
        }

        return certId;
    }

    function slashExpired(uint256 commitmentId) external {
        Commitment storage commitment = commitments[commitmentId];
        require(commitment.status == CommitmentStatus.Pending, "Not pending");
        require(block.timestamp >= commitment.windowEnd + 30 days, "Grace period not expired");
        uint256 bond = commitment.bondAmount;
        commitment.status = CommitmentStatus.Slashed;
        commitment.bondAmount = 0;
        emit CommitmentSlashed(commitmentId, commitment.submitter, bond);
    }

    function revokeCertificate(uint256 certificateId, string calldata reason) external onlyOwner {
        require(!certificates[certificateId].revoked, "Already revoked");
        certificates[certificateId].revoked = true;
        emit CertificateRevoked(certificateId, reason);
    }

    function addAttestor(address attestor) external onlyOwner {
        approvedAttestors[attestor] = true;
        emit AttestorAdded(attestor);
    }

    function getCertificate(uint256 certId) external view returns (Certificate memory) {
        return certificates[certId];
    }

    function getCommitment(uint256 commitmentId) external view returns (Commitment memory) {
        return commitments[commitmentId];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

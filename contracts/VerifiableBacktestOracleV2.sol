// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IAtlasOracle.sol";

interface IAgentIdentity {
    function getAgentByAddress(address agentAddress) external view returns (uint256);
    function addPerformanceCert(uint256 agentId, bytes32 certHash, string calldata metadataURI) external;
}

/// @title VerifiableBacktestOracle v2 — with Atlas Oracle price attestation
/// @notice VBO pipeline: commit → forward window → attest with verified price feeds → certificate
/// @dev Atlas pull feed integration: prices are submitted by caller from Atlas API at commit and attest time
contract VerifiableBacktestOracleV2 {

    address public owner;
    IAgentIdentity public immutable agentIdentity;
    IAtlasOracle public atlasOracle;

    // BTC/USD feed ID on Atlas
    bytes32 public constant BTC_USD_FEED_ID = keccak256("BTC/USD");

    // Minimum Atlas ConsensusScore to accept a price (0-100)
    uint256 public minConsensusScore = 70;

    // Max price staleness at commit/attest time (seconds)
    uint256 public maxPriceStaleness = 300; // 5 minutes

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
        // Atlas-attested price at commit
        int256 priceAtCommit;
        uint256 priceAtCommitTimestamp;
        uint256 consensusScoreAtCommit;
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
        // Atlas-attested prices
        int256 priceAtCommit;
        int256 priceAtWindowEnd;
        uint256 consensusScoreAtCommit;
        uint256 consensusScoreAtWindowEnd;
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
        int256 priceAtCommit,
        uint256 consensusScore
    );
    event CertificateIssued(
        uint256 indexed certificateId,
        uint256 indexed commitmentId,
        address indexed agent,
        bytes32 strategyHash,
        int256 returnBps,
        RegimeType regime,
        int256 priceAtCommit,
        int256 priceAtWindowEnd
    );
    event AtlasOracleUpdated(address newOracle);
    event MinConsensusScoreUpdated(uint256 newScore);
    event CommitmentSlashed(uint256 indexed commitmentId, address indexed submitter, uint256 bondSlashed);
    event CertificateRevoked(uint256 indexed certificateId, string reason);
    event AttestorAdded(address indexed attestor);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAttestor() {
        require(approvedAttestors[msg.sender], "Not an approved attestor");
        _;
    }

    constructor(address _agentIdentityAddress, address _atlasOracleAddress) {
        require(_agentIdentityAddress != address(0), "Invalid AgentIdentity address");
        owner = msg.sender;
        agentIdentity = IAgentIdentity(_agentIdentityAddress);

        // Atlas oracle is optional at deploy — can be set later when integration materials arrive
        if (_atlasOracleAddress != address(0)) {
            atlasOracle = IAtlasOracle(_atlasOracleAddress);
        }

        approvedAttestors[msg.sender] = true;
        emit AttestorAdded(msg.sender);
    }

    /// @notice Commit strategy hash with Atlas-verified BTC price at commit block
    /// @param strategyHash keccak256 of strategy description
    /// @param forwardWindowDays Length of forward window in days
    /// @param atlasPriceUpdate Signed price update bytes from Atlas API (pass empty bytes if Atlas not yet integrated)
    function commitStrategy(
        bytes32 strategyHash,
        uint256 forwardWindowDays,
        bytes calldata atlasPriceUpdate
    ) external payable returns (uint256) {
        require(strategyHash != bytes32(0), "Invalid strategy hash");
        require(forwardWindowDays * 1 days >= minForwardWindow, "Window too short");
        require(forwardWindowDays * 1 days <= maxForwardWindow, "Window too long");
        require(msg.value >= commitmentBond, "Insufficient bond");

        // Anti-shotgun
        if (block.timestamp >= identityWindowStart[msg.sender] + windowTrackingPeriod) {
            identityWindowStart[msg.sender] = block.timestamp;
            identityCommitmentCount[msg.sender] = 0;
        }
        require(identityCommitmentCount[msg.sender] < maxCommitmentsPerWindow, "Exceeded max commitments per window");

        // CEI: update state BEFORE any external calls
        identityCommitmentCount[msg.sender]++;
        commitmentCount++;

        // Get Atlas price at commit (optional — graceful fallback if not yet integrated)
        int256 priceAtCommit = 0;
        uint256 priceTimestamp = block.timestamp;
        uint256 consensusScore = 0;

        if (address(atlasOracle) != address(0) && atlasPriceUpdate.length > 0) {
            uint256 updateFee = atlasOracle.getUpdateFee(new bytes[](1));
            IAtlasOracle.PriceData memory priceData = atlasOracle.updateAndGetPrice{value: updateFee}(atlasPriceUpdate);
            require(priceData.consensusScore >= minConsensusScore, "Atlas consensus score too low");
            require(block.timestamp - priceData.timestamp <= maxPriceStaleness, "Atlas price too stale");
            priceAtCommit = priceData.price;
            priceTimestamp = priceData.timestamp;
            consensusScore = priceData.consensusScore;
        }

        uint256 windowEnd = block.timestamp + (forwardWindowDays * 1 days);
        uint256 excess = msg.value - commitmentBond;

        commitments[commitmentCount] = Commitment({
            submitter: msg.sender,
            strategyHash: strategyHash,
            commitBlock: block.number,
            commitTimestamp: block.timestamp,
            windowStart: block.timestamp,
            windowEnd: windowEnd,
            bondAmount: commitmentBond,
            priceAtCommit: priceAtCommit,
            priceAtCommitTimestamp: priceTimestamp,
            consensusScoreAtCommit: consensusScore,
            status: CommitmentStatus.Pending,
            certificateId: 0
        });

        // Refund excess
        if (excess > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Excess refund failed");
        }

        emit StrategyCommitted(commitmentCount, msg.sender, strategyHash, windowEnd, commitmentBond, priceAtCommit, consensusScore);
        return commitmentCount;
    }

    /// @notice Attest results after window closes, with Atlas-verified BTC price at window end
    /// @param commitmentId The commitment to attest
    /// @param resultsHash keccak256 of results JSON
    /// @param returnBps TWR in basis points
    /// @param regime Market regime during window
    /// @param metadataURI IPFS/Arweave URI for full results
    /// @param attestationNote Human-readable attestation note
    /// @param atlasPriceUpdate Signed price update bytes from Atlas API (pass empty bytes if not yet integrated)
    function revealAndAttest(
        uint256 commitmentId,
        bytes32 resultsHash,
        int256 returnBps,
        RegimeType regime,
        string calldata metadataURI,
        string calldata attestationNote,
        bytes calldata atlasPriceUpdate
    ) external payable onlyAttestor returns (uint256) {
        Commitment storage commitment = commitments[commitmentId];
        require(commitment.submitter != address(0), "Commitment not found");
        require(commitment.status == CommitmentStatus.Pending, "Not pending");
        require(block.timestamp >= commitment.windowEnd, "Window not closed");
        require(resultsHash != bytes32(0), "Invalid results hash");

        uint256 agentId = agentIdentity.getAgentByAddress(commitment.submitter);
        require(agentId != 0, "Submitter has no registered agent");

        // CEI: update ALL state BEFORE any external calls
        commitment.status = CommitmentStatus.Revealed;
        uint256 bondToReturn = commitment.bondAmount;
        commitment.bondAmount = 0;
        certificateCount++;
        uint256 certId = certificateCount;
        commitment.certificateId = certId;

        // Get Atlas price at window end (optional) — state already updated above
        int256 priceAtWindowEnd = 0;
        uint256 consensusScoreAtWindowEnd = 0;

        if (address(atlasOracle) != address(0) && atlasPriceUpdate.length > 0) {
            uint256 updateFee = atlasOracle.getUpdateFee(new bytes[](1));
            IAtlasOracle.PriceData memory priceData = atlasOracle.updateAndGetPrice{value: updateFee}(atlasPriceUpdate);
            require(priceData.consensusScore >= minConsensusScore, "Atlas consensus score too low");
            require(block.timestamp - priceData.timestamp <= maxPriceStaleness, "Atlas price too stale");
            priceAtWindowEnd = priceData.price;
            consensusScoreAtWindowEnd = priceData.consensusScore;
        }

        // Issue certificate — certId already set above in CEI block

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
            consensusScoreAtCommit: commitment.consensusScoreAtCommit,
            consensusScoreAtWindowEnd: consensusScoreAtWindowEnd,
            submissionCount: identityCommitmentCount[commitment.submitter],
            metadataURI: metadataURI,
            attestationNote: attestationNote,
            revoked: false
        });

        bytes32 certHash = keccak256(abi.encodePacked(certId, commitment.strategyHash, resultsHash));
        agentIdentity.addPerformanceCert(agentId, certHash, metadataURI);

        // Emit before external call
        emit CertificateIssued(certId, commitmentId, commitment.submitter, commitment.strategyHash, returnBps, regime, commitment.priceAtCommit, priceAtWindowEnd);

        // Return bond
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

    function setAtlasOracle(address _atlasOracle) external onlyOwner {
        atlasOracle = IAtlasOracle(_atlasOracle);
        emit AtlasOracleUpdated(_atlasOracle);
    }

    function setMinConsensusScore(uint256 _score) external onlyOwner {
        require(_score <= 100, "Score out of range");
        minConsensusScore = _score;
        emit MinConsensusScoreUpdated(_score);
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

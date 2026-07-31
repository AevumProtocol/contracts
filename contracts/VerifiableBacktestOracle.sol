// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAgentIdentity {
    function getAgentByAddress(address agentAddress) external view returns (uint256);
    function addPerformanceCert(uint256 agentId, bytes32 certHash, string calldata metadataURI) external;
}

contract VerifiableBacktestOracle {

    address public owner;
    IAgentIdentity public immutable agentIdentity;

    // Commitment bond in ETH — burned on non-reveal
    uint256 public commitmentBond = 0.001 ether;

    // Forward window duration
    uint256 public minForwardWindow = 7 days;
    uint256 public maxForwardWindow = 90 days;

    // Max commitments per identity per window (anti-shotgun)
    uint256 public maxCommitmentsPerWindow = 3;
    uint256 public windowTrackingPeriod = 30 days;

    uint256 public certificateCount;

    enum CommitmentStatus { Pending, Revealed, Expired, Slashed }
    enum RegimeType { Bull, Bear, Chop, Mixed, Unknown }

    struct Commitment {
        address submitter;
        bytes32 strategyHash;       // keccak256 of strategy logic
        uint256 commitBlock;
        uint256 commitTimestamp;
        uint256 windowStart;        // = commitTimestamp (locked at commit)
        uint256 windowEnd;          // commitTimestamp + forwardWindow
        uint256 bondAmount;
        CommitmentStatus status;
        uint256 certificateId;      // 0 if not yet issued
    }

    struct Certificate {
        uint256 id;
        uint256 commitmentId;
        address agent;
        uint256 agentId;
        bytes32 strategyHash;
        bytes32 resultsHash;        // keccak256 of replay results
        uint256 windowStart;
        uint256 windowEnd;
        uint256 issuedAt;
        RegimeType regime;
        int256 returnBps;           // return in basis points (e.g. 523 = 5.23%)
        uint256 submissionCount;    // how many strategies this identity submitted this window
        string metadataURI;         // IPFS/Arweave link to full results JSON
        string attestationNote;     // e.g. "founder-attested, permissioned phase v1"
        bool revoked;
    }

    mapping(uint256 => Commitment) public commitments;
    mapping(uint256 => Certificate) public certificates;

    // Per-identity commitment tracking for anti-shotgun
    mapping(address => uint256) public identityWindowStart;
    mapping(address => uint256) public identityCommitmentCount;

    // Approved attestors (initially just owner/deployer)
    mapping(address => bool) public approvedAttestors;

    uint256 public commitmentCount;

    event StrategyCommitted(
        uint256 indexed commitmentId,
        address indexed submitter,
        bytes32 strategyHash,
        uint256 windowEnd,
        uint256 bond
    );
    event CommitmentRevealed(
        uint256 indexed commitmentId,
        bytes32 resultsHash,
        int256 returnBps,
        RegimeType regime
    );
    event CertificateIssued(
        uint256 indexed certificateId,
        uint256 indexed commitmentId,
        address indexed agent,
        bytes32 strategyHash,
        int256 returnBps,
        RegimeType regime
    );
    event CommitmentExpired(uint256 indexed commitmentId, address indexed submitter, uint256 bondSlashed);
    event CommitmentSlashed(uint256 indexed commitmentId, address indexed submitter, uint256 bondSlashed);
    event CertificateRevoked(uint256 indexed certificateId, string reason);
    event AttestorAdded(address indexed attestor);
    event AttestorRemoved(address indexed attestor);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAttestor() {
        require(approvedAttestors[msg.sender], "Not an approved attestor");
        _;
    }

    constructor(address _agentIdentityAddress) {
        require(_agentIdentityAddress != address(0), "Invalid address");
        owner = msg.sender;
        agentIdentity = IAgentIdentity(_agentIdentityAddress);
        approvedAttestors[msg.sender] = true;
        emit AttestorAdded(msg.sender);
    }

    // Step 1: Submit strategy hash and bond
    function commitStrategy(
        bytes32 strategyHash,
        uint256 forwardWindowDays
    ) external payable returns (uint256) {
        require(strategyHash != bytes32(0), "Invalid strategy hash");
        require(
            forwardWindowDays * 1 days >= minForwardWindow,
            "Forward window too short"
        );
        require(
            forwardWindowDays * 1 days <= maxForwardWindow,
            "Forward window too long"
        );
        require(msg.value >= commitmentBond, "Insufficient bond");

        // Anti-shotgun: reset counter if outside tracking window
        if (block.timestamp >= identityWindowStart[msg.sender] + windowTrackingPeriod) {
            identityWindowStart[msg.sender] = block.timestamp;
            identityCommitmentCount[msg.sender] = 0;
        }
        require(
            identityCommitmentCount[msg.sender] < maxCommitmentsPerWindow,
            "Exceeded max commitments per window"
        );

        identityCommitmentCount[msg.sender]++;
        commitmentCount++;

        uint256 windowEnd = block.timestamp + (forwardWindowDays * 1 days);

        commitments[commitmentCount] = Commitment({
            submitter: msg.sender,
            strategyHash: strategyHash,
            commitBlock: block.number,
            commitTimestamp: block.timestamp,
            windowStart: block.timestamp,
            windowEnd: windowEnd,
            bondAmount: msg.value,
            status: CommitmentStatus.Pending,
            certificateId: 0
        });

        emit StrategyCommitted(commitmentCount, msg.sender, strategyHash, windowEnd, msg.value);
        return commitmentCount;
    }

    // Step 2: After window closes, reveal results (off-chain replay, on-chain attestation)
    // Only approved attestors can reveal — in v1 this is the founder
    function revealAndAttest(
        uint256 commitmentId,
        bytes32 resultsHash,
        int256 returnBps,
        RegimeType regime,
        string calldata metadataURI,
        string calldata attestationNote
    ) external onlyAttestor returns (uint256) {
        Commitment storage commitment = commitments[commitmentId];
        require(commitment.submitter != address(0), "Commitment not found");
        require(commitment.status == CommitmentStatus.Pending, "Commitment not pending");
        require(block.timestamp >= commitment.windowEnd, "Forward window not closed");
        require(resultsHash != bytes32(0), "Invalid results hash");

        // Get agent ID
        uint256 agentId = agentIdentity.getAgentByAddress(commitment.submitter);
        require(agentId != 0, "Submitter has no registered agent");

        // Mark commitment as revealed
        commitment.status = CommitmentStatus.Revealed;

        // Issue certificate
        certificateCount++;
        uint256 certId = certificateCount;

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
            submissionCount: identityCommitmentCount[commitment.submitter],
            metadataURI: metadataURI,
            attestationNote: attestationNote,
            revoked: false
        });

        commitment.certificateId = certId;

        // Add performance cert to AgentIdentity
        bytes32 certHash = keccak256(abi.encodePacked(certId, commitment.strategyHash, resultsHash));
        agentIdentity.addPerformanceCert(agentId, certHash, metadataURI);

        // Return bond to submitter
        if (commitment.bondAmount > 0) {
            (bool success, ) = payable(commitment.submitter).call{value: commitment.bondAmount}("");
            require(success, "Bond refund failed");
        }

        emit CommitmentRevealed(commitmentId, resultsHash, returnBps, regime);
        emit CertificateIssued(certId, commitmentId, commitment.submitter, commitment.strategyHash, returnBps, regime);

        return certId;
    }

    // Slash expired commitment bonds (non-reveal by deadline)
    function slashExpired(uint256 commitmentId) external {
        Commitment storage commitment = commitments[commitmentId];
        require(commitment.status == CommitmentStatus.Pending, "Not pending");
        require(
            block.timestamp >= commitment.windowEnd + 30 days,
            "Grace period not expired"
        );

        uint256 bond = commitment.bondAmount;
        commitment.status = CommitmentStatus.Slashed;
        commitment.bondAmount = 0;

        // Bond burned — sent to zero address equivalent (contract holds it)
        emit CommitmentSlashed(commitmentId, commitment.submitter, bond);
    }

    function revokeCertificate(uint256 certificateId, string calldata reason) external onlyOwner {
        require(!certificates[certificateId].revoked, "Already revoked");
        certificates[certificateId].revoked = true;
        emit CertificateRevoked(certificateId, reason);
    }

    function addAttestor(address attestor) external onlyOwner {
        require(attestor != address(0), "Invalid address");
        approvedAttestors[attestor] = true;
        emit AttestorAdded(attestor);
    }

    function removeAttestor(address attestor) external onlyOwner {
        approvedAttestors[attestor] = false;
        emit AttestorRemoved(attestor);
    }

    function setCommitmentBond(uint256 newBond) external onlyOwner {
        commitmentBond = newBond;
    }

    function setMaxCommitmentsPerWindow(uint256 newMax) external onlyOwner {
        require(newMax > 0, "Must allow at least 1");
        maxCommitmentsPerWindow = newMax;
    }

    function setForwardWindowLimits(uint256 minDays, uint256 maxDays) external onlyOwner {
        require(minDays >= 1, "Min too short");
        require(maxDays >= minDays, "Max must exceed min");
        minForwardWindow = minDays * 1 days;
        maxForwardWindow = maxDays * 1 days;
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

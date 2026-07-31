// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAgentIdentity {
    function updateReputation(uint256 agentId, uint256 newScore) external;
    function getAgentByAddress(address agentAddress) external view returns (uint256);
    function getAgent(uint256 agentId) external view returns (AgentRecord memory);

    struct ExecutionPolicy {
        uint256 maxGasPerTx;
        uint256 dailySpendLimit;
        bool canInitiateTrades;
        bool canInteractWithProtocols;
    }

    struct PerformanceCert {
        bytes32 certHash;
        uint256 timestamp;
        address issuedBy;
        string metadataURI;
    }

    struct AgentRecord {
        address owner;
        bytes32 strategyHash;
        uint256 reputationScore;
        uint256 registeredAt;
        bool isActive;
        ExecutionPolicy policy;
        PerformanceCert[] certs;
        string metadataURI;
    }
}

contract ReputationController {

    address public owner;
    IAgentIdentity public immutable agentIdentity;

    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant MIN_ORACLES = 2;
    uint256 public constant MAX_SCORE_DELTA = 200;

    uint256 public proposalExpiry = 7 days;
    uint256 public minVotingWindow = 1 hours;
    uint256 public timelockDelay = 24 hours;    // NEW: timelock before execution
    uint256 public challengeWindow = 12 hours;  // NEW: window to challenge after approval

    mapping(address => bool) public authorizedOracles;
    uint256 public oracleCount;

    // NEW: oracle admission timelock
    mapping(address => uint256) public oracleAdmissionTime;
    uint256 public oracleMaturityPeriod = 30 days;

    struct ReputationProposal {
        uint256 agentId;
        uint256 newScore;
        uint256 approvals;
        uint256 createdAt;
        uint256 approvedAt;     // NEW: when quorum was reached
        uint256 executeAfter;   // NEW: earliest execution time (approvedAt + timelockDelay)
        bool executed;
        bool cancelled;
        bool challenged;        // NEW: challenge flag
        mapping(address => bool) hasApproved;
    }

    uint256 public proposalCount;
    mapping(uint256 => ReputationProposal) public proposals;

    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event ProposalCreated(uint256 indexed proposalId, uint256 agentId, uint256 newScore);
    event ProposalApproved(uint256 indexed proposalId, address indexed oracle);
    event ProposalQueued(uint256 indexed proposalId, uint256 executeAfter);
    event ProposalExecuted(uint256 indexed proposalId, uint256 agentId, uint256 newScore);
    event ProposalCancelled(uint256 indexed proposalId);
    event ProposalChallenged(uint256 indexed proposalId, address indexed challenger);
    event ProposalExpiryUpdated(uint256 newExpiry);
    event MinVotingWindowUpdated(uint256 newWindow);
    event TimelockDelayUpdated(uint256 newDelay);
    event ChallengeWindowUpdated(uint256 newWindow);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        _;
    }

    modifier minimumOracles() {
        require(oracleCount >= MIN_ORACLES, "Minimum 2 oracles required");
        _;
    }

    modifier oracleMature() {
        require(
            block.timestamp >= oracleAdmissionTime[msg.sender] + oracleMaturityPeriod,
            "Oracle not yet mature: 30 day waiting period"
        );
        _;
    }

    constructor(
        address _agentIdentityAddress,
        address _oracle1,
        address _oracle2
    ) {
        require(_oracle1 != address(0) && _oracle2 != address(0), "Invalid oracle addresses");
        require(_oracle1 != _oracle2, "Oracles must be distinct");
        owner = msg.sender;
        agentIdentity = IAgentIdentity(_agentIdentityAddress);
        authorizedOracles[_oracle1] = true;
        authorizedOracles[_oracle2] = true;
        oracleAdmissionTime[_oracle1] = block.timestamp - 30 days; // bootstrap: founder oracle is immediately mature
        oracleAdmissionTime[_oracle2] = block.timestamp - 30 days; // bootstrap: second oracle immediately mature
        oracleCount = 2;
        emit OracleAdded(_oracle1);
        emit OracleAdded(_oracle2);
    }

    function requiredApprovals() public view returns (uint256) {
        return (oracleCount / 2) + 1;
    }

    function addOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid address");
        require(!authorizedOracles[oracle], "Already an oracle");
        authorizedOracles[oracle] = true;
        oracleAdmissionTime[oracle] = block.timestamp; // starts 30-day maturity clock
        oracleCount++;
        emit OracleAdded(oracle);
    }

    function removeOracle(address oracle) external onlyOwner {
        require(authorizedOracles[oracle], "Not an oracle");
        require(oracleCount > MIN_ORACLES, "Cannot drop below minimum oracles");
        authorizedOracles[oracle] = false;
        oracleCount--;
        emit OracleRemoved(oracle);
    }

    function proposeReputationUpdate(
        uint256 agentId,
        uint256 newScore
    ) external onlyOracle minimumOracles oracleMature returns (uint256) {
        require(newScore <= MAX_SCORE, "Score exceeds max");

        IAgentIdentity.AgentRecord memory agent = agentIdentity.getAgent(agentId);
        uint256 currentScore = agent.reputationScore;
        uint256 delta = newScore > currentScore
            ? newScore - currentScore
            : currentScore - newScore;
        require(delta <= MAX_SCORE_DELTA, "Score change exceeds max delta");

        proposalCount++;
        ReputationProposal storage proposal = proposals[proposalCount];
        proposal.agentId = agentId;
        proposal.newScore = newScore;
        proposal.approvals = 1;
        proposal.createdAt = block.timestamp;
        proposal.approvedAt = 0;
        proposal.executeAfter = 0;
        proposal.executed = false;
        proposal.cancelled = false;
        proposal.challenged = false;
        proposal.hasApproved[msg.sender] = true;

        emit ProposalCreated(proposalCount, agentId, newScore);
        return proposalCount;
    }

    function approveProposal(uint256 proposalId) external onlyOracle minimumOracles oracleMature {
        ReputationProposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(!proposal.challenged, "Proposal challenged");
        require(!proposal.hasApproved[msg.sender], "Already approved");
        require(
            block.timestamp <= proposal.createdAt + proposalExpiry,
            "Proposal expired"
        );
        require(
            block.timestamp >= proposal.createdAt + minVotingWindow,
            "Voting window not elapsed"
        );

        proposal.hasApproved[msg.sender] = true;
        proposal.approvals++;

        emit ProposalApproved(proposalId, msg.sender);

        // When quorum reached, start timelock - don't execute immediately
        if (proposal.approvals >= requiredApprovals() && proposal.approvedAt == 0) {
            proposal.approvedAt = block.timestamp;
            proposal.executeAfter = block.timestamp + timelockDelay;
            emit ProposalQueued(proposalId, proposal.executeAfter);
        }
    }

    // NEW: anyone can challenge a queued proposal during the challenge window
    function challengeProposal(uint256 proposalId) external {
        ReputationProposal storage proposal = proposals[proposalId];
        require(proposal.approvedAt != 0, "Proposal not yet queued");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Already cancelled");
        require(!proposal.challenged, "Already challenged");
        require(
            block.timestamp <= proposal.approvedAt + challengeWindow,
            "Challenge window closed"
        );
        // Only owner can adjudicate - challenger flags it, owner resolves
        require(
            msg.sender == owner || authorizedOracles[msg.sender],
            "Not authorized to challenge"
        );
        proposal.challenged = true;
        emit ProposalChallenged(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) external {
        ReputationProposal storage proposal = proposals[proposalId];
        require(proposal.approvals >= requiredApprovals(), "Insufficient approvals");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(!proposal.challenged, "Proposal challenged - owner must resolve");
        require(proposal.executeAfter != 0, "Not yet queued");
        require(block.timestamp >= proposal.executeAfter, "Timelock not elapsed");

        emit ProposalExecuted(proposalId, proposal.agentId, proposal.newScore);
        proposal.executed = true;
        agentIdentity.updateReputation(proposal.agentId, proposal.newScore);
    }

    function resolveChallenge(uint256 proposalId, bool uphold) external onlyOwner {
        ReputationProposal storage proposal = proposals[proposalId];
        require(proposal.challenged, "Not challenged");
        require(!proposal.executed, "Already executed");
        if (uphold) {
            // Challenge upheld - cancel the proposal
            proposal.cancelled = true;
            emit ProposalCancelled(proposalId);
        } else {
            // Challenge rejected - clear flag, reset timelock
            proposal.challenged = false;
            proposal.executeAfter = block.timestamp + timelockDelay;
            emit ProposalQueued(proposalId, proposal.executeAfter);
        }
    }

    function cancelProposal(uint256 proposalId) external {
        ReputationProposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Already cancelled");
        require(
            msg.sender == owner || authorizedOracles[msg.sender],
            "Not authorized"
        );
        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    function hasApproved(uint256 proposalId, address oracle) external view returns (bool) {
        return proposals[proposalId].hasApproved[oracle];
    }

    function isActive() external view returns (bool) {
        return oracleCount >= MIN_ORACLES;
    }

    function setProposalExpiry(uint256 newExpiry) external onlyOwner {
        require(newExpiry >= 1 days, "Expiry too short");
        proposalExpiry = newExpiry;
        emit ProposalExpiryUpdated(newExpiry);
    }

    function setMinVotingWindow(uint256 newWindow) external onlyOwner {
        minVotingWindow = newWindow;
        emit MinVotingWindowUpdated(newWindow);
    }

    function setTimelockDelay(uint256 newDelay) external onlyOwner {
        require(newDelay >= 1 hours, "Timelock too short");
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(newDelay);
    }

    function setChallengeWindow(uint256 newWindow) external onlyOwner {
        require(newWindow >= 1 hours, "Challenge window too short");
        challengeWindow = newWindow;
        emit ChallengeWindowUpdated(newWindow);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

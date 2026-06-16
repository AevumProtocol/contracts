// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentIdentity {
    function updateReputation(uint256 agentId, uint256 newScore) external;
    function getAgentByAddress(address agentAddress) external view returns (uint256);
}

contract ReputationController {

    address public owner;
    IAgentIdentity public agentIdentity;

    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant MIN_APPROVALS = 2;
    uint256 public constant MIN_ORACLES = 2;

    mapping(address => bool) public authorizedOracles;
    uint256 public oracleCount;

    struct ReputationProposal {
        uint256 agentId;
        uint256 newScore;
        uint256 approvals;
        bool executed;
        mapping(address => bool) hasApproved;
    }

    uint256 public proposalCount;
    mapping(uint256 => ReputationProposal) public proposals;

    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event ProposalCreated(uint256 indexed proposalId, uint256 agentId, uint256 newScore);
    event ProposalApproved(uint256 indexed proposalId, address indexed oracle);
    event ProposalExecuted(uint256 indexed proposalId, uint256 agentId, uint256 newScore);
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
        oracleCount = 2;
        emit OracleAdded(_oracle1);
        emit OracleAdded(_oracle2);
    }

    function addOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid address");
        require(!authorizedOracles[oracle], "Already an oracle");
        authorizedOracles[oracle] = true;
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
    ) external onlyOracle minimumOracles returns (uint256) {
        require(newScore <= MAX_SCORE, "Score exceeds max");

        proposalCount++;
        ReputationProposal storage proposal = proposals[proposalCount];
        proposal.agentId = agentId;
        proposal.newScore = newScore;
        proposal.approvals = 1;
        proposal.executed = false;
        proposal.hasApproved[msg.sender] = true;

        emit ProposalCreated(proposalCount, agentId, newScore);
        return proposalCount;
    }

    function approveProposal(uint256 proposalId) external onlyOracle minimumOracles {
        ReputationProposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(!proposal.hasApproved[msg.sender], "Already approved");

        proposal.hasApproved[msg.sender] = true;
        proposal.approvals++;

        emit ProposalApproved(proposalId, msg.sender);

        if (proposal.approvals >= MIN_APPROVALS) {
            _executeProposal(proposalId);
        }
    }

    function _executeProposal(uint256 proposalId) internal {
        ReputationProposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        agentIdentity.updateReputation(proposal.agentId, proposal.newScore);
        emit ProposalExecuted(proposalId, proposal.agentId, proposal.newScore);
    }

    function hasApproved(uint256 proposalId, address oracle) external view returns (bool) {
        return proposals[proposalId].hasApproved[oracle];
    }

    function isActive() external view returns (bool) {
        return oracleCount >= MIN_ORACLES;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

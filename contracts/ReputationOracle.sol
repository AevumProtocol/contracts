// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAgentIdentity {
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

    function getAgent(uint256 agentId) external view returns (AgentRecord memory);
    function getAgentByAddress(address agentAddress) external view returns (uint256);
}

interface IReputationOracle {
    function isAgentAuthorizedView(address agentAddress, address protocol) external view returns (bool);
    function checkScore(address agentAddress) external view returns (uint256);
}

contract ReputationOracle is IReputationOracle {

    address public owner;
    IAgentIdentity public immutable agentIdentity;

    uint256 public defaultMinScore = 100;

    mapping(address => uint256) public protocolMinScores;
    mapping(address => bool) public registeredProtocols;

    event ProtocolRegistered(address indexed protocol, uint256 minScore);
    event ProtocolDeregistered(address indexed protocol);
    event AgentApproved(address indexed protocol, uint256 indexed agentId, uint256 score);
    event AgentDenied(address indexed protocol, uint256 indexed agentId, uint256 score);
    event MinScoreUpdated(address indexed protocol, uint256 newScore);
    event DefaultMinScoreUpdated(uint256 newScore);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _agentIdentityAddress) {
        require(_agentIdentityAddress != address(0), "Invalid address");
        owner = msg.sender;
        agentIdentity = IAgentIdentity(_agentIdentityAddress);
    }

    function registerProtocol(address protocol, uint256 minScore) external onlyOwner {
        require(protocol != address(0), "Invalid protocol address");
        require(minScore > 0, "Min score must be positive");
        require(minScore <= 1000, "Score exceeds max");
        registeredProtocols[protocol] = true;
        protocolMinScores[protocol] = minScore;
        emit ProtocolRegistered(protocol, minScore);
    }

    function deregisterProtocol(address protocol) external onlyOwner {
        require(registeredProtocols[protocol], "Protocol not registered");
        registeredProtocols[protocol] = false;
        protocolMinScores[protocol] = 0;
        emit ProtocolDeregistered(protocol);
    }

    function updateMinScore(address protocol, uint256 newScore) external onlyOwner {
        require(registeredProtocols[protocol], "Protocol not registered");
        require(newScore > 0, "Min score must be positive");
        require(newScore <= 1000, "Score exceeds max");
        protocolMinScores[protocol] = newScore;
        emit MinScoreUpdated(protocol, newScore);
    }

    function isAgentAuthorized(address agentAddress, address protocol) external returns (bool) {
        uint256 agentId = agentIdentity.getAgentByAddress(agentAddress);
        require(agentId != 0, "Agent not registered");

        IAgentIdentity.AgentRecord memory agent = agentIdentity.getAgent(agentId);
        require(agent.isActive, "Agent is not active");

        uint256 minScore = registeredProtocols[protocol]
            ? protocolMinScores[protocol]
            : defaultMinScore;

        if (agent.reputationScore >= minScore) {
            emit AgentApproved(protocol, agentId, agent.reputationScore);
            return true;
        } else {
            emit AgentDenied(protocol, agentId, agent.reputationScore);
            return false;
        }
    }

    function isAgentAuthorizedView(address agentAddress, address protocol)
        external view override returns (bool)
    {
        uint256 agentId = agentIdentity.getAgentByAddress(agentAddress);
        if (agentId == 0) return false;

        IAgentIdentity.AgentRecord memory agent = agentIdentity.getAgent(agentId);
        if (!agent.isActive) return false;

        uint256 minScore = registeredProtocols[protocol]
            ? protocolMinScores[protocol]
            : defaultMinScore;

        return agent.reputationScore >= minScore;
    }

    // L-03: return 0 instead of reverting for unregistered agents
    function checkScore(address agentAddress) external view override returns (uint256) {
        uint256 agentId = agentIdentity.getAgentByAddress(agentAddress);
        if (agentId == 0) return 0;
        IAgentIdentity.AgentRecord memory agent = agentIdentity.getAgent(agentId);
        return agent.reputationScore;
    }

    function setDefaultMinScore(uint256 newScore) external onlyOwner {
        require(newScore > 0, "Score must be positive");
        require(newScore <= 1000, "Score exceeds max");
        defaultMinScore = newScore;
        emit DefaultMinScoreUpdated(newScore);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

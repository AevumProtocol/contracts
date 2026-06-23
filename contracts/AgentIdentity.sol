// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgentIdentity {

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

    uint256 private _agentCounter;
    mapping(uint256 => AgentRecord) private _agents;
    mapping(address => uint256) private _ownerToAgentId;

    address public owner;
    address public reputationController;

    event AgentRegistered(uint256 indexed agentId, address indexed agentOwner, bytes32 strategyHash);
    event StrategyUpdated(uint256 indexed agentId, bytes32 newHash);
    event ReputationUpdated(uint256 indexed agentId, uint256 newScore);
    event CertificateAdded(uint256 indexed agentId, bytes32 certHash);
    event ControllerUpdated(address indexed newController);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyAuthorizedController() {
        require(
            msg.sender == reputationController,
            "Not authorized controller"
        );
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(_agents[agentId].owner != address(0), "Agent does not exist");
        _;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(_agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _agentCounter = 1;
    }

    function setReputationController(address controller) external onlyOwner {
        require(controller != address(0), "Invalid address");
        reputationController = controller;
        emit ControllerUpdated(controller);
    }

    function registerAgent(
        bytes32 strategyHash,
        string calldata metadataURI,
        ExecutionPolicy calldata policy
    ) external returns (uint256) {
        require(_ownerToAgentId[msg.sender] == 0, "Address already has an agent");

        uint256 newId = _agentCounter++;

        AgentRecord storage agent = _agents[newId];
        agent.owner = msg.sender;
        agent.strategyHash = strategyHash;
        agent.reputationScore = 100;
        agent.registeredAt = block.timestamp;
        agent.isActive = true;
        agent.policy = policy;
        agent.metadataURI = metadataURI;

        _ownerToAgentId[msg.sender] = newId;

        emit AgentRegistered(newId, msg.sender, strategyHash);
        return newId;
    }

    function updateStrategy(uint256 agentId, bytes32 newHash)
        external agentExists(agentId) onlyAgentOwner(agentId)
    {
        _agents[agentId].strategyHash = newHash;
        emit StrategyUpdated(agentId, newHash);
    }

    function addPerformanceCert(
        uint256 agentId,
        bytes32 certHash,
        string calldata metadataURI
    ) external agentExists(agentId) onlyAgentOwner(agentId) {
        PerformanceCert memory cert = PerformanceCert({
            certHash: certHash,
            timestamp: block.timestamp,
            issuedBy: msg.sender,
            metadataURI: metadataURI
        });
        _agents[agentId].certs.push(cert);
        emit CertificateAdded(agentId, certHash);
    }

    function updateReputation(uint256 agentId, uint256 newScore)
        external onlyAuthorizedController agentExists(agentId)
    {
        require(newScore <= 1000, "Score exceeds max");
        _agents[agentId].reputationScore = newScore;
        emit ReputationUpdated(agentId, newScore);
    }

    function setExecutionPolicy(uint256 agentId, ExecutionPolicy calldata policy)
        external agentExists(agentId) onlyAgentOwner(agentId)
    {
        _agents[agentId].policy = policy;
    }

    function deactivateAgent(uint256 agentId)
        external agentExists(agentId) onlyAgentOwner(agentId)
    {
        _agents[agentId].isActive = false;
        _ownerToAgentId[msg.sender] = 0;
    }

    function getAgent(uint256 agentId)
        external view agentExists(agentId)
        returns (AgentRecord memory)
    {
        return _agents[agentId];
    }

    function getAgentByAddress(address agentAddress)
        external view
        returns (uint256)
    {
        return _ownerToAgentId[agentAddress];
    }

    function totalAgents() external view returns (uint256) {
        return _agentCounter - 1;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
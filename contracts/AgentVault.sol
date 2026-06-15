// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReputationOracle {
    function isAgentAuthorized(address agentAddress, address protocol) external returns (bool);
    function checkScore(address agentAddress) external view returns (uint256);
}

contract AgentVault {

    address public owner;
    IReputationOracle public oracle;

    uint256 public defaultWithdrawLimit = 0.01 ether;
    uint256 public minReputationScore = 100;

    mapping(address => uint256) public agentWithdrawLimits;
    mapping(address => uint256) public agentTotalWithdrawn;
    mapping(address => uint256) public agentLastWithdraw;
    mapping(address => bool) public blacklisted;

    uint256 public cooldownPeriod = 1 days;

    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed agent, uint256 amount);
    event AgentBlacklisted(address indexed agent);
    event AgentUnblacklisted(address indexed agent);
    event WithdrawLimitSet(address indexed agent, uint256 limit);
    event MinScoreUpdated(uint256 newScore);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notBlacklisted(address agent) {
        require(!blacklisted[agent], "Agent is blacklisted");
        _;
    }

    constructor(address _oracleAddress) {
        owner = msg.sender;
        oracle = IReputationOracle(_oracleAddress);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external notBlacklisted(msg.sender) {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient vault balance");

        bool authorized = oracle.isAgentAuthorized(msg.sender, address(this));
        require(authorized, "Agent not authorized by oracle");

        uint256 limit = agentWithdrawLimits[msg.sender] > 0
            ? agentWithdrawLimits[msg.sender]
            : defaultWithdrawLimit;

        require(amount <= limit, "Exceeds withdraw limit");

        require(
            block.timestamp >= agentLastWithdraw[msg.sender] + cooldownPeriod,
            "Cooldown period not met"
        );

        agentLastWithdraw[msg.sender] = block.timestamp;
        agentTotalWithdrawn[msg.sender] += amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function setWithdrawLimit(address agent, uint256 limit) external onlyOwner {
        agentWithdrawLimits[agent] = limit;
        emit WithdrawLimitSet(agent, limit);
    }

    function setMinReputationScore(uint256 newScore) external onlyOwner {
        require(newScore <= 1000, "Score exceeds max");
        minReputationScore = newScore;
        emit MinScoreUpdated(newScore);
    }

    function setCooldownPeriod(uint256 newPeriod) external onlyOwner {
        cooldownPeriod = newPeriod;
    }

    function blacklistAgent(address agent) external onlyOwner {
        blacklisted[agent] = true;
        emit AgentBlacklisted(agent);
    }

    function unblacklistAgent(address agent) external onlyOwner {
        blacklisted[agent] = false;
        emit AgentUnblacklisted(agent);
    }

    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getAgentStats(address agent) external view returns (
        uint256 withdrawLimit,
        uint256 totalWithdrawn,
        uint256 lastWithdraw,
        bool isBlacklisted
    ) {
        return (
            agentWithdrawLimits[agent] > 0 ? agentWithdrawLimits[agent] : defaultWithdrawLimit,
            agentTotalWithdrawn[agent],
            agentLastWithdraw[agent],
            blacklisted[agent]
        );
    }
}
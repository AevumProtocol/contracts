// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReputationOracle {
    function isAgentAuthorizedView(address agentAddress, address protocol) external view returns (bool);
    function checkScore(address agentAddress) external view returns (uint256);
}

contract AgentVault {

    address public owner;
    IReputationOracle public immutable oracle;

    uint256 public defaultWithdrawLimit;
    uint256 public cooldownPeriod = 1 days;
    uint256 public totalDeposited;

    mapping(address => uint256) public agentWithdrawLimits;
    mapping(address => uint256) public agentTotalWithdrawn;
    mapping(address => uint256) public agentLastWithdraw;
    mapping(address => bool) public agentInitialized;
    mapping(address => bool) public blacklisted;
    mapping(uint256 => bool) public blacklistedAgentIds;

    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed agent, uint256 amount);
    event AgentBlacklisted(address indexed agent);
    event AgentUnblacklisted(address indexed agent);
    event AgentIdBlacklisted(uint256 indexed agentId);
    event AgentIdUnblacklisted(uint256 indexed agentId);
    event WithdrawLimitSet(address indexed agent, uint256 limit);
    event DefaultWithdrawLimitUpdated(uint256 newLimit);
    event CooldownPeriodUpdated(uint256 newPeriod);
    event ETHRescued(address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notBlacklisted(address agent) {
        require(!blacklisted[agent], "Agent address is blacklisted");
        _;
    }

    constructor(address _oracleAddress, uint256 _defaultWithdrawLimit) {
        require(_oracleAddress != address(0), "Invalid oracle address");
        require(_defaultWithdrawLimit > 0, "Limit must be positive");
        owner = msg.sender;
        oracle = IReputationOracle(_oracleAddress);
        defaultWithdrawLimit = _defaultWithdrawLimit;
    }

    receive() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external notBlacklisted(msg.sender) {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient vault balance");

        bool authorized = oracle.isAgentAuthorizedView(msg.sender, address(this));
        require(authorized, "Agent not authorized by oracle");

        uint256 limit = agentWithdrawLimits[msg.sender] > 0
            ? agentWithdrawLimits[msg.sender]
            : defaultWithdrawLimit;

        require(amount <= limit, "Exceeds withdraw limit");

        // Fix cooldown bypass on first withdrawal
        if (agentInitialized[msg.sender]) {
            require(
                block.timestamp >= agentLastWithdraw[msg.sender] + cooldownPeriod,
                "Cooldown period not met"
            );
        }

        agentInitialized[msg.sender] = true;
        agentLastWithdraw[msg.sender] = block.timestamp;
        agentTotalWithdrawn[msg.sender] += amount;
        totalDeposited -= amount;

        emit Withdrawn(msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    function rescueETH() external onlyOwner {
        uint256 surplus = address(this).balance > totalDeposited
            ? address(this).balance - totalDeposited
            : 0;
        require(surplus > 0, "No surplus ETH to rescue");

        emit ETHRescued(owner, surplus);

        (bool success, ) = payable(owner).call{value: surplus}("");
        require(success, "Rescue failed");
    }

    function setWithdrawLimit(address agent, uint256 limit) external onlyOwner {
        agentWithdrawLimits[agent] = limit;
        emit WithdrawLimitSet(agent, limit);
    }

    function setDefaultWithdrawLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Limit must be positive");
        defaultWithdrawLimit = newLimit;
        emit DefaultWithdrawLimitUpdated(newLimit);
    }

    function setCooldownPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod >= 1 hours, "Cooldown too short");
        cooldownPeriod = newPeriod;
        emit CooldownPeriodUpdated(newPeriod);
    }

    function blacklistAgent(address agent) external onlyOwner {
        blacklisted[agent] = true;
        emit AgentBlacklisted(agent);
    }

    function unblacklistAgent(address agent) external onlyOwner {
        blacklisted[agent] = false;
        emit AgentUnblacklisted(agent);
    }

    function blacklistAgentId(uint256 agentId) external onlyOwner {
        blacklistedAgentIds[agentId] = true;
        emit AgentIdBlacklisted(agentId);
    }

    function unblacklistAgentId(uint256 agentId) external onlyOwner {
        blacklistedAgentIds[agentId] = false;
        emit AgentIdUnblacklisted(agentId);
    }

    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getSurplusETH() external view returns (uint256) {
        if (address(this).balance <= totalDeposited) return 0;
        return address(this).balance - totalDeposited;
    }

    function getAgentStats(address agent) external view returns (
        uint256 withdrawLimit,
        uint256 totalWithdrawn,
        uint256 lastWithdraw,
        bool isBlacklisted,
        bool initialized
    ) {
        return (
            agentWithdrawLimits[agent] > 0 ? agentWithdrawLimits[agent] : defaultWithdrawLimit,
            agentTotalWithdrawn[agent],
            agentLastWithdraw[agent],
            blacklisted[agent],
            agentInitialized[agent]
        );
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

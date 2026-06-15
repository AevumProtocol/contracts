// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract AEVToken is IERC20 {

    string public name = "Aevum Protocol";
    string public symbol = "AEV";
    uint8 public decimals = 18;

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BURN_BPS = 5000;

    uint256 private _totalSupply;
    uint256 public totalBurned;

    address public owner;
    address public feeCollector;
    address public ecosystemWallet;
    address public daoTreasuryWallet;
    address public communityWallet;
    address public teamWallet;
    address public liquidityWallet;
    address public investorWallet;

    bool public transfersEnabled = false;
    uint256 public feeBps = 100;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) public isExcludedFromFee;

    event Burned(address indexed from, uint256 amount);
    event TransfersEnabled();
    event FeeCollectorUpdated(address indexed newCollector);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier transfersAllowed() {
        require(transfersEnabled || isExcludedFromFee[msg.sender], "Transfers not enabled yet");
        _;
    }

    constructor(
        address _ecosystemWallet,
        address _daoTreasuryWallet,
        address _communityWallet,
        address _teamWallet,
        address _liquidityWallet,
        address _investorWallet
    ) {
        owner = msg.sender;
        feeCollector = msg.sender;

        ecosystemWallet    = _ecosystemWallet;
        daoTreasuryWallet  = _daoTreasuryWallet;
        communityWallet    = _communityWallet;
        teamWallet         = _teamWallet;
        liquidityWallet    = _liquidityWallet;
        investorWallet     = _investorWallet;

        isExcludedFromFee[msg.sender]        = true;
        isExcludedFromFee[_ecosystemWallet]  = true;
        isExcludedFromFee[_daoTreasuryWallet]= true;
        isExcludedFromFee[_communityWallet]  = true;
        isExcludedFromFee[_teamWallet]       = true;
        isExcludedFromFee[_liquidityWallet]  = true;
        isExcludedFromFee[_investorWallet]   = true;

        // Mint per whitepaper allocations to separate wallets
        _mint(_ecosystemWallet,   MAX_SUPPLY * 30 / 100); // 30% ecosystem
        _mint(_daoTreasuryWallet, MAX_SUPPLY * 20 / 100); // 20% DAO treasury
        _mint(_communityWallet,   MAX_SUPPLY * 15 / 100); // 15% community airdrop
        _mint(_teamWallet,        MAX_SUPPLY * 15 / 100); // 15% team
        _mint(_liquidityWallet,   MAX_SUPPLY * 10 / 100); // 10% liquidity
        _mint(_investorWallet,    MAX_SUPPLY * 10 / 100); // 10% strategic investors
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount)
        external override transfersAllowed returns (bool)
    {
        _transferWithFee(msg.sender, to, amount);
        return true;
    }

    function allowance(address tokenOwner, address spender)
        external view override returns (uint256)
    {
        return _allowances[tokenOwner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external override transfersAllowed returns (bool)
    {
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
        _allowances[from][msg.sender] -= amount;
        _transferWithFee(from, to, amount);
        return true;
    }

    function burn(uint256 amount) external {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _totalSupply -= amount;
        totalBurned += amount;
        emit Burned(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function enableTransfers() external onlyOwner {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        feeCollector = newCollector;
        isExcludedFromFee[newCollector] = true;
        emit FeeCollectorUpdated(newCollector);
    }

    function excludeFromFee(address account, bool excluded) external onlyOwner {
        isExcludedFromFee[account] = excluded;
    }

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Fee too high");
        feeBps = newFeeBps;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _transferWithFee(address from, address to, uint256 amount) internal {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= amount, "Insufficient balance");

        if (isExcludedFromFee[from] || isExcludedFromFee[to]) {
            _balances[from] -= amount;
            _balances[to] += amount;
            emit Transfer(from, to, amount);
            return;
        }

        uint256 fee = (amount * feeBps) / 10000;
        uint256 burnAmount = (fee * BURN_BPS) / 10000;
        uint256 collectorAmount = fee - burnAmount;
        uint256 sendAmount = amount - fee;

        _balances[from] -= amount;
        _balances[to] += sendAmount;
        _balances[feeCollector] += collectorAmount;

        _totalSupply -= burnAmount;
        totalBurned += burnAmount;

        emit Transfer(from, to, sendAmount);
        emit Transfer(from, feeCollector, collectorAmount);
        emit Transfer(from, address(0), burnAmount);
        emit Burned(from, burnAmount);
    }

    function _mint(address to, uint256 amount) internal {
        require(_totalSupply + amount <= MAX_SUPPLY, "Exceeds max supply");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
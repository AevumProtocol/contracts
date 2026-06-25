// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract AEVToken is ERC20Votes {

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BURN_BPS = 5000;

    uint256 public totalBurned;

    address public owner;
    address public feeCollector;

    address public immutable ecosystemWallet;
    address public immutable daoTreasuryWallet;
    address public immutable communityWallet;
    address public immutable teamWallet;
    address public immutable liquidityWallet;
    address public immutable investorWallet;

    bool public transfersEnabled = false;
    bool public paused = false;
    uint256 public feeBps = 100;

    mapping(address => bool) public isExcludedFromFee;
    mapping(address => bool) public isWhitelisted;

    event Burned(address indexed from, uint256 amount);
    event TransfersEnabled();
    event TransfersPaused();
    event TransfersUnpaused();
    event FeeCollectorUpdated(address indexed newCollector);
    event FeeBpsUpdated(uint256 newFeeBps);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Whitelisted(address indexed account, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier transfersAllowed() {
        require(!paused, "Transfers paused");
        require(transfersEnabled || isWhitelisted[msg.sender], "Transfers not enabled yet");
        _;
    }

    constructor(
        address _ecosystemWallet,
        address _daoTreasuryWallet,
        address _communityWallet,
        address _teamWallet,
        address _liquidityWallet,
        address _investorWallet
    ) ERC20("Aevum Protocol", "AEV") EIP712("Aevum Protocol", "1") {
        require(_ecosystemWallet != address(0), "Invalid ecosystem wallet");
        require(_daoTreasuryWallet != address(0), "Invalid DAO treasury wallet");
        require(_communityWallet != address(0), "Invalid community wallet");
        require(_teamWallet != address(0), "Invalid team wallet");
        require(_liquidityWallet != address(0), "Invalid liquidity wallet");
        require(_investorWallet != address(0), "Invalid investor wallet");

        owner = msg.sender;
        feeCollector = msg.sender;

        ecosystemWallet   = _ecosystemWallet;
        daoTreasuryWallet = _daoTreasuryWallet;
        communityWallet   = _communityWallet;
        teamWallet        = _teamWallet;
        liquidityWallet   = _liquidityWallet;
        investorWallet    = _investorWallet;

        isExcludedFromFee[msg.sender]         = true;
        isExcludedFromFee[_ecosystemWallet]   = true;
        isExcludedFromFee[_daoTreasuryWallet] = true;
        isExcludedFromFee[_communityWallet]   = true;
        isExcludedFromFee[_teamWallet]        = true;
        isExcludedFromFee[_liquidityWallet]   = true;
        isExcludedFromFee[_investorWallet]    = true;

        isWhitelisted[msg.sender]         = true;
        isWhitelisted[_ecosystemWallet]   = true;
        isWhitelisted[_daoTreasuryWallet] = true;
        isWhitelisted[_communityWallet]   = true;
        isWhitelisted[_teamWallet]        = true;
        isWhitelisted[_liquidityWallet]   = true;
        isWhitelisted[_investorWallet]    = true;

        _mintVotes(_ecosystemWallet,   MAX_SUPPLY * 30 / 100);
        _mintVotes(_daoTreasuryWallet, MAX_SUPPLY * 20 / 100);
        _mintVotes(_communityWallet,   MAX_SUPPLY * 15 / 100);
        _mintVotes(_teamWallet,        MAX_SUPPLY * 15 / 100);
        _mintVotes(_liquidityWallet,   MAX_SUPPLY * 10 / 100);
        _mintVotes(_investorWallet,    MAX_SUPPLY * 10 / 100);
    }

    function transfer(address to, uint256 amount)
        public override transfersAllowed returns (bool)
    {
        _transferWithFee(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        public override transfersAllowed returns (bool)
    {
        _spendAllowance(from, msg.sender, amount);
        _transferWithFee(from, to, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue)
        public returns (bool)
    {
        _approve(msg.sender, spender, allowance(msg.sender, spender) + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue)
        public returns (bool)
    {
        uint256 current = allowance(msg.sender, spender);
        require(current >= subtractedValue, "Decreased below zero");
        _approve(msg.sender, spender, current - subtractedValue);
        return true;
    }

    function burnTokens(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        totalBurned += amount;
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    function enableTransfers() external onlyOwner {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function pauseTransfers() external onlyOwner {
        paused = true;
        emit TransfersPaused();
    }

    function unpauseTransfers() external onlyOwner {
        paused = false;
        emit TransfersUnpaused();
    }

    function setWhitelisted(address account, bool status) external onlyOwner {
        isWhitelisted[account] = status;
        emit Whitelisted(account, status);
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
        emit FeeBpsUpdated(newFeeBps);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _transferWithFee(address from, address to, uint256 amount) internal {
        if (isExcludedFromFee[from] || isExcludedFromFee[to]) {
            _transfer(from, to, amount);
            return;
        }

        uint256 fee = (amount * feeBps) / 10000;
        uint256 burnAmount = (fee * BURN_BPS) / 10000;
        uint256 collectorAmount = fee - burnAmount;
        uint256 sendAmount = amount - fee;

        _transfer(from, to, sendAmount);
        _transfer(from, feeCollector, collectorAmount);
        _burn(from, burnAmount);
        totalBurned += burnAmount;

        emit Burned(from, burnAmount);
    }

    function _mintVotes(address to, uint256 amount) internal {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount)
        internal override(ERC20Votes)
    {
        super._update(from, to, amount);
    }
}

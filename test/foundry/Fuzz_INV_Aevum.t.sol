// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/AgentVault.sol";

// Mock oracle that always authorizes
contract MockReputationOracle {
    function isAgentAuthorizedView(address, address) external pure returns (bool) { return true; }
    function checkScore(address) external pure returns (uint256) { return 1000; }
}

// Mock identity that always returns agent ID 1
contract MockAgentIdentityContract {
    function getAgentByAddress(address) external pure returns (uint256) { return 1; }
}

contract AevumSecurityTest is Test {
    AgentVault vault;
    address owner;
    address attacker;
    address legit;

    function setUp() public {
        owner = address(this);
        attacker = makeAddr("attacker");
        legit = makeAddr("legit");

        MockReputationOracle oracle = new MockReputationOracle();
        MockAgentIdentityContract identity = new MockAgentIdentityContract();

        vault = new AgentVault(address(oracle), 0.1 ether, address(identity));

        // Seed vault with legitimate deposit
        vm.deal(legit, 10 ether);
        vm.prank(legit);
        vault.deposit{value: 1 ether}();
    }

    // ─── Critical.01 ──────────────────────────────────────────────────────────

    /// INV01: Attacker with zero deposits cannot withdraw -- MUST revert
    function test_INV01_unit_withdrawWithoutDeposit() public {
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(0.1 ether);
        emit log("PASS: attacker with zero deposits cannot withdraw");
    }

    /// Fuzz INV01: Any amount, zero-deposit attacker cannot withdraw
    function testFuzz_INV01_withdrawWithoutDeposit(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(amount);
    }

    /// INV01 positive: agentBalance tracked correctly on deposit
    function test_INV01_balanceTrackedOnDeposit() public {
        assertEq(vault.agentBalance(legit), 1 ether, "Legit balance should be 1 ETH");
        assertEq(vault.agentBalance(attacker), 0, "Attacker balance should be 0");
    }

    // ─── High.01 ──────────────────────────────────────────────────────────────

    /// INV02: setDefaultWithdrawLimit(0) must NOT revert
    function test_INV02_setDefaultWithdrawLimitZero_reverts() public {
        vault.setDefaultWithdrawLimit(0);
        assertEq(vault.defaultWithdrawLimit(), 0, "Limit should be 0");
        emit log("PASS: setDefaultWithdrawLimit(0) succeeded -- emergency brake works");
    }

    /// INV02: withdrawPaused global flag
    function test_INV02_withdrawPausedFlag() public {
        assertFalse(vault.withdrawPaused(), "Should start unpaused");
        vault.setWithdrawPaused(true);
        assertTrue(vault.withdrawPaused(), "Should be paused");
        vault.setWithdrawPaused(false);
        assertFalse(vault.withdrawPaused(), "Should be unpaused");
        emit log("PASS: withdrawPaused flag works correctly");
    }

    /// INV02: paused vault blocks withdrawals
    function test_INV02_pausedBlocksWithdrawals() public {
        // Give legit a deposit first
        vm.deal(legit, 1 ether);
        vm.prank(legit);
        vault.deposit{value: 0.5 ether}();

        // Pause vault
        vault.setWithdrawPaused(true);

        // Even legit depositor cannot withdraw when paused
        vm.prank(legit);
        vm.expectRevert();
        vault.withdraw(0.05 ether);
        emit log("PASS: paused vault blocks all withdrawals");
    }
}

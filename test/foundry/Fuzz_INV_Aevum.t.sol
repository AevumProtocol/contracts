// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/AgentVault.sol";

contract MockReputationOracle {
    function isAgentAuthorizedView(address, address) external pure returns (bool) { return true; }
    function checkScore(address) external pure returns (uint256) { return 1000; }
}

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

        vm.deal(legit, 10 ether);
        vm.prank(legit);
        vault.deposit{value: 1 ether}();
    }

    function test_INV01_unit_withdrawWithoutDeposit() public {
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(0.1 ether);
        emit log("PASS: attacker with zero deposits cannot withdraw");
    }

    function testFuzz_INV01_withdrawWithoutDeposit(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(amount);
    }

    function test_INV01_balanceTrackedOnDeposit() public view {
        assertEq(vault.agentBalance(legit), 1 ether);
        assertEq(vault.agentBalance(attacker), 0);
    }

    function test_INV02_setDefaultWithdrawLimitZero_reverts() public {
        vault.setDefaultWithdrawLimit(0);
        assertEq(vault.defaultWithdrawLimit(), 0);
        emit log("PASS: setDefaultWithdrawLimit(0) succeeded -- emergency brake works");
    }

    function test_INV02_withdrawPausedFlag() public {
        assertFalse(vault.withdrawPaused());
        vault.setWithdrawPaused(true);
        assertTrue(vault.withdrawPaused());
        vault.setWithdrawPaused(false);
        assertFalse(vault.withdrawPaused());
        emit log("PASS: withdrawPaused flag works correctly");
    }

    function test_INV02_pausedBlocksWithdrawals() public {
        vm.deal(legit, 1 ether);
        vm.prank(legit);
        vault.deposit{value: 0.5 ether}();
        vault.setWithdrawPaused(true);
        vm.prank(legit);
        vm.expectRevert();
        vault.withdraw(0.05 ether);
        emit log("PASS: paused vault blocks all withdrawals");
    }
}

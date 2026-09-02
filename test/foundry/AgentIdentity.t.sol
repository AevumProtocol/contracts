// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/AgentIdentity.sol";

contract AgentIdentityTest is Test {
    AgentIdentity identity;
    address agent1;
    address agent2;

    AgentIdentity.ExecutionPolicy defaultPolicy;

    function setUp() public {
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        identity = new AgentIdentity();
        defaultPolicy = AgentIdentity.ExecutionPolicy({
            maxGasPerTx: 500000,
            dailySpendLimit: 1 ether,
            canInitiateTrades: true,
            canInteractWithProtocols: true
        });
    }

    function test_registerAgent_success() public {
        vm.prank(agent1);
        uint256 agentId = identity.registerAgent(keccak256("strategy"), "ipfs://test", defaultPolicy);
        assertGt(agentId, 0);
        assertEq(identity.getAgentByAddress(agent1), agentId);
    }

    function test_registerAgent_duplicateFails() public {
        vm.prank(agent1);
        identity.registerAgent(keccak256("strategy"), "ipfs://test", defaultPolicy);
        vm.prank(agent1);
        vm.expectRevert();
        identity.registerAgent(keccak256("strategy2"), "ipfs://test2", defaultPolicy);
    }

    function test_C03_reputationResetFixed() public {
        vm.prank(agent1);
        uint256 agentId1 = identity.registerAgent(keccak256("strategy"), "ipfs://1", defaultPolicy);
        assertGt(agentId1, 0);
        vm.prank(agent1);
        identity.deactivateAgent(agentId1);
        // C-03 FIX: re-registration blocked
        vm.prank(agent1);
        vm.expectRevert();
        identity.registerAgent(keccak256("strategy2"), "ipfs://2", defaultPolicy);
        emit log("C-03 FIXED: re-registration blocked after deactivation");
    }

    function test_C03_deactivationPreservesCertificates() public {
        vm.prank(agent1);
        uint256 agentId = identity.registerAgent(keccak256("strategy"), "ipfs://1", defaultPolicy);
        vm.prank(agent1);
        identity.deactivateAgent(agentId);
        // C-03 FIX: getAgent still works after deactivation -- certificates not orphaned
        AgentIdentity.AgentRecord memory record = identity.getAgent(agentId);
        assertFalse(record.isActive);
        emit log("C-03 FIXED: deactivated agent record still readable -- certificates preserved");
    }

    function test_setReputationController_onlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        identity.setReputationController(agent1);
    }

    function test_setApprovedCertIssuer_onlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        identity.setApprovedCertIssuer(agent1, true);
    }

    function test_setApprovedCertIssuer_works() public {
        identity.setApprovedCertIssuer(agent1, true);
        assertTrue(identity.approvedCertIssuers(agent1));
    }
}

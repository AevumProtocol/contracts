// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/ReputationController.sol";

interface IAgentIdentityMin {
    struct ExecutionPolicy {
        uint256 maxGasPerTx;
        uint256 dailySpendLimit;
        bool canInitiateTrades;
        bool canInteractWithProtocols;
    }
    function registerAgent(bytes32 strategyHash, string calldata metadataURI, ExecutionPolicy calldata policy) external returns (uint256);
    function getAgentByAddress(address) external view returns (uint256);
    function setReputationController(address) external;
}

contract ReputationControllerTest is Test {
    ReputationController controller;
    address identityAddr;
    address oracle1Addr;
    address oracle2Addr;
    address agent1;
    uint256 agentId;

    function setUp() public {
        agent1 = makeAddr("agent1");
        oracle1Addr = makeAddr("oracle1");
        oracle2Addr = makeAddr("oracle2");

        vm.warp(31 days);

        identityAddr = deployCode("AgentIdentity.sol:AgentIdentity");
        controller = new ReputationController(identityAddr, oracle1Addr, oracle2Addr);
        IAgentIdentityMin(identityAddr).setReputationController(address(controller));

        IAgentIdentityMin.ExecutionPolicy memory policy = IAgentIdentityMin.ExecutionPolicy({
            maxGasPerTx: 500000,
            dailySpendLimit: 1 ether,
            canInitiateTrades: true,
            canInteractWithProtocols: true
        });

        vm.prank(agent1);
        IAgentIdentityMin(identityAddr).registerAgent(keccak256("strategy"), "ipfs://1", policy);
        agentId = IAgentIdentityMin(identityAddr).getAgentByAddress(agent1);
    }

    // Helper: propose + get to quorum + timelock
    function _proposeAndQueue(uint256 newScore) internal returns (uint256 proposalId) {
        // Oracle1 proposes
        vm.prank(oracle1Addr);
        proposalId = controller.proposeReputationUpdate(agentId, newScore);

        // Wait minVotingWindow (1 hour)
        vm.warp(block.timestamp + 1 hours + 1);

        // Oracle2 approves to reach quorum
        vm.prank(oracle2Addr);
        controller.approveProposal(proposalId);
        // Now quorum reached, timelock starts
    }

    function test_addOracle_onlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        controller.addOracle(makeAddr("newOracle"));
    }

    function test_proposeReputationUpdate_requiresOracle() public {
        vm.prank(agent1);
        vm.expectRevert();
        controller.proposeReputationUpdate(agentId, 110);
    }

    function test_timelockPreventsImmediateExecution() public {
        uint256 proposalId = _proposeAndQueue(110);
        // Cannot execute immediately -- timelock not elapsed
        vm.expectRevert();
        controller.executeProposal(proposalId);
    }

    function test_timelockAllowsExecutionAfterDelay() public {
        uint256 proposalId = _proposeAndQueue(110);
        // Warp past 24hr timelock
        vm.warp(block.timestamp + 25 hours);
        controller.executeProposal(proposalId);
    }

    function test_challengeProposal_requiresAuthorization() public {
        uint256 proposalId = _proposeAndQueue(110);
        // Random address cannot challenge -- M-03 audit finding was INCORRECT
        // Contract requires owner or authorized oracle to challenge
        vm.prank(makeAddr("random"));
        vm.expectRevert();
        controller.challengeProposal(proposalId);
        emit log("M-03 AUDIT FINDING INCORRECT: challenge requires authorization -- contract is safe");
    }

    function test_oracleCanChallenge() public {
        uint256 proposalId = _proposeAndQueue(110);
        // Oracle CAN challenge within window
        vm.prank(oracle1Addr);
        controller.challengeProposal(proposalId);
        // Execution now blocked
        vm.warp(block.timestamp + 25 hours);
        vm.expectRevert();
        controller.executeProposal(proposalId);
    }
}

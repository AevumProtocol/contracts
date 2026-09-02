// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/ReputationOracle.sol";

interface IAgentIdentityMin2 {
    struct ExecutionPolicy {
        uint256 maxGasPerTx;
        uint256 dailySpendLimit;
        bool canInitiateTrades;
        bool canInteractWithProtocols;
    }
    function registerAgent(bytes32 strategyHash, string calldata metadataURI, ExecutionPolicy calldata policy) external returns (uint256);
}

contract ReputationOracleTest is Test {
    ReputationOracle oracle;
    address identityAddr;
    address agent1;

    function setUp() public {
        agent1 = makeAddr("agent1");
        identityAddr = deployCode("AgentIdentity.sol:AgentIdentity");
        oracle = new ReputationOracle(identityAddr);

        IAgentIdentityMin2.ExecutionPolicy memory policy = IAgentIdentityMin2.ExecutionPolicy({
            maxGasPerTx: 500000,
            dailySpendLimit: 1 ether,
            canInitiateTrades: true,
            canInteractWithProtocols: true
        });

        vm.prank(agent1);
        IAgentIdentityMin2(identityAddr).registerAgent(keccak256("strategy"), "ipfs://1", policy);
    }

    function test_defaultMinScore_is_250() public {
        assertEq(oracle.defaultMinScore(), 250);
        emit log("P1 fix verified: defaultMinScore is 250");
    }

    function test_registerProtocol_onlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        oracle.registerProtocol(agent1, 100);
    }

    function test_isAgentAuthorizedView_unregisteredProtocol() public {
        bool authorized = oracle.isAgentAuthorizedView(agent1, makeAddr("unregistered"));
        assertFalse(authorized);
    }

    function test_setDefaultMinScore_onlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        oracle.setDefaultMinScore(500);
    }
}

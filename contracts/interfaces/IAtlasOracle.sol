// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAtlasOracle — Atlas Oracle pull feed interface
/// @notice Interface for consuming Atlas Oracle price feeds
/// @dev Pull feed: caller submits signed price update from Atlas API alongside transaction
interface IAtlasOracle {
    struct PriceData {
        bytes32 feedId;
        int256 price;
        uint8 decimals;
        uint256 timestamp;
        uint256 consensusScore;
    }

    function updateAndGetPrice(bytes calldata updateData) external payable returns (PriceData memory priceData);
    function getLatestPrice(bytes32 feedId) external view returns (PriceData memory priceData);
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 fee);
}

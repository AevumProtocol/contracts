// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAtlasOracle — Atlas Oracle pull feed interface
/// @notice Interface for consuming Atlas Oracle price feeds
/// @dev Pull feed: caller submits signed price update from Atlas API alongside transaction
interface IAtlasOracle {
    struct PriceData {
        bytes32 feedId;         // e.g. keccak256("BTC/USD")
        int256 price;           // Price with decimals
        uint8 decimals;         // Price decimals (typically 8)
        uint256 timestamp;      // Unix timestamp of price
        uint256 consensusScore; // Atlas ConsensusScore 0-100
    }

    /// @notice Verify and apply a signed price update from Atlas
    /// @param updateData Signed price update bytes from Atlas API
    /// @return priceData Decoded and verified price data
    function updateAndGetPrice(
        bytes calldata updateData
    ) external payable returns (PriceData memory priceData);

    /// @notice Get the latest cached price (may be stale)
    /// @param feedId The feed identifier
    /// @return priceData Latest cached price data
    function getLatestPrice(
        bytes32 feedId
    ) external view returns (PriceData memory priceData);

    /// @notice Get update fee required for a price update
    function getUpdateFee(
        bytes[] calldata updateData
    ) external view returns (uint256 fee);
}

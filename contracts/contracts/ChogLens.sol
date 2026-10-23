// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IChogGameView {
    function rollsOf(uint256 id) external view returns (uint256);
    function pendingRent(uint256 id) external view returns (uint256);
    function bricks(uint256 sq, uint256 id) external view returns (uint64);
}

/// @title ChogLens
/// @notice Read-only batch views so the app can draw the whole city in a few calls (2,000 Chogs ≈ 20 calls),
///         instead of several calls per Chog. Holds nothing and changes nothing.
contract ChogLens {
    /// @notice Raw `chogs(id)` results (decode with the game ABI), plus rolls and pending rent, for each id.
    function chogs(address game, uint256[] calldata ids) external view returns (bytes[] memory data, uint256[] memory rolls, uint256[] memory pending) {
        uint256 n = ids.length;
        data = new bytes[](n);
        rolls = new uint256[](n);
        pending = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            (bool ok, bytes memory d) = game.staticcall(abi.encodeWithSignature("chogs(uint256)", ids[i]));
            if (ok) data[i] = d;
            rolls[i] = IChogGameView(game).rollsOf(ids[i]);
            pending[i] = IChogGameView(game).pendingRent(ids[i]);
        }
    }

    /// @notice Bricks held by each id on every square, flattened: out[k * 40 + sq].
    function bricksOf(address game, uint256[] calldata ids) external view returns (uint64[] memory out) {
        out = new uint64[](ids.length * 40);
        for (uint256 k; k < ids.length; ++k) for (uint256 sq; sq < 40; ++sq) out[k * 40 + sq] = IChogGameView(game).bricks(sq, ids[k]);
    }
}

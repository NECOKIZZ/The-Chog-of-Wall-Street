// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ChogLens
/// @notice Read-only batch reader, so the app can draw the whole city in a few calls (2,000 Chogs in about 20)
///         instead of several calls per Chog. It runs many view calls on one contract and returns the raw results
///         (decode them with that contract's ABI). A call that fails returns empty bytes. Holds nothing, changes nothing.
contract ChogLens {
    function read(address target, bytes[] calldata calls) external view returns (bytes[] memory out) {
        out = new bytes[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            (bool ok, bytes memory d) = target.staticcall(calls[i]);
            if (ok) out[i] = d;
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test stand-in for $CHOG (the real one is 0x3500…7777 on Monad).
contract MockCHOG is ERC20 {
    constructor() ERC20("Chog", "CHOG") {}
    function mint(address to, uint256 a) external { _mint(to, a); }
}

/// @notice Test stand-in for Chog Genesis (the real one is 0xc96d…3763 on Monad, ids 1-1969).
contract MockChogNFT is ERC721 {
    constructor() ERC721("Chog Genesis", "CHOG") {}
    function mint(address to, uint256 id) external { _mint(to, id); }
}

/// @notice Tier-A quest adapter stand-in for a Kuru / Uniswap MON -> $CHOG swap at a fixed rate.
///         A real adapter calls the router and forwards the output to the game.
contract MockSwapAdapter {
    IERC20 public immutable chog;
    address public immutable game;
    uint256 public immutable rate; // $CHOG per MON (18 decimals each)
    constructor(IERC20 chog_, address game_, uint256 rate_) { chog = chog_; game = game_; rate = rate_; }
    function run(uint256, address, bytes calldata) external payable returns (uint256 out) {
        require(msg.sender == game, "only game");
        out = msg.value * rate / 1e18;
        chog.transfer(game, out);
    }
}

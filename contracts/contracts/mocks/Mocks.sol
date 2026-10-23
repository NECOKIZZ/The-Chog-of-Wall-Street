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

/// @notice Test stand-in for USDC (6 decimals). Anyone can mint on testnet.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin (test)", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

/// @notice Tier-A quest adapter stand-in: MON -> test USDC at a fixed rate, delivered to the game as the Chog's cash.
contract MockSwapAdapter {
    IERC20 public immutable usdc;
    address public immutable game;
    uint256 public immutable rate; // USDC base units per 1 MON
    constructor(IERC20 usdc_, address game_, uint256 rate_) { usdc = usdc_; game = game_; rate = rate_; }
    function run(uint256, address, bytes calldata) external payable returns (uint256 out) {
        require(msg.sender == game, "only game");
        out = msg.value * rate / 1e18;
        usdc.transfer(game, out);
    }
}

/// @notice Buyback stand-in: takes the game's USDC and burns freshly minted test $CHOG at a fixed rate.
contract MockBuyback {
    IERC20 public immutable usdc;
    MockCHOG public immutable chog;
    address public immutable game;
    uint256 public immutable rate; // $CHOG wei per USDC base unit
    constructor(IERC20 usdc_, MockCHOG chog_, address game_, uint256 rate_) { usdc = usdc_; chog = chog_; game = game_; rate = rate_; }
    function swapToChog(uint256 cashIn, uint256 minChog, address to) external returns (uint256 out) {
        require(msg.sender == game, "only game");
        usdc.transferFrom(game, address(this), cashIn);
        out = cashIn * rate;
        require(out >= minChog, "slippage");
        chog.mint(to, out);
    }
}

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @notice Lending-vault stand-in (ERC-4626) for testnet savings. `accrue` adds test USDC as interest.
contract MockVault is ERC4626 {
    constructor(IERC20 usdc_) ERC20("Test USDC Savings", "tsUSDC") ERC4626(IERC20Metadata(address(usdc_))) {}
    function accrue(uint256 a) external { MockUSDC(address(asset())).mint(address(this), a); }
}

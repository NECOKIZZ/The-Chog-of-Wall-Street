// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// Real Monad mainnet integrations for Tier-A dapp quests, plus the $CHOG buyback. Every quest adapter is called only by
/// the game, with the owner's MON. USDC bought for the Chog goes straight into the game as the Chog's cash (the game money).
/// Any other asset ($CHOG, LST shares) is held here against the Chog's tokenId: it belongs to the NFT, travels with a
/// sale, and the current holder can withdraw it after a 7-day lock.
/// Addresses verified on-chain and in fork tests (see contracts/README.md).

interface INadDexRouter {
    struct BuyParams { uint256 amountOutMin; address token; address to; uint256 deadline; }
    function buy(BuyParams calldata params) external payable returns (uint256 amountOut);
}

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWMON { function withdraw(uint256) external; }
interface ILstErc4626Native { function deposit(uint256 assets, address receiver) external payable returns (uint256); } // shMON, aprMON
interface ILstKintsu { function deposit(uint96 minShares, address receiver) external payable returns (uint96); } // sMON

abstract contract QuestAdapterBase is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant LOCK = 7 days;
    address public immutable game;
    IERC721 public immutable CHOGS;

    /// tokenId => asset => amount held for that Chog
    mapping(uint256 => mapping(address => uint256)) public held;
    mapping(uint256 => uint64) public unlockAt;

    event Held(uint256 indexed tokenId, address indexed asset, uint256 amount, uint64 unlockAt);
    event Withdrawn(uint256 indexed tokenId, address indexed asset, address to, uint256 amount);

    error OnlyGame();
    error NotOwner();
    error Locked();
    error Slippage();

    constructor(address game_, IERC721 chogs_) { game = game_; CHOGS = chogs_; }

    modifier onlyGame() { if (msg.sender != game) revert OnlyGame(); _; }

    function _hold(uint256 id, address asset, uint256 amount) internal {
        held[id][asset] += amount;
        unlockAt[id] = uint64(block.timestamp + LOCK);
        emit Held(id, asset, amount, unlockAt[id]);
    }

    /// @notice The Chog's current holder withdraws a position after the lock.
    function withdraw(uint256 id, address asset) external nonReentrant {
        if (CHOGS.ownerOf(id) != msg.sender) revert NotOwner();
        if (block.timestamp < unlockAt[id]) revert Locked();
        uint256 a = held[id][asset];
        held[id][asset] = 0;
        IERC20(asset).safeTransfer(msg.sender, a);
        emit Withdrawn(id, asset, msg.sender, a);
    }

    function _minOut(bytes calldata data) internal pure returns (uint256 m) { if (data.length >= 32) m = abi.decode(data, (uint256)); }
}

/// nad.fun Lane / Chog Alley: buy $CHOG with MON on nad.fun's DEX router. The $CHOG is held for the Chog.
contract NadFunChogAdapter is QuestAdapterBase {
    INadDexRouter public immutable router;
    address public immutable chog;
    constructor(address game_, IERC721 chogs_, INadDexRouter router_, address chog_) QuestAdapterBase(game_, chogs_) { router = router_; chog = chog_; }

    function run(uint256 id, address, bytes calldata data) external payable onlyGame nonReentrant returns (uint256) {
        uint256 b0 = IERC20(chog).balanceOf(address(this));
        router.buy{value: msg.value}(INadDexRouter.BuyParams(_minOut(data), chog, address(this), block.timestamp));
        uint256 got = IERC20(chog).balanceOf(address(this)) - b0;
        if (got == 0 || got < _minOut(data)) revert Slippage();
        _hold(id, chog, got);
        return 0;
    }
}

/// Uniswap Boardwalk: swap MON → USDC on Uniswap v3 (WMON/USDC 0.3%). The USDC lands in the Chog's cash.
contract UniswapUsdcAdapter is QuestAdapterBase {
    ISwapRouter02 public immutable router;
    address public immutable wmon;
    address public immutable usdc;
    uint24 public immutable fee;
    constructor(address game_, IERC721 chogs_, ISwapRouter02 router_, address wmon_, address usdc_, uint24 fee_) QuestAdapterBase(game_, chogs_) {
        router = router_; wmon = wmon_; usdc = usdc_; fee = fee_;
    }

    function run(uint256, address, bytes calldata data) external payable onlyGame nonReentrant returns (uint256 got) {
        uint256 b0 = IERC20(usdc).balanceOf(game);
        router.exactInputSingle{value: msg.value}(ISwapRouter02.ExactInputSingleParams(wmon, usdc, fee, game, msg.value, _minOut(data), 0));
        got = IERC20(usdc).balanceOf(game) - b0;
        if (got == 0 || got < _minOut(data)) revert Slippage();
    }
}

/// Stations: stake MON into a liquid-staking token. kind 0 = ERC-4626 with native MON (shMON, aprMON),
/// 2 = Kintsu deposit(uint96 minShares, receiver) (sMON). The LST is held for the Chog.
/// (Magma gMON is not wired: its public deposit paths revert on mainnet today; the tile links to the app.)
contract LstAdapter is QuestAdapterBase {
    address public immutable lst;
    uint8 public immutable kind;
    constructor(address game_, IERC721 chogs_, address lst_, uint8 kind_) QuestAdapterBase(game_, chogs_) { lst = lst_; kind = kind_; }

    function run(uint256 id, address, bytes calldata data) external payable onlyGame nonReentrant returns (uint256) {
        uint256 b0 = IERC20(lst).balanceOf(address(this));
        if (kind == 0) ILstErc4626Native(lst).deposit{value: msg.value}(msg.value, address(this));
        else ILstKintsu(lst).deposit{value: msg.value}(uint96(_minOut(data)), address(this));
        uint256 got = IERC20(lst).balanceOf(address(this)) - b0;
        if (got == 0 || got < _minOut(data)) revert Slippage();
        _hold(id, lst, got);
        return 0;
    }
}

/// $CHOG buyback: the game's fee pot (USDC) → WMON on Uniswap v3 → MON → $CHOG on nad.fun, sent to the burn address.
/// Only the game can call it, and only with USDC the game approved for that one call.
contract ChogBuybackAdapter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public immutable game;
    ISwapRouter02 public immutable uni;
    INadDexRouter public immutable nad;
    address public immutable usdc;
    address public immutable wmon;
    address public immutable chog;
    uint24 public immutable fee;
    error OnlyGame();

    constructor(address game_, ISwapRouter02 uni_, INadDexRouter nad_, address usdc_, address wmon_, address chog_, uint24 fee_) {
        game = game_; uni = uni_; nad = nad_; usdc = usdc_; wmon = wmon_; chog = chog_; fee = fee_;
    }

    function swapToChog(uint256 cashIn, uint256 minChog, address to) external nonReentrant returns (uint256 out) {
        if (msg.sender != game) revert OnlyGame();
        IERC20(usdc).safeTransferFrom(game, address(this), cashIn);
        IERC20(usdc).forceApprove(address(uni), cashIn);
        uint256 w = uni.exactInputSingle(ISwapRouter02.ExactInputSingleParams(usdc, wmon, fee, address(this), cashIn, 0, 0));
        IWMON(wmon).withdraw(w);
        uint256 d0 = IERC20(chog).balanceOf(to);
        nad.buy{value: w}(INadDexRouter.BuyParams(minChog, chog, to, block.timestamp));
        out = IERC20(chog).balanceOf(to) - d0;
    }

    receive() external payable {}
}

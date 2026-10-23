// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC4626Min {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function previewRedeem(uint256 shares) external view returns (uint256);
}

/// @title ChogSavings
/// @notice The Bank's savings desk. A Chog's owner parks USDC in a real Monad lending vault (mainnet: the Morpho vault
///         "Hyperithm USDC Apex", ERC-4626). The shares are held here against the Chog's tokenId, so savings belong to
///         the NFT and move with a sale. Only the current holder can withdraw. Yield comes from the lending market,
///         not from other players. This contract has no admin.
contract ChogSavings is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC721 public immutable CHOGS;
    IERC20 public immutable USDC;
    IERC4626Min public immutable VAULT;

    mapping(uint256 => uint256) public shares; // tokenId => vault shares
    mapping(uint256 => uint256) public principal; // tokenId => USDC put in minus taken out (for showing interest)

    event Saved(uint256 indexed id, address indexed from, uint256 assets, uint256 shares);
    event Withdrawn(uint256 indexed id, address indexed to, uint256 assets, uint256 shares);

    error NotOwner();
    error Bad();

    constructor(IERC721 chogs_, IERC20 usdc_, IERC4626Min vault_) { CHOGS = chogs_; USDC = usdc_; VAULT = vault_; }

    function deposit(uint256 id, uint256 assets) external nonReentrant returns (uint256 got) {
        if (CHOGS.ownerOf(id) != msg.sender) revert NotOwner();
        if (assets == 0) revert Bad();
        USDC.safeTransferFrom(msg.sender, address(this), assets);
        USDC.forceApprove(address(VAULT), assets);
        got = VAULT.deposit(assets, address(this));
        if (got == 0) revert Bad();
        shares[id] += got;
        principal[id] += assets;
        emit Saved(id, msg.sender, assets, got);
    }

    /// @notice Withdraw `s` shares (use type(uint256).max for everything) to the holder's wallet.
    function withdraw(uint256 id, uint256 s) external nonReentrant returns (uint256 assets) {
        if (CHOGS.ownerOf(id) != msg.sender) revert NotOwner();
        uint256 have = shares[id];
        if (s > have) s = have;
        if (s == 0) revert Bad();
        uint256 p = principal[id] * s / have;
        shares[id] = have - s;
        principal[id] -= p;
        assets = VAULT.redeem(s, msg.sender, address(this));
        emit Withdrawn(id, msg.sender, assets, s);
    }

    function savedValue(uint256 id) external view returns (uint256) { return shares[id] == 0 ? 0 : VAULT.previewRedeem(shares[id]); }
}

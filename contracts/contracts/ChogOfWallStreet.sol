// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @notice A whitelisted dapp adapter for Tier-A quests. If it returns `cashOut` > 0 it must have delivered that much of the
///         cash token (USDC) to the game in the same call; anything else it buys is held by the adapter for the Chog.
interface IQuestAdapter {
    function run(uint256 tokenId, address payer, bytes calldata data) external payable returns (uint256 cashOut);
}

/// @notice Swaps the game's buyback pot (USDC) into $CHOG and sends it to `to` (the burn address).
interface IBuyback {
    function swapToChog(uint256 cashIn, uint256 minChog, address to) external returns (uint256 chogOut);
}

/// @title ChogOfWallStreet
/// @notice A Monopoly-style board on Monad where land belongs to Chog NFTs, not wallets.
///         Every balance is keyed by tokenId. The game money is USDC (CASH). $CHOG is the utility token: extra rolls,
///         guards and hype are paid in $CHOG and burned, and the game's fees buy $CHOG back and burn it.
///         Nothing is ever minted: every payout comes from another Chog or the Commons surplus.
/// @dev Spec: docs/PLAN.md. Invariant (tested): CASH.balanceOf(this) == accounted().
contract ChogOfWallStreet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------------ constants
    uint256 public constant SUPPLY = 1969;
    uint256 internal constant E = 1e18; // accumulator precision, and one whole $CHOG
    uint256 internal constant U = 1e3; // one game unit = $0.001 (USDC has 6 decimals)
    uint256 internal constant BPS = 10_000;
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant START_DEPOSIT = 20_000 * U; // everyone opens with the same $20
    uint256 public constant TOPUP_CAP = 20_000 * U; // top-ups (and cash from app squares) per Chog per season
    uint256 public constant IDLE = 48 hours; // no roll for this long: the Chog's streets stop paying it
    uint256 public constant ROLL_EVERY = 30 minutes;
    uint256 public constant ROLL_CAP = 8;
    uint256 public constant EXTRA_ROLL_CHOG = 100 * E; // $CHOG, burned
    uint256 public constant BUY_FEE_BPS = 300; // 1% burned, 2% Commons
    uint256 public constant SELL_SPREAD_BPS = 500; // to the Commons
    uint256 public constant RENT_HOLDERS_BPS = 9000;
    uint256 public constant TAX_BPS_PER_DAY = 50; // 0.5% of Brick value per day
    uint256 public constant TAX_PREPAY_MAX = 3 days;
    uint256 public constant CAP_BPS = 4000; // one Chog holds at most 40% of a street...
    uint256 public constant CAP_FREE = 10; // ...after its first 10 Bricks
    uint256 public constant FAIR_START_MAX = 50_000 * U;
    uint256 public constant GO_BPS = 100;
    uint256 public constant GO_CAP = 500 * U;
    uint256 public constant LOUNGE_WIN_BPS = 2500;
    uint256 public constant BAIL = 500 * U;
    uint256 public constant MEV_TAX = 750 * U;
    uint256 public constant GAS_TAX_CAP = 1000 * U;
    uint256 public constant HEIST_MIN = 500 * U;
    uint256 public constant HEIST_FINE = 500 * U;
    uint256 public constant GUARD_CHOG = 500 * E; // $CHOG, burned
    uint256 public constant EXIT_BASE = 20;
    uint256 public constant EXIT_FLOOR = 10;
    uint256 public constant QUEUE = 48 hours;
    uint256 public constant MOVING_DAY = 72 hours;
    uint256 public constant DAILY_CAP_BPS = 200; // 2% of all game cash per UTC day
    uint256 public constant PRESTIGE_CAP = 50;
    uint256 public constant HYPE_STEP_BPS = 1000;
    uint256 public constant HYPE_MAX_BPS = 15_000;
    uint256 public constant HYPE_DUR = 4 hours;
    uint256 public constant SEASON = 7 days;
    uint256 public constant KEEPER_TIP = 5 * U;

    // board: 0 go, 1 property, 2 chest, 3 entropy, 4 gas tax, 5 mev tax, 6 jail, 7 lounge, 8 go-to-jail, 9 heist
    bytes internal constant KINDS = hex"00010201040101030101060101010101010201010701030101010101010108010109010103010501";
    // district per square (properties only): 1 brown .. 8 dark blue, 9 station, 10 utility
    bytes internal constant DISTRICT = hex"0001000100090200020200030a0303090400040400050005050906060a0600070700070900080008";

    // ------------------------------------------------------------------ storage
    IERC721 public immutable CHOGS;
    IERC20 public immutable CASH; // USDC
    IERC20 public immutable CHOG; // utility token, never held by the game
    address public admin; // can whitelist adapters, set the quest signer and seed tiers. Can never move funds.
    address public buybackAdapter;
    address public questSigner;
    bool public tiersFrozen;

    struct Prop {
        uint128 p0; // base Brick price
        uint128 baseRent;
        uint64 supply;
        uint256 reserve;
        uint256 acc; // rent per Brick, scaled 1e18
    }

    struct Chog {
        address owner; // last synced owner
        uint64 movedAt;
        uint64 woke;
        uint64 lastCash;
        uint64 taxUntil;
        uint64 checkpoint;
        uint64 rollTs;
        uint64 immuneUntil;
        uint64 hypeUntil;
        uint64 heistUntil;
        uint64 pendingBlock;
        uint64 lastRoll;
        uint32 rollsSeason;
        uint32 seasonNo;
        uint16 hypeBps;
        uint8 pos;
        uint8 rolls;
        uint8 jail;
        uint8 plan; // 0 safe, 1 balanced, 2 degen
        uint8 planCommitted;
        uint8 doubles;
        uint8 guards;
        uint8 tier; // 0 common .. 4 legendary
        bool jailCard;
        bool awake;
        uint256 cash;
        uint256 unclaimed;
        uint256 jar;
        uint256 sleepDebt;
        uint256 stamps; // bitmap of squares
        uint256 warden;
    }

    Prop[40] public props;
    mapping(uint256 => Chog) public chogs;
    mapping(uint256 => mapping(uint256 => uint64)) public bricks; // square => tokenId => n
    mapping(uint256 => mapping(uint256 => uint256)) internal debt; // square => tokenId => acc debt
    mapping(uint256 => mapping(uint256 => uint64)) public questDay; // tokenId => square => last UTC day
    mapping(uint256 => address) public adapterOf; // square => Tier-A adapter
    mapping(bytes32 => bool) public usedReceipt;
    uint256[] public awakeIds; // every woken Chog, for the app to draw the board
    uint256 public maxDeposit = type(uint256).max; // guarded launch: cap on a Chog's cash after a deposit
    mapping(uint256 => uint256) public seasonTopUp; // tokenId => cash added this season (top-ups + app squares)
    mapping(uint256 => uint256) public topUpSeason;

    struct CashOut { address to; uint128 net; uint64 readyAt; }
    mapping(uint256 => CashOut) public cashOuts;

    // buckets (all USDC held by this contract is in exactly one of these)
    uint256 public totalCash;
    uint256 public totalJar;
    uint256 public totalReserve;
    uint256 public rentEscrow; // rent credited to accumulators, not yet checkpointed
    uint256 public totalUnclaimed;
    uint256 public commons;
    uint256 public lounge;
    uint256 public seasonPot;
    uint256 public sleepPool;
    uint256 public queued;
    uint256 public buybackPot; // fees waiting to buy back $CHOG
    uint256 public burned; // USDC ever routed to buybacks, for display
    uint256 public chogBurned; // $CHOG burned (utilities + buybacks), for display

    uint256 public sleepAcc; // per-Chog Sleeping Dividend, scaled 1e18
    uint256 public cashDay;
    uint256 public cashedToday;
    uint256 public seasonNo = 1;
    uint256 public seasonStart;
    address public bellLeader; // owner of the last Brick buyer during the Closing Bell
    uint256 public bellLeaderToken;
    uint256 public bellEnd;

    // ------------------------------------------------------------------ events
    event Woke(uint256 indexed tokenId, address owner, uint256 deposit, uint256 dividend);
    event Rolled(uint256 indexed tokenId, uint256 block_, uint8 plan);
    event Landed(uint256 indexed tokenId, uint8 d1, uint8 d2, uint8 pos, uint256 rentPaid, uint64 bricksBought);
    event Rent(uint256 indexed square, uint256 indexed payer, uint256 amount);
    event Card(uint256 indexed tokenId, uint8 card);
    event Claimed(uint256 indexed tokenId, uint256 base, uint256 bonus, uint256 hype);
    event Hyped(uint256 indexed tokenId, address indexed from, uint256 amount, uint16 multBps);
    event Heist(uint256 indexed raider, uint256 indexed target, bool success, uint256 amount);
    event Quest(uint256 indexed tokenId, uint256 indexed square, bool firstStamp, uint256 chogIn);
    event CashOutRequested(uint256 indexed tokenId, address to, uint256 amount, uint256 tax, uint64 readyAt);
    event CashOutClaimed(uint256 indexed tokenId, address to, uint256 net);
    event SeasonEnded(uint256 indexed season, uint256 bellWinnerToken, uint256 bellPrize);
    event Buyback(uint256 cashIn, uint256 chogBurned);

    error NotOwner();
    error NotAwake();
    error Pending();
    error NoRolls();
    error NotHere();
    error Cap();
    error Funds();
    error Locked();
    error Bad();

    constructor(IERC721 chogs_, IERC20 cash_, IERC20 chog_, address questSigner_) {
        CHOGS = chogs_;
        CASH = cash_;
        CHOG = chog_;
        admin = msg.sender;
        questSigner = questSigner_;
        seasonStart = block.timestamp;
        uint128[11] memory p0 = [uint128(0), 40, 60, 90, 120, 160, 200, 250, 320, 180, 150];
        uint128[11] memory rent = [uint128(0), 60, 90, 130, 170, 220, 270, 330, 450, 200, 0];
        for (uint256 i; i < 40; ++i) {
            uint8 d = uint8(DISTRICT[i]);
            if (d != 0) props[i] = Prop(p0[d] * uint128(U), rent[d] * uint128(U), 0, 0, 0);
        }
    }

    // ------------------------------------------------------------------ admin (no fund access)
    function setAdapter(uint256 square, address adapter) external { if (msg.sender != admin) revert NotOwner(); adapterOf[square] = adapter; }
    function setQuestSigner(address s) external { if (msg.sender != admin) revert NotOwner(); questSigner = s; }
    function setTiers(uint256[] calldata ids, uint8[] calldata tiers) external {
        if (msg.sender != admin || tiersFrozen) revert NotOwner();
        for (uint256 i; i < ids.length; ++i) chogs[ids[i]].tier = tiers[i];
    }
    function freezeTiers() external { if (msg.sender != admin) revert NotOwner(); tiersFrozen = true; }
    /// @notice The contract that turns the buyback pot into burned $CHOG. Checked on every use: it must burn real $CHOG.
    function setBuybackAdapter(address a) external { if (msg.sender != admin) revert NotOwner(); buybackAdapter = a; }
    /// @notice Guarded launch: limits how much cash a Chog can hold after a deposit. Never touches funds.
    function setMaxDeposit(uint256 m) external { if (msg.sender != admin) revert NotOwner(); maxDeposit = m; }
    function awakeCount() external view returns (uint256) { return awakeIds.length; }
    function awakeList(uint256 from, uint256 n) external view returns (uint256[] memory ids) {
        uint256 len = awakeIds.length;
        if (from >= len) return ids;
        if (from + n > len) n = len - from;
        ids = new uint256[](n);
        for (uint256 i; i < n; ++i) ids[i] = awakeIds[from + i];
    }

    // ------------------------------------------------------------------ views
    function kind(uint256 sq) public pure returns (uint8) { return uint8(KINDS[sq]); }
    function district(uint256 sq) public pure returns (uint8) { return uint8(DISTRICT[sq]); }

    function brickPrice(uint256 sq) external view returns (uint256) { Prop storage p = props[sq]; return p.p0 + p.p0 * p.supply / 100; }

    /// @dev Integral of the linear curve price(s) = p0 * (1 + s/100) from s to s+n.
    function curve(uint256 p0, uint256 s, uint256 n) public pure returns (uint256) {
        return p0 * n + p0 * (s * n + n * (n - 1) / 2) / 100;
    }

    function level(uint256 sq) public view returns (uint256 l) {
        Prop storage p = props[sq];
        if (p.p0 == 0) return 0;
        uint256 x = p.reserve / p.p0;
        if (x >= 700) return 5; if (x >= 300) return 4; if (x >= 120) return 3; if (x >= 40) return 2; if (x >= 10) return 1;
    }

    function rentOf(uint256 sq, uint256 dice) public view returns (uint256) {
        uint16[6] memory m = [uint16(1), 2, 4, 7, 11, 16];
        uint256 l = level(sq);
        if (district(sq) == 10) return dice * 20 * U * m[l];
        uint256 r = props[sq].baseRent * m[l];
        if (sq == hotSquare()) r *= 2; // Hot Street: holders get double, the extra half comes from the Commons (see _payRent)
        return r;
    }

    function hotSquare() public view returns (uint256) {
        uint256 day = block.timestamp / 1 days;
        uint256 k = (day * 7 + 3) % 28;
        for (uint256 i; i < 40; ++i) if (district(i) != 0) { if (k == 0) return i; --k; }
        return 0;
    }

    function brickValue(uint256 id) public view returns (uint256 v) {
        for (uint256 i; i < 40; ++i) {
            uint256 n = bricks[i][id];
            if (n != 0) { Prop storage p = props[i]; v += curve(p.p0, p.supply - n, n) * (BPS - SELL_SPREAD_BPS) / BPS; }
        }
    }

    function pendingRent(uint256 id) public view returns (uint256 r) {
        for (uint256 i; i < 40; ++i) { uint256 n = bricks[i][id]; if (n != 0) r += (n * props[i].acc - debt[i][id]) / E; }
    }

    function prestige(uint256 id) public view returns (uint256) {
        Chog storage c = chogs[id];
        uint256 since = c.lastCash > c.woke ? c.lastCash : c.woke;
        uint256 d = (block.timestamp - since) / 1 days;
        return d > PRESTIGE_CAP ? PRESTIGE_CAP : d;
    }

    function stampCount(uint256 id) public view returns (uint256 n) { uint256 s = chogs[id].stamps; while (s != 0) { n += s & 1; s >>= 1; } }

    /// @notice Claim weight in percent above 1x: Prestige + stamps (max 28) + tier.
    function bonusPct(uint256 id) public view returns (uint256) {
        uint8[5] memory tb = [0, 3, 6, 8, 10];
        uint256 st = stampCount(id);
        return prestige(id) + (st > 28 ? 28 : st) + tb[chogs[id].tier];
    }

    function appraisal(uint256 id) public view returns (uint256) {
        Chog storage c = chogs[id];
        return c.cash + c.unclaimed + pendingRent(id) + brickValue(id) + c.jar;
    }

    function exitTaxPct(uint256 id) public view returns (uint256) {
        Chog storage c = chogs[id];
        uint256 since = c.lastCash > c.woke ? c.lastCash : c.woke;
        uint256 weeks_ = (block.timestamp - since) / 7 days;
        return weeks_ >= EXIT_BASE - EXIT_FLOOR ? EXIT_FLOOR : EXIT_BASE - weeks_;
    }

    function dailyCapLeft() public view returns (uint256) {
        uint256 cap = totalCash * DAILY_CAP_BPS / BPS;
        uint256 used = block.timestamp / 1 days == cashDay ? cashedToday : 0;
        return cap > used ? cap - used : 0;
    }

    function rollsOf(uint256 id) public view returns (uint256) { return _rolls(chogs[id]); }

    function _rolls(Chog storage c) internal view returns (uint256) {
        uint256 cap = ROLL_CAP + (c.tier > 0 ? 1 : 0);
        uint256 r = c.rolls + (block.timestamp - c.rollTs) / ROLL_EVERY;
        return r > cap ? cap : r;
    }

    function sleepingDividend(uint256 id) public view returns (uint256) { return (sleepAcc - chogs[id].sleepDebt) / E; }

    /// @notice Everything this contract should hold. Equals CASH.balanceOf(this) (zero-sum invariant).
    function accounted() external view returns (uint256) {
        return totalCash + totalJar + totalReserve + rentEscrow + totalUnclaimed + commons + lounge + seasonPot + sleepPool + queued + buybackPot;
    }

    /// @notice When this Chog's streets stop paying it: Property Tax runs out, or 48 hours pass without a roll.
    function earningUntil(uint256 id) public view returns (uint256) {
        Chog storage c = chogs[id];
        uint256 idle = uint256(c.lastRoll) + IDLE;
        return c.taxUntil < idle ? c.taxUntil : idle;
    }

    // ------------------------------------------------------------------ wake & sync
    function wake(uint256 id, uint256 amount) external nonReentrant {
        Chog storage c = chogs[id];
        if (CHOGS.ownerOf(id) != msg.sender) revert NotOwner();
        if (c.awake || amount != START_DEPOSIT) revert Bad();
        if (amount > maxDeposit) revert Cap();
        CASH.safeTransferFrom(msg.sender, address(this), amount);
        uint256 div = (sleepAcc - c.sleepDebt) / E;
        if (div > sleepPool) div = sleepPool;
        sleepPool -= div;
        c.sleepDebt = sleepAcc;
        c.awake = true;
        c.owner = msg.sender;
        c.woke = uint64(block.timestamp);
        c.lastCash = uint64(block.timestamp);
        c.taxUntil = uint64(block.timestamp + 1 days);
        c.checkpoint = uint64(block.timestamp);
        c.immuneUntil = uint64(block.timestamp + 1 days);
        c.rollTs = uint64(block.timestamp);
        c.lastRoll = uint64(block.timestamp);
        c.rolls = uint8(ROLL_CAP);
        c.plan = 1;
        c.seasonNo = uint32(seasonNo);
        awakeIds.push(id);
        _addCash(c, amount + div);
        emit Woke(id, msg.sender, amount, div);
    }

    /// @notice Registers a new owner after a marketplace sale and starts Moving Day (72h cash-out lock).
    function sync(uint256 id) public {
        Chog storage c = chogs[id];
        address o = CHOGS.ownerOf(id);
        if (c.awake && o != c.owner) { c.owner = o; c.movedAt = uint64(block.timestamp); }
    }

    function topUp(uint256 id, uint256 amount) external nonReentrant {
        if (!chogs[id].awake) revert NotAwake();
        if (chogs[id].cash + amount > maxDeposit) revert Cap();
        _countTopUp(id, amount);
        CASH.safeTransferFrom(msg.sender, address(this), amount);
        _addCash(chogs[id], amount);
    }

    function setPlan(uint256 id, uint8 plan) external { _own(id); if (plan > 2) revert Bad(); chogs[id].plan = plan; }

    // ------------------------------------------------------------------ rolling
    /// @notice Commit a roll with the current plan. Anyone may land it from the next block (see settle).
    function roll(uint256 id) external {
        Chog storage c = _own(id);
        if (c.pendingBlock != 0) revert Pending();
        _checkpoint(id, c); // settle rent up to now before the 48-hour clock restarts
        c.lastRoll = uint64(block.timestamp);
        _useRoll(c);
        c.pendingBlock = uint64(block.number);
        c.planCommitted = c.plan;
        emit Rolled(id, block.number, c.plan);
    }

    /// @notice An extra roll costs 100 $CHOG from the owner's wallet, burned.
    function buyExtraRoll(uint256 id) external {
        Chog storage c = _own(id);
        _burnChog(msg.sender, EXTRA_ROLL_CHOG);
        c.rolls += 1;
    }

    /// @notice Lands a committed roll. Callable by anyone ("no stalling"). A non-owner caller earns a small tip.
    function settle(uint256 id) external nonReentrant {
        Chog storage c = chogs[id];
        uint256 b = c.pendingBlock;
        if (b == 0 || block.number <= b) revert Pending();
        bytes32 h = blockhash(b);
        if (h == bytes32(0)) h = blockhash(block.number - 1); // stale commit (>256 blocks): use the latest hash
        uint256 seed = uint256(keccak256(abi.encode(h, id, c.rollsSeason, seasonNo)));
        c.pendingBlock = 0;
        _tickSeason();
        if (msg.sender != c.owner && c.cash >= KEEPER_TIP) { _subCash(c, KEEPER_TIP); CASH.safeTransfer(msg.sender, KEEPER_TIP); }
        _resolve(id, c, seed);
    }

    function _resolve(uint256 id, Chog storage c, uint256 seed) internal {
        uint8 d1 = uint8(seed % 6) + 1;
        uint8 d2 = uint8((seed >> 8) % 6) + 1;
        c.rollsSeason += 1;
        if (c.jail > 0) {
            if (d1 == d2 || c.jailCard) { c.jail = 0; c.jailCard = d1 == d2 ? c.jailCard : false; }
            else { c.jail -= 1; emit Landed(id, d1, d2, c.pos, 0, 0); return; }
        }
        c.doubles = d1 == d2 ? c.doubles + 1 : 0;
        if (c.doubles == 3) { _toJail(c); emit Landed(id, d1, d2, c.pos, 0, 0); return; }
        if (c.doubles > 0) c.rolls += 1; // doubles: free roll
        uint256 to = c.pos + d1 + d2;
        if (to >= 40) { to -= 40; _passGo(id, c); }
        c.pos = uint8(to);
        (uint256 rent, uint64 bought) = _land(id, c, d1 + d2, seed >> 16);
        emit Landed(id, d1, d2, c.pos, rent, bought);
    }

    function _land(uint256 id, Chog storage c, uint256 dice, uint256 seed) internal returns (uint256 rent, uint64 bought) {
        uint8 k = kind(c.pos);
        if (k == 1) {
            rent = _payRent(id, c, c.pos, dice);
            if (c.jail == 0) bought = _planBuy(id, c, c.pos);
        } else if (k == 4) {
            uint256 t = c.cash * 5 / 100;
            _toLounge(c, t > GAS_TAX_CAP ? GAS_TAX_CAP : t);
        } else if (k == 5) {
            _toLounge(c, MEV_TAX);
        } else if (k == 7) {
            uint256 w = lounge * LOUNGE_WIN_BPS / BPS;
            lounge -= w;
            _addCash(c, w);
        } else if (k == 8) {
            _toJail(c);
        } else if (k == 9) {
            c.heistUntil = uint64(block.timestamp + 1 hours);
        } else if (k == 2 || k == 3) {
            uint8 card = uint8(seed % 8);
            if (card == 0) _fromCommons(c, 200 * U);
            else if (card == 1) _toLounge(c, 300 * U);
            else if (card == 2) c.rolls += 1;
            else if (card == 3) _toJail(c);
            else if (card == 4) { c.pos = 0; _passGo(id, c); }
            else if (card == 5) _fromCommons(c, 150 * U);
            else if (card == 6) _toLounge(c, 100 * U);
            else c.jailCard = true;
            emit Card(id, card);
        }
    }

    // ------------------------------------------------------------------ Bricks
    function _planBuy(uint256 id, Chog storage c, uint256 sq) internal returns (uint64 n) {
        uint8 plan = c.planCommitted;
        uint256 maxN = plan == 0 ? 3 : plan == 1 ? 6 : 15;
        uint256 keepBps = plan == 0 ? 5000 : plan == 1 ? 2500 : 0;
        if (plan == 0 && level(sq) > 1) return 0;
        if ((sq == 1 || sq == 3) && appraisal(id) >= FAIR_START_MAX) return 0; // Fair Start streets
        uint256 budget = c.cash * (BPS - keepBps) / BPS;
        Prop storage p = props[sq];
        n = uint64(maxN);
        uint256 room = _room(p, bricks[sq][id], n);
        if (n > room) n = uint64(room);
        while (n > 0 && curve(p.p0, p.supply, n) * (BPS + BUY_FEE_BPS) / BPS > budget) --n;
        if (n > 0) _buy(id, c, sq, n);
    }

    function _room(Prop storage p, uint256 mine, uint256 n) internal view returns (uint256) {
        uint256 cap = (p.supply + n) * CAP_BPS / BPS;
        if (cap < CAP_FREE) cap = CAP_FREE;
        return cap > mine ? cap - mine : 0;
    }

    function _buy(uint256 id, Chog storage c, uint256 sq, uint64 n) internal {
        _checkpoint(id, c);
        Prop storage p = props[sq];
        uint256 cost = curve(p.p0, p.supply, n);
        uint256 fee = cost * BUY_FEE_BPS / BPS;
        _subCash(c, cost + fee);
        p.reserve += cost;
        totalReserve += cost;
        p.supply += n;
        bricks[sq][id] += n;
        debt[sq][id] += uint256(n) * p.acc;
        uint256 b = cost / 100;
        _toBuyback(b);
        _toCommons(fee - b);
        if (bellEnd != 0) { bellEnd += 1 minutes; bellLeaderToken = id; bellLeader = c.owner; }
    }

    /// @notice Sell Bricks back to the street's curve from anywhere. Proceeds stay in the Chog as cash.
    function sellBricks(uint256 id, uint256 sq, uint64 n, uint256 minOut) external nonReentrant {
        Chog storage c = _own(id);
        if (n == 0 || bricks[sq][id] < n) revert Bad();
        _checkpoint(id, c);
        Prop storage p = props[sq];
        uint256 v = curve(p.p0, p.supply - n, n);
        uint256 spread = v * SELL_SPREAD_BPS / BPS;
        if (v - spread < minOut) revert Bad();
        p.reserve -= v;
        totalReserve -= v;
        p.supply -= n;
        bricks[sq][id] -= n;
        debt[sq][id] -= uint256(n) * p.acc;
        _toCommons(spread);
        _addCash(c, v - spread);
    }

    function _payRent(uint256 id, Chog storage c, uint256 sq, uint256 dice) internal returns (uint256 paid) {
        Prop storage p = props[sq];
        uint256 others = p.supply - bricks[sq][id];
        if (others == 0) return 0;
        uint256 rent = rentOf(sq, dice);
        uint256 extra; // Hot Street: the doubled half is paid by the Commons surplus, not by the lander
        if (sq == hotSquare() && district(sq) != 10) { rent /= 2; extra = rent > commons ? commons : rent; commons -= extra; }
        paid = rent > c.cash ? c.cash : rent;
        _subCash(c, paid);
        uint256 holders = paid * RENT_HOLDERS_BPS / BPS;
        _toCommons(paid - holders);
        uint256 dist = holders + extra;
        // pro rata over every Brick (including the lander's own), credited through the accumulator
        p.acc += dist * E / p.supply;
        rentEscrow += dist;
        if (paid < rent) _toJail(c); // could not pay: Broke, straight to Rug Jail (never bad debt)
        emit Rent(sq, id, paid);
    }

    // ------------------------------------------------------------------ rent, tax, claims
    /// @dev Moves accumulated rent into `unclaimed`. Rent earned while Property Tax was unpaid, or after 48 hours
    ///      without a roll, goes to the Commons instead (pro rata over the time since the last checkpoint).
    function _checkpoint(uint256 id, Chog storage c) internal {
        uint256 pending;
        for (uint256 i; i < 40; ++i) {
            uint256 n = bricks[i][id];
            if (n == 0) continue;
            uint256 owed = (n * props[i].acc - debt[i][id]) / E;
            debt[i][id] = n * props[i].acc;
            pending += owed;
        }
        uint256 last = c.checkpoint;
        c.checkpoint = uint64(block.timestamp);
        if (pending == 0) return;
        if (pending > rentEscrow) pending = rentEscrow;
        rentEscrow -= pending;
        uint256 span = block.timestamp - last;
        uint256 until = earningUntil(id);
        uint256 paidFrom = until > last ? until : last;
        uint256 lapsed = block.timestamp > paidFrom ? block.timestamp - paidFrom : 0;
        uint256 forfeit = span == 0 ? 0 : pending * (lapsed > span ? span : lapsed) / span;
        _toCommons(forfeit);
        c.unclaimed += pending - forfeit;
        totalUnclaimed += pending - forfeit;
    }

    function checkpoint(uint256 id) external { _checkpoint(id, chogs[id]); }

    /// @notice Claim rent into the Chog's cash. Bonuses above 1x (Prestige, stamps, tier, hype) come from the Commons
    ///         surplus, at most 10% of it per claim. Nothing is minted.
    function claim(uint256 id) external nonReentrant {
        Chog storage c = _own(id);
        _checkpoint(id, c);
        uint256 base = c.unclaimed;
        if (base == 0) return;
        c.unclaimed = 0;
        totalUnclaimed -= base;
        uint256 bonus = base * bonusPct(id) / 100;
        uint256 lim = commons / 10;
        if (bonus > lim) bonus = lim;
        commons -= bonus;
        uint256 boost;
        if (block.timestamp < c.hypeUntil && c.hypeBps > BPS) {
            boost = base * (c.hypeBps - BPS) / BPS;
            if (boost > lim - bonus) boost = lim - bonus;
            commons -= boost;
        }
        _addCash(c, base + bonus + boost);
        emit Claimed(id, base, bonus, boost);
    }

    /// @notice Prepay Property Tax (0.5% of Brick value per day), at most 3 days ahead.
    function prepayTax(uint256 id, uint256 secs) external nonReentrant {
        Chog storage c = chogs[id];
        if (!c.awake) revert NotAwake();
        _checkpoint(id, c);
        uint256 start = c.taxUntil > block.timestamp ? c.taxUntil : block.timestamp;
        uint256 end = start + secs;
        if (end > block.timestamp + TAX_PREPAY_MAX) end = block.timestamp + TAX_PREPAY_MAX;
        if (end <= start) return;
        uint256 cost = brickValue(id) * TAX_BPS_PER_DAY * (end - start) / BPS / 1 days;
        _subCash(c, cost);
        _toCommons(cost);
        c.taxUntil = uint64(end);
    }

    // ------------------------------------------------------------------ jail, guards, hype, heist
    function payBail(uint256 id) external {
        Chog storage c = _own(id);
        if (c.jail == 0) revert Bad();
        _subCash(c, BAIL);
        _toBuyback(BAIL / 2);
        lounge += BAIL / 2;
        c.jail = 0;
    }

    /// @notice A guard costs 500 $CHOG from the owner's wallet, burned.
    function hireGuard(uint256 id) external {
        Chog storage c = _own(id);
        if (c.guards >= 4) revert Cap();
        _burnChog(msg.sender, GUARD_CHOG);
        c.guards += 1;
    }

    /// @notice Anyone can hype any awake Chog with $CHOG: 10% burned, 90% straight to its owner as a tip.
    ///         Its rent claims get +0.10x for 4h (max 1.5x), paid from the Commons surplus.
    function hype(uint256 id, uint256 amount) external nonReentrant {
        Chog storage c = chogs[id];
        if (!c.awake || amount < 10) revert Bad();
        uint256 b = amount / 10;
        _burnChog(msg.sender, b);
        CHOG.safeTransferFrom(msg.sender, CHOGS.ownerOf(id), amount - b);
        uint256 base = block.timestamp < c.hypeUntil ? c.hypeBps : BPS;
        uint256 m = base + HYPE_STEP_BPS;
        c.hypeBps = uint16(m > HYPE_MAX_BPS ? HYPE_MAX_BPS : m);
        c.hypeUntil = uint64(block.timestamp + HYPE_DUR);
        emit Hyped(id, msg.sender, amount, c.hypeBps);
    }

    /// @notice After landing on HEIST, rob 10% of another Chog's unclaimed rent (never its cash or Bricks).
    function heist(uint256 id, uint256 target) external nonReentrant {
        Chog storage r = _own(id);
        Chog storage t = chogs[target];
        if (block.timestamp > r.heistUntil || !t.awake || block.timestamp < t.immuneUntil) revert Bad();
        if (CHOGS.ownerOf(target) == msg.sender) revert Bad(); // no robbing your own Chogs
        r.heistUntil = 0;
        _checkpoint(target, t);
        if (t.unclaimed < HEIST_MIN) revert Bad();
        uint8[5] memory def = [0, 5, 10, 15, 20];
        int256 chance = 55 - int256(uint256(def[t.tier])) - int256(uint256(t.guards) * 5);
        if (chance < 10) chance = 10;
        uint256 roll_ = uint256(keccak256(abi.encode(blockhash(block.number - 1), id, target))) % 100;
        if (int256(roll_) < chance) {
            uint256 s = t.unclaimed / 10;
            t.unclaimed -= s;
            totalUnclaimed -= s;
            _addCash(r, s);
            emit Heist(id, target, true, s);
        } else {
            uint256 f = r.cash < HEIST_FINE ? r.cash : HEIST_FINE;
            _subCash(r, f);
            _addCash(t, f);
            t.warden += 20;
            _toJail(r);
            emit Heist(id, target, false, f);
        }
    }

    // ------------------------------------------------------------------ dapp quests
    /// @notice Tier A: the owner sends MON and a whitelisted adapter performs the dapp action (stake, buy $CHOG, swap).
    ///         USDC it returns lands in the Chog's cash (counts toward the season top-up cap); anything else is held
    ///         by the adapter for the Chog. Only on the square the Chog is standing on.
    function quest(uint256 id, bytes calldata data) external payable nonReentrant {
        Chog storage c = _own(id);
        address a = adapterOf[c.pos];
        if (a == address(0)) revert NotHere();
        uint256 b0 = CASH.balanceOf(address(this));
        uint256 out = IQuestAdapter(a).run{value: msg.value}(id, msg.sender, data);
        if (CASH.balanceOf(address(this)) - b0 < out) revert Bad();
        if (out != 0) { _countTopUp(id, out); _addCash(c, out); }
        _stamp(id, c, c.pos, out);
    }

    /// @notice Tier B: proof-of-visit. A signed receipt that the owner's wallet used the dapp (checked by the indexer).
    function questReceipt(uint256 id, uint256 sq, bytes32 txHash, uint256 expiry, bytes calldata sig) external {
        Chog storage c = _own(id);
        if (block.timestamp > expiry || usedReceipt[txHash] || c.pos != sq) revert Bad();
        bytes32 h = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encode(block.chainid, address(this), id, sq, txHash, expiry, msg.sender)));
        if (ECDSA.recover(h, sig) != questSigner) revert Bad();
        usedReceipt[txHash] = true;
        _stamp(id, c, sq, 0);
    }

    function _stamp(uint256 id, Chog storage c, uint256 sq, uint256 out) internal {
        bool first = c.stamps & (1 << sq) == 0;
        c.stamps |= 1 << sq;
        uint64 day = uint64(block.timestamp / 1 days);
        if (questDay[id][sq] != day) { questDay[id][sq] = day; c.rolls += 1; }
        emit Quest(id, sq, first, out);
    }

    // ------------------------------------------------------------------ cash-out
    /// @notice Request a cash-out. Taxed 10-20%, queued 48h, capped city-wide, and it resets Prestige to 0.
    function requestCashOut(uint256 id, uint256 amount) external nonReentrant {
        Chog storage c = _own(id);
        if (block.timestamp < uint256(c.movedAt) + MOVING_DAY || cashOuts[id].net != 0) revert Locked();
        if (amount == 0 || amount > dailyCapLeft()) revert Cap();
        uint256 tax = amount * exitTaxPct(id) / 100;
        _subCash(c, amount);
        if (block.timestamp / 1 days != cashDay) { cashDay = block.timestamp / 1 days; cashedToday = 0; }
        cashedToday += amount;
        commons += tax / 2;
        _toBuyback(tax / 4);
        seasonPot += tax - tax / 2 - tax / 4;
        c.lastCash = uint64(block.timestamp);
        uint64 ready = uint64(block.timestamp + QUEUE);
        cashOuts[id] = CashOut(msg.sender, uint128(amount - tax), ready);
        queued += amount - tax;
        emit CashOutRequested(id, msg.sender, amount, tax, ready);
    }

    function claimCashOut(uint256 id) external nonReentrant {
        CashOut memory q = cashOuts[id];
        if (q.net == 0 || block.timestamp < q.readyAt) revert Locked();
        delete cashOuts[id];
        queued -= q.net;
        CASH.safeTransfer(q.to, q.net);
        emit CashOutClaimed(id, q.to, q.net);
    }

    // ------------------------------------------------------------------ seasons (Closing Bell)
    function _tickSeason() internal {
        uint256 end = seasonStart + SEASON;
        if (bellEnd == 0 && block.timestamp >= end - 1 days) bellEnd = end;
        if (bellEnd != 0 && block.timestamp >= bellEnd) {
            uint256 prize = seasonPot / 10;
            if (bellLeader != address(0)) {
                Chog storage w = chogs[bellLeaderToken];
                seasonPot -= prize;
                _addCash(w, prize);
            } else prize = 0;
            // Leaderboard shares (top-10, Wardens, Golden Chog) ship later as a Merkle distributor; until then the pot rolls over.
            emit SeasonEnded(seasonNo, bellLeaderToken, prize);
            seasonNo += 1;
            seasonStart = block.timestamp;
            bellEnd = 0;
            bellLeader = address(0);
            bellLeaderToken = 0;
        }
    }

    function tickSeason() external { _tickSeason(); }

    // ------------------------------------------------------------------ $CHOG buyback
    /// @notice Anyone can turn the buyback pot into $CHOG and burn it. The burn address must receive at least `minChog`.
    function buyback(uint256 minChog) external nonReentrant {
        uint256 a = buybackPot;
        address ad = buybackAdapter;
        if (a == 0 || ad == address(0)) revert Bad();
        buybackPot = 0;
        uint256 b0 = CASH.balanceOf(address(this));
        uint256 d0 = CHOG.balanceOf(DEAD);
        CASH.forceApprove(ad, a);
        IBuyback(ad).swapToChog(a, minChog, DEAD);
        CASH.forceApprove(ad, 0);
        uint256 used = b0 - CASH.balanceOf(address(this));
        if (used > a) revert Bad();
        if (used < a) buybackPot = a - used; // anything not spent stays in the pot
        uint256 got = CHOG.balanceOf(DEAD) - d0;
        if (got == 0 || got < minChog) revert Bad();
        chogBurned += got;
        emit Buyback(used, got);
    }

    // ------------------------------------------------------------------ internals
    function _own(uint256 id) internal returns (Chog storage c) {
        c = chogs[id];
        if (!c.awake) revert NotAwake();
        sync(id);
        if (c.owner != msg.sender) revert NotOwner();
    }

    function _useRoll(Chog storage c) internal {
        uint256 r = _rolls(c);
        if (r == 0) revert NoRolls();
        // advance the refill clock by whole periods consumed
        uint256 periods = (block.timestamp - c.rollTs) / ROLL_EVERY;
        c.rollTs = uint64(c.rollTs + periods * ROLL_EVERY);
        if (r == ROLL_CAP + (c.tier > 0 ? 1 : 0)) c.rollTs = uint64(block.timestamp);
        c.rolls = uint8(r - 1);
    }

    function _passGo(uint256 id, Chog storage c) internal {
        uint256 amt = brickValue(id) * GO_BPS / BPS;
        _fromCommons(c, amt > GO_CAP ? GO_CAP : amt);
    }

    function _toJail(Chog storage c) internal { c.pos = 10; c.jail = 3; c.doubles = 0; }

    function _addCash(Chog storage c, uint256 a) internal { c.cash += a; totalCash += a; }

    function _subCash(Chog storage c, uint256 a) internal { if (c.cash < a) revert Funds(); c.cash -= a; totalCash -= a; }

    function _toLounge(Chog storage c, uint256 a) internal { if (a > c.cash) a = c.cash; _subCash(c, a); lounge += a; }

    function _fromCommons(Chog storage c, uint256 a) internal { if (a > commons) a = commons; commons -= a; _addCash(c, a); }

    /// @dev Inflow to the Commons: 80% Commons, 10% Sleeping Chog Dividend (all 1,969 Chogs), 10% season pot.
    function _toCommons(uint256 a) internal {
        if (a == 0) return;
        uint256 s = a / 10;
        uint256 sp = a / 10;
        commons += a - s - sp;
        sleepPool += s;
        sleepAcc += s * E / SUPPLY;
        seasonPot += sp;
    }

    function _toBuyback(uint256 a) internal { if (a == 0) return; buybackPot += a; burned += a; }

    function _burnChog(address from, uint256 a) internal { CHOG.safeTransferFrom(from, DEAD, a); chogBurned += a; }

    function _countTopUp(uint256 id, uint256 a) internal {
        if (topUpSeason[id] != seasonNo) { topUpSeason[id] = seasonNo; seasonTopUp[id] = 0; }
        seasonTopUp[id] += a;
        if (seasonTopUp[id] > TOPUP_CAP) revert Cap();
    }
}

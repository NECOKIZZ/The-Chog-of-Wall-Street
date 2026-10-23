// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IChogGame {
    function seasonNo() external view returns (uint256);
    function seasonStats(uint256 id) external view returns (uint256 season, uint256 rolls, uint256 warden, uint256 start);
    function appraisal(uint256 id) external view returns (uint256);
    function activeCount(uint256 s) external view returns (uint256);
    function activeIn(uint256 s, uint256 id) external view returns (bool);
    function prizePool(uint256 s) external view returns (uint256);
    function endedAt(uint256 s) external view returns (uint256);
    function payPrize(uint256 s, uint256 id, uint256 amt) external;
    function takeWealthTax(uint256 s, uint256 id) external returns (uint256);
}

/// @title ChogSeasons
/// @notice Decides who gets each ended season's prize pool, and who pays the season-end wealth tax.
///         It never holds money: the game keeps the pool and enforces the limits (never more than the pool,
///         tax is exactly 5% of cash, once per Chog per season). Every function is open to anyone.
///
///         During a season, anyone can `rank` a Chog: its growth this season (net worth now minus net worth when it
///         joined the season) is entered on the top-10 board, and its heist defences on the top-3 Warden board.
///         After the season ends there is a 24-hour settlement window. Anyone can `nominate` active Chogs for the
///         bottom board (the poorest quarter by net worth, at most 50). Then `settle` takes the 5% wealth tax from
///         every Chog on the bottom board into the pool, and `claim` pays each Chog its share:
///           45% to the top 10 by growth (weights 10..1), +5% to #1, 15% to the top Wardens, 35% to every Chog with
///           20+ rolls. Unclaimed money rolls into a later season pot after 30 days (in the game).
contract ChogSeasons {
    IChogGame public immutable game;
    uint256 public constant TOP = 10;
    uint256 public constant WARDENS = 3;
    uint256 public constant MAX_BOTTOM = 50;
    uint256 public constant WINDOW = 1 days;

    mapping(uint256 => uint256[]) internal topIds;
    mapping(uint256 => int256[]) internal topScore;
    mapping(uint256 => uint256[]) internal wardIds;
    mapping(uint256 => int256[]) internal wardScore;
    mapping(uint256 => uint256[]) internal bottomIds;
    mapping(uint256 => int256[]) internal bottomScore;
    mapping(uint256 => bool) public settled;
    mapping(uint256 => uint256) public base; // season => pool size when settled (shares are fractions of this)
    mapping(uint256 => mapping(uint256 => bool)) public claimed;

    event Ranked(uint256 indexed season, uint256 indexed id, int256 growth, uint256 warden);
    event Nominated(uint256 indexed season, uint256 indexed id, uint256 netWorth);
    event Settled(uint256 indexed season, uint256 taxed, uint256 pool);
    event Claimed(uint256 indexed season, uint256 indexed id, uint256 amount);

    error Bad();

    constructor(IChogGame game_) { game = game_; }

    // ------------------------------------------------------------------ during the season
    function rank(uint256 id) external {
        uint256 s = game.seasonNo();
        (uint256 season, , uint256 warden, uint256 start) = game.seasonStats(id);
        if (season != s) revert Bad(); // the Chog hasn't played this season
        int256 growth = int256(game.appraisal(id)) - int256(start);
        _insert(topIds[s], topScore[s], id, growth, TOP, true);
        if (warden > 0) _insert(wardIds[s], wardScore[s], id, int256(warden), WARDENS, true);
        emit Ranked(s, id, growth, warden);
    }

    // ------------------------------------------------------------------ settlement (24 hours after the season ends)
    function nominate(uint256 s, uint256 id) external {
        uint256 end = game.endedAt(s);
        if (end == 0 || block.timestamp >= end + WINDOW || !game.activeIn(s, id)) revert Bad();
        uint256 k = game.activeCount(s) / 4;
        if (k > MAX_BOTTOM) k = MAX_BOTTOM;
        if (k == 0) revert Bad();
        uint256 v = game.appraisal(id);
        _insert(bottomIds[s], bottomScore[s], id, int256(v), k, false);
        emit Nominated(s, id, v);
    }

    function settle(uint256 s) external {
        uint256 end = game.endedAt(s);
        if (end == 0 || block.timestamp < end + WINDOW || settled[s]) revert Bad();
        settled[s] = true;
        uint256[] storage b = bottomIds[s];
        uint256 total;
        for (uint256 i; i < b.length; ++i) total += game.takeWealthTax(s, b[i]);
        base[s] = game.prizePool(s);
        emit Settled(s, total, base[s]);
    }

    function claim(uint256 s, uint256 id) external returns (uint256 amt) {
        if (!settled[s] || claimed[s][id]) revert Bad();
        amt = owed(s, id);
        claimed[s][id] = true;
        if (amt > 0) game.payPrize(s, id, amt);
        emit Claimed(s, id, amt);
    }

    // ------------------------------------------------------------------ views
    function owed(uint256 s, uint256 id) public view returns (uint256 amt) {
        if (!settled[s] || claimed[s][id]) return 0;
        uint256 pool = base[s];
        uint256[] storage t = topIds[s];
        uint256 n = t.length;
        for (uint256 i; i < n; ++i) if (t[i] == id) {
            uint256 weights = n * (2 * TOP + 1 - n) / 2; // TOP + (TOP-1) + ... over the filled places
            amt += pool * 45 / 100 * (TOP - i) / weights;
            if (i == 0) amt += pool * 5 / 100;
        }
        uint256[] storage w = wardIds[s];
        for (uint256 i; i < w.length; ++i) if (w[i] == id) amt += pool * 15 / 100 / w.length;
        uint256 ac = game.activeCount(s);
        if (ac > 0 && game.activeIn(s, id)) amt += pool * 35 / 100 / ac;
    }

    function top(uint256 s) external view returns (uint256[] memory ids, int256[] memory scores) { return (topIds[s], topScore[s]); }
    function wardens(uint256 s) external view returns (uint256[] memory ids, int256[] memory scores) { return (wardIds[s], wardScore[s]); }
    function bottom(uint256 s) external view returns (uint256[] memory ids, int256[] memory scores) { return (bottomIds[s], bottomScore[s]); }

    // ------------------------------------------------------------------ internals
    /// @dev Keeps a sorted board of at most `max` entries. Re-entering an id replaces its old score.
    function _insert(uint256[] storage ids, int256[] storage sc, uint256 id, int256 score, uint256 max, bool high) internal {
        uint256 n = ids.length;
        for (uint256 i; i < n; ++i) if (ids[i] == id) { // remove the old entry
            for (uint256 j = i; j + 1 < n; ++j) { ids[j] = ids[j + 1]; sc[j] = sc[j + 1]; }
            ids.pop(); sc.pop(); n -= 1;
            break;
        }
        uint256 at = n;
        for (uint256 i; i < n; ++i) if (high ? score > sc[i] : score < sc[i]) { at = i; break; }
        if (at >= max) return;
        ids.push(id); sc.push(score);
        for (uint256 j = n; j > at; --j) { ids[j] = ids[j - 1]; sc[j] = sc[j - 1]; }
        ids[at] = id; sc[at] = score;
        if (ids.length > max) { ids.pop(); sc.pop(); }
    }
}

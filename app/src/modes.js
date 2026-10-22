"use strict";
/* City picker: Practice (local sim), Testnet and Mainnet (real contracts). Shown first; remembered in the URL hash. */
(() => {
  const LABEL = { practice: "Practice City · play money", testnet: "Testnet City · Monad testnet", mainnet: "Mainnet City · real $CHOG" };
  function pick(mode) {
    $("#modes").hidden = true; $("#wake").hidden = false;
    document.body.dataset.mode = mode;
    $("#modeBadge").textContent = LABEL[mode];
    try { history.replaceState(null, "", "#mode-" + mode); } catch (e) { /* sandboxed viewer */ }
    if (mode !== "practice") {
      if (!window.ethers) { toast("Couldn't load the wallet library. Check your connection and reload."); return; }
      Chain.enter(mode);
    }
  }
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => pick(b.dataset.mode)));
  $("#modeBadge").addEventListener("click", () => { location.hash = ""; location.reload(); });
  const m = (location.hash.match(/^#mode-(practice|testnet|mainnet)$/) || [])[1];
  if (m) pick(m);
})();

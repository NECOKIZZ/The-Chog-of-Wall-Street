#!/usr/bin/env bash
# Rebuild app/index.html (standalone, no server needed) from the parts in this folder.
set -euo pipefail
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%276.5%27 cy=%278.5%27 r=%274.5%27 fill=%27%23FFB524%27/%3E%3Crect x=%272%27 y=%2716%27 width=%279%27 height=%2713%27 rx=%272.5%27 fill=%27%237042F5%27/%3E%3Crect x=%2712%27 y=%2710%27 width=%279%27 height=%2719%27 rx=%272.5%27 fill=%27%237042F5%27/%3E%3Crect x=%2722%27 y=%273%27 width=%279%27 height=%2726%27 rx=%272.5%27 fill=%27%237042F5%27/%3E%3C/svg%3E">'
  cat style.html; echo '</head><body>'; cat shell.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js"></script>'
  echo '<script>'; cat chogart.js chogtable.js logos.js; echo '</script>'
  for f in engine.js ui.js guide.js chain.js; do echo '<script>'; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } > ../index.html

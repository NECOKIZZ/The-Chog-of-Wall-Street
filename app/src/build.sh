#!/usr/bin/env bash
# Rebuild app/index.html (standalone, no server needed) from the parts in this folder.
set -euo pipefail
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  cat style.html; echo '</head><body>'; cat shell.html
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js"></script>'
  echo '<script>'; cat chogart.js chogtable.js logos.js; echo '</script>'
  for f in engine.js ui.js guide.js chain.js; do echo '<script>'; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } > ../index.html

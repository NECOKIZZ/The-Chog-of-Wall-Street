#!/usr/bin/env bash
# Rebuild app/index.html (standalone, no server needed) from the parts in this folder.
set -euo pipefail
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  cat head.html; echo '</head><body>'; cat body.html
  echo '<script>'; cat chogart.js; echo '</script><script>'; cat game.js; echo '</script><script>'; cat guide.js; echo '</script></body></html>'; } > ../index.html

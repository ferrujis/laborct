#!/bin/bash
# Monta o index.html final a partir dos arquivos separados.
set -e
OUT="dist/index.html"
mkdir -p dist

cat head.html > "$OUT"
cat css/styles.css >> "$OUT"
echo '</head>' >> "$OUT"
cat html/01-login.html >> "$OUT"
echo '<div id="app" style="display:none;">' >> "$OUT"
echo '' >> "$OUT"
echo '  <!-- HUB CENTRAL -->' >> "$OUT"
cat html/02-hub.html >> "$OUT"
cat html/03-labor.html >> "$OUT"
cat html/04-cogs.html >> "$OUT"
cat html/05-insights.html >> "$OUT"
cat html/06-admin.html >> "$OUT"
echo '</div><!-- /app -->' >> "$OUT"
cat html/07-footer.html >> "$OUT"
echo '<script>' >> "$OUT"
for f in js/01-core.js js/02-render-financeiro.js js/03-cogs.js js/04-insights.js js/05-import.js js/06-admin.js; do
  cat "$f" >> "$OUT"
done
echo '</script>' >> "$OUT"
echo '</body>' >> "$OUT"
echo '</html>' >> "$OUT"

echo "Build gerado em $OUT ($(wc -l < "$OUT") linhas)"

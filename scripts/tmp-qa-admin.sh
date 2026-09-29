B=http://localhost:3100
C=/tmp/qa-cookies.txt
probe() {
  local path="$1"; local expect="$2"
  local out; out=$(curl -s -b $C -o /tmp/body.txt -w "%{http_code}|%{content_type}|%{size_download}" "$B$path")
  local code=${out%%|*}; local rest=${out#*|}; local ctype=${rest%%|*}; local size=${rest##*|}
  local flag="OK "; [ "$code" != "$expect" ] && flag="!! "
  printf "%s %-42s %s  %-22s %sB\n" "$flag" "$path" "$code" "${ctype:0:22}" "$size"
}
echo "--- Pages admin (session Fondateur) ---"
for p in /admin /admin/cockpit /admin/commandes /admin/produits /admin/menus /admin/clients /admin/livreurs /admin/parametres /admin/parametres/livraison /admin/parametres/journal /admin/parametres/utilisateurs /admin/parametres/boutique /admin/parametres/notifications; do probe "$p" 200; done
echo "--- API admin ---"
for p in /api/admin/orders /api/admin/products /api/admin/menus /api/admin/customers /api/admin/drivers /api/admin/journal /api/admin/delivery /api/admin/me /api/admin/site-settings; do probe "$p" 200; done
echo "--- Cockpit par periode ---"
for p in "today" "week" "month" "all"; do probe "/admin/cockpit?period=$p" 200; done

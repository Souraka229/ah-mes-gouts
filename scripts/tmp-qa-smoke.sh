B=http://localhost:3100
probe() {
  local path="$1"; local expect="$2"
  local out; out=$(curl -s -o /tmp/body.txt -w "%{http_code}|%{content_type}|%{size_download}" "$B$path")
  local code=${out%%|*}; local rest=${out#*|}; local ctype=${rest%%|*}; local size=${rest##*|}
  local flag="OK "
  [ "$code" != "$expect" ] && flag="!! "
  printf "%s %-46s %s  %-28s %sB\n" "$flag" "$path" "$code" "${ctype:0:28}" "$size"
}
echo "--- Pages boutique ---"
probe "/" 200
probe "/catalogue" 200
probe "/zones-de-livraison" 200
probe "/checkout" 200
probe "/infos" 200
echo "--- API boutique ---"
probe "/api/menu/active" 200
probe "/api/delivery/config" 200
probe "/api/delivery/slots" 200
probe "/api/payments/config" 200
probe "/api/health" 200
echo "--- Back-office (pages) ---"
probe "/admin" 200
probe "/admin/cockpit" 200
probe "/admin/commandes" 200
probe "/admin/produits" 200
probe "/admin/menus" 200
probe "/admin/clients" 200
probe "/admin/livreurs" 200
probe "/admin/parametres/livraison" 200
echo "--- API admin ---"
probe "/api/admin/orders" 200
probe "/api/admin/products" 200
probe "/api/admin/menus" 200
probe "/api/admin/customers" 200
probe "/api/admin/drivers" 200
probe "/api/admin/journal" 200
probe "/api/admin/delivery" 200
probe "/api/admin/me" 200

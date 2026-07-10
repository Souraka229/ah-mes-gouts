import { redirect } from "next/navigation";

export default function LegacyLivraisonRedirect() {
  redirect("/admin/parametres/livraison");
}

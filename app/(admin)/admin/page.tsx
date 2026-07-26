import { redirect } from "next/navigation";

// Le KDS (file des commandes) est l'écran d'accueil du back-office.
// Le tableau de bord analytique reste accessible sur /admin/cockpit.
export default function AdminHomePage() {
  redirect("/admin/commandes");
}

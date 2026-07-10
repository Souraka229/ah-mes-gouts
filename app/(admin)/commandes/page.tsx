import { redirect } from "next/navigation";

export default function LegacyCommandesRedirect() {
  redirect("/admin/commandes");
}

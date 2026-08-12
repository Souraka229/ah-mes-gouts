import { Bell } from "lucide-react";

const ALERTS = [
  {
    title: "Nouvelle commande payée",
    detail: "Montant, mode de réception et nom de la cliente.",
  },
  {
    title: "Vague de livraison complète",
    detail: "Au 35ᵉ colis : la tournée peut être constituée et assignée.",
  },
  {
    title: "Paiement rattrapé",
    detail:
      "Un paiement validé après l'abandon du suivi client, récupéré par la réconciliation automatique.",
  },
  {
    title: "Paiement sans réponse",
    detail: "Une tentative restée sans retour de l'opérateur depuis 2 h.",
  },
  {
    title: "Stock bas",
    detail: "Un produit passé sous son seuil d'alerte.",
  },
  {
    title: "Alerte sécurité",
    detail:
      "Tentatives de connexion admin répétées, montant de paiement incohérent.",
  },
];

/**
 * Telegram a été retiré. Le canal cible est la notification push (Web Push),
 * pas encore branchée : les alertes ci-dessous sont déjà émises par le serveur
 * et consultables dans les logs, elles arriveront ici une fois le push activé.
 */
export function AdminNotificationsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-primary">
          Notifications
        </h1>
        <p className="max-w-2xl font-body text-sm text-muted-foreground">
          Les notifications push arrivent bientôt. En attendant, les alertes
          ci-dessous sont bien émises par le serveur et consultables dans les
          journaux — rien n&apos;est perdu, elles ne sont simplement pas encore
          poussées sur vos téléphones.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Bell className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-primary">
              Alertes suivies
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Émises automatiquement, sans réglage à faire.
            </p>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {ALERTS.map((alert) => (
            <li key={alert.title} className="py-3 first:pt-0 last:pb-0">
              <p className="font-body text-sm font-semibold text-primary">
                {alert.title}
              </p>
              <p className="font-body text-sm text-muted-foreground">
                {alert.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

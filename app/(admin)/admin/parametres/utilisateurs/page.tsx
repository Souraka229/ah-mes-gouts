export default function AdminUtilisateursPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-primary">
        Utilisateurs & rôles
      </h1>
      <p className="font-body text-sm text-muted-foreground">
        En développement local : rôle via{" "}
        <code className="rounded bg-bg px-1">ADMIN_DEV_ROLE=employe</code> ou{" "}
        administrateur par défaut. JWT et gestion complète des comptes à brancher
        en production.
      </p>
      <div className="rounded-2xl border border-border bg-white p-4 font-body text-sm">
        <p>
          <strong>Administrateur</strong> — accès total (site-builder, paramètres,
          assistant)
        </p>
        <p className="mt-2">
          <strong>Employé</strong> — commandes, produits, livraison (pas
          site-builder ni assistant)
        </p>
      </div>
    </div>
  );
}

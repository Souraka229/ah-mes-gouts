import type { Metadata } from "next";

/**
 * Atterrissage du back-office sans session.
 *
 * Volontairement **hors du groupe `(admin)`** : la coquille du back-office
 * (barre latérale, navigation, contexte admin) n'a aucun sens tant qu'on n'est
 * pas connecté, et elle interroge la session.
 *
 * Cette page existe parce que l'hôte `admin.giftentremets.com` n'en avait
 * aucune : le middleware renvoyait vers `/?admin=locked`, une page de la
 * boutique, que l'hôte admin renvoyait à son tour vers `/admin` — une boucle
 * de redirection infinie. Un admin déconnecté n'avait plus de porte d'entrée.
 */

export const metadata: Metadata = {
  title: "Connexion — Back-office",
  // Le back-office ne s'indexe pas, et une page de connexion encore moins.
  robots: { index: false, follow: false },
  manifest: "/manifest-admin.webmanifest",
};

type Raison =
  | "session"
  | "lien-manquant"
  | "lien-invalide"
  | "trop-de-tentatives"
  | "session-indisponible";

/**
 * Chaque raison a son explication. Un lien magique invalide déposait autrefois
 * l'admin sur la boutique sans le moindre mot — le paramètre `?admin=…` était
 * écrit mais lu par personne.
 */
const MESSAGES: Record<Raison, { titre: string; texte: string }> = {
  session: {
    titre: "Votre session est terminée",
    texte:
      "Reconnectez-vous avec votre lien d'accès pour retrouver le back-office.",
  },
  "lien-manquant": {
    titre: "Lien d'accès incomplet",
    texte:
      "L'adresse utilisée ne contient pas de lien d'accès. Ouvrez le lien complet que vous avez reçu.",
  },
  "lien-invalide": {
    titre: "Lien d'accès invalide",
    texte:
      "Ce lien n'est plus valide — il a peut-être déjà servi, expiré, ou été révoqué. Demandez-en un nouveau.",
  },
  "trop-de-tentatives": {
    titre: "Trop de tentatives",
    texte:
      "Trop de connexions ont été essayées depuis votre réseau. Patientez un quart d'heure avant de réessayer.",
  },
  "session-indisponible": {
    titre: "Connexion momentanément impossible",
    texte:
      "Le serveur n'a pas pu ouvrir de session. Réessayez dans un instant avec votre lien d'accès.",
  },
};

function estRaison(value: string | undefined): value is Raison {
  return value !== undefined && value in MESSAGES;
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ raison?: string }>;
}) {
  const { raison } = await searchParams;
  const message = estRaison(raison) ? MESSAGES[raison] : MESSAGES.session;

  return (
    <main className="flex min-h-svh items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-white p-6 shadow-[0_12px_40px_rgba(59,31,77,0.06)] sm:p-8">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Gift &amp; ENTREMETS
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-primary sm:text-3xl">
          Back-office
        </h1>

        <div className="mt-6 rounded-2xl border border-border bg-bg p-4">
          <h2 className="font-body text-base font-semibold text-primary">
            {message.titre}
          </h2>
          <p className="mt-1.5 font-body text-sm leading-relaxed text-muted-foreground">
            {message.texte}
          </p>
        </div>

        <p className="mt-6 font-body text-sm leading-relaxed text-muted-foreground">
          Les liens d&apos;accès sont nominatifs et à durée limitée. Demandez-en
          un à la personne qui gère le back-office.
        </p>
      </div>
    </main>
  );
}

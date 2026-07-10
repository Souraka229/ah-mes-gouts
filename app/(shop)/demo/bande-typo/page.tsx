import { TypoBandScroll } from "@/components/shop/landing/typo-band-scroll";
import { TypoBandRotate } from "@/components/shop/landing/typo-band-rotate";
import { LANDING_COPY } from "@/lib/landing-data";

const DEMO_TEXT = LANDING_COPY.typoBand;
const ROTATE_MESSAGES = [
  DEMO_TEXT,
  "Des textures qui restent quand tout le reste a fondu",
  "Cotonou, une glace à la fois",
];

export default function BandeTypoDemoPage() {
  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="mx-auto max-w-4xl px-5">
        <h1 className="font-display text-3xl font-bold text-primary">
          Comparaison bande typographique
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          Deux approches côte à côte — choisissez celle qui se lit le mieux.
        </p>

        <section className="mt-12">
          <h2 className="mb-4 font-display text-xl font-semibold text-primary">
            A — Défilement lent (28s, droite → gauche, pause au survol)
          </h2>
          <TypoBandScroll text={DEMO_TEXT} />
        </section>

        <section className="mt-16">
          <h2 className="mb-4 font-display text-xl font-semibold text-primary">
            B — Rotation statique (fade 4s entre messages)
          </h2>
          <TypoBandRotate messages={ROTATE_MESSAGES} />
        </section>
      </div>
    </div>
  );
}

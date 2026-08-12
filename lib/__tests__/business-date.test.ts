import { describe, expect, it } from "vitest";

import {
  addShopDays,
  getShopDateKey,
  isNextDayOrderingOpen,
  isOrderableShopDate,
  NEXT_DAY_ORDERING_OPENS_AT,
  shopDateTimeToUtc,
} from "@/lib/business-date";

/** Instant UTC correspondant à une heure locale Cotonou (UTC+1, sans DST). */
function atCotonou(dateKey: string, timeHHmm: string): Date {
  return shopDateTimeToUtc(dateKey, timeHHmm);
}

describe("fuseau boutique", () => {
  it("convertit une heure Cotonou en UTC avec un décalage de 1 h", () => {
    expect(atCotonou("2026-08-12", "20:00").toISOString()).toBe(
      "2026-08-12T19:00:00.000Z",
    );
  });

  it("garde la bonne date boutique de part et d'autre de minuit UTC", () => {
    // 00:30 à Cotonou = 23:30 UTC la veille : la clé doit rester le 12.
    expect(getShopDateKey(atCotonou("2026-08-12", "00:30"))).toBe("2026-08-12");
  });
});

describe("ouverture du lendemain à 20 h", () => {
  it("reste fermée avant 20 h heure boutique", () => {
    expect(isNextDayOrderingOpen(atCotonou("2026-08-12", "19:59"))).toBe(false);
  });

  it("s'ouvre à 20 h pile", () => {
    expect(isNextDayOrderingOpen(atCotonou("2026-08-12", "20:00"))).toBe(true);
  });

  it("n'est pas influencée par le fuseau du serveur", () => {
    // 19:30 UTC = 20:30 à Cotonou : ouvert, même si le serveur est en UTC.
    expect(isNextDayOrderingOpen(new Date("2026-08-12T19:30:00.000Z"))).toBe(
      true,
    );
    // 18:30 UTC = 19:30 à Cotonou : encore fermé.
    expect(isNextDayOrderingOpen(new Date("2026-08-12T18:30:00.000Z"))).toBe(
      false,
    );
  });
});

describe("créneaux commandables", () => {
  const jour = "2026-08-12";
  const lendemain = "2026-08-13";

  it("accepte toujours un créneau du jour", () => {
    expect(
      isOrderableShopDate(
        atCotonou(jour, "15:00"),
        atCotonou(jour, "10:00"),
      ),
    ).toBe(true);
  });

  it("refuse le lendemain avant 20 h", () => {
    expect(
      isOrderableShopDate(
        atCotonou(lendemain, "15:00"),
        atCotonou(jour, "19:00"),
      ),
    ).toBe(false);
  });

  it("accepte le lendemain à partir de 20 h", () => {
    expect(
      isOrderableShopDate(
        atCotonou(lendemain, "15:00"),
        atCotonou(jour, "20:00"),
      ),
    ).toBe(true);
  });

  it("refuse le surlendemain, même après 20 h", () => {
    expect(
      isOrderableShopDate(
        atCotonou("2026-08-14", "15:00"),
        atCotonou(jour, "21:00"),
      ),
    ).toBe(false);
  });
});

describe("règle d'ouverture d'un menu", () => {
  it("un menu du jour J s'ouvre à 20 h le jour J-1", () => {
    // C'est la règle que le code d'activation doit respecter : l'ancienne
    // version posait l'ouverture à 20 h du jour J lui-même, soit une heure
    // après la fermeture de la boutique — le menu n'était jamais vendable.
    const menuDate = "2026-08-13";
    const veille = addShopDays(menuDate, -1);
    expect(veille).toBe("2026-08-12");

    const ouverture = atCotonou(
      veille,
      `${String(NEXT_DAY_ORDERING_OPENS_AT).padStart(2, "0")}:00`,
    );
    expect(ouverture.toISOString()).toBe("2026-08-12T19:00:00.000Z");

    // À cet instant précis, un créneau du 13 devient commandable.
    expect(isOrderableShopDate(atCotonou(menuDate, "14:00"), ouverture)).toBe(
      true,
    );
  });

  it("passe correctement un changement de mois", () => {
    expect(addShopDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addShopDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

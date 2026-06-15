# PlanStar

Alaprajz-alapú projektmenedzsment és helyszíni hibakezelő rendszer
generálkivitelezőknek és szakágaknak. Ez a démó verzió (Next.js + React).

## Mit tud

- Kódos belépés (egyedi azonosító + PIN), 4 szerepkörrel (Admin, Generálkivitelező, Szakma, Beruházó)
- Szigorú adatizoláció: a szakmák csak a rájuk tegelt hibajegyeket látják
- Alaprajzra helyezett, számozott hibajegyek zoom/pan támogatással (tableten csipesz-zoom)
- Hibajegy-részletek bejegyzésekkel, fotócsatolással, státuszkezeléssel
- Admin: projektek létrehozása (2026/000N kódok), felhasználók ki-/bekapcsolása
- Alvállalkozó-meghívás cégadatokkal + fizetési állapot + kód-kiadás jóváhagyással
- Hívógomb a bejegyzéseknél, hibalista PDF szakmánként, takarítás-kérés

> Megjegyzés: ez a démó minden adatot a böngésző memóriájában tárol, ezért
> oldalfrissítéskor visszaáll az alaphelyzet. Az éles, megmaradó verzióhoz
> adatbázis (Prisma + Postgres) és szerveroldali jogosultság-szűrés kell.

## Helyi futtatás

```bash
npm install
npm run dev
```

Majd nyisd meg: http://localhost:3000

## Feltöltés GitHubra és Vercelre

1. Hozz létre egy új, üres repót a GitHubon (pl. `planstar`).
2. Töltsd fel ennek a mappának a teljes tartalmát (a `node_modules` és `.next`
   mappák nélkül — ezeket a `.gitignore` kizárja).
3. A Vercelen: New Project → válaszd ki a repót → Deploy.
   A Vercel automatikusan felismeri a Next.js projektet, nincs külön beállítás.

## Teszt fiókok (démó)

| Kód            | PIN  | Szerepkör          |
|----------------|------|--------------------|
| ADMIN-0001     | 1234 | Fő Admin           |
| GC-2026-7781   | 1111 | Generálkivitelező  |
| SZ-VILL-3320   | 2222 | Villanyszerelő     |
| SZ-NYIL-5510   | 3333 | Nyílászárós        |
| BER-2026-9001  | 4444 | Beruházó           |

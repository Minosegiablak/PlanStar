// lib/permissions.js
// Ez a fájl dönti el, ki mit láthat és tehet egy projektben.
// FONTOS: ez NEM csak vizuális szűrés (mint a démóban volt), hanem az
// adatbázis-lekérdezések "where" feltételeibe kerül — a kliens
// fizikailag nem kapja meg azt az adatot, amihez nincs jogosultsága.

// Eldönti, hogy egy adott user (a getCurrentUser() eredménye) hozzáférhet-e
// egyáltalán a megadott projektId-hez.
export function canAccessProject(user, projectId) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.projectId === projectId;
}

// A Ticket modellre alkalmazható Prisma "where" feltétel-kiegészítés,
// ami a szerepkör szerint szűr. Ezt kell hozzáadni minden hibajegy-
// lekérdezéshez.
//
// ADMIN      → nincs extra szűrés (mindent lát)
// GC         → nincs extra szűrés A PROJEKTEN BELÜL (mindent lát, amit a
//              projectId már eleve kiszűrt)
// TRADE      → csak a saját szakmájához tegelt, NEM privát jegyek
// INVESTOR   → csak a nem privát jegyek
export function ticketWhereFor(user) {
  if (user.role === "ADMIN" || user.projectRole === "GC") {
    return {};
  }
  if (user.projectRole === "TRADE") {
    return { trade: user.trade, isPrivate: false };
  }
  if (user.projectRole === "INVESTOR") {
    return { isPrivate: false };
  }
  // ismeretlen szerepkör — biztonsági alapállás: semmit nem ad vissza
  return { id: "no-match" };
}

// Megmondja, hogy a user szerkesztheti-e a hibajegyeket (lehelyezés,
// státuszváltás, törlés) — ADMIN és GC igen, TRADE csak a sajátját
// (ezt a hívó oldalon még ellenőrizni kell tételenként), INVESTOR soha.
export function canEditTickets(user) {
  return user.role === "ADMIN" || user.projectRole === "GC" || user.projectRole === "TRADE";
}

// Megmondja, hogy a user láthatja-e a bejegyzéseket (kommunikációt).
export function canSeeNotes(user) {
  return user.role === "ADMIN" || user.projectRole === "GC" || user.projectRole === "TRADE";
}

// Egy KONKRÉT hibajegyhez van-e hozzáférése a usernek (pl. mielőtt
// bejegyzést írna rá, vagy státuszt váltana). A TRADE csak a saját
// szakmájához tegelt, nem privát jegyhez férhet hozzá egyedileg is.
export function canAccessTicket(user, ticket) {
  if (user.role === "ADMIN" || user.projectRole === "GC") return true;
  if (user.projectRole === "TRADE") {
    return ticket.trade === user.trade && !ticket.isPrivate;
  }
  if (user.projectRole === "INVESTOR") {
    return !ticket.isPrivate;
  }
  return false;
}

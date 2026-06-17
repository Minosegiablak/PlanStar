// lib/password.js
// A PIN-kódokat SOHA nem tároljuk nyersen az adatbázisban — csak egy
// egyirányú "hash"-t (titkosított lenyomatot). Bejelentkezéskor a
// megadott PIN hash-ét hasonlítjuk a tárolt hash-hez, nem a PIN-eket
// magukat. Ha valaki ellopná az adatbázist, a PIN-eket nem tudná
// kiolvasni belőle.
//
// A bcrypt az iparági szabvány erre a célra.

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPin(pin) {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

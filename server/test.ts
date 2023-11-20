import crypt from "ncrypt-js";
import { panic } from "@utils/panic";

const { encrypt, decrypt } = new crypt(
  Bun.env.JWT_SECRET ?? panic("JWT_SECRET environment variable not set")
);

const obj = {
  cashRules: true,
  name: "Catald",
  stuff: [],
  welcome: "to the stray kids hot MEGAVERSE",
};

const encrypted = encrypt(obj);

console.log(encrypted);

const decrypted = decrypt(encrypted) as typeof obj;

console.log(decrypted);

import { randomBytes } from "crypto";

export function createEditToken() {
  return randomBytes(32).toString("hex");
}

export function createSessionHash() {
  return randomBytes(16).toString("hex");
}

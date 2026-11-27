import type { Validator } from "../validation/validators";

/** IBAN lengths by country code, from the SWIFT IBAN registry. */
export const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BI: 27,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DJ: 27,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FK: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HN: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  LY: 25,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MN: 20,
  MR: 27,
  MT: 31,
  MU: 30,
  NI: 28,
  NL: 18,
  NO: 15,
  OM: 23,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  RU: 33,
  SA: 24,
  SC: 31,
  SD: 18,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  SO: 23,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
  YE: 30,
};

/** Whether `value` is an IBAN of its country's length whose check digits hold (mod 97 is 1). */
function isIban(value: string): boolean {
  const iban = value.replace(/\s/g, "").toUpperCase();
  if (
    !/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban) ||
    IBAN_LENGTHS[iban.slice(0, 2)] !== iban.length
  ) {
    return false;
  }
  let remainder = 0;
  for (const character of iban.slice(4) + iban.slice(0, 4)) {
    // Letters count as two digits, A = 10 to Z = 35.
    const digits = Number.parseInt(character, 36);
    remainder = (remainder * (digits < 10 ? 10 : 100) + digits) % 97;
  }
  return remainder === 1;
}

/** Whether the digits of `value` pass the Luhn check. */
function passesLuhn(value: string): boolean {
  const digits = value.replace(/\s/g, "");
  if (!/^[0-9]{2,}$/.test(digits)) {
    return false;
  }
  let sum = 0;
  Array.from(digits)
    .reverse()
    .forEach((character, index) => {
      const digit = Number(character);
      const doubled = index % 2 === 1 ? digit * 2 : digit;
      sum += doubled > 9 ? doubled - 9 : doubled;
    });
  return sum % 10 === 0;
}

const IPV4_PART = /^(?:0|[1-9][0-9]{0,2})$/;

/** Whether `value` is four dotted parts from 0 to 255, none with a leading zero. */
function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => IPV4_PART.test(part) && Number(part) <= 255)
  );
}

/**
 * An IBAN with the wrong length for its country, or whose check digits
 * fail, is `messages.ibanInvalid`. Spaces are ignored. `null` passes.
 */
export function ibanRule(): Validator<string> {
  return (value, { messages }) =>
    value !== null && !isIban(value)
      ? { text: messages.ibanInvalid, code: "iban" }
      : null;
}

/** A card number whose check digit fails (Luhn) is `messages.cardNumberInvalid`. Spaces are ignored. `null` passes. */
export function luhnRule(): Validator<string> {
  return (value, { messages }) =>
    value !== null && !passesLuhn(value)
      ? { text: messages.cardNumberInvalid, code: "cardNumber" }
      : null;
}

/** An IPv4 address with a part above 255 or a leading zero is `messages.ipv4Invalid`. `null` passes. */
export function ipv4Rule(): Validator<string> {
  return (value, { messages }) =>
    value !== null && !isIpv4(value)
      ? { text: messages.ipv4Invalid, code: "ipv4" }
      : null;
}

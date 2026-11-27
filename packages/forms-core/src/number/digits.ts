const DIGIT = /^\p{Nd}$/u;

/** Whether `char` is one Unicode decimal digit, in any script. */
export function isDigit(char: string): boolean {
  return DIGIT.test(char);
}

function isDigitCode(code: number): boolean {
  return code >= 0 && isDigit(String.fromCodePoint(code));
}

/**
 * The value of the decimal digit `char`. Unicode keeps every decimal digit
 * in a run of ten from zero to nine, and runs that touch (the mathematical
 * digits) follow on from each other, so the value is the digit's distance
 * from the start of its run, modulo 10: no table needed.
 */
export function digitValue(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  let start = code;
  while (isDigitCode(start - 1)) {
    start -= 1;
  }
  return (code - start) % 10;
}

/** Intl's numbering systems by the code point of their zero, built on first use. */
let systemsByZero: ReadonlyMap<number, string> | undefined;

function numberingSystems(): ReadonlyMap<number, string> {
  if (systemsByZero === undefined) {
    const systems = new Map<number, string>();
    for (const system of Intl.supportedValuesOf("numberingSystem")) {
      const format = new Intl.NumberFormat("en", { numberingSystem: system });
      const zero = format.format(0);
      // An engine without the system falls back to Latin digits.
      if (
        format.resolvedOptions().numberingSystem === system &&
        isDigit(zero)
      ) {
        systems.set(zero.codePointAt(0) ?? 0, system);
      }
    }
    systemsByZero = systems;
  }
  return systemsByZero;
}

/** The Intl numbering system of the digit `char` (`"latn"`, `"arab"`, `"fullwide"`), or `"unknown"`. */
export function numberingSystemOf(char: string): string {
  const zero = (char.codePointAt(0) ?? 0) - digitValue(char);
  return numberingSystems().get(zero) ?? "unknown";
}

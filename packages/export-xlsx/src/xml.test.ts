import { describe, expect, test } from "vitest";

import { escapeXml } from "./xml";

const char = (code: number) => String.fromCharCode(code);

describe("escapeXml", () => {
  test("escapes the markup characters", () => {
    expect(escapeXml(`Tom & "Jerry" <b>`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;b&gt;",
    );
  });

  test("drops characters XML cannot hold", () => {
    expect(escapeXml(`a${char(0)}b${char(1)}c${char(0x1f)}d`)).toBe("abcd");
    expect(escapeXml(`a${char(0xfffe)}b${char(0xffff)}`)).toBe("ab");
  });

  test("keeps tab, line feed and carriage return", () => {
    const text = `a${char(9)}b${char(10)}c${char(13)}d`;
    expect(escapeXml(text)).toBe(text);
  });

  test("replaces a lone surrogate and keeps a pair", () => {
    const pair = String.fromCodePoint(0x1f600);
    expect(escapeXml(`${char(0xd800)}x${pair}`)).toBe(
      `${char(0xfffd)}x${pair}`,
    );
  });

  test("leaves Cyrillic and Croatian text as it is", () => {
    expect(escapeXml("Скопје, Čakovec, Đakovo, Šibenik, Žminj")).toBe(
      "Скопје, Čakovec, Đakovo, Šibenik, Žminj",
    );
  });
});

import { describe, expect, test } from "vitest";

import { createStyleSheet } from "./styles";

/** The `<xf>` elements of `cellXfs`, in order. */
function cellFormats(xml: string): string[] {
  const [, list = ""] = /<cellXfs[^>]*>(.*)<\/cellXfs>/.exec(xml) ?? [];
  return list.match(/<xf [^>]*\/>/g) ?? [];
}

describe("createStyleSheet", () => {
  test("starts with the plain style at index 0", () => {
    const styles = createStyleSheet();
    expect(styles.index({})).toBe(0);
    expect(styles.index({ bold: false })).toBe(0);
    expect(cellFormats(styles.xml())).toEqual([
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    ]);
  });

  test("hands out one index per distinct style", () => {
    const styles = createStyleSheet();
    const bold = styles.index({ bold: true });
    const money = styles.index({ numberFormat: "#,##0.00" });
    expect(bold).toBe(1);
    expect(money).toBe(2);
    expect(styles.index({ bold: true })).toBe(bold);
    expect(styles.index({ numberFormat: "#,##0.00", bold: true })).toBe(3);
  });

  test("lists each number format once, from id 164", () => {
    const styles = createStyleSheet();
    styles.index({ numberFormat: "0%" });
    styles.index({ numberFormat: "0%", bold: true });
    styles.index({ numberFormat: "yyyy-mm-dd" });
    const xml = styles.xml();
    expect(xml).toContain(
      '<numFmts count="2"><numFmt numFmtId="164" formatCode="0%"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts>',
    );
    expect(cellFormats(xml)).toEqual([
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>',
      '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>',
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>',
    ]);
    expect(xml).toContain('<cellXfs count="4">');
  });

  test("escapes a format code's quotes", () => {
    const styles = createStyleSheet();
    styles.index({ numberFormat: '"$"#,##0.00' });
    expect(styles.xml()).toContain('formatCode="&quot;$&quot;#,##0.00"');
  });

  test("leaves the number formats out when no cell has one", () => {
    const styles = createStyleSheet();
    styles.index({ bold: true });
    expect(styles.xml()).not.toContain("numFmts");
  });

  test("carries a regular and a bold font and Excel's two reserved fills", () => {
    const xml = createStyleSheet().xml();
    expect(xml).toMatch(/<fonts count="2"><font>.*<\/font><font><b\/>/);
    expect(xml).toContain('patternType="gray125"');
    expect(xml).toContain('<cellStyle name="Normal" xfId="0" builtinId="0"/>');
  });
});

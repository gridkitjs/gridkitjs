/** `locale` as a cache key: the same text for the same locales. */
export function localeKey(locale: Intl.LocalesArgument): string {
  if (locale === undefined) {
    return "";
  }
  return typeof locale === "string" || locale instanceof Intl.Locale
    ? String(locale)
    : locale.map(String).join(",");
}

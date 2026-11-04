const MS_PER_DAY = 86_400_000;

/**
 * Day 0 of the serial numbers Excel's 1900 date system stores, as it counts
 * from March 1900 on. Excel keeps Lotus 1-2-3's 29 February 1900, a day that
 * never was, so counting from 30 December 1899 lands on the right serial for
 * every date from 1 March 1900 — and on the wrong one before it.
 */
const EPOCH = Date.UTC(1899, 11, 30);

/** 1 March 1900, the first date the epoch above gets right. */
const FIRST_SERIAL = 61;

/** 31 December 9999, the last date Excel shows. */
const LAST_YEAR = 9999;

/**
 * The serial number Excel stores for `date` — whole days since its epoch,
 * the time of day as the fraction — or `null` for a date it cannot hold:
 * an invalid one, one before 1 March 1900 or after 9999.
 *
 * It is the date's local calendar date and clock time, not its UTC instant:
 * the date the grid shows. A spreadsheet cell has no time zone, so a date
 * entered as midnight 4 November reads as 4 November in Excel wherever the
 * file was written or is opened.
 */
export function excelDateSerial(date: Date): number | null {
  const year = date.getFullYear();
  if (Number.isNaN(year) || year < 1900 || year > LAST_YEAR) {
    return null;
  }
  const local = Date.UTC(
    year,
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
  const serial = (local - EPOCH) / MS_PER_DAY;
  return serial < FIRST_SERIAL ? null : serial;
}

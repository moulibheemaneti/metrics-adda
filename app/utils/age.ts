/// --------------------------------------------------
/// utils/age.ts
/// --------------------------------------------------
/// Calendar dates, and the difference between two of them.
///
/// No `Date` objects anywhere in the arithmetic. `Date` is a timestamp
/// wearing a calendar costume, and every one of its conveniences is a trap
/// here: `new Date("2000-01-01")` parses as UTC midnight and reads back as
/// 1999-12-31 anywhere west of Greenwich, `getMonth()` is zero-based while
/// every date string is not, and a day count taken by subtracting two
/// timestamps is off by an hour across a daylight-saving boundary. A date
/// of birth has no time zone and no time of day, so it is held as three
/// numbers and stays that way.
///
/// The day count uses the civil-calendar algorithm rather than a
/// millisecond difference — exact for any year, and free of `Date.UTC`'s
/// habit of reading years 0–99 as 1900–1999.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** A calendar date, with `month` 1–12 as it is written rather than 0–11. */
export interface CalendarDate {
   year: number
   month: number
   day: number
}

/** Weekday ids, Sunday first — the order `COPY.age.weekdays` lists them in. */
export const WEEKDAYS = [
   "sunday",
   "monday",
   "tuesday",
   "wednesday",
   "thursday",
   "friday",
   "saturday",
] as const

export type Weekday = typeof WEEKDAYS[number]

/** The next anniversary of a birth date, relative to the date asked about. */
export interface NextBirthday {
   date: CalendarDate
   /** Whole days away. Zero means the date asked about *is* the birthday. */
   daysAway: number
   /** The age they reach on it. */
   turning: number
}

export interface AgeBreakdown {
   /** The calendar age, as it is spoken: 25 years, 6 months and 3 days. */
   years: number
   months: number
   days: number
   /** The same span counted in one unit throughout. */
   totalMonths: number
   totalWeeks: number
   totalDays: number
   /** The day of the week the birth date fell on. */
   bornOn: Weekday
   nextBirthday: NextBirthday
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Gregorian leap years: every 4th, except centuries that are not 400ths. */
export function isLeapYear(year: number): boolean {
   return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
   if (month === 2 && isLeapYear(year)) return 29

   return MONTH_LENGTHS[month - 1] ?? 0
}

/**
 * Whether three numbers name a date that exists.
 *
 * The day is checked against that month in that year, so 2023-02-29 is
 * rejected while 2024-02-29 is not. `<input type="date">` will not usually
 * hand over anything else, but it is a text field underneath in enough
 * browsers to be worth not trusting.
 */
export function isValidCalendarDate(date: CalendarDate): boolean {
   const { year, month, day } = date

   if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
   if (year < 1 || year > 9999) return false
   if (month < 1 || month > 12) return false

   return day >= 1 && day <= daysInMonth(year, month)
}

/** Read a `<input type="date">` value. `null` for anything not a real date. */
export function parseDateInput(text: string): CalendarDate | null {
   const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text)

   if (match === null) return null

   const date = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
   }

   return isValidCalendarDate(date) ? date : null
}

/** Write a date back in the form `<input type="date">` expects. */
export function formatDateInput(date: CalendarDate): string {
   const year = String(date.year).padStart(4, "0")
   const month = String(date.month).padStart(2, "0")
   const day = String(date.day).padStart(2, "0")

   return `${year}-${month}-${day}`
}

/**
 * Days since 1970-01-01, from the civil calendar directly.
 *
 * Howard Hinnant's `days_from_civil`, which shifts the year to start in
 * March so that the leap day lands at the end of it and the month-length
 * pattern becomes a single linear expression. Exact for every proleptic
 * Gregorian date, with no timestamp and so no time zone anywhere in it.
 */
export function dayNumber(date: CalendarDate): number {
   const year = date.year - (date.month <= 2 ? 1 : 0)
   const era = Math.floor(year / 400)
   const yearOfEra = year - era * 400
   const dayOfYear = Math.floor((153 * (date.month + (date.month > 2 ? -3 : 9)) + 2) / 5)
     + date.day - 1
   const dayOfEra = yearOfEra * 365
     + Math.floor(yearOfEra / 4)
     - Math.floor(yearOfEra / 100)
     + dayOfYear

   return era * 146097 + dayOfEra - 719468
}

/** The weekday a date fell on. 1970-01-01 was a Thursday, which anchors it. */
export function weekdayOf(date: CalendarDate): Weekday {
   const index = (((dayNumber(date) + 4) % 7) + 7) % 7

   return WEEKDAYS[index] as Weekday
}

/**
 * Today, where the reader is.
 *
 * The one place a `Date` is the right tool: only the platform knows what
 * day it is locally. Its *parts* are read rather than its timestamp, so
 * the answer is the date on the reader's wall calendar and not a UTC one
 * that is already tomorrow in Auckland.
 *
 * Never called during render. A date resolved on the server would be
 * baked into the prerendered HTML and served as "today" long after it
 * stopped being — the same trap the UUID panel avoids by generating after
 * mount rather than during SSR.
 */
export function todayLocal(): CalendarDate {
   const now = new Date()

   return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

/** Negative when `a` is earlier, zero when they are the same day. */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
   if (a.year !== b.year) return a.year - b.year
   if (a.month !== b.month) return a.month - b.month

   return a.day - b.day
}

/**
 * Add whole months, clamping the day to the end of the month it lands in.
 *
 * The clamp is the whole reason this exists: a month after 31 January is
 * 28 or 29 February, because there is no 31st to land on. Clamping is the
 * convention every calendar application uses, and the alternative — rolling
 * forward into March — would make "one month old" arrive before the first
 * of the month it is measured into.
 */
export function addMonthsClamped(date: CalendarDate, months: number): CalendarDate {
   const total = date.year * 12 + (date.month - 1) + months
   const year = Math.floor(total / 12)
   const month = (((total % 12) + 12) % 12) + 1

   return { year, month, day: Math.min(date.day, daysInMonth(year, month)) }
}

/**
 * The anniversary of `birth` on or after `from`.
 *
 * Clamped like any other month arithmetic, which decides the leap-day
 * question: someone born on 29 February has their birthday on the 28th in
 * the three years out of four that have no 29th. That is one of two
 * defensible conventions — 1 March is the other, and jurisdictions differ
 * — and the FAQ says which one this is rather than leaving it to be
 * discovered.
 */
function anniversaryOnOrAfter(birth: CalendarDate, from: CalendarDate): CalendarDate {
   const thisYear = addMonthsClamped(birth, (from.year - birth.year) * 12)

   if (compareCalendarDates(thisYear, from) >= 0) return thisYear

   return addMonthsClamped(birth, (from.year - birth.year + 1) * 12)
}

/**
 * How old someone born on `birth` is on `asOf`.
 *
 * `null` when the birth date is in the future, which is a question with no
 * answer rather than a negative age.
 *
 * The months are counted by *landing on* a date rather than by subtracting
 * the two months and borrowing when the days go negative. The borrow looks
 * simpler and is wrong at the ends of months: from 31 January to 1 March
 * it borrows 29 days to cover a 30-day shortfall and comes out at minus
 * one. Counting forward instead — the largest number of whole months that
 * still lands on or before `asOf`, then the days left over — has no such
 * case, and gives `totalMonths` for free.
 */
export function calculateAge(birth: CalendarDate, asOf: CalendarDate): AgeBreakdown | null {
   if (!isValidCalendarDate(birth) || !isValidCalendarDate(asOf)) return null
   if (compareCalendarDates(birth, asOf) > 0) return null

   let totalMonths = (asOf.year - birth.year) * 12 + (asOf.month - birth.month)

   if (compareCalendarDates(addMonthsClamped(birth, totalMonths), asOf) > 0) totalMonths -= 1

   const anchor = addMonthsClamped(birth, totalMonths)
   const totalDays = dayNumber(asOf) - dayNumber(birth)
   const next = anniversaryOnOrAfter(birth, asOf)

   return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      days: dayNumber(asOf) - dayNumber(anchor),
      totalMonths,
      totalWeeks: Math.floor(totalDays / 7),
      totalDays,
      bornOn: weekdayOf(birth),
      nextBirthday: {
         date: next,
         daysAway: dayNumber(next) - dayNumber(asOf),
         turning: next.year - birth.year,
      },
   }
}

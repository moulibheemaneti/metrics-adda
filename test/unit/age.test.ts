import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   addMonthsClamped,
   calculateAge,
   compareCalendarDates,
   dayNumber,
   daysInMonth,
   formatDateInput,
   isLeapYear,
   isValidCalendarDate,
   parseDateInput,
   weekdayOf,
   type CalendarDate,
} from "../../app/utils/age"

/** Terser than three named fields in every one of these cases. */
const date = (year: number, month: number, day: number): CalendarDate => ({ year, month, day })

describe("isLeapYear", () => {
   it("counts every fourth year", () => {
      expect(isLeapYear(2024)).toBe(true)
      expect(isLeapYear(2023)).toBe(false)
   })

   /// The rule people forget, and the reason this is not `year % 4 === 0`:
   /// 1900 was not a leap year, 2000 was.
   it("skips centuries that are not divisible by 400", () => {
      expect(isLeapYear(1900)).toBe(false)
      expect(isLeapYear(2100)).toBe(false)
      expect(isLeapYear(2000)).toBe(true)
   })
})

describe("daysInMonth", () => {
   it("knows the fixed months", () => {
      expect(daysInMonth(2023, 1)).toBe(31)
      expect(daysInMonth(2023, 4)).toBe(30)
   })

   it("lengthens February in a leap year", () => {
      expect(daysInMonth(2023, 2)).toBe(28)
      expect(daysInMonth(2024, 2)).toBe(29)
      expect(daysInMonth(1900, 2)).toBe(28)
   })
})

describe("isValidCalendarDate", () => {
   it("accepts a real date", () => {
      expect(isValidCalendarDate(date(2024, 2, 29))).toBe(true)
   })

   it("rejects a day past the end of its month", () => {
      expect(isValidCalendarDate(date(2023, 2, 29))).toBe(false)
      expect(isValidCalendarDate(date(2023, 4, 31))).toBe(false)
   })

   it("rejects an out-of-range month or year", () => {
      expect(isValidCalendarDate(date(2023, 13, 1))).toBe(false)
      expect(isValidCalendarDate(date(2023, 0, 1))).toBe(false)
      expect(isValidCalendarDate(date(0, 1, 1))).toBe(false)
   })

   it("rejects a fractional part", () => {
      expect(isValidCalendarDate(date(2023, 1, 1.5))).toBe(false)
   })
})

describe("parseDateInput", () => {
   it("reads a date input's value", () => {
      expect(parseDateInput("2000-01-31")).toEqual(date(2000, 1, 31))
   })

   it("rejects a date that does not exist", () => {
      expect(parseDateInput("2023-02-29")).toBeNull()
   })

   it("rejects anything not in the input's own format", () => {
      expect(parseDateInput("")).toBeNull()
      expect(parseDateInput("2000-1-1")).toBeNull()
      expect(parseDateInput("01/01/2000")).toBeNull()
   })

   it("round-trips through formatDateInput", () => {
      for (const text of ["2000-01-01", "1999-12-31", "2024-02-29", "0999-06-15"]) {
         expect(formatDateInput(parseDateInput(text) as CalendarDate)).toBe(text)
      }
   })
})

describe("dayNumber", () => {
   it("puts the epoch at zero", () => {
      expect(dayNumber(date(1970, 1, 1))).toBe(0)
   })

   it("counts forwards and backwards from it", () => {
      expect(dayNumber(date(1970, 1, 2))).toBe(1)
      expect(dayNumber(date(1969, 12, 31))).toBe(-1)
   })

   it("counts a leap year as 366 days", () => {
      expect(dayNumber(date(2025, 1, 1)) - dayNumber(date(2024, 1, 1))).toBe(366)
      expect(dayNumber(date(2024, 1, 1)) - dayNumber(date(2023, 1, 1))).toBe(365)
   })

   /// 1900 is the century that is not a leap year, so the span across it
   /// is one day shorter than the naive four-year rule predicts.
   it("counts the 1900 century correctly", () => {
      expect(dayNumber(date(1901, 1, 1)) - dayNumber(date(1900, 1, 1))).toBe(365)
   })

   /// A two-digit year is where `Date.UTC` would silently mean 1900-something.
   it("does not treat a small year as nineteen-hundreds", () => {
      expect(dayNumber(date(99, 1, 1))).toBeLessThan(dayNumber(date(1000, 1, 1)))
   })
})

describe("weekdayOf", () => {
   it("names known weekdays", () => {
      expect(weekdayOf(date(1970, 1, 1))).toBe("thursday")
      expect(weekdayOf(date(2000, 1, 1))).toBe("saturday")
      expect(weekdayOf(date(2024, 2, 29))).toBe("thursday")
   })

   it("names a weekday before the epoch", () => {
      expect(weekdayOf(date(1969, 7, 20))).toBe("sunday")
   })
})

describe("compareCalendarDates", () => {
   it("orders by year, then month, then day", () => {
      expect(compareCalendarDates(date(1999, 12, 31), date(2000, 1, 1))).toBeLessThan(0)
      expect(compareCalendarDates(date(2000, 2, 1), date(2000, 1, 31))).toBeGreaterThan(0)
      expect(compareCalendarDates(date(2000, 1, 1), date(2000, 1, 1))).toBe(0)
   })
})

describe("addMonthsClamped", () => {
   it("adds whole months", () => {
      expect(addMonthsClamped(date(2000, 1, 15), 1)).toEqual(date(2000, 2, 15))
   })

   it("rolls over the year boundary", () => {
      expect(addMonthsClamped(date(2000, 12, 15), 1)).toEqual(date(2001, 1, 15))
      expect(addMonthsClamped(date(2000, 1, 15), -1)).toEqual(date(1999, 12, 15))
   })

   /// The clamp, in both February lengths — there is no 31 February to
   /// land on, so a month after 31 January is the end of February.
   it("clamps to the end of a shorter month", () => {
      expect(addMonthsClamped(date(2000, 1, 31), 1)).toEqual(date(2000, 2, 29))
      expect(addMonthsClamped(date(2023, 1, 31), 1)).toEqual(date(2023, 2, 28))
      expect(addMonthsClamped(date(2023, 3, 31), 1)).toEqual(date(2023, 4, 30))
   })

   /// Clamping loses information on purpose: it is not reversible, and a
   /// caller expecting it to be would get the wrong day back.
   it("does not restore the original day when reversed", () => {
      expect(addMonthsClamped(addMonthsClamped(date(2023, 1, 31), 1), -1))
         .toEqual(date(2023, 1, 28))
   })
})

describe("calculateAge", () => {
   it("reports a whole number of years on a birthday", () => {
      const age = calculateAge(date(2000, 6, 15), date(2025, 6, 15))

      expect(age).toMatchObject({ years: 25, months: 0, days: 0 })
   })

   it("reports the day before a birthday as one year short", () => {
      const age = calculateAge(date(2000, 6, 15), date(2025, 6, 14))

      expect(age).toMatchObject({ years: 24, months: 11, days: 30 })
   })

   it("breaks a span into years, months and days", () => {
      const age = calculateAge(date(1990, 3, 10), date(2024, 7, 25))

      expect(age).toMatchObject({ years: 34, months: 4, days: 15 })
   })

   /// The case the borrow-and-subtract approach gets wrong: it borrows 29
   /// days from February to cover a 30-day shortfall and lands on minus
   /// one. Counting forward from the birth date has no such case.
   it("handles a month-end birth date crossing February", () => {
      expect(calculateAge(date(2000, 1, 31), date(2000, 3, 1)))
         .toMatchObject({ years: 0, months: 1, days: 1 })
      expect(calculateAge(date(2000, 1, 31), date(2000, 2, 29)))
         .toMatchObject({ years: 0, months: 1, days: 0 })
      expect(calculateAge(date(2023, 1, 31), date(2023, 2, 28)))
         .toMatchObject({ years: 0, months: 1, days: 0 })
   })

   /// The stated convention: a 29 February birthday falls on the 28th in
   /// the years that have no 29th, so the age turns over on that date.
   it("turns a leap-day birthday over on 28 February", () => {
      expect(calculateAge(date(2000, 2, 29), date(2001, 2, 28)))
         .toMatchObject({ years: 1, months: 0, days: 0 })
      // 11 months from 29 February lands on 29 January, and 27 February
      // is 29 days after that.
      expect(calculateAge(date(2000, 2, 29), date(2001, 2, 27)))
         .toMatchObject({ years: 0, months: 11, days: 29 })
   })

   it("counts the same span in single units", () => {
      const age = calculateAge(date(2000, 1, 1), date(2000, 3, 1))

      expect(age).toMatchObject({ totalMonths: 2, totalDays: 60, totalWeeks: 8 })
   })

   it("names the weekday of the birth date", () => {
      expect(calculateAge(date(2000, 1, 1), date(2025, 1, 1))?.bornOn).toBe("saturday")
   })

   it("reports the next birthday and the age it brings", () => {
      const age = calculateAge(date(2000, 3, 10), date(2025, 1, 1))

      expect(age?.nextBirthday).toEqual({
         date: date(2025, 3, 10),
         daysAway: 68,
         turning: 25,
      })
   })

   it("looks to next year once this year's birthday has passed", () => {
      const age = calculateAge(date(2000, 3, 10), date(2025, 3, 11))

      expect(age?.nextBirthday.date).toEqual(date(2026, 3, 10))
      expect(age?.nextBirthday.turning).toBe(26)
   })

   /// Zero days away is the birthday itself, which the panel says rather
   /// than sending someone a year forward on the day it matters.
   it("reports the birthday itself as zero days away", () => {
      const age = calculateAge(date(2000, 3, 10), date(2025, 3, 10))

      expect(age?.nextBirthday).toEqual({
         date: date(2025, 3, 10),
         daysAway: 0,
         turning: 25,
      })
   })

   it("reports a birth date and an as-of date that match as zero", () => {
      expect(calculateAge(date(2000, 1, 1), date(2000, 1, 1)))
         .toMatchObject({ years: 0, months: 0, days: 0, totalDays: 0 })
   })

   /// A future birth date is a question with no answer, not a negative
   /// age — the panel says so rather than printing minus numbers.
   it("has no answer for a birth date in the future", () => {
      expect(calculateAge(date(2030, 1, 1), date(2025, 1, 1))).toBeNull()
   })

   it("has no answer for a date that does not exist", () => {
      expect(calculateAge(date(2023, 2, 29), date(2025, 1, 1))).toBeNull()
      expect(calculateAge(date(2000, 1, 1), date(2025, 13, 1))).toBeNull()
   })

   /// Every day of a long span, checked against the two invariants that
   /// have to hold jointly: the parts are in range, and landing the parts
   /// back on the calendar returns the date asked about.
   it("stays consistent across every day of a decade", () => {
      const birth = date(1996, 2, 29)
      const start = dayNumber(date(2020, 1, 1))

      for (let offset = 0; offset < 3653; offset += 1) {
         const asOf = civilFromDayNumber(start + offset)
         const age = calculateAge(birth, asOf)

         expect(age, formatDateInput(asOf)).not.toBeNull()
         expect(age?.months, formatDateInput(asOf)).toBeLessThan(12)
         expect(age?.months, formatDateInput(asOf)).toBeGreaterThanOrEqual(0)
         expect(age?.days, formatDateInput(asOf)).toBeGreaterThanOrEqual(0)
         expect(age?.days, formatDateInput(asOf)).toBeLessThan(31)

         // The parts add back up to the date they were taken from.
         const rebuilt = addMonthsClamped(birth, (age?.totalMonths ?? 0))

         expect(dayNumber(rebuilt) + (age?.days ?? 0), formatDateInput(asOf))
            .toBe(dayNumber(asOf))
      }
   })
})

/**
 * The inverse of `dayNumber`, for the sweep above.
 *
 * It lives here rather than in the module because nothing in the app needs
 * it — the panel only ever turns dates into counts, never the other way.
 */
function civilFromDayNumber(days: number): CalendarDate {
   const shifted = days + 719468
   const era = Math.floor(shifted / 146097)
   const dayOfEra = shifted - era * 146097
   const yearOfEra = Math.floor(
      (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524)
        - Math.floor(dayOfEra / 146096)) / 365,
   )
   const year = yearOfEra + era * 400
   const dayOfYear = dayOfEra
     - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
   const monthPrime = Math.floor((5 * dayOfYear + 2) / 153)
   const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1
   const month = monthPrime + (monthPrime < 10 ? 3 : -9)

   return { year: year + (month <= 2 ? 1 : 0), month, day }
}

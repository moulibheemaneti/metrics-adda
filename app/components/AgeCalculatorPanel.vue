<template>
   <div class="age stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <div class="age__inputs">
            <div class="field">
               <label class="field__label" :for="`${uid}-birth`">
                  {{ COPY.age.birthLabel }}
               </label>
               <input
                  :id="`${uid}-birth`"
                  v-model="birth"
                  class="control control--numeric age__date"
                  type="date"
                  :max="asOf"
               />
            </div>

            <div class="field">
               <label class="field__label" :for="`${uid}-as-of`">
                  {{ COPY.age.asOfLabel }}
               </label>
               <input
                  :id="`${uid}-as-of`"
                  v-model="asOf"
                  class="control control--numeric age__date"
                  type="date"
                  :aria-describedby="`${uid}-as-of-hint`"
               />
               <p :id="`${uid}-as-of-hint`" class="field__hint">
                  {{ COPY.age.asOfHint }}
               </p>
            </div>
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <p v-if="birthDate === null || asOfDate === null" class="age__note">
            {{ COPY.age.empty }}
         </p>

         <p v-else-if="age === null" class="age__note">
            {{ COPY.age.future }}
         </p>

         <template v-else>
            <p class="age__readout">
               <span class="age__value">{{ spokenAge }}</span>
            </p>

            <ul class="age__grid">
               <li class="stat">
                  <span class="stat__value">{{ formatCount(age.totalMonths) }}</span>
                  <span class="stat__label">{{ COPY.age.totalMonthsLabel }}</span>
               </li>
               <li class="stat">
                  <span class="stat__value">{{ formatCount(age.totalWeeks) }}</span>
                  <span class="stat__label">{{ COPY.age.totalWeeksLabel }}</span>
               </li>
               <li class="stat">
                  <span class="stat__value">{{ formatCount(age.totalDays) }}</span>
                  <span class="stat__label">{{ COPY.age.totalDaysLabel }}</span>
               </li>
               <li class="stat">
                  <span class="stat__value">{{ COPY.age.weekdays[age.bornOn] }}</span>
                  <span class="stat__label">{{ COPY.age.bornOnLabel }}</span>
               </li>
               <li class="stat">
                  <span class="stat__value">{{ nextBirthdayValue }}</span>
                  <span class="stat__label">
                     {{ COPY.age.nextBirthdayLabel }}
                     <span class="stat__note">{{ turning }}</span>
                  </span>
               </li>
            </ul>

            <p class="visually-hidden" aria-live="polite">
               {{ spoken }}
            </p>
         </template>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { CalendarDate } from "~/utils/age"

/// The calendar arithmetic lives in `utils/age.ts`. This file holds the
/// two fields, the plural forms, and the decision about what "today"
/// means — which is the only part of an age calculator that cannot be a
/// pure function.

const uid = useId()

/// Seeded with a worked example so the page server-renders a real answer
/// rather than an empty prompt, the same as the converters. Both dates are
/// fixed rather than relative: `todayLocal()` during render would bake the
/// build date into the prerendered HTML and serve it as "today" for as
/// long as that page stayed cached. 2000-01-01 to 2025-07-01 is exactly
/// 25 years and 6 months, which reads as an example rather than as
/// somebody's real answer.
const birth = ref("2000-01-01")
const asOf = ref("2025-07-01")

/// Moved to the real today once there is a browser to ask. This is the
/// one visible change on hydration, and it is visible on purpose: the
/// date is in a field the reader can see, so it reads as the default
/// filling itself in rather than as the answer changing by itself.
onMounted(() => {
   asOf.value = formatDateInput(todayLocal())
})

const birthDate = computed(() => parseDateInput(birth.value))
const asOfDate = computed(() => parseDateInput(asOf.value))

const age = computed(() =>
   (birthDate.value === null || asOfDate.value === null
      ? null
      : calculateAge(birthDate.value, asOfDate.value)))

/** `1 year` / `2 years`, from the pair in the copy rather than an added "s". */
function plural(count: number, one: string, many: string): string {
   return `${formatCount(count)} ${count === 1 ? one : many}`
}

/** A date as it would be written: 10 March 2026. */
function writeDate(date: CalendarDate): string {
   return `${date.day} ${COPY.age.months[date.month - 1]} ${date.year}`
}

/**
 * The age in words, with the empty parts left off.
 *
 * "25 years" beats "25 years, 0 months, 0 days" — the zeroes are noise on
 * the reading someone came for. The days part stays when everything is
 * zero, so a birth date entered as today reads "0 days" rather than blank.
 */
const spokenAge = computed(() => {
   if (age.value === null) return ""

   const { units } = COPY.age
   const parts: string[] = []

   if (age.value.years > 0) parts.push(plural(age.value.years, units.year, units.years))
   if (age.value.months > 0) parts.push(plural(age.value.months, units.month, units.months))
   if (age.value.days > 0 || parts.length === 0) {
      parts.push(plural(age.value.days, units.day, units.days))
   }

   return parts.join(", ")
})

const nextBirthdayValue = computed(() => {
   if (age.value === null) return ""

   const { daysAway } = age.value.nextBirthday

   if (daysAway === 0) return COPY.age.birthdayToday

   return plural(daysAway, COPY.age.units.day, COPY.age.units.days)
})

/** The tile's qualifier: which birthday it is, and when it lands. */
const turning = computed(() => {
   if (age.value === null) return ""

   const { turning: reaching, daysAway, date } = age.value.nextBirthday
   const template = daysAway === 0 ? COPY.age.turningToday : COPY.age.turning

   return template
      .replace("{age}", formatCount(reaching))
      .replace("{date}", writeDate(date))
})

const spoken = computed(() => {
   if (age.value === null) return ""

   return `${spokenAge.value}. ${COPY.age.nextBirthdayLabel}: ${nextBirthdayValue.value}.`
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.age {
   &__inputs {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-sm);

      @media (width >= 40rem) {
         grid-template-columns: 1fr 1fr;
         align-items: start;
      }
   }

   // The reset strips `appearance` from every form control, which on a
   // date input also takes the picker button with it in WebKit. Restoring
   // it here rather than in the shared `.control` keeps the change to the
   // one input type that needs it.
   &__date {
      appearance: auto;

      &::-webkit-calendar-picker-indicator {
         cursor: pointer;
      }
   }

   &__note {
      color: var(--muted);
   }

   &__readout {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
      align-items: baseline;
   }

   &__value {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 5vw, 2.5rem);
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-heading);
      line-height: 1.1;
   }

   &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(#{px-to-rem(150)}, 1fr));
      gap: var(--space-2xs);
      list-style: none;
   }
}
</style>

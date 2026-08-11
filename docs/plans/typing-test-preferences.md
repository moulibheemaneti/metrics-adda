# Typing test: preferences, and the words that changed themselves

## Context

The typing speed test shipped with one setting — the length of the run — and
one vocabulary: two hundred common English words, lowercase, no punctuation.
That is the right default for *measuring* a speed, because a comparable figure
needs comparable words. It is the wrong offer for *practising* one. Someone
drilling code needs `const` and `return`; someone already past 90 wpm on short
words needs long ones; and anyone who types real prose all day needs the
numbers and punctuation the bank deliberately left out.

Shipped with it, and the reason the branch exists: **words changed themselves
mid-run**. Type a few words, press Restart, keep typing, and each word ahead of
the caret would silently swap to a different one as the caret arrived.

---

## Decisions

### The stale word was a `v-memo` dependency that was never declared

The stage renders the stream as `v-for` over `words`, keyed by index, with:

```vue
v-memo="[typedAt(index), index === wordIndex]"
```

Words are keyed by their **index in the stream**, and `restart()` deals a fresh
stream into those same indices. For every word ahead of the caret, both
dependencies are unchanged across that restart — `typedAt(index)` is
`undefined` before and after, `index === wordIndex` is `false` before and after
— so Vue skips patching the subtree. The DOM keeps the previous run's word
while `charsFor()` grades against the new one. The stale word re-renders only
when `index === wordIndex` finally flips, which is the moment the reader is
looking straight at it.

The word itself is now the first dependency:

```vue
v-memo="[word, typedAt(index), index === wordIndex]"
```

`charsFor(index)` reads exactly `words.value[index]` and `typedAt(index)`, so
those three make the memo complete, and the dependency count stays constant
across renders as `v-memo` requires. A regression test types what is on screen
after a restart and asserts it is still on screen when the caret reaches it;
without the fix it scores 65% for typing everything correctly.

`restartRun()` also remeasures explicitly. Restarting an untouched run changes
neither `typed`, `wordIndex` nor `status`, so the watcher that normally moves
the caret never fires.

### Difficulty is a length window, not fifteen hand-authored banks

Five topics × three difficulties would be fifteen word lists to write and keep
in step. Instead each topic has one bank and `poolFor(topic, difficulty)` takes
a length window over it — easy 2–5 characters, medium the whole bank, hard 7+.
Length is what actually makes a word slow to type, and a window keeps every
topic's vocabulary intact at every level rather than thinning it into three
unrelated lists.

Every bank is authored to clear `MIN_POOL` (40 words) in every tier. Below
that, the shuffled bags come round inside a single 30-second run and the stream
visibly loops. `poolFor` will widen a thin window outwards by how far each word
misses it, but that is a floor for a bad bank rather than a path anything
normally takes — a test asserts no shipped tier reaches for it.

### Difficulty also changes the shape of a word, not only which word

Hard capitalises about one word in eight, mixes numbers and punctuation in more
densely than the other tiers, and turns both mixes on as it is selected. That
last part is a **nudge, not a lock**: the toggles stay live afterwards, so
someone who wants long words without punctuation can still have them. Making
hard override them permanently would have made two of the three controls the
reader asked for decorative.

### The mix is applied to the stream, never baked into the bank

Banks stay plain lowercase; `buildStream` layers capitals, punctuation and
numbers on afterwards, in one left-to-right pass. Every rule in that pass
depends on the token before it — a capital follows a full stop, and neither two
numbers nor two punctuated words may sit next to each other, because
back-to-back decoration reads as noise rather than as the prose it is
imitating.

One invariant holds the whole thing together: **no token ever contains a
space.** A space is the word boundary in `handleInput`, so a token holding one
would bank two words for a single keystroke. It is asserted across every topic
and difficulty.

### Preferences are four scalar keys, and the default is the absence of one

`useTypingSettings` follows `useReadingSpeeds` exactly: `useState` so nothing
leaks between requests on the server, one `ma-`-prefixed key per field rather
than a JSON blob that can fail to parse, a stored value that is not on offer
discarded rather than coerced, and `sync()` deferred to `onMounted` — before
the first deal, so the opening stream matches the stored preferences instead of
flashing the defaults and replacing them.

Storing the default as the absence of a key also means someone who returns to
common English keeps inheriting whatever that default becomes later.

### A settings change restarts the run

Half a run scored against one vocabulary and half against another measures
neither. Every control takes the path `selectDuration` already took: write the
setting, then restart. The composable deliberately does *not* watch its
options — re-dealing from inside a watcher is how words end up changing under
someone's fingers, which is the bug this branch set out to fix.

### Personal bests stay keyed by length alone

An easy 15-second run and a hard one with punctuation are not the same
achievement, and splitting bests per settings profile was considered. It was
not taken: 48 possible storage keys is a lot of machinery for a figure whose
job is to give one person something to beat. `useTypingBest` is untouched.

---

## Files

| File | Change |
| --- | --- |
| `app/utils/typing.ts` | Five word banks, `poolFor`, `StreamOptions`, the mix pass in `buildStream` |
| `app/composables/useTypingSettings.ts` | New — the four persisted preferences |
| `app/composables/useTypingTest.ts` | Takes the options and passes them to every deal |
| `app/components/TypingTestPanel.vue` | The `v-memo` fix, the settings row, `__lengths` generalised to `__pills` |
| `app/utils/copy.ts` | Control labels, a new FAQ entry, an updated lede |

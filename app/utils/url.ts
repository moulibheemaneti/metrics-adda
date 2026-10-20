/// --------------------------------------------------
/// utils/url.ts
/// --------------------------------------------------
/// Percent-encoding, both directions, with the two distinctions the
/// platform functions make and most tools hide.
///
/// `encodeURIComponent` and `encodeURI` are not two spellings of the same
/// thing. The first escapes every reserved character, which is right for a
/// *value* going into a query string and wrong for a whole URL — it turns
/// `https://example.com/a b` into `https%3A%2F%2Fexample.com%2Fa%20b`, a
/// string no browser will follow. The second leaves `:/?#[]@!$&'()*+,;=`
/// alone, which is right for a whole URL and wrong for a value, because a
/// `&` inside someone's search term then reads as the start of the next
/// parameter. Picking the wrong one is the bug this tool exists to prevent,
/// so the choice is a visible control rather than an assumption.
///
/// The second distinction is `+`. In `application/x-www-form-urlencoded` —
/// what an HTML form submits, and what most query strings are — a space is
/// written `+`, and `%2B` is a literal plus. Nowhere else in a URL is that
/// true: a `+` in a path is just a plus. So it is its own flag rather than
/// something either encoder does on its own.
///
/// Decoding reports two failures separately for the same reason
/// `utils/base64.ts` does: a truncated escape and a valid escape carrying
/// bytes that are not UTF-8 are different problems with different fixes,
/// and `decodeURIComponent` throws the same `URIError` for both.
///
/// Encoding has a failure of its own, which is easy to miss because it is
/// not about percent-encoding at all. Both platform encoders throw
/// `URIError` on a string that is not well-formed UTF-16 — an unpaired
/// surrogate, half of an astral character with no other half — because
/// there is no UTF-8 encoding of it to escape. So both directions return a
/// result rather than throwing, and neither can be called without the
/// caller deciding what a failure looks like.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/**
 * How much of the input is treated as a value.
 *
 * `component` is a single field — a query value, a path segment, a
 * fragment. `full` is an entire URL whose structure has to survive.
 */
export const URL_SCOPES = ["component", "full"] as const

export type UrlScope = typeof URL_SCOPES[number]

/** Why a decode failed. The two cases have genuinely different fixes. */
export type UrlDecodeFault
   /** A `%` not followed by two hex digits — a typo, or a truncated string. */
   = | "malformed"
   /** Well-formed escapes, but the bytes they spell are not UTF-8 text. */
     | "notText"

/**
 * Why an encode failed. One case, and it is not a percent-encoding problem:
 * the input is not well-formed UTF-16, so it has no UTF-8 encoding to
 * escape in the first place.
 */
export type UrlEncodeFault = "loneSurrogate"

/** Either direction's failure, which is what the copy's fault map is keyed on. */
export type UrlFault = UrlDecodeFault | UrlEncodeFault

export type UrlEncoded
   = | { ok: true, text: string }
     | { ok: false, fault: UrlEncodeFault }

export type UrlDecoded
   = | { ok: true, text: string }
     | { ok: false, fault: UrlDecodeFault }

/** A `%` that is not the start of a complete two-digit escape. */
const BROKEN_ESCAPE = /%(?![0-9A-Fa-f]{2})/u

/**
 * Percent-encode `text`.
 *
 * `spaceAsPlus` applies to component scope only, and the caller is not
 * trusted to remember that: a space in a *path* must be `%20`, so writing
 * it as `+` in full-URL scope would produce a link that resolves to a
 * different resource. Swapping `%20` afterwards is unambiguous because
 * `encodeURIComponent` has already turned any literal plus into `%2B`.
 *
 * Caught rather than detected beforehand, which is the opposite of what
 * `decodeUrl` does and for the opposite reason. The scan there exists to
 * tell two faults apart that arrive as one indistinguishable `URIError`;
 * encoding has exactly one, since an unpaired surrogate is the only thing
 * the specification lets either encoder throw for. So catching it names it
 * with certainty, and cannot disagree with the engine about what
 * well-formed means the way a hand-written scan could.
 */
export function encodeUrl(
   text: string,
   scope: UrlScope = "component",
   spaceAsPlus = false,
): UrlEncoded {
   try {
      if (scope === "full") return { ok: true, text: encodeURI(text) }

      const encoded = encodeURIComponent(text)

      return { ok: true, text: spaceAsPlus ? encoded.replace(/%20/gu, "+") : encoded }
   }
   catch {
      return { ok: false, fault: "loneSurrogate" }
   }
}

/**
 * Decode percent-encoded text.
 *
 * Always full decoding, with no scope to pick. `decodeURI` is the mirror
 * of `encodeURI` and leaves the reserved escapes in place, so a URL
 * carrying `%2F` comes back still carrying it — which, on a page whose job
 * is to make an encoded string readable, looks like the tool half-failed.
 * Someone reading a URL wants to read all of it.
 *
 * `plusAsSpace` is the form-encoding question above, asked on the way
 * back. It is off by default because a `+` in a path is a literal one, and
 * turning it into a space silently corrupts the very thing being decoded.
 */
export function decodeUrl(text: string, plusAsSpace = false): UrlDecoded {
   if (text === "") return { ok: true, text: "" }

   // Checked before the plus swap and before decoding, so that the one
   // failure a reader can fix by looking at their input is named as that
   // rather than lumped in with an encoding problem they cannot see.
   if (BROKEN_ESCAPE.test(text)) return { ok: false, fault: "malformed" }

   const prepared = plusAsSpace ? text.replace(/\+/gu, "%20") : text

   try {
      return { ok: true, text: decodeURIComponent(prepared) }
   }
   catch {
      // The only `URIError` left once every escape is well-formed: the
      // bytes decode fine and are not valid UTF-8. `%FF` on its own, or a
      // multi-byte sequence cut in half.
      return { ok: false, fault: "notText" }
   }
}

/** Whether `text` would decode. Convenience over `decodeUrl().ok`. */
export function isValidPercentEncoding(text: string): boolean {
   return decodeUrl(text).ok
}

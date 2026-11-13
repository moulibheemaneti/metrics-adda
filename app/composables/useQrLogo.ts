/// --------------------------------------------------
/// composables/useQrLogo.ts
/// --------------------------------------------------
/// The image someone chooses to put in the middle of a QR code.
///
/// It is read with the File API and never leaves the tab — the same promise
/// every other tool on the site makes about what is typed into it, and the
/// one most worth keeping for a company's logo. Nothing is stored either:
/// a reload drops it.
///
/// Whatever arrives — a PNG, a JPEG, a 4000-pixel photo, an SVG — is drawn
/// once onto a canvas and kept as a PNG no wider than `QR_LOGO_PIXELS`.
/// That does three jobs at once. The preview, both downloads and the PNG
/// canvas all read one format with a known size; a 12 MB photo becomes a
/// few hundred kilobytes before it is inlined into an SVG; and an SVG logo
/// is flattened to pixels, so any script or external reference inside it
/// is gone before it is embedded in a file someone else will open.
///
/// Auto-imported by Nuxt.
/// --------------------------------------------------

import type { QrLogoFault } from "~/utils/qr"

/**
 * The longest side of the stored logo, in pixels.
 *
 * At the largest cap a logo is a quarter of the code's width, so this
 * prints a 20 cm code's logo at well over 300 dpi — and still keeps a
 * photo's data URL to a size the page can hold without noticing.
 */
export const QR_LOGO_PIXELS = 640

/** Larger files are refused before decoding, so a mistaken pick cannot hang the tab. */
export const QR_LOGO_MAX_BYTES = 10 * 1024 * 1024

export interface QrLogo {
   /** A PNG data URL, at most `QR_LOGO_PIXELS` on its longer side. */
   href: string
   /** The original file's name, shown so someone can see which one they picked. */
   name: string
   width: number
   height: number
}

/**
 * Decode `file` and redraw it as a PNG data URL.
 *
 * An SVG with no width or height of its own reports a natural size of
 * zero in some browsers, so it is given a square one rather than drawn
 * into a zero-pixel canvas.
 */
async function flatten(file: File): Promise<QrLogo> {
   const url = URL.createObjectURL(file)

   try {
      const image = new Image()

      image.src = url
      await image.decode()

      const naturalWidth = image.naturalWidth || QR_LOGO_PIXELS
      const naturalHeight = image.naturalHeight || QR_LOGO_PIXELS
      const scale = Math.min(1, QR_LOGO_PIXELS / Math.max(naturalWidth, naturalHeight))
      const width = Math.max(1, Math.round(naturalWidth * scale))
      const height = Math.max(1, Math.round(naturalHeight * scale))
      const canvas = document.createElement("canvas")

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext("2d")

      if (context === null) throw new Error("No 2D canvas")

      context.imageSmoothingQuality = "high"
      context.drawImage(image, 0, 0, width, height)

      // Throws a SecurityError on a canvas the browser considers tainted,
      // which is the caller's "unreadable" rather than a crash.
      return { href: canvas.toDataURL("image/png"), name: file.name, width, height }
   }
   finally {
      URL.revokeObjectURL(url)
   }
}

export function useQrLogo() {
   const logo = shallowRef<QrLogo | null>(null)
   const fault = ref<QrLogoFault | null>(null)

   /**
    * Read a chosen file. Resolves true when it became the logo.
    *
    * A refused file leaves any earlier logo in place: picking the wrong
    * file by mistake should not cost the right one already in the code.
    */
   const load = async(file: File): Promise<boolean> => {
      if (!file.type.startsWith("image/")) {
         fault.value = "notImage"

         return false
      }

      if (file.size > QR_LOGO_MAX_BYTES) {
         fault.value = "tooLarge"

         return false
      }

      try {
         logo.value = await flatten(file)
         fault.value = null

         return true
      }
      catch {
         fault.value = "unreadable"

         return false
      }
   }

   const remove = (): void => {
      logo.value = null
      fault.value = null
   }

   return { logo, fault, load, remove }
}

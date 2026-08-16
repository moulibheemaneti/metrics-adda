/// Registers the install-prompt listeners at app startup.
///
/// This is a plugin rather than an `onMounted` in the button, because
/// `beforeinstallprompt` fires once and does not replay for a listener that
/// arrives late. The footer button mounts with the rest of the app, so in
/// practice both are ready at the same moment — but a plugin runs before
/// the component tree either way, which is the cheapest way to not have to
/// think about it.
export default defineNuxtPlugin(() => {
   useInstallPrompt().listen()
})

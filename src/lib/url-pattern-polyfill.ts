import * as urlPatternPolyfill from '@inlang/paraglide-js/urlpattern-polyfill'

type UrlPatternConstructor = new (
  input: string,
  baseURL?: string,
) => { exec(input: string): unknown }

const globalWithUrlPattern = globalThis as typeof globalThis & {
  URLPattern?: UrlPatternConstructor
}

/**
 * Paraglide matches localized URLs with URLPattern. Node 22, the runtime this
 * Vercel build targets, does not provide that global. The generated
 * `import "@inlang/paraglide-js/urlpattern-polyfill"` is dropped because this
 * package sets `"sideEffects": false`.
 */
export function installUrlPatternPolyfill() {
  if (globalWithUrlPattern.URLPattern) return

  globalWithUrlPattern.URLPattern = urlPatternPolyfill.x.URLPattern
}

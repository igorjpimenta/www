// Geo-based language routing for igorpimenta.com.
//
// Runs at Cloudflare's edge, in front of CloudFront — this is deliberate,
// not just convenient. Cloudflare terminates the visitor's real
// connection and knows their true country (request.cf.country).
// CloudFront, sitting behind Cloudflare, only ever sees Cloudflare's own
// edge IP, so any geo lookup done there would be wrong.
//
// Behavior: a first-time visitor from Brazil landing on "/" gets sent to
// "/pt-br/". A `lang_pref` cookie is set whenever someone lands on either
// language root, and the auto-redirect only fires when that cookie is
// absent — so switching language once (via the nav link) sticks, instead
// of being silently overridden by geography on every future visit.

const COOKIE_NAME = 'lang_pref'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function cookieValue(request) {
  const header = request.headers.get('Cookie') || ''
  const match = header.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}

export default {
  async fetch(request, _env, _ctx) {
    const url = new URL(request.url)
    const country = request.cf ? request.cf.country : null
    const existingPref = cookieValue(request)

    if (url.pathname === '/' && country === 'BR' && !existingPref) {
      const target = new URL('/pt-br/', url)
      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          'Set-Cookie': `${COOKIE_NAME}=pt-BR; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
        },
      })
    }

    const response = await fetch(request)

    if (url.pathname === '/' || url.pathname === '/pt-br/') {
      const lang = url.pathname === '/' ? 'en' : 'pt-BR'
      const newResponse = new Response(response.body, response)
      newResponse.headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${lang}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
      )
      return newResponse
    }

    return response
  },
}

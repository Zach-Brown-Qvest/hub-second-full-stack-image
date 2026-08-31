import { createServer } from 'node:http'

const NAME_MAX_LENGTH = 48

/**
 * The Hub gateway serves this application inside a sandboxed document, so it is
 * interactive through GET only: the form below re-requests `/` with a query.
 */
function page(name) {
  const greeting = name ? `Hello, ${escapeHtml(name)}.` : 'Enter a name to greet.'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Second full-stack service</title>
<style>
body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: #10221f; background: #f4f7f6; }
main { max-width: 34rem; margin: 0 auto; padding: 2.5rem 1.5rem; }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
p.lede { margin: 0 0 2rem; color: #4c625e; }
form { display: flex; gap: .5rem; margin: 0 0 1.5rem; }
input { flex: 1; padding: .6rem .75rem; border: 1px solid #cbd8d5; border-radius: .4rem; font: inherit; }
button { padding: .6rem 1.1rem; border: 0; border-radius: .4rem; background: #10221f; color: #fff; font: inherit; cursor: pointer; }
section { padding: 1.25rem; background: #fff; border: 1px solid #e2eae8; border-radius: .6rem; }
strong { display: block; font-size: 1.125rem; }
code { font-size: .875rem; color: #4c625e; }
</style>
</head>
<body>
<main>
<h1>Second full-stack service</h1>
<p class="lede">A second, independent full-stack application, deployed alongside the first.</p>
<form method="get">
<label for="name" hidden>Name</label>
<input id="name" name="name" maxlength="${NAME_MAX_LENGTH}" value="${escapeHtml(name)}" placeholder="Your name">
<button type="submit">Greet</button>
</form>
<section>
<strong>${greeting}</strong>
<code>Served by the private Cloud Run service; the page and its API share one image.</code>
</section>
</main>
</body>
</html>`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

/** Bounded so a long or odd query cannot reach the response body. */
function requestedName(query) {
  const name = query.get('name') ?? ''
  return /^[\p{L}\p{N} .'-]{0,48}$/u.test(name) ? name : ''
}

export function createApplication() {
  return createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405).end()
      return
    }
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}')
      return
    }
    if (url.pathname === '/api/status') {
      response.writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ service: 'second-full-stack', greeting: requestedName(url.searchParams) }))
      return
    }
    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html' }).end(page(requestedName(url.searchParams)))
      return
    }
    response.writeHead(404).end()
  })
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createApplication().listen(Number(process.env.PORT ?? 8080))
}

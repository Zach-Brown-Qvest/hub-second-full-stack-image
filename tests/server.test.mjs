import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { get } from 'node:http'
import { createApplication } from '../src/server.mjs'

async function request(port, path) {
  const response = await new Promise((resolve, reject) => {
    get({ hostname: '127.0.0.1', port, path }, resolve).on('error', reject)
  })
  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) body += chunk
  return { statusCode: response.statusCode, body }
}

async function withApplication(assertions) {
  const application = createApplication()
  application.listen(0)
  await once(application, 'listening')
  try {
    await assertions(application.address().port)
  } finally {
    await new Promise((resolve, reject) => application.close((error) => error ? reject(error) : resolve()))
  }
}

test('one server exposes UI, API, and health routes', async () => {
  await withApplication(async (port) => {
    const page = await request(port, '/')
    assert.equal(page.statusCode, 200)
    assert.match(page.body, /Second full-stack service/)
    assert.match(page.body, /<form method="get">/)
    assert.equal((await request(port, '/health')).body, '{"status":"ok"}')
    assert.equal((await request(port, '/api/status')).body, '{"service":"second-full-stack","greeting":""}')
    assert.equal((await request(port, '/does-not-exist')).statusCode, 404)
  })
})

test('a query parameter drives the page and the API without reaching the response raw', async () => {
  await withApplication(async (port) => {
    const greeted = await request(port, '/?name=Hub%20Operator')
    assert.match(greeted.body, /Hello, Hub Operator\./)
    assert.equal(
      (await request(port, '/api/status?name=Hub%20Operator')).body,
      '{"service":"second-full-stack","greeting":"Hub Operator"}',
    )
    // A rejected name is dropped rather than echoed, so markup cannot be injected.
    const attempted = await request(port, '/?name=%3Cscript%3Ealert(1)%3C/script%3E')
    assert.doesNotMatch(attempted.body, /<script>alert/)
    assert.match(attempted.body, /Enter a name to greet\./)
  })
})

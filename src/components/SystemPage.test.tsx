import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotFoundPage, RootErrorPage } from './SystemPage'

describe('route failure experiences', () => {
  it('offers a useful 404 path back to the studio', () => {
    const html = renderToStaticMarkup(<NotFoundPage />)
    assert.ok(html.includes('404 · Page not found'))
    assert.ok(html.includes('href="/"'))
    assert.ok(html.includes('device-local resume library'))
  })

  it('keeps raw error details and resume-like secrets out of the recovery page', () => {
    const secret = 'private-candidate-content@example.com'
    const html = renderToStaticMarkup(<RootErrorPage error={new Error(secret)} reset={() => undefined} />)
    assert.equal(html.includes(secret), false)
    assert.ok(html.includes('Try again'))
    assert.ok(html.includes('Reload the studio'))
  })
})

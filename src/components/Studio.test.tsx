import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { Studio } from './Studio'

describe('studio navigation semantics', () => {
  it('renders skip links and a complete tab/tabpanel relationship', async () => {
    const routeTree = createRootRoute({ component: Studio })
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/'] }) })
    await router.load()
    const html = renderToStaticMarkup(<RouterProvider router={router} />)
    assert.ok(html.includes('href="#studio-editor-content"'))
    assert.ok(html.includes('href="#resume-preview"'))
    assert.ok(html.includes('role="tablist"'))
    assert.equal((html.match(/role="tab"/g) ?? []).length, 4)
    assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 4)
    assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1)
    for (const id of ['content', 'design', 'review', 'data']) {
      assert.ok(html.includes(`aria-controls="studio-panel-${id}"`))
      assert.ok(html.includes(`aria-labelledby="studio-tab-${id}"`))
    }
  })
})

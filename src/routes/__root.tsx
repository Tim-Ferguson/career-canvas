import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'
import appCss from '../styles/app.css?url'

const getSiteOrigin = createServerFn({ method: 'GET' }).handler(() => ({
  origin: getRequestUrl({ xForwardedHost: true }).origin,
}))

export const Route = createRootRoute({
  loader: () => getSiteOrigin(),
  head: ({ loaderData }) => {
    const title = 'Career Canvas — Private, flexible resume studio'
    const description = 'Build, tailor, review, and export polished resumes across industries with a private local-first TanStack studio.'
    const socialImage = `${loaderData?.origin ?? 'http://localhost:3000'}/og.png`
    return {
      meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#f4f2ec' },
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: socialImage },
      { property: 'og:image:width', content: '1731' },
      { property: 'og:image:height', content: '909' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: socialImage },
      ],
      links: [{ rel: 'stylesheet', href: appCss }],
    }
  },
  component: RootComponent,
  notFoundComponent: () => <main className="simple-page"><h1>That page is not on this canvas.</h1><a href="/">Return to your resume</a></main>,
})

function RootComponent() {
  return <RootDocument><Outlet /></RootDocument>
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  )
}

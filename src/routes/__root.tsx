import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'
import appCss from '../styles/app.css?url'
import { NotFoundPage, RootErrorPage } from '../components/SystemPage'

const getSiteOrigin = createServerFn({ method: 'GET' }).handler(() => {
  const requestUrl = getRequestUrl({ xForwardedHost: true })
  return { origin: requestUrl.origin, canonicalUrl: `${requestUrl.origin}${requestUrl.pathname}` }
})

export const Route = createRootRoute({
  loader: () => getSiteOrigin(),
  head: ({ loaderData }) => {
    const title = 'Timo’s Resume Maker — Private, flexible resume studio'
    const description = 'Build, tailor, review, and export polished resumes across industries with a private local-first TanStack studio.'
    const socialImage = `${loaderData?.origin ?? 'http://localhost:3000'}/og.png?v=2`
    const canonicalUrl = loaderData?.canonicalUrl ?? 'http://localhost:3000/'
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
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: socialImage },
      { property: 'og:image:alt', content: 'Timo’s Resume Maker' },
      { property: 'og:image:width', content: '1731' },
      { property: 'og:image:height', content: '909' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: socialImage },
      ],
      links: [{ rel: 'stylesheet', href: appCss }, { rel: 'canonical', href: canonicalUrl }, { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    }
  },
  shellComponent: RootDocument,
  component: Outlet,
  errorComponent: RootErrorPage,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  )
}

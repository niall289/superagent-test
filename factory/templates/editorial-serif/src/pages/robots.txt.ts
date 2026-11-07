import type { APIRoute } from 'astro'
import { getSite } from '../lib/content'

/**
 * Robots is generated from the same site origin as the sitemap, so a site URL
 * change cannot leave a stale sitemap reference behind.
 */
export const GET: APIRoute = async ({ site }) => {
  const data = await getSite()
  const origin = (site ?? new URL(data.url)).origin

  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap-index.xml\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    },
  )
}

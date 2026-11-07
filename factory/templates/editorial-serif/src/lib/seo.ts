import type { SiteData } from './content'

/**
 * Canonical URLs always come from the configured site origin, never from the
 * request host. Previews and production cannot disagree about the canonical.
 */
export function canonicalUrl(pathname: string, site: URL): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return new URL(path, site).href
}

export function absoluteUrl(path: string, site: URL): string {
  return new URL(path, site).href
}

/**
 * LocalBusiness JSON-LD. Every value comes from approved site content; do not
 * add ratings, awards or social profiles that the client has not supplied.
 */
export function buildBusinessJsonLd(site: SiteData, url: URL): Record<string, unknown> {
  const origin = canonicalUrl('/', url).replace(/\/$/, '')

  return {
    '@context': 'https://schema.org',
    '@type': 'Electrician',
    '@id': `${origin}/#business`,
    name: site.name,
    legalName: site.legalName,
    url: origin,
    description: site.description,
    telephone: site.phone,
    email: site.email,
    foundingDate: String(site.founded),
    image: absoluteUrl('/og-default.png', url),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    areaServed: site.serviceArea.map((name) => ({
      '@type': 'AdministrativeArea',
      name,
    })),
    identifier: [
      {
        '@type': 'PropertyValue',
        name: 'CRO number',
        value: site.registration.cro,
      },
      {
        '@type': 'PropertyValue',
        name: 'Safe Electric registration',
        value: site.registration.safeElectric,
      },
    ],
    knowsAbout: [
      'Commercial electrical installation',
      'Distribution and switchgear',
      'Emergency lighting',
      'Fire detection and alarm',
      'Electrical inspection and certification',
    ],
  }
}

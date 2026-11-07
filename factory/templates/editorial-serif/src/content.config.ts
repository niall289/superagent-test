import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const navLink = z.object({
  label: z.string().min(1),
  href: z
    .string()
    .regex(/^(?:\/|#)/, 'navigation links must be relative paths or fragments'),
})

const site = defineCollection({
  loader: glob({ base: 'src/content/site', pattern: '*.json' }),
  schema: z.object({
    name: z.string().min(1),
    legalName: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    url: z.string().url(),
    locale: z.string().min(1),
    founded: z.number().int().min(1900),
    phone: z.string().min(1),
    phoneHref: z.string().regex(/^\+?[0-9 ]+$/, 'phoneHref must be dialable'),
    emergencyPhone: z.string().min(1),
    emergencyPhoneHref: z.string().regex(/^\+?[0-9 ]+$/, 'phoneHref must be dialable'),
    email: z.string().email(),
    address: z.object({
      street: z.string().min(1),
      locality: z.string().min(1),
      region: z.string().min(1),
      postcode: z.string().min(1),
      country: z.string().length(2),
    }),
    registration: z.object({
      cro: z.string().min(1),
      vat: z.string().min(1),
      safeElectric: z.string().min(1),
      publicLiability: z.string().min(1),
    }),
    serviceArea: z.array(z.string().min(1)).min(1),
    hours: z.array(
      z.object({
        days: z.string().min(1),
        hours: z.string().min(1),
      }),
    ),
    nav: z.array(navLink).min(2),
    legal: z.object({
      privacyPath: z.string().startsWith('/'),
      termsPath: z.string().startsWith('/'),
      disclaimers: z.array(z.string().min(1)).min(1),
    }),
  }),
})

const services = defineCollection({
  loader: glob({ base: 'src/content/services', pattern: '**/*.json' }),
  schema: z.object({
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
    summary: z.string().min(1),
    body: z.string().min(1),
    deliverables: z.array(z.string().min(1)).min(3),
    leadTime: z.string().min(1),
    standards: z.array(z.string().min(1)).min(1),
  }),
})

const projects = defineCollection({
  loader: glob({ base: 'src/content/projects', pattern: '**/*.json' }),
  schema: z.object({
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
    sector: z.string().min(1),
    location: z.string().min(1),
    year: z.number().int().min(1900),
    summary: z.string().min(1),
    brief: z.string().min(1),
    outcome: z.string().min(1),
    specs: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
        }),
      )
      .min(4),
    plate: z.object({
      id: z.enum(['warehouse', 'georgian', 'cold-store']),
      alt: z.string().min(1),
      caption: z.string().min(1),
    }),
  }),
})

export const collections = { site, services, projects }

import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

export type SiteData = CollectionEntry<'site'>['data']
export type ServiceData = CollectionEntry<'services'>['data']
export type ProjectData = CollectionEntry<'projects'>['data']

export async function getSite(): Promise<SiteData> {
  const [entry] = await getCollection('site')
  if (!entry) {
    throw new Error('Site metadata is missing: add src/content/site/site.json')
  }
  return entry.data
}

export async function getServices(): Promise<ServiceData[]> {
  const services = await getCollection('services')
  return services
    .map((entry) => entry.data)
    .sort((left, right) => left.order - right.order)
}

export async function getProjects(): Promise<ProjectData[]> {
  const projects = await getCollection('projects')
  return projects
    .map((entry) => entry.data)
    .sort((left, right) => left.order - right.order)
}

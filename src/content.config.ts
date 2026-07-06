import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Keep original casing and use dashes for spaces so ids match the URLs
// already used by the homepage (e.g. "16 UX Laws/菲茨定律.md" -> "16-UX-Laws/菲茨定律").
const dashId = ({ entry }: { entry: string }) =>
  entry.replace(/\.md$/, '').replaceAll(' ', '-');

const schema = z
  .object({
    title: z.string(),
    date: z.coerce.date().nullish(),
    latest: z.coerce.date().nullish(),
    created: z.coerce.date().nullish(),
    description: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
  })
  .passthrough();

const make = (base: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base, generateId: dashId }),
    schema,
  });

export const collections = {
  essays: make('./src/content/essays'),
  products: make('./src/content/products'),
  ux: make('./src/content/ux'),
  pages: make('./src/content/pages'),
};

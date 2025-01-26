import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md, mdx}', base: "./src/content/blog" }),
  schema: z.object({
      title: z.string(),
      pubDate: z.date(),
      lastUpdated: z.date(),
    }),
});

export const collections = {
  'blog': blogCollection,
};
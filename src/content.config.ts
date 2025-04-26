import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md, mdx}', base: "./src/content/articles" }),
  schema: z.object({
      title: z.string(),
      pubDate: z.date(),
      lastUpdated: z.date(),
    }),
});

const fragments = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md, mdx}', base: "./src/content/fragments" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
  })
})

export const collections = {
  articles,
  fragments,
};
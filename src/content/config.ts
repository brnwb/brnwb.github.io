import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        pubDate: z.date(),
        lastUpdated: z.date(),
      }),
});

export const collections = {
  'blog': blogCollection,
};
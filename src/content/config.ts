import { z, defineCollection } from 'astro:content';

const bookCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        author: z.string(),
        translator: z.string().optional(),
        pubYear: z.string().optional(),
        reviewDate: z.date(),
      }),
});
const movieCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        director: z.string(),
        pubYear: z.string(),
        reviewDate: z.date(),
      }),
});

export const collections = {
  'books': bookCollection,
  'movies': movieCollection,
};
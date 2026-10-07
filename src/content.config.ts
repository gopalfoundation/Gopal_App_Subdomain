import { defineCollection, z } from 'astro:content';

const programs = defineCollection({
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    initiative: z.string(),
    description: z.string(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    registrationUrl: z.string().optional()
  })
});

const events = defineCollection({
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.string(),
    description: z.string(),
    featured: z.boolean().default(false)
  })
});

const articles = defineCollection({
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    category: z.string(),
    description: z.string(),
    featured: z.boolean().default(false)
  })
});

export const collections = { programs, events, articles };

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({
    base: './contents',
    pattern: '{caderno,privado,en/notebook,en/privado}/*/index.{md,mdx}',
    generateId: ({ entry }) => entry.replace(/\/index\.mdx?$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    topic: z.string(),
    draft: z.boolean().default(false),
    readingOrder: z.number().int(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    language: z.enum(['pt-BR', 'en']).optional(),
    canonical: z.string().optional(),
    translationOf: z.string().optional(),
    topicLabel: z.string().optional(),
    published: z.coerce.date().optional(),
    readingMinutes: z.number().int().optional(),
    displayDate: z.string().optional(),
    alternates: z.array(z.object({ language: z.string(), url: z.string() })).optional(),
    diagramStyles: z.array(z.string()).optional(),
    diagramScript: z.string().optional(),
  }),
});

const pageSchema = z.looseObject({
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  topic: z.string().optional(),
  format: z.string().optional(),
  status: z.string().optional(),
  draft: z.boolean().optional(),
  readingOrder: z.number().int().optional(),
  breadcrumb: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  coverUrl: z.string().optional(),
  photo: z.string().optional(),
  photoAlt: z.string().optional(),
  language: z.enum(['pt-BR', 'en']).optional(),
  canonical: z.string().optional(),
  translationOf: z.string().optional(),
  topicLabel: z.string().optional(),
  published: z.coerce.date().optional(),
  readingMinutes: z.number().int().optional(),
  displayDate: z.string().optional(),
  languageUrl: z.string().optional(),
  otherLanguage: z.string().optional(),
  otherLanguageLabel: z.string().optional(),
  alternates: z.array(z.object({ language: z.string(), url: z.string() })).optional(),
  diagramStyles: z.array(z.string()).optional(),
  diagramScript: z.string().optional(),
  ogType: z.string().optional(),
  heroTitle: z.string().optional(),
  isHome: z.boolean().optional(),
  isAbout: z.boolean().optional(),
  isPortuguese: z.boolean().optional(),
  isTrailPage: z.boolean().optional(),
  noindex: z.boolean().optional(),
  code: z.number().int().optional(),
});

const sitePages = defineCollection({
  loader: glob({
    base: './contents',
    pattern: ['**/index.{md,mdx}', '!{caderno,privado,en/notebook,en/privado}/*/index.{md,mdx}'],
    generateId: ({ entry }) => entry.replace(/\/index\.mdx?$/, ''),
  }),
  schema: pageSchema,
});

export const collections = { articles, sitePages };

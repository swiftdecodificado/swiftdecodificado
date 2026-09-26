import topicsData from '../config/topics.json';
import type { Language } from '../config/site';

/**
 * Assuntos do caderno e trilhas. A fonte é src/config/topics.json; aqui ficam só consultas
 * puras (testáveis sem Astro) sobre os artigos publicados de cada idioma.
 */
export type Topic = (typeof topicsData.topics)[number];
type TopicArticle = {
  id: string;
  data: { topic: string; language: Language; readingOrder: number; date: Date; title: string };
};

export const topics: Topic[] = topicsData.topics;
export const featured = topicsData.featured;

const localeKey = (language: Language) => (language === 'en' ? 'en' : 'pt');
const BASE = {
  trail: { 'pt-BR': '/trilhas/', en: '/en/trails/' },
  subject: { 'pt-BR': '/caderno/', en: '/en/notebook/' },
} as const;

export const isTrail = (topic: Topic) => Boolean(topic.trail);
export const topicName = (topic: Topic, language: Language) => topic[localeKey(language)];
export const topicSummary = (topic: Topic, language: Language) =>
  (topic.trail ?? (topic as any)).summary[localeKey(language)] as string;
export const topicRoute = (topic: Topic, language: Language) =>
  `${BASE[isTrail(topic) ? 'trail' : 'subject'][language]}${topic.slug}/`;

/** `--tile` e `--glyph` do assunto, para o atributo style de quem tem data-topic. */
const DEFAULT_GLYPH = "<path d='M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z'/><path d='M4 8.5 12 13l8-4.5M12 13v7'/>";
export function topicStyle(topic: Topic) {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' " +
    `stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${(topic as any).glyph || DEFAULT_GLYPH}</svg>`;
  return `--tile: var(--tile-${topic.tile}); --glyph: url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%2F/g, '/').replace(/%3A/g, ':').replace(/%3D/g, '=').replace(/%27/g, "'").replace(/%20/g, ' ')}")`;
}

/** Artigos publicados de um assunto no idioma, na ordem de leitura. */
export function chapters<T extends TopicArticle>(articles: T[], slug: string, language: Language): T[] {
  return articles
    .filter(({ data }) => data.topic === slug && data.language === language)
    .sort(
      (a, b) =>
        a.data.readingOrder - b.data.readingOrder ||
        a.data.date.getTime() - b.data.date.getTime() ||
        a.id.localeCompare(b.id),
    );
}

/** A página do assunto só existe para idiomas com ao menos um artigo publicado. */
export const pageExists = (articles: TopicArticle[], topic: Topic, language: Language) =>
  chapters(articles, topic.slug, language).length > 0;

/** Normaliza títulos para que publicar um texto planejado retire a entrada do plano. */
export const normalize = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Textos planejados (só em português) ainda não publicados, na ordem em que serão escritos. */
export function pending(topic: Topic, articles: TopicArticle[], language: Language): string[] {
  if (language !== 'pt-BR' || !topic.trail) return [];
  const published = new Set(
    articles
      .filter(({ data }) => data.topic === topic.slug && data.language === 'pt-BR')
      .map(({ data }) => normalize(data.title)),
  );
  return (topic.trail.next ?? []).filter((title: string) => !published.has(normalize(title)));
}

/** Estado de estudo derivado da contagem publicada, com o estado configurado como revisão. */
export function stateOf(trail: NonNullable<Topic['trail']>, published: number): 'soon' | 'done' | string {
  const total = (trail as any).total as number | undefined;
  if (published === 0) return 'soon';
  if (total && published >= total) return 'done';
  return (trail as any).state ?? 'studying';
}

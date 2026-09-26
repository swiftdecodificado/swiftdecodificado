import { getCollection } from 'astro:content';
import { getArticles } from '../lib/articles';
import { site } from '../config/site';
import { pageExists, topicRoute, topics } from '../lib/topics';

export const prerender = true;

export async function GET() {
  const [pages, articles] = await Promise.all([
    getCollection('sitePages', ({ data }) => Boolean(data.canonical) && data.noindex !== true && data.draft !== true),
    getArticles(({ data }) => !data.draft),
  ]);
  const locations = [
    ...pages.map(({ data }) => ({ url: data.canonical!, date: undefined as Date | undefined })),
    ...articles.map(({ data }) => ({ url: data.canonical, date: data.updated ?? data.published })),
  ];
  const published = articles;
  const subjects = topics.flatMap((topic) =>
    (['pt-BR', 'en'] as const)
      .filter((language) => pageExists(published, topic, language))
      .map((language) => ({
        url: `${site.origin}${topicRoute(topic, language)}`,
        date: undefined as Date | undefined,
      })),
  );
  locations.push(...subjects);
  const unique = [...new Map(locations.map((location) => [location.url, location])).values()];
  const urls = unique
    .map(
      ({ url, date }) =>
        `  <url><loc>${escapeXml(url)}</loc>${date ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

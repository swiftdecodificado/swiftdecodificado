import { getCollection, type CollectionEntry } from 'astro:content';
import { formatDate, routeOf, site, type Language } from '../config/site';
import { topicName, topics } from './topics';

/**
 * Único ponto em que os metadados de um artigo são completados.
 * O front matter só declara o que o autor decide (título, descrição, data, assunto, ordem,
 * tags, capa); idioma, canonical, alternates, datas de exibição e rótulo do assunto saem daqui.
 * Um valor escrito no front matter tem precedência sobre o derivado.
 */
const languageOfId = (id: string): Language => (id.startsWith('en/') ? 'en' : 'pt-BR');
const slugOf = (id: string) => id.split('/').pop()!;
const urlOf = (id: string) => `${site.origin}${routeOf(id)}`;
const readingMinutes = (body = '') => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

/** Artigos em contents/privado/ (ou en/privado/) nunca são publicados, com ou sem `draft` no front matter. */
const isPrivate = (id: string) => /^(en\/)?privado\//.test(id);

function complete(entry: CollectionEntry<'articles'>, all: CollectionEntry<'articles'>[]) {
  const { data, id } = entry;
  const language = data.language ?? languageOfId(id);
  const other = language === 'en' ? 'pt-BR' : 'en';
  const slug = slugOf(id);

  // A tradução é declarada uma vez, no arquivo em inglês (`translationOf: <slug-pt>`).
  const translation =
    language === 'en'
      ? all.find(({ id: candidate }) => slugOf(candidate) === data.translationOf && languageOfId(candidate) === 'pt-BR')
      : all.find(({ data: item, id: candidate }) => item.translationOf === slug && languageOfId(candidate) === 'en');

  const canonical = data.canonical ?? urlOf(id);
  const alternates = data.alternates ?? [
    { language, url: canonical },
    ...(translation ? [{ language: other, url: urlOf(translation.id) }] : []),
  ];
  const topic = topics.find((item) => item.slug === data.topic);
  const published = data.published ?? data.date;

  return {
    ...entry,
    data: {
      ...data,
      draft: data.draft || isPrivate(id),
      language,
      canonical,
      alternates,
      published,
      displayDate: data.displayDate ?? formatDate(published, language),
      topicLabel: data.topicLabel ?? (topic ? topicName(topic, language) : data.topic),
      readingMinutes: data.readingMinutes ?? readingMinutes(entry.body),
    },
  };
}

export async function getArticles(filter?: (article: ReturnType<typeof complete>) => boolean) {
  const all = await getCollection('articles');
  const articles = all.map((entry) => complete(entry, all));
  return filter ? articles.filter(filter) : articles;
}

export type Article = Awaited<ReturnType<typeof getArticles>>[number];

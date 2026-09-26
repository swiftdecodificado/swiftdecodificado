import { getArticles } from './articles';
import { chapters, featured as featuredEntries } from './topics';
import type { Language } from '../config/site';

/** Seleção de conteúdo da home: destaques, publicações recentes e artigos por assunto. */
export async function homeContent(language: Language) {
  const localeKey = language === 'en' ? 'en' : 'pt';
  const folder = language === 'en' ? 'en/notebook' : 'caderno';
  const published = (await getArticles()).filter(({ data }) => !data.draft && data.language === language);
  const featured = featuredEntries.flatMap((item) => {
    const article = published.find(({ id }) => id === `${folder}/${item[localeKey]}`);
    return article ? [{ article, label: item.label[localeKey] }] : [];
  });
  const featuredIds = new Set(featured.map(({ article }) => article.id));
  const latest = [...published]
    .sort(
      (left, right) =>
        right.data.date.getTime() - left.data.date.getTime() || right.data.readingOrder - left.data.readingOrder,
    )
    .filter(({ id }) => !featuredIds.has(id))
    .slice(0, 6);
  return { featured, latest, topicArticles: (slug: string) => chapters(published, slug, language) };
}

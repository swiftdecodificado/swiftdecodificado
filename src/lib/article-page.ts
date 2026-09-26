import { render } from 'astro:content';
import { getArticles, type Article } from './articles';
import { articleCover, socialCover } from './covers';
import { languageOf, ui } from '../config/site';
import { topicName, topicRoute, topics } from './topics';

/** Tudo o que a página de um artigo precisa além do texto: navegação, assunto e capa. O layout só apresenta. */
export async function articlePage(entry: Article) {
  const { data } = entry;
  const language = languageOf(data.language);
  const { Content } = await render(entry);
  const articles = await getArticles(({ data: item }) => !item.draft && item.language === data.language);
  const siblings = articles
    .filter((item) => item.data.topic === data.topic)
    .sort((left, right) => left.data.readingOrder - right.data.readingOrder || left.id.localeCompare(right.id));
  const index = siblings.findIndex((item) => item.id === entry.id);
  const topic = topics.find((item) => item.slug === data.topic);
  const topicHasPage = articles.some((item) => item.data.topic === data.topic);
  return {
    language,
    Content,
    previous: index > 0 ? siblings[index - 1] : undefined,
    next: index >= 0 ? siblings[index + 1] : undefined,
    topic,
    topicUrl: topic && topicHasPage ? topicRoute(topic, language) : `${ui[language].homeUrl}#caderno-title`,
    topicLabel: topic ? topicName(topic, language) : data.topicLabel,
    cover: await articleCover(data.cover),
    socialCover: socialCover(data.cover),
  };
}

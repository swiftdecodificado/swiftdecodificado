export const site = {
  name: 'Luan Rodrigues',
  brand: 'Swift Decodificado',
  origin: 'https://www.swiftdecodificado.com',
  author: 'Luan Rodrigues',
  avatar: '/brand/luan-rodrigues.jpg',
  /** Canais públicos, usados no rodapé e na página 404. */
  links: [
    { label: 'YouTube', href: 'https://www.youtube.com/@swiftdecodificado' },
    { label: 'GitHub', href: 'https://github.com/swiftdecodificado' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/luandsrodrigues/' },
  ],
};

export const languages = ['pt-BR', 'en'] as const;
export type Language = (typeof languages)[number];

export const ui = {
  'pt-BR': {
    skip: 'Pular para o conteúdo',
    home: 'Início',
    homeUrl: '/',
    about: 'Sobre',
    aboutUrl: '/sobre/',
    notebook: 'Caderno',
    navigation: 'Navegação principal',
    channels: 'Canais',
    latest: 'Publicações recentes',
    draftTitle: 'Artigo em preparação',
    draftBody: 'Este artigo ainda não está publicado.',
    tagsLabel: 'Tags do artigo',
    breadcrumb: 'Trilha de navegação',
    previous: 'Anterior',
    next: 'Próximo',
    read: 'Ler o texto',
    featured: 'Em destaque',
    notes: 'artigos',
    soon: 'Em breve',
    studying: 'Em andamento',
    review: 'Em revisão',
    done: 'Concluído',
    trail: 'Trilha',
    allTrails: '← Caderno',
    remaining: 'previstos a publicar',
    after: 'Depois de',
    nextTitle: 'O que vem a seguir',
    planned: 'previstos',
    notesOne: 'artigo',
    of: 'de',
    reviewed: 'revisado em',
    notFound: 'Esta página não está disponível.',
    articles: 'Artigos',
  },
  en: {
    skip: 'Skip to content',
    home: 'Home',
    homeUrl: '/en/',
    about: 'About',
    aboutUrl: '/en/about/',
    notebook: 'Notebook',
    navigation: 'Main navigation',
    channels: 'Channels',
    latest: 'Recent articles',
    draftTitle: 'Article in preparation',
    draftBody: 'This article is not published yet.',
    tagsLabel: 'Article tags',
    breadcrumb: 'Breadcrumb',
    previous: 'Previous',
    next: 'Next',
    read: 'Read the post',
    featured: 'Featured',
    notes: 'articles',
    soon: 'Coming soon',
    studying: 'In progress',
    review: 'In review',
    done: 'Done',
    trail: 'Track',
    allTrails: '← Notebook',
    remaining: 'planned to publish',
    after: 'After',
    nextTitle: 'What comes next',
    planned: 'planned',
    notesOne: 'article',
    of: 'of',
    reviewed: 'reviewed',
    notFound: 'This page could not be found.',
    articles: 'Articles',
  },
} satisfies Record<Language, Record<string, string>>;

export function languageOf(value: string | undefined): Language {
  return value === 'en' ? 'en' : 'pt-BR';
}

export function formatDate(value: Date | undefined, language: Language, fallback = ''): string {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(language === 'en' ? 'en-CA' : 'pt-BR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

/**
 * Rota publicada de um item de contents/. O português é o principal e fica em contents/ na raiz
 * (caderno/<slug> e privado/<slug> -> /artigos/<slug>/); o inglês, quando existir, fica em contents/en/
 * (en/notebook/<slug> -> /en/articles/<slug>/). Mudar as pastas não muda as URLs.
 */
export function routeOf(id: string): string {
  if (id.startsWith('en/')) return `/en/articles/${id.split('/').pop()}/`;
  if (id.startsWith('caderno/') || id.startsWith('privado/')) return `/artigos/${id.split('/').pop()}/`;
  return id === 'index' ? '/' : `/${id}/`;
}

export function articleUrl(article: { id: string }): string {
  return routeOf(article.id);
}

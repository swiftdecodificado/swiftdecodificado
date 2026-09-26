import { defineHastPlugin } from 'satteri';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ARTICLE_LINK = /^\/artigos\/([a-z0-9-]+)\/?(?:[#?].*)?$/;

/** Publicado = existe em contents/caderno/. Rascunhos (contents/privado/) e slugs desconhecidos não contam. */
const isPublished = (slug: string) =>
  existsSync(join(ROOT, 'contents/caderno', slug, 'index.md')) ||
  existsSync(join(ROOT, 'contents/caderno', slug, 'index.mdx'));

const warned = new Set<string>();

/**
 * No build de produção, um link para um artigo que ainda não foi publicado vira texto simples
 * (`<span class="unpublished-link">`), em vez de derrubar o build com um link morto. Quando o
 * artigo entra em contents/caderno/, o link volta sozinho. Cada caso é avisado no log.
 * No `astro dev` os links não mudam, para navegar entre rascunhos.
 */
export const unpublishedLinks = defineHastPlugin({
  name: 'unpublished-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      if (process.env.NODE_ENV !== 'production') return;
      const href = node.properties?.href;
      const slug = typeof href === 'string' ? ARTICLE_LINK.exec(href)?.[1] : undefined;
      if (!slug || isPublished(slug)) return;

      const where = ctx.fileURL ? fileURLToPath(ctx.fileURL).replace(ROOT, '') : 'artigo';
      if (!where.startsWith('contents/privado/') && !warned.has(`${where}:${slug}`)) {
        warned.add(`${where}:${slug}`);
        console.warn(`AVISO ${where}: link para "${slug}", que não está publicado; exibido sem link.`);
      }
      return {
        type: 'element',
        tagName: 'span',
        properties: { className: ['unpublished-link'] },
        children: node.children,
      } as any;
    },
  },
});

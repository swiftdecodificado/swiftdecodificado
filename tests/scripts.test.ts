import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createArticle } from '../scripts/new-article.mjs';
import { publishArticle, unpublishArticle } from '../scripts/publish-article.mjs';
import { checkSite } from '../src/integrations/check-site.mjs';

const write = (path: string, text: string) => {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, text);
};

describe('new-article', () => {
  it('scaffolds a draft with the next reading order, counting drafts', () => {
    const root = mkdtempSync(join(tmpdir(), 'site-'));
    write(join(root, 'src/config/topics.json'), '{"topics": [{"slug": "fundamentos"}]}');
    const first = createArticle({ lang: 'pt', slug: 'um', topic: 'fundamentos', title: 'Um "teste"', root });
    const second = createArticle({ lang: 'pt', slug: 'dois', topic: 'fundamentos', title: 'Dois', root });
    expect(readFileSync(first, 'utf8')).toContain('title: "Um \\"teste\\""');
    expect(readFileSync(second, 'utf8')).toContain('readingOrder: 2');
    expect(readFileSync(second, 'utf8')).toContain('draft: true');
    expect(() => createArticle({ lang: 'pt', slug: 'um', topic: 'fundamentos', title: 'Repetido', root })).toThrow(
      /já existe/,
    );
    expect(() => createArticle({ lang: 'pt', slug: 'tres', topic: 'inexistente', title: 'Três', root })).toThrow(
      /Assunto desconhecido/,
    );
  });

  it('records the translated slug', () => {
    const root = mkdtempSync(join(tmpdir(), 'site-'));
    write(join(root, 'src/config/topics.json'), '{"topics": [{"slug": "fundamentos"}]}');
    const target = createArticle({
      lang: 'en',
      slug: 'one',
      topic: 'fundamentos',
      title: 'One',
      translationOf: 'um',
      root,
    });
    expect(readFileSync(target, 'utf8')).toContain('translationOf: "um"');
    expect(target).toContain('/contents/en/privado/one/');
  });
});

describe('check-site', () => {
  const page = (route: string, body: string, head = '') =>
    `<!doctype html><html lang="pt-BR"><head>` +
    `<link rel="canonical" href="https://www.swiftdecodificado.com/${route}">${head}</head><body>${body}</body></html>`;

  it('accepts a consistent site and reports broken links and sitemap drift', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    write(join(dist, 'index.html'), page('', '<h1>Início</h1><a href="/ok/">ok</a>'));
    write(
      join(dist, 'ok/index.html'),
      page(
        'ok/',
        '<h1 id="a">Ok</h1><a href="/#nada">âncora</a><a href="/sumiu/">x</a>',
        '<meta property="og:type" content="article">',
      ),
    );
    write(join(dist, 'antigo/index.html'), '<!doctype html><meta http-equiv="refresh" content="0;url=/some/#x">');
    write(join(dist, 'vazio/index.html'), page('vazio/', '<h1>Vazio</h1><div class="prose article-body"></div>'));
    write(join(dist, 'sitemap.xml'), '<urlset><url><loc>https://www.swiftdecodificado.com/</loc></url></urlset>');
    const { errors } = checkSite(dist);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ok/index.html: missing /sumiu/'),
        expect.stringContaining('ok/index.html: missing anchor /#nada'),
        expect.stringContaining('antigo/index.html: missing /some/#x'),
        expect.stringContaining('vazio/index.html: artigo sem conteúdo'),
        'Sitemap does not match indexable pages',
      ]),
    );
  });
});

describe('publish and unpublish', () => {
  it('moves an article between privado/ and caderno/ and flips draft', () => {
    const root = mkdtempSync(join(tmpdir(), 'site-'));
    write(join(root, 'contents/privado/um/index.md'), '---\ntitle: "Um"\ndraft: true\n---\n');
    const published = publishArticle({ slug: 'um', root });
    expect(published).toContain('contents/caderno/um');
    expect(readFileSync(join(published, 'index.md'), 'utf8')).toContain('draft: false');
    expect(() => publishArticle({ slug: 'um', root })).toThrow(/não existe/);

    const back = unpublishArticle({ slug: 'um', root });
    expect(back).toContain('contents/privado/um');
    expect(readFileSync(join(back, 'index.md'), 'utf8')).toContain('draft: true');
  });

  it('adds draft: true when the front matter has none', () => {
    const root = mkdtempSync(join(tmpdir(), 'site-'));
    write(join(root, 'contents/caderno/dois/index.md'), '---\ntitle: "Dois"\n---\n');
    const target = unpublishArticle({ slug: 'dois', root });
    expect(readFileSync(join(target, 'index.md'), 'utf8')).toContain('draft: true');
  });

  it('refuses to publish an article that is not a draft', () => {
    const root = mkdtempSync(join(tmpdir(), 'site-'));
    write(join(root, 'contents/privado/tres/index.md'), '---\ntitle: "Três"\ndraft: false\n---\n');
    expect(() => publishArticle({ slug: 'tres', root })).toThrow(/draft: true/);
  });
});

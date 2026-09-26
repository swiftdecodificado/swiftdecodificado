import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';
import { callouts } from '../src/markdown/callouts';
import { highlightCode } from '../src/markdown/code';
import { headingIds } from '../src/markdown/headings';
import { mermaid } from '../src/markdown/mermaid';
import { unpublishedLinks } from '../src/markdown/unpublished-links';

const html = async (source: string, hastPlugins: any[]) => (await markdownToHtml(source, { hastPlugins })).html;

describe('callouts', () => {
  it('turns a labelled blockquote into an aside of that kind', async () => {
    for (const [label, kind] of [
      ['Nota', 'note'],
      ['Note', 'note'],
      ['Importante', 'important'],
      ['Important', 'important'],
      ['Atenção', 'warning'],
      ['Warning', 'warning'],
      ['Para executar', 'run'],
      ['To run', 'run'],
    ]) {
      const result = await html(`> **${label}**\n>\n> texto`, [callouts]);
      expect(result).toContain(`callout-${kind}`);
      expect(result).toContain(`<p class="callout-title">${label}</p>`);
      expect(result).not.toContain('<blockquote>');
    }
  });

  it('keeps a nested blockquote inside the aside', async () => {
    const result = await html('> **Nota**\n>\n> x\n>\n> > y\n>\n> z', [callouts]);
    expect(result.indexOf('<p>z</p>')).toBeLessThan(result.indexOf('</aside>'));
    expect(result.match(/<blockquote>/g)).toHaveLength(1);
    expect(result.match(/<\/blockquote>/g)).toHaveLength(1);
    expect(result.indexOf('<p>y</p>')).toBeLessThan(result.indexOf('</aside>'));
  });

  it('preserves an ordinary quotation', async () => {
    expect(await html('> citação', [callouts])).toContain('<blockquote>');
  });
});

describe('heading ids', () => {
  it('drops accents and numbers repeated headings', async () => {
    const result = await html('## Variáveis e constantes\n\n## Variáveis e constantes\n\n## O que é?', [headingIds]);
    expect(result).toContain('id="variaveis-e-constantes"');
    expect(result).toContain('id="variaveis-e-constantes-1"');
    expect(result).toContain('id="o-que-e"');
  });
});

describe('code highlighting', () => {
  it('colors Swift at build time and leaves unknown languages alone', async () => {
    const swift = await html('```swift\nlet a = 1\n```', [highlightCode]);
    expect(swift).toContain('hljs-keyword');
    expect(swift).toContain('data-highlighted="yes"');
    expect(await html('```mermaid-ish\nx\n```', [highlightCode])).not.toContain('hljs');
  });
});

describe('mermaid', () => {
  it('refuses a diagram without an accessible description', async () => {
    await expect(html('```mermaid\nflowchart LR\n  A --> B\n```', [mermaid])).rejects.toThrow(/accDescr/);
  });
});

describe('unpublished links', () => {
  // Um artigo qualquer de contents/caderno/ serve de "publicado"; o teste não depende de qual seja.
  const published = readdirSync('contents/caderno')[0];
  const source = `[ok](/artigos/${published}/) e [rascunho](/artigos/nao-existe-ainda/#x) e [fora](https://exemplo.com/artigos/x/)`;

  it('keeps links to published articles and unlinks unpublished ones in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const out = await html(source, [unpublishedLinks]);
      expect(out).toContain(`<a href="/artigos/${published}/">ok</a>`);
      expect(out).toContain('<span class="unpublished-link">rascunho</span>');
      expect(out).toContain('href="https://exemplo.com/artigos/x/"');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('leaves every link alone outside production', async () => {
    expect(await html(source, [unpublishedLinks])).toContain('<a href="/artigos/nao-existe-ainda/#x">');
  });
});

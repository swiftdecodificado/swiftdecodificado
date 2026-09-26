import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { callouts } from './src/markdown/callouts.ts';
import { highlightCode } from './src/markdown/code.ts';
import { headingIds } from './src/markdown/headings.ts';
import { mermaid } from './src/markdown/mermaid.ts';
import { unpublishedLinks } from './src/markdown/unpublished-links.ts';
import checkSite from './src/integrations/check-site.mjs';
import diagrams from './src/integrations/diagrams.mjs';

export default defineConfig({
  site: 'https://www.swiftdecodificado.com',
  outDir: './dist',
  // Em produção toda rota termina em barra. No dev, sem a barra o Astro mostra a própria página de aviso
  // em vez do 404 do site; 'ignore' deixa o 404 estilizado aparecer também nesse caso.
  trailingSlash: process.argv.includes('dev') ? 'ignore' : 'always',
  build: { format: 'directory' },
  markdown: {
    syntaxHighlight: false,
    processor: satteri({ hastPlugins: [callouts, headingIds, highlightCode, mermaid, unpublishedLinks] }),
  },
  integrations: [mdx(), diagrams(), checkSite()],
});

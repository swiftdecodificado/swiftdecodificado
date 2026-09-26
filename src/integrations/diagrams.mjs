import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIAGRAM_CACHE, DIAGRAM_URL } from '../markdown/mermaid.ts';

const htmlFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));

/** Publica os SVGs de diagrama gerados pelo plugin Mermaid (cache em .cache/mermaid). */
export default function diagrams() {
  return {
    name: 'diagrams',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(DIAGRAM_URL, (request, response, next) => {
          const file = join(DIAGRAM_CACHE, request.url.replace(/^\//, '').split('?')[0]);
          if (!existsSync(file)) return next();
          response.setHeader('Content-Type', 'image/svg+xml');
          response.end(readFileSync(file));
        });
      },
      'astro:build:done': ({ dir }) => {
        const out = fileURLToPath(dir);
        const names = new Set(
          htmlFiles(out).flatMap((file) =>
            [...readFileSync(file, 'utf8').matchAll(new RegExp(`${DIAGRAM_URL}([0-9a-f]+\\.svg)`, 'g'))].map(
              (match) => match[1],
            ),
          ),
        );
        mkdirSync(join(out, DIAGRAM_URL), { recursive: true });
        for (const name of names) copyFileSync(join(DIAGRAM_CACHE, name), join(out, DIAGRAM_URL, name));
        console.log(`Mermaid: ${names.size} diagramas estáticos.`);
      },
    },
  };
}

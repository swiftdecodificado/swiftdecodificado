import { defineHastPlugin, htmlToHast } from 'satteri';
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TOOLS = join(ROOT, 'src/markdown/diagrams');
// Junto do cache de conteúdo do Astro (node_modules/.astro): os dois sobrevivem ou somem juntos.
export const DIAGRAM_CACHE = join(ROOT, 'node_modules/.astro/mermaid');
export const DIAGRAM_URL = '/diagrams/generated/';

const read = (path: string) => readFileSync(path);
const version = (name: string) => JSON.parse(read(join(ROOT, 'node_modules', name, 'package.json')).toString()).version;
const FLOWCHART = /^\s*(?:flowchart|graph)\s+(?:TB|TD|BT|RL|LR)\b/m;

// Fluxogramas: um Chrome com o Excalidraw fica aberto durante todo o build e atende todos os diagramas.
let service: ChildProcessWithoutNullStreams | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (svg: string) => void; reject: (error: Error) => void }>();

function excalidraw() {
  if (service) return service;
  service = spawn('node', [join(TOOLS, 'excalidraw-service.mjs')], { cwd: ROOT });
  createInterface({ input: service.stdout }).on('line', (line) => {
    const { id, svg, error } = JSON.parse(line);
    const job = pending.get(id);
    pending.delete(id);
    if (error) job?.reject(new Error(error));
    else job?.resolve(svg);
  });
  service.stderr.on('data', (chunk) => process.stderr.write(chunk));
  service.on('exit', () => {
    service = undefined;
    for (const job of pending.values()) job.reject(new Error('O exportador Excalidraw terminou antes de responder.'));
    pending.clear();
  });
  process.on('exit', () => service?.kill());
  return service;
}

const renderFlowchart = (source: string) =>
  new Promise<string>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    excalidraw().stdin.write(`${JSON.stringify({ id, source })}\n`);
  });

// Os demais tipos usam o Mermaid CLI, um processo por diagrama.
let queue: Promise<unknown> = Promise.resolve();
const serialize = <T>(task: () => Promise<T>) => (queue = queue.then(task, task)) as Promise<T>;

async function exportSvg(source: string, target: string, where: string) {
  mkdirSync(DIAGRAM_CACHE, { recursive: true });
  try {
    if (FLOWCHART.test(source)) {
      writeFileSync(target, await renderFlowchart(source));
      return;
    }
    const temporary = mkdtempSync(join(tmpdir(), 'mermaid-'));
    try {
      const input = join(temporary, 'diagram.mmd');
      writeFileSync(input, source);
      await run(
        join(ROOT, 'node_modules/.bin/mmdc'),
        ['-i', input, '-o', target, '-c', join(TOOLS, 'mermaid-config.json'), '-b', 'white'],
        { cwd: ROOT },
      );
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  } catch (error: any) {
    throw new Error(`Mermaid em ${where}:\n${error.stdout ?? ''}\n${error.stderr ?? error.message}`, { cause: error });
  }
}

/** Troca cada bloco ```mermaid por um SVG estático, com `accDescr` como texto alternativo. */
export const mermaid = defineHastPlugin({
  name: 'static-mermaid',
  element: {
    filter: ['pre'],
    async visit(node, ctx) {
      const code = node.children?.find((child: any) => child.type === 'element' && child.tagName === 'code') as any;
      const classes: string[] = Array.isArray(code?.properties?.className) ? code.properties.className : [];
      if (!classes.includes('language-mermaid')) return;

      const source = ctx.textContent(code);
      const where = ctx.fileURL ? fileURLToPath(ctx.fileURL).replace(ROOT, '') : 'artigo';
      const description = source.match(/^\s*accDescr:\s*(.+)$/m)?.[1];
      if (!description) {
        throw new Error(
          `Mermaid em ${where}: adicione "accDescr: ..." ao diagrama para descrevê-lo a leitores de tela.`,
        );
      }

      const digest = createHash('sha256')
        .update(source)
        .update(read(join(TOOLS, 'mermaid-config.json')))
        .update(read(join(TOOLS, 'excalidraw-service.mjs')))
        .update(read(join(TOOLS, 'excalidraw-browser.js')))
        .update(
          ['@mermaid-js/mermaid-cli', '@excalidraw/excalidraw', '@excalidraw/mermaid-to-excalidraw']
            .map(version)
            .join(),
        )
        .digest('hex');
      const svg = join(DIAGRAM_CACHE, `${digest}.svg`);
      await serialize(async () => {
        if (!existsSync(svg)) await exportSvg(source, svg, where);
      });

      const [, , width, height] = readFileSync(svg, 'utf8')
        .match(/viewBox="([^"]+)"/)![1]
        .split(/\s+/)
        .map(Number);
      const alt = description.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const tree: any = htmlToHast(
        `<figure class="mermaid-diagram"><img src="${DIAGRAM_URL}${digest}.svg" alt="${alt}" width="${Math.round(width)}" height="${Math.round(height)}" loading="lazy"></figure>`,
        { fragment: true },
      );
      return tree.children[0];
    },
  },
});

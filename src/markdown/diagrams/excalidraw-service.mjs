// Serviço de build: converte fluxogramas Mermaid em SVG Excalidraw com fontes incorporadas.
// Um único Chrome fica aberto e atende vários diagramas. Protocolo: uma linha JSON por pedido em stdin
// ({ id, source }) e uma por resposta em stdout ({ id, svg } ou { id, error }). Nada disso é publicado.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const fonts = path.join(directory, '../../../node_modules/@excalidraw/excalidraw/dist/prod');

const bundle = await build({
  entryPoints: [path.join(directory, 'excalidraw-browser.js')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl' },
});

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end(
        '<!doctype html><script>window.EXCALIDRAW_ASSET_PATH="/"</script><script src="/render.js"></script>',
      );
    } else if (request.url === '/render.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(bundle.outputFiles[0].contents);
    } else if (/^\/fonts\/[a-zA-Z0-9_./-]+\.woff2$/.test(request.url) && !request.url.includes('..')) {
      response.setHeader('Content-Type', 'font/woff2');
      response.end(await readFile(path.join(fonts, request.url)));
    } else {
      response.writeHead(404).end();
    }
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
// Uma página nova por diagrama: reaproveitar a mesma muda as métricas de fonte e, com elas, a geometria.
async function renderIn(source) {
  const page = await browser.newPage();
  try {
    // A exportação precisa ser autossuficiente e funcionar sem CDN.
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().startsWith(`${origin}/`) || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    await page.goto(origin, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.renderDiagram === 'function');
    return await page.evaluate((text) => window.renderDiagram(text), source);
  } finally {
    await page.close();
  }
}

const shutdown = async () => {
  await browser.close();
  server.close();
  process.exit(0);
};

// Um pedido por vez.
let queue = Promise.resolve();
const lines = createInterface({ input: process.stdin });
lines.on('line', (line) => {
  queue = queue.then(async () => {
    const { id, source } = JSON.parse(line);
    try {
      const svg = await renderIn(source);
      process.stdout.write(`${JSON.stringify({ id, svg })}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ id, error: String(error?.message ?? error) })}\n`);
    }
  });
});
lines.on('close', () => queue.then(shutdown));

// Move um artigo entre contents/privado/ (rascunho) e contents/caderno/ (publicado).
// npm run publicar -- <slug> [--en]
// npm run despublicar -- <slug> [--en]
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = {
  pt: { draft: 'privado', published: 'caderno' },
  en: { draft: 'en/privado', published: 'en/notebook' },
};

function move({ slug, lang, from, to, draft, root }) {
  const source = join(root, 'contents', FOLDERS[lang][from], slug);
  const target = join(root, 'contents', FOLDERS[lang][to], slug);
  const file = join(source, 'index.md');
  if (!existsSync(file)) throw new Error(`contents/${FOLDERS[lang][from]}/${slug}/index.md não existe`);
  if (existsSync(target)) throw new Error(`contents/${FOLDERS[lang][to]}/${slug} já existe`);

  let text = readFileSync(file, 'utf8');
  const flag = /^draft:.*$/m;
  if (!draft && !/^draft:\s*true\s*$/m.test(text)) throw new Error(`${slug} não está com draft: true`);
  text = flag.test(text) ? text.replace(flag, `draft: ${draft}`) : text.replace(/^---\n/, `---\ndraft: ${draft}\n`);
  writeFileSync(file, text);

  mkdirSync(dirname(target), { recursive: true });
  renameSync(source, target);
  // O cache do conteúdo guarda os links dos outros artigos para este; limpar para eles serem refeitos.
  rmSync(join(root, 'node_modules/.astro/data-store.json'), { force: true });
  return target;
}

export const publishArticle = ({ slug, lang = 'pt', root = ROOT }) =>
  move({ slug, lang, from: 'draft', to: 'published', draft: false, root });

export const unpublishArticle = ({ slug, lang = 'pt', root = ROOT }) =>
  move({ slug, lang, from: 'published', to: 'draft', draft: true, root });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const undo = args.includes('--undo');
  const lang = args.includes('--en') ? 'en' : 'pt';
  const slug = args.find((arg) => !arg.startsWith('--'));
  try {
    const target = (undo ? unpublishArticle : publishArticle)({ slug, lang });
    console.log(target.replace(`${ROOT}/`, ''));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

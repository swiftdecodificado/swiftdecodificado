// Cria um rascunho em contents/privado/ (ou contents/en/privado/ para inglês).
// npm run new -- pt <slug> <assunto> "Título" [--translation-of <slug-pt>]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS = { pt: 'privado', en: 'en/privado' };
const PUBLISHED = { pt: 'caderno', en: 'en/notebook' };

function template({ title, topic, order, translationOf }) {
  const today = new Date().toLocaleDateString('sv');
  const translation = translationOf ? `translationOf: "${translationOf}"\n` : '';
  return `---
title: "${title.replaceAll('"', '\\"')}"
description: "Uma frase: o que o leitor entende ao terminar."
date: "${today}"
topic: "${topic}"
readingOrder: ${order}
draft: true
tags: []
# cover e coverAlt são obrigatórios para publicar (capas em src/config/covers.json, npm run covers)
# cover: "nome-da-capa.png"
# coverAlt: "Descrição da imagem"
${translation}---

Abertura: a dúvida ou o comportamento concreto que motiva o artigo.

## Primeiro passo
`;
}

// Próximo readingOrder do assunto, olhando rascunhos e publicados.
function nextOrder(root, lang, topic) {
  const sameTopic = new RegExp(`^topic:\\s*"?${topic}"?\\s*$`, 'm');
  let last = 0;
  for (const folder of [DRAFTS[lang], PUBLISHED[lang]]) {
    const base = join(root, 'contents', folder);
    if (!existsSync(base)) continue;
    for (const slug of readdirSync(base)) {
      const file = join(base, slug, 'index.md');
      if (!existsSync(file)) continue;
      const text = readFileSync(file, 'utf8');
      if (sameTopic.test(text)) last = Math.max(last, Number(text.match(/^readingOrder:\s*(\d+)/m)?.[1] ?? 0));
    }
  }
  return last + 1;
}

export function createArticle({ lang, slug, topic, title, translationOf = '', root = ROOT }) {
  const topics = JSON.parse(readFileSync(join(root, 'src/config/topics.json'), 'utf8')).topics.map((t) => t.slug);
  if (!DRAFTS[lang]) throw new Error(`Idioma inválido: ${lang} (use pt ou en)`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? '')) throw new Error(`Slug inválido: ${slug} (use minúsculas e hífens)`);
  if (!topics.includes(topic)) throw new Error(`Assunto desconhecido: ${topic}. Opções: ${topics.join(', ')}`);
  if (!title) throw new Error('Informe o título entre aspas');

  const target = join(root, 'contents', DRAFTS[lang], slug, 'index.md');
  if (existsSync(target) || existsSync(join(root, 'contents', PUBLISHED[lang], slug))) {
    throw new Error(`${slug} já existe`);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, template({ title, topic, order: nextOrder(root, lang, topic), translationOf }));
  return target;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--translation-of');
  const translationOf = flag >= 0 ? args.splice(flag, 2)[1] : undefined;
  const [lang, slug, topic, title] = args;
  try {
    console.log(createArticle({ lang, slug, topic, title, translationOf }).replace(`${ROOT}/`, ''));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

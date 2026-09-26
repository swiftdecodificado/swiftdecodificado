import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

const sources = import.meta.glob<{ default: ImageMetadata }>('../assets/covers/*.{png,jpg,jpeg,webp}', { eager: true });

/**
 * As capas são opcionais: um artigo sem `cover`, com arquivo ausente ou com uma imagem que não
 * pode ser processada segue sem imagem e a página mostra o fallback (components/shared/CoverFallback.astro).
 * Nenhuma função daqui lança; devolvem `undefined` quando não há imagem utilizável.
 */

/** A capa declarada no front matter (`/covers/x.png` ou `x.png`) como imagem otimizável. */
export function coverSource(cover?: string): ImageMetadata | undefined {
  const name = cover?.split('/').pop();
  if (!name) return undefined;
  return Object.entries(sources).find(([path]) => path.endsWith(`/${name}`))?.[1].default;
}

/** Capa do artigo: o próprio PNG (já tem 1200 px e poucos kB; recodificar só o deixaria maior). */
export async function articleCover(cover?: string) {
  const src = coverSource(cover);
  if (!src) return undefined;
  return { src: src.src, width: src.width, height: src.height };
}

/** Miniatura quadrada de 112 px para as linhas de listagem. */
export async function coverThumb(cover?: string) {
  const src = coverSource(cover);
  if (!src) return undefined;
  try {
    return (await getImage({ src, width: 112, height: 112, fit: 'cover', format: 'webp', quality: 80 })).src;
  } catch {
    return undefined;
  }
}

/** URL estável da capa original (og:image) em /covers/<arquivo>; sem capa, o layout usa /og-default.png. */
export const socialCover = (cover?: string) => (coverSource(cover) ? `/covers/${cover!.split('/').pop()}` : undefined);

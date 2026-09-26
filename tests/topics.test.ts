import { describe, expect, it } from 'vitest';
import {
  chapters,
  normalize,
  pageExists,
  pending,
  stateOf,
  topicRoute,
  topicStyle,
  type Topic,
} from '../src/lib/topics';

const topic = (extra: object = {}) =>
  ({
    slug: 'swiftui',
    pt: 'SwiftUI',
    en: 'SwiftUI',
    tile: 'indigo',
    sort: 'readingOrder',
    ...extra,
  }) as unknown as Topic;
const article = (title: string, order: number, language: 'pt-BR' | 'en' = 'pt-BR', slug = 'swiftui') => ({
  id: `${language}/${title}`,
  data: { title, topic: slug, language, readingOrder: order, date: new Date('2026-01-01') },
});

describe('topics', () => {
  it('routes a track and a notebook subject differently', () => {
    expect(topicRoute(topic({ trail: {} }), 'pt-BR')).toBe('/trilhas/swiftui/');
    expect(topicRoute(topic({ trail: {} }), 'en')).toBe('/en/trails/swiftui/');
    expect(topicRoute(topic({ slug: 'memoria' }), 'pt-BR')).toBe('/caderno/memoria/');
    expect(topicRoute(topic({ slug: 'memoria' }), 'en')).toBe('/en/notebook/memoria/');
  });

  it('derives the study state from the published count', () => {
    expect(stateOf({} as any, 0)).toBe('soon');
    expect(stateOf({ total: 3 } as any, 3)).toBe('done');
    expect(stateOf({ total: 3 } as any, 1)).toBe('studying');
    expect(stateOf({ total: 3, state: 'review' } as any, 1)).toBe('review');
    expect(stateOf({ state: 'review' } as any, 0)).toBe('soon');
  });

  it('lists chapters of one language in reading order', () => {
    const list = [article('b', 2), article('a', 1), article('c', 1, 'en'), article('d', 1, 'pt-BR', 'outro')];
    expect(chapters(list, 'swiftui', 'pt-BR').map(({ data }) => data.title)).toEqual(['a', 'b']);
  });

  it('retires a plan entry once its text is published', () => {
    const planned = topic({ trail: { next: ['Estado: quem guarda o valor?', 'Identidade em SwiftUI'] } });
    expect(pending(planned, [article('Estado — quem guarda o valor', 1)], 'pt-BR')).toEqual(['Identidade em SwiftUI']);
    expect(pending(planned, [], 'pt-BR')).toHaveLength(2);
    expect(pending(planned, [], 'en')).toEqual([]);
  });

  it('only has a page for a language with a published article', () => {
    expect(pageExists([], topic(), 'pt-BR')).toBe(false);
    expect(pageExists([article('a', 1)], topic(), 'pt-BR')).toBe(true);
    expect(pageExists([article('a', 1)], topic(), 'en')).toBe(false);
  });

  it('normalizes titles', () => {
    expect(normalize('Estado: quem guarda o valor?')).toBe('estado quem guarda o valor');
  });

  it('styles a topic with its tile and the default glyph', () => {
    expect(topicStyle(topic())).toMatch(/--tile: var\(--tile-indigo\); --glyph: url\("data:image\/svg\+xml,.*M4 8\.5/);
  });
});

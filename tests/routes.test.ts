import { describe, expect, it } from 'vitest';
import { routeOf } from '../src/config/site';

describe('routeOf', () => {
  it('maps content folders to the published routes', () => {
    expect(routeOf('caderno/arc-em-swift')).toBe('/artigos/arc-em-swift/');
    expect(routeOf('en/notebook/variables-in-swift')).toBe('/en/articles/variables-in-swift/');
    expect(routeOf('sobre')).toBe('/sobre/');
  });
});

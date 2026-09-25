import { describe, expect, it } from 'vitest';

import routes from '@/router/routes';

describe('content routes (SC-PACK-41)', () => {
  it('SC-PACK-41: /content/collection redirects to content-catalog', () => {
    const collection = routes.find(
      (r) => r.name === 'content-collection' || r.path === '/content/collection',
    );
    expect(collection).toBeTruthy();
    expect(collection!.redirect).toEqual({ name: 'content-catalog' });
    expect(collection!.component).toBeUndefined();
  });

  it('unified packs list route remains content-catalog at /content/packs', () => {
    const catalog = routes.find((r) => r.name === 'content-catalog');
    expect(catalog?.path).toBe('/content/packs');
  });
});

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { client } from '@/boot/colyseus';
import { useContentStore } from '@/stores/content';

describe('content favorites store (SC-PACK-154/155)', () => {
  let postSpy: MockInstance;

  beforeEach(() => {
    setActivePinia(createPinia());
    postSpy = vi.spyOn(client.http, 'post').mockReset();
    vi.spyOn(client.http, 'get').mockReset();
  });

  it('SC-PACK-154: starPack posts favorite and patches catalog/pack', async () => {
    const content = useContentStore();
    content.catalog = [
      {
        id: 'p1',
        title: 'P',
        description: '',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'u1',
        isFavorite: false,
      },
    ];
    content.pack = { ...content.catalog[0]! };

    postSpy.mockResolvedValue({
      data: { ok: true, packId: 'p1', isFavorite: true },
    });

    await content.starPack('p1');

    expect(postSpy).toHaveBeenCalledWith('/api/content/packs/p1/favorite', {
      body: {},
    });
    expect(content.catalog[0]?.isFavorite).toBe(true);
    expect(content.pack?.isFavorite).toBe(true);
  });

  it('SC-PACK-154: unstarPack posts unfavorite and clears flag', async () => {
    const content = useContentStore();
    content.catalog = [
      {
        id: 'p1',
        title: 'P',
        description: '',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'u1',
        isFavorite: true,
      },
    ];
    content.pack = { ...content.catalog[0]! };

    postSpy.mockResolvedValue({
      data: { ok: true, packId: 'p1', isFavorite: false },
    });

    await content.unstarPack('p1');

    expect(postSpy).toHaveBeenCalledWith('/api/content/packs/p1/unfavorite', {
      body: {},
    });
    expect(content.catalog[0]?.isFavorite).toBe(false);
    expect(content.pack?.isFavorite).toBe(false);
  });

  it('SC-PACK-155: starPack stores registered_user_required on reject', async () => {
    const content = useContentStore();
    postSpy.mockRejectedValue({
      data: { error: 'registered_user_required' },
      message: 'registered_user_required',
    });

    await expect(content.starPack('p1')).rejects.toBeTruthy();
    expect(content.error).toBe('registered_user_required');
  });
});

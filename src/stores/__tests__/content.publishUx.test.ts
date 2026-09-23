import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '@/boot/colyseus';
import { useContentStore } from '@/stores/content';

/* Vitest matchers take mocked http methods unbound from client.http. */
/* eslint-disable @typescript-eslint/unbound-method */

describe('content store publish UX (SC-PACK-85…91 wrappers)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(client.http.get).mockReset();
    vi.mocked(client.http.post).mockReset();
  });

  it('loadDraft sets draftStale from GET (SC-PACK-90)', async () => {
    vi.mocked(client.http.get).mockResolvedValueOnce({
      data: {
        pack: {
          id: 'p1',
          title: 'T',
          description: '',
          blocked: false,
          hasLive: true,
          createdBy: 'u1',
        },
        draft: {
          title: 'T',
          description: '',
          answerCards: [],
          taskSets: [],
        },
        answersDirty: false,
        tasksDirty: false,
        draftStale: true,
        answersModeration: {
          status: 'approved',
          requestId: null,
          changeAuthorId: null,
          isAuthor: false,
        },
        tasksModeration: {
          status: 'approved',
          requestId: null,
          changeAuthorId: null,
          isAuthor: false,
        },
      },
    } as never);

    const content = useContentStore();
    await content.loadDraft('p1');
    expect(content.draftStale).toBe(true);
    expect(client.http.get).toHaveBeenCalledWith('/api/content/packs/p1/draft');
  });

  it('unpublishPack POSTs and clears hasLive on collection row', async () => {
    const content = useContentStore();
    content.collection = [
      {
        id: 'p1',
        title: 'T',
        description: '',
        blocked: false,
        hasLive: true,
        createdBy: 'u1',
      },
    ];
    content.pack = content.collection[0]!;
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: { ok: true, packId: 'p1', lastLiveRevisionId: 'r1' },
    } as never);

    await content.unpublishPack('p1');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/packs/p1/unpublish');
    expect(content.collection[0]!.hasLive).toBe(false);
    expect(content.collection[0]!.unpublishedByStaff).toBe(true);
    expect(content.draftStale).toBe(false);
  });

  it('republishPack POSTs and restores hasLive', async () => {
    const content = useContentStore();
    content.collection = [
      {
        id: 'p1',
        title: 'T',
        description: '',
        blocked: false,
        hasLive: false,
        unpublishedByStaff: true,
        hasLastLive: true,
        createdBy: 'u1',
      },
    ];
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: { ok: true, packId: 'p1', liveRevisionId: 'r1' },
    } as never);

    await content.republishPack('p1');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/packs/p1/republish');
    expect(content.collection[0]!.hasLive).toBe(true);
    expect(content.collection[0]!.unpublishedByStaff).toBe(false);
  });

  it('unpublishLiveTaskSet POSTs task-set path', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: { ok: true, packId: 'p1', removedTaskSetId: 'ts2' },
    } as never);

    const content = useContentStore();
    await content.unpublishLiveTaskSet('p1', 'ts2');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/packs/p1/task-sets/ts2/unpublish');
  });

  it('rebaseDraft POSTs and refreshes draft + draftStale', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        pack: {
          id: 'p1',
          title: 'T',
          description: '',
          blocked: false,
          hasLive: true,
          createdBy: 'u1',
        },
        draft: {
          title: 'T',
          description: '',
          answerCards: [{ id: 'c1', content: 'A', description: '' }],
          taskSets: [],
        },
        answersDirty: true,
        draftStale: false,
      },
    } as never);

    const content = useContentStore();
    content.draftStale = true;
    await content.rebaseDraft('p1');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/packs/p1/draft/rebase');
    expect(content.draftStale).toBe(false);
    expect(content.draft?.answerCards).toHaveLength(1);
    expect(content.answersDirty).toBe(true);
  });
});

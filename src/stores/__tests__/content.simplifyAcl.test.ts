import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '@/boot/colyseus';
import { useContentStore } from '@/stores/content';

/* eslint-disable @typescript-eslint/unbound-method */

describe('content store simplify ACL (SC-PACK-100…114)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(client.http.get).mockReset();
    vi.mocked(client.http.post).mockReset();
  });

  it('SC-PACK-100: loadDraft loads working copy', async () => {
    vi.mocked(client.http.get).mockResolvedValueOnce({
      data: {
        pack: {
          id: 'p1',
          title: 'T',
          description: '',
          blocked: false,
          hasLive: false,
          createdBy: 'u1',
        },
        draft: {
          title: 'T',
          description: '',
          answerCards: [{ id: 'c1', content: 'A', description: '' }],
          taskSets: [],
        },
        pendingRequestId: null,
        isPendingAuthor: false,
        moderationStatus: null,
      },
    } as never);

    const content = useContentStore();
    await content.loadDraft('p1');
    expect(client.http.get).toHaveBeenCalledWith('/api/content/packs/p1/draft');
    expect(content.draft?.answerCards).toHaveLength(1);
    expect(content.pendingRequestId).toBeNull();
  });

  it('SC-PACK-102: submitPack POSTs unified submit', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        request: {
          id: 'r1',
          packId: 'p1',
          status: 'pending',
          changeAuthorId: 'u1',
          type: 'pack',
        },
      },
    } as never);

    const content = useContentStore();
    await content.submitPack('p1');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/packs/p1/submit');
    expect(content.pendingRequestId).toBe('r1');
    expect(content.isPendingAuthor).toBe(true);
  });

  it('SC-PACK-105: cancelRequest uses author path', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: { ok: true, requestId: 'r1', status: 'cancelled' },
    } as never);
    const content = useContentStore();
    content.pendingRequestId = 'r1';
    content.isPendingAuthor = true;
    content.moderationStatus = 'pending';

    await content.cancelRequest('r1');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/requests/r1/cancel');
    expect(content.pendingRequestId).toBeNull();
  });

  it('SC-PACK-108: submitAddTaskSet POSTs add-task-set/submit', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        request: {
          id: 'r2',
          packId: 'p1',
          status: 'pending',
          changeAuthorId: 'u1',
          type: 'task_set',
        },
      },
    } as never);

    const content = useContentStore();
    content.addTaskSet = {
      pack: {
        id: 'p1',
        title: 'T',
        description: '',
        blocked: false,
        hasLive: true,
        createdBy: 'u1',
      },
      liveCards: [],
      draft: { title: 'T', description: '', taskSets: [] },
      pendingRequestId: null,
      moderationStatus: null,
      foreignPending: false,
    };

    await content.submitAddTaskSet('p1', {
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          coauthorLabels: [],
          tasks: [],
        },
      ],
    });
    expect(client.http.post).toHaveBeenCalledWith(
      '/api/content/packs/p1/add-task-set/submit',
      expect.objectContaining({ body: expect.any(Object) }),
    );
    expect(content.addTaskSet?.pendingRequestId).toBe('r2');
  });

  it('SC-PACK-111/112: staffSavePack POSTs staff-save', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        ok: true,
        content: {
          title: 'T',
          description: '',
          answerCards: [],
          taskSets: [],
        },
        moderationRequestCreated: false,
        target: 'live',
      },
    } as never);

    const content = useContentStore();
    await content.staffSavePack('p1', {
      title: 'T',
      description: '',
      answerCards: [],
      taskSets: [],
    });
    expect(client.http.post).toHaveBeenCalledWith(
      '/api/content/packs/p1/staff-save',
      expect.objectContaining({ body: expect.any(Object) }),
    );
    expect(content.staffEditTarget).toBe('live');
  });

  it('SC-PACK-113: acquireEditLock POSTs edit-lock', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        ok: true,
        lock: { lockedBy: 's1', lockedAt: '2026-01-01', expiresAt: '2026-01-01' },
      },
    } as never);

    const content = useContentStore();
    await content.acquireEditLock('p1');
    expect(client.http.post).toHaveBeenCalledWith('/api/content/packs/p1/edit-lock');
    expect(content.editLock?.lockedBy).toBe('s1');
  });

  it('maps edit_locked error code', () => {
    const content = useContentStore();
    const err = { data: { error: 'edit_locked' } };
    // invoke via failed call path
    vi.mocked(client.http.post).mockRejectedValueOnce(err);
    return expect(content.acquireEditLock('p1'))
      .rejects.toBeTruthy()
      .then(() => {
        expect(content.error).toBe('edit_locked');
      });
  });
});

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '@/boot/colyseus';
import { useContentStore } from '@/stores/content';

/* eslint-disable @typescript-eslint/unbound-method */

const readyDraft = {
  title: 'Ready',
  description: '',
  answerCards: [
    { id: 'c1', content: 'A', description: '' },
    { id: 'c2', content: 'B', description: '' },
  ],
  taskSets: [
    {
      id: 'ts1',
      authorUserId: 'u1',
      coauthorLabels: [],
      tasks: [
        {
          id: 't1',
          question: 'Q1?',
          difficulty: 1 as const,
          slots: [{ id: 's1', answerCardId: 'c1' }],
        },
        {
          id: 't2',
          question: 'Q2?',
          difficulty: 1 as const,
          slots: [{ id: 's2', answerCardId: 'c2' }],
        },
      ],
    },
  ],
};

describe('content store draft lifecycle (SC-PACK-270/271/273/274)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(client.http.get).mockReset();
    vi.mocked(client.http.post).mockReset();
  });

  it('SC-PACK-270: saveDraft syncs hasUnsubmittedChanges and upserts author draft in catalog', async () => {
    const content = useContentStore();
    content.pack = {
      id: 'p1',
      title: 'Shell',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    };
    content.catalog = [];

    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        draft: { ...readyDraft, title: 'Activated' },
        pendingRequestId: null,
        moderationStatus: null,
        hasUnsubmittedChanges: true,
        canHardDelete: true,
      },
    } as never);

    await content.saveDraft('p1', { ...readyDraft, title: 'Activated' });
    expect(content.hasUnsubmittedChanges).toBe(true);
    expect(content.canHardDelete).toBe(true);
    expect(content.catalog).toEqual([
      expect.objectContaining({
        id: 'p1',
        moderationStatus: 'draft',
        openRequestType: 'pack',
        title: 'Activated',
      }),
    ]);
  });

  it('SC-PACK-271: loadDraft restores hasUnsubmittedChanges for Submit readiness', async () => {
    vi.mocked(client.http.get).mockResolvedValueOnce({
      data: {
        pack: {
          id: 'p1',
          title: 'Ready',
          description: '',
          blocked: false,
          hasLive: false,
          createdBy: 'u1',
        },
        draft: readyDraft,
        pendingRequestId: 'r-draft',
        isPendingAuthor: true,
        moderationStatus: 'draft',
        editorKind: 'creator',
        hasUnsubmittedChanges: true,
        canHardDelete: true,
      },
    } as never);

    const content = useContentStore();
    await content.loadDraft('p1');
    expect(content.hasUnsubmittedChanges).toBe(true);
    expect(content.moderationStatus).toBe('draft');
    expect(content.canHardDelete).toBe(true);
  });

  it('SC-PACK-273: saveDraft keeps needs_revision while setting dirty marker', async () => {
    const content = useContentStore();
    content.pack = {
      id: 'p1',
      title: 'Ready',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    };
    content.moderationStatus = 'needs_revision';
    content.pendingRequestId = 'r1';
    content.isPendingAuthor = true;
    content.catalog = [
      {
        id: 'p1',
        title: 'Ready',
        description: '',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        moderationStatus: 'needs_revision',
        openRequestType: 'pack',
      },
    ];

    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        draft: { ...readyDraft, title: 'Revised' },
        pendingRequestId: 'r1',
        moderationStatus: 'needs_revision',
        hasUnsubmittedChanges: true,
        canHardDelete: true,
      },
    } as never);

    await content.saveDraft('p1', { ...readyDraft, title: 'Revised' });
    expect(content.moderationStatus).toBe('needs_revision');
    expect(content.hasUnsubmittedChanges).toBe(true);
    expect(content.catalog[0]?.moderationStatus).toBe('needs_revision');
  });

  it('SC-PACK-274: loadDraft/canHardDelete and deleteUnpublishedPack clear catalog', async () => {
    vi.mocked(client.http.get).mockResolvedValueOnce({
      data: {
        pack: {
          id: 'p1',
          title: 'Pending pack',
          description: '',
          blocked: false,
          hasLive: false,
          createdBy: 'u1',
        },
        draft: readyDraft,
        pendingRequestId: 'r1',
        isPendingAuthor: true,
        moderationStatus: 'pending',
        editorKind: 'creator',
        hasUnsubmittedChanges: false,
        canHardDelete: true,
      },
    } as never);

    const content = useContentStore();
    await content.loadDraft('p1');
    expect(content.canHardDelete).toBe(true);

    content.catalog = [
      {
        id: 'p1',
        title: 'Pending pack',
        description: '',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        moderationStatus: 'pending',
      },
    ];
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: { ok: true, packId: 'p1' },
    } as never);

    await content.deleteUnpublishedPack('p1');
    expect(content.catalog).toEqual([]);
    expect(content.canHardDelete).toBe(false);
    expect(content.hasUnsubmittedChanges).toBe(false);
  });

  it('SC-PACK-271/submit: submitPack clears hasUnsubmittedChanges', async () => {
    const content = useContentStore();
    content.hasUnsubmittedChanges = true;
    content.pack = {
      id: 'p1',
      title: 'Ready',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    };
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

    await content.submitPack('p1');
    expect(content.hasUnsubmittedChanges).toBe(false);
    expect(content.moderationStatus).toBe('pending');
  });
});

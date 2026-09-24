import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '@/boot/colyseus';
import { SUPPORT_TOPICS, useSupportStore } from '@/stores/support';

/* eslint-disable @typescript-eslint/unbound-method */

describe('support store change_pack (SC-SUP-27…28)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(client.http.post).mockReset();
  });

  it('allowlist includes change_pack (SC-SUP-19)', () => {
    expect(SUPPORT_TOPICS).toContain('change_pack');
  });

  it('SC-SUP-27: createTicket sends packId for change_pack', async () => {
    vi.mocked(client.http.post).mockResolvedValueOnce({
      data: {
        ticket: {
          id: 't1',
          authorUserId: 'u1',
          topic: 'change_pack',
          status: 'under_review',
          packId: 'p1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        messages: [
          {
            id: 'm1',
            ticketId: 't1',
            authorUserId: 'u1',
            body: 'fix\n\nСсылка на набор: http://x/#/content/packs/p1',
            createdAt: new Date().toISOString(),
            authorKind: 'user',
          },
        ],
      },
    } as never);

    const support = useSupportStore();
    const ticket = await support.createTicket('change_pack', 'fix', { packId: 'p1' });
    expect(client.http.post).toHaveBeenCalledWith('/api/support/tickets', {
      body: { topic: 'change_pack', body: 'fix', packId: 'p1' },
    });
    expect(ticket.packId).toBe('p1');
    expect(support.messages[0]?.body).toContain('/#/content/packs/p1');
  });

  it('SC-SUP-28: createTicket without packId rejects client-side', async () => {
    const support = useSupportStore();
    await expect(support.createTicket('change_pack', 'no pack')).rejects.toBeTruthy();
    expect(client.http.post).not.toHaveBeenCalled();
    expect(support.error).toBe('pack_required');
  });
});

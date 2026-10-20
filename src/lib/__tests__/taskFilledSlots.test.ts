import { describe, expect, it } from 'vitest';

import { resolveTaskFilledSlots } from '@/lib/taskFilledSlots';

describe('resolveTaskFilledSlots (SC-PACK-127/278)', () => {
  const cards = [
    { id: 'a1', content: 'Paris', description: 'city' },
    { id: 'a2', content: 'Lyon', description: '' },
    { id: 'a3', content: '  ', description: 'blank content' },
  ];

  it('omits empty answerCardId and maps content + optional description', () => {
    const slots = [
      { answerCardId: 'a1' },
      { answerCardId: '' },
      { answerCardId: null },
      { answerCardId: 'a2' },
    ];
    expect(resolveTaskFilledSlots(slots, cards, 'filled')).toEqual([
      { content: 'Paris', description: 'city' },
      { content: 'Lyon' },
    ]);
  });

  it('uses fallback when card missing or content blank', () => {
    expect(
      resolveTaskFilledSlots(
        [{ answerCardId: 'missing' }, { answerCardId: 'a3' }],
        cards,
        'filled',
      ),
    ).toEqual([{ content: 'filled' }, { content: 'filled', description: 'blank content' }]);
  });
});

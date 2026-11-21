/**
 * soloEndModalKind retired with knowledge economy (SC-PRESENCE-19…21/35 removed).
 * Keep a thin file so imports of the helper (if any) stay testable; infer always unused.
 */
import { describe, expect, it } from 'vitest';

import { hasOwnUnfinishedOnLiveTask, inferSoloEndModalKind } from '@/lib/soloEndModalKind';

describe('soloEndModalKind (retired — SC-PRESENCE-19…21/35)', () => {
  it('inferSoloEndModalKind remains timer-only stub (unused by GamePage)', () => {
    expect(inferSoloEndModalKind()).toBe('timer');
  });

  it('hasOwnUnfinishedOnLiveTask still filters trapped/finished', () => {
    expect(
      hasOwnUnfinishedOnLiveTask(
        [
          { finished: false, trapped: false, row: 1, col: 1 },
          { finished: true, trapped: false, row: 2, col: 2 },
          { finished: false, trapped: true, row: 3, col: 3 },
        ],
        (row, col) => row === 1 && col === 1,
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import {
  hasOwnUnfinishedOnLiveTask,
  inferSoloEndModalKind,
  type SoloEndPiece,
} from '@/lib/soloEndModalKind';

/** Present-task predicate: only (2,2) is a live `*`. */
const liveTaskAt22 = (row: number, col: number): boolean => row === 2 && col === 2;

const freeOnLive: SoloEndPiece = {
  finished: false,
  trapped: false,
  row: 2,
  col: 2,
};
const trappedOnLive: SoloEndPiece = {
  finished: false,
  trapped: true,
  row: 2,
  col: 2,
};
const freeOnStart: SoloEndPiece = {
  finished: false,
  trapped: false,
  row: 0,
  col: 0,
};
const finishedOnLive: SoloEndPiece = {
  finished: true,
  trapped: false,
  row: 2,
  col: 2,
};

describe('soloEndModalKind (SC-PRESENCE-21/35)', () => {
  describe('hasOwnUnfinishedOnLiveTask', () => {
    it('is true for free unfinished on live task', () => {
      expect(hasOwnUnfinishedOnLiveTask([freeOnLive], liveTaskAt22)).toBe(true);
    });

    it('is false when only trapped on live task', () => {
      expect(hasOwnUnfinishedOnLiveTask([trappedOnLive], liveTaskAt22)).toBe(false);
    });

    it('is false for start/path remainder', () => {
      expect(hasOwnUnfinishedOnLiveTask([freeOnStart], liveTaskAt22)).toBe(false);
    });

    it('is false for finished pieces on live task', () => {
      expect(hasOwnUnfinishedOnLiveTask([finishedOnLive], liveTaskAt22)).toBe(false);
    });
  });

  describe('inferSoloEndModalKind — timer-only', () => {
    it('SC-PRESENCE-21: one-minute deadline → timer copy (never steps-exhausted)', () => {
      expect(inferSoloEndModalKind()).toBe('timer');
    });

    it('SC-PRESENCE-35: trapped/start remainder under ∞ steps → still timer (no steps-exhausted)', () => {
      // Pieces/steps no longer affect kind; assert helper still classifies remainder
      // and end modal stays timer-only.
      expect(hasOwnUnfinishedOnLiveTask([trappedOnLive, freeOnStart], liveTaskAt22)).toBe(false);
      expect(inferSoloEndModalKind()).toBe('timer');
    });
  });
});

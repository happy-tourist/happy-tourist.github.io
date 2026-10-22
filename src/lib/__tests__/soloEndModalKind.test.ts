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

    it('is false when only trapped on live task (SC-PRESENCE-35)', () => {
      expect(hasOwnUnfinishedOnLiveTask([trappedOnLive], liveTaskAt22)).toBe(false);
    });

    it('is false for start/path remainder', () => {
      expect(hasOwnUnfinishedOnLiveTask([freeOnStart], liveTaskAt22)).toBe(false);
    });

    it('is false for finished pieces on live task', () => {
      expect(hasOwnUnfinishedOnLiveTask([finishedOnLive], liveTaskAt22)).toBe(false);
    });
  });

  describe('inferSoloEndModalKind', () => {
    it('SC-PRESENCE-35: steps=0 + only trapped/start → steps', () => {
      expect(inferSoloEndModalKind([trappedOnLive, freeOnStart], 0, liveTaskAt22)).toBe('steps');
    });

    it('SC-PRESENCE-35: steps=0 + only start remainder → steps', () => {
      expect(inferSoloEndModalKind([freeOnStart], 0, liveTaskAt22)).toBe('steps');
    });

    it('SC-PRESENCE-21 regression: steps=0 + free unfinished on live * → timer', () => {
      expect(inferSoloEndModalKind([freeOnLive], 0, liveTaskAt22)).toBe('timer');
    });

    it('steps>0 → timer even without live task', () => {
      expect(inferSoloEndModalKind([freeOnStart], 3, liveTaskAt22)).toBe('timer');
    });
  });
});

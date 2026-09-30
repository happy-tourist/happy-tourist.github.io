import { afterEach, describe, expect, it } from 'vitest';

import {
  clearAllPackSubmitBaselines,
  clearPackSubmitBaseline,
  ensurePackSubmitBaseline,
  fingerprintEditorContent,
  getPackSubmitBaseline,
  isEditorContentDirty,
  setPackSubmitBaseline,
  stableStringify,
} from '@/lib/editorDirty';

describe('editorDirty (SC-PACK-234 / SC-MAP-65)', () => {
  afterEach(() => {
    clearAllPackSubmitBaselines();
  });

  it('stableStringify sorts object keys', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  it('fingerprint ignores volatile metadata', () => {
    const a = {
      revisionId: 'r1',
      title: 'T',
      description: '',
      answerCards: [{ id: 'c1', content: 'A', description: '', position: 0 }],
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          authorDisplayName: 'Alice',
          moderationStatus: 'draft',
          neverLive: false,
          coauthorLabels: [],
          tasks: [],
        },
      ],
    };
    const b = {
      revisionId: 'r2',
      title: 'T',
      description: '',
      answerCards: [{ id: 'c1', content: 'A', description: '', position: 9 }],
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          authorDisplayName: 'Bob',
          moderationStatus: 'pending',
          neverLive: true,
          coauthorLabels: [],
          tasks: [],
        },
      ],
    };
    expect(fingerprintEditorContent(a)).toBe(fingerprintEditorContent(b));
  });

  it('isEditorContentDirty detects semantic edits', () => {
    const base = { title: 'T', description: '', answerCards: [], taskSets: [] };
    const fp = fingerprintEditorContent(base);
    expect(isEditorContentDirty(base, fp)).toBe(false);
    expect(isEditorContentDirty({ ...base, title: 'T2' }, fp)).toBe(true);
    expect(isEditorContentDirty(null, fp)).toBe(false);
  });

  it('pack session baseline ensure / set / clear', () => {
    const body = { title: 'T', description: '', answerCards: [], taskSets: [] };
    expect(getPackSubmitBaseline('p1')).toBeNull();
    const first = ensurePackSubmitBaseline('p1', body);
    expect(getPackSubmitBaseline('p1')).toBe(first);
    // Second ensure keeps original session baseline (cards↔tasks).
    ensurePackSubmitBaseline('p1', { ...body, title: 'Changed' });
    expect(getPackSubmitBaseline('p1')).toBe(first);
    const refreshed = setPackSubmitBaseline('p1', { ...body, title: 'Changed' });
    expect(getPackSubmitBaseline('p1')).toBe(refreshed);
    expect(refreshed).not.toBe(first);
    clearPackSubmitBaseline('p1');
    expect(getPackSubmitBaseline('p1')).toBeNull();
  });
});

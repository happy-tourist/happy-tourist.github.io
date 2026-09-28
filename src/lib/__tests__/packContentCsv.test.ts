import { describe, expect, it } from 'vitest';
import {
  collectMissingSlotTexts,
  parseAnswers,
  parseTasks,
  resolveSlots,
  sanitizePackCsvFilename,
  serializeAnswers,
  serializeTasks,
} from '@/lib/packContentCsv';

describe('packContentCsv', () => {
  describe('sanitizePackCsvFilename (SC-PACK-210 / D9)', () => {
    it('sanitizes title for download basename', () => {
      expect(sanitizePackCsvFilename('  My Pack / v2  ')).toBe('My_Pack_v2');
      expect(sanitizePackCsvFilename('a:b*c?.csv')).toBe('a_b_c_.csv');
      expect(sanitizePackCsvFilename('   ')).toBe('pack');
      expect(sanitizePackCsvFilename('')).toBe('pack');
    });
  });

  describe('answers (SC-PACK-210/211)', () => {
    it('serializes content and description paragraphs with semicolons', () => {
      const csv = serializeAnswers([
        { content: 'Paris', description: 'Capital\nof France' },
        { content: 'Solo', description: '' },
      ]);
      expect(csv).toBe('Paris;Capital;of France\nSolo');
    });

    it('parses answers into append-ready rows with description via newlines', () => {
      const rows = parseAnswers('Paris;Capital;of France\n  Rome  ;  City  \nOnly');
      expect(rows).toEqual([
        { content: 'Paris', description: 'Capital\nof France' },
        { content: 'Rome', description: 'City' },
        { content: 'Only', description: '' },
      ]);
    });

    it('round-trips answers', () => {
      const cards = [
        { content: 'A', description: 'p1\np2' },
        { content: 'B', description: '' },
      ];
      expect(parseAnswers(serializeAnswers(cards))).toEqual(cards);
    });

    it('skips blank lines and keeps empty description fields empty', () => {
      expect(parseAnswers('\n\nX;\n\n')).toEqual([{ content: 'X', description: '' }]);
    });
  });

  describe('tasks (SC-PACK-213/214)', () => {
    const cards = [
      { id: 'c1', content: 'Paris' },
      { id: 'c2', content: 'Rome' },
      { id: 'c3', content: 'Paris' },
    ];

    it('serializes slots as referenced card content; empty slot → empty field', () => {
      const csv = serializeTasks(
        [
          {
            question: 'Capital?',
            difficulty: 2,
            slots: [
              { id: 's1', answerCardId: 'c1' },
              { id: 's2', answerCardId: null },
              { id: 's3', answerCardId: 'c2' },
            ],
          },
        ],
        cards,
      );
      expect(csv).toBe('Capital?;2;Paris;;Rome');
    });

    it('parses tasks with difficulty default 1 for empty/invalid', () => {
      const rows = parseTasks(
        ['Q1;2;Paris;Rome', 'Q2;;Paris', 'Q3;9;Rome', 'Q4', 'Q5;'].join('\n'),
      );
      expect(rows).toEqual([
        { question: 'Q1', difficulty: 2, slotTexts: ['Paris', 'Rome'] },
        { question: 'Q2', difficulty: 1, slotTexts: ['Paris'] },
        { question: 'Q3', difficulty: 1, slotTexts: ['Rome'] },
        { question: 'Q4', difficulty: 1, slotTexts: [] },
        { question: 'Q5', difficulty: 1, slotTexts: [] },
      ]);
    });

    it('allows empty question and empty slot columns (D7)', () => {
      expect(parseTasks(';1;\n;2;;')).toEqual([
        { question: '', difficulty: 1, slotTexts: [''] },
        { question: '', difficulty: 2, slotTexts: ['', ''] },
      ]);
    });

    it('round-trips tasks when slots resolve', () => {
      const tasks = [
        {
          question: 'Where?',
          difficulty: 3 as const,
          slots: [
            { id: 's1', answerCardId: 'c1' },
            { id: 's2', answerCardId: 'c2' },
          ],
        },
      ];
      const csv = serializeTasks(tasks, cards);
      const parsed = parseTasks(csv);
      expect(parsed).toEqual([{ question: 'Where?', difficulty: 3, slotTexts: ['Paris', 'Rome'] }]);
      const resolved = resolveSlots(parsed[0]!.slotTexts, cards);
      expect(resolved).toEqual({ ok: true, answerCardIds: ['c1', 'c2'] });
    });

    it('trims cells after split', () => {
      expect(parseTasks('  Q  ;  3  ;  Paris  ')).toEqual([
        { question: 'Q', difficulty: 3, slotTexts: ['Paris'] },
      ]);
    });
  });

  describe('resolveSlots / missing answers (SC-PACK-215/218)', () => {
    const cards = [
      { id: 'c1', content: 'Paris' },
      { id: 'c2', content: 'Rome' },
      { id: 'c3', content: 'Paris' },
    ];

    it('uses first exact content match for duplicate answers', () => {
      expect(resolveSlots(['Paris'], cards)).toEqual({
        ok: true,
        answerCardIds: ['c1'],
      });
    });

    it('maps empty slot text to null without failing', () => {
      expect(resolveSlots(['Paris', '', 'Rome'], cards)).toEqual({
        ok: true,
        answerCardIds: ['c1', null, 'c2'],
      });
    });

    it('fails with missing texts list for whole-file reject', () => {
      const rows = parseTasks('Q1;1;Paris;Berlin\nQ2;2;Madrid;Rome');
      const missing = collectMissingSlotTexts(rows, cards);
      expect(missing.sort()).toEqual(['Berlin', 'Madrid']);

      const one = resolveSlots(['Berlin', 'Paris'], cards);
      expect(one).toEqual({ ok: false, missingTexts: ['Berlin'] });
    });

    it('does not treat empty slot as missing', () => {
      expect(collectMissingSlotTexts(parseTasks('Q;1;'), cards)).toEqual([]);
    });
  });
});

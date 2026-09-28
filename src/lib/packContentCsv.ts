/**
 * Semicolon CSV for pack answer cards and tasks (D1–D7 / SC-PACK-210…218).
 * Dialect: `line.split(';')` with no quoting/escaping; trim each cell after split.
 */

import type { AnswerCard, ContentTask, Difficulty } from '@/stores/content';

/** Sanitize pack title for a CSV download basename (no extension). D9 / SC-PACK-210. */
export function sanitizePackCsvFilename(title: string): string {
  const cleaned = [...title.trim()]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 32 || '<>:"/\\|?*'.includes(ch) || /\s/.test(ch)) return '_';
      return ch;
    })
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'pack';
}

/** Trigger a browser download of UTF-8 CSV text (answers/tasks export). */
export function downloadCsvText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ParsedAnswerRow = {
  content: string;
  description: string;
};

export type ParsedTaskRow = {
  question: string;
  difficulty: Difficulty;
  slotTexts: string[];
};

export type ResolveSlotsOk = {
  ok: true;
  answerCardIds: (string | null)[];
};

export type ResolveSlotsFail = {
  ok: false;
  missingTexts: string[];
};

export type ResolveSlotsResult = ResolveSlotsOk | ResolveSlotsFail;

type AnswerContentRef = Pick<AnswerCard, 'id' | 'content'>;
type TaskSerializeInput = Pick<ContentTask, 'question' | 'difficulty' | 'slots'>;

function nonEmptyLines(csv: string): string[] {
  return csv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function splitCells(line: string): string[] {
  return line.split(';').map((cell) => cell.trim());
}

function parseDifficulty(raw: string | undefined): Difficulty {
  if (raw === '1' || raw === '2' || raw === '3') {
    return Number(raw) as Difficulty;
  }
  return 1;
}

/** Export answers: `content;paragraph1;paragraph2;…` (description split on `\n`). */
export function serializeAnswers(
  cards: ReadonlyArray<Pick<AnswerCard, 'content' | 'description'>>,
): string {
  return cards
    .map((card) => {
      const parts = [card.content];
      if (card.description) {
        parts.push(...card.description.split('\n'));
      }
      return parts.join(';');
    })
    .join('\n');
}

/** Parse answers CSV into append-ready rows (no ids). Skips blank lines. */
export function parseAnswers(csv: string): ParsedAnswerRow[] {
  return nonEmptyLines(csv).map((line) => {
    const cells = splitCells(line);
    const content = cells[0] ?? '';
    const paragraphs = cells.slice(1);
    const description = paragraphs.length ? paragraphs.join('\n') : '';
    return { content, description };
  });
}

/**
 * Export tasks: `question;difficulty;slotContent1;slotContent2;…`.
 * Filled slots → referenced card content; empty / unknown id → empty field.
 */
export function serializeTasks(
  tasks: ReadonlyArray<TaskSerializeInput>,
  answerCards: ReadonlyArray<AnswerContentRef>,
): string {
  const byId = new Map(answerCards.map((c) => [c.id, c.content]));
  return tasks
    .map((task) => {
      const slotFields = task.slots.map((slot) => {
        if (!slot.answerCardId) return '';
        return byId.get(slot.answerCardId) ?? '';
      });
      return [task.question, String(task.difficulty), ...slotFields].join(';');
    })
    .join('\n');
}

/**
 * Parse tasks CSV into append-ready rows (slot texts, not ids).
 * Empty/invalid difficulty → `1`. Empty question/slot columns are kept (D7).
 */
export function parseTasks(csv: string): ParsedTaskRow[] {
  return nonEmptyLines(csv).map((line) => {
    const cells = splitCells(line);
    const question = cells[0] ?? '';
    const difficulty = parseDifficulty(cells[1]);
    const slotTexts = cells.slice(2);
    return { question, difficulty, slotTexts };
  });
}

/**
 * Resolve slot texts to answer card ids by first exact `content` match (D5).
 * Empty slot text → `null` (allowed). Non-empty missing texts → fail with list (D7).
 */
export function resolveSlots(
  slotTexts: ReadonlyArray<string>,
  answerCards: ReadonlyArray<AnswerContentRef>,
): ResolveSlotsResult {
  const answerCardIds: (string | null)[] = [];
  const missing = new Set<string>();

  for (const text of slotTexts) {
    if (text === '') {
      answerCardIds.push(null);
      continue;
    }
    const card = answerCards.find((c) => c.content === text);
    if (!card) {
      missing.add(text);
      answerCardIds.push(null);
    } else {
      answerCardIds.push(card.id);
    }
  }

  if (missing.size > 0) {
    return { ok: false, missingTexts: [...missing] };
  }
  return { ok: true, answerCardIds };
}

/**
 * Whole-file missing-answer scan for task import (SC-PACK-215/218).
 * Collects unique non-empty slot texts with no exact content match.
 */
export function collectMissingSlotTexts(
  rows: ReadonlyArray<ParsedTaskRow>,
  answerCards: ReadonlyArray<AnswerContentRef>,
): string[] {
  const contents = new Set(answerCards.map((c) => c.content));
  const missing = new Set<string>();
  for (const row of rows) {
    for (const text of row.slotTexts) {
      if (text !== '' && !contents.has(text)) {
        missing.add(text);
      }
    }
  }
  return [...missing];
}

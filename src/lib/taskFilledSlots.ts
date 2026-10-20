/** Filled-only slot payload for `PackTaskTile` (SC-PACK-127/278). */
export type TaskFilledSlot = {
  content: string;
  description?: string;
};

type AnswerCardLike = {
  id: string;
  content?: string;
  description?: string;
};

type TaskSlotLike = {
  answerCardId?: string | null;
};

/**
 * Resolve filled answer slots for list tiles: omit empty `answerCardId`;
 * primary = card content (or fallback); optional description secondary.
 */
export function resolveTaskFilledSlots(
  slots: TaskSlotLike[],
  answerCards: AnswerCardLike[],
  fallbackFilledLabel: string,
): TaskFilledSlot[] {
  return slots
    .filter((slot) => Boolean(slot.answerCardId))
    .map((slot) => {
      const card = answerCards.find((c) => c.id === slot.answerCardId);
      if (card) {
        const content = card.content?.trim() || fallbackFilledLabel;
        const description = card.description?.trim() || undefined;
        return description ? { content, description } : { content };
      }
      return { content: fallbackFilledLabel };
    });
}

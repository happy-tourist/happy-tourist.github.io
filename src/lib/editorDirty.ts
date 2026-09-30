/**
 * D3 / SC-PACK-234 / SC-MAP-65: semantic fingerprint for author Submit dirty gate.
 * Stable JSON (sorted keys); strips volatile metadata that quiet-save may echo.
 */

const PACK_BASELINES = new Map<string, string>();

const VOLATILE_KEYS = new Set([
  'revisionId',
  'packId',
  'position',
  'moderationStatus',
  'neverLive',
  'authorDisplayName',
  'createdAt',
  'updatedAt',
]);

function stripVolatile(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripVolatile);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (VOLATILE_KEYS.has(k)) continue;
    out[k] = stripVolatile(v);
  }
  return out;
}

/** Deterministic JSON for semantic compare (sorted object keys). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** Fingerprint of editor working content (pack / task set / map revision). */
export function fingerprintEditorContent(value: unknown): string {
  return stableStringify(stripVolatile(value));
}

export function isEditorContentDirty(local: unknown, baseline: string | null | undefined): boolean {
  if (local == null || baseline == null || baseline === '') return false;
  return fingerprintEditorContent(local) !== baseline;
}

/** Session baseline for pack Edit (survives cards↔tasks; cleared on leave). */
export function getPackSubmitBaseline(packId: string): string | null {
  return PACK_BASELINES.get(packId) ?? null;
}

/** Capture baseline once per pack edit session. */
export function ensurePackSubmitBaseline(packId: string, content: unknown): string {
  const existing = PACK_BASELINES.get(packId);
  if (existing != null) return existing;
  const fp = fingerprintEditorContent(content);
  PACK_BASELINES.set(packId, fp);
  return fp;
}

/** Refresh after successful submit/reload. */
export function setPackSubmitBaseline(packId: string, content: unknown): string {
  const fp = fingerprintEditorContent(content);
  PACK_BASELINES.set(packId, fp);
  return fp;
}

export function clearPackSubmitBaseline(packId: string): void {
  PACK_BASELINES.delete(packId);
}

/** Test helper: wipe all pack session baselines. */
export function clearAllPackSubmitBaselines(): void {
  PACK_BASELINES.clear();
}

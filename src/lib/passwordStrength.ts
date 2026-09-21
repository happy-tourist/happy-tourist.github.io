/**
 * Lazy zxcvbn-ts strength estimate (D7). Advisory only — never gates Submit.
 */
import type { ZxcvbnFactory, ZxcvbnResult } from '@zxcvbn-ts/core';

let factoryPromise: Promise<ZxcvbnFactory> | null = null;

async function getFactory(): Promise<ZxcvbnFactory> {
  if (!factoryPromise) {
    factoryPromise = (async () => {
      const [{ ZxcvbnFactory: Factory }, common, ru] = await Promise.all([
        import('@zxcvbn-ts/core'),
        import('@zxcvbn-ts/language-common'),
        import('@zxcvbn-ts/language-ru'),
      ]);
      return new Factory({
        dictionary: {
          ...common.dictionary,
          ...ru.dictionary,
        },
        graphs: common.adjacencyGraphs,
        translations: ru.translations,
      });
    })();
  }
  return factoryPromise;
}

/** Score 0–4 from zxcvbn; empty password → 0. */
export async function estimatePasswordStrength(
  password: string,
  userInputs: (string | number)[] = [],
): Promise<Pick<ZxcvbnResult, 'score'>> {
  if (!password) {
    return { score: 0 };
  }
  const zxcvbn = await getFactory();
  const result = zxcvbn.check(password, userInputs);
  return { score: result.score };
}

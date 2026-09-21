/**
 * Client mirror of server password policy (D6 / SC-AUTH-08 / SC-RESET-09).
 * Submit gates use these checks only — zxcvbn score is advisory.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordPolicyChecks {
  minLength: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
}

export function passwordPolicyChecks(password: string): PasswordPolicyChecks {
  const value = typeof password === 'string' ? password : '';
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
}

export function meetsPasswordPolicy(password: string): boolean {
  const c = passwordPolicyChecks(password);
  return c.minLength && c.lower && c.upper && c.digit && c.symbol;
}

/** Quasar q-input rule: true | error message. */
export function passwordPolicyRule(password: string, failMessage: string): true | string {
  return meetsPasswordPolicy(password) || failMessage;
}

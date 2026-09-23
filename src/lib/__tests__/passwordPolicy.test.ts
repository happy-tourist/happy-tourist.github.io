import { describe, expect, it } from 'vitest';
import { meetsPasswordPolicy, passwordPolicyRule } from '@/lib/passwordPolicy';

describe('passwordPolicy', () => {
  it.each`
    password       | ok
    ${'short'}     | ${false}
    ${'Abcd1234!'} | ${true}
  `('$password → meets=$ok', ({ password, ok }: { password: string; ok: boolean }) => {
    expect(meetsPasswordPolicy(password)).toBe(ok);
  });

  it('passwordPolicyRule returns true or fail message', () => {
    expect(passwordPolicyRule('Abcd1234!', 'fail')).toBe(true);
    expect(passwordPolicyRule('short', 'fail')).toBe('fail');
  });
});

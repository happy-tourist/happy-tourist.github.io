<template>
  <div class="password-strength q-mt-sm">
    <div class="password-strength__bar row q-col-gutter-xs q-mb-sm">
      <div v-for="i in 4" :key="i" class="col">
        <div class="password-strength__segment" :class="segmentClass(i - 1)" />
      </div>
    </div>
    <div class="text-caption text-muted q-mb-xs">
      {{ $t('auth.passwordStrengthLabel') }}:
      {{ $t(`auth.passwordStrength.${strengthKey}`) }}
    </div>
    <ul class="password-strength__checklist q-ma-none q-pl-md text-caption">
      <li :class="checkClass(checks.minLength)">
        {{ $t('auth.passwordRuleMin') }}
      </li>
      <li :class="checkClass(checks.lower)">
        {{ $t('auth.passwordRuleLower') }}
      </li>
      <li :class="checkClass(checks.upper)">
        {{ $t('auth.passwordRuleUpper') }}
      </li>
      <li :class="checkClass(checks.digit)">
        {{ $t('auth.passwordRuleDigit') }}
      </li>
      <li :class="checkClass(checks.symbol)">
        {{ $t('auth.passwordRuleSymbol') }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { passwordPolicyChecks, type PasswordPolicyChecks } from '@/lib/passwordPolicy';
import { estimatePasswordStrength } from '@/lib/passwordStrength';

const props = defineProps<{
  password: string;
  /** Optional user inputs (email, name) so zxcvbn penalizes them. */
  userInputs?: (string | number)[];
}>();

const score = ref(0);

const checks = computed<PasswordPolicyChecks>(() => passwordPolicyChecks(props.password));

const strengthKey = computed(() => {
  if (!props.password) {
    return 'empty';
  }
  if (score.value <= 1) {
    return 'weak';
  }
  if (score.value === 2) {
    return 'fair';
  }
  if (score.value === 3) {
    return 'good';
  }
  return 'strong';
});

function segmentClass(index: number): string {
  if (!props.password || score.value < index) {
    return 'password-strength__segment--idle';
  }
  if (score.value <= 1) {
    return 'password-strength__segment--weak';
  }
  if (score.value === 2) {
    return 'password-strength__segment--fair';
  }
  if (score.value === 3) {
    return 'password-strength__segment--good';
  }
  return 'password-strength__segment--strong';
}

function checkClass(ok: boolean): string {
  return ok ? 'text-positive' : 'text-muted';
}

let estimateGen = 0;
watch(
  [() => props.password, () => (props.userInputs ?? []).join('\0')],
  async () => {
    const gen = ++estimateGen;
    const next = await estimatePasswordStrength(props.password, props.userInputs ?? []);
    if (gen === estimateGen) {
      score.value = next.score;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.password-strength__segment {
  height: 6px;
  border-radius: 3px;
  background: rgba(128, 128, 128, 0.35);
}

.password-strength__segment--weak {
  background: #c62828;
}

.password-strength__segment--fair {
  background: #ef6c00;
}

.password-strength__segment--good {
  background: #f9a825;
}

.password-strength__segment--strong {
  background: #2e7d32;
}

.password-strength__checklist {
  list-style: disc;
}
</style>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('support.adminTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('support.adminSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('support.staffNav')" :to="{ name: 'support-staff' }" />
        <q-btn flat :label="$t('support.backToSupport')" :to="{ name: 'support' }" />
      </div>
    </div>

    <q-banner v-if="support.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="support.error = null" />
      </template>
    </q-banner>

    <q-list bordered separator class="rounded-borders">
      <template v-if="support.loading && !support.adminUsers.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('support.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!support.adminUsers.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('support.emptyUsers') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <q-item v-for="row in support.adminUsers" :key="row.id">
          <q-item-section>
            <q-item-label class="row items-center q-gutter-sm">
              <span>{{ row.displayName || row.email || row.id }}</span>
              <q-badge
                v-if="row.emailVerified === false"
                color="warning"
                text-color="dark"
                :label="$t('support.emailUnverified')"
              />
            </q-item-label>
            <q-item-label caption>
              {{ row.email || '—' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side style="min-width: 160px">
            <q-select
              :model-value="row.role"
              :options="roleOptions"
              emit-value
              map-options
              dense
              outlined
              :disable="support.loading || String(auth.user?.id) === row.id"
              @update:model-value="(v) => onRoleChange(row.id, v)"
            />
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { supportErrorI18nKey, useSupportStore } from '@/stores/support';

const auth = useAuthStore();
const support = useSupportStore();
const router = useRouter();
const { t } = useI18n();

const roleOptions = computed(() => [
  { label: t('support.roles.user'), value: 'user' as const },
  { label: t('support.roles.moderator'), value: 'moderator' as const },
  { label: t('support.roles.admin'), value: 'admin' as const },
]);

const errorLabel = computed(() => {
  const key = supportErrorI18nKey(support.error);
  return key ? t(key) : (support.error ?? '');
});

onMounted(() => {
  if (!auth.isAdmin) {
    void router.replace({ name: 'support' });
    return;
  }
  void support.listAdminUsers().catch(() => {
    /* error in store */
  });
});

async function onRoleChange(userId: string, role: string | number | null) {
  if (role !== 'user' && role !== 'moderator' && role !== 'admin') {
    return;
  }
  try {
    await support.setUserRole(userId, role);
  } catch {
    /* error in store */
  }
}
</script>

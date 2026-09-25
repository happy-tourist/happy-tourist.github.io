<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('maps.title') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('maps.subtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn
          v-if="!auth.isStaff"
          flat
          icon="hourglass_top"
          :label="$t('content.myModerationNav')"
          :to="{ name: 'content-my-moderation' }"
        />
        <q-btn
          v-if="auth.isStaff"
          flat
          icon="rate_review"
          :label="$t('content.staffNav')"
          :to="{ name: 'content-staff' }"
        />
        <q-btn color="primary" icon="add" :label="$t('maps.create')" @click="onCreateClick" />
      </div>
    </div>

    <q-banner v-if="maps.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="maps.error = null" />
      </template>
    </q-banner>

    <q-list bordered separator class="rounded-borders">
      <template v-if="maps.loading && !maps.list.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('maps.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!maps.list.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('maps.empty') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <q-item
          v-for="item in maps.list"
          :key="item.id"
          clickable
          v-ripple
          @click="onRowClick(item)"
        >
          <q-item-section avatar>
            <MapGridPreview :grid="item.grid" :size="56" :aria-label="$t('maps.previewAria')" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ item.authorDisplayName || $t('content.authorUser') }}
              <q-badge v-if="item.hasLive && item.inCatalog === false" color="grey" class="q-ml-sm">
                {{ $t('maps.unpublishedByStaff') }}
              </q-badge>
              <q-badge v-else-if="!item.hasLive" color="orange" class="q-ml-sm">
                {{ $t('maps.draftOnly') }}
              </q-badge>
            </q-item-label>
            <q-item-label caption>
              {{
                $t('maps.seatConfig', {
                  players: item.players,
                  tourists: item.touristsPerPlayer,
                })
              }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center no-wrap q-gutter-xs" @click.stop>
              <q-btn
                v-if="auth.isStaff && item.hasLive && item.inCatalog === true"
                flat
                dense
                color="warning"
                :label="$t('maps.unpublish')"
                :loading="maps.loading"
                @click.stop="confirmUnpublish(item.id)"
              />
              <q-btn
                v-if="auth.isStaff && item.hasLive && item.inCatalog === false"
                flat
                dense
                color="primary"
                :label="$t('maps.republish')"
                :loading="maps.loading"
                @click.stop="onRepublish(item.id)"
              />
              <q-btn
                v-if="auth.isStaff && item.hasLive"
                flat
                dense
                color="secondary"
                :label="$t('maps.staffEdit')"
                @click.stop="onStaffEdit(item.id)"
              />
              <q-icon name="chevron_right" />
            </div>
          </q-item-section>
        </q-item>
      </template>
    </q-list>

    <q-dialog v-model="gateOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('maps.gateDismiss')" v-close-popup />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('maps.gateLogin')"
            :to="{ name: 'login', query: { redirect: '/content/maps' } }"
          />
          <q-btn v-else color="primary" :label="$t('maps.gateVerify')" :to="{ name: 'account' }" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="unpublishConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('maps.unpublishConfirmTitle') }}</div>
          <div class="q-mt-sm">{{ $t('maps.unpublishConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('maps.gateDismiss')" v-close-popup />
          <q-btn
            color="warning"
            :label="$t('maps.unpublish')"
            :loading="maps.loading"
            @click="doUnpublish"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import MapGridPreview from '@/components/MapGridPreview.vue';
import { useAuthStore } from '@/stores/auth';
import { mapsErrorI18nKey, useMapsStore, type MapSummary } from '@/stores/maps';

const auth = useAuthStore();
const maps = useMapsStore();
const router = useRouter();
const { t } = useI18n();

const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const unpublishConfirmOpen = ref(false);
const pendingUnpublishId = ref<string | null>(null);

const gateTitle = computed(() =>
  gateMode.value === 'login' ? t('maps.gateLoginTitle') : t('maps.gateVerifyTitle'),
);
const gateText = computed(() =>
  gateMode.value === 'login' ? t('maps.gateLoginText') : t('maps.gateVerifyText'),
);

const errorLabel = computed(() => {
  const key = mapsErrorI18nKey(maps.error);
  return key ? t(key) : (maps.error ?? '');
});

onMounted(() => {
  void maps.listMaps().catch(() => {
    /* error in store */
  });
});

function confirmUnpublish(mapId: string) {
  pendingUnpublishId.value = mapId;
  unpublishConfirmOpen.value = true;
}

async function doUnpublish() {
  const mapId = pendingUnpublishId.value;
  if (!mapId) return;
  try {
    await maps.unpublishMap(mapId);
    unpublishConfirmOpen.value = false;
    pendingUnpublishId.value = null;
  } catch {
    /* error in store */
  }
}

async function onRepublish(mapId: string) {
  try {
    await maps.republishMap(mapId);
  } catch {
    /* error in store */
  }
}

function onStaffEdit(mapId: string) {
  void router.push({ name: 'content-map-edit', params: { id: mapId }, query: { staff: '1' } });
}

function onRowClick(item: MapSummary) {
  // Soft-unpublished: non-staff must not open (SC-MAP-21).
  if (item.hasLive && item.inCatalog === false && !auth.isStaff) {
    return;
  }
  void router.push({ name: 'content-map-edit', params: { id: item.id } });
}

async function onCreateClick() {
  if (auth.user?.anonymous) {
    gateMode.value = 'login';
    gateOpen.value = true;
    return;
  }
  if (auth.needsEmailVerification) {
    gateMode.value = 'verify';
    gateOpen.value = true;
    return;
  }
  try {
    const created = await maps.createMap();
    await router.push({ name: 'content-map-edit', params: { id: created.map.id } });
  } catch {
    /* error in store — also surface verify via API code */
  }
}
</script>

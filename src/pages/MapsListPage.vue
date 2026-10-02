<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('maps.title') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('maps.subtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <!-- SC-MAP-43: staff «Модерация» is in App header, not list chrome -->
        <q-btn color="primary" icon="add" :label="$t('maps.create')" @click="onCreateClick" />
      </div>
    </div>

    <q-banner v-if="maps.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="maps.error = null" />
      </template>
    </q-banner>

    <!-- SC-MAP-33/34: list filters (no favorites) -->
    <div class="row q-gutter-sm q-mb-md" data-test-id="maps-filters">
      <q-btn
        v-for="opt in filterOptions"
        :key="opt.value"
        dense
        :outline="listFilter !== opt.value"
        :color="listFilter === opt.value ? 'primary' : undefined"
        :label="opt.label"
        :data-test-id="`maps-filter-${opt.value}`"
        :disable="opt.identityOnly && isGuest"
        @click="onFilterClick(opt.value, opt.identityOnly)"
      />
    </div>

    <div v-if="maps.loading && !maps.list.length" class="text-muted">
      {{ $t('maps.loading') }}
    </div>
    <div v-else-if="!filteredMaps.length" class="text-muted">
      {{ listFilter === 'all' ? $t('maps.empty') : $t('maps.emptyFiltered') }}
    </div>
    <!-- SC-MAP-55/66/67: card grid — preview overlay status, capacity rows, outline actions -->
    <div v-else class="pack-card-grid" data-testid="maps-card-grid" data-test-id="maps-card-grid">
      <MapListCardTile
        v-for="item in filteredMaps"
        :key="item.id"
        :grid="item.grid"
        :players="item.players"
        :tourists-per-player="item.touristsPerPlayer"
        :preview-aria="$t('maps.previewAria')"
        clickable
        :muted="isSoftUnpublished(item)"
        :test-id="`maps-row-${item.id}`"
        @open="onRowClick(item)"
      >
        <!-- Omit empty #status so published cards have no overlay host (SC-MAP-45/66). -->
        <template v-if="hasMapCardStatus(item)" #status>
          <q-badge
            v-if="isSoftUnpublished(item)"
            dense
            class="pack-task-set-status-badge pack-task-set-status-badge--muted"
            :data-test-id="`maps-status-${item.id}`"
          >
            <span
              class="pack-task-set-status-icon pack-task-set-status-icon--unpublished"
              aria-hidden="true"
            />
            {{ $t('content.taskSetCardBadge.unpublished') }}
          </q-badge>
          <q-badge
            v-else-if="isReviseStatus(item)"
            dense
            outline
            class="pack-list-status-badge--revise"
            :data-test-id="`maps-status-${item.id}`"
          >
            {{ $t('content.taskSetCardBadge.needs_revision') }}
          </q-badge>
          <q-badge
            v-else
            dense
            class="pack-task-set-status-badge"
            :class="statusBadgeToneClass(item)"
            :data-test-id="`maps-status-${item.id}`"
          >
            <span
              class="pack-task-set-status-icon"
              :class="statusBadgeIconClass(item)"
              aria-hidden="true"
            />
            {{ statusBadge(item) }}
          </q-badge>
        </template>
        <!-- Omit empty #actions so pale divider / slim chrome appear only when controls exist. -->
        <template v-if="hasMapCardActions(item)" #actions>
          <q-btn
            v-if="showAuthorEdit(item)"
            outline
            dense
            no-caps
            class="full-width"
            icon="edit"
            :label="$t('content.edit')"
            data-test-id="maps-author-edit"
            @click.stop="onAuthorEdit(item.id)"
          />
          <q-btn
            v-if="showStaffEdit(item)"
            outline
            dense
            no-caps
            class="full-width"
            icon="edit"
            :label="$t('maps.staffEdit')"
            data-test-id="maps-staff-edit"
            @click.stop="onStaffEdit(item.id)"
          />
          <q-btn
            v-else-if="showStaffEditBlocked(item)"
            outline
            dense
            no-caps
            class="full-width"
            icon="edit"
            :label="$t('maps.staffEdit')"
            disable
            data-test-id="maps-staff-edit-blocked"
          >
            <q-tooltip>{{ $t('maps.staffEditBlockedAuthorRequest') }}</q-tooltip>
          </q-btn>
          <q-btn
            v-if="auth.isStaff && item.hasLive && item.inCatalog === true"
            outline
            dense
            no-caps
            class="full-width"
            icon="visibility_off"
            :label="$t('content.taskSetCardUnpublish')"
            :loading="maps.loading"
            data-test-id="maps-unpublish"
            @click.stop="confirmUnpublish(item.id)"
          />
          <q-btn
            v-if="auth.isStaff && item.hasLive && item.inCatalog === false"
            outline
            dense
            no-caps
            class="full-width"
            icon="visibility"
            :label="$t('content.taskSetCardRepublish')"
            :loading="maps.loading"
            data-test-id="maps-republish"
            @click.stop="onRepublish(item.id)"
          />
        </template>
      </MapListCardTile>
    </div>

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

import MapListCardTile from '@/components/MapListCardTile.vue';
import { useAuthStore } from '@/stores/auth';
import { mapsErrorI18nKey, useMapsStore, type MapSummary } from '@/stores/maps';

export type MapsListFilter = 'all' | 'moderation' | 'drafts' | 'mine';

const auth = useAuthStore();
const maps = useMapsStore();
const router = useRouter();
const { t } = useI18n();

const listFilter = ref<MapsListFilter>('all');
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const unpublishConfirmOpen = ref(false);
const pendingUnpublishId = ref<string | null>(null);

const isGuest = computed(() => Boolean(auth.user?.anonymous));
const uid = computed(() => auth.user?.id ?? '');

const filterOptions = computed(() => [
  { value: 'all' as const, label: t('maps.filterAll'), identityOnly: false },
  { value: 'moderation' as const, label: t('maps.filterModeration'), identityOnly: true },
  { value: 'drafts' as const, label: t('maps.filterDrafts'), identityOnly: true },
  { value: 'mine' as const, label: t('maps.filterMine'), identityOnly: true },
]);

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

/** Client-side filters over GET /api/content/maps (SC-MAP-33/34). */
const filteredMaps = computed(() => {
  const items = maps.list;
  if (isGuest.value && listFilter.value !== 'all') {
    return [];
  }
  switch (listFilter.value) {
    case 'moderation':
      return items.filter(
        (m) => m.moderationStatus === 'pending' || m.moderationStatus === 'needs_revision',
      );
    case 'drafts':
      return items.filter(
        (m) => m.moderationStatus === 'draft' || (!m.hasLive && !m.moderationStatus),
      );
    case 'mine':
      return items.filter((m) => m.createdBy === uid.value);
    default:
      return items;
  }
});

onMounted(() => {
  void maps.listMaps().catch(() => {
    /* error in store */
  });
});

function onFilterClick(value: MapsListFilter, identityOnly: boolean) {
  if (identityOnly && isGuest.value) return;
  listFilter.value = value;
}

/** Soft-unpub muted + СНЯТО badge (same product sense as pack cards). */
function isSoftUnpublished(item: MapSummary): boolean {
  return Boolean(item.hasLive && item.inCatalog === false);
}

function isReviseStatus(item: MapSummary): boolean {
  return item.moderationStatus === 'needs_revision';
}

/** True when a short status pill should overlay the preview (omit empty #status). */
function hasMapCardStatus(item: MapSummary): boolean {
  return isSoftUnpublished(item) || isReviseStatus(item) || Boolean(statusBadge(item));
}

/**
 * Short card badges (SC-MAP-31/32/45/66) — `content.taskSetCardBadge.*`, not long
 * `content.statuses.*` / `maps.draftOnly` / `maps.unpublishedByStaff` on the pill.
 * Soft-unpub + revise rendered separately (icon/tone helpers).
 */
function statusBadge(item: MapSummary): string {
  if (isSoftUnpublished(item) || isReviseStatus(item)) return '';
  const status = item.moderationStatus;
  if (status === 'pending') return t('content.taskSetCardBadge.pending');
  if (status === 'draft' || (!item.hasLive && status !== 'unpublished')) {
    return t('content.taskSetCardBadge.draft');
  }
  // SC-MAP-45: published / in_catalog rows have no status badge
  return '';
}

/** Soft muted / pending amber pills (task-set product sense; not Quasar solid fills). */
function statusBadgeToneClass(item: MapSummary): string {
  return item.moderationStatus === 'pending'
    ? 'pack-task-set-status-badge--pending'
    : 'pack-task-set-status-badge--muted';
}

/** Custom SVG badge icons via CSS mask classes (reuse task-set badge family). */
function statusBadgeIconClass(item: MapSummary): string {
  if (item.moderationStatus === 'pending') return 'pack-task-set-status-icon--pending';
  return 'pack-task-set-status-icon--draft';
}

function hasOpenAuthorRequest(item: MapSummary): boolean {
  // Prefer server flag so staff sees others' open requests (SC-MAP-36).
  if (item.authorRequestOpen) return true;
  return item.moderationStatus === 'pending' || item.moderationStatus === 'needs_revision';
}

function showStaffEdit(item: MapSummary): boolean {
  return auth.isStaff && item.hasLive && !hasOpenAuthorRequest(item);
}

function showStaffEditBlocked(item: MapSummary): boolean {
  return auth.isStaff && item.hasLive && hasOpenAuthorRequest(item);
}

function showAuthorEdit(item: MapSummary): boolean {
  if (auth.isStaff || isGuest.value) return false;
  if (!item.hasLive || item.inCatalog === false) return false;
  return Boolean(uid.value) && item.createdBy === uid.value;
}

/** True when at least one outline card action would render (avoid empty actions chrome). */
function hasMapCardActions(item: MapSummary): boolean {
  return (
    showAuthorEdit(item) ||
    showStaffEdit(item) ||
    showStaffEditBlocked(item) ||
    (auth.isStaff && item.hasLive)
  );
}

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

function onAuthorEdit(mapId: string) {
  void router.push({ name: 'content-map-edit', params: { id: mapId }, query: { edit: '1' } });
}

function onRowClick(item: MapSummary) {
  // Soft-unpublished: non-staff must not open (SC-MAP-21).
  if (item.hasLive && item.inCatalog === false && !auth.isStaff) {
    return;
  }
  // SC-MAP-49/50: never-published OR author draft/pending/needs_revision → Edit (not View-first).
  const status = item.moderationStatus;
  const authorWork =
    !item.hasLive || status === 'draft' || status === 'pending' || status === 'needs_revision';
  if (authorWork && !auth.isStaff) {
    if (item.hasLive) {
      void router.push({
        name: 'content-map-edit',
        params: { id: item.id },
        query: { edit: '1' },
      });
    } else {
      // Never-published: boot enters Edit without query (SC-MAP-49).
      void router.push({ name: 'content-map-edit', params: { id: item.id } });
    }
    return;
  }
  // SC-MAP-46: clean published → View
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

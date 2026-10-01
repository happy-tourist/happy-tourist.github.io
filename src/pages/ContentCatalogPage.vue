<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.catalogTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.catalogSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <!-- SC-PACK-184: staff «Модерация» is in App header, not list chrome -->
        <q-btn color="primary" icon="add" :label="$t('content.create')" @click="onCreateClick" />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <!-- SC-PACK-151…153: list filters -->
    <div class="row q-gutter-sm q-mb-md" data-test-id="packs-filters">
      <q-btn
        v-for="opt in filterOptions"
        :key="opt.value"
        dense
        :outline="listFilter !== opt.value"
        :color="listFilter === opt.value ? 'primary' : undefined"
        :label="opt.label"
        :data-test-id="`packs-filter-${opt.value}`"
        :disable="opt.identityOnly && isGuest"
        @click="onFilterClick(opt.value, opt.identityOnly)"
      />
    </div>

    <div v-if="content.loading && !content.catalog.length" class="text-muted">
      {{ $t('content.loading') }}
    </div>
    <div v-else-if="!filteredPacks.length" class="text-muted">
      {{ listFilter === 'all' ? $t('content.emptyCatalog') : $t('content.emptyFiltered') }}
    </div>
    <!-- SC-PACK-228/249…251: ~180×260 — star TL, status TR, set preview, outline+icon actions -->
    <div v-else class="pack-card-grid" data-testid="packs-card-grid">
      <PackListCardTile
        v-for="item in filteredPacks"
        :key="item.id"
        :title="item.title || $t('content.untitled')"
        :description="item.description || ''"
        :task-sets-preview="item.taskSetsPreview ?? []"
        clickable
        :test-id="`packs-row-${item.id}`"
        @open="onRowClick(item)"
      >
        <template #leading>
          <q-btn
            v-if="canStar(item)"
            flat
            dense
            round
            size="sm"
            :icon="item.isFavorite ? 'star' : 'star_border'"
            :color="item.isFavorite ? 'amber' : undefined"
            :aria-label="
              item.isFavorite ? $t('content.favoriteUnstar') : $t('content.favoriteStar')
            "
            :data-test-id="`packs-star-${item.id}`"
            :loading="content.loading"
            @click.stop="onToggleFavorite(item)"
          />
        </template>
        <template #status>
          <q-badge v-if="item.blocked" color="negative" dense>
            {{ $t('content.blocked') }}
          </q-badge>
          <q-badge
            v-else-if="isReviseStatus(item)"
            dense
            outline
            class="pack-list-status-badge--revise"
            :data-test-id="`packs-status-${item.id}`"
          >
            {{ $t('content.taskSetCardBadge.needs_revision') }}
          </q-badge>
          <q-badge
            v-else-if="statusBadge(item)"
            :color="statusBadgeColor(item)"
            dense
            :data-test-id="`packs-status-${item.id}`"
          >
            {{ statusBadge(item) }}
          </q-badge>
        </template>
        <!-- Omit empty #actions so pale divider appears only when controls exist. -->
        <template v-if="hasCatalogCardActions(item)" #actions>
          <q-btn
            v-if="shouldOpenPackEditFromList(item)"
            outline
            dense
            no-caps
            class="full-width"
            icon="edit"
            :label="$t('content.edit')"
            :data-test-id="`packs-edit-${item.id}`"
            @click.stop="onEditClick(item)"
          />
          <q-btn
            v-if="auth.isStaff && item.hasLive && item.inCatalog === true"
            outline
            dense
            no-caps
            class="full-width"
            icon="visibility_off"
            :label="$t('content.unpublish')"
            :data-test-id="`packs-unpublish-${item.id}`"
            :loading="content.loading"
            @click.stop="confirmUnpublish(item.id)"
          />
          <q-btn
            v-if="auth.isStaff && item.hasLive && item.inCatalog === false"
            outline
            dense
            no-caps
            class="full-width"
            icon="visibility"
            :label="$t('content.republish')"
            :data-test-id="`packs-republish-${item.id}`"
            :loading="content.loading"
            @click.stop="onRepublish(item.id)"
          />
        </template>
      </PackListCardTile>
    </div>

    <q-dialog v-model="gateOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('content.gateLogin')"
            :to="{ name: 'login', query: { redirect: '/content/packs/new' } }"
          />
          <q-btn
            v-else
            color="primary"
            :label="$t('content.gateVerify')"
            :to="{ name: 'account' }"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="unpublishConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.unpublishConfirmTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.unpublishConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="warning"
            :label="$t('content.unpublish')"
            :loading="content.loading"
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

import PackListCardTile from '@/components/PackListCardTile.vue';
import { useAuthStore } from '@/stores/auth';
import { contentErrorI18nKey, useContentStore, type ContentPackSummary } from '@/stores/content';

export type PacksListFilter = 'all' | 'moderation' | 'drafts' | 'mine' | 'favorites';

const auth = useAuthStore();
const content = useContentStore();
const router = useRouter();
const { t } = useI18n();

const listFilter = ref<PacksListFilter>('all');
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const unpublishConfirmOpen = ref(false);
const pendingUnpublishId = ref<string | null>(null);

const isGuest = computed(() => Boolean(auth.user?.anonymous));

const filterOptions = computed(() => [
  { value: 'all' as const, label: t('content.filterAll'), identityOnly: false },
  { value: 'moderation' as const, label: t('content.filterModeration'), identityOnly: true },
  { value: 'drafts' as const, label: t('content.filterDrafts'), identityOnly: true },
  { value: 'mine' as const, label: t('content.filterMine'), identityOnly: true },
  { value: 'favorites' as const, label: t('content.filterFavorites'), identityOnly: true },
]);

const gateTitle = computed(() =>
  gateMode.value === 'login' ? t('content.gateLoginTitle') : t('content.gateVerifyTitle'),
);
const gateText = computed(() =>
  gateMode.value === 'login' ? t('content.gateLoginText') : t('content.gateVerifyText'),
);

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

/** Client-side filters over unified GET /api/content/packs (SC-PACK-151…153). */
const filteredPacks = computed(() => {
  const items = content.catalog;
  if (isGuest.value && listFilter.value !== 'all') {
    return [];
  }
  switch (listFilter.value) {
    case 'moderation':
      return items.filter(
        (p) => p.moderationStatus === 'pending' || p.moderationStatus === 'needs_revision',
      );
    case 'drafts':
      return items.filter(
        (p) => p.moderationStatus === 'draft' || (!p.hasLive && !p.moderationStatus),
      );
    case 'mine':
      return items.filter((p) => Boolean(p.isMine || p.isContributor));
    case 'favorites':
      return items.filter((p) => Boolean(p.isFavorite));
    default:
      return items;
  }
});

onMounted(() => {
  void content.listCatalog().catch(() => {
    /* error in store */
  });
});

function onFilterClick(value: PacksListFilter, identityOnly: boolean) {
  if (identityOnly && isGuest.value) return;
  listFilter.value = value;
}

/** SC-PACK-251: revise uses short «ДОРАБОТАТЬ» red-outline badge (not statuses.needs_revision). */
function isReviseStatus(item: ContentPackSummary): boolean {
  return item.moderationStatus === 'needs_revision';
}

function statusBadge(item: ContentPackSummary): string {
  if (item.blocked) return '';
  const status = item.moderationStatus;
  if (status === 'pending') return t('content.statuses.pending');
  // needs_revision rendered via isReviseStatus + taskSetCardBadge.needs_revision
  if (status === 'needs_revision') return '';
  if (status === 'draft' || (!item.hasLive && status !== 'unpublished')) {
    return t('content.statusDraft');
  }
  if (status === 'unpublished' || (item.hasLive && item.inCatalog === false)) {
    return t('content.unpublishedByStaff');
  }
  // SC-PACK-148/185: published / in_catalog rows have no status badge
  return '';
}

function statusBadgeColor(item: ContentPackSummary): string {
  const status = item.moderationStatus;
  if (status === 'pending') return 'orange';
  if (status === 'draft' || !item.hasLive) return 'grey';
  if (status === 'unpublished' || item.inCatalog === false) return 'grey';
  return 'grey';
}

/** True when at least one outline card action would render (avoid empty actions chrome). */
function hasCatalogCardActions(item: ContentPackSummary): boolean {
  if (shouldOpenPackEditFromList(item)) return true;
  if (auth.isStaff && item.hasLive && item.inCatalog === true) return true;
  if (auth.isStaff && item.hasLive && item.inCatalog === false) return true;
  return false;
}

function canStar(item: ContentPackSummary): boolean {
  if (isGuest.value || auth.user?.anonymous) return false;
  if (item.blocked) return false;
  if (!item.hasLive || item.inCatalog === false) return false;
  return true;
}

async function onToggleFavorite(item: ContentPackSummary) {
  try {
    if (item.isFavorite) {
      await content.unstarPack(item.id);
    } else {
      await content.starPack(item.id);
    }
  } catch {
    /* error in store */
  }
}

function onEditClick(item: ContentPackSummary) {
  void router.push({ name: 'content-pack-edit', params: { id: item.id } });
}

function onRowClick(item: ContentPackSummary) {
  // SC-PACK-186/191/192: never-published or pack-level author work → Edit;
  // add-task-set-only open work → live first; clean in-catalog → live.
  if (shouldOpenPackEditFromList(item)) {
    onEditClick(item);
    return;
  }
  void router.push({ name: 'content-pack', params: { id: item.id } });
}

/** SC-PACK-186 / 191 / 192 — pack-level Edit vs live-first for add-task-set. */
function shouldOpenPackEditFromList(item: ContentPackSummary): boolean {
  if (!item.hasLive) return true;
  const status = item.moderationStatus;
  if (status !== 'pending' && status !== 'needs_revision' && status !== 'draft') {
    return false;
  }
  if (item.openRequestType === 'task_set') return false;
  if (item.openRequestType === 'pack') return true;
  // Draft with live = pack-level cancel/working (SC-PACK-175…179 / 192).
  if (status === 'draft') return true;
  // pending/needs_revision without type: mine → pack Edit; contributor → live (SC-PACK-191).
  return Boolean(item.isMine);
}

function confirmUnpublish(packId: string) {
  pendingUnpublishId.value = packId;
  unpublishConfirmOpen.value = true;
}

async function doUnpublish() {
  const packId = pendingUnpublishId.value;
  if (!packId) return;
  try {
    await content.unpublishPack(packId);
    unpublishConfirmOpen.value = false;
    pendingUnpublishId.value = null;
  } catch {
    /* error in store */
  }
}

async function onRepublish(packId: string) {
  try {
    await content.republishPack(packId);
  } catch {
    /* error in store */
  }
}

function onCreateClick() {
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
  void router.push({ name: 'content-pack-new' });
}
</script>

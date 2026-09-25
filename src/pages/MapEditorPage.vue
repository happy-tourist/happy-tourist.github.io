<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">
          {{ $t('maps.editorTitle') }}
          <q-badge v-if="statusLabel" :color="statusBadgeColor" class="q-ml-sm">
            {{ statusLabel }}
          </q-badge>
        </div>
        <div class="text-subtitle2 text-muted">
          <template v-if="staffMode">{{ $t('maps.staffEditSubtitle') }}</template>
          <template v-else-if="viewOnly">{{ $t('maps.viewOnlySubtitle') }}</template>
          <template v-else>{{ $t('maps.editorSubtitle') }}</template>
        </div>
      </div>
      <div class="q-gutter-sm">
        <!-- SC-MAP-44: «К картам» replaced by App breadcrumbs -->
        <q-btn
          v-if="canDelete"
          flat
          color="negative"
          :label="$t('maps.delete')"
          :loading="maps.loading"
          @click="deleteConfirmOpen = true"
        />
      </div>
    </div>

    <q-banner v-if="maps.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="maps.error = null" />
      </template>
    </q-banner>

    <div v-if="maps.loading && !local" class="text-muted">{{ $t('maps.loading') }}</div>

    <template v-else-if="local">
      <div class="row q-col-gutter-md q-mb-md items-start">
        <div class="col-12 col-md-auto">
          <MapGridPreview
            :grid="local.grid"
            :size="editorSize"
            :interactive="!viewOnly && !gateOpen"
            :aria-label="$t('maps.editorGridAria')"
            @cell-click="onCellClick"
          />
        </div>
        <div class="col">
          <!-- SC-MAP-46/47: View shows author + seats; no paint tools / edit chrome -->
          <template v-if="viewOnly">
            <div class="q-mb-md" data-test-id="map-view-meta">
              <div class="text-body1">
                {{ maps.map?.authorDisplayName || $t('content.authorUser') }}
              </div>
              <div class="text-subtitle2 text-muted">
                {{
                  $t('maps.seatConfig', {
                    players: local.players,
                    tourists: local.touristsPerPlayer,
                  })
                }}
              </div>
            </div>
            <q-btn
              v-if="canEnterEditFromView"
              color="primary"
              :label="$t('content.edit')"
              data-test-id="map-view-edit"
              :loading="maps.loading"
              @click="onEnterEditFromView"
            />
          </template>
          <template v-else>
            <div class="text-subtitle2 q-mb-sm">{{ $t('maps.palette') }}</div>
            <div class="row q-gutter-sm q-mb-md" data-test-id="map-paint-tools">
              <q-btn
                v-for="tool in paintTools"
                :key="tool"
                :outline="selectedTool !== tool"
                :color="toolColor(tool)"
                :disable="gateOpen"
                :label="$t(`maps.tools.${tool}`)"
                @click="selectedTool = tool"
              />
            </div>

            <div class="row q-col-gutter-md q-mb-md" style="max-width: 360px">
              <div class="col-6">
                <q-select
                  v-model="local.players"
                  :options="seatOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  :disable="gateOpen"
                  :label="$t('maps.players')"
                  @update:model-value="onSeatsChange"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="local.touristsPerPlayer"
                  :options="seatOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  :disable="gateOpen"
                  :label="$t('maps.tourists')"
                  @update:model-value="onSeatsChange"
                />
              </div>
            </div>

            <div class="text-caption text-muted q-mb-md">
              {{
                $t('maps.startsHint', {
                  starts: startCount,
                  min: minStarts,
                })
              }}
              <span v-if="maps.saving" class="q-ml-sm">{{ $t('maps.autosaving') }}</span>
            </div>

            <div v-if="!staffMode" class="q-gutter-sm">
              <q-btn
                color="primary"
                :label="$t('maps.submitModeration')"
                :loading="maps.loading"
                :disable="!canSubmit"
                @click="onSubmit"
              />
              <q-btn
                v-if="canCancelRequest"
                color="grey"
                outline
                :label="$t('content.cancelPending')"
                :loading="maps.loading"
                @click="onCancelRequest"
              />
              <div v-if="!canSubmit" class="text-caption text-muted">{{ submitHint }}</div>
            </div>
          </template>
        </div>
      </div>

      <template v-if="showThread">
        <div class="text-h6 q-mb-sm">{{ $t('maps.moderationThread') }}</div>
        <q-list bordered separator class="rounded-borders q-mb-lg">
          <q-item v-for="msg in threadMessages" :key="msg.id">
            <q-item-section>
              <q-item-label>{{ messageAuthorLabel(msg) }}</q-item-label>
              <q-item-label caption>{{ formatDate(msg.createdAt) }}</q-item-label>
              <div class="q-mt-sm" style="white-space: pre-wrap">{{ msg.body }}</div>
            </q-item-section>
          </q-item>
          <q-item v-if="!threadMessages.length">
            <q-item-section class="text-muted">{{ $t('content.emptyThread') }}</q-item-section>
          </q-item>
        </q-list>

        <q-form v-if="canReply" ref="replyFormRef" class="q-gutter-md" @submit.prevent="onReply">
          <q-input
            v-model="replyBody"
            type="textarea"
            outlined
            dense
            autogrow
            lazy-rules
            :label="$t('content.reply')"
            :rules="[(v) => (!!v && String(v).trim().length > 0) || $t('content.bodyRequired')]"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('content.sendReply')"
            :loading="maps.loading"
          />
        </q-form>
      </template>
    </template>

    <q-dialog v-model="gateOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('maps.backToList')" :to="{ name: 'content-maps' }" />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('maps.gateLogin')"
            :to="{ name: 'login', query: { redirect: route.fullPath } }"
          />
          <q-btn v-else color="primary" :label="$t('maps.gateVerify')" :to="{ name: 'account' }" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('maps.deleteConfirmTitle') }}</div>
          <div class="q-mt-sm">{{ $t('maps.deleteConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('maps.gateDismiss')" v-close-popup />
          <q-btn
            color="negative"
            :label="$t('maps.delete')"
            :loading="maps.loading"
            @click="onDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import type { QForm } from 'quasar';
import { useQuasar } from 'quasar';

import MapGridPreview from '@/components/MapGridPreview.vue';
import { useAuthStore } from '@/stores/auth';
import { type ModerationMessage } from '@/stores/content';
import {
  clampSeatCount,
  countStarts,
  mapsErrorI18nKey,
  paintCell,
  useMapsStore,
  type MapPaintTool,
  type MapRevision,
} from '@/stores/maps';

const AUTOSAVE_MS = 800;
const LOCK_HEARTBEAT_MS = 60_000;

const auth = useAuthStore();
const maps = useMapsStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const $q = useQuasar();

const mapId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});

const local = ref<MapRevision | null>(null);
const selectedTool = ref<MapPaintTool>('start');
const paintTools: MapPaintTool[] = ['start', 'task', 'finish'];
const seatOptions = [1, 2, 3, 4].map((n) => ({ label: String(n), value: n }));
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const staffMode = ref(false);
const viewOnly = ref(false);
const lockHeld = ref(false);
const deleteConfirmOpen = ref(false);
const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const threadMessages = ref<ModerationMessage[]>([]);
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let lockHeartbeat: ReturnType<typeof setInterval> | null = null;
let suppressAutosave = false;

const uid = computed(() => String(auth.user?.id ?? ''));

const editorSize = computed(() => ($q.screen.lt.sm ? 280 : 360));

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

const startCount = computed(() => (local.value ? countStarts(local.value.grid) : 0));
const minStarts = computed(() =>
  local.value ? local.value.players * local.value.touristsPerPlayer : 1,
);

const statusLabel = computed(() => {
  const status = maps.moderationStatus;
  if (status === 'pending') return t('content.statuses.pending');
  if (status === 'needs_revision' || status === 'rejected') {
    return t('content.statuses.needs_revision');
  }
  if (maps.map?.hasLive && maps.map.inCatalog === false) {
    return t('maps.unpublishedByStaff');
  }
  if (maps.map?.hasLive) return t('content.taskSetStatusMarks.published');
  return '';
});

const statusBadgeColor = computed(() => {
  const status = maps.moderationStatus;
  if (status === 'needs_revision' || status === 'rejected') return 'warning';
  if (status === 'pending') return 'orange';
  if (maps.map?.hasLive && maps.map.inCatalog === false) return 'grey';
  if (maps.map?.hasLive) return 'positive';
  return 'primary';
});

const canSubmit = computed(() => {
  if (staffMode.value || viewOnly.value || gateOpen.value || !local.value) return false;
  if (startCount.value < minStarts.value) return false;
  if (maps.pendingRequestId && !maps.isPendingAuthor) return false;
  // SC-MAP-35 / SC-PACK-163 parity: author may resubmit while open/pending.
  return true;
});

const submitHint = computed(() => {
  if (maps.pendingRequestId && !maps.isPendingAuthor) {
    return t('content.submitLockedOther');
  }
  if (maps.moderationStatus === 'pending' && maps.isPendingAuthor) {
    return t('content.statusPendingAuthor');
  }
  if (startCount.value < minStarts.value) {
    return t('maps.submitHintStarts', { min: minStarts.value, starts: startCount.value });
  }
  return t('maps.submitHint');
});

const canCancelRequest = computed(
  () =>
    !staffMode.value &&
    maps.isPendingAuthor &&
    Boolean(maps.pendingRequestId) &&
    (maps.moderationStatus === 'pending' || maps.moderationStatus === 'needs_revision'),
);

const canReply = computed(() => {
  if (staffMode.value || !maps.isPendingAuthor || !maps.pendingRequestId) return false;
  return maps.moderationStatus === 'pending' || maps.moderationStatus === 'needs_revision';
});

const showThread = computed(
  () =>
    Boolean(maps.pendingRequestId) &&
    (maps.moderationStatus === 'pending' ||
      maps.moderationStatus === 'needs_revision' ||
      threadMessages.value.length > 0),
);

const canDelete = computed(() => {
  if (!maps.map || maps.map.hasLive || staffMode.value || viewOnly.value) return false;
  return Boolean(uid.value) && maps.map.createdBy === uid.value;
});

/** SC-MAP-48: Edit from View for creator or staff (when author request not blocking). */
const canEnterEditFromView = computed(() => {
  if (!viewOnly.value || !maps.map?.hasLive) return false;
  if (auth.isStaff) {
    const open =
      maps.map.authorRequestOpen ||
      maps.moderationStatus === 'pending' ||
      maps.moderationStatus === 'needs_revision';
    return !open;
  }
  if (auth.user?.anonymous) return false;
  return Boolean(uid.value) && maps.map.createdBy === uid.value;
});

function toolColor(tool: MapPaintTool) {
  if (tool === 'start') return 'positive';
  if (tool === 'finish') return 'warning';
  return 'brown';
}

function messageAuthorLabel(msg: ModerationMessage) {
  if (msg.authorKind === 'staff') return t('content.authorStaff');
  if (msg.authorUserId === uid.value) return t('content.authorYou');
  return t('content.authorUser');
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('ru-RU');
}

function checkGate(): boolean {
  if (auth.user?.anonymous) {
    gateMode.value = 'login';
    gateOpen.value = true;
    return false;
  }
  if (auth.needsEmailVerification) {
    gateMode.value = 'verify';
    gateOpen.value = true;
    return false;
  }
  return true;
}

function clearAutosaveTimer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function stopLockHeartbeat() {
  if (lockHeartbeat) {
    clearInterval(lockHeartbeat);
    lockHeartbeat = null;
  }
}

function startLockHeartbeat() {
  stopLockHeartbeat();
  if (!mapId.value || !lockHeld.value) return;
  lockHeartbeat = setInterval(() => {
    void maps.refreshEditLock(mapId.value).catch(() => {
      /* ignore */
    });
  }, LOCK_HEARTBEAT_MS);
}

async function persist(body: MapRevision, opts?: { quiet?: boolean }) {
  if (staffMode.value) {
    return maps.staffSaveMap(mapId.value, body, opts);
  }
  return maps.saveDraft(mapId.value, body, opts);
}

function scheduleAutosave() {
  if (suppressAutosave || viewOnly.value || gateOpen.value || !local.value) return;
  clearAutosaveTimer();
  autosaveTimer = setTimeout(() => {
    void flushAutosave();
  }, AUTOSAVE_MS);
}

async function flushAutosave() {
  clearAutosaveTimer();
  if (!local.value || viewOnly.value || gateOpen.value || !mapId.value) return;
  try {
    const saved = await persist(local.value, { quiet: true });
    suppressAutosave = true;
    local.value = { ...saved };
    suppressAutosave = false;
  } catch {
    suppressAutosave = false;
  }
}

function onCellClick(index: number) {
  if (viewOnly.value || gateOpen.value || !local.value) return;
  if (!staffMode.value && !checkGate()) return;
  local.value = {
    ...local.value,
    grid: paintCell(local.value.grid, index, selectedTool.value),
  };
  scheduleAutosave();
}

function onSeatsChange() {
  if (!local.value || viewOnly.value || gateOpen.value) return;
  local.value = {
    ...local.value,
    players: clampSeatCount(Number(local.value.players)),
    touristsPerPlayer: clampSeatCount(Number(local.value.touristsPerPlayer)),
  };
  scheduleAutosave();
}

async function loadThread() {
  if (!mapId.value || !maps.pendingRequestId) {
    threadMessages.value = [];
    return;
  }
  try {
    const data = await maps.loadModeration(mapId.value);
    threadMessages.value = data.messages ?? [];
  } catch {
    threadMessages.value = [];
  }
}

async function onSubmit() {
  if (!canSubmit.value || !mapId.value) return;
  if (!checkGate()) return;
  try {
    await flushAutosave();
    await maps.submitMap(mapId.value);
    await loadThread();
  } catch {
    /* error in store */
  }
}

async function onCancelRequest() {
  if (!maps.pendingRequestId) return;
  try {
    await maps.cancelRequest(maps.pendingRequestId);
    threadMessages.value = [];
  } catch {
    /* error in store → maps.error banner */
  }
}

async function onReply() {
  if (!mapId.value || !replyBody.value.trim()) return;
  try {
    const data = await maps.postModerationMessage(mapId.value, replyBody.value.trim());
    threadMessages.value = data.messages ?? [];
    replyBody.value = '';
    await nextTick();
    replyFormRef.value?.resetValidation();
  } catch {
    /* error in store */
  }
}

async function onDelete() {
  if (!mapId.value) return;
  try {
    await maps.deleteUnpublishedMap(mapId.value);
    deleteConfirmOpen.value = false;
    await router.replace({ name: 'content-maps' });
  } catch {
    /* error in store */
  }
}

async function enterStaffEdit() {
  if (!mapId.value) return;
  await maps.acquireEditLock(mapId.value);
  await maps.loadStaffEdit(mapId.value);
  staffMode.value = true;
  viewOnly.value = false;
  lockHeld.value = true;
  local.value = maps.draft ? { ...maps.draft } : null;
  startLockHeartbeat();
}

async function enterAuthorEdit() {
  if (!mapId.value) return;
  if (!checkGate()) return;
  await maps.loadDraft(mapId.value);
  await maps.acquireEditLock(mapId.value);
  lockHeld.value = true;
  startLockHeartbeat();
  staffMode.value = false;
  viewOnly.value = false;
  local.value = maps.draft ? { ...maps.draft } : null;
  await loadThread();
}

async function onEnterEditFromView() {
  if (!canEnterEditFromView.value) return;
  try {
    if (auth.isStaff) {
      await enterStaffEdit();
      if (route.query.staff !== '1') {
        await router.replace({
          name: 'content-map-edit',
          params: { id: mapId.value },
          query: { staff: '1' },
        });
      }
      return;
    }
    await enterAuthorEdit();
    if (route.query.edit !== '1') {
      await router.replace({
        name: 'content-map-edit',
        params: { id: mapId.value },
        query: { edit: '1' },
      });
    }
  } catch {
    /* error in store (edit_locked / author_request_open) */
  }
}

async function enterViewOnly() {
  await maps.loadLiveMap(mapId.value);
  staffMode.value = false;
  viewOnly.value = true;
  lockHeld.value = false;
  local.value = maps.liveContent ? { ...maps.liveContent } : null;
}

async function boot() {
  if (!mapId.value) {
    await router.replace({ name: 'content-maps' });
    return;
  }

  const wantStaff = route.query.staff === '1' && auth.isStaff;
  const wantAuthorEdit = route.query.edit === '1';

  if (wantStaff) {
    try {
      await enterStaffEdit();
      return;
    } catch {
      // author_request_open / edit_locked — back to list
      await router.replace({ name: 'content-maps' });
      return;
    }
  }

  if (wantAuthorEdit) {
    try {
      await enterAuthorEdit();
      return;
    } catch {
      await router.replace({ name: 'content-maps' });
      return;
    }
  }

  // Default open: never-published → Edit; published → View (SC-MAP-46/49).
  try {
    await maps.loadDraft(mapId.value);
    if (!maps.map?.hasLive) {
      staffMode.value = false;
      viewOnly.value = false;
      local.value = maps.draft ? { ...maps.draft } : null;
      if (!checkGate()) {
        /* gate dialog */
      }
      await loadThread();
      return;
    }
    // Published map with working draft available — still open View first (D17).
  } catch {
    /* fall through to live view-only */
  }

  try {
    await enterViewOnly();
  } catch {
    await router.replace({ name: 'content-maps' });
  }
}

onMounted(() => {
  void boot();
});

watch(mapId, () => {
  void boot();
});

onBeforeRouteLeave(() => {
  clearAutosaveTimer();
  stopLockHeartbeat();
  if (lockHeld.value && mapId.value) {
    void maps.releaseEditLock(mapId.value).catch(() => {
      /* ignore */
    });
    lockHeld.value = false;
  }
});

onBeforeUnmount(() => {
  clearAutosaveTimer();
  stopLockHeartbeat();
  if (lockHeld.value && mapId.value) {
    void maps.releaseEditLock(mapId.value).catch(() => {
      /* ignore */
    });
  }
});
</script>

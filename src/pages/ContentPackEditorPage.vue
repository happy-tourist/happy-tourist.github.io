<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.editorTitle') }}</div>
        <div class="text-subtitle2 text-muted">
          <template v-if="content.pendingRequestId && content.isPendingAuthor">
            {{ $t('content.statusPendingAuthor') }}
          </template>
          <template v-else-if="content.pack?.blocked">
            {{ $t('content.blocked') }}
          </template>
          <template v-else>
            {{ $t('content.editorSubtitle') }}
          </template>
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
        <q-btn
          v-if="content.pendingRequestId"
          flat
          :label="$t('content.moderationThread')"
          :to="{ name: 'content-pack-moderation', params: { id: packId } }"
        />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !local" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="local">
      <q-card flat bordered class="q-mb-lg">
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="local.title"
            outlined
            dense
            :label="$t('content.packTitle')"
            :disable="readOnly"
          />
          <q-input
            v-model="local.description"
            type="textarea"
            outlined
            dense
            autogrow
            :label="$t('content.packDescription')"
            :disable="readOnly"
          />
        </q-card-section>
      </q-card>

      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6">{{ $t('content.answerCards') }}</div>
        <q-btn
          flat
          dense
          icon="add"
          :label="$t('content.addCard')"
          :disable="readOnly"
          @click="addCard"
        />
      </div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="(card, ci) in local.answerCards" :key="card.id">
          <q-item-section>
            <q-input
              v-model="card.content"
              outlined
              dense
              class="q-mb-sm"
              :label="$t('content.cardContent')"
              :disable="readOnly"
              @update:model-value="(v) => onCardContentChange(card.id, String(v ?? ''))"
            />
            <q-input
              v-model="card.description"
              outlined
              dense
              :label="$t('content.cardDescription')"
              :disable="readOnly"
            />
          </q-item-section>
          <q-item-section side top>
            <div class="column q-gutter-xs">
              <q-btn
                flat
                dense
                icon="touch_app"
                :disable="readOnly || !activeTask"
                :aria-label="$t('content.fillSlot')"
                @click="fillNextSlot(card.id)"
              />
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                :disable="readOnly"
                @click="removeCard(ci)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!local.answerCards.length">
          <q-item-section class="text-muted">{{ $t('content.emptyCards') }}</q-item-section>
        </q-item>
      </q-list>

      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6">{{ $t('content.tasks') }}</div>
        <q-btn
          flat
          dense
          icon="add"
          :label="$t('content.addTask')"
          :disable="readOnly"
          @click="addTask"
        />
      </div>

      <div
        v-for="(task, ti) in allTasks"
        :key="task.id"
        class="q-mb-md"
        :class="{ 'bg-grey-2': activeTaskId === task.id }"
      >
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1">{{ $t('content.taskN', { n: ti + 1 }) }}</div>
              <q-space />
              <q-btn
                flat
                dense
                :label="
                  activeTaskId === task.id ? $t('content.slotTargetOn') : $t('content.slotTarget')
                "
                :color="activeTaskId === task.id ? 'primary' : undefined"
                :disable="readOnly"
                @click="activeTaskId = task.id"
              />
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                :disable="readOnly"
                @click="removeTask(ti)"
              />
            </div>
            <q-input
              v-model="task.question"
              outlined
              dense
              class="q-mb-sm"
              :label="$t('content.question')"
              :disable="readOnly"
            />
            <q-select
              v-model="task.difficulty"
              :options="difficultyOptions"
              emit-value
              map-options
              outlined
              dense
              class="q-mb-sm"
              :label="$t('content.difficultyLabel')"
              :disable="readOnly"
            />
            <div class="row items-center q-mb-xs">
              <div class="text-caption">{{ $t('content.slots') }}</div>
              <q-space />
              <q-btn
                flat
                dense
                round
                icon="remove"
                :disable="readOnly || task.slots.length <= 1"
                @click="removeSlot(task)"
              />
              <q-btn flat dense round icon="add" :disable="readOnly" @click="addSlot(task)" />
            </div>
            <div class="row q-gutter-sm">
              <q-chip
                v-for="slot in task.slots"
                :key="slot.id"
                clickable
                :outline="!slot.answerCardId"
                :color="slot.answerCardId ? 'primary' : 'grey'"
                :disable="readOnly"
                @click="clearSlot(slot)"
              >
                {{ slotLabel(slot) }}
              </q-chip>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="row q-gutter-sm q-mt-lg">
        <q-btn
          color="primary"
          :label="$t('content.saveDraft')"
          :loading="content.loading"
          :disable="readOnly"
          @click="onSave"
        />
        <q-btn
          color="secondary"
          :label="$t('content.submitModeration')"
          :loading="content.loading"
          :disable="readOnly || !canSubmitLocal"
          @click="onSubmit"
        />
      </div>
      <div v-if="!canSubmitLocal" class="text-caption text-muted q-mt-sm">
        {{ $t('content.submitHint') }}
      </div>
    </template>

    <q-dialog v-model="gateOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('content.gateLogin')"
            :to="{ name: 'login', query: { redirect: editPath } }"
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  newLocalId,
  useContentStore,
  type ContentTask,
  type Difficulty,
  type PackContent,
  type TaskSlot,
} from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const { t } = useI18n();

const packId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});
const editPath = computed(() => `/content/packs/${packId.value}/edit`);
const local = ref<PackContent | null>(null);
const activeTaskId = ref<string | null>(null);
const previousCardContent = ref<Map<string, string>>(new Map());
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');

const difficultyOptions = computed(() =>
  ([1, 2, 3] as Difficulty[]).map((value) => ({
    label: t(`content.difficulty.${value}`),
    value,
  })),
);

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

const readOnly = computed(() => Boolean(content.pack?.blocked) || Boolean(gateOpen.value));

const allTasks = computed(() => {
  if (!local.value) return [] as ContentTask[];
  const tasks: ContentTask[] = [];
  for (const ts of local.value.taskSets) {
    tasks.push(...ts.tasks);
  }
  return tasks;
});

const activeTask = computed(() => allTasks.value.find((t) => t.id === activeTaskId.value) ?? null);

const canSubmitLocal = computed(() => {
  if (!local.value) return false;
  if (local.value.answerCards.length < 2) return false;
  if (allTasks.value.length < 2) return false;
  for (const task of allTasks.value) {
    if (!task.slots.length || task.slots.some((s) => !s.answerCardId)) return false;
    if (![1, 2, 3].includes(task.difficulty)) return false;
  }
  return true;
});

function snapshotCardContent(draft: PackContent) {
  previousCardContent.value = new Map(draft.answerCards.map((c) => [c.id, c.content]));
}

function ensureTaskSet(): PackContent['taskSets'][0] {
  if (!local.value) throw new Error('no draft');
  if (!local.value.taskSets.length) {
    local.value.taskSets.push({
      id: newLocalId('ts'),
      authorUserId: String(auth.user?.id ?? ''),
      coauthorLabels: [],
      tasks: [],
    });
  }
  const ts = local.value.taskSets[0];
  if (!ts) throw new Error('no task set');
  return ts;
}

function addCard() {
  if (!local.value || readOnly.value) return;
  local.value.answerCards.push({
    id: newLocalId('card'),
    content: '',
    description: '',
  });
}

function removeCard(index: number) {
  if (!local.value || readOnly.value) return;
  const [removed] = local.value.answerCards.splice(index, 1);
  if (!removed) return;
  for (const task of allTasks.value) {
    for (const slot of task.slots) {
      if (slot.answerCardId === removed.id) {
        slot.answerCardId = null;
      }
    }
  }
  previousCardContent.value.delete(removed.id);
}

function onCardContentChange(cardId: string, next: string) {
  const prev = previousCardContent.value.get(cardId);
  if (prev !== undefined && prev !== next) {
    for (const task of allTasks.value) {
      for (const slot of task.slots) {
        if (slot.answerCardId === cardId) {
          slot.answerCardId = null;
        }
      }
    }
  }
  previousCardContent.value.set(cardId, next);
}

function addTask() {
  if (!local.value || readOnly.value) return;
  const ts = ensureTaskSet();
  const task: ContentTask = {
    id: newLocalId('task'),
    question: '',
    difficulty: 1,
    slots: [{ id: newLocalId('slot'), answerCardId: null }],
  };
  ts.tasks.push(task);
  activeTaskId.value = task.id;
}

function removeTask(globalIndex: number) {
  if (!local.value || readOnly.value) return;
  let remaining = globalIndex;
  for (const ts of local.value.taskSets) {
    if (remaining < ts.tasks.length) {
      const [removed] = ts.tasks.splice(remaining, 1);
      if (removed && activeTaskId.value === removed.id) {
        activeTaskId.value = null;
      }
      return;
    }
    remaining -= ts.tasks.length;
  }
}

function addSlot(task: ContentTask) {
  if (readOnly.value) return;
  task.slots.push({ id: newLocalId('slot'), answerCardId: null });
}

function removeSlot(task: ContentTask) {
  if (readOnly.value || task.slots.length <= 1) return;
  task.slots.pop();
}

function clearSlot(slot: TaskSlot) {
  if (readOnly.value) return;
  slot.answerCardId = null;
}

function fillNextSlot(cardId: string) {
  if (readOnly.value) return;
  const task = activeTask.value;
  if (!task) return;
  const empty = task.slots.find((s) => !s.answerCardId);
  if (empty) {
    empty.answerCardId = cardId;
  }
}

function slotLabel(slot: TaskSlot) {
  if (!slot.answerCardId || !local.value) {
    return t('content.slotEmpty');
  }
  const card = local.value.answerCards.find((c) => c.id === slot.answerCardId);
  return card?.content?.trim() || t('content.slotFilled');
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

async function load() {
  if (!packId.value) return;
  if (!checkGate()) return;
  try {
    const data = await content.loadDraft(packId.value);
    local.value = JSON.parse(JSON.stringify(data.draft)) as PackContent;
    if (!local.value.taskSets.length) {
      local.value.taskSets = [
        {
          id: newLocalId('ts'),
          authorUserId: String(auth.user?.id ?? ''),
          coauthorLabels: [],
          tasks: [],
        },
      ];
    }
    snapshotCardContent(local.value);
    activeTaskId.value = allTasks.value[0]?.id ?? null;
  } catch {
    /* error in store */
  }
}

onMounted(load);
watch(packId, load);

async function onSave() {
  if (!local.value || !checkGate()) return;
  try {
    const saved = await content.saveDraft(packId.value, local.value);
    local.value = JSON.parse(JSON.stringify(saved)) as PackContent;
    snapshotCardContent(local.value);
  } catch {
    /* error in store */
  }
}

async function onSubmit() {
  if (!local.value || !checkGate()) return;
  try {
    await content.saveDraft(packId.value, local.value);
    await content.submitPack(packId.value);
  } catch {
    /* error in store */
  }
}
</script>

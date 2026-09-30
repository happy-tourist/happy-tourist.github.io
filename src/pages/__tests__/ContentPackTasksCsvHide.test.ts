import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackTasksPage from '@/pages/ContentPackTasksPage.vue';
import type { PackContent } from '@/stores/content';

const routeState = vi.hoisted(() => ({
  query: {},
}));

const {
  liveBody,
  contentState,
  authState,
  loadLivePack,
  loadDraft,
  acquireEditLock,
  loadStaffEdit,
} = vi.hoisted(() => {
  const liveBody: PackContent = {
    title: 'Live Pack',
    description: '',
    answerCards: [
      { id: 'c1', content: 'Paris', description: '' },
      { id: 'c2', content: 'Rome', description: '' },
    ],
    taskSets: [
      {
        id: 'ts1',
        authorUserId: 'u1',
        authorDisplayName: 'Author',
        coauthorLabels: [],
        inCatalog: true,
        tasks: [
          {
            id: 't1',
            question: 'Capital?',
            difficulty: 1,
            slots: [{ id: 's1', answerCardId: 'c1' }],
          },
        ],
      },
    ],
  };
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'Live Pack',
      description: '',
      blocked: false,
      hasLive: true,
      createdBy: 'u1',
      inCatalog: true,
    },
    draft: null as PackContent | null,
    staffEditTarget: null as 'live' | 'working' | null,
    moderationStatus: null as string | null,
    taskHasCascadeGap: () => false,
    pruneCascadeGaps: vi.fn(),
  };
  const authState = {
    user: { id: 'u2', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    liveBody,
    contentState,
    authState,
    loadLivePack: vi.fn().mockResolvedValue({ content: structuredClone(liveBody) }),
    loadDraft: vi.fn(),
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    loadStaffEdit: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({
      params: { id: 'p1', taskSetId: 'ts1' },
      query: routeState.query,
      path: '/content/packs/p1/tasks/ts1',
    }),
    onBeforeRouteLeave: vi.fn(),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}));

vi.mock('@/stores/content', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useContentStore: vi.fn(() => ({
      ...contentState,
      loadLivePack,
      loadDraft,
      acquireEditLock,
      loadStaffEdit,
      staffSavePack: vi.fn(),
      saveDraft: vi.fn(),
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      deleteTaskSet: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable'],
    template: '<button type="button" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span><slot /></span>' },
  'q-banner': true,
  'q-badge': true,
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form @submit.prevent><slot /></form>' },
  'q-input': true,
  'q-select': true,
  'q-space': true,
  'q-dialog': { template: '<div><slot /></div>' },
  PackTasksCsvControls: {
    name: 'PackTasksCsvControls',
    template: '<div data-testid="pack-tasks-csv-controls" />',
  },
  PackTaskTile: true,
  PackAnswerCardTile: true,
};

const appScss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../css/app.scss'),
  'utf8',
);
const tasksPageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../ContentPackTasksPage.vue'),
  'utf8',
);
const addTaskSetSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../ContentPackAddTaskSetPage.vue'),
  'utf8',
);

describe('ContentPackTasksPage CSV hide (SC-PACK-235/236)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.pack.hasLive = true;
    contentState.draft = null;
    contentState.staffEditTarget = null;
    authState.isStaff = false;
    authState.user = { id: 'u2', anonymous: false };
    authState.needsEmailVerification = false;
    routeState.query = {};
    loadLivePack.mockClear();
    loadLivePack.mockResolvedValue({ content: structuredClone(liveBody) });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-235: live view-only does not render PackTasksCsvControls', async () => {
    const wrapper = shallowMount(ContentPackTasksPage, { global: { stubs } });
    await flushPromises();

    expect(loadLivePack).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="pack-tasks-csv-controls"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'PackTasksCsvControls' }).exists()).toBe(false);
  });

  it('SC-PACK-236: staff Edit keeps PackTasksCsvControls', async () => {
    authState.isStaff = true;
    authState.user = { id: 's1', anonymous: false };
    contentState.staffEditTarget = 'live';
    contentState.draft = structuredClone(liveBody);

    const wrapper = shallowMount(ContentPackTasksPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="pack-tasks-csv-controls"]').exists()).toBe(true);
  });
});

describe('compose slot chrome (SC-PACK-237)', () => {
  it('Tasks + AddTaskSet compose rows use peek-slot-like chrome with peek sizes', () => {
    expect(tasksPageSrc).toMatch(/data-testid="compose-slot-row"/);
    expect(tasksPageSrc).toMatch(/peek-slot-like/);
    expect(tasksPageSrc).toMatch(/peek-slot-like--filled/);
    expect(addTaskSetSrc).toMatch(/data-testid="compose-slot-row"/);
    expect(addTaskSetSrc).toMatch(/peek-slot-like/);
    expect(addTaskSetSrc).not.toMatch(/<q-chip[\s\S]*taskForm\.slots/);
    expect(appScss).toMatch(/\.peek-slot-like\s*\{[^}]*min-width:\s*72px/s);
    expect(appScss).toMatch(/\.peek-slot-like\s*\{[^}]*min-height:\s*40px/s);
    expect(appScss).toMatch(/\.peek-slot-like--filled\s*\{[^}]*border-style:\s*solid/s);
  });

  it('staff Edit compose surface mounts peek-slot-like slots', async () => {
    authState.isStaff = true;
    contentState.staffEditTarget = 'live';
    contentState.draft = structuredClone(liveBody);

    const wrapper = shallowMount(ContentPackTasksPage, { global: { stubs } });
    await flushPromises();

    const row = wrapper.find('[data-testid="compose-slot-row"]');
    expect(row.exists()).toBe(true);
    const slots = row.findAll('[data-testid="peek-slot-like"]');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.classes()).toContain('peek-slot-like');
  });
});

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PackTasksCsvControls from '@/components/PackTasksCsvControls.vue';
import type { AnswerCard, ContentTask } from '@/stores/content';

const cards: AnswerCard[] = [
  { id: 'c1', content: 'Paris', description: '' },
  { id: 'c2', content: 'Rome', description: '' },
];

const existingTasks: ContentTask[] = [
  {
    id: 't1',
    question: 'Capital?',
    difficulty: 2,
    slots: [{ id: 's1', answerCardId: 'c1' }],
  },
];

const stubs = {
  'q-btn': {
    props: ['label', 'disable', 'icon'],
    template:
      '<button type="button" :disabled="disable" :data-label="label" :data-icon="icon" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
  },
  'q-banner': {
    template: '<div class="banner-stub" data-testid="csv-import-error"><slot /></div>',
  },
  'q-card': { template: '<div data-testid="csv-controls-frame"><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
};

function mountControls(
  props: Partial<{
    tasks: ContentTask[];
    answerCards: AnswerCard[];
    packTitle: string;
    setNumber: number;
    readOnly: boolean;
    ready: boolean;
  }> = {},
) {
  return shallowMount(PackTasksCsvControls, {
    props: {
      tasks: existingTasks,
      answerCards: cards,
      packTitle: 'My Pack / v1',
      setNumber: 2,
      readOnly: false,
      ready: true,
      ...props,
    },
    global: {
      stubs,
    },
  });
}

async function pickImportFile(
  wrapper: ReturnType<typeof mountControls>,
  file: File | { text: () => Promise<string> },
) {
  const importBtn = wrapper
    .findAll('button')
    .find((b) => b.attributes('data-label') === 'content.importTasksCsv');
  expect(importBtn).toBeTruthy();
  await importBtn!.trigger('click');
  await flushPromises();

  expect(wrapper.find('[data-testid="csv-controls-frame"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="csv-import-dialog"]').exists()).toBe(false);
  expect(wrapper.text()).toContain('content.csvTasksFormatExample');

  const fileInput = wrapper.find('[data-testid="csv-import-file-input"]');
  expect(fileInput.exists()).toBe(true);
  Object.defineProperty(fileInput.element, 'files', {
    value: [file],
    configurable: true,
  });
  await fileInput.trigger('change');
  await flushPromises();
}

describe('PackTasksCsvControls (SC-PACK-213…221)', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock');
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('SC-PACK-213: export downloads CSV named {title}-tasks-{n}.csv', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const wrapper = mountControls();

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.exportTasksCsv');
    expect(exportBtn).toBeTruthy();
    await exportBtn!.trigger('click');

    expect(createObjectURL).toHaveBeenCalled();
    const blobArg = createObjectURL.mock.calls[0]![0] as Blob;
    const text = await blobArg.text();
    expect(text).toBe('Capital?;2;Paris');

    clickSpy.mockRestore();
    const createSpy = vi.spyOn(document, 'createElement');
    await exportBtn!.trigger('click');
    const anchorCalls = createSpy.mock.results
      .map((r) => r.value as HTMLElement)
      .filter((el) => el?.tagName === 'A') as HTMLAnchorElement[];
    const last = anchorCalls[anchorCalls.length - 1];
    expect(last?.download).toBe('My_Pack_v1-tasks-2.csv');
    createSpy.mockRestore();
  });

  it('SC-PACK-220: export disabled when current set has zero tasks', () => {
    const wrapper = mountControls({ tasks: [] });
    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.exportTasksCsv');
    expect(exportBtn).toBeTruthy();
    expect(exportBtn!.attributes('disabled')).toBeDefined();
  });

  it('SC-PACK-221: Import opens file picker directly; format hint stays in frame', async () => {
    const wrapper = mountControls();
    const fileInput = wrapper.find('[data-testid="csv-import-file-input"]');
    const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click');

    const importBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.importTasksCsv');
    await importBtn!.trigger('click');
    await flushPromises();

    expect(clickSpy).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="csv-import-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="csv-controls-frame"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('content.csvTasksFormatExample');
    expect(wrapper.text()).toContain('content.csvTasksHint');
    clickSpy.mockRestore();
  });

  it('SC-PACK-214: import appends tasks with resolved slots and difficulty default 1', async () => {
    const wrapper = mountControls();
    const file = new File(['Q1;;Paris\nQ2;9;Rome'], 'tasks.csv', { type: 'text/csv' });
    await pickImportFile(wrapper, file);

    const appendEvents = wrapper.emitted('append');
    expect(appendEvents).toBeTruthy();
    expect(appendEvents!).toHaveLength(1);
    const appended = appendEvents![0]![0] as ContentTask[];
    expect(appended).toHaveLength(2);
    expect(appended[0]).toMatchObject({
      question: 'Q1',
      difficulty: 1,
      slots: [{ answerCardId: 'c1' }],
    });
    expect(appended[1]).toMatchObject({
      question: 'Q2',
      difficulty: 1,
      slots: [{ answerCardId: 'c2' }],
    });
    expect(appended[0]!.id).not.toBe('t1');
    // Success clears framed error (D6″)
    expect(wrapper.find('[data-testid="csv-import-error"]').exists()).toBe(false);
  });

  it('SC-PACK-215/218: missing slot texts keep framed error and emit nothing', async () => {
    const wrapper = mountControls();
    const file = new File(['Q1;1;Berlin\nQ2;2;Paris'], 'tasks.csv', { type: 'text/csv' });
    await pickImportFile(wrapper, file);

    expect(wrapper.emitted('append')).toBeUndefined();
    expect(wrapper.find('[data-testid="csv-controls-frame"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="csv-import-error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('content.csvTasksMissingAnswers');
  });

  it('D6″: empty CSV keeps framed error and emit nothing', async () => {
    const wrapper = mountControls();
    const file = new File(['\n'], 'empty.csv', { type: 'text/csv' });
    await pickImportFile(wrapper, file);

    expect(wrapper.emitted('append')).toBeUndefined();
    expect(wrapper.find('[data-testid="csv-controls-frame"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="csv-import-error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('content.csvImportFailed');
  });

  it('SC-PACK-216: import disabled when answer context is empty', () => {
    const wrapper = mountControls({ answerCards: [] });
    const importBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.importTasksCsv');
    expect(importBtn).toBeTruthy();
    expect(importBtn!.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('content.csvTasksNeedAnswers');
  });

  it('SC-PACK-217: import disabled when readOnly', () => {
    const wrapper = mountControls({ readOnly: true });
    const importBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.importTasksCsv');
    expect(importBtn!.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('content.csvTasksImportDisabled');
  });
});

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
      '<button type="button" :disabled="disable" :data-label="label" :data-icon="icon">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span class="tooltip-stub"><slot /></span>' },
  'q-banner': {
    template: '<div class="banner-stub"><slot /><slot name="action" /></div>',
  },
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
    global: { stubs },
  });
}

describe('PackTasksCsvControls (SC-PACK-213…218)', () => {
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
    // Re-run to inspect download name via createElement spy
    const createSpy = vi.spyOn(document, 'createElement');
    await exportBtn!.trigger('click');
    const anchorCalls = createSpy.mock.results
      .map((r) => r.value as HTMLElement)
      .filter((el) => el?.tagName === 'A') as HTMLAnchorElement[];
    const last = anchorCalls[anchorCalls.length - 1];
    expect(last?.download).toBe('My_Pack_v1-tasks-2.csv');
    createSpy.mockRestore();
  });

  it('SC-PACK-214: import appends tasks with resolved slots and difficulty default 1', async () => {
    const wrapper = mountControls();
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);

    const file = new File(['Q1;;Paris\nQ2;9;Rome'], 'tasks.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger('change');
    await flushPromises();

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
    expect(wrapper.find('.banner-stub').exists()).toBe(false);
  });

  it('SC-PACK-215/218: missing slot texts reject whole file and emit nothing', async () => {
    const wrapper = mountControls();
    const fileInput = wrapper.find('input[type="file"]');

    const file = new File(['Q1;1;Berlin\nQ2;2;Paris'], 'tasks.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger('change');
    await flushPromises();

    expect(wrapper.emitted('append')).toBeUndefined();
    expect(wrapper.text()).toContain('content.csvTasksMissingAnswers');
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

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SupportPage from '@/pages/SupportPage.vue';
import type { ContentPackSummary } from '@/stores/content';
import { SUPPORT_TOPICS } from '@/stores/support';

const {
  mockPush,
  authState,
  supportState,
  contentState,
  createTicket,
  listOwnTickets,
  listCatalog,
} = vi.hoisted(() => {
  const createTicket = vi.fn();
  const listOwnTickets = vi.fn().mockResolvedValue(undefined);
  const listCatalog = vi.fn().mockResolvedValue(undefined);
  return {
    mockPush: vi.fn(),
    authState: {
      displayName: 'Tester',
      isStaff: false,
      isAdmin: false,
      user: { id: 'u1', anonymous: false },
    },
    supportState: {
      error: null as string | null,
      loading: false,
      tickets: [] as unknown[],
      createTicket,
      listOwnTickets,
    },
    contentState: {
      catalog: [] as ContentPackSummary[],
      listCatalog,
      error: null as string | null,
    },
    createTicket,
    listOwnTickets,
    listCatalog,
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, replace: vi.fn() }),
    useRoute: () => ({ name: 'support', params: {}, query: {} }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}));

vi.mock('@/stores/support', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useSupportStore: vi.fn(() => supportState),
  };
});

vi.mock('@/stores/content', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useContentStore: vi.fn(() => contentState),
  };
});

describe('SupportPage change_pack (SC-SUP-27…29)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;

  beforeEach(() => {
    createTicket.mockReset();
    listOwnTickets.mockClear();
    listCatalog.mockClear();
    contentState.catalog = [];
    supportState.error = null;
    supportState.tickets = [];
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  function mountPage() {
    return shallowMount(SupportPage, {
      global: {
        directives: {
          ripple: () => undefined,
        },
        stubs: {
          'q-page': { template: '<div><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
          'q-form': {
            template: '<form @submit="forward"><slot /></form>',
            methods: {
              resetValidation: vi.fn(),
              forward(e: Event) {
                e?.preventDefault?.();
                // Parent listens with @submit.prevent — pass a real event.

                this.$emit('submit', e);
              },
            },
          },
          'q-select': {
            props: ['modelValue', 'options', 'label'],
            emits: ['update:modelValue'],
            template: `
              <div class="q-select-stub" :data-label="label">
                <button
                  v-for="opt in options"
                  :key="String(opt.value)"
                  type="button"
                  class="opt"
                  @click="$emit('update:modelValue', opt.value)"
                >
                  <span class="opt-title">{{ opt.title ?? opt.label }}</span>
                  <span v-if="opt.description" class="opt-desc">{{ opt.description }}</span>
                </button>
                <slot name="option" :opt="options[0]" :itemProps="{}" />
              </div>
            `,
          },
          'q-input': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', ($event.target).value)" />',
          },
          'q-btn': { template: '<button type="button"><slot /></button>' },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-icon': true,
        },
      },
    });
  }

  it('includes change_pack in SUPPORT_TOPICS allowlist', () => {
    expect(SUPPORT_TOPICS).toContain('change_pack');
  });

  it('SC-SUP-29: pack selector shows catalog title and description', async () => {
    contentState.catalog = [
      {
        id: 'pack-1',
        title: 'Городские легенды',
        description: 'Карточки про город',
        blocked: false,
        hasLive: true,
        createdBy: 'u0',
      },
    ];
    wrapper = mountPage();
    await flushPromises();

    // Switch to change_pack via topic select
    const topicSelect = wrapper.find('[data-test-id="support-topic"]');
    expect(topicSelect.exists()).toBe(true);
    await topicSelect.findAll('.opt')[SUPPORT_TOPICS.indexOf('change_pack')]!.trigger('click');
    await flushPromises();

    expect(listCatalog).toHaveBeenCalled();
    const packSelect = wrapper.find('[data-test-id="support-pack"]');
    expect(packSelect.exists()).toBe(true);
    expect(packSelect.text()).toContain('Городские легенды');
    expect(packSelect.text()).toContain('Карточки про город');
  });

  it('SC-SUP-27: create with selected pack passes packId', async () => {
    contentState.catalog = [
      {
        id: 'pack-live',
        title: 'Live pack',
        description: 'Desc',
        blocked: false,
        hasLive: true,
        createdBy: 'u0',
      },
    ];
    createTicket.mockResolvedValueOnce({ id: 't1', topic: 'change_pack', packId: 'pack-live' });

    wrapper = mountPage();
    await flushPromises();

    const topicSelect = wrapper.find('[data-test-id="support-topic"]');
    await topicSelect.findAll('.opt')[SUPPORT_TOPICS.indexOf('change_pack')]!.trigger('click');
    await flushPromises();

    const packSelect = wrapper.find('[data-test-id="support-pack"]');
    await packSelect.find('.opt').trigger('click');
    await flushPromises();

    const body = wrapper.find('[data-test-id="support-body"]');
    await body.setValue('Нужно изменить карточки');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createTicket).toHaveBeenCalledWith('change_pack', 'Нужно изменить карточки', {
      packId: 'pack-live',
    });
    expect(mockPush).toHaveBeenCalledWith({ name: 'support-ticket', params: { id: 't1' } });
  });

  it('SC-SUP-28: change_pack without pack does not send packId', async () => {
    contentState.catalog = [
      {
        id: 'pack-live',
        title: 'Live pack',
        description: 'Desc',
        blocked: false,
        hasLive: true,
        createdBy: 'u0',
      },
    ];
    createTicket.mockResolvedValueOnce({ id: 't2' });

    wrapper = mountPage();
    await flushPromises();

    const topicSelect = wrapper.find('[data-test-id="support-topic"]');
    await topicSelect.findAll('.opt')[SUPPORT_TOPICS.indexOf('change_pack')]!.trigger('click');
    await flushPromises();

    const body = wrapper.find('[data-test-id="support-body"]');
    await body.setValue('Без выбора пака');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // With stubbed form (no Quasar rules), create may still fire without packId —
    // assert we do not invent a packId when none selected.
    expect(createTicket).toHaveBeenCalledWith('change_pack', 'Без выбора пака', undefined);
  });
});

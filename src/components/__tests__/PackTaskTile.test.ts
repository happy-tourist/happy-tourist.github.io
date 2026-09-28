import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackTaskTile from '@/components/PackTaskTile.vue';

const stubs = {
  'q-btn': {
    emits: ['click'],
    template: '<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  },
  'q-badge': {
    template: '<span class="q-badge-stub" v-bind="$attrs"><slot /></span>',
  },
  'q-tooltip': { template: '<span><slot /></span>' },
};

describe('PackTaskTile (SC-PACK-223/224)', () => {
  it('shows question, difficulty top-left, and slot labels below', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Capital of France?',
        difficulty: 2,
        slotLabels: ['Paris', 'Lyon'],
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-task-tile"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Capital of France?');
    expect(wrapper.find('[data-testid="pack-task-tile-difficulty"]').text()).toContain('2');
    expect(wrapper.find('.pack-task-tile__slots').text()).toContain('Paris');
    expect(wrapper.find('.pack-task-tile__slots').text()).toContain('Lyon');
  });

  it('editable shows pencil and delete; body has no edit-on-click', async () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        slotLabels: ['A'],
        editable: true,
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-task-tile-edit"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-tile-delete"]').exists()).toBe(true);

    await wrapper.trigger('click');
    expect(wrapper.emitted('edit')).toBeUndefined();

    await wrapper.find('[data-testid="pack-task-tile-edit"]').trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);
  });

  it('read-only omits edit/delete controls', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 3,
        slotLabels: [],
        editable: false,
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-task-tile-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="pack-task-tile-delete"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('content.slotEmpty');
  });
});

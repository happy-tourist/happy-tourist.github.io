import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackAnswerCardTile from '@/components/PackAnswerCardTile.vue';

const stubs = {
  'q-btn': {
    emits: ['click'],
    template: '<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  },
};

describe('PackAnswerCardTile (SC-PACK-222/224)', () => {
  it('splits content and description; long description region scrolls', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: {
        content: 'Paris',
        description: 'Capital of France\n'.repeat(20),
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-answer-tile"]').exists()).toBe(true);
    expect(wrapper.classes()).not.toContain('pack-answer-tile--short');
    expect(wrapper.text()).toContain('Paris');
    expect(wrapper.find('.pack-answer-tile__description').exists()).toBe(true);
    expect(wrapper.find('.pack-answer-tile__description').classes()).not.toContain('missing');
  });

  it('shortens tile when description is empty', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Rome', description: '' },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('pack-answer-tile--short');
    expect(wrapper.find('.pack-answer-tile__description').exists()).toBe(false);
  });

  it('editable shows pencil and delete; body click does not emit edit', async () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Berlin', description: 'City', editable: true },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-answer-tile-edit"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-answer-tile-delete"]').exists()).toBe(true);

    await wrapper.trigger('click');
    expect(wrapper.emitted('edit')).toBeUndefined();

    await wrapper.find('[data-testid="pack-answer-tile-edit"]').trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);

    await wrapper.find('[data-testid="pack-answer-tile-delete"]').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('read-only omits edit/delete; selectable emits select on body click', async () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: {
        content: 'Madrid',
        description: '',
        editable: false,
        selectable: true,
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-answer-tile-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="pack-answer-tile-delete"]').exists()).toBe(false);

    await wrapper.trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
  });
});

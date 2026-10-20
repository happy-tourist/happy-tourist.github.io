import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackAnswerCardTile from '@/components/PackAnswerCardTile.vue';

const stubs = {
  'q-btn': {
    props: ['label', 'icon', 'outline', 'dense', 'color'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :class="$attrs.class" :data-icon="icon" :data-outline="outline ? \'true\' : undefined" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../PackAnswerCardTile.vue'),
  'utf8',
);

describe('PackAnswerCardTile (SC-PACK-222/224/225/227/282/283)', () => {
  it('with description: content top + description bottom (column, no horizontal splitter) (SC-PACK-222/282)', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: {
        content: 'Paris',
        description: 'Capital of France\n'.repeat(20),
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-answer-tile"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Paris');
    expect(wrapper.find('.pack-answer-tile__description').exists()).toBe(true);
    expect(wrapper.find('.pack-answer-tile__body--with-desc').exists()).toBe(true);
    expect(wrapper.classes()).not.toContain('pack-answer-tile--short');
    expect(vueSrc).not.toMatch(/border-left:/);
    expect(vueSrc).toMatch(/\.pack-answer-tile__body\s*\{[^}]*flex-direction:\s*column/s);
  });

  it('without description: content centered; description node omitted (SC-PACK-282)', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Rome', description: '' },
      global: { stubs },
    });

    expect(wrapper.find('.pack-answer-tile__body--no-desc').exists()).toBe(true);
    expect(wrapper.find('.pack-answer-tile__description').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('pack-answer-tile--short');
  });

  it('editable shows bottom full-width outline+icon Edit/Delete; label content.edit (SC-PACK-224/283)', async () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Berlin', description: 'City', editable: true },
      global: { stubs },
    });

    const editBtn = wrapper.find('[data-testid="pack-answer-tile-edit"]');
    const deleteBtn = wrapper.find('[data-testid="pack-answer-tile-delete"]');
    expect(editBtn.exists()).toBe(true);
    expect(deleteBtn.exists()).toBe(true);
    expect(editBtn.classes()).toContain('full-width');
    expect(deleteBtn.classes()).toContain('full-width');
    expect(editBtn.attributes('data-icon')).toBe('edit');
    expect(deleteBtn.attributes('data-icon')).toBe('delete');
    expect(editBtn.text()).toContain('content.edit');
    expect(editBtn.text()).not.toContain('content.editCard');
    expect(wrapper.find('.pack-answer-tile__actions').exists()).toBe(true);
    expect(vueSrc).toMatch(/\$t\(['"]content\.edit['"]\)/);
    expect(vueSrc).not.toMatch(/\$t\(['"]content\.editCard['"]\)/);
    expect(vueSrc).toMatch(/icon=["']edit["']/);
    expect(vueSrc).toMatch(/icon=["']delete["']/);
    expect(vueSrc).toMatch(/<q-btn[^>]*\n\s*outline/s);
    expect(vueSrc).toMatch(/--pack-card-action-h/);
    expect(vueSrc).not.toMatch(/<q-btn[^>]*\n\s*flat/s);

    await wrapper.trigger('click');
    expect(wrapper.emitted('edit')).toBeUndefined();

    await editBtn.trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);

    await deleteBtn.trigger('click');
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

  it('uses one portrait size ≈156×206 with/without description (SC-PACK-225) — not 150/300×200', () => {
    const withDesc = mount(PackAnswerCardTile, {
      props: { content: 'Paris', description: 'Capital' },
      global: { stubs },
    });
    const withoutDesc = mount(PackAnswerCardTile, {
      props: { content: 'Rome', description: '' },
      global: { stubs },
    });

    expect(withDesc.find('.pack-answer-tile__description').exists()).toBe(true);
    expect(withoutDesc.find('.pack-answer-tile__description').exists()).toBe(false);
    expect(withDesc.classes()).not.toContain('pack-answer-tile--short');
    expect(withoutDesc.classes()).not.toContain('pack-answer-tile--short');

    expect(vueSrc).toMatch(/\.pack-answer-tile\s*\{[^}]*width:\s*156px/s);
    expect(vueSrc).toMatch(/\.pack-answer-tile\s*\{[^}]*min-height:\s*206px/s);
    expect(vueSrc).not.toMatch(/width:\s*300px/);
    expect(vueSrc).not.toMatch(/width:\s*150px/);
    expect(vueSrc).not.toMatch(/height:\s*200px/);
    expect(vueSrc).not.toMatch(/pack-answer-tile--short/);
    expect(vueSrc).toMatch(/\.pack-answer-tile__content\s*\{[^}]*font-size:\s*24px/s);
    expect(vueSrc).toMatch(/font-size:\s*0\.68rem/);
    expect(vueSrc).not.toMatch(/\.pack-answer-tile__content\s*\{[^}]*font-size:\s*0\.78rem/s);
  });

  it('SC-PACK-283: answer content is 24px (task/peek question parity)', () => {
    expect(vueSrc).toMatch(/\.pack-answer-tile__content\s*\{[^}]*font-size:\s*24px/s);
    expect(vueSrc).toMatch(/\.pack-answer-tile__content\s*\{[^}]*font-weight:\s*600/s);
  });

  it('uses shared --pack-card-* surface tokens for light/dark readability (SC-PACK-227)', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Berlin', description: 'City', editable: true },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-answer-tile-edit"]').exists()).toBe(true);
    expect(vueSrc).toMatch(/var\(--pack-card-bg\)/);
    expect(vueSrc).toMatch(/var\(--pack-card-fg\)/);
    expect(vueSrc).toMatch(/var\(--pack-card-muted\)/);
    expect(vueSrc).toMatch(/var\(--pack-card-border\)/);
    expect(vueSrc).not.toMatch(/--pack-tile-bg/);
    expect(vueSrc).not.toMatch(/var\(--q-card-background/);
  });
});

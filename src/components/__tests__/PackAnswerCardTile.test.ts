import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackAnswerCardTile from '@/components/PackAnswerCardTile.vue';

const stubs = {
  'q-btn': {
    props: ['label'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :class="$attrs.class" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../PackAnswerCardTile.vue'),
  'utf8',
);

describe('PackAnswerCardTile (SC-PACK-222/224/225/227)', () => {
  it('splits content and description vertically; long description region scrolls', () => {
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
    expect(wrapper.find('.pack-answer-tile__body').exists()).toBe(true);
  });

  it('shortens tile when description is empty', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Rome', description: '' },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('pack-answer-tile--short');
    expect(wrapper.find('.pack-answer-tile__description').exists()).toBe(false);
  });

  it('editable shows bottom full-width text Edit/Delete; body click does not emit edit', async () => {
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
    expect(editBtn.text().length).toBeGreaterThan(0);
    expect(deleteBtn.text().length).toBeGreaterThan(0);
    expect(wrapper.find('.pack-answer-tile__actions').exists()).toBe(true);
    expect(vueSrc).not.toMatch(/icon=["']edit["']/);
    expect(vueSrc).not.toMatch(/icon=["']delete["']/);

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

  it('uses fixed 150×200 without description and 300×200 with vertical splitter (SC-PACK-225)', () => {
    const withDesc = mount(PackAnswerCardTile, {
      props: { content: 'Paris', description: 'Capital' },
      global: { stubs },
    });
    const withoutDesc = mount(PackAnswerCardTile, {
      props: { content: 'Rome', description: '' },
      global: { stubs },
    });

    expect(withDesc.classes()).not.toContain('pack-answer-tile--short');
    expect(withoutDesc.classes()).toContain('pack-answer-tile--short');
    expect(withDesc.find('.pack-answer-tile__description').exists()).toBe(true);

    expect(vueSrc).toMatch(/\.pack-answer-tile\s*\{[^}]*width:\s*300px/s);
    expect(vueSrc).toMatch(/\.pack-answer-tile\s*\{[^}]*height:\s*200px/s);
    expect(vueSrc).toMatch(/\.pack-answer-tile--short\s*\{[^}]*width:\s*150px/s);
    expect(vueSrc).toMatch(/\.pack-answer-tile__description\s*\{[^}]*border-left:/s);
    expect(vueSrc).toMatch(/font-size:\s*1\.75rem/);
  });

  it('sets explicit light/dark bg, text, and edit control colors (SC-PACK-227)', () => {
    const wrapper = mount(PackAnswerCardTile, {
      props: { content: 'Berlin', description: 'City', editable: true },
      global: { stubs },
    });

    expect(wrapper.find('.pack-answer-tile__edit-btn').exists()).toBe(true);
    expect(vueSrc).toMatch(/--pack-tile-bg:\s*#ffffff/);
    expect(vueSrc).toMatch(/--pack-tile-fg:\s*rgba\(0,\s*0,\s*0/);
    expect(vueSrc).toMatch(/\.body--dark\s+\.pack-answer-tile\s*\{[^}]*--pack-tile-bg:\s*#2a2a2a/s);
    expect(vueSrc).toMatch(
      /\.body--dark\s+\.pack-answer-tile\s*\{[^}]*--pack-tile-fg:\s*rgba\(255/s,
    );
    expect(vueSrc).toMatch(
      /\.pack-answer-tile__edit-btn\s*\{[^}]*color:\s*var\(--pack-tile-edit\)/s,
    );
    expect(vueSrc).not.toMatch(/var\(--q-card-background/);
  });
});

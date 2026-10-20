import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackTaskTile from '@/components/PackTaskTile.vue';

const stubs = {
  'q-btn': {
    props: ['label'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :class="$attrs.class" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../PackTaskTile.vue'),
  'utf8',
);
const appScss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../css/app.scss'),
  'utf8',
);

describe('PackTaskTile (SC-PACK-223/224/226/227/238/278)', () => {
  it('shows question, dots+word badge header, and portrait filled slots (SC-PACK-223/278)', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Capital of France?',
        difficulty: 2,
        filledSlots: [{ content: 'Paris' }, { content: 'Lyon', description: 'city' }],
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-task-tile"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Capital of France?');
    expect(wrapper.find('[data-testid="pack-task-tile-difficulty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-tile-diff-badge"]').text()).toBe(
      'content.difficultyWord.2',
    );
    expect(wrapper.findAll('.peek-diff-dot')).toHaveLength(3);
    expect(wrapper.findAll('.peek-diff-dot--filled')).toHaveLength(2);
    expect(wrapper.find('[data-testid="pack-task-tile-slots"]').text()).toContain('Paris');
    expect(wrapper.find('[data-testid="pack-task-tile-slots"]').text()).toContain('Lyon');
    expect(wrapper.find('[data-testid="pack-task-tile-slots"]').text()).toContain('city');
    expect(wrapper.findAll('.pack-task-tile__slot')).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="peek-slot-like"]')).toHaveLength(2);
    expect(wrapper.findAll('[data-testid="peek-slot-like"]')[0]!.classes()).toContain(
      'peek-slot-like--portrait',
    );
    expect(wrapper.findAll('[data-testid="peek-slot-like"]')[0]!.classes()).toContain(
      'peek-slot-like--filled',
    );
    expect(vueSrc).toMatch(/\.pack-task-tile__slots\s*\{[^}]*overflow-x:\s*auto/s);
    expect(vueSrc).toMatch(/\.pack-task-tile__slots\s*\{[^}]*flex-wrap:\s*nowrap/s);
    // Portrait minis must not flex-shrink — otherwise overflow-x never scrolls (SC-PACK-278).
    expect(vueSrc).toMatch(/\.pack-task-tile__slot\s*\{[^}]*flex-shrink:\s*0/s);
    expect(vueSrc).not.toMatch(/border-left:/);
    expect(vueSrc).not.toMatch(/<q-badge/);
    expect(vueSrc).not.toMatch(/content\.difficulty\./);
    expect(vueSrc).not.toMatch(/<q-chip/);
  });

  it('SC-PACK-238: filled slots use peek portrait mini-card chrome; empty omitted', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        filledSlots: [{ content: 'A' }],
      },
      global: { stubs },
    });

    const slots = wrapper.findAll('[data-testid="peek-slot-like"]');
    expect(slots).toHaveLength(1);
    expect(slots[0]!.classes()).toContain('peek-slot-like');
    expect(slots[0]!.classes()).toContain('peek-slot-like--filled');
    expect(slots[0]!.classes()).toContain('peek-slot-like--portrait');
    expect(wrapper.text()).not.toMatch(/slotEmpty|пусто/i);
    expect(appScss).toMatch(/\.peek-slot-like--portrait/);
    expect(appScss).toMatch(
      /\.peek-slot-like--portrait\.peek-slot-like--filled[\s\S]*?border:\s*1px\s+solid\s+#1976d2/s,
    );
    expect(vueSrc).toMatch(/peek-slot-like--portrait/);
  });

  it('SC-PACK-278: zero filled slots omits slots row and slotEmpty body copy', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 3,
        filledSlots: [],
        editable: false,
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-task-tile-slots"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="peek-slot-like"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('content.slotEmpty');
    expect(wrapper.find('[data-testid="pack-task-tile-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="pack-task-tile-delete"]').exists()).toBe(false);
  });

  it('editable shows bottom full-width text Edit/Delete; body has no edit-on-click', async () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        filledSlots: [{ content: 'A' }],
        editable: true,
      },
      global: { stubs },
    });

    const editBtn = wrapper.find('[data-testid="pack-task-tile-edit"]');
    const deleteBtn = wrapper.find('[data-testid="pack-task-tile-delete"]');
    expect(editBtn.exists()).toBe(true);
    expect(deleteBtn.exists()).toBe(true);
    expect(editBtn.classes()).toContain('full-width');
    expect(deleteBtn.classes()).toContain('full-width');
    expect(editBtn.text().length).toBeGreaterThan(0);
    expect(wrapper.find('.pack-task-tile__actions').exists()).toBe(true);
    expect(vueSrc).not.toMatch(/icon=["']edit["']/);
    expect(vueSrc).not.toMatch(/icon=["']delete["']/);
    expect(vueSrc).toMatch(/--pack-card-action-h/);

    await wrapper.trigger('click');
    expect(wrapper.emitted('edit')).toBeUndefined();

    await editBtn.trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);
  });

  it('uses portrait pack-card size (SC-PACK-226) — not fixed 300×200', () => {
    mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        filledSlots: [{ content: 'A' }],
      },
      global: { stubs },
    });

    expect(vueSrc).toMatch(/\.pack-task-tile\s*\{[^}]*width:\s*168px/s);
    expect(vueSrc).toMatch(/\.pack-task-tile\s*\{[^}]*min-height:\s*206px/s);
    expect(vueSrc).not.toMatch(/width:\s*300px/);
    expect(vueSrc).not.toMatch(/height:\s*200px/);
    expect(vueSrc).toMatch(/font-size:\s*14px/);
  });

  it('sets pack-card surface + edit control colors (SC-PACK-227)', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        filledSlots: [{ content: 'A' }],
        editable: true,
      },
      global: { stubs },
    });

    expect(wrapper.find('.pack-task-tile__edit-btn').exists()).toBe(true);
    expect(vueSrc).toMatch(/background:\s*var\(--pack-card-bg\)/);
    expect(vueSrc).toMatch(/color:\s*var\(--pack-card-fg\)/);
    expect(vueSrc).toMatch(/border:\s*1px\s+solid\s+var\(--pack-card-border\)/);
    expect(vueSrc).toMatch(/\.pack-task-tile__edit-btn\s*\{[^}]*color:\s*var\(--pack-tile-edit\)/s);
    expect(vueSrc).not.toMatch(/var\(--q-card-background/);
  });
});

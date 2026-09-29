import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackTaskTile from '@/components/PackTaskTile.vue';

const stubs = {
  'q-btn': {
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :class="$attrs.class" @click="$emit(\'click\')"><slot /></button>',
  },
  'q-badge': {
    template: '<span class="q-badge-stub" v-bind="$attrs"><slot /></span>',
  },
  'q-tooltip': { template: '<span><slot /></span>' },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../PackTaskTile.vue'),
  'utf8',
);

describe('PackTaskTile (SC-PACK-223/224/226/227)', () => {
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

  it('uses fixed 200×200 size (SC-PACK-226)', () => {
    mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        slotLabels: ['A'],
      },
      global: { stubs },
    });

    expect(vueSrc).toMatch(/\.pack-task-tile\s*\{[^}]*width:\s*200px/s);
    expect(vueSrc).toMatch(/\.pack-task-tile\s*\{[^}]*height:\s*200px/s);
  });

  it('sets explicit light/dark bg, text, and edit icon colors (SC-PACK-227)', () => {
    const wrapper = mount(PackTaskTile, {
      props: {
        question: 'Q?',
        difficulty: 1,
        slotLabels: ['A'],
        editable: true,
      },
      global: { stubs },
    });

    expect(wrapper.find('.pack-task-tile__edit-btn').exists()).toBe(true);
    expect(vueSrc).toMatch(/--pack-tile-bg:\s*#ffffff/);
    expect(vueSrc).toMatch(/--pack-tile-fg:\s*rgba\(0,\s*0,\s*0/);
    expect(vueSrc).toMatch(/\.body--dark\s+\.pack-task-tile\s*\{[^}]*--pack-tile-bg:\s*#2a2a2a/s);
    expect(vueSrc).toMatch(/\.body--dark\s+\.pack-task-tile\s*\{[^}]*--pack-tile-fg:\s*rgba\(255/s);
    expect(vueSrc).toMatch(/\.pack-task-tile__edit-btn\s*\{[^}]*color:\s*var\(--pack-tile-edit\)/s);
    expect(vueSrc).not.toMatch(/var\(--q-card-background/);
  });
});

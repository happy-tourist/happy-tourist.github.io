import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackTaskSetCardTile from '@/components/PackTaskSetCardTile.vue';
import messages from '@/i18n/en-US';

const stubs = {
  'q-btn': {
    props: ['label', 'icon', 'outline', 'dense', 'disable'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" :data-dense="dense ? \'1\' : \'\'" @click="$emit(\'click\')">{{ icon }} {{ label }}<slot /></button>',
  },
  'q-badge': { template: '<span v-bind="$attrs"><slot /></span>' },
  'q-icon': {
    props: ['name', 'size'],
    template: '<i v-bind="$attrs" :data-name="name" />',
  },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../PackTaskSetCardTile.vue'),
  'utf8',
);

describe('PackTaskSetCardTile (SC-PACK-229/239…244)', () => {
  it('mounts with ~150–160 width, taller than 200, and light/dark contrast tokens', () => {
    expect(vueSrc).toMatch(/width:\s*15[0-6]px/);
    expect(vueSrc).toMatch(/min-height:\s*2[2-4]\dpx/);
    expect(vueSrc).toMatch(/--pack-ts-bg:\s*#ffffff/);
    expect(vueSrc).toMatch(/\.body--dark\s+\.pack-task-set-tile/);
    expect(vueSrc).toMatch(/--pack-ts-bg:\s*#2a2a2a/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);

    const wrapper = mount(PackTaskSetCardTile, {
      props: {
        title: 'Набор заданий #1',
        totalCount: 5,
        countDiff1: 2,
        countDiff2: 1,
        countDiff3: 2,
        clickable: true,
        testId: 'pack-task-set-row-ts1',
      },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('pack-task-set-tile');
    expect(wrapper.classes()).toContain('pack-task-set-tile--clickable');
    expect(wrapper.find('.pack-task-set-tile__title').text()).toBe('Набор заданий #1');
    expect(wrapper.find('[data-testid="pack-task-set-total"]').text()).toContain('5');
  });

  it('SC-PACK-239/242/243: total icon, pale dividers, colored outline dots; no hover scale', () => {
    expect(vueSrc).toMatch(/name=["']description["']/);
    expect(vueSrc).toMatch(/pack-task-set-tile__divider/);
    expect(vueSrc).toMatch(/--pack-ts-dot-1/);
    expect(vueSrc).toMatch(/--pack-ts-dot-2/);
    expect(vueSrc).toMatch(/--pack-ts-dot-3/);
    expect(vueSrc).toMatch(/background:\s*transparent/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);

    const wrapper = mount(PackTaskSetCardTile, {
      props: {
        title: 'Set',
        totalCount: 4,
        countDiff1: 1,
        countDiff2: 2,
        countDiff3: 1,
      },
      slots: {
        actions: '<button data-test-id="set-edit" type="button">edit</button>',
      },
      global: { stubs },
    });

    expect(wrapper.find('[data-testid="pack-task-set-stats"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-total-icon"]').attributes('data-name')).toBe(
      'description',
    );
    expect(wrapper.find('[data-testid="pack-task-set-total"]').text()).toContain(
      'content.taskSetCardTotal',
    );
    // Pale dividers: after total, between every diff pair, above actions (border-top).
    expect(wrapper.find('[data-testid="pack-task-set-divider-total"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-divider-diff-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-divider-diff-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-divider-diff-3"]').exists()).toBe(false);
    expect(vueSrc).toMatch(/\.pack-task-set-tile__actions[\s\S]*border-top:\s*1px\s+solid/);
    expect(wrapper.find('.pack-task-set-tile__actions').exists()).toBe(true);

    expect(wrapper.find('[data-testid="pack-task-set-diff-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-diff-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-diff-3"]').exists()).toBe(true);

    const filled = (diff: number) =>
      wrapper
        .find(`[data-testid="pack-task-set-diff-${diff}"]`)
        .findAll('.pack-task-set-tile__dot--filled').length;

    expect(filled(1)).toBe(1);
    expect(filled(2)).toBe(2);
    expect(filled(3)).toBe(3);

    expect(
      wrapper
        .find('[data-testid="pack-task-set-diff-1"] .pack-task-set-tile__dots')
        .attributes('data-diff'),
    ).toBe('1');
    expect(
      wrapper
        .find('[data-testid="pack-task-set-diff-2"] .pack-task-set-tile__dots')
        .attributes('data-diff'),
    ).toBe('2');
    expect(
      wrapper
        .find('[data-testid="pack-task-set-diff-3"] .pack-task-set-tile__dots')
        .attributes('data-diff'),
    ).toBe('3');

    expect(wrapper.find('[data-testid="pack-task-set-diff-1"]').text()).toContain(
      'content.taskSetCardDiff1',
    );
    expect(messages.content.taskSetCardTotal).toBe('Заданий:');
    expect(messages.content.taskSetCardDiff1).toBe('Лёгкие:');
    expect(messages.content.taskSetCardDiff2).toBe('Средние:');
    expect(messages.content.taskSetCardDiff3).toBe('Сложные:');
    expect(messages.content.taskSetLabel).toBe('Набор заданий #{n}');
  });

  it('SC-PACK-244: lead/label/count column grid and reserved top without badge', () => {
    expect(vueSrc).toMatch(/--pack-ts-lead-w/);
    expect(vueSrc).toMatch(/grid-template-columns:\s*var\(--pack-ts-lead-w\)/);
    expect(vueSrc).toMatch(/pack-task-set-tile__lead/);
    expect(vueSrc).toMatch(/\.pack-task-set-tile__status[\s\S]*min-height:/);
    expect(vueSrc).toMatch(/\.pack-task-set-tile__body[\s\S]*flex:\s*1\s+1\s+auto/);
    expect(vueSrc).toMatch(/\.pack-task-set-tile__stats[\s\S]*flex:\s*1\s+1\s+auto/);

    const wrapper = mount(PackTaskSetCardTile, {
      props: { title: 'Set', totalCount: 3, countDiff1: 1, countDiff2: 1, countDiff3: 1 },
      global: { stubs },
    });

    // No status slot → reserved band still present (empty).
    expect(wrapper.find('.pack-task-set-tile__status').exists()).toBe(true);
    expect(wrapper.find('.pack-task-set-tile__status').text().trim()).toBe('');

    const totalRow = wrapper.find('[data-testid="pack-task-set-total"]');
    expect(totalRow.find('.pack-task-set-tile__lead').exists()).toBe(true);
    expect(totalRow.find('.pack-task-set-tile__stat-label').exists()).toBe(true);
    expect(totalRow.find('.pack-task-set-tile__stat-count').exists()).toBe(true);

    for (const d of [1, 2, 3]) {
      const row = wrapper.find(`[data-testid="pack-task-set-diff-${d}"]`);
      expect(row.find('.pack-task-set-tile__lead .pack-task-set-tile__dots').exists()).toBe(true);
      expect(row.find('.pack-task-set-tile__stat-label').exists()).toBe(true);
      expect(row.find('.pack-task-set-tile__stat-count').exists()).toBe(true);
    }
  });

  it('SC-PACK-241: slim action height tokens (~28–32 CSS px)', () => {
    expect(vueSrc).toMatch(/min-height:\s*28px/);
    expect(vueSrc).toMatch(/max-height:\s*32px/);
    expect(vueSrc).toMatch(/--pack-ts-action-h/);

    const wrapper = mount(PackTaskSetCardTile, {
      props: { title: 'Set', totalCount: 0 },
      slots: {
        actions:
          '<button data-test-id="slim-a" type="button">a</button><button data-test-id="slim-b" type="button">b</button>',
      },
      global: { stubs },
    });

    // Multiple actions stay stacked in the actions column.
    expect(wrapper.findAll('.pack-task-set-tile__actions [data-test-id]')).toHaveLength(2);
  });

  it('places status top and actions bottom; emits open on body click only', async () => {
    const wrapper = mount(PackTaskSetCardTile, {
      props: { title: 'Set', totalCount: 0, clickable: true, cascadeGap: true },
      slots: {
        status: '<span data-test-id="set-status">СНЯТО</span>',
        actions: '<button data-test-id="set-edit" type="button">edit</button>',
      },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('cascade-gap-outline');
    expect(wrapper.find('.pack-task-set-tile__status [data-test-id="set-status"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('.pack-task-set-tile__actions [data-test-id="set-edit"]').exists()).toBe(
      true,
    );

    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);

    await wrapper.find('[data-test-id="set-edit"]').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
  });
});

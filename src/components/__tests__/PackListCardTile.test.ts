import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackListCardTile from '@/components/PackListCardTile.vue';
import messages from '@/i18n/en-US';
import type { PackTaskSetPreview } from '@/stores/content';

const stubs = {
  'q-btn': {
    emits: ['click'],
    template: '<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  },
  'q-badge': { template: '<span v-bind="$attrs"><slot /></span>' },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../PackListCardTile.vue'),
  'utf8',
);

const sixSets: PackTaskSetPreview[] = [
  { id: 's1', ordinal: 1, taskCount: 48, inCatalog: true },
  { id: 's2', ordinal: 2, taskCount: 36, inCatalog: true },
  { id: 's3', ordinal: 3, taskCount: 12, inCatalog: true },
  { id: 's4', ordinal: 4, taskCount: 8, inCatalog: true },
  { id: 's5', ordinal: 5, taskCount: 4, inCatalog: true },
  { id: 's6', ordinal: 6, taskCount: 2, inCatalog: true },
];

describe('PackListCardTile (SC-PACK-228/249/251/254/255)', () => {
  it('SC-PACK-228: resting ~180×260 with uppercase title, description, set preview chrome', () => {
    expect(vueSrc).toMatch(/width:\s*180px/);
    expect(vueSrc).toMatch(/min-height:\s*260px/);
    expect(vueSrc).toMatch(/text-transform:\s*uppercase/);
    expect(vueSrc).toMatch(/pack-list-tile__description/);
    expect(vueSrc).toMatch(/task-set-card-tasks\.svg/);
    expect(vueSrc).not.toMatch(/border-color:\s*var\(--q-secondary\)/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);
    // Shared --pack-card-* hover (SC-PACK-255); list aliases border-hover.
    expect(vueSrc).toMatch(/--pack-list-border-hover:\s*var\(--pack-card-border-hover\)/);
    expect(vueSrc).not.toMatch(/--pack-list-action-outline/);
    // Reject mock-only hardcodes as token values (comments may mention them historically).
    expect(vueSrc).not.toMatch(/--pack-list-[a-z-]+:\s*#2f2f2f/);
    expect(vueSrc).not.toMatch(/--pack-list-[a-z-]+:\s*#aeaeae/);
    expect(vueSrc).not.toMatch(/border-color:\s*#aeaeae/);
    expect(vueSrc).not.toMatch(/background:\s*#2f2f2f/);
    // Spec-locked type sizes (CSS px).
    expect(vueSrc).toMatch(/\.pack-list-tile__title[\s\S]*font-size:\s*15px/);
    expect(vueSrc).toMatch(/\.pack-list-tile__description[\s\S]*font-size:\s*12px/);
    expect(vueSrc).toMatch(/\.pack-list-status-badge--revise[\s\S]*font-size:\s*10px/);

    const wrapper = mount(PackListCardTile, {
      props: {
        title: 'География мира',
        description: 'Факты и столицы.',
        taskSetsPreview: sixSets.slice(0, 2),
        clickable: true,
      },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('pack-list-tile');
    expect(wrapper.classes()).toContain('pack-list-tile--clickable');
    expect(wrapper.find('.pack-list-tile__title').text()).toContain('География мира');
    expect(wrapper.find('.pack-list-tile__description').text()).toContain('Факты и столицы');
    expect(wrapper.find('[data-testid="pack-list-sets"]').exists()).toBe(true);
  });

  it('SC-PACK-249: shows ≤4 published set rows + overflow «ещё K»; lead icon; set-row click opens card', async () => {
    expect(messages.content.packCardSetsOverflow).toBe('ещё {k}');
    // Overflow must not share row gap (Spec sets→overflow ~4–6).
    expect(vueSrc).toMatch(/pack-list-tile__sets-list/);
    expect(vueSrc).toMatch(/\.pack-list-tile__overflow[\s\S]*margin-top:\s*5px/);

    const wrapper = mount(PackListCardTile, {
      props: {
        title: 'Pack',
        taskSetsPreview: sixSets,
        clickable: true,
      },
      global: { stubs },
    });

    const rows = wrapper.findAll('[data-testid="pack-list-set-row"]');
    expect(rows).toHaveLength(4);
    expect(wrapper.find('.pack-list-tile__sets-list').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-list-sets-overflow"]').text()).toContain(
      'content.packCardSetsOverflow',
    );
    expect(wrapper.find('[data-testid="pack-list-set-icon"]').attributes('data-icon')).toBe(
      'task-set-card-tasks',
    );

    // Published-only overflow: soft-unpub / neverLive must not inflate «ещё K».
    // 6 published + 2 non-published → still overflow 2 (not 4).
    const mixedOverflow: PackTaskSetPreview[] = [
      ...sixSets,
      { id: 'soft', ordinal: 7, taskCount: 9, inCatalog: false },
      { id: 'ghost', ordinal: 8, taskCount: 1, inCatalog: true, neverLive: true },
    ];
    await wrapper.setProps({ taskSetsPreview: mixedOverflow });
    expect(wrapper.findAll('[data-testid="pack-list-set-row"]')).toHaveLength(4);
    expect(wrapper.find('[data-testid="pack-list-sets-overflow"]').exists()).toBe(true);
    expect(wrapper.findAll('.pack-list-tile__set-row--muted')).toHaveLength(0);

    // Set-row click bubbles → whole-card open (not a separate nav target).
    await wrapper.find('[data-testid="pack-list-set-row"]').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
  });

  it('SC-PACK-254: omits soft-unpub/neverLive; display ordinal among published; set ink = title.fg', () => {
    // Decision 12: label/count/icon use title.fg (--pack-list-fg), not muted greys.
    expect(vueSrc).toMatch(/\.pack-list-tile__set-label[\s\S]*color:\s*var\(--pack-list-fg\)/);
    expect(vueSrc).toMatch(/\.pack-list-tile__set-count[\s\S]*color:\s*var\(--pack-list-fg\)/);
    expect(vueSrc).toMatch(/\.pack-list-tile__set-icon[\s\S]*color:\s*var\(--pack-list-fg\)/);
    expect(vueSrc).not.toMatch(/--pack-list-set-label:/);
    expect(vueSrc).not.toMatch(/--pack-list-set-count:/);
    expect(vueSrc).not.toMatch(/pack-list-tile__set-row--muted/);
    expect(vueSrc).not.toMatch(/--pack-list-row-muted-opacity/);

    const mixed: PackTaskSetPreview[] = [
      { id: 'soft', ordinal: 1, taskCount: 2, inCatalog: false },
      { id: 'pub', ordinal: 2, taskCount: 48, inCatalog: true },
      { id: 'ghost', ordinal: 3, taskCount: 3, inCatalog: true, neverLive: true },
    ];

    const tCalls: Array<{ key: string; values?: Record<string, unknown> }> = [];
    const wrapper = mount(PackListCardTile, {
      props: {
        title: 'География мира',
        taskSetsPreview: mixed,
        clickable: true,
      },
      global: {
        stubs,
        mocks: {
          $t: (key: string, values?: Record<string, unknown>) => {
            if (values !== undefined) {
              tCalls.push({ key, values });
            } else {
              tCalls.push({ key });
            }
            const n = values?.n;
            if (key === 'content.taskSetLabel' && typeof n === 'number') {
              return `Набор заданий #${n}`;
            }
            return key;
          },
        },
      },
    });

    const rows = wrapper.findAll('[data-testid="pack-list-set-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.text()).toContain('48');
    // Display ordinal among published-only is 1 (not API ordinal 2).
    expect(rows[0]!.find('.pack-list-tile__set-label').text()).toBe('Набор заданий #1');
    expect(tCalls.some((c) => c.key === 'content.taskSetLabel' && c.values?.n === 1)).toBe(true);
    expect(tCalls.some((c) => c.key === 'content.taskSetLabel' && c.values?.n === 2)).toBe(false);
    expect(wrapper.findAll('.pack-list-tile__set-row--muted')).toHaveLength(0);
    expect(wrapper.find('[data-testid="pack-list-sets-overflow"]').exists()).toBe(false);
  });

  it('SC-PACK-251: title uses uppercase CSS; revise badge class supported in status slot', () => {
    expect(vueSrc).toMatch(/text-transform:\s*uppercase/);
    expect(vueSrc).toMatch(/pack-list-status-badge--revise/);
    expect(messages.content.taskSetCardBadge.needs_revision).toBe('ДОРАБОТАТЬ');
    expect(messages.content.statuses.needs_revision).toBe('Нужна доработка');

    const wrapper = mount(PackListCardTile, {
      props: { title: 'География мира', clickable: true },
      slots: {
        status:
          '<span class="pack-list-status-badge--revise" data-test-id="packs-status-x">ДОРАБОТАТЬ</span>',
      },
      global: { stubs },
    });

    expect(wrapper.find('.pack-list-tile__status [data-test-id="packs-status-x"]').text()).toBe(
      'ДОРАБОТАТЬ',
    );
    expect(wrapper.find('.pack-list-tile__title').classes().length).toBeGreaterThanOrEqual(0);
  });

  it('places leading star left and status top; actions bottom (no Edit TR)', () => {
    const wrapper = mount(PackListCardTile, {
      props: { title: 'Pack', clickable: true, testId: 'packs-row-x' },
      slots: {
        leading: '<button data-test-id="packs-star-x">star</button>',
        status: '<span data-test-id="packs-status-x">draft</span>',
        actions: '<button data-test-id="packs-edit-x" class="full-width">edit</button>',
      },
      global: { stubs },
    });

    expect(wrapper.attributes('data-test-id')).toBe('packs-row-x');
    expect(wrapper.find('.pack-list-tile__leading [data-test-id="packs-star-x"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('.pack-list-tile__trailing [data-test-id="packs-edit-x"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('.pack-list-tile__actions [data-test-id="packs-edit-x"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('.pack-list-tile__status [data-test-id="packs-status-x"]').exists()).toBe(
      true,
    );
    expect(vueSrc).toMatch(/\.pack-list-tile__actions[\s\S]*border-top:\s*1px\s+solid/);
  });

  it('SC-PACK-255: shared --pack-card-* chrome; muted = opacity 0.72 + dashed', () => {
    const appScss = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../css/app.scss'),
      'utf8',
    );
    expect(appScss).toMatch(/\.pack-card-grid[\s\S]*--pack-card-bg:\s*#ffffff/);
    expect(appScss).toMatch(/--pack-card-fg:\s*rgba\(0,\s*0,\s*0,\s*0\.87\)/);
    expect(appScss).toMatch(/--pack-card-muted:\s*rgba\(0,\s*0,\s*0,\s*0\.7\)/);
    expect(appScss).toMatch(/--pack-card-border:\s*rgba\(0,\s*0,\s*0,\s*0\.14\)/);
    expect(appScss).toMatch(/--pack-card-border-hover:\s*#212121/);
    expect(appScss).toMatch(/--pack-card-shadow:/);
    expect(appScss).toMatch(/--pack-card-shadow-hover:/);
    expect(appScss).toMatch(/--pack-card-splitter:\s*rgba\(0,\s*0,\s*0,\s*0\.08\)/);
    expect(appScss).toMatch(/--pack-card-action-h:\s*30px/);
    expect(appScss).toMatch(/body\.body--dark\s+\.pack-card-grid[\s\S]*--pack-card-bg:\s*#2a2a2a/);
    expect(appScss).toMatch(/body\.body--dark[\s\S]*--pack-card-border-hover:\s*#bdbdbd/);

    expect(vueSrc).toMatch(/--pack-list-bg:\s*var\(--pack-card-bg\)/);
    expect(vueSrc).toMatch(/--pack-list-border:\s*var\(--pack-card-border\)/);
    expect(vueSrc).toMatch(/--pack-list-action-h:\s*var\(--pack-card-action-h\)/);
    expect(vueSrc).toMatch(
      /\.q-btn--outline:before[\s\S]*border-color:\s*var\(--pack-card-border\)/,
    );
    expect(vueSrc).toMatch(
      /\.pack-list-tile--muted[\s\S]*opacity:\s*0\.72[\s\S]*border-style:\s*dashed/,
    );

    const wrapper = mount(PackListCardTile, {
      props: { title: 'Soft pack', muted: true },
      global: { stubs },
    });
    expect(wrapper.classes()).toContain('pack-list-tile--muted');
  });

  it('emits open on body click; leading/actions stop propagation', async () => {
    const wrapper = mount(PackListCardTile, {
      props: { title: 'Set 1', clickable: true },
      slots: {
        leading: '<button data-test-id="star-btn">s</button>',
        actions: '<button data-test-id="action-btn">a</button>',
      },
      global: { stubs },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);

    await wrapper.find('[data-test-id="star-btn"]').trigger('click');
    await wrapper.find('[data-test-id="action-btn"]').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
  });

  it('SC-MAP-68 drive-by: iconMaskVars quote Vite mask url() for set-row icon', () => {
    expect(vueSrc).toMatch(/url\("\$\{iconTasks\}"\)/);
    expect(vueSrc).not.toMatch(/url\(\$\{iconTasks\}\)/);

    const wrapper = mount(PackListCardTile, {
      props: { title: 'Mask pack', taskSetsPreview: sixSets.slice(0, 1) },
      global: { stubs },
    });
    const style = wrapper.attributes('style') ?? '';
    expect(style).toMatch(/--pack-list-icon-tasks:\s*url\("/);
  });
});

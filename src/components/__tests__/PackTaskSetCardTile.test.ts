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

describe('PackTaskSetCardTile (SC-PACK-229/239…248)', () => {
  it('mounts with ~150–160 width, taller than 200, and light/dark contrast tokens', () => {
    expect(vueSrc).toMatch(/width:\s*15[0-6]px/);
    expect(vueSrc).toMatch(/min-height:\s*20[6-9]px|min-height:\s*2[1-4]\dpx/);
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

  it('SC-PACK-239/242/243: total SVG icon, pale dividers, colored outline dots; no hover scale', () => {
    expect(vueSrc).toMatch(/task-set-card-tasks\.svg/);
    expect(vueSrc).toMatch(/pack-task-set-tile__total-icon/);
    expect(vueSrc).toMatch(
      /mask(?:-image)?:\s*var\(--pack-ts-icon-tasks\)|mask:\s*var\(--pack-ts-icon-tasks\)/,
    );
    expect(vueSrc).not.toMatch(/name=["']description["']/);
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
    const totalIcon = wrapper.find('[data-testid="pack-task-set-total-icon"]');
    expect(totalIcon.exists()).toBe(true);
    expect(totalIcon.attributes('data-icon')).toBe('task-set-card-tasks');
    expect(totalIcon.element.tagName.toLowerCase()).toBe('span');
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

  it('SC-PACK-245/247: title→stats and divider air tokens (retuned)', () => {
    // SC-PACK-247 retune: title-gap 7; divider-air 2–3 (total ~4–6); status→title pad.
    expect(vueSrc).toMatch(/--pack-ts-title-gap:\s*7px/);
    expect(vueSrc).toMatch(/margin-bottom:\s*var\(--pack-ts-title-gap\)/);
    expect(vueSrc).toMatch(/--pack-ts-row-pad-y:\s*[6-8]px/);
    expect(vueSrc).toMatch(/padding:\s*var\(--pack-ts-row-pad-y\)\s+0/);
    expect(vueSrc).toMatch(/--pack-ts-divider-air:\s*[2-3]px/);
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile__divider[\s\S]*margin:\s*var\(--pack-ts-divider-air\)\s+0/,
    );
    expect(vueSrc).toMatch(/\.pack-task-set-tile__status[\s\S]*padding:\s*8px\s+10px\s+[6-8]px/);
    expect(vueSrc).toMatch(/min-height:\s*20[6-9]px|min-height:\s*2[1-4]\dpx/);
    // List grid gutter must stay out of this tile (Decision 10/11 / Non-Goals).
    expect(vueSrc).not.toMatch(/\.pack-card-grid/);
  });

  it('SC-PACK-248: custom SVG total + badge icons via currentColor / CSS mask', () => {
    expect(vueSrc).toMatch(/task-set-card-tasks\.svg/);
    expect(vueSrc).toMatch(/task-set-badge-revise\.svg/);
    expect(vueSrc).toMatch(/task-set-badge-pending\.svg/);
    expect(vueSrc).toMatch(/task-set-badge-unpublished\.svg/);
    expect(vueSrc).toMatch(/task-set-badge-draft\.svg/);
    expect(vueSrc).not.toMatch(/name=["']description["']/);
    expect(vueSrc).not.toMatch(/name=["'](?:close|schedule|visibility_off|edit_note)["']/);

    // Total icon size 14; badge icons ~12; ink via currentColor.
    expect(vueSrc).toMatch(/\.pack-task-set-tile__total-icon[\s\S]*width:\s*14px/);
    expect(vueSrc).toMatch(/\.pack-task-set-tile__total-icon[\s\S]*height:\s*14px/);
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile__total-icon[\s\S]*background-color:\s*currentColor/,
    );
    expect(vueSrc).toMatch(/\.pack-task-set-status-icon[\s\S]*width:\s*12px/);
    expect(vueSrc).toMatch(/\.pack-task-set-status-icon[\s\S]*background-color:\s*currentColor/);

    // Soft muted / pending badge colors from Visual Spec (not Quasar solid fills).
    expect(vueSrc).toMatch(
      /pack-task-set-status-badge--muted[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0\.06\)/,
    );
    expect(vueSrc).toMatch(
      /pack-task-set-status-badge--muted[\s\S]*color:\s*rgba\(0,\s*0,\s*0,\s*0\.72\)/,
    );
    expect(vueSrc).toMatch(
      /pack-task-set-status-badge--pending[\s\S]*background:\s*rgba\(249,\s*168,\s*37,\s*0\.16\)/,
    );
    expect(vueSrc).toMatch(/pack-task-set-status-badge--pending[\s\S]*color:\s*#f9a825/);
    expect(vueSrc).toMatch(
      /\.body--dark[\s\S]*pack-task-set-status-badge--muted[\s\S]*rgba\(255,\s*255,\s*255,\s*0\.12\)/,
    );
    expect(vueSrc).toMatch(
      /\.body--dark[\s\S]*pack-task-set-status-badge--pending[\s\S]*color:\s*#ffc107/,
    );
    // Stats icon ink = muted token.
    expect(vueSrc).toMatch(/--pack-ts-muted:\s*rgba\(0,\s*0,\s*0,\s*0\.7\)/);
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile__total-icon[\s\S]*color:\s*var\(--pack-ts-muted\)/,
    );

    const wrapper = mount(PackTaskSetCardTile, {
      props: { title: 'Set', totalCount: 1, countDiff1: 1 },
      slots: {
        status:
          '<span class="pack-task-set-status-badge pack-task-set-status-badge--muted">' +
          '<span class="pack-task-set-status-icon pack-task-set-status-icon--revise" data-testid="badge-revise"></span>' +
          'ДОРАБОТАТЬ</span>',
      },
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="pack-task-set-total-icon"]').attributes('data-icon')).toBe(
      'task-set-card-tasks',
    );
    expect(wrapper.find('[data-testid="badge-revise"]').classes()).toContain(
      'pack-task-set-status-icon--revise',
    );
  });

  it('SC-PACK-246: themed hover border + soft lift; no scale; no --q-secondary; icons static', () => {
    expect(vueSrc).not.toMatch(/transform:\s*scale/);
    expect(vueSrc).toMatch(/--pack-ts-border-hover:\s*#212121/);
    expect(vueSrc).toMatch(/--pack-ts-border-hover:\s*#bdbdbd/);
    expect(vueSrc).toMatch(/--pack-ts-shadow-hover:/);
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile--clickable:hover[\s\S]*border-color:\s*var\(--pack-ts-border-hover\)/,
    );
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile--clickable:hover[\s\S]*box-shadow:\s*var\(--pack-ts-shadow-hover\)/,
    );
    // Must not use brand secondary as the only hover cue.
    expect(vueSrc).not.toMatch(/\.pack-task-set-tile--clickable:hover[\s\S]{0,200}--q-secondary/);
    // Hover chrome only — no rules that recolor dots / total icon on hover.
    expect(vueSrc).not.toMatch(
      /\.pack-task-set-tile--clickable:hover[\s\S]{0,400}pack-task-set-tile__dot/,
    );
    expect(vueSrc).not.toMatch(
      /\.pack-task-set-tile--clickable:hover[\s\S]{0,400}pack-task-set-tile__total-icon/,
    );

    const wrapper = mount(PackTaskSetCardTile, {
      props: {
        title: 'Set',
        totalCount: 2,
        countDiff1: 1,
        countDiff2: 1,
        countDiff3: 0,
        clickable: true,
      },
      global: { stubs },
    });
    expect(wrapper.classes()).toContain('pack-task-set-tile--clickable');
    // Dot fill colors come from static --pack-ts-dot-* tokens, not hover state.
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile__dot--filled[\s\S]*background:\s*var\(--pack-ts-dot-color\)/,
    );
  });

  it('soft status pills + pale action outline (mock; not Quasar solid fills)', () => {
    expect(vueSrc).toMatch(/pack-task-set-status-badge--muted/);
    expect(vueSrc).toMatch(/pack-task-set-status-badge--pending/);
    expect(vueSrc).toMatch(/padding:\s*2px\s+6px/);
    expect(vueSrc).toMatch(/\.q-btn--outline:before[\s\S]*border-color:\s*var\(--pack-ts-border\)/);
  });

  it('soft-unpublish muted: opacity 0.72 + dashed border; counts use title.fg', () => {
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile--muted[\s\S]*opacity:\s*0\.72[\s\S]*border-style:\s*dashed/,
    );
    expect(vueSrc).toMatch(
      /\.pack-task-set-tile__stat-count[\s\S]*color:\s*var\(--pack-ts-fg\)/,
    );
    expect(vueSrc).toMatch(/\.pack-task-set-tile__stat-count[\s\S]*font-weight:\s*600/);

    const wrapper = mount(PackTaskSetCardTile, {
      props: { title: 'Set', totalCount: 1, countDiff1: 1, muted: true },
      global: { stubs },
    });
    expect(wrapper.classes()).toContain('pack-task-set-tile--muted');
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

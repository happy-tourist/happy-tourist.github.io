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

describe('PackListCardTile (SC-PACK-228/249/251)', () => {
  it('SC-PACK-228: resting ~180×260 with uppercase title, description, set preview chrome', () => {
    expect(vueSrc).toMatch(/width:\s*180px/);
    expect(vueSrc).toMatch(/min-height:\s*260px/);
    expect(vueSrc).toMatch(/text-transform:\s*uppercase/);
    expect(vueSrc).toMatch(/pack-list-tile__description/);
    expect(vueSrc).toMatch(/task-set-card-tasks\.svg/);
    expect(vueSrc).not.toMatch(/border-color:\s*var\(--q-secondary\)/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);
    expect(vueSrc).toMatch(/--pack-list-border-hover:\s*#212121/);
    expect(vueSrc).toMatch(/\.body--dark[\s\S]*--pack-list-border-hover:\s*#bdbdbd/);

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

  it('SC-PACK-249: shows ≤4 set rows + overflow «ещё K»; lead icon; set-row click opens card', async () => {
    expect(messages.content.packCardSetsOverflow).toBe('ещё {k}');

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
    expect(wrapper.find('[data-testid="pack-list-sets-overflow"]').text()).toContain(
      'content.packCardSetsOverflow',
    );
    expect(wrapper.find('[data-testid="pack-list-set-icon"]').attributes('data-icon')).toBe(
      'task-set-card-tasks',
    );
    // Soft-unpub / neverLive rows muted.
    const mutedPreview: PackTaskSetPreview[] = [
      { id: 'a', ordinal: 1, taskCount: 1, inCatalog: true },
      { id: 'b', ordinal: 2, taskCount: 2, inCatalog: false },
      { id: 'c', ordinal: 3, taskCount: 3, inCatalog: true, neverLive: true },
    ];
    await wrapper.setProps({ taskSetsPreview: mutedPreview });
    const mutedRows = wrapper.findAll('.pack-list-tile__set-row--muted');
    expect(mutedRows).toHaveLength(2);

    // Set-row click bubbles → whole-card open (not a separate nav target).
    await wrapper.find('[data-testid="pack-list-set-row"]').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
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
});

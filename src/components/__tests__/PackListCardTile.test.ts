import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PackListCardTile from '@/components/PackListCardTile.vue';

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

describe('PackListCardTile (SC-PACK-228/229)', () => {
  it('is fixed 150×200 with truncated title and description', () => {
    expect(vueSrc).toMatch(/width:\s*150px/);
    expect(vueSrc).toMatch(/height:\s*200px/);
    expect(vueSrc).toMatch(/pack-list-tile__description/);

    const wrapper = mount(PackListCardTile, {
      props: {
        title: 'A very long pack title that should truncate',
        description: 'A long pack description for catalog body',
        clickable: true,
      },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('pack-list-tile');
    expect(wrapper.classes()).toContain('pack-list-tile--clickable');
    expect(wrapper.find('.pack-list-tile__title').text()).toContain('A very long pack title');
    expect(wrapper.find('.pack-list-tile__description').text()).toContain('long pack description');
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

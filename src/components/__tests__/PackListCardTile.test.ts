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
  it('is fixed 100×200 with truncated title chrome', () => {
    expect(vueSrc).toMatch(/width:\s*100px/);
    expect(vueSrc).toMatch(/height:\s*200px/);
    expect(vueSrc).toMatch(/-webkit-line-clamp:\s*5/);

    const wrapper = mount(PackListCardTile, {
      props: { title: 'A very long pack title that should truncate', clickable: true },
      global: { stubs },
    });

    expect(wrapper.classes()).toContain('pack-list-tile');
    expect(wrapper.classes()).toContain('pack-list-tile--clickable');
    expect(wrapper.find('.pack-list-tile__title').text()).toContain('A very long pack title');
  });

  it('places leading star left and trailing Edit right; status in top chrome', () => {
    const wrapper = mount(PackListCardTile, {
      props: { title: 'Pack', clickable: true, testId: 'packs-row-x' },
      slots: {
        leading: '<button data-test-id="packs-star-x">star</button>',
        status: '<span data-test-id="packs-status-x">draft</span>',
        trailing: '<button data-test-id="packs-edit-x">edit</button>',
      },
      global: { stubs },
    });

    expect(wrapper.attributes('data-test-id')).toBe('packs-row-x');
    expect(wrapper.find('.pack-list-tile__leading [data-test-id="packs-star-x"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('.pack-list-tile__trailing [data-test-id="packs-edit-x"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('.pack-list-tile__status [data-test-id="packs-status-x"]').exists()).toBe(
      true,
    );
  });

  it('emits open on body click; leading/trailing/actions stop propagation', async () => {
    const wrapper = mount(PackListCardTile, {
      props: { title: 'Set 1', clickable: true },
      slots: {
        trailing: '<button data-test-id="edit-btn">e</button>',
        actions: '<button data-test-id="action-btn">a</button>',
      },
      global: { stubs },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);

    await wrapper.find('[data-test-id="edit-btn"]').trigger('click');
    await wrapper.find('[data-test-id="action-btn"]').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
  });
});

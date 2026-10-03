import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import LobbyRoomCardTile from '@/components/LobbyRoomCardTile.vue';
import messages from '@/i18n/en-US';

const GRID = '1'.repeat(100);

const stubs = {
  MapGridPreview: {
    name: 'MapGridPreview',
    props: ['grid', 'size'],
    template:
      '<div class="map-grid-preview-stub" data-test-id="lobby-room-map-preview" :data-grid-len="String(grid?.length ?? 0)" />',
  },
  'q-btn': {
    props: ['label', 'outline', 'dense', 'disable', 'loading'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" :data-outline="outline ? \'1\' : \'\'" @click="$emit(\'click\')">{{ label }}</button>',
  },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../LobbyRoomCardTile.vue'),
  'utf8',
);

const appScss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../css/app.scss'),
  'utf8',
);

describe('LobbyRoomCardTile (SC-LOBBY-25/26/33/34/35)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  const getWrapper = () =>
    mount(LobbyRoomCardTile, {
      props: {
        grid: GRID,
        seats: 2,
        maxSeats: 2,
        touristsPerPlayer: 3,
        packTitle: 'Математика',
        taskSetLabels: [
          { taskSetId: 's1', authorDisplayName: 'Мария', taskCount: 48 },
          { taskSetId: 's2', authorDisplayName: 'Иван', taskCount: 32 },
        ],
        clickable: true,
        testId: 'lobby-room-r1',
      },
      slots: {
        status:
          '<span class="lobby-room-status-badge lobby-room-status-badge--pending">lobby.roomCardStatusWaiting</span>',
        actions:
          '<button type="button" class="q-btn q-btn--outline" data-outline="1" data-test-id="lobby-room-join-btn">lobby.join</button>',
      },
      global: { stubs },
    });

  it('SC-LOBBY-25: map preview, seats/maxSeats, tourists without plus (not players×tourists)', () => {
    expect(messages.lobby.capacity).toBe('{seats} / {maxSeats}');
    expect(messages.lobby.roomCardTouristsOne).toBe('{n} ТУРИСТ');
    expect(messages.lobby.roomCardTouristsFew).toBe('{n} ТУРИСТА');
    expect(messages.lobby.roomCardTouristsMany).toBe('{n} ТУРИСТОВ');
    expect(vueSrc).toMatch(/lobby-room-card-seats\.svg/);
    expect(vueSrc).toMatch(/map-card-tourists\.svg/);
    expect(vueSrc).not.toMatch(/mapCapacityCaption/);
    expect(vueSrc).not.toMatch(/players\s*[×x]\s*tourists/i);

    wrapper = getWrapper();
    expect(wrapper.find('.map-grid-preview-stub').exists()).toBe(true);
    expect(wrapper.find('[data-testid="lobby-room-map-preview"]').exists()).toBe(true);

    const seats = wrapper.find('[data-testid="lobby-room-seats"]');
    expect(seats.text()).toContain('lobby.capacity');
    // maxSeats=2 (chosen), not map players=4 from scenario.
    expect(seats.text()).not.toContain('4');
    expect(wrapper.find('[data-testid="lobby-room-seats-icon"]').attributes('data-icon')).toBe(
      'lobby-room-card-seats',
    );

    const tourists = wrapper.find('[data-testid="lobby-room-tourists"]');
    expect(tourists.text()).toContain('lobby.roomCardTouristsFew');
    expect(tourists.text()).not.toMatch(/^\+/);
    expect(wrapper.text()).not.toMatch(/\+\s*3/);
    expect(wrapper.find('[data-testid="lobby-room-tourists-icon"]').attributes('data-icon')).toBe(
      'map-card-tourists',
    );
    expect(wrapper.find('[data-testid="lobby-room-divider-capacity"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="lobby-room-map-capacity"]').exists()).toBe(false);
    // Visual Spec: seats/tourists = centered icon+text block.
    expect(vueSrc).toMatch(
      /\.lobby-room-tile__stat-row[\s\S]*margin-inline:\s*auto[\s\S]*width:\s*max-content|width:\s*max-content[\s\S]*margin-inline:\s*auto/,
    );
    expect(vueSrc).toMatch(/previewSize:\s*156/);

    const html = wrapper.html();
    expect(html.indexOf('map-grid-preview-stub')).toBeLessThan(html.indexOf('lobby-room-seats'));
    expect(html.indexOf('lobby-room-seats')).toBeLessThan(html.indexOf('lobby-room-tourists'));

    const noTourists = mount(LobbyRoomCardTile, {
      props: {
        grid: GRID,
        seats: 1,
        maxSeats: 2,
        touristsPerPlayer: null,
        testId: 'lobby-room-no-tourists',
      },
      global: { stubs },
    });
    expect(noTourists.find('[data-testid="lobby-room-tourists"]').exists()).toBe(false);
    expect(noTourists.find('[data-testid="lobby-room-divider-capacity"]').exists()).toBe(false);
    noTourists.unmount();
  });

  it('SC-LOBBY-26: pack title uppercase chrome; set rows with taskCount; no set author', () => {
    expect(messages.lobby.roomCardTaskSetLabel).toBe('Набор #{n}');
    expect(vueSrc).toMatch(/text-transform:\s*uppercase/);
    expect(vueSrc).toMatch(/task-set-card-tasks\.svg/);

    const tCalls: Array<{ key: string; values?: Record<string, unknown> }> = [];
    wrapper = mount(LobbyRoomCardTile, {
      props: {
        grid: GRID,
        seats: 1,
        maxSeats: 2,
        touristsPerPlayer: 2,
        packTitle: 'Математика',
        taskSetLabels: [
          { taskSetId: 's1', authorDisplayName: 'Мария', taskCount: 48 },
          { taskSetId: 's2', authorDisplayName: 'Иван', taskCount: 32 },
        ],
        testId: 'lobby-room-sets',
      },
      global: {
        stubs,
        mocks: {
          $t: (key: string, values?: Record<string, unknown>) => {
            tCalls.push(values !== undefined ? { key, values } : { key });
            if (key === 'lobby.roomCardTaskSetLabel' && typeof values?.n === 'number') {
              return `Набор #${values.n}`;
            }
            if (key === 'lobby.capacity') {
              const seats = typeof values?.seats === 'number' ? values.seats : '';
              const maxSeats =
                typeof values?.maxSeats === 'number' || typeof values?.maxSeats === 'string'
                  ? values.maxSeats
                  : '';
              return `${seats} / ${maxSeats}`;
            }
            if (typeof values?.n === 'number' && key.startsWith('lobby.roomCardTourists')) {
              return `${values.n} Т`;
            }
            return key;
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="lobby-room-pack-title"]').text()).toContain('Математика');
    expect(wrapper.find('[data-testid="lobby-room-pack-title"]').classes()).toContain(
      'lobby-room-tile__title',
    );

    const rows = wrapper.findAll('[data-testid="lobby-room-set-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain('Набор #1');
    expect(rows[0]!.text()).toContain('48');
    expect(rows[1]!.text()).toContain('Набор #2');
    expect(rows[1]!.text()).toContain('32');
    expect(wrapper.text()).not.toContain('Мария');
    expect(wrapper.text()).not.toContain('Иван');
    expect(wrapper.find('[data-testid="lobby-room-set-icon"]').attributes('data-icon')).toBe(
      'task-set-card-tasks',
    );
    expect(tCalls.some((c) => c.key === 'lobby.roomCardTaskSetLabel' && c.values?.n === 1)).toBe(
      true,
    );
    expect(tCalls.some((c) => c.key === 'lobby.roomCardTaskSetLabel' && c.values?.n === 2)).toBe(
      true,
    );
  });

  it('SC-LOBBY-33: ~180 chrome; pack-card token aliases; outline join action', () => {
    expect(vueSrc).toMatch(/width:\s*180px/);
    expect(vueSrc).toMatch(/--lobby-room-bg:\s*var\(--pack-card-bg\)/);
    expect(vueSrc).toMatch(/--lobby-room-border:\s*var\(--pack-card-border\)/);
    expect(vueSrc).toMatch(/--lobby-room-border-hover:\s*var\(--pack-card-border-hover\)/);
    expect(vueSrc).toMatch(/--lobby-room-shadow-hover:\s*var\(--pack-card-shadow-hover\)/);
    expect(vueSrc).toMatch(/--lobby-room-action-h:\s*var\(--pack-card-action-h\)/);
    expect(vueSrc).toMatch(
      /q-btn--outline:before[\s\S]*border-color:\s*var\(--lobby-room-border\)/,
    );
    expect(vueSrc).not.toMatch(/border-color:\s*var\(--q-secondary\)/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);
    expect(vueSrc).toMatch(/url\("\$\{iconSeats\}"\)/);
    expect(vueSrc).toMatch(/url\("\$\{iconTourists\}"\)/);
    expect(vueSrc).toMatch(/url\("\$\{iconTasks\}"\)/);
    expect(appScss).toMatch(/--pack-card-bg:\s*#ffffff/);
    expect(appScss).toMatch(/body\.body--dark[\s\S]*--pack-card-bg:\s*#2a2a2a/);
    expect(messages.lobby.join).toBe('Войти');

    wrapper = getWrapper();
    expect(wrapper.classes()).toContain('lobby-room-tile');
    expect(wrapper.find('[data-testid="lobby-room-join"]').exists()).toBe(true);
    const join = wrapper.find('[data-test-id="lobby-room-join-btn"]');
    expect(join.exists()).toBe(true);
    expect(join.attributes('data-outline')).toBe('1');
    expect(join.text()).toContain('lobby.join');
  });

  it('SC-LOBBY-34: status overlay centered on preview (waiting / playing copy)', () => {
    expect(messages.lobby.roomCardStatusWaiting).toBe('ОЖИДАНИЕ');
    expect(messages.lobby.roomCardStatusPlaying).toBe('ИГРА');
    expect(vueSrc).toMatch(/\.lobby-room-tile__status[\s\S]*left:\s*50%/);
    expect(vueSrc).toMatch(/\.lobby-room-tile__status[\s\S]*translateX\(-50%\)/);
    expect(vueSrc).toMatch(/\.lobby-room-tile__status[\s\S]*top:\s*[6-9]px|top:\s*10px/);

    const empty = mount(LobbyRoomCardTile, {
      props: {
        grid: GRID,
        seats: 1,
        maxSeats: 2,
        testId: 'lobby-room-no-status',
      },
      global: { stubs },
    });
    expect(empty.find('[data-testid="lobby-room-status"]').exists()).toBe(false);
    empty.unmount();

    wrapper = getWrapper();
    const status = wrapper.find('[data-testid="lobby-room-status"]');
    expect(status.exists()).toBe(true);
    expect(status.classes()).toContain('lobby-room-tile__status');
    expect(status.text()).toContain('lobby.roomCardStatusWaiting');
    expect(
      wrapper.find('.lobby-room-tile__preview').find('[data-testid="lobby-room-status"]').exists(),
    ).toBe(true);

    const playing = mount(LobbyRoomCardTile, {
      props: {
        grid: GRID,
        seats: 2,
        maxSeats: 2,
        testId: 'lobby-room-playing',
      },
      slots: {
        status:
          '<span class="lobby-room-status-badge lobby-room-status-badge--muted">lobby.roomCardStatusPlaying</span>',
      },
      global: { stubs },
    });
    expect(playing.find('[data-testid="lobby-room-status"]').text()).toContain(
      'lobby.roomCardStatusPlaying',
    );
    playing.unmount();
  });

  it('SC-LOBBY-35: ≤4 set rows + overflow «ещё {k}»', async () => {
    expect(messages.content.packCardSetsOverflow).toBe('ещё {k}');
    expect(vueSrc).toMatch(/\.lobby-room-tile__overflow[\s\S]*margin-top:\s*5px/);

    const labels = Array.from({ length: 6 }, (_, i) => ({
      taskSetId: `s${i + 1}`,
      authorDisplayName: `Author${i + 1}`,
      taskCount: 10 * (i + 1),
    }));

    wrapper = mount(LobbyRoomCardTile, {
      props: {
        grid: GRID,
        seats: 1,
        maxSeats: 2,
        touristsPerPlayer: 2,
        packTitle: 'Pack',
        taskSetLabels: labels,
        testId: 'lobby-room-overflow',
      },
      global: { stubs },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-testid="lobby-room-set-row"]')).toHaveLength(4);
    const overflow = wrapper.find('[data-testid="lobby-room-sets-overflow"]');
    expect(overflow.exists()).toBe(true);
    expect(overflow.text()).toContain('content.packCardSetsOverflow');
    expect(wrapper.text()).not.toContain('Author5');
    expect(wrapper.text()).not.toContain('Author6');

    await wrapper.setProps({
      taskSetLabels: labels.slice(0, 4),
    });
    expect(wrapper.find('[data-testid="lobby-room-sets-overflow"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="lobby-room-set-row"]')).toHaveLength(4);
  });

  it('emits open on clickable body when not disabled', async () => {
    wrapper = getWrapper();
    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);

    await wrapper.setProps({ disabled: true });
    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
  });
});

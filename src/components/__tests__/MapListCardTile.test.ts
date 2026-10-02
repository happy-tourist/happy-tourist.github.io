import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import MapListCardTile from '@/components/MapListCardTile.vue';
import messages from '@/i18n/en-US';

const GRID =
  '1........1' +
  '..........' +
  '..........' +
  '..........' +
  '....77....' +
  '....77....' +
  '..........' +
  '..........' +
  '..........' +
  '1........1';

const stubs = {
  MapGridPreview: {
    name: 'MapGridPreview',
    props: ['grid', 'size'],
    template:
      '<div class="map-preview-stub" data-test-id="map-preview" :data-grid-len="String(grid?.length ?? 0)" />',
  },
  'q-btn': {
    props: ['label', 'icon', 'outline', 'dense', 'disable'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" :data-outline="outline ? \'1\' : \'\'" @click="$emit(\'click\')">{{ icon }} {{ label }}<slot /></button>',
  },
};

const vueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../MapListCardTile.vue'),
  'utf8',
);

const appScss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../css/app.scss'),
  'utf8',
);

describe('MapListCardTile (SC-MAP-55/66/67/68)', () => {
  const getWrapper = () =>
    mount(MapListCardTile, {
      props: {
        grid: GRID,
        players: 4,
        touristsPerPlayer: 2,
        clickable: true,
        testId: 'maps-row-m1',
      },
      global: { stubs },
    });

  it('SC-MAP-55: ~180 wide; two capacity rows; no author; outline action chrome', () => {
    expect(messages.maps.mapCardPlayers).toBe('ИГРОКОВ:');
    expect(messages.maps.mapCardTourists).toBe('ТУРИСТОВ:');
    expect(vueSrc).toMatch(/width:\s*180px/);
    expect(vueSrc).toMatch(/map-card-players\.svg/);
    expect(vueSrc).toMatch(/map-card-tourists\.svg/);
    expect(vueSrc).not.toMatch(/defineProps<\{[^}]*\bauthor\b/);
    expect(vueSrc).not.toMatch(/defineProps<\{[^}]*\bcapacity\b/);
    expect(vueSrc).not.toMatch(/border-color:\s*var\(--q-secondary\)/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);

    const wrapper = getWrapper();
    expect(wrapper.classes()).toContain('map-list-tile');
    expect(wrapper.classes()).toContain('map-list-tile--clickable');
    expect(wrapper.find('.map-preview-stub').exists()).toBe(true);

    const players = wrapper.find('[data-testid="map-list-players"]');
    const tourists = wrapper.find('[data-testid="map-list-tourists"]');
    expect(players.text()).toContain('maps.mapCardPlayers');
    expect(players.text()).toContain('4');
    expect(tourists.text()).toContain('maps.mapCardTourists');
    expect(tourists.text()).toContain('2');
    expect(wrapper.text()).not.toContain('Alice');
    expect(wrapper.text()).not.toContain('maps.seatConfig');

    expect(wrapper.find('[data-testid="map-list-players-icon"]').attributes('data-icon')).toBe(
      'map-card-players',
    );
    expect(wrapper.find('[data-testid="map-list-tourists-icon"]').attributes('data-icon')).toBe(
      'map-card-tourists',
    );
    expect(wrapper.find('[data-testid="map-list-divider-stats"]').exists()).toBe(true);

    // Preview above capacity rows in DOM.
    const html = wrapper.html();
    expect(html.indexOf('map-preview-stub')).toBeLessThan(html.indexOf('map-list-players'));
    expect(html.indexOf('map-list-players')).toBeLessThan(html.indexOf('map-list-tourists'));
  });

  it('SC-MAP-66: status overlay centered on preview; empty when no status slot', () => {
    expect(vueSrc).toMatch(/\.map-list-tile__status[\s\S]*left:\s*50%/);
    expect(vueSrc).toMatch(/\.map-list-tile__status[\s\S]*translateX\(-50%\)/);
    expect(vueSrc).toMatch(/\.map-list-tile__status[\s\S]*top:\s*[6-9]px|top:\s*10px/);

    const empty = getWrapper();
    expect(empty.find('[data-testid="map-list-status"]').exists()).toBe(false);

    const withBadge = mount(MapListCardTile, {
      props: {
        grid: GRID,
        players: 2,
        touristsPerPlayer: 1,
        testId: 'maps-row-draft',
      },
      slots: {
        status:
          '<span class="map-list-status-badge map-list-status-badge--muted" data-test-id="maps-status-draft">content.taskSetCardBadge.draft</span>',
      },
      global: { stubs },
    });

    const status = withBadge.find('[data-testid="map-list-status"]');
    expect(status.exists()).toBe(true);
    expect(status.classes()).toContain('map-list-tile__status');
    expect(status.text()).toContain('content.taskSetCardBadge.draft');
    // Overlay lives inside preview host.
    expect(
      withBadge.find('.map-list-tile__preview').find('[data-testid="map-list-status"]').exists(),
    ).toBe(true);
    expect(messages.content.taskSetCardBadge.draft).toBe('ЧЕРНОВИК');
    expect(messages.content.taskSetCardBadge.pending).toBe('НА ПРОВЕРКЕ');
    expect(messages.content.taskSetCardBadge.needs_revision).toBe('ДОРАБОТАТЬ');
    expect(messages.content.taskSetCardBadge.unpublished).toBe('СНЯТО');
  });

  it('SC-MAP-67: pack-card chrome aliases; muted 0.72+dashed; outline action pad', () => {
    expect(vueSrc).toMatch(/--map-list-bg:\s*var\(--pack-card-bg\)/);
    expect(vueSrc).toMatch(/--map-list-border:\s*var\(--pack-card-border\)/);
    expect(vueSrc).toMatch(/--map-list-border-hover:\s*var\(--pack-card-border-hover\)/);
    expect(vueSrc).toMatch(/--map-list-shadow-hover:\s*var\(--pack-card-shadow-hover\)/);
    expect(vueSrc).toMatch(/--map-list-action-h:\s*var\(--pack-card-action-h\)/);
    expect(vueSrc).toMatch(/\.map-list-tile--muted[\s\S]*opacity:\s*0\.72/);
    expect(vueSrc).toMatch(/\.map-list-tile--muted[\s\S]*border-style:\s*dashed/);
    expect(vueSrc).toMatch(/\.map-list-tile__actions[\s\S]*padding:\s*3px\s+8px\s+8px/);
    expect(vueSrc).toMatch(/\.map-list-tile__actions[\s\S]*border-top:\s*1px\s+solid/);
    expect(vueSrc).toMatch(/q-btn--outline:before[\s\S]*border-color:\s*var\(--map-list-border\)/);
    expect(vueSrc).toMatch(/\.q-btn\s+\.q-icon[\s\S]*font-size:\s*18px/);
    expect(vueSrc).toMatch(/\.map-list-tile__actions[\s\S]*white-space:\s*nowrap/);
    expect(vueSrc).not.toMatch(/transform:\s*scale/);
    expect(vueSrc).not.toMatch(/border-color:\s*var\(--q-secondary\)/);
    expect(appScss).toMatch(/--pack-card-bg:\s*#ffffff/);
    expect(appScss).toMatch(/body\.body--dark[\s\S]*--pack-card-bg:\s*#2a2a2a/);

    const muted = mount(MapListCardTile, {
      props: {
        grid: GRID,
        players: 3,
        touristsPerPlayer: 2,
        muted: true,
        testId: 'maps-row-muted',
      },
      slots: {
        actions:
          '<button type="button" class="q-btn q-btn--outline" data-test-id="maps-unpublish">content.taskSetCardUnpublish</button>',
      },
      global: { stubs },
    });

    expect(muted.classes()).toContain('map-list-tile--muted');
    expect(muted.find('.map-list-tile__actions').exists()).toBe(true);
    expect(muted.find('[data-test-id="maps-unpublish"]').text()).toContain(
      'content.taskSetCardUnpublish',
    );
    expect(messages.content.taskSetCardUnpublish).toBe('Снять');
    expect(messages.content.taskSetCardRepublish).toBe('Вернуть');
  });

  it('SC-MAP-68: iconMaskVars quote Vite mask url() so data: SVGs stay valid', () => {
    // Source must use url("${imported}") — unquoted url(data:image/svg+xml,…) is invalid CSS.
    expect(vueSrc).toMatch(/url\("\$\{iconPlayers\}"\)/);
    expect(vueSrc).toMatch(/url\("\$\{iconTourists\}"\)/);
    expect(vueSrc).toMatch(/url\("\$\{iconBadgePending\}"\)/);
    expect(vueSrc).toMatch(/url\("\$\{iconBadgeUnpublished\}"\)/);
    expect(vueSrc).toMatch(/url\("\$\{iconBadgeDraft\}"\)/);
    expect(vueSrc).not.toMatch(
      /url\(\$\{icon(?:Players|Tourists|BadgePending|BadgeUnpublished|BadgeDraft)\}\)/,
    );

    const wrapper = getWrapper();
    const style = wrapper.attributes('style') ?? '';
    for (const key of [
      '--map-list-icon-players',
      '--map-list-icon-tourists',
      '--map-list-icon-pending',
      '--map-list-icon-unpublished',
      '--map-list-icon-draft',
    ]) {
      expect(style).toContain(`${key}:`);
    }
    // Computed custom properties must start with quoted url("…
    expect(style).toMatch(/--map-list-icon-players:\s*url\("/);
    expect(style).toMatch(/--map-list-icon-tourists:\s*url\("/);
    expect(style).toMatch(/--map-list-icon-draft:\s*url\("/);
  });
});

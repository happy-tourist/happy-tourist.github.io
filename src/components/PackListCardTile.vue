<template>
  <div
    class="pack-list-tile"
    :class="{
      'pack-list-tile--clickable': clickable,
      'pack-list-tile--muted': muted,
      'cascade-gap-outline': cascadeGap,
    }"
    :data-test-id="testId"
    :data-testid="testId"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="onBodyClick"
    @keydown.enter.prevent="onBodyClick"
    @keydown.space.prevent="onBodyClick"
  >
    <div class="pack-list-tile__chrome">
      <div class="pack-list-tile__leading" @click.stop>
        <slot name="leading" />
      </div>
      <div class="pack-list-tile__status">
        <slot name="status" />
      </div>
      <div class="pack-list-tile__trailing" @click.stop>
        <slot name="trailing" />
      </div>
    </div>

    <div class="pack-list-tile__body">
      <div class="pack-list-tile__title">{{ title }}</div>
      <div v-if="$slots.caption" class="pack-list-tile__caption">
        <slot name="caption" />
      </div>
    </div>

    <div v-if="$slots.actions" class="pack-list-tile__actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Truncated primary label (pack title or task-set label). */
    title: string;
    clickable?: boolean;
    /** Soft-unpublished / gray row chrome. */
    muted?: boolean;
    /** Editor cascade-gap highlight (SC-PACK-126). */
    cascadeGap?: boolean;
    testId?: string;
  }>(),
  {
    clickable: false,
    muted: false,
    cascadeGap: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

function onBodyClick() {
  emit('open');
}
</script>

<style scoped>
/* Fixed 100×200 catalog / task-set cards (D13 / SC-PACK-228/229). */
.pack-list-tile {
  --pack-list-bg: #ffffff;
  --pack-list-fg: rgba(0, 0, 0, 0.87);
  --pack-list-muted: rgba(0, 0, 0, 0.7);
  --pack-list-border: rgba(0, 0, 0, 0.14);

  position: relative;
  box-sizing: border-box;
  width: 100px;
  height: 200px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-list-border);
  background: var(--pack-list-bg);
  color: var(--pack-list-fg);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .pack-list-tile {
  --pack-list-bg: #2a2a2a;
  --pack-list-fg: rgba(255, 255, 255, 0.92);
  --pack-list-muted: rgba(255, 255, 255, 0.78);
  --pack-list-border: rgba(255, 255, 255, 0.22);
}

.pack-list-tile--clickable {
  cursor: pointer;
}

.pack-list-tile--clickable:hover {
  border-color: var(--q-secondary);
  box-shadow: 0 0 0 1px var(--q-secondary);
}

.pack-list-tile--muted {
  opacity: 0.72;
  color: var(--pack-list-muted);
}

.pack-list-tile__chrome {
  position: relative;
  flex: 0 0 auto;
  min-height: 2rem;
  padding: 0.15rem 0.2rem 0;
}

.pack-list-tile__leading {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
}

.pack-list-tile__trailing {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
}

.pack-list-tile__status {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0.2rem 1.5rem 0;
  min-height: 1.25rem;
}

.pack-list-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.45rem;
  text-align: center;
}

.pack-list-tile__title {
  font-weight: 600;
  font-size: 0.8rem;
  line-height: 1.25;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  color: var(--pack-list-fg);
}

.pack-list-tile__caption {
  margin-top: 0.25rem;
  font-size: 0.68rem;
  line-height: 1.2;
  color: var(--pack-list-muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.pack-list-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.1rem;
  padding: 0.15rem 0.2rem 0.35rem;
}
</style>

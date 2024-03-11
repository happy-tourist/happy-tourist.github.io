<script setup>
import { reactive, ref } from 'vue';

const props = defineProps(['modelValue']);
const emits = defineEmits(['update:modelValue']);

const model = reactive({
  value: props.modelValue,
});

const isShow = ref(false);

const scope = {
  initialValue: props.modelValue,
  set: () => emits('update:modelValue', model.value),
  cancel: () => {
    model.value = props.modelValue;
    isShow.value = false;
  },
};

const menu = ref();
const qmenu = ref();
const menu2 = ref();
const cssText = ref('');

function debounce(callee, timeoutMs) {
  return function perform(...args) {
    const previousCall = this.lastCall;
    this.lastCall = Date.now();
    if (previousCall && this.lastCall - previousCall <= timeoutMs) {
      clearTimeout(this.lastCallTimer);
    }

    this.lastCallTimer = setTimeout(() => callee(...args), timeoutMs);
  };
}

const config = { attributes: true };
const callback = debounce((mutationList) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const mutation of mutationList) {
    if (mutation.type === 'childList') {
      console.log('A child node has been added or removed.');
    } else if (mutation.type === 'attributes') {
      cssText.value = menu.value.parentElement.style.cssText;
    }
  }
}, 150);

const observer = new MutationObserver(callback);

const hideMenu = () => {
  qmenu.value.hide();
  observer.disconnect();
  // eslint-disable-next-line no-use-before-define
  document.removeEventListener('click', onClickOutside);
};

const onClickOutside = (e) => {
  if (!menu2.value.$el.contains(e.target)) hideMenu();
};

const onShow = () => {
  observer.observe(menu.value.parentElement, config);

  document.addEventListener('click', onClickOutside);
  isShow.value = true;
};
</script>

<template>
  <q-menu
    ref="qmenu"
    @show="onShow"
    @hide="isShow = false"
    class="invisible"
    no-focus fit transition-duration="0"
    persistent
  >
    <div
      ref="menu"
      class="q-pa-sm"
    >
      <slot
        :model="model"
        v-bind="scope"
      />
    </div>
  </q-menu>
  <q-card
    ref="menu2"
    v-if="isShow"
    class="bg-white q-pa-sm fixed popup-edit"
    :style="cssText"
  >
    <slot
      :model="model"
      v-bind="scope"
    />
  </q-card>
</template>

<style lang="scss">
.popup-edit{
  width: max-content;
  z-index: 1;
}
</style>

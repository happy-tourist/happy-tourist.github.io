<script setup>
import {computed, inject, ref} from 'vue';
import { EditLineModal } from 'src/modules/translator/EditLineModal';

const props = defineProps(['indexLine', 'line'])

const { entity } = inject('entities');

const showModal = ref(false);

const translate = computed(() => entity.value.text.translates && entity.value.text.translates[props.indexLine])
</script>

<template>
  <span
    class="text-body1 cursor-pointer q-mr-sm"
    :class="translate ? '' : 'text-bold'"
    style="white-space: pre-line"
    @click="showModal = true"
  >
    {{ translate || line }}
  </span>

  <EditLineModal v-model="showModal" :line="line" :index-line="indexLine" />
</template>

<script setup>
import { inject, ref, watch } from 'vue';
import { ref as storageRef, getBytes } from 'firebase/storage';
import { useFirebaseStorage } from 'vuefire';
import { getText } from 'src/modules/translator/shared/utils';
import { TextLine } from 'src/modules/translator/TextLine';
import PinchScrollZoom from '@coddicat/vue-pinch-scroll-zoom';
import '@coddicat/vue-pinch-scroll-zoom/style.css';

const { entity } = inject('entities');
const { increaseLoadings, decreaseLoadings } = inject('loading');

const storage = useFirebaseStorage();
const originalFileRef = storageRef(storage, entity.value.text.originalText);
const originalFile = ref();

const loadOriginal = async () => {
  increaseLoadings();
  originalFile.value = await getBytes(originalFileRef).finally(() => {
    decreaseLoadings();
  });
};

loadOriginal();

const originalText = ref([]);
const pdfContainer = ref(null);

watch([originalFile, entity], async () => {
  increaseLoadings();
  originalText.value = await getText(originalFile.value, entity.value.format, pdfContainer).finally(() => {
    decreaseLoadings();
  });
}, { immediate: true })

const maxWidth = window.innerWidth - 32;
const maxHeight = window.innerHeight - 32;
</script>

<template>
  <div>
    <PinchScrollZoom
      v-if="entity.format === 'pdf'"
      within
      key-actions
      :min-scale="0.3"
      :max-scale="6"
      :width="maxWidth"
      :height="maxHeight"
      :content-height="20000"
    >
      <div ref="pdfContainer" class="d-flex flex-column"></div>
    </PinchScrollZoom>
    <p
      v-for="(p, indexP) in originalText"
      :key="indexP"
      class="q-mb-md"
      style="max-width: calc(100vw - 32px);"
    >
      <TextLine
        v-for="(line, indexLine) in p"
        :key="indexLine"
        :index-line="`${indexP}${indexLine}`"
        :line="line"
      />
    </p>
  </div>
</template>

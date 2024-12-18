<script setup>
import { inject, ref, watch } from 'vue';
import { ref as storageRef, getBytes } from 'firebase/storage';
import { useFirebaseStorage } from 'vuefire';
import { getText } from 'src/modules/translator/shared/utils';
import { TextLine } from 'src/modules/translator/TextLine';
import { useMotions } from '@vueuse/motion'

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

const motions = useMotions();

const pinchHandler = ({ offset: [d, a] }) => {
  if (!motions.zoom) return

  motions.zoom.apply({ zoom: d, rotateZ: a })
}
</script>

<template>
  <div v-motion="'zoom'" v-pinch="pinchHandler">
    <div ref="pdfContainer" class="d-flex flex-column"></div>
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

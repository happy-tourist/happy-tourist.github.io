<script setup>
import { inject, computed, ref } from 'vue';
import { ref as storageRef, getBytes } from 'firebase/storage';
import { useFirebaseStorage } from 'vuefire';
import { getText } from 'src/modules/translator/shared/utils';
import { TextLine } from 'src/modules/translator/TextLine';

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

const originalText = computed(() => getText(originalFile.value));
</script>

<template>
  <div>
    <p
      v-for="(p, indexP) in originalText"
      :key="indexP"
      class="q-mb-md"
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

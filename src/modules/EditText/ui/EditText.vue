<script setup>
import { useFirestore } from 'vuefire';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import { inject } from 'vue';
import EditLine from 'src/modules/EditText/ui/EditLine.vue';

const db = useFirestore();

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  text,
} = inject('app');

const addTranslate = async (lid, translate) => {
  increaseCounterLoadings();
  const translates = Object.assign(text.value?.translates || {}, {
    [lid]: translate,
  });
  await updateDoc(doc(db, 'texts', text.value.id), {
    translates,
  }).finally(() => {
    decreaseCounterLoadings();
  });
};
</script>

<template>
  <div v-if="text">
    <p
      v-for="(p, indexP) in text.originalText"
      :key="indexP"
      class="q-mb-md"
    >
      <EditLine
        v-for="(line, indexLine) in p"
        :key="indexLine"
        :line="line"
        :translate="text.translates && text.translates[`${indexP}${indexLine}`]"
        @add-translate="addTranslate(`${indexP}${indexLine}`, $event)"
      />
    </p>
  </div>
</template>

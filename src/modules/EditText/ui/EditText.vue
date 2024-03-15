<script setup>
import { useFirestore, useDocument } from 'vuefire';
import {
  doc,
  // updateDoc,
  collection,
} from 'firebase/firestore';
import {
  inject,
  // nextTick,
  // ref,
  provide,
} from 'vue';
// import EditLine from 'src/modules/EditText/ui/EditLine.vue';
// import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
// import { ExampleText } from 'src/modules/ExampleText';
// import { useScroll } from '@vueuse/core';

const db = useFirestore();

const {
  // increaseCounterLoadings,
  // decreaseCounterLoadings,
  entity,
} = inject('app');

const text = useDocument(doc(collection(db, 'texts'), entity.value.tid));

provide('text', text);

// const addTranslate = async (lid, translate) => {
//   increaseCounterLoadings();
//   const translates = Object.assign(text.value?.translates || {}, {
//     [lid]: translate,
//   });
//   await updateDoc(doc(db, 'texts', text.value.id), {
//     translates,
//   }).finally(() => {
//     decreaseCounterLoadings();
//   });
// };

// const showPanes = ref(false);
// const pane1 = ref();
// const pane2 = ref();

// const togglePane = () => {
//   showPanes.value = !showPanes.value;
//
//   if (showPanes.value) {
//     nextTick(() => {
//       const { y } = useScroll(pane2.value.$el, { behavior: 'smooth' });
//       y.value = pane1.value.$el.scrollTop;
//     });
//   }
// };
</script>

<template>
  <div>
    {{ text }}
  </div>
</template>

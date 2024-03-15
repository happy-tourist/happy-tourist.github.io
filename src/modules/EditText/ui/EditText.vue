<script setup>
import { useFirestore, useDocument } from 'vuefire';
import {
  doc,
  updateDoc,
  collection,
} from 'firebase/firestore';
import {
  inject,
  nextTick,
  ref,
  computed, provide,
} from 'vue';
import EditLine from 'src/modules/EditText/ui/EditLine.vue';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { ExampleText } from 'src/modules/ExampleText';
import { useScroll } from '@vueuse/core';

const db = useFirestore();

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const document = useDocument(doc(collection(db, 'texts'), entity.value.tid));
const text = computed(() => document?.data.value && document?.data.value[0]);

provide('text', text);

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

const showPanes = ref(false);
const pane1 = ref();
const pane2 = ref();

const togglePane = () => {
  showPanes.value = !showPanes.value;

  if (showPanes.value) {
    nextTick(() => {
      const { y } = useScroll(pane2.value.$el, { behavior: 'smooth' });
      y.value = pane1.value.$el.scrollTop;
    });
  }
};
</script>

<template>
  <splitpanes v-if="text" horizontal class="default-theme" style="height: calc(100dvh - 175px)">
    <pane ref="pane1" class="overflow-auto bg-white">
      <q-btn
        round
        color="secondary"
        :icon="showPanes ? 'visibility_off' : 'visibility'"
        size="sm"
        class="absolute"
        style="right: 30px;"
        @click="togglePane"
      />

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
    </pane>
    <pane ref="pane2" v-if="showPanes" class="overflow-auto bg-white">
      <ExampleText />
    </pane>
  </splitpanes>
</template>

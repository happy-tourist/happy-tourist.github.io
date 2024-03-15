<script setup>
import { useFirestore } from 'vuefire';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  inject,
  nextTick,
  ref,
  computed,
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

const addTranslate = async (lid, translate) => {
  increaseCounterLoadings();
  const translates = Object.assign(entity.value.text.translates || {}, {
    [lid]: translate,
  });
  await updateDoc(doc(db, 'entities', entity.value.id), {
    text: {
      ...entity.value.text,
      translates,
    },
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

const originalText = computed(() => {
  const decoder = new TextDecoder();
  const arr = new Uint8Array(JSON.parse(entity.value.text.originalText));
  const paragraphs = decoder.decode(arr).replace(/(\r)/gm, '').split('\n').filter(Boolean);
  // eslint-disable-next-line no-restricted-globals
  const paragraphsFiltered = paragraphs.filter((s) => isNaN(Number(s)) && !s.includes('-->'));
  const paragraphsByLines = [];

  paragraphsFiltered.forEach((p) => {
    paragraphsByLines.push(p.replace(/([.?!])\s*(?=[A-Za-zА-Яа-я])/g, '$1|').split('|'));
  });

  const paragraphsByLinesObj = {};

  paragraphsByLines.forEach((parent, indexParent) => {
    parent.forEach((child, indexChild) => {
      if (paragraphsByLinesObj[indexParent]) {
        paragraphsByLinesObj[indexParent] = {
          ...paragraphsByLinesObj[indexParent],
          [indexChild]: child,
        };
      } else {
        paragraphsByLinesObj[indexParent] = {
          [indexChild]: child,
        };
      }
    });
  });

  return paragraphsByLinesObj;
});
</script>

<template>
  <splitpanes
    v-if="entity.text" horizontal class="default-theme" style="height: calc(100dvh - 175px)">
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
        v-for="(p, indexP) in originalText"
        :key="indexP"
        class="q-mb-md"
      >
        <EditLine
          v-for="(line, indexLine) in p"
          :key="indexLine"
          :line="line"
          :translate="entity.text.translates && entity.text.translates[`${indexP}${indexLine}`]"
          @add-translate="addTranslate(`${indexP}${indexLine}`, $event)"
        />
      </p>
    </pane>
    <pane ref="pane2" v-if="showPanes" class="overflow-auto bg-white">
      <ExampleText />
    </pane>
  </splitpanes>
</template>

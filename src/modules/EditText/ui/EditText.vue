<script setup>
import { useFirestore, useFirebaseStorage } from 'vuefire';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  inject,
  nextTick,
  ref,
  computed,
  watch,
} from 'vue';
import EditLine from 'src/modules/EditText/ui/EditLine.vue';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { ExampleText } from 'src/modules/ExampleText';
import { useElementBounding, useScroll } from '@vueuse/core';
import { ref as storageRef, getBytes } from 'firebase/storage';

const db = useFirestore();

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const storage = useFirebaseStorage();
const originalFileRef = storageRef(storage, entity.value.text.originalText);
const originalArr = ref();
const exampleArr = ref();

const loadOriginal = async () => {
  increaseCounterLoadings();
  originalArr.value = await getBytes(originalFileRef).finally(() => {
    decreaseCounterLoadings();
  });
};

loadOriginal();

const loadExample = async () => {
  const exampleFileRef = storageRef(storage, entity.value.text.exampleText);
  increaseCounterLoadings();
  exampleArr.value = await getBytes(exampleFileRef).finally(() => {
    decreaseCounterLoadings();
  });
};

if (entity.value.text.exampleText) {
  loadExample();
}

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

const getText = (arr) => {
  if (!arr) return;

  const decoder = new TextDecoder();
  const paragraphs = decoder.decode(arr).replace(/(<([^>]+)>)|‘|'|"/ig, '')
    .replace(/(\r)/gm, '').split('\n')
    .filter(Boolean);
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

  // eslint-disable-next-line consistent-return
  return paragraphsByLinesObj;
};

const originalText = computed(() => getText(originalArr.value));
const exampleText = computed(() => getText(exampleArr.value));

const scrollTop = ref(0);

watch(scrollTop, (cur) => {
  if (!cur) return;

  const rect = useElementBounding(pane1.value.$el);

  const { y } = useScroll(pane1.value.$el, { behavior: 'smooth' });

  y.value += cur - rect.y.value;

  scrollTop.value = 0;
});
</script>

<template>
  <div class="d-flex" style="height: 1px;flex-grow: 1;">
    <splitpanes
      v-if="entity.text"
      horizontal class="default-theme"
      style="height: auto;flex: 1;"
    >
      <pane
        ref="pane1"
        class="q-pa-md overflow-auto bg-white">
        <q-btn
          round
          color="secondary"
          :icon="showPanes ? 'visibility_off' : 'visibility'"
          size="sm"
          class="absolute"
          style="right: 30px;z-index: 1;"
          @click="togglePane"
        />

        <p
          v-for="(p, indexP) in originalText"
          :key="indexP"
          class="q-mb-md"
        >
          <EditLine
            v-for="(line, indexLine) in p"
            v-model="scrollTop"
            :key="indexLine"
            :line="line"
            :translate="entity.text.translates && entity.text.translates[`${indexP}${indexLine}`]"
            @add-translate="addTranslate(`${indexP}${indexLine}`, $event)"
          />
        </p>
      </pane>
      <pane ref="pane2" v-if="showPanes" class="q-pa-md overflow-auto bg-white">
        <ExampleText :exampleText="exampleText" @load="loadExample" />
      </pane>
    </splitpanes>
  </div>
</template>

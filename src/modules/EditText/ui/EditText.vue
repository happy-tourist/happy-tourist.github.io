<script setup>
import { useFirestore } from 'vuefire';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import { inject, ref } from 'vue';
import EditLine from 'src/modules/EditText/ui/EditLine.vue';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';

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

const showPanes = ref(false);
</script>

<template>
  <splitpanes v-if="text" horizontal class="default-theme" style="height: calc(100dvh - 175px)">
    <pane class="overflow-auto bg-white">
      <q-btn
        round
        color="secondary"
        :icon="showPanes ? 'visibility_off' : 'visibility'"
        size="sm"
        class="absolute"
        style="right: 30px;"
        @click="showPanes = !showPanes"
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
    <pane v-if="showPanes" class="overflow-auto bg-white">
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
  </splitpanes>
</template>

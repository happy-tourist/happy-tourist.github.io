<script setup>
import { computed, inject, ref } from 'vue';
import { addDoc, collection } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const props = defineProps(['modelValue']);
const emits = defineEmits(['update:modelValue']);

const show = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value),
});

const name = ref('');
const typeEntity = ref(null);
const file = ref(null);

const {
  user,
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const isDescription = computed(() => typeEntity.value?.value === 'description');

const db = useFirestore();

const readFile = (id) => {
  increaseCounterLoadings();
  const fr = new FileReader();
  fr.onload = async () => {
    const prepareResult = fr.result.replace(/(<([^>]+)>)|‘|'|"/ig, '');
    const paragraphs = prepareResult.replace(/(\r)/gm, '').split('\n').filter(Boolean);
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

    await addDoc(collection(db, 'texts'), {
      originalText: paragraphsByLinesObj,
      eid: id,
    }).finally(() => {
      decreaseCounterLoadings();
    });
  };

  fr.readAsText(file.value);
};

const onPush = async () => {
  increaseCounterLoadings();
  const parentFolders = [];
  if (entity.value) {
    parentFolders
      .push(...entity.value.parentFolders, { name: entity.value.name, id: entity.value.id });
  }
  const newEntity = await addDoc(collection(db, 'entities'), {
    uid: user.value.uid,
    type: typeEntity.value.value,
    name: name.value,
    parentId: entity.value?.id || '',
    parentFolders,
  }).finally(() => {
    decreaseCounterLoadings();
  });

  if (isDescription.value) {
    readFile(newEntity.id);
  }
};

const changeFile = () => {
  if (!/\.(txt|srt)$/i.test(file.value.name)) {
    file.value = null;
    alert('Не подходящий формат файла!');
  }
};

const onSubmit = async () => {
  await onPush();
  show.value = false;
  name.value = '';
  file.value = null;
  typeEntity.value = null;
};

const options = [
  {
    label: 'Раздел',
    value: 'folder',
  },
  {
    label: 'Текст',
    value: 'description',
  },
];
</script>

<template>
  <q-dialog v-model="show">
    <q-card class="q-pa-lg" style="min-width: 300px;">
      <q-form @submit.prevent="onSubmit" class="d-flex flex-column gap-2">
        <q-select
          v-model="typeEntity"
          filled
          :options="options"
          label="Добавить"
          :rules="[val => !!val || 'Обязательно']"
        />

        <q-input
          filled
          v-model="name"
          :rules="[val => !!val || 'Обязательно']"
          label="Название"
        />

        <q-file
          v-if="isDescription"
          filled
          v-model="file"
          :rules="[val => !!val || 'Обязательно']"
          label="Файл *.(srt|txt)"
          @update:model-value="changeFile"
        />

        <q-btn type="submit" label="Добавить" color="primary" />
      </q-form>
    </q-card>
  </q-dialog>
</template>

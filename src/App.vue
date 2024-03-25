<script setup>
import {
  useCollection,
  useCurrentUser,
  useFirebaseAuth,
  useFirestore,
} from 'vuefire';
import {
  computed,
  onMounted,
  provide,
  ref,
  watch,
} from 'vue';
import { getRedirectResult } from 'firebase/auth';
import { useQuasar } from 'quasar';
import { collection, query, where } from 'firebase/firestore';
import { useRoute } from 'vue-router';

const $q = useQuasar();
const user = useCurrentUser();
const auth = useFirebaseAuth();
const db = useFirestore();
const route = useRoute();

const allEntities = useCollection(() => (user.value ? query(collection(db, 'entities'), where('uid', '==', user.value?.uid)) : null));

const entities = computed(() => allEntities.data.value.filter((item) => item.parentId === (route.params.id || '')));
const entity = computed(() => allEntities.data.value.find((item) => item.id === (route.params.id || '')));

const counterLoadings = ref(0);

const increaseCounterLoadings = () => {
  counterLoadings.value += 1;
};
const decreaseCounterLoadings = () => {
  if (counterLoadings.value > 0) {
    counterLoadings.value -= 1;
  }
};

onMounted(() => {
  increaseCounterLoadings();
  getRedirectResult(auth).finally(() => {
    decreaseCounterLoadings();
  }).catch((reason) => {
    console.error('Failed redirect result', reason);
  });
});

watch(counterLoadings, (cur) => {
  if (cur) {
    $q.loading.show();
  } else {
    $q.loading.hide();
  }
});

watch(() => allEntities.pending, (cur) => {
  if (cur.value) {
    increaseCounterLoadings();
  } else {
    decreaseCounterLoadings();
  }
}, { deep: true });

watch(() => document.pending, (cur) => {
  if (cur.value) {
    increaseCounterLoadings();
  } else {
    decreaseCounterLoadings();
  }
}, { deep: true });

const hideHeader = ref(false);

provide('app', {
  user,
  entities,
  entity,
  hideHeader,
  increaseCounterLoadings,
  decreaseCounterLoadings,
});
</script>

<template>
  <router-view />
</template>

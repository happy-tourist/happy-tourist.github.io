import {inject, provide} from 'vue';
import {
  useCollection,
  useFirestore,
} from 'vuefire';
import { collection, query, where } from 'firebase/firestore';
import {
  computed,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';

const useEntities = () => {
  const { user } = inject('user');
  const { increaseLoadings, decreaseLoadings } = inject('loading');

  const db = useFirestore();
  const route = useRoute();

  const allEntities = useCollection(() => (user.value ? query(collection(db, 'entities'), where('uid', '==', user.value?.uid)) : null));

  const entities = computed(() => allEntities.data.value.filter((item) => item.parentId === (route.params.id || '')));
  const entity = computed(() => allEntities.data.value.find((item) => item.id === (route.params.id || '')));

  provide('entities', {
    entities,
    entity,
  });

  watch(() => allEntities.pending, (cur) => {
    if (cur.value) {
      increaseLoadings();
    } else {
      decreaseLoadings();
    }
  }, { deep: true });

  watch(() => document.pending, (cur) => {
    if (cur.value) {
      increaseLoadings();
    } else {
      decreaseLoadings();
    }
  }, { deep: true });
}

export default useEntities;

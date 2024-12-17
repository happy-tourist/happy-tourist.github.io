import {inject, provide} from 'vue';
import {
  useCollection,
  useFirestore,
} from 'vuefire';
import { collection, query, where } from 'firebase/firestore';
import {
  computed,
} from 'vue';
import { useRoute } from 'vue-router';

const useEntities = () => {
  const { user } = inject('user');

  const db = useFirestore();
  const route = useRoute();

  const allEntities = useCollection(() => (user.value ? query(collection(db, 'entities'), where('uid', '==', user.value?.uid)) : null));

  const entities = computed(() => allEntities.data.value.filter((item) => item.parentId === (route.params.id || '')));
  const entity = computed(() => allEntities.data.value.find((item) => item.id === (route.params.id || '')));

  provide('entities', {
    entities,
    entity,
  });
}

export default useEntities;

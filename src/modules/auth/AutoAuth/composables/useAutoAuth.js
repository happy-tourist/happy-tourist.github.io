import {
  inject,
  onMounted,
} from 'vue';
import {
  useFirebaseAuth,
} from 'vuefire';
import { getRedirectResult } from 'firebase/auth';

const useAutoAuth = () => {
  const { increaseLoadings, decreaseLoadings } = inject('loading');

  const auth = useFirebaseAuth();

  onMounted(() => {
    increaseLoadings();
    getRedirectResult(auth).finally(() => {
      decreaseLoadings();
    }).catch((reason) => {
      console.error('Failed redirect result', reason);
    });
  });
};

export default useAutoAuth;

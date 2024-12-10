import {
  useCurrentUser,
} from 'vuefire';
import {
  provide,
} from 'vue';

const useUser = () => {
  const user = useCurrentUser();


  provide('user', {
    user,
  });
};

export default useUser;

<script setup>
import { signOut } from 'firebase/auth';
import { useFirebaseAuth } from 'vuefire';
import { inject } from 'vue';
import { useRouter } from 'vue-router';

const auth = useFirebaseAuth();
const { increaseCounterLoadings, decreaseCounterLoadings } = inject('app');
const router = useRouter();
const logout = async () => {
  router.push({ name: 'index', params: { id: '' } });
  increaseCounterLoadings();
  await signOut(auth).finally(() => {
    decreaseCounterLoadings();
  });
};
</script>

<template>
  <q-btn @click="logout">
    logout
  </q-btn>
</template>

<script setup>
import { signOut } from 'firebase/auth';
import { useFirebaseAuth } from 'vuefire';
import { inject } from 'vue';
import { useRouter } from 'vue-router';

const auth = useFirebaseAuth();
const { increaseLoadings, decreaseLoadings } = inject('loading');
const router = useRouter();
const logout = async () => {
  router.push({ name: 'index', params: { id: '' } });
  increaseLoadings();
  await signOut(auth).finally(() => {
    decreaseLoadings();
  });
};
</script>

<template>
  <q-btn @click="logout">
    logout
  </q-btn>
</template>

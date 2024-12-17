<script setup>
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { useFirebaseAuth } from 'vuefire';
import { inject } from 'vue';

const { increaseLoadings, decreaseLoadings } = inject('loading');
const auth = useFirebaseAuth();
const login = async () => {
  increaseLoadings();
  const provider = new GoogleAuthProvider();

  await signInWithRedirect(auth, provider).finally(() => {
    decreaseLoadings();
  });
};
</script>

<template>
  <q-btn @click="login">
    login
  </q-btn>
</template>

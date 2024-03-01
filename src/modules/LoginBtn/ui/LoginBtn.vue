<script setup>
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useFirebaseAuth } from 'vuefire';
import { inject } from 'vue';

const { increaseCounterLoadings, decreaseCounterLoadings } = inject('app');
const auth = useFirebaseAuth();
const login = async () => {
  increaseCounterLoadings();
  const provider = new GoogleAuthProvider();

  await signInWithPopup(auth, provider).finally(() => {
    decreaseCounterLoadings();
  });
};
</script>

<template>
  <q-btn @click="login">
    login
  </q-btn>
</template>

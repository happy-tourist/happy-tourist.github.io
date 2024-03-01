<template>
  <q-page class="flex flex-center">
    <img
      alt="Quasar logo"
      src="~assets/quasar-logo-vertical.svg"
      style="width: 200px; height: 200px"
    >
    <ul v-if="!xxx.pending.value">
      <li v-for="item in xxx.value" :key="item.id">
        {{ item.ddd }}
      </li>
    </ul>

    <q-btn v-if="!user" @click="login">
      login
    </q-btn>

    <q-btn v-if="user" @click="logout">
      logout
    </q-btn>

    <template v-if="xxx.value.length">
      <q-btn @click="onUpdate">
        update
      </q-btn>

      <q-btn @click="onRemove">
        remove
      </q-btn>
    </template>
    <q-btn @click="onPush">
      push
    </q-btn>
  </q-page>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  where,
  query,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import {
  useFirebaseAuth,
  useFirestore,
  useCollection,
  useCurrentUser,
} from 'vuefire';
import { useQuasar } from 'quasar';

const db = useFirestore();
const auth = useFirebaseAuth();
const $q = useQuasar();

const login = async () => {
  const provider = new GoogleAuthProvider();

  $q.loading.show();
  await signInWithPopup(auth, provider);
};

const logout = async () => {
  await signOut(auth);
};

const q = query(collection(db, 'xxx'), where('ddd', '==', 'new data'));

const user = useCurrentUser();

const xxx = computed(() => useCollection(() => (user.value ? q : null)));

// $q.loading.show();

onMounted(() => {
  getRedirectResult(auth).finally(() => {
    // $q.loading.hide();
  }).catch((reason) => {
    console.error('Failed redirect result', reason);
  });
});

const onPush = async () => {
  await addDoc(collection(db, 'xxx'), { ddd: 'fdjfdjnfdjk' });
};

const onUpdate = async () => {
  await updateDoc(doc(db, 'xxx', xxx.value.data.value[1].id), { ddd: 'new data' });
};

const onRemove = async () => {
  await deleteDoc(doc(db, 'xxx', xxx.value.data.value[1].id));
};

watch(() => xxx.value.pending, (cur) => {
  if (cur.value) {
    $q.loading.show();
  } else {
    $q.loading.hide();
  }
}, { deep: true });
</script>

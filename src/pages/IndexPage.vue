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

    <template v-if="xxx.data.value[0] && !xxx.pending.value">
      <q-btn @click="onPush">
        push
      </q-btn>

      <q-btn @click="onUpdate">
        update
      </q-btn>

      <q-btn @click="onRemove">
        remove
      </q-btn>
    </template>
  </q-page>
</template>

<script setup>
import { onMounted, computed, watch } from 'vue';

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
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

const login = async () => {
  const provider = new GoogleAuthProvider();

  const user = await signInWithPopup(auth, provider);

  console.log('user', user);
};

const logout = async () => {
  await signOut(auth);
};

const user = useCurrentUser();

const xxx = computed(() => useCollection(user.value ? collection(db, 'xxx') : null));

const $q = useQuasar();
$q.loading.show();

onMounted(() => {
  getRedirectResult(auth).finally(() => {
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

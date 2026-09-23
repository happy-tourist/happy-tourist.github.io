<template>
  <q-page class="q-pa-md">
    <div class="text-muted">{{ $t('content.loading') }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Nested staff tasks page retired — hub shows cards + task sets inline (D2).
 * Keep route for bookmarks; redirect to request hub.
 */
const route = useRoute();
const router = useRouter();

onMounted(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  const id = typeof raw === 'string' ? raw : '';
  void router.replace(
    id ? { name: 'content-staff-request', params: { id } } : { name: 'content-staff' },
  );
});
</script>

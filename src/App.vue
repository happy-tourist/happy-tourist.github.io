<script setup>
import { useLoading } from 'src/modules/Loading'
import { useUser } from 'src/modules/User'

useLoading();
useUser();
</script>

<template>
  <router-view />
</template>

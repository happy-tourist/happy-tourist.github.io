import { defineBoot } from '#q-app';
import { Client } from '@colyseus/sdk';

export const client = new Client(import.meta.env.VITE_COLYSEUS_URL);

export default defineBoot(({ app }) => {
  app.config.globalProperties.$colyseus = client;
});

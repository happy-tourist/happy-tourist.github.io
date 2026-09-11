import { boot } from 'quasar/wrappers';
import { Client } from '@colyseus/sdk';

const url = import.meta.env.VITE_COLYSEUS_URL as string;

export const client = new Client(url);

export default boot(({ app }) => {
  app.config.globalProperties.$colyseus = client;
});

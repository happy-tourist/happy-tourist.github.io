import { boot } from 'quasar/wrappers';
import { GesturePlugin } from '@vueuse/gesture'
import { MotionPlugin } from '@vueuse/motion'

export default boot(({ app }) => {
  // Create I18n instance
  app.use(GesturePlugin).use(MotionPlugin);
});

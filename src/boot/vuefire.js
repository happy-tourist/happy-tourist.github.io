import { boot } from 'quasar/wrappers';
import { VueFire, VueFireAuth } from 'vuefire';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'translate-79432.firebaseapp.com',
  projectId: 'translate-79432',
  storageBucket: 'translate-79432.appspot.com',
  messagingSenderId: '3715344178',
  appId: '1:3715344178:web:ee3bd330e1dbe894df992b',
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

export default boot(({ app }) => {
  // Create I18n instance
  app.use(VueFire, {
    // imported above but could also just be created here
    firebaseApp,
    modules: [
      // we will see other modules later on
      VueFireAuth(),
    ],
  });
});

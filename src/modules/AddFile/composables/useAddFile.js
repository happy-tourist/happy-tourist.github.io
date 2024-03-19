import { inject } from 'vue';

const useAddFile = () => {
  const {
    increaseCounterLoadings,
    decreaseCounterLoadings,
  } = inject('app');

  const readFile = (file, cb) => {
    increaseCounterLoadings();
    const fr = new FileReader();
    fr.onload = async () => {
      const prepareResult = fr.result.replace(/(<([^>]+)>)|‘|'|"/ig, '');
      const encoder = new TextEncoder();
      const view = JSON.stringify(Array.from(encoder.encode(prepareResult)));
      const view2 = JSON.stringify(Array.from(encoder.encode(view)));
      const view3 = JSON.stringify(Array.from(encoder.encode(view2)));
      const view4 = JSON.stringify(Array.from(encoder.encode(view3)));
      const view5 = JSON.stringify(Array.from(encoder.encode(view4)));
      console.log(view.length);
      console.log(view2.length);
      console.log(view3.length);
      console.log(view4.length);
      console.log(view5.length);
      await cb(view).finally(() => {
        decreaseCounterLoadings();
      });
    };

    fr.readAsText(file);
  };

  return { readFile };
};

export default useAddFile;

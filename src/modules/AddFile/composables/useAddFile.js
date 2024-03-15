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
      await cb(prepareResult).finally(() => {
        decreaseCounterLoadings();
      });
    };

    fr.readAsText(file);
  };

  return { readFile };
};

export default useAddFile;

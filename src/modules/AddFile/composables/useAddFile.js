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
      const paragraphs = prepareResult.replace(/(\r)/gm, '').split('\n').filter(Boolean);
      // eslint-disable-next-line no-restricted-globals
      const paragraphsFiltered = paragraphs.filter((s) => isNaN(Number(s)) && !s.includes('-->'));
      const paragraphsByLines = [];

      paragraphsFiltered.forEach((p) => {
        paragraphsByLines.push(p.replace(/([.?!])\s*(?=[A-Za-zА-Яа-я])/g, '$1|').split('|'));
      });

      const paragraphsByLinesObj = {};

      paragraphsByLines.forEach((parent, indexParent) => {
        parent.forEach((child, indexChild) => {
          if (paragraphsByLinesObj[indexParent]) {
            paragraphsByLinesObj[indexParent] = {
              ...paragraphsByLinesObj[indexParent],
              [indexChild]: child,
            };
          } else {
            paragraphsByLinesObj[indexParent] = {
              [indexChild]: child,
            };
          }
        });
      });

      await cb(paragraphsByLinesObj).finally(() => {
        decreaseCounterLoadings();
      });
    };

    fr.readAsText(file);
  };

  return { readFile };
};

export default useAddFile;

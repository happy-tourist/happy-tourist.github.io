export const getText = (text) => {
  if (!text) return;

  const decoder = new TextDecoder();
  const paragraphs = decoder.decode(text).replace(/(<([^>]+)>)|‘|'|"/ig, '')
    .replace(/(\r)/gm, '').split('\n')
    .filter(Boolean);

  const paragraphsFiltered = paragraphs.filter((s) => isNaN(Number(s)) && !s.includes('-->'));
  const paragraphsByLines = [];
  const prepareParagraphs = [];

  let acc = '';

  paragraphsFiltered.forEach((p) => {
    const lastChar = p.slice(-1);

    if (['.', '!', '?'].includes(lastChar)) {
      prepareParagraphs.push(`${acc ? `${acc} ` : ''}${p}`);
      acc = '';
    } else {
      acc += acc ? ` ${p}` : p;
    }
  });

  prepareParagraphs.forEach((p) => {
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

  return paragraphsByLinesObj;
};

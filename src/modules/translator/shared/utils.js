import * as pdfjsLib from 'pdfjs-dist/webpack';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
GlobalWorkerOptions.workerPort = new Worker(
  new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
  { type: 'module' }
);
import Epub from 'epubjs';

const getTXTParagraphs = (text) => {
  const decoder = new TextDecoder();

  return decoder.decode(text).replace(/(<([^>]+)>)|‘|'|"/ig, '')
    .replace(/(\r)/gm, '').split('\n')
    .filter(Boolean);
};

const getSRTParagraphs = (text) => {
  const prepareParagraphs = [];

  const paragraphs = getTXTParagraphs(text);

  const paragraphsFiltered = paragraphs.filter((s) => isNaN(Number(s)) && !s.includes('-->'));

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

  return prepareParagraphs;
};

const getFB2Paragraphs = (text) => {
  const decoder = new TextDecoder();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(decoder.decode(text), 'application/xml');

  const paragraphs = xmlDoc.querySelectorAll('body p');
  const paragraphTexts = Array.from(paragraphs).map(p => p.textContent.trim());

  return paragraphTexts;
}

const getEpubParagraphs = async (text) => {
  const book = await Epub(text);
  await book.ready;

  const spine = book.spine;

  const paragraphTexts = [];

  for (let i = 0; i < spine.length; i++) {
    const currentSection = spine.get(i);
    const href = currentSection.href;
    const content = await book.load(href);

    const paragraphs = content.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div');

    paragraphs.forEach(p => {
      const text = p.textContent.trim();

      if (text) {
        paragraphTexts.push(text);
      }
    });
  }

  return paragraphTexts;
}

const getPDFParagraphs = async (text, pdfContainer) => {
  console.log('getPDFParagraphs1')
  let paragraphTexts = [];
  try {
    const pdf = await pdfjsLib.getDocument(text).promise;
    console.log('getPDFParagraphs2')
    const numPages = pdf.numPages;
    console.log('numPages', numPages)

    const container = pdfContainer.value;
    console.log('container', container)
    container.innerHTML = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      console.log('page', page)

      // Получаем канвас для рендеринга страницы
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);
      console.log('container html', container)

      const viewport = page.getViewport({ scale: 1 });

      const canvasWidth = Math.min(viewport.width, window.innerWidth - 32);  // Ограничиваем ширину экрана
      const canvasHeight = (canvasWidth / viewport.width) * viewport.height;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext('2d');

      console.log('context', context)

      // Рендерим страницу на канвас
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    }

  } catch (error) {
    console.error('Ошибка загрузки PDF:', error);
  }
  return paragraphTexts;
}

export const getText = async (text, format, pdfContainer) => {
  if (!text) return;

  let prepareParagraphs = [];

  switch (format) {
    case 'fb2':
      prepareParagraphs = getFB2Paragraphs(text);
      break;
    case 'srt':
      prepareParagraphs = getSRTParagraphs(text);
      break;
    case 'epub':
      prepareParagraphs = await getEpubParagraphs(text);
      break;
    case 'pdf':
      prepareParagraphs = await getPDFParagraphs(text, pdfContainer);
      break;
    default:
      prepareParagraphs = getTXTParagraphs(text)
  }

  const paragraphsByLines = [];

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

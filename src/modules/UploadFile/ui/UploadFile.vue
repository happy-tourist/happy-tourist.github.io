<script setup>
import { useFileDialog, useVirtualList } from '@vueuse/core'
import {ref, onMounted, watch, computed, nextTick} from 'vue'
import Dexie from 'dexie'
import Epub from 'epubjs'

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

  const paragraphsByLines = [];

  paragraphTexts.forEach((p) => {
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
}

const db = new Dexie('FileStorage')
db.version(1).stores({
  files: '++id, name, type, size, uploaded' // Храним только метаданные
})

const filesMeta = ref([]) // Только метаданные без содержимого

// Загрузка только метаданных
const loadFilesMeta = async () => {
  filesMeta.value = await db.files
      .orderBy('uploaded')
      .reverse()
      .toArray()
}

onMounted(async () => {
  await loadFilesMeta()
})

// Инициализация файлового диалога
const { files: selectedFiles, open: openFileDialog } = useFileDialog({
  accept: '.epub',
  multiple: false
})

function getFileNameWithoutExtension(filename) {
  // Удаляем всё после последней точки (включая саму точку)
  return filename.replace(/\.[^/.]+$/, "");
}

// Сохранение файла (содержимое хранится отдельно)
const saveFile = async (file) => {
  const textContent = await getEpubParagraphs(file)
  const blob = new Blob([JSON.stringify(textContent)], { type: 'text/plain' })

  await db.files.add({
    name: `${getFileNameWithoutExtension(file.name)}.txt`,
    size: file.size,
    data: blob, // Содержимое хранится, но не выбирается при запросе метаданных
    uploaded: new Date()
  })
}

// Получение полных данных файла по ID
const getFileContent = async (id) => {
  return await db.files.get(id)
}

const originalText = ref({});

const flatItems = computed(() => Object.entries(originalText.value).map(([pKey, sentences]) => ({
  id: parseInt(pKey),
  sentences: Object.values(sentences),
  height: Object.keys(sentences).length * 20 + 30 // 20px на строку + 30px отступ
})))

const { list, containerProps, wrapperProps } = useVirtualList(
    flatItems,
    {
      itemHeight: 20
    }
)

// Скачивание файла (загружаем содержимое только при необходимости)
const downloadFile = async (id) => {
  const file = await getFileContent(id)
  const text = await file.data.text();

  originalText.value = JSON.parse(text);

  nextTick(() => {
    console.log('virtualLines', virtualLines.value)
  })
}

// Удаление файла
const deleteFile = async (id) => {
  await db.files.delete(id)
  await loadFilesMeta()
}

// Обработка выбора файла
watch(selectedFiles, async (files) => {
  if (!files?.length) return

  try {
    await saveFile(files[0])
    await loadFilesMeta()
    alert('Файл успешно сохранён!')
  } catch (error) {
    console.error('Ошибка сохранения:', error)
    alert('Ошибка при сохранении файла')
  }
})
</script>

<template>
  <div>
    <button @click="openFileDialog()">
      📁 Выбрать и сохранить файл
    </button>


    <!--    <div>
          <p v-for="(p, indexP) in virtualLines" :key="indexP">
            <span v-for="(line, indexLine) in p" :key="indexLine">
              {{ line }}
            </span>
          </p>
        </div>-->
    <div>
      <div v-bind="containerProps" class="container">
        <div v-bind="wrapperProps">
          <p
              v-for="p in list"
              :key="p.index"
              :style="{
              borderBottom: '1px solid #eee',
              padding: '0 12px'
            }"
          >
            <span v-for="(line, indexLine) in p.data.sentences" :key="indexLine">
              {{ line }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <div v-if="filesMeta.length" class="file-list">
      <h3>Сохранённые файлы:</h3>
      <div
          v-for="file in filesMeta"
          :key="file.id"
          class="file-item"
          @click="downloadFile(file.id)"
      >
        <div class="file-info">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ (file.size / 1024).toFixed(2) }} KB</span>
          <span class="file-date">{{ new Date(file.uploaded).toLocaleString() }}</span>
        </div>
        <button @click.stop="deleteFile(file.id)">❌ Удалить</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  height: 300px;
  overflow-y: auto;
  margin-top: 20px;
  border: 1px solid #ccc;
}
.file-list {
  margin-top: 20px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: bold;
  margin-right: 10px;
}

.file-size {
  color: #666;
  margin-right: 10px;
}

.file-date {
  color: #888;
}

.file-actions button {
  margin-left: 10px;
  padding: 5px 10px;
}

.empty-state {
  margin-top: 20px;
  color: #888;
}
</style>
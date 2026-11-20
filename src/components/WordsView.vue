<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { orderedCards } from '../domain/study'
import { statusLabel } from '../labels'
import { editCard, removeCard, returnToStudy, study } from '../store'

const query = ref('')
const selectedId = ref<string | null>(null)
const ru = ref('')
const en = ref('')
const confirmDelete = ref(false)

const cards = computed(() => orderedCards(study.cards, query.value))
const selected = computed(() => study.cards.find((card) => card.id === selectedId.value) ?? null)

watch(selected, (card) => {
  ru.value = card?.ru ?? ''
  en.value = card?.en ?? ''
  confirmDelete.value = false
})

const canSave = computed(() => {
  if (!selected.value) return false
  if (!ru.value.trim()) return false
  if (selected.value.source === 'custom' && !en.value.trim()) return false
  return true
})

function save() {
  if (!selected.value || !canSave.value) return
  editCard(selected.value.id, ru.value, en.value)
  selectedId.value = null
}

function restore() {
  if (!selected.value) return
  returnToStudy(selected.value.id)
  selectedId.value = null
}

function remove() {
  if (!selected.value) return
  removeCard(selected.value.id)
  selectedId.value = null
}
</script>

<template>
  <section class="flex h-full flex-col">
    <div v-if="selected" class="flex min-h-0 flex-1 flex-col px-4 py-4">
      <button type="button" class="self-start py-2 text-sm text-accent" @click="selectedId = null">
        Назад
      </button>
      <h1 class="mt-2 font-serif text-3xl">Правка</h1>
      <p class="mt-2 text-sm text-muted">{{ statusLabel[selected.status] }}</p>

      <label class="mt-6 block text-sm text-muted" for="edit-ru">Русское</label>
      <input
        id="edit-ru"
        v-model="ru"
        class="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none"
        autocomplete="off"
      />

      <label class="mt-4 block text-sm text-muted" for="edit-en">Английское</label>
      <input
        v-if="selected.source === 'custom'"
        id="edit-en"
        v-model="en"
        class="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <p v-else id="edit-en" class="mt-2 font-serif text-2xl">{{ selected.en }}</p>

      <button
        type="button"
        class="mt-6 h-14 rounded-2xl bg-ink text-paper disabled:opacity-40"
        :disabled="!canSave"
        @click="save"
      >
        Сохранить
      </button>

      <button
        v-if="selected.status === 'known'"
        type="button"
        class="mt-3 h-12 text-accent"
        @click="restore"
      >
        Вернуть в обучение
      </button>

      <div v-if="selected.source === 'custom'" class="mt-auto pt-6">
        <div v-if="confirmDelete" class="flex items-center justify-between gap-3">
          <p>Удалить?</p>
          <button type="button" class="text-muted" @click="confirmDelete = false">Отмена</button>
          <button type="button" class="text-fail" @click="remove">Удалить</button>
        </div>
        <button v-else type="button" class="text-fail" @click="confirmDelete = true">Удалить</button>
      </div>
    </div>

    <template v-else>
      <div class="border-b border-line px-4 py-3">
        <input
          v-model="query"
          class="w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none"
          type="search"
          placeholder="Поиск"
          autocomplete="off"
        />
      </div>
      <ul v-if="cards.length" class="min-h-0 flex-1 overflow-y-auto">
        <li v-for="card in cards" :key="card.id" class="border-b border-line">
          <button
            type="button"
            class="flex w-full items-baseline justify-between gap-3 px-4 py-4 text-left"
            @click="selectedId = card.id"
          >
            <span class="min-w-0">
              <span class="block truncate font-serif text-xl">{{ card.ru }}</span>
              <span class="block truncate text-muted">{{ card.en }}</span>
            </span>
            <span class="shrink-0 text-sm text-muted">{{ statusLabel[card.status] }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="px-4 py-10 text-center text-muted">Ничего не найдено</p>
    </template>
  </section>
</template>

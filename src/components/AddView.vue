<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { addCustom } from '../store'

const ru = ref('')
const en = ref('')
const added = ref(false)
let silence = false

const canAdd = computed(() => ru.value.trim() !== '' && en.value.trim() !== '')

watch([ru, en], () => {
  if (silence) return
  added.value = false
})

async function submit() {
  if (!canAdd.value) return
  silence = true
  addCustom(ru.value, en.value)
  ru.value = ''
  en.value = ''
  added.value = true
  await nextTick()
  silence = false
}
</script>

<template>
  <form class="flex h-full flex-col px-4 py-6" @submit.prevent="submit">
    <h1 class="font-serif text-3xl">Новая карточка</h1>

    <label class="mt-8 block text-sm text-muted" for="add-ru">Русское</label>
    <input
      id="add-ru"
      v-model="ru"
      class="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none"
      autocomplete="off"
    />

    <label class="mt-4 block text-sm text-muted" for="add-en">Английское</label>
    <input
      id="add-en"
      v-model="en"
      class="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />

    <p v-if="added" class="mt-4 text-pass">Добавлено</p>

    <button
      type="submit"
      class="mt-6 h-14 rounded-2xl bg-ink text-paper disabled:opacity-40"
      :disabled="!canAdd"
    >
      Добавить
    </button>
  </form>
</template>

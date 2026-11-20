<script setup lang="ts">
import { ref } from 'vue'
import AddView from './components/AddView.vue'
import TodayView from './components/TodayView.vue'
import WordsView from './components/WordsView.vue'

type Tab = 'today' | 'words' | 'add'

const tab = ref<Tab>('today')

const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'words', label: 'Слова' },
  { id: 'add', label: 'Добавить' },
]
</script>

<template>
  <div class="mx-auto flex h-dvh max-w-lg flex-col bg-paper text-ink">
    <main class="min-h-0 flex-1">
      <TodayView v-if="tab === 'today'" />
      <WordsView v-else-if="tab === 'words'" />
      <AddView v-else />
    </main>
    <nav class="grid shrink-0 grid-cols-3 border-t border-line pb-[env(safe-area-inset-bottom)]">
      <button
        v-for="item in tabs"
        :key="item.id"
        type="button"
        class="px-2 py-3 text-sm"
        :class="tab === item.id ? 'font-semibold text-ink' : 'text-muted'"
        :aria-current="tab === item.id ? 'page' : undefined"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { counts } from '../domain/study'
import { answer, study, undoLast } from '../store'
import type { Grade } from '../domain/types'

const revealed = ref(false)

const current = computed(() => {
  const id = study.queue[0]?.id
  return study.cards.find((card) => card.id === id) ?? null
})

const totals = computed(() => counts(study.cards))

watch(
  () => current.value?.id,
  () => {
    revealed.value = false
  },
)

function grade(kind: Grade) {
  answer(kind)
  revealed.value = false
}

function undo() {
  undoLast()
  revealed.value = false
}
</script>

<template>
  <section class="flex h-full flex-col">
    <div v-if="current" class="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        class="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
        @click="revealed = true"
      >
        <p class="max-w-[12ch] font-serif text-[clamp(2rem,8vw,3.4rem)] leading-tight text-balance">
          {{ current.ru }}
        </p>
        <p
          v-if="revealed"
          class="max-w-[14ch] font-serif text-[clamp(1.7rem,6vw,2.6rem)] leading-tight text-accent text-balance"
        >
          {{ current.en }}
        </p>
        <p v-else class="text-sm text-muted">Нажми на карточку</p>
      </button>

      <div class="space-y-2 px-4 pb-4">
        <button
          v-if="study.undo"
          type="button"
          class="block w-full py-2 text-sm text-accent"
          @click="undo"
        >
          Отменить
        </button>
        <button type="button" class="block w-full py-2 text-muted" @click="grade('known')">
          Уже знаю
        </button>
        <div v-if="revealed" class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="h-14 rounded-2xl border border-fail text-lg text-fail active:scale-[0.98]"
            @click="grade('fail')"
          >
            Не помню
          </button>
          <button
            type="button"
            class="h-14 rounded-2xl bg-pass text-lg text-pass-ink active:scale-[0.98]"
            @click="grade('pass')"
          >
            Помню
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p class="font-serif text-4xl">На сегодня всё</p>
      <dl class="mt-10 grid w-full max-w-sm grid-cols-3 gap-3">
        <div>
          <dt class="text-sm text-muted">Новые</dt>
          <dd class="mt-1 font-serif text-3xl">{{ totals.fresh }}</dd>
        </div>
        <div>
          <dt class="text-sm text-muted">В обучении</dt>
          <dd class="mt-1 font-serif text-3xl">{{ totals.learning }}</dd>
        </div>
        <div>
          <dt class="text-sm text-muted">Знаю</dt>
          <dd class="mt-1 font-serif text-3xl">{{ totals.known }}</dd>
        </div>
      </dl>
      <button
        v-if="study.undo"
        type="button"
        class="mt-8 text-sm text-accent"
        @click="undo"
      >
        Отменить
      </button>
    </div>
  </section>
</template>

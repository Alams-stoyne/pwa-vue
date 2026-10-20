<template>
  <div class="page rules-page">
    <header class="head">
      <h1>{{ rules.TITLE || 'Правила шагомера' }}</h1>
    </header>

    <p v-if="rules.INTRO" class="intro">{{ rules.INTRO }}</p>

    <section class="sections">
      <article
        v-for="(s, i) in rules.SECTIONS || []"
        :key="s.id || i"
        class="section"
      >
        <h2 class="section-title">{{ s.title }}</h2>
        <p class="section-text">{{ s.text }}</p>
      </article>
    </section>

    <p v-if="!rules.SECTIONS?.length" class="muted empty">
      Правила временно недоступны.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStepsStore } from './store'

const store = useStepsStore()
const rules = computed(() => store.rules || { SECTIONS: [] })

onMounted(() => {
  store.loadRules()
})
</script>

<style scoped>
.rules-page { padding-bottom: 32px; }

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.head h1 { margin: 0; font-size: 22px; }

.intro {
  margin: 0 0 24px;
  font-size: 15px;
  line-height: 1.5;
  color: #21271f;
}

.sections {
  display: grid;
  gap: 20px;
}

.section {
  padding: 16px 18px;
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.section-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: #015f01;
  letter-spacing: -0.01em;
}

.section-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: #21271f;
  white-space: pre-line;
}

.empty {
  text-align: center;
  padding: 32px 16px;
  font-size: 14px;
}

@media (max-width: 420px) {
  .head h1 { font-size: 20px; }
  .section-title { font-size: 14px; }
  .section-text { font-size: 14px; }
}
</style>
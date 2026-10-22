<template>
  <div class="page support-tickets-page">

    <div v-if="store.loadingTickets" class="loading">Загрузка…</div>
    
    <div v-else-if="!store.tickets.length" class="empty">
      <div class="empty-icon">📭</div>
      <p>У вас пока нет обращений</p>
      <div class="bottom-action">
        <router-link to="/support" class="btn btn-primary btn-center">Написать в поддержку</router-link>        
      </div>
    </div>

    <div v-else class="tickets-list">
      <router-link 
        v-for="ticket in store.tickets" 
        :key="ticket.ID"
        :to="`/support/tickets/${ticket.ID}`"
        class="ticket-card"
      >
        <div class="ticket-header">
          <span class="ticket-date">{{ formatDate(ticket.CREATED_AT) }}</span>
          <span v-if="ticket.STATUS === 'answered'" class="badge-reply">Есть ответ</span>
          <span v-else-if="ticket.STATUS === 'closed'" class="badge-closed">Закрыто</span>
          <span v-else class="badge-pending">На проверке</span>
        </div>
        <p class="ticket-preview">{{ ticket.SUBJECT || 'Обращение в поддержку' }}</p>
        <span class="ticket-arrow">›</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSupportStore } from './store'
import { useAppBackground } from '../core/composables/useAppBackground'

const store = useSupportStore()
const { setBackground } = useAppBackground()

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.loadTickets()
})
</script>

<style scoped>
.support-tickets-page {
  padding-bottom: 24px;
}
.loading {
  text-align: center;
  padding: 24px;
  color: var(--muted);
}
.empty {
  text-align: center;
  padding: 40px 20px;
  background: #fff;
  border-radius: var(--radius);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.tickets-list {
  display: grid;
  gap: 12px;
}
.ticket-card {
  position: relative;
  display: block;
  background: #fff;
  padding: 16px;
  border-radius: var(--radius);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border);
  transition: transform 0.2s, box-shadow 0.2s;
}
.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.ticket-date {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}
.badge-reply {
  font-size: 12px;
  font-weight: 600;
  color: #015f01;
  background: #D3FF4F;
  padding: 4px 8px;
  border-radius: 100px;
}
.badge-pending {
  font-size: 12px;
  font-weight: 500;
  color: #F5A623;
  background: #FFF8EC;
  padding: 4px 8px;
  border-radius: 100px;
}
.badge-closed {
  font-size: 12px;
  font-weight: 500;
  color: #6b7268;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 100px;
}
.ticket-preview {
  font-size: 15px;
  margin: 0;
  padding-right: 24px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #21271f;
}
.ticket-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  color: var(--muted);
}
</style>
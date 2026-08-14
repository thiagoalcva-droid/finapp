/* Solicita permissão de notificação */
export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

/* Dispara notificação nativa do browser */
export function notify(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    requireInteraction: options.requireInteraction || false,
    tag: options.tag || 'finapp-' + Date.now(),
    ...options,
  })
  n.onclick = () => { window.focus(); n.close() }
  return n
}

/* Agenda um alerta para um evento */
export function scheduleEventReminder(event) {
  const eventTime = new Date(event.event_date).getTime()
  const reminderMs = (event.reminder_minutes || 30) * 60 * 1000
  const fireAt    = eventTime - reminderMs
  const now       = Date.now()
  const delay     = fireAt - now

  if (delay <= 0) return null
  if (delay > 7 * 24 * 60 * 60 * 1000) return null // max 7 dias

  const timer = setTimeout(async () => {
    const granted = await requestPermission()
    if (!granted) return
    notify(
      `⏰ Lembrete: ${event.title}`,
      `Começa em ${event.reminder_minutes} minutos!`,
      { requireInteraction: true, tag: 'agenda-' + event.id }
    )
  }, delay)

  return timer
}

/* Verifica despesas próximas do vencimento e notifica */
export async function checkExpenseAlerts(alerts) {
  const granted = await requestPermission()
  if (!granted) return

  const today = new Date()
  const dd    = today.getDate()

  for (const alert of alerts) {
    if (!alert.active) continue
    const days = alert.due_day - dd
    if (alert.alert_days?.includes(days)) {
      const emoji = days === 1 ? '🚨' : days === 2 ? '🔴' : '⚠️'
      const label = days === 1 ? 'AMANHÃ' : `em ${days} dias`
      notify(
        `${emoji} ${alert.name} vence ${label}`,
        alert.amount
          ? `Valor: R$ ${Number(alert.amount).toLocaleString('pt-BR')} — não deixe atrasar!`
          : 'Verifique o pagamento para não atrasar.',
        { requireInteraction: days === 1, tag: 'alert-' + alert.id + '-' + days }
      )
    }
  }
}

/* Registra verificação diária de alertas via setInterval */
export function startDailyAlertCheck(alerts, intervalMs = 60 * 60 * 1000) {
  checkExpenseAlerts(alerts)
  return setInterval(() => checkExpenseAlerts(alerts), intervalMs)
}

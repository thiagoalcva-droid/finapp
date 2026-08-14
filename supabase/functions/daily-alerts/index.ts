// Supabase Edge Function — roda todo dia às 08h via Cron
// Agende em: Dashboard Supabase → Edge Functions → Schedules
// Cron: "0 8 * * *"  (todo dia às 8h)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const today = new Date()
  const dd    = today.getDate()

  const { data: alerts } = await supabase
    .from('expense_alerts')
    .select('*, push_subscriptions!inner(subscription)')
    .eq('active', true)

  if (!alerts || alerts.length === 0)
    return new Response('Nenhum alerta ativo', { status: 200 })

  let sent = 0
  for (const alert of alerts) {
    const days      = alert.due_day - dd
    const alertDays = alert.alert_days || [3, 2, 1]
    if (!alertDays.includes(days)) continue

    const emoji = days <= 1 ? '🚨' : days <= 2 ? '🔴' : '⚠️'
    const label = days === 0 ? 'HOJE' : days === 1 ? 'AMANHÃ' : `em ${days} dias`

    // Em produção, use webpush para enviar push real
    // Por ora, apenas registre o envio na tabela de logs
    console.log(`${emoji} ${alert.name} vence ${label}`)
    sent++
  }

  return new Response(JSON.stringify({ sent, date: today.toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

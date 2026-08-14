import { supabase } from './supabase'

/* ── TRANSACTIONS ─────────────────────────────────────────── */
export async function loadTransactions(userId) {
  const { data, error } = await supabase.from('transactions').select('*')
    .eq('user_id', userId).order('date', { ascending: false })
  if (error) throw error
  return data.map(r => ({ id:r.id, date:r.date, desc:r.description, amt:+r.amount, type:r.type, cat:r.category, fixed:r.fixed, nec:r.necessary }))
}

export async function insertTransactions(userId, txns) {
  const rows = txns.map(t => ({ user_id:userId, date:t.date, description:t.desc, amount:t.amt, type:t.type, category:t.cat, fixed:t.fixed??false, necessary:t.nec??true }))
  const { data, error } = await supabase.from('transactions').insert(rows).select()
  if (error) throw error
  return data.map(r => ({ id:r.id, date:r.date, desc:r.description, amt:+r.amount, type:r.type, cat:r.category, fixed:r.fixed, nec:r.necessary }))
}

export async function updateTransaction(id, patch) {
  const map = {}
  if ('nec'   in patch) map.necessary = patch.nec
  if ('fixed' in patch) map.fixed     = patch.fixed
  const { error } = await supabase.from('transactions').update(map).eq('id', id)
  if (error) throw error
}

/* ── CHAT MESSAGES ────────────────────────────────────────── */
export async function loadChat(userId) {
  const { data, error } = await supabase.from('chat_messages').select('*')
    .eq('user_id', userId).order('created_at').limit(80)
  if (error) return []
  return data.map(r => ({ role:r.role, text:r.content }))
}

export async function saveMsg(userId, role, text) {
  await supabase.from('chat_messages').insert({ user_id:userId, role, content:text })
}

/* ── AGENDA ───────────────────────────────────────────────── */
export async function loadAgenda(userId) {
  const { data, error } = await supabase.from('agenda').select('*')
    .eq('user_id', userId).order('event_date')
  if (error) throw error
  return data
}

export async function insertEvent(userId, ev) {
  const { data, error } = await supabase.from('agenda')
    .insert({ user_id:userId, ...ev }).select().single()
  if (error) throw error
  return data
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('agenda').delete().eq('id', id)
  if (error) throw error
}

export async function markNotified(id) {
  await supabase.from('agenda').update({ notified: true }).eq('id', id)
}

/* ── EXPENSE ALERTS ───────────────────────────────────────── */
export async function loadAlerts(userId) {
  const { data, error } = await supabase.from('expense_alerts').select('*')
    .eq('user_id', userId).order('due_day')
  if (error) throw error
  return data
}

export async function insertAlert(userId, alert) {
  const { data, error } = await supabase.from('expense_alerts')
    .insert({ user_id:userId, ...alert }).select().single()
  if (error) throw error
  return data
}

export async function updateAlert(id, patch) {
  const { error } = await supabase.from('expense_alerts').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteAlert(id) {
  const { error } = await supabase.from('expense_alerts').delete().eq('id', id)
  if (error) throw error
}

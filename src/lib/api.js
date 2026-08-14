import { supabase } from './supabase'

const mapTxn = r => ({ id:r.id, date:r.date, desc:r.description, amt:+r.amount, type:r.type, cat:r.category, fixed:r.fixed, nec:r.necessary })

/* TRANSACTIONS */
export async function loadTransactions(userId) {
  const { data, error } = await supabase.from('transactions').select('*')
    .eq('user_id', userId).order('date', { ascending: false })
  if (error) throw error
  return data.map(mapTxn)
}

export async function insertTransactions(userId, txns) {
  const rows = txns.map(t => ({ user_id:userId, date:t.date, description:t.desc, amount:t.amt, type:t.type, category:t.cat, fixed:t.fixed??false, necessary:t.nec??true }))
  const { data, error } = await supabase.from('transactions').insert(rows).select()
  if (error) throw error
  return data.map(mapTxn)
}

export async function updateTransaction(id, patch) {
  const map = {}
  if ('nec'   in patch) map.necessary   = patch.nec
  if ('fixed' in patch) map.fixed       = patch.fixed
  if ('desc'  in patch) map.description = patch.desc
  if ('amt'   in patch) map.amount      = patch.amt
  if ('cat'   in patch) map.category    = patch.cat
  if ('date'  in patch) map.date        = patch.date
  if ('type'  in patch) map.type        = patch.type
  const { error } = await supabase.from('transactions').update(map).eq('id', id)
  if (error) throw error
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function clearAllTransactions(userId) {
  const { error } = await supabase.from('transactions').delete().eq('user_id', userId)
  if (error) throw error
}

/* CHAT */
export async function loadChat(userId) {
  const { data, error } = await supabase.from('chat_messages').select('*')
    .eq('user_id', userId).order('created_at').limit(80)
  if (error) return []
  return data.map(r => ({ role:r.role, text:r.content, image:r.image_url || undefined }))
}
export async function saveMsg(userId, role, text, image) {
  await supabase.from('chat_messages').insert({ user_id:userId, role, content:text, image_url:image || null })
}

/* AGENDA */
export async function loadAgenda(userId) {
  const { data, error } = await supabase.from('agenda').select('*').eq('user_id', userId).order('event_date')
  if (error) throw error
  return data
}
export async function insertEvent(userId, ev) {
  const { data, error } = await supabase.from('agenda').insert({ user_id:userId, ...ev }).select().single()
  if (error) throw error
  return data
}
export async function deleteEvent(id) {
  const { error } = await supabase.from('agenda').delete().eq('id', id)
  if (error) throw error
}

/* EXPENSE ALERTS */
export async function loadAlerts(userId) {
  const { data, error } = await supabase.from('expense_alerts').select('*').eq('user_id', userId).order('due_day')
  if (error) throw error
  return data
}
export async function insertAlert(userId, alert) {
  const { data, error } = await supabase.from('expense_alerts').insert({ user_id:userId, ...alert }).select().single()
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

/* GOALS (Metas) */
export async function loadGoals(userId) {
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at')
  if (error) throw error
  return data
}
export async function insertGoal(userId, goal) {
  const { data, error } = await supabase.from('goals').insert({ user_id:userId, ...goal }).select().single()
  if (error) throw error
  return data
}
export async function updateGoal(id, patch) {
  const { error } = await supabase.from('goals').update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

/* INVESTMENTS */
export async function loadInvestments(userId) {
  const { data, error } = await supabase.from('investments').select('*').eq('user_id', userId).order('created_at')
  if (error) throw error
  return data
}
export async function insertInvestment(userId, inv) {
  const { data, error } = await supabase.from('investments').insert({ user_id:userId, ...inv }).select().single()
  if (error) throw error
  return data
}
export async function deleteInvestment(id) {
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) throw error
}

/* MILLIONAIRE PLAN */
export async function loadPlan(userId) {
  const { data } = await supabase.from('millionaire_plan').select('*').eq('user_id', userId).maybeSingle()
  return data
}
export async function savePlan(userId, plan) {
  const { data, error } = await supabase.from('millionaire_plan')
    .upsert({ user_id:userId, ...plan, updated_at:new Date().toISOString() }, { onConflict:'user_id' })
    .select().single()
  if (error) throw error
  return data
}

/* DREAM PROFILE (quiz do sonho) */
export async function loadDream(userId) {
  const { data } = await supabase.from('dream_profile').select('*').eq('user_id', userId).maybeSingle()
  return data
}
export async function saveDream(userId, dream) {
  const { data, error } = await supabase.from('dream_profile')
    .upsert({ user_id:userId, ...dream, updated_at:new Date().toISOString() }, { onConflict:'user_id' })
    .select().single()
  if (error) throw error
  return data
}

/* ONBOARDING (quiz inicial) */
export async function loadOnboarding(userId) {
  const { data } = await supabase.from('onboarding').select('*').eq('user_id', userId).maybeSingle()
  return data
}
export async function saveOnboarding(userId, ob) {
  const { data, error } = await supabase.from('onboarding')
    .upsert({ user_id:userId, ...ob, updated_at:new Date().toISOString() }, { onConflict:'user_id' })
    .select().single()
  if (error) throw error
  return data
}

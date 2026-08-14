import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react'
import { loadAlerts, insertAlert, updateAlert, deleteAlert } from '../lib/api'
import { checkExpenseAlerts, requestPermission } from '../lib/notifications'
import { fmt, Card, CardTitle, Loader, Note } from '../components/shared'

const DAYS = Array.from({length:31},(_,i)=>i+1)

function daysUntil(due_day) {
  const today = new Date().getDate()
  let diff = due_day - today
  if(diff < 0) diff += 31 // próximo mês
  return diff
}

function urgencyColor(days) {
  if(days <= 1) return 'var(--red)'
  if(days <= 3) return 'var(--amber)'
  return 'var(--green)'
}

function urgencyLabel(days) {
  if(days === 0) return '🚨 HOJE!'
  if(days === 1) return '🔴 Amanhã'
  if(days <= 3) return `⚠️ Em ${days} dias`
  return `✓ Em ${days} dias`
}

const BLANK = { name:'', amount:'', due_day:5, alert_days:[3,2,1], alert_hour:8, active:true }

export default function Alertas({ userId }) {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...BLANK })
  const [saving, setSaving]     = useState(false)
  const [editing, setEditing]   = useState(null)
  const [perm, setPerm]         = useState(Notification.permission)

  useEffect(() => {
    loadAlerts(userId).then(d=>{ setAlerts(d); setLoading(false) })
  },[userId])

  useEffect(() => {
    if(alerts.length > 0) checkExpenseAlerts(alerts).catch(()=>{})
  },[alerts])

  const askPerm = async () => {
    const ok = await requestPermission()
    setPerm(ok ? 'granted':'denied')
  }

  const toggleDay = (d) => setForm(p=>({ ...p, alert_days: p.alert_days.includes(d) ? p.alert_days.filter(x=>x!==d):[...p.alert_days,d].sort((a,b)=>b-a) }))

  const save = async (e) => {
    e.preventDefault()
    if(!form.name||!form.due_day) return
    setSaving(true)
    try {
      const payload = { ...form, amount: form.amount ? +form.amount:null, due_day:+form.due_day, alert_hour:+form.alert_hour }
      if(editing) {
        await updateAlert(editing, payload)
        setAlerts(prev=>prev.map(a=>a.id===editing ? {...a,...payload}:a))
        setEditing(null)
      } else {
        const saved = await insertAlert(userId, payload)
        setAlerts(prev=>[...prev,saved].sort((a,b)=>a.due_day-b.due_day))
      }
      setShowForm(false); setForm({ ...BLANK })
    } catch(err) { alert('Erro: '+err.message) }
    setSaving(false)
  }

  const remove = async (id) => {
    await deleteAlert(id).catch(()=>{})
    setAlerts(prev=>prev.filter(a=>a.id!==id))
  }

  const toggle = async (a) => {
    await updateAlert(a.id,{ active:!a.active }).catch(()=>{})
    setAlerts(prev=>prev.map(x=>x.id===a.id?{...x,active:!x.active}:x))
  }

  const startEdit = (a) => {
    setForm({ name:a.name, amount:a.amount||'', due_day:a.due_day, alert_days:a.alert_days||[3,2,1], alert_hour:a.alert_hour||8, active:a.active })
    setEditing(a.id); setShowForm(true)
  }

  const inp = { width:'100%', height:40, padding:'0 12px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:13, marginBottom:10 }

  const totalMonthly = alerts.filter(a=>a.active&&a.amount).reduce((s,a)=>s+(+a.amount),0)
  const urgent = alerts.filter(a=>a.active&&daysUntil(a.due_day)<=3)

  return (
    <div>
      <Note>Aqui ficam suas <strong>contas e assinaturas</strong> — Netflix, Spotify, luz, água, internet, aluguel... Cadastre com o dia de vencimento e <strong>te avisamos antes de vencer</strong>, pra você nunca mais pagar juros por esquecimento. 🔔</Note>
      {perm !== 'granted' && (
        <div style={{ background:'var(--amber-bg)', border:'1px solid var(--amber-border)', borderRadius:10, padding:'12px 16px', marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, color:'var(--amber)', fontWeight:500 }}>⚠️ Ative as notificações para receber os alertas de vencimento.</span>
          <button onClick={askPerm} style={{ height:34, padding:'0 14px', background:'var(--amber)', color:'#000', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>Ativar</button>
        </div>
      )}

      {urgent.length > 0 && (
        <div style={{ background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, padding:'12px 16px', marginBottom:'1rem' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--red)', marginBottom:6 }}>🚨 Atenção — vencimentos próximos</div>
          {urgent.map(a=>(
            <div key={a.id} style={{ fontSize:12, color:'var(--text-1)', marginBottom:4 }}>
              {urgencyLabel(daysUntil(a.due_day))} — <strong>{a.name}</strong>{a.amount ? ` · ${fmt(+a.amount)}`:''}
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>
        <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Total mensal</div>
          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)' }}>{fmt(totalMonthly)}</div>
          <div style={{ fontSize:11, color:'var(--text-2)', marginTop:4 }}>{alerts.filter(a=>a.active).length} despesas ativas</div>
        </div>
        <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Alertas próximos</div>
          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color: urgent.length>0 ? 'var(--red)':'var(--green)' }}>{urgent.length}</div>
          <div style={{ fontSize:11, color:'var(--text-2)', marginTop:4 }}>nos próximos 3 dias</div>
        </div>
      </div>

      <div style={{ marginBottom:'1rem' }}>
        <button onClick={()=>{ setShowForm(!showForm); setEditing(null); setForm({...BLANK}) }}
          style={{ width:'100%', height:42, background: showForm ? 'var(--bg-raised)':'var(--blue)', color: showForm ? 'var(--text-2)':'#fff', border: showForm ? '1px solid var(--border-2)':'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
          {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Adicionar despesa</>}
        </button>
      </div>

      {showForm && (
        <Card>
          <CardTitle>{editing ? 'Editar despesa':'Nova despesa fixa'}</CardTitle>
          <form onSubmit={save}>
            <input style={inp} type="text" placeholder="Nome da despesa (ex: Aluguel, Cartão Nubank)" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
            <input style={inp} type="number" placeholder="Valor (R$) — opcional" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} step="0.01" min="0" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Dia do vencimento</label>
                <select style={{ ...inp, marginBottom:0, cursor:'pointer' }} value={form.due_day} onChange={e=>setForm(p=>({...p,due_day:e.target.value}))}>
                  {DAYS.map(d=><option key={d} value={d}>Dia {d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Horário do alerta</label>
                <input style={{ ...inp, marginBottom:0 }} type="number" min="0" max="23" value={form.alert_hour} onChange={e=>setForm(p=>({...p,alert_hour:e.target.value}))} placeholder="8" />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:8 }}>Alertar quantos dias antes?</label>
              <div style={{ display:'flex', gap:6 }}>
                {[5,4,3,2,1].map(d=>(
                  <button type="button" key={d} onClick={()=>toggleDay(d)}
                    style={{ flex:1, height:34, border:'1px solid', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', transition:'all .12s', borderColor: form.alert_days.includes(d) ? 'var(--blue)':'var(--border-2)', background: form.alert_days.includes(d) ? 'var(--blue-bg)':'transparent', color: form.alert_days.includes(d) ? 'var(--blue)':'var(--text-3)' }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving}
              style={{ width:'100%', height:42, background:'var(--blue)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {saving ? 'Salvando...': editing ? '✓ Salvar edição':'✓ Adicionar alerta'}
            </button>
          </form>
        </Card>
      )}

      {loading ? <Loader label="Carregando alertas..." /> : (
        <div>
          {alerts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:13 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🔔</div>
              Nenhuma despesa cadastrada. Adicione seu aluguel, cartão, etc.
            </div>
          ) : (
            <Card>
              <CardTitle>Suas despesas ({alerts.length})</CardTitle>
              {alerts.sort((a,b)=>a.due_day-b.due_day).map(a=>{
                const days  = daysUntil(a.due_day)
                const color = urgencyColor(days)
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid var(--border)', opacity: a.active ? 1:.5 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background: a.active ? 'var(--blue-bg)':'var(--bg-raised)', border:`1px solid ${a.active ? 'var(--blue-border)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:16 }}>🔔</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{a.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>
                        Vence dia {a.due_day} · Alerta: {(a.alert_days||[3,2,1]).join(', ')} dias antes às {a.alert_hour||8}h
                        {a.amount && ` · ${fmt(+a.amount)}`}
                      </div>
                      {a.active && (
                        <div style={{ fontSize:11, fontWeight:600, color, marginTop:3 }}>{urgencyLabel(days)}</div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>toggle(a)} style={{ width:30, height:30, border:'none', borderRadius:7, cursor:'pointer', background: a.active ? 'var(--green-bg)':'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {a.active ? <Check size={13} color="var(--green)" /> : <X size={13} color="var(--text-3)" />}
                      </button>
                      <button onClick={()=>startEdit(a)} style={{ width:30, height:30, border:'none', borderRadius:7, cursor:'pointer', background:'var(--blue-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Edit3 size={12} color="var(--blue)" />
                      </button>
                      <button onClick={()=>remove(a.id)} style={{ width:30, height:30, border:'none', borderRadius:7, cursor:'pointer', background:'var(--red-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Trash2 size={12} color="var(--red)" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}
        </div>
      )}

      <Note>Os alertas aparecem como notificação no seu celular/computador. Para receber quando o app estiver fechado, instale o app na tela inicial do celular (opção "Adicionar à tela inicial" no seu navegador).</Note>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, TrendingUp } from 'lucide-react'
import { loadGoals, insertGoal, updateGoal, deleteGoal, insertTransactions } from '../lib/api'
import { fmt, pct, Card, CardTitle, Loader, Note } from '../components/shared'

const ICONS = ['🎯','🏠','🚗','✈️','💍','📱','🎓','🏖️','💰','🛡️']
const BLANK = { name:'', target_amount:'', current_amount:'', deadline:'', icon:'🎯' }

function monthsLeft(deadline) {
  if (!deadline) return null
  const diff = new Date(deadline) - new Date()
  return Math.max(0, Math.round(diff / (30.44*24*60*60*1000)))
}

export default function Metas({ userId, txns, setTxns, destaqueId }) {
  const [goals, setGoals]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ ...BLANK })
  const [saving, setSaving]   = useState(false)
  const [addAmt, setAddAmt]   = useState({})

  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
  const leftover = totalIn - totalOut

  useEffect(() => { loadGoals(userId).then(d=>{setGoals(d);setLoading(false)}) },[userId])

  const save = async (e) => {
    e.preventDefault()
    if(!form.name||!form.target_amount) return
    setSaving(true)
    try {
      const g = await insertGoal(userId, { name:form.name, target_amount:+form.target_amount, current_amount:+form.current_amount||0, deadline:form.deadline||null, icon:form.icon })
      setGoals(prev=>[...prev,g])
      setShowForm(false); setForm({...BLANK})
    } catch(err){ alert('Erro: '+err.message) }
    setSaving(false)
  }

  const addMoney = async (g) => {
    const v = +addAmt[g.id]
    if(!v||v<=0) return
    const novo = Math.min(+g.current_amount + v, +g.target_amount)
    await updateGoal(g.id,{ current_amount:novo }).catch(()=>{})
    setGoals(prev=>prev.map(x=>x.id===g.id?{...x,current_amount:novo}:x))
    setAddAmt(prev=>({...prev,[g.id]:''}))
    // Registra como SAÍDA no Dashboard (dinheiro reservado, categoria Meta)
    try {
      const saved = await insertTransactions(userId, [{
        date: new Date().toISOString().slice(0,10),
        desc: `Guardado para: ${g.name}`,
        amt: v, type:'out', cat:'Meta', nec:true, fixed:false,
      }])
      if (setTxns) setTxns(prev=>[...prev, ...saved])
    } catch(_){}
  }

  const remove = async (id) => {
    await deleteGoal(id).catch(()=>{})
    setGoals(prev=>prev.filter(g=>g.id!==id))
  }

  const inp = { width:'100%', height:40, padding:'0 12px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:13, marginBottom:10 }

  return (
    <div>
      {destaqueId && goals.find(g=>g.id===destaqueId) && (
        <div style={{ background:'linear-gradient(135deg, var(--itau-navy) 0%, var(--itau-navy-2) 100%)', borderRadius:16, padding:'1.25rem 1.5rem', marginBottom:'1rem', color:'#fff' }}>
          <div style={{ fontSize:26, marginBottom:8 }}>🎉</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Seu sonho virou uma meta!</div>
          <div style={{ fontSize:13, opacity:.9, lineHeight:1.5 }}>
            Agora deixou de ser um sonho distante. Em alguns meses estaremos comemorando juntos! Acompanhe sua barra de progresso crescer a cada depósito. 💪
          </div>
        </div>
      )}
      <Note>Crie metas financeiras e acompanhe o progresso. Adicione dinheiro conforme for guardando — a barra atualiza em tempo real.</Note>

      <button onClick={()=>setShowForm(!showForm)}
        style={{ width:'100%', height:42, marginBottom:'1rem', background: showForm?'var(--bg-raised)':'var(--blue)', color: showForm?'var(--text-2)':'#fff', border: showForm?'1px solid var(--border-2)':'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
        {showForm ? <><X size={14}/> Cancelar</> : <><Plus size={14}/> Nova meta</>}
      </button>

      {showForm && (
        <Card>
          <CardTitle>Nova meta financeira</CardTitle>
          <form onSubmit={save}>
            <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              {ICONS.map(ic=>(
                <button type="button" key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))}
                  style={{ width:38, height:38, fontSize:18, border:'1px solid', borderRadius:8, cursor:'pointer', background: form.icon===ic?'var(--blue-bg)':'transparent', borderColor: form.icon===ic?'var(--blue)':'var(--border-2)' }}>
                  {ic}
                </button>
              ))}
            </div>
            <input style={inp} type="text" placeholder="Nome da meta (ex: Reserva de emergência)" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input style={inp} type="number" placeholder="Valor alvo (R$)" value={form.target_amount} onChange={e=>setForm(p=>({...p,target_amount:e.target.value}))} required min="1" step="0.01" />
              <input style={inp} type="number" placeholder="Já guardado (R$)" value={form.current_amount} onChange={e=>setForm(p=>({...p,current_amount:e.target.value}))} min="0" step="0.01" />
            </div>
            <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Data limite (opcional)</label>
            <input style={inp} type="date" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} />
            <button type="submit" disabled={saving} style={{ width:'100%', height:42, background:'var(--blue)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              {saving?'Salvando...':'Criar meta'}
            </button>
          </form>
        </Card>
      )}

      {loading ? <Loader label="Carregando metas..." /> : goals.length===0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:13 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🎯</div>
          Nenhuma meta ainda. Crie a primeira — que tal uma reserva de emergência?
        </div>
      ) : goals.map(g => {
        const p      = pct(+g.current_amount, +g.target_amount)
        const months = monthsLeft(g.deadline)
        const needed = months && months>0 ? (+g.target_amount - +g.current_amount)/months : null
        const done   = p >= 100
        return (
          <Card key={g.id}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background: done?'var(--green-bg)':'var(--blue-bg)', border:`1px solid ${done?'var(--green-border)':'var(--blue-border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{g.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>{g.name} {done && '🏆'}</div>
                  <button onClick={()=>remove(g.id)} style={{ width:28, height:28, border:'none', background:'var(--red-bg)', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Trash2 size={12} color="var(--red)" />
                  </button>
                </div>
                <div style={{ fontSize:12, color:'var(--text-2)', margin:'4px 0 8px', fontFamily:"'JetBrains Mono',monospace" }}>
                  {fmt(+g.current_amount)} / {fmt(+g.target_amount)} · <strong style={{color: done?'var(--green)':'var(--blue)'}}>{p}%</strong>
                </div>
                <div style={{ height:8, background:'var(--bg-raised)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', background: done?'var(--green)':'var(--blue)', width:`${Math.min(p,100)}%`, borderRadius:4, transition:'width .5s' }} />
                </div>
                {months!==null && !done && (
                  <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:8 }}>
                    ⏳ {months} meses restantes · precisa guardar <strong style={{color:'var(--amber)'}}>{fmt(needed)}/mês</strong>
                    {leftover>0 && needed>leftover && <span style={{color:'var(--red)'}}> — acima da sua sobra de {fmt(leftover)}</span>}
                  </div>
                )}
                {!done && (
                  <div style={{ display:'flex', gap:6 }}>
                    <input type="number" placeholder="Adicionar R$" value={addAmt[g.id]||''} onChange={e=>setAddAmt(prev=>({...prev,[g.id]:e.target.value}))}
                      style={{ flex:1, height:34, padding:'0 10px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:12 }} />
                    <button onClick={()=>addMoney(g)} style={{ height:34, padding:'0 14px', background:'var(--green)', color:'#000', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      + Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

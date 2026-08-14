import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, X, Crown, TrendingUp } from 'lucide-react'
import { loadInvestments, insertInvestment, deleteInvestment, loadPlan, savePlan } from '../lib/api'
import { callClaude, MILIONARIO_SYSTEM } from '../lib/claude'
import { fmt, pct, Card, CardTitle, Loader, Note } from '../components/shared'

/* Valor futuro: aporte mensal P por n meses a taxa mensal r, mais montante inicial */
const fv = (P, initial, months, annualRate) => {
  const r = Math.pow(1 + annualRate/100, 1/12) - 1
  return initial * Math.pow(1+r, months) + P * ((Math.pow(1+r, months) - 1) / r)
}
/* Aporte mensal necessario para atingir FV em n meses */
const requiredP = (FV, initial, months, annualRate) => {
  const r = Math.pow(1 + annualRate/100, 1/12) - 1
  const fromInitial = initial * Math.pow(1+r, months)
  if (fromInitial >= FV) return 0
  return (FV - fromInitial) * r / (Math.pow(1+r, months) - 1)
}

const BLANK = { name:'', monthly_amount:'', initial_amount:'', annual_rate:'12' }

export default function Investir({ userId, txns }) {
  const [invs, setInvs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ ...BLANK })
  const [saving, setSaving]   = useState(false)

  const [plan, setPlan]           = useState(null)
  const [targetYear, setTargetYear] = useState(new Date().getFullYear()+10)
  const [planRate, setPlanRate]   = useState(12)
  const [aiPlan, setAiPlan]       = useState(null)
  const [planOpen, setPlanOpen]   = useState(true)
  const [aiLoading, setAiLoading] = useState(false)

  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
  const leftover = totalIn - totalOut

  useEffect(() => {
    Promise.all([loadInvestments(userId), loadPlan(userId)]).then(([i,p])=>{
      setInvs(i)
      if(p){ setPlan(p); setTargetYear(p.target_year); setPlanRate(+p.annual_rate); setAiPlan(p.action_plan) }
      setLoading(false)
    })
  },[userId])

  const totalMonthly = invs.reduce((s,i)=>s+ +i.monthly_amount,0)
  const totalInitial = invs.reduce((s,i)=>s+ +i.initial_amount,0)
  const avgRate      = invs.length ? invs.reduce((s,i)=>s+ +i.annual_rate,0)/invs.length : 12

  const projYears = [1,2,3,5,10,15,20]
  const projections = useMemo(() =>
    projYears.map(y => ({ y, v: Math.round(fv(totalMonthly, totalInitial, y*12, avgRate)) })),
  [totalMonthly, totalInitial, avgRate])
  const maxProj = projections[projections.length-1]?.v || 1

  /* Milionario */
  const monthsToTarget = Math.max(1, (targetYear - new Date().getFullYear()) * 12)
  const reqMonthly     = requiredP(1000000, totalInitial, monthsToTarget, planRate)
  const viable         = leftover > 0 && reqMonthly <= leftover

  const save = async (e) => {
    e.preventDefault()
    if(!form.name||!form.monthly_amount) return
    setSaving(true)
    try {
      const inv = await insertInvestment(userId, { name:form.name, monthly_amount:+form.monthly_amount, initial_amount:+form.initial_amount||0, annual_rate:+form.annual_rate||12 })
      setInvs(prev=>[...prev,inv])
      setShowForm(false); setForm({...BLANK})
    } catch(err){ alert('Erro: '+err.message) }
    setSaving(false)
  }

  const remove = async (id) => {
    await deleteInvestment(id).catch(()=>{})
    setInvs(prev=>prev.filter(i=>i.id!==id))
  }

  const gerarPlano = async () => {
    setAiLoading(true)
    try {
      const system = MILIONARIO_SYSTEM({
        targetYear, months: monthsToTarget,
        income: fmt(totalIn), expenses: fmt(totalOut), leftover: fmt(leftover),
        rate: planRate, required: fmt(reqMonthly),
      })
      const byCat = (() => { const m={}; txns.filter(t=>t.type==='out').forEach(t=>{m[t.cat]=(m[t.cat]||0)+t.amt}); return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c,v])=>`${c} ${fmt(v)}`).join(', ') })()
      const reply = await callClaude(system, [{ role:'user', content:`Meus gastos por categoria: ${byCat}. Crie meu plano de acao para ficar milionario ate ${targetYear}.` }], 700)
      setAiPlan(reply)
      await savePlan(userId, { target_year:targetYear, monthly_investment:reqMonthly, annual_rate:planRate, action_plan:reply }).catch(()=>{})
    } catch(e){ setAiPlan('Erro ao gerar plano: '+e.message) }
    setAiLoading(false)
  }

  const inp = { width:'100%', height:40, padding:'0 12px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:13, marginBottom:10 }

  if(loading) return <Loader label="Carregando investimentos..." />

  return (
    <div>
      {/* ══ QUERO FICAR MILIONARIO ══ */}
      <div style={{ background:'linear-gradient(135deg, var(--itau-navy) 0%, var(--itau-navy-2) 100%)', border:'1px solid rgba(212,175,55,.35)', borderRadius:16, padding:'1.5rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(212,175,55,.15)', border:'1px solid rgba(212,175,55,.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👑</div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:'#f5d67a' }}>Quero Ficar Milionário</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>Seu plano para ter R$ 1 milhão na conta</div>
          </div>
        </div>

        <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12.5, color:'rgba(255,255,255,.85)', lineHeight:1.5 }}>
          💡 O <strong>Quero Ficar Milionário</strong> é seu guia para juntar <strong>R$ 1 milhão</strong> de saldo disponível. Escolhe até quando quer chegar lá, e eu calculo quanto você precisa investir por mês e monto seu plano.
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.7)', display:'block', marginBottom:5 }}>Milionário até o ano</label>
            <select value={targetYear} onChange={e=>setTargetYear(+e.target.value)} style={{ ...inp, marginBottom:0, cursor:'pointer' }}>
              {Array.from({length:26},(_,i)=>new Date().getFullYear()+5+i).map(y=><option key={y} value={y}>{y} ({y-new Date().getFullYear()} anos)</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.7)', display:'block', marginBottom:5 }}>Perfil de investimento</label>
            <select value={planRate} onChange={e=>setPlanRate(+e.target.value)} style={{ ...inp, marginBottom:0, cursor:'pointer' }}>
              <option value={8}>Conservador (8% a.a.)</option>
              <option value={10}>Tesouro/CDB (10% a.a.)</option>
              <option value={12}>Moderado (12% a.a.)</option>
              <option value={15}>Arrojado (15% a.a.)</option>
            </select>
          </div>
        </div>

        <div style={{ background:'rgba(0,0,0,.4)', borderRadius:12, padding:'16px', marginBottom:14, textAlign:'center' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Você precisa investir por mês</div>
          <div style={{ fontSize:32, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'#f5d67a' }}>{fmt(reqMonthly)}</div>
          <div style={{ fontSize:12, marginTop:6, color: viable?'#5EEAD4':'#FFB4B4' }}>
            {totalIn===0 ? 'Registre suas transações para ver a viabilidade'
              : viable ? `✓ Viável! É ${pct(reqMonthly,totalIn)}% da sua renda (sobra ${fmt(leftover)}/mês)`
              : `⚠ Acima da sua sobra atual de ${fmt(leftover)}/mês — o plano vai mostrar onde cortar`}
          </div>
        </div>

        <button onClick={gerarPlano} disabled={aiLoading}
          style={{ width:'100%', height:46, background:'linear-gradient(90deg,#d4af37,#f5d67a)', color:'#1a1305', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', opacity: aiLoading?.6:1 }}>
          {aiLoading ? 'Gerando seu plano...' : '👑 Gerar meu plano de ação com IA'}
        </button>

        {aiPlan && (
          <div style={{ marginTop:14 }}>
            <button onClick={()=>setPlanOpen(!planOpen)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,.08)', border:'none', borderRadius:10, padding:'10px 14px', cursor:'pointer', fontFamily:'inherit' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#f5d67a' }}>📋 Seu plano de ação</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>{planOpen ? 'Ver menos ▲' : 'Ver mais ▼'}</span>
            </button>
            {planOpen && (
              <div style={{ marginTop:10, background:'rgba(0,0,0,.35)', border:'1px solid rgba(212,175,55,.2)', borderRadius:12, padding:'16px', fontSize:13, lineHeight:1.8, color:'#F0F2F8', whiteSpace:'pre-wrap' }}>
                {aiPlan}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ MEUS INVESTIMENTOS ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:'1rem' }}>
        <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Aporte mensal</div>
          <div style={{ fontSize:19, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)' }}>{fmt(totalMonthly)}</div>
        </div>
        <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Já investido</div>
          <div style={{ fontSize:19, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)' }}>{fmt(totalInitial)}</div>
        </div>
        <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px 16px', borderLeft:'3px solid var(--green)' }}>
          <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Em 10 anos</div>
          <div style={{ fontSize:19, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--green)' }}>{fmt(fv(totalMonthly,totalInitial,120,avgRate))}</div>
        </div>
      </div>

      <button onClick={()=>setShowForm(!showForm)}
        style={{ width:'100%', height:42, marginBottom:'1rem', background: showForm?'var(--bg-raised)':'var(--blue)', color: showForm?'var(--text-2)':'#fff', border: showForm?'1px solid var(--border-2)':'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
        {showForm ? <><X size={14}/> Cancelar</> : <><Plus size={14}/> Adicionar investimento</>}
      </button>

      {showForm && (
        <Card>
          <CardTitle>Novo investimento</CardTitle>
          <form onSubmit={save}>
            <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Nome do investimento</label>
            <input style={inp} type="text" placeholder="Ex: Tesouro Selic, CDB Nubank" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
            <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Quanto você investe por mês? <span style={{color:'var(--text-3)'}}>(aporte mensal)</span></label>
            <input style={inp} type="number" placeholder="Ex: 300" value={form.monthly_amount} onChange={e=>setForm(p=>({...p,monthly_amount:e.target.value}))} required min="0" step="0.01" />
            <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Você já tem algum valor investido? <span style={{color:'var(--text-3)'}}>(se não, deixe 0)</span></label>
            <input style={inp} type="number" placeholder="Ex: 0" value={form.initial_amount} onChange={e=>setForm(p=>({...p,initial_amount:e.target.value}))} min="0" step="0.01" />
            <label style={{ fontSize:11, color:'var(--text-2)', display:'block', marginBottom:5 }}>Rendimento anual estimado <span style={{color:'var(--text-3)'}}>(% ao ano)</span></label>
            <input style={inp} type="number" placeholder="Ex: 12" value={form.annual_rate} onChange={e=>setForm(p=>({...p,annual_rate:e.target.value}))} min="0" step="0.1" />
            <button type="submit" disabled={saving} style={{ width:'100%', height:44, background:'var(--blue)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 }}>
              {saving?'Salvando...':'Adicionar'}
            </button>
          </form>
        </Card>
      )}

      {invs.length > 0 && (
        <Card>
          <CardTitle>Seus investimentos ({invs.length})</CardTitle>
          {invs.map(i=>(
            <div key={i.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'var(--green-bg)', border:'1px solid var(--green-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📈</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{i.name}</div>
                <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>{fmt(+i.monthly_amount)}/mês · {i.annual_rate}% a.a. · inicial {fmt(+i.initial_amount)}</div>
              </div>
              <button onClick={()=>remove(i.id)} style={{ width:30, height:30, border:'none', background:'var(--red-bg)', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Trash2 size={12} color="var(--red)" />
              </button>
            </div>
          ))}
        </Card>
      )}

      {totalMonthly > 0 && (
        <Card>
          <CardTitle><TrendingUp size={13}/> Projeção do patrimônio ({avgRate.toFixed(1)}% a.a.)</CardTitle>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:110, marginBottom:8 }}>
            {projections.map(p=>(
              <div key={p.y} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:9, color:'var(--text-2)', fontFamily:"'JetBrains Mono',monospace" }}>{p.v>=1000000 ? (p.v/1000000).toFixed(1)+'M' : Math.round(p.v/1000)+'k'}</span>
                <div style={{ background: p.v>=1000000 ? '#d4af37':'var(--blue)', borderRadius:'4px 4px 0 0', width:'100%', height:Math.max(3,Math.round(p.v/maxProj*78)) }} />
                <span style={{ fontSize:9, color:'var(--text-3)' }}>{p.y}a</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:'var(--text-2)', textAlign:'center' }}>Barras douradas = patrimônio acima de R$ 1 milhão 👑</div>
        </Card>
      )}
    </div>
  )
}

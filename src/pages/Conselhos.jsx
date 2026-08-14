import { useState, useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { callClaude, CONSULTOR_SYSTEM } from '../lib/claude'
import { fmt, pct, Card, CardTitle, Loader } from '../components/shared'

const TYPE_MAP = {
  alerta: { bg:'var(--red-bg)',    border:'var(--red-border)',    color:'var(--red)',    icon:'⚠️', label:'Atenção' },
  dica:   { bg:'var(--blue-bg)',   border:'var(--blue-border)',   color:'var(--blue)',   icon:'💡', label:'Dica'    },
  elogio: { bg:'var(--green-bg)',  border:'var(--green-border)',  color:'var(--green)',  icon:'✅', label:'Parabéns'},
}

export default function Conselhos({ txns }) {
  const [advice, setAdvice]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [question, setQuestion]   = useState('')
  const [answer, setAnswer]       = useState(null)
  const [ansLoading, setAnsLoad]  = useState(false)

  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
  const unnec    = txns.filter(t=>t.type==='out'&&!t.nec).reduce((s,t)=>s+t.amt,0)
  const fixedOut = txns.filter(t=>t.type==='out'&&t.fixed).reduce((s,t)=>s+t.amt,0)
  const varOut   = txns.filter(t=>t.type==='out'&&!t.fixed).reduce((s,t)=>s+t.amt,0)

  const byCat = useMemo(()=>{
    const m={}
    txns.filter(t=>t.type==='out').forEach(t=>{ m[t.cat]=(m[t.cat]||0)+t.amt })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c,v])=>`${c} ${fmt(v)}`).join(', ')
  },[txns])

  const getData = () => ({ totalIn:fmt(totalIn), totalOut:fmt(totalOut), balance:fmt(totalIn-totalOut), savRate:pct(totalIn-totalOut,totalIn), fixedOut:fmt(fixedOut), varOut:fmt(varOut), necAmt:fmt(totalOut-unnec), unnecAmt:fmt(unnec), byCat })

  const load = async () => {
    if(txns.length===0) { setAdvice([]); return }
    setLoading(true)
    try {
      const d = getData()
      const raw = await callClaude(
        'Responda APENAS com JSON válido, sem markdown. Gere exatamente 5 conselhos financeiros personalizados.',
        [{ role:'user', content:`Analise e gere 5 conselhos em JSON.\nDados: renda ${d.totalIn}, gastos ${d.totalOut}, saldo ${d.balance}, economia ${d.savRate}%, supérfluos ${d.unnecAmt}. Categorias: ${d.byCat}\nJSON: {"advice":[{"title":"título direto","text":"conselho com valores reais e ação concreta","type":"alerta|dica|elogio"}]}\nOrdem: alertas primeiro, depois dicas, depois elogios. Use valores reais.` }],
        1400
      )
      const clean = raw.replace(/```json|```/g,'').trim()
      setAdvice(JSON.parse(clean).advice||[])
    } catch { setAdvice([{ title:'Erro ao gerar', text:'Verifique sua chave de API e conexão.', type:'alerta' }]) }
    setLoading(false)
  }

  useEffect(() => { load() },[])

  const ask = async () => {
    const q = question.trim(); if(!q) return
    setQuestion(''); setAnswer(null); setAnsLoad(true)
    try {
      const reply = await callClaude(CONSULTOR_SYSTEM(getData()), [{ role:'user', content:q }], 400)
      setAnswer(reply)
    } catch(e) { setAnswer(`Erro: ${e.message}`) }
    setAnsLoad(false)
  }

  const QUICK = ['Como reduzir gastos com alimentação?','Vale a pena investir meu saldo agora?','Regra 50/30/20 para minha renda','Em quanto tempo acumulo R$ 100 mil?','Minhas assinaturas estão altas?']

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
        <span style={{ fontSize:12, color:'var(--text-2)' }}>Análise personalizada baseada nas suas transações</span>
        <button onClick={load} disabled={loading} style={{ fontSize:12, padding:'6px 12px', border:'1px solid var(--border-2)', borderRadius:8, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity: loading?.6:1 }}>
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {txns.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:13 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>💡</div>
          Adicione transações no Chat para receber conselhos personalizados.
        </div>
      ) : loading ? (
        <div style={{ padding:'3rem', display:'flex', justifyContent:'center' }}>
          <Loader label="Gerando conselhos personalizados..." />
        </div>
      ) : (
        advice.map((a,i) => {
          const tc = TYPE_MAP[a.type]||TYPE_MAP.dica
          return (
            <div key={i} style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderLeft:`3px solid ${tc.color}`, borderRadius:12, padding:'1.25rem', marginBottom:'0.75rem', display:'flex', gap:14 }}>
              <span style={{ fontSize:22, flexShrink:0, marginTop:2 }}>{tc.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>{a.title}</span>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>{tc.label}</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>{a.text}</div>
              </div>
            </div>
          )
        })
      )}

      <Card style={{ marginTop:'0.5rem' }}>
        <CardTitle>Pergunte ao consultor</CardTitle>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') ask() }}
            type="text" placeholder="Ex: Como posso investir melhor meu dinheiro?"
            style={{ flex:1, height:40, padding:'0 12px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontFamily:'inherit', fontSize:13 }} />
          <button onClick={ask} disabled={ansLoading}
            style={{ height:40, padding:'0 16px', background:'var(--blue)', color:'#131B2E', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:600, opacity: ansLoading?.6:1 }}>
            ↗
          </button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: answer||ansLoading ? 14:0 }}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>setQuestion(q)} style={{ fontSize:11, padding:'4px 10px', border:'1px solid var(--border-2)', borderRadius:20, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit' }}>{q}</button>
          ))}
        </div>
        {ansLoading && <Loader label="Consultando..." />}
        {answer && (
          <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px', fontSize:13, lineHeight:1.7, color:'var(--text-1)', border:'1px solid var(--border)' }}>
            {answer.split('\n').map((l,i)=><span key={i} style={{ display:'block' }}>{l||'\u00a0'}</span>)}
          </div>
        )}
      </Card>
    </div>
  )
}

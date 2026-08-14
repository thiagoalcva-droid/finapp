import { useMemo, useState } from 'react'
import { fmt, pct, CAT, CatIcon, Badge, Card, CardTitle } from '../components/shared'

export default function Despesas({ txns }) {
  const [filter, setFilter] = useState('todos')
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)

  const byCat = useMemo(() => {
    const map = {}
    txns.filter(t=>t.type==='out').forEach(t=>{
      if(!map[t.cat]) map[t.cat]={ amt:0, hasUnnec:false }
      map[t.cat].amt += t.amt
      if(!t.nec) map[t.cat].hasUnnec = true
    })
    return Object.entries(map).sort((a,b)=>b[1].amt-a[1].amt).map(([cat,v])=>({cat,...v}))
  },[txns])

  const filtered = byCat.filter(c=>{
    if(filter==='nec')   return !c.hasUnnec
    if(filter==='unnec') return c.hasUnnec
    return true
  })

  const outTxns = txns.filter(t=>t.type==='out').slice().sort((a,b)=>new Date(b.date)-new Date(a.date))

  const filters = [['todos','Todas'],['nec','Necessárias'],['unnec','Com supérfluos']]

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap' }}>
        {filters.map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ fontSize:11, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, background: filter===k ? 'var(--blue)':'var(--bg-raised)', color: filter===k ? '#fff':'var(--text-2)' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:'1rem' }}>
        {filtered.slice(0,8).map(c=>{
          const cfg = CAT[c.cat]||CAT['Outros']
          const p   = pct(c.amt,totalOut)
          return (
            <div key={c.cat} style={{ background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:20, marginBottom:8 }}>{cfg.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>{c.cat}</div>
              <div style={{ fontSize:15, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)', marginTop:3 }}>{fmt(c.amt)}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{p}% das saídas</div>
              <div style={{ height:3, background:'var(--bg-card)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
                <div style={{ height:'100%', background:cfg.color, width:`${p}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <Card>
        <CardTitle>Todas as transações ({outTxns.length})</CardTitle>
        {outTxns.length===0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-3)', fontSize:13 }}>
            Nenhuma transação ainda. Use o Chat para adicionar.
          </div>
        ) : outTxns.map(t=>(
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
            <CatIcon cat={t.cat} size={30} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.desc}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{t.date?.slice(5)?.replace('-','/')} · {t.cat}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
              <span style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--red)' }}>-{fmt(t.amt)}</span>
              <div style={{ display:'flex', gap:4 }}>
                <Badge label={t.fixed ? 'Fixo':'Variável'} color={t.fixed ? 'amber':'purple'} />
                <Badge label={t.nec ? 'Necessário':'Supérfluo'} color={t.nec ? 'green':'red'} />
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

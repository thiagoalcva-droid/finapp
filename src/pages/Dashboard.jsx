import { useMemo } from 'react'
import { fmt, pct, CAT, MetricCard, Card, CardTitle, TxnRow } from '../components/shared'

const HIST = [{ m:'Jan',i:5200,o:4800 },{ m:'Fev',i:6800,o:5200 },{ m:'Mar',i:7100,o:4900 },{ m:'Abr',i:7900,o:4300 }]

export default function Dashboard({ txns }) {
  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
  const balance  = totalIn - totalOut
  const savRate  = pct(balance, totalIn)

  const months = [...HIST, { m:'Mai', i:totalIn, o:totalOut }]
  const maxF   = Math.max(...months.flatMap(m=>[m.i,m.o]), 1)

  const byCat = useMemo(() => {
    const map = {}
    txns.filter(t=>t.type==='out').forEach(t=>{ map[t.cat]=(map[t.cat]||0)+t.amt })
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
  }, [txns])
  const maxC = byCat[0]?.[1]||1

  const recent = txns.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8)

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:'1rem' }}>
        <MetricCard label="Saldo atual"      value={fmt(balance)}  sub={`Economizou ${savRate}% da renda`} accent="var(--blue)" />
        <MetricCard label="Entradas (mai)"   value={fmt(totalIn)}  sub="Renda total do mês" />
        <MetricCard label="Saídas (mai)"     value={fmt(totalOut)} sub={`${pct(totalOut,totalIn)}% da renda`} accent="var(--red)" />
        <MetricCard label="Taxa de economia" value={`${savRate}%`} sub={savRate>=20 ? '✓ Acima da média':'⚠ Abaixo do ideal'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>
        <Card>
          <CardTitle>Fluxo de caixa</CardTitle>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:80 }}>
            {months.map(m => (
              <div key={m.m} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:66 }}>
                  <div style={{ width:9, borderRadius:'3px 3px 0 0', background:'var(--green)', height:Math.max(2,Math.round(m.i/maxF*64)) }} />
                  <div style={{ width:9, borderRadius:'3px 3px 0 0', background:'var(--red)',   height:Math.max(2,Math.round(m.o/maxF*64)) }} />
                </div>
                <span style={{ fontSize:10, color:'var(--text-3)' }}>{m.m}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:14, marginTop:10 }}>
            {[['var(--green)','Entradas'],['var(--red)','Saídas']].map(([c,l])=>(
              <span key={l} style={{ fontSize:11, color:'var(--text-2)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:c, display:'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Maiores gastos</CardTitle>
          {byCat.slice(0,5).map(([cat,amt]) => {
            const cfg = CAT[cat]||CAT['Outros']
            return (
              <div key={cat} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                  <span style={{ color:'var(--text-2)' }}>{cfg.icon} {cat}</span>
                  <span style={{ color:'var(--text-1)', fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{fmt(amt)}</span>
                </div>
                <div style={{ height:5, background:'var(--bg-raised)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:cfg.color, width:`${pct(amt,maxC)}%`, borderRadius:3 }} />
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      <Card>
        <CardTitle>Últimas transações</CardTitle>
        {recent.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-3)', fontSize:13 }}>
            Nenhuma transação. Vá para Chat para adicionar.
          </div>
        ) : recent.map(t => <TxnRow key={t.id} t={t} />)}
      </Card>
    </div>
  )
}

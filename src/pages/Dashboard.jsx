import { useMemo } from 'react'
import { fmt, pct, CAT, MetricCard, Card, CardTitle, TxnRow } from '../components/shared'

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Dashboard({ txns, allTxns }) {
  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
  const balance  = totalIn - totalOut
  const savRate  = pct(balance, totalIn)

  /* Fluxo de caixa REAL — ultimos 6 meses calculados das transacoes */
  const months = useMemo(() => {
    const map = {}
    ;(allTxns||txns).forEach(t=>{
      const key = t.date?.slice(0,7)
      if(!key) return
      if(!map[key]) map[key]={ i:0, o:0 }
      if(t.type==='in') map[key].i += t.amt; else map[key].o += t.amt
    })
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
      .map(([k,v])=>({ m: MONTH_LABELS[+k.slice(5,7)-1], ...v }))
  },[allTxns, txns])
  const maxF = Math.max(...months.flatMap(m=>[m.i,m.o]), 1)

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
        <MetricCard label="Saldo do período" value={fmt(balance)}  sub={totalIn>0 ? `Economizou ${savRate}% da renda` : 'Sem entradas no período'} accent="var(--blue)" />
        <MetricCard label="Entradas"         value={fmt(totalIn)}  sub="Renda no período" />
        <MetricCard label="Saídas"           value={fmt(totalOut)} sub={totalIn>0 ? `${pct(totalOut,totalIn)}% da renda` : ''} accent="var(--red)" />
        <MetricCard label="Taxa de economia" value={`${savRate}%`} sub={savRate>=20 ? '✓ Acima da média':'⚠ Abaixo do ideal (20%)'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>
        <Card>
          <CardTitle>Fluxo de caixa (real)</CardTitle>
          {months.length===0 ? <div style={{fontSize:12,color:'var(--text-3)',padding:'1rem 0'}}>Sem dados ainda.</div> : (
            <>
              <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:80 }}>
                {months.map((m,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
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
            </>
          )}
        </Card>

        <Card>
          <CardTitle>Maiores gastos</CardTitle>
          {byCat.length===0 ? <div style={{fontSize:12,color:'var(--text-3)',padding:'1rem 0'}}>Sem gastos no período.</div> :
            byCat.slice(0,5).map(([cat,amt]) => {
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
            Nenhuma transação. Vá para o Chat para adicionar.
          </div>
        ) : recent.map(t => <TxnRow key={t.id} t={t} />)}
      </Card>
    </div>
  )
}

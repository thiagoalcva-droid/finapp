import { useMemo } from 'react'
import { fmt, pct, CAT, MetricCard, Card, CardTitle, TxnRow } from '../components/shared'

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

/* categorias consideradas "investido/reservado" (dinheiro que trabalha pra pessoa) */
const INVESTIDO_CATS = ['Investimentos','Meta','Sonho']

export default function Dashboard({ txns, allTxns }) {
  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
  const balance  = totalIn - totalOut
  const invested = txns.filter(t=>t.type==='out' && INVESTIDO_CATS.includes(t.cat)).reduce((s,t)=>s+t.amt,0)
  const sobra    = balance  // a sobra do mês = entradas - saídas
  const savRate  = pct(sobra, totalIn)

  /* Fluxo de caixa REAL — ultimos 6 meses. Serve tambem pra % evolucao */
  const months = useMemo(() => {
    const map = {}
    ;(allTxns||txns).forEach(t=>{
      const key = t.date?.slice(0,7)
      if(!key) return
      if(!map[key]) map[key]={ i:0, o:0 }
      if(t.type==='in') map[key].i += t.amt; else map[key].o += t.amt
    })
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
      .map(([k,v])=>({ key:k, m: MONTH_LABELS[+k.slice(5,7)-1], ...v, saldo:v.i-v.o }))
  },[allTxns, txns])
  const maxF = Math.max(...months.flatMap(m=>[m.i,m.o]), 1)

  /* % de evolucao: compara sobra deste periodo com o mes anterior */
  const evolucao = useMemo(() => {
    if (months.length < 2) return null
    const atual = months[months.length-1].saldo
    const ant   = months[months.length-2].saldo
    if (ant === 0) return null
    return Math.round(((atual - ant) / Math.abs(ant)) * 100)
  },[months])

  const byCat = useMemo(() => {
    const map = {}
    txns.filter(t=>t.type==='out').forEach(t=>{ map[t.cat]=(map[t.cat]||0)+t.amt })
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
  }, [txns])
  const maxC = byCat[0]?.[1]||1

  const recent = txns.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8)
  const semDados = txns.length === 0

  return (
    <div>
      {/* ── SOBRA DO MÊS: número herói ── */}
      <div style={{ background:'linear-gradient(135deg, var(--itau-navy) 0%, var(--itau-navy-2) 100%)', borderRadius:16, padding:'1.5rem', marginBottom:'1rem', color:'#fff', boxShadow:'0 4px 16px rgba(10,37,64,.2)' }}>
        <div style={{ fontSize:12, opacity:.85, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>
          {sobra >= 0 ? 'Sobrou este período' : 'Faltou este período'}
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
          <div style={{ fontSize:34, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color: sobra>=0 ? '#fff':'#FFB4B4' }}>
            {fmt(sobra)}
          </div>
          {evolucao !== null && (
            <div style={{ fontSize:14, fontWeight:700, color: evolucao>=0 ? '#5EEAD4':'#FFB4B4', display:'flex', alignItems:'center', gap:3 }}>
              {evolucao>=0 ? '↗' : '↘'} {evolucao>=0?'+':''}{evolucao}%
            </div>
          )}
        </div>
        <div style={{ fontSize:12, opacity:.8, marginTop:6 }}>
          {semDados ? 'Comece registrando suas transações no chat' :
           sobra>=0 ? `Você guardou ${savRate}% do que ganhou 👏` : 'Atenção: você gastou mais do que ganhou'}
        </div>
      </div>

      {/* ── MÉTRICAS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:'1rem' }}>
        <MetricCard label="Entradas" value={fmt(totalIn)}  sub="Tudo que entrou" accent="var(--blue)" />
        <MetricCard label="Saídas"   value={fmt(totalOut)} sub={totalIn>0 ? `${pct(totalOut,totalIn)}% da renda` : 'Tudo que saiu'} accent="var(--blue)" />
        <MetricCard label="Investido / Reservado" value={fmt(invested)} sub="Trabalhando por você 📈" accent="var(--blue)" />
      </div>

      {/* ── FLUXO + CATEGORIAS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginBottom:'1rem' }}>
        <Card>
          <CardTitle>Fluxo de caixa (real)</CardTitle>
          {months.length===0 ? <div style={{fontSize:12,color:'var(--text-3)',padding:'1rem 0'}}>Sem dados ainda. Registre no chat.</div> : (
            <>
              <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:90, paddingTop:8 }}>
                {months.map((m,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                    <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:70 }}>
                      <div style={{ width:10, borderRadius:'3px 3px 0 0', background:'var(--green)', height:Math.max(2,Math.round(m.i/maxF*66)) }} title={`Entradas ${fmt(m.i)}`} />
                      <div style={{ width:10, borderRadius:'3px 3px 0 0', background:'var(--blue)', height:Math.max(2,Math.round(m.o/maxF*66)) }} title={`Saídas ${fmt(m.o)}`} />
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-3)' }}>{m.m}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:12 }}>
                {[['var(--green)','Entradas'],['var(--blue)','Saídas']].map(([c,l])=>(
                  <span key={l} style={{ fontSize:11, color:'var(--text-2)', display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }} />{l}
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
                <div key={cat} style={{ marginBottom:11 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                    <span style={{ color:'var(--text-2)' }}>{cfg.icon} {cat}</span>
                    <span style={{ color:'var(--text-1)', fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600 }}>{fmt(amt)}</span>
                  </div>
                  <div style={{ height:6, background:'var(--bg-raised)', borderRadius:3, overflow:'hidden' }}>
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
            Nenhuma transação. Toque no botão de chat para adicionar.
          </div>
        ) : recent.map(t => <TxnRow key={t.id} t={t} />)}
      </Card>
    </div>
  )
}

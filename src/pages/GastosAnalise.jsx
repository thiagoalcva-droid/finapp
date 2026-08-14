import { useState, useEffect, useRef, useMemo } from 'react'
import { TrendingUp, Flame } from 'lucide-react'
import { callClaude, CONSULTOR_SYSTEM } from '../lib/claude'
import { updateTransaction } from '../lib/api'
import { fmt, pct, CAT, CatIcon, Toggle, MetricCard, Bubble, Loader, Card, CardTitle, Note } from '../components/shared'

const STABS = [['fixos','Fixos'],['variaveis','Variáveis'],['necessidade','Necessário × Supérfluo'],['impacto','Impacto patrimonial']]

function TxnRow({ t, onNec, onFixed, showFixed }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <CatIcon cat={t.cat} size={32} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.desc}</div>
        <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2, display:'flex', gap:6, alignItems:'center' }}>
          {t.date?.slice(5)?.replace('-','/')}
          {showFixed && <button onClick={()=>onFixed(t.id)} style={{ fontSize:10, padding:'1px 7px', borderRadius:8, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit', background: t.fixed ? 'var(--amber-bg)':'var(--bg-raised)', color: t.fixed ? 'var(--amber)':'var(--text-3)' }}>{t.fixed ? 'Fixo ↺':'Variável ↺'}</button>}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
        <span style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--red)' }}>-{fmt(t.amt)}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:10, fontWeight:600, color: t.nec ? 'var(--green)':'var(--red)' }}>{t.nec ? '✓ Nec':'✕ Sup'}</span>
          <Toggle on={t.nec} onToggle={()=>onNec(t.id)} />
        </div>
      </div>
    </div>
  )
}

export default function GastosAnalise({ txns, setTxns }) {
  const [stab, setStab]           = useState('fixos')
  const [msgs, setMsgs]           = useState([])
  const [cinput, setCinput]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [history, setHistory]     = useState([])
  const chatRef = useRef(null)

  const out      = txns.filter(t=>t.type==='out')
  const totalOut = out.reduce((s,t)=>s+t.amt,0)
  const totalIn  = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
  const fixedOut = out.filter(t=>t.fixed).reduce((s,t)=>s+t.amt,0)
  const varOut   = out.filter(t=>!t.fixed).reduce((s,t)=>s+t.amt,0)
  const necAmt   = out.filter(t=>t.nec).reduce((s,t)=>s+t.amt,0)
  const unnecAmt = out.filter(t=>!t.nec).reduce((s,t)=>s+t.amt,0)
  const score    = Math.min(100,Math.round(40+(totalIn-totalOut)/Math.max(totalIn,1)*60))

  const byCatUnnec = useMemo(() => {
    const m = {}
    out.forEach(t=>{ if(!t.nec) m[t.cat]=(m[t.cat]||0)+t.amt })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[txns])

  const projData = Array.from({length:11},(_,i)=>i===0?0:Math.round(unnecAmt*((Math.pow(1.01,i*12)-1)/0.01)))
  const maxProj  = projData[10]||1

  useEffect(() => { if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[msgs,loading])

  useEffect(() => {
    if(msgs.length===0) {
      const sv = pct(totalIn-totalOut,totalIn)
      setMsgs([{ role:'ai', text:`Olá! Analisei suas finanças.\n\n💰 Renda: ${fmt(totalIn)} | Gastos: ${fmt(totalOut)} | Economiza: ${sv}%\n\n${sv>=20?'✅ Boa taxa de poupança!':'⚠️ Taxa de poupança abaixo de 20% — abaixo do ideal.'}\n\n${unnecAmt>0?`💡 ${fmt(unnecAmt)} em gastos supérfluos — investindo isso você acumularia ${fmt(projData[10])} em 10 anos.`:''}\n\nFaça qualquer pergunta!` }])
    }
  },[])

  const toggleNec = async (id) => {
    const t = txns.find(x=>x.id===id); if(!t) return
    setTxns(prev=>prev.map(x=>x.id===id?{...x,nec:!x.nec}:x))
    await updateTransaction(id,{nec:!t.nec}).catch(()=>{})
  }
  const toggleFixed = async (id) => {
    const t = txns.find(x=>x.id===id); if(!t) return
    setTxns(prev=>prev.map(x=>x.id===id?{...x,fixed:!x.fixed}:x))
    await updateTransaction(id,{fixed:!t.fixed}).catch(()=>{})
  }

  const sendConsult = async (text) => {
    const msg = (text||cinput).trim(); if(!msg) return
    setCinput('')
    const newH = [...history,{role:'user',content:msg}]
    setHistory(newH)
    setMsgs(prev=>[...prev,{role:'user',text:msg}])
    setLoading(true)
    const byCat = (() => {const m={};out.forEach(t=>{m[t.cat]=(m[t.cat]||0)+t.amt});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c,v])=>`${c} ${fmt(v)}`).join(', ')})()
    try {
      const system = CONSULTOR_SYSTEM({ totalIn:fmt(totalIn), totalOut:fmt(totalOut), balance:fmt(totalIn-totalOut), savRate:pct(totalIn-totalOut,totalIn), fixedOut:fmt(fixedOut), varOut:fmt(varOut), necAmt:fmt(necAmt), unnecAmt:fmt(unnecAmt), byCat })
      const reply  = await callClaude(system, newH, 500)
      setHistory(prev=>[...prev,{role:'assistant',content:reply}])
      setMsgs(prev=>[...prev,{role:'ai',text:reply}])
    } catch(e) { setMsgs(prev=>[...prev,{role:'ai',text:`Erro: ${e.message}`}]) }
    setLoading(false)
  }

  const QUICK = ['O que cortar primeiro?','Quanto posso investir?','Meus fixos estão altos?','Como enriquecer mais rápido?']

  return (
    <div>
      <Note>Aqui você vê <strong>para onde vai o seu dinheiro</strong>. Cada fatia é uma categoria de gasto — quanto maior, mais você gastou ali.</Note>

      {/* ── DONUT: para onde vai o dinheiro ── */}
      {(() => {
        const cats = (() => { const m={}; out.forEach(t=>{m[t.cat]=(m[t.cat]||0)+t.amt}); return Object.entries(m).sort((a,b)=>b[1]-a[1]) })()
        if (cats.length === 0) return (
          <Card><div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-3)', fontSize:13 }}>Sem gastos no período ainda.</div></Card>
        )
        const total = cats.reduce((s,[,v])=>s+v,0)
        let acc = 0
        const R = 54, C = 2*Math.PI*R
        return (
          <Card>
            <CardTitle>Balanço por categoria</CardTitle>
            <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
              <div style={{ position:'relative', width:150, height:150, flexShrink:0 }}>
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform:'rotate(-90deg)' }}>
                  {cats.map(([cat,v],i)=>{
                    const frac = v/total
                    const dash = C*frac
                    const off  = -acc*C
                    acc += frac
                    const cfg = CAT[cat]||CAT['Outros']
                    return <circle key={i} cx="75" cy="75" r={R} fill="none" stroke={cfg.color} strokeWidth="20" strokeDasharray={`${dash} ${C-dash}`} strokeDashoffset={off} />
                  })}
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:10, color:'var(--text-3)' }}>Total</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', fontFamily:"'JetBrains Mono',monospace" }}>{fmt(total)}</div>
                </div>
              </div>
              <div style={{ flex:1, minWidth:180, display:'flex', flexDirection:'column', gap:8 }}>
                {cats.slice(0,7).map(([cat,v])=>{
                  const cfg = CAT[cat]||CAT['Outros']
                  return (
                    <div key={cat} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:cfg.color, flexShrink:0 }} />
                      <span style={{ fontSize:12.5, color:'var(--text-1)', flex:1 }}>{cfg.icon} {cat}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', fontFamily:"'JetBrains Mono',monospace" }}>{pct(v,total)}%</span>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', fontFamily:"'JetBrains Mono',monospace", minWidth:75, textAlign:'right' }}>{fmt(v)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )
      })()}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8, marginBottom:'1rem' }}>
        <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ position:'relative', width:46, height:46, flexShrink:0 }}>
            <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="23" cy="23" r="19" fill="none" stroke="var(--border-2)" strokeWidth="4"/>
              <circle cx="23" cy="23" r="19" fill="none" stroke="var(--blue)" strokeWidth="4" strokeDasharray="119.4" strokeDashoffset={119.4*(1-score/100)} strokeLinecap="round"/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)' }}>{score}</div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-1)' }}>Score</div>
            <div style={{ fontSize:10, color:'var(--text-2)', marginTop:2 }}>{score>=70 ? 'Saúde boa':score>=50 ? 'Atenção':'Risco'}</div>
          </div>
        </div>
        <MetricCard label="Gastos fixos"  value={fmt(fixedOut)} sub={`${pct(fixedOut,totalOut)}% das saídas`} />
        <MetricCard label="Variáveis"     value={fmt(varOut)}   sub={`${pct(varOut,totalOut)}% das saídas`} />
        <MetricCard label="Supérfluos"    value={fmt(unnecAmt)} sub="Potencial de corte" accent="var(--red)" />
      </div>

      <div style={{ display:'flex', gap:5, marginBottom:'1rem', flexWrap:'wrap' }}>
        {STABS.map(([k,l])=>(
          <button key={k} onClick={()=>setStab(k)} style={{ fontSize:11, padding:'6px 13px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, background: stab===k ? 'var(--blue)':'var(--bg-raised)', color: stab===k ? '#fff':'var(--text-2)' }}>
            {l}
          </button>
        ))}
      </div>

      {stab==='fixos' && (
        <div>
          <Note>Gastos mensais recorrentes. Clique no badge para mover para variável. Toggle para marcar como necessário.</Note>
          <Card>
            <CardTitle>Fixos — {out.filter(t=>t.fixed).length} itens · {fmt(fixedOut)}</CardTitle>
            {out.filter(t=>t.fixed).map(t=><TxnRow key={t.id} t={t} onNec={toggleNec} onFixed={toggleFixed} showFixed />)}
          </Card>
        </div>
      )}

      {stab==='variaveis' && (
        <div>
          <Note>Gastos que variam todo mês — maior potencial de redução. Clique para mover para fixo.</Note>
          <Card>
            <CardTitle>Variáveis — {out.filter(t=>!t.fixed).length} itens · {fmt(varOut)}</CardTitle>
            {out.filter(t=>!t.fixed).map(t=><TxnRow key={t.id} t={t} onNec={toggleNec} onFixed={toggleFixed} showFixed />)}
          </Card>
        </div>
      )}

      {stab==='necessidade' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>
            <MetricCard label="✓ Necessários" value={fmt(necAmt)}   sub={`${out.filter(t=>t.nec).length} itens · ${pct(necAmt,totalOut)}%`}   accent="var(--green)" />
            <MetricCard label="✕ Supérfluos"  value={fmt(unnecAmt)} sub={`${out.filter(t=>!t.nec).length} itens · ${pct(unnecAmt,totalOut)}%`} accent="var(--red)" />
          </div>
          <Note>A IA classificou automaticamente. Use os toggles para ajustar — os totais atualizam em tempo real e são salvos.</Note>
          <Card>{out.map(t=><TxnRow key={t.id} t={t} onNec={toggleNec} onFixed={toggleFixed} />)}</Card>
          {unnecAmt>0 && (
            <div style={{ background:'var(--green-bg)', border:`1px solid var(--green-border)`, borderLeft:'3px solid var(--green)', borderRadius:12, padding:'1.25rem', marginTop:'0.5rem', display:'flex', gap:14, alignItems:'flex-start' }}>
              <span style={{ fontSize:26, flexShrink:0 }}>🐷</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--green)' }}>Potencial de economia mensal</div>
                <div style={{ fontSize:24, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'var(--green)', margin:'4px 0' }}>{fmt(unnecAmt)}</div>
                <div style={{ fontSize:12, color:'var(--green)' }}>= {fmt(unnecAmt*12)}/ano · Em 10 anos investindo a 12% a.a.: {fmt(projData[10])}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {stab==='impacto' && (
        <div>
          <Card>
            <CardTitle><TrendingUp size={13} /> Projeção — investindo {fmt(unnecAmt)}/mês a 12% a.a.</CardTitle>
            <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:80, marginBottom:8 }}>
              {projData.map((v,i)=>(
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ background:'var(--blue)', borderRadius:'3px 3px 0 0', width:'100%', height:Math.max(2,Math.round(v/maxProj*72)) }} />
                  <span style={{ fontSize:9, color:'var(--text-3)' }}>{i===0?'Hj':i+'a'}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color:'var(--blue)' }}>Em 10 anos: {fmt(projData[10])} acumulados</div>
          </Card>
          <Card>
            <CardTitle><Flame size={13} /> Maiores impactos para cortar</CardTitle>
            {byCatUnnec.map(([cat,amt])=>{
              const cfg   = CAT[cat]||CAT['Outros']
              const stars = Math.max(1,Math.min(5,Math.round((amt/Math.max(unnecAmt,1))*5)+1))
              return (
                <div key={cat} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:18 }}>{cfg.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text-1)' }}>{cat}</div>
                    <div style={{ fontSize:11, color:'var(--green)', marginTop:2 }}>Potencial: {fmt(amt)}/mês</div>
                  </div>
                  <div style={{ display:'flex', gap:2 }}>
                    {[1,2,3,4,5].map(s=><span key={s} style={{ fontSize:12, color: s<=stars ? 'var(--amber)':'var(--border-3)' }}>★</span>)}
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      <div style={{ marginTop:'1.5rem', background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'2px solid var(--border-2)', borderRadius:14, padding:'1.25rem' }}>
        <CardTitle>🤖 Consultor financeiro IA</CardTitle>
        <div ref={chatRef} style={{ background:'var(--bg-raised)', borderRadius:10, padding:'1rem', minHeight:180, maxHeight:320, overflowY:'auto', marginBottom:12, display:'flex', flexDirection:'column', gap:10 }}>
          {msgs.map((m,i)=><Bubble key={i} msg={m} />)}
          {loading && <Loader label="Consultando..." />}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <textarea value={cinput} onChange={e=>setCinput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendConsult()} }}
            placeholder="Ex: Estou gastando muito com delivery?"
            style={{ flex:1, resize:'none', border:'1px solid var(--border-2)', borderRadius:8, padding:'9px 12px', fontSize:13, background:'var(--bg-input)', color:'var(--text-1)', fontFamily:'inherit', height:42 }} />
          <button onClick={()=>sendConsult()} disabled={loading}
            style={{ height:38, padding:'0 16px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:600, opacity:loading?.6:1 }}>↗</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>sendConsult(q)} style={{ fontSize:11, padding:'4px 10px', border:'1px solid var(--border-2)', borderRadius:20, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit' }}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

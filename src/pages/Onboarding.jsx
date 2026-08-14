import { useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { saveOnboarding, insertAlert } from '../lib/api'
import { fmt } from '../components/shared'

/* Despesas da Planilha do Primo Pobre - agrupadas */
const DESPESAS = [
  { nome:'Aluguel ou financiamento', icon:'🏠' },
  { nome:'Condomínio', icon:'🏢' },
  { nome:'Conta de luz', icon:'💡' },
  { nome:'Conta de água', icon:'🚿' },
  { nome:'Gás', icon:'🔥' },
  { nome:'Internet', icon:'📶' },
  { nome:'Telefone / Celular', icon:'📱' },
  { nome:'Supermercado / Feira', icon:'🛒' },
  { nome:'Plano de saúde', icon:'❤️' },
  { nome:'Transporte / Combustível', icon:'⛽' },
  { nome:'Streaming (Netflix, Prime...)', icon:'📺' },
  { nome:'Academia', icon:'🏋️' },
  { nome:'Cartão de crédito', icon:'💳' },
  { nome:'Escola / Faculdade / Cursos', icon:'🎓' },
]

const money = (raw) => { const d=String(raw).replace(/\D/g,''); return d ? (parseInt(d,10)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '' }
const parseM = (m) => { const d=String(m).replace(/\D/g,''); return d ? parseInt(d,10)/100 : 0 }

export default function Onboarding({ userId, onDone }) {
  const [fase, setFase]     = useState(0)  // 0=intro,1=renda,2=despesas,3=sonho,4=milhao,5=resultado
  const [renda, setRenda]   = useState('')
  const [desp, setDesp]     = useState({})       // { nome: 'R$ x' }
  const [despIdx, setDespIdx] = useState(0)
  const [temSonho, setTemSonho] = useState(null)
  const [sonho, setSonho]   = useState('')
  const [querMilhao, setQuerMilhao] = useState(null)
  const [prazo, setPrazo]   = useState('')
  const [saving, setSaving] = useState(false)

  const totalDesp = Object.values(desp).reduce((s,v)=>s+parseM(v),0)
  const rendaN = parseM(renda)
  const sobra = rendaN - totalDesp
  const podeInvestir = Math.max(0, sobra * 0.8)  // tira 20% de diversao

  const finalizar = async () => {
    setSaving(true)
    try {
      // Salva as despesas como despesas fixas de verdade
      for (const [nome, val] of Object.entries(desp)) {
        const v = parseM(val)
        if (v > 0) await insertAlert(userId, { title:nome, amount:v, due_day:5, kind:'fixa' }).catch(()=>{})
      }
      await saveOnboarding(userId, {
        completo:true, renda:rendaN,
        despesas:Object.fromEntries(Object.entries(desp).map(([k,v])=>[k,parseM(v)])),
        total_despesas:totalDesp, tem_sonho:temSonho, sonho:temSonho?sonho:null,
        quer_milhao:querMilhao, prazo_milhao: querMilhao?+prazo:null, pode_investir:podeInvestir,
      })
      onDone()
    } catch(e){ alert('Erro ao salvar: '+e.message); setSaving(false) }
  }

  const inpBig = { width:'100%', height:56, padding:'0 16px', borderRadius:12, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--blue)', fontSize:24, fontWeight:700, textAlign:'center' }
  const inp = { width:'100%', height:52, padding:'0 16px', borderRadius:12, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:17 }
  const btn = (on) => ({ flex:1, height:52, background: on?'var(--blue)':'var(--bg-raised)', color: on?'#fff':'var(--text-3)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: on?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8 })
  const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:'1.75rem 1.5rem', marginBottom:'1.25rem', boxShadow:'0 2px 8px rgba(20,30,50,.06)' }

  const Wrap = ({ children }) => (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(160deg, var(--itau-navy) 0%, var(--itau-navy-2) 40%, var(--bg) 40%)', padding:'calc(env(safe-area-inset-top) + 24px) 20px 24px', display:'flex', flexDirection:'column' }}>
      <div style={{ maxWidth:440, margin:'0 auto', width:'100%', flex:1 }}>{children}</div>
    </div>
  )

  /* ── INTRO ── */
  if (fase === 0) return (
    <Wrap>
      <div style={{ textAlign:'center', color:'#fff', marginBottom:24, paddingTop:20 }}>
        <img src="/icon-192.png" alt="" style={{ width:72, height:72, borderRadius:18, marginBottom:16 }} />
        <h1 style={{ fontSize:26, fontWeight:700, marginBottom:10 }}>Bem-vindo(a)! 🪙</h1>
        <p style={{ fontSize:14, opacity:.85, lineHeight:1.5 }}>Vou te fazer algumas perguntas rápidas para conhecer sua vida financeira e montar seu plano. Leva 2 minutinhos!</p>
      </div>
      <div style={{ ...card, textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🎯</div>
        <div style={{ fontSize:15, fontWeight:600, color:'var(--text-1)', marginBottom:8 }}>O que você vai descobrir:</div>
        <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.9, textAlign:'left' }}>
          ✓ Quanto sobra do seu salário todo mês<br/>
          ✓ Quanto você pode investir sem aperto<br/>
          ✓ Um plano pra realizar seu sonho<br/>
          ✓ O caminho pra ter R$ 1 milhão
        </div>
      </div>
      <button onClick={()=>setFase(1)} style={{ ...btn(true), width:'100%' }}>Bora começar <ArrowRight size={17}/></button>
      <button onClick={onDone} style={{ width:'100%', height:44, marginTop:10, background:'none', border:'none', color:'var(--text-3)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Pular por agora</button>
    </Wrap>
  )

  /* ── RENDA ── */
  if (fase === 1) return (
    <Wrap>
      <Prog fase={1} />
      <div style={card}>
        <div style={{ fontSize:32, marginBottom:14 }}>💵</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Quanto você recebe por mês?</h2>
        <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>Some tudo: salário, freelas, vale... o que entra na sua mão.</p>
        <input autoFocus inputMode="numeric" style={inpBig} placeholder="R$ 0,00" value={money(renda)} onChange={e=>setRenda(e.target.value)} />
      </div>
      <button onClick={()=>setFase(2)} disabled={rendaN<=0} style={{ ...btn(rendaN>0), width:'100%' }}>Continuar <ArrowRight size={17}/></button>
    </Wrap>
  )

  /* ── DESPESAS (uma por vez) ── */
  if (fase === 2) {
    const d = DESPESAS[despIdx]
    const val = desp[d.nome] || ''
    const next = () => { if (despIdx < DESPESAS.length-1) setDespIdx(despIdx+1); else setFase(3) }
    const skip = () => next()
    return (
      <Wrap>
        <Prog fase={2} />
        <div style={{ fontSize:12, color:'#fff', opacity:.8, marginBottom:10, textAlign:'center' }}>Despesa {despIdx+1} de {DESPESAS.length}</div>
        <div style={card}>
          <div style={{ fontSize:32, marginBottom:14 }}>{d.icon}</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Você paga <span style={{color:'var(--blue)'}}>{d.nome}</span>?</h2>
          <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>Se sim, quanto por mês? Se não paga, é só pular.</p>
          <input autoFocus inputMode="numeric" style={inpBig} placeholder="R$ 0,00" value={money(val)}
            onChange={e=>setDesp(prev=>({...prev,[d.nome]:e.target.value}))}
            onKeyDown={e=>{ if(e.key==='Enter'&&parseM(val)>0) next() }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={skip} style={{ height:52, padding:'0 24px', background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:12, fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Não pago</button>
          <button onClick={next} disabled={parseM(val)<=0} style={btn(parseM(val)>0)}>{despIdx<DESPESAS.length-1?'Próxima':'Continuar'} <ArrowRight size={16}/></button>
        </div>
      </Wrap>
    )
  }

  /* ── SONHO ── */
  if (fase === 3) return (
    <Wrap>
      <Prog fase={3} />
      <div style={card}>
        <div style={{ fontSize:32, marginBottom:14 }}>🌟</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Você tem um sonho de compra?</h2>
        <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>Algo que você deseja muito conquistar — uma moto, uma viagem, uma casa...</p>
        {temSonho === null ? (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setTemSonho(true)} style={btn(true)}>Sim, tenho! 😍</button>
            <button onClick={()=>{ setTemSonho(false); setFase(4) }} style={{ flex:1, height:52, background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer' }}>Agora não</button>
          </div>
        ) : (
          <>
            <input autoFocus style={inp} placeholder="Ex: uma moto Honda CB 500" value={sonho} onChange={e=>setSonho(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&sonho) setFase(4) }} />
            <button onClick={()=>setFase(4)} disabled={!sonho} style={{ ...btn(!!sonho), width:'100%', marginTop:12 }}>Continuar <ArrowRight size={16}/></button>
          </>
        )}
      </div>
    </Wrap>
  )

  /* ── MILHÃO ── */
  if (fase === 4) return (
    <Wrap>
      <Prog fase={4} />
      <div style={card}>
        <div style={{ fontSize:32, marginBottom:14 }}>👑</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Você sonha em ter <span style={{color:'var(--blue)'}}>R$ 1 milhão</span> na conta?</h2>
        <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>Seja sincero(a)! Vou te mostrar que é mais possível do que parece.</p>
        {querMilhao === null ? (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setQuerMilhao(true)} style={btn(true)}>Sim! 🤑</button>
            <button onClick={()=>{ setQuerMilhao(false); setFase(5) }} style={{ flex:1, height:52, background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer' }}>Não é pra mim</button>
          </div>
        ) : (
          <>
            <label style={{ fontSize:13, color:'var(--text-2)', display:'block', marginBottom:8 }}>Em quantos anos você quer chegar lá?</label>
            <input autoFocus inputMode="numeric" style={inpBig} placeholder="Ex: 15" value={prazo} onChange={e=>setPrazo(e.target.value.replace(/\D/g,''))} onKeyDown={e=>{ if(e.key==='Enter'&&prazo) setFase(5) }} />
            <button onClick={()=>setFase(5)} disabled={!prazo} style={{ ...btn(!!prazo), width:'100%', marginTop:12 }}>Ver meu plano <Sparkles size={16}/></button>
          </>
        )}
      </div>
    </Wrap>
  )

  /* ── RESULTADO ── */
  return (
    <Wrap>
      <div style={{ textAlign:'center', color:'#fff', marginBottom:20, paddingTop:10 }}>
        <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
        <h1 style={{ fontSize:24, fontWeight:700 }}>Prontinho! Aqui está sua realidade:</h1>
      </div>

      <div style={card}>
        <Linha label="Você ganha por mês" valor={fmt(rendaN)} />
        <Linha label="Suas despesas fixas" valor={`− ${fmt(totalDesp)}`} cor="var(--red)" />
        <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />
        <Linha label="Sobra por mês" valor={fmt(sobra)} cor={sobra>=0?'var(--green)':'var(--red)'} bold />
        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:10, lineHeight:1.5 }}>
          💡 Reservando 20% da sobra para diversão e imprevistos, você ainda consegue investir:
        </div>
        <div style={{ background:'var(--blue-bg)', border:'1px solid var(--blue-border)', borderRadius:12, padding:'16px', textAlign:'center', marginTop:12 }}>
          <div style={{ fontSize:11, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Você pode investir por mês</div>
          <div style={{ fontSize:28, fontWeight:700, color:'var(--blue)', fontFamily:"'JetBrains Mono',monospace" }}>{fmt(podeInvestir)}</div>
        </div>
      </div>

      {querMilhao && podeInvestir>0 && (
        <div style={{ background:'linear-gradient(135deg, var(--itau-navy), var(--itau-navy-2))', borderRadius:16, padding:'1.25rem', marginBottom:'1.25rem', color:'#fff', textAlign:'center' }}>
          <div style={{ fontSize:13, opacity:.85, marginBottom:6 }}>👑 Investindo {fmt(podeInvestir)}/mês por {prazo} anos</div>
          <div style={{ fontSize:13, lineHeight:1.6 }}>
            Você está no caminho certo! Na aba <strong>Ficar Milionário</strong> eu monto seu plano completo pra chegar no R$ 1 milhão. 🚀
          </div>
        </div>
      )}

      <button onClick={finalizar} disabled={saving} style={{ ...btn(true), width:'100%' }}>
        {saving ? 'Salvando...' : <><Check size={18}/> Começar a usar o app</>}
      </button>
    </Wrap>
  )
}

function Prog({ fase }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ height:6, background:'rgba(255,255,255,.2)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'#fff', width:`${(fase/5)*100}%`, transition:'width .3s', borderRadius:3 }} />
      </div>
    </div>
  )
}

function Linha({ label, valor, cor, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0' }}>
      <span style={{ fontSize: bold?14:13, color:'var(--text-2)', fontWeight: bold?600:400 }}>{label}</span>
      <span style={{ fontSize: bold?18:14, fontWeight: bold?700:600, color: cor||'var(--text-1)', fontFamily:"'JetBrains Mono',monospace" }}>{valor}</span>
    </div>
  )
}

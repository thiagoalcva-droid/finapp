import { useState, useEffect } from 'react'
import { ArrowRight, RefreshCw, Sparkles, Check } from 'lucide-react'
import { callClaude, SONHO_SYSTEM } from '../lib/claude'
import { loadDream, saveDream, insertGoal } from '../lib/api'
import { fmt, Loader, Card, CardTitle } from '../components/shared'
import { ESTADOS, UFS } from '../lib/estados'

/* Formata numero digitado como moeda: 150000 -> R$ 1.500,00 */
const formatMoneyInput = (raw) => {
  const digits = String(raw).replace(/\D/g,'')
  if (!digits) return ''
  const n = parseInt(digits,10) / 100
  return n.toLocaleString('pt-BR',{ style:'currency', currency:'BRL' })
}
const parseMoneyInput = (masked) => {
  const digits = String(masked).replace(/\D/g,'')
  return digits ? parseInt(digits,10)/100 : 0
}

export default function Sonho({ userId, onVirarMeta }) {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState({ moeda:'Real (R$)' })
  const [loading, setLoading] = useState(true)
  const [generating, setGen]  = useState(false)
  const [result, setResult]   = useState(null)
  const [virando, setVirando] = useState(false)

  useEffect(() => {
    loadDream(userId).then(d => {
      if (d && d.plano_gerado) {
        setResult({ sonho:d.sonho, preco_estimado:+d.preco_sonho, meses:d.meses_sonho, aporte_mensal:+d.aporte_mensal, plano:d.plano_gerado, viavel:true })
      }
      setLoading(false)
    })
  },[userId])

  const PERGUNTAS = [
    { id:'idade',    tipo:'number', emoji:'🎂', label:'Quantos anos você tem?', ph:'Ex: 28' },
    { id:'estado',   tipo:'estado', emoji:'📍', label:'Em qual estado você mora?' },
    { id:'cidade',   tipo:'cidade', emoji:'🏙️', label:'E em qual cidade?' },
    { id:'trabalho', tipo:'select', emoji:'💼', label:'Como você ganha seu dinheiro hoje?', options:['Trabalho com carteira assinada (CLT)','Trabalho por conta própria / autônomo','Sou empresário / tenho meu negócio','Sou funcionário público','Estou estudando (estágio ou bolsa)','Ainda estou buscando uma renda fixa'] },
    { id:'moeda',    tipo:'select', emoji:'💱', label:'Você recebe em qual moeda?', options:['Real (R$)','Dólar (US$)','Euro (€)'] },
    { id:'renda',    tipo:'money',  emoji:'💵', label:'Quanto você recebe por mês?', ph:'R$ 0,00' },
    { id:'aporte',   tipo:'money',  emoji:'🐷', label:'Quanto você consegue guardar por mês para o seu sonho?', ph:'R$ 0,00' },
    { id:'sonho',    tipo:'text',   emoji:'🌟', label:'Qual é o seu sonho? O que você mais deseja conquistar?', ph:'Ex: uma moto Honda CB 500, um carro, uma viagem...' },
    { id:'viajar',   tipo:'select', emoji:'✈️', label:'Você gosta de viajar?', options:['Amo viajar, é meu combustível','Gosto de vez em quando','Prefiro guardar pra outras coisas'] },
  ]

  const p = PERGUNTAS[step]
  const cur = answers[p?.id]
  const canNext = cur !== undefined && cur !== '' && parseMoneyInput(cur) !== 0 || (p?.tipo!=='money' && cur !== undefined && cur !== '')

  const setA = (v) => setAnswers(prev => ({ ...prev, [p.id]: v }))

  const next = () => {
    if (step < PERGUNTAS.length-1) setStep(step+1)
    else gerar()
  }
  const back = () => step>0 && setStep(step-1)

  const gerar = async () => {
    setGen(true)
    try {
      const renda  = parseMoneyInput(answers.renda)
      const aporte = parseMoneyInput(answers.aporte)
      const perfil = `Idade: ${answers.idade}. Mora em ${answers.cidade}, ${answers.estado}. Trabalho: ${answers.trabalho}. Moeda: ${answers.moeda}. Renda mensal: R$ ${renda}. Consegue guardar por mês: R$ ${aporte}. SONHO: ${answers.sonho}. Gosta de viajar: ${answers.viajar}.`
      const raw   = await callClaude(SONHO_SYSTEM, [{ role:'user', content:`Meu perfil: ${perfil}\n\nEstime o preço do meu sonho e monte meu plano.` }], 900)
      const clean = raw.replace(/```json|```/g,'').trim()
      const r = JSON.parse(clean)
      r.aporte_mensal = aporte
      setResult(r)
      await saveDream(userId, {
        idade:+answers.idade, cidade:answers.cidade, trabalho:answers.trabalho,
        renda, aporte_mensal:aporte, sonho:answers.sonho,
        gosta_viajar: answers.viajar?.includes('Amo')||answers.viajar?.includes('Gosto'),
        plano_gerado:r.plano, preco_sonho:r.preco_estimado, meses_sonho:r.meses,
        extra:{ estado:answers.estado, moeda:answers.moeda },
      }).catch(()=>{})
    } catch(e) {
      setResult({ erro:'Não consegui montar seu plano agora. Tenta de novo em instantes.' })
    }
    setGen(false)
  }

  const virarMeta = async () => {
    setVirando(true)
    try {
      const goal = await insertGoal(userId, {
        name: result.sonho,
        target_amount: result.preco_estimado,
        current_amount: 0,
        deadline: null,
        icon: '🌟',
      })
      if (onVirarMeta) onVirarMeta(goal)  // navega para a aba Metas
    } catch(e) {
      alert('Erro ao criar a meta: '+e.message)
      setVirando(false)
    }
  }

  const refazer = () => { setResult(null); setStep(0); setAnswers({ moeda:'Real (R$)' }) }

  const inp = { width:'100%', height:52, padding:'0 16px', borderRadius:12, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:17, fontWeight:600 }

  if (loading) return <Loader label="Carregando..." />

  /* ── RESULTADO ── */
  if (result) {
    if (result.erro) return (
      <div style={{ textAlign:'center', padding:'2rem' }}>
        <div style={{ color:'var(--red)', fontSize:14, marginBottom:16 }}>{result.erro}</div>
        <button onClick={refazer} style={{ height:44, padding:'0 20px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer' }}>Tentar de novo</button>
      </div>
    )
    const anos = Math.floor(result.meses/12), mm = result.meses%12
    const anosTxt = result.anos_texto || (anos>0 ? `${anos} ${anos===1?'ano':'anos'}${mm>0?` e ${mm} ${mm===1?'mês':'meses'}`:''}` : `${result.meses} meses`)
    return (
      <div>
        <div style={{ background:'linear-gradient(135deg, var(--itau-navy) 0%, var(--itau-navy-2) 100%)', borderRadius:18, padding:'1.75rem 1.5rem', marginBottom:'1rem', textAlign:'center', color:'#fff' }}>
          <div style={{ fontSize:42, marginBottom:8 }}>🌟</div>
          <div style={{ fontSize:13, opacity:.8, marginBottom:4 }}>Seu sonho:</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>{result.sonho}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:'rgba(255,255,255,.1)', borderRadius:12, padding:'14px' }}>
              <div style={{ fontSize:11, opacity:.8, marginBottom:4 }}>Custa cerca de</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{fmt(result.preco_estimado)}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,.1)', borderRadius:12, padding:'14px' }}>
              <div style={{ fontSize:11, opacity:.8, marginBottom:4 }}>Você conquista em</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#FFD98A' }}>{anosTxt}</div>
            </div>
          </div>
        </div>

        {/* CTA emocional para virar meta — PRIMEIRO */}
        <div style={{ background:'var(--blue-bg)', border:'1px solid var(--blue-border)', borderRadius:16, padding:'1.5rem', textAlign:'center', marginBottom:12 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>
            Isso não é mais um sonho distante. É uma <span style={{color:'var(--blue)'}}>meta breve</span>! 🎯
          </div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:16, lineHeight:1.5 }}>
            Quer transformar em um passo a passo? Vou criar sua meta e acompanhar seu progresso todo mês, juntinho com você.
          </div>
          <button onClick={virarMeta} disabled={virando} style={{ width:'100%', height:50, background:'var(--blue)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:virando?.6:1 }}>
            {virando ? 'Criando sua meta...' : <><Check size={18}/> Sim, quero começar agora!</>}
          </button>
        </div>

        {/* Plano — DEPOIS */}
        <Card>
          <CardTitle><Sparkles size={13}/> Seu plano personalizado</CardTitle>
          <div style={{ fontSize:14, lineHeight:1.8, color:'var(--text-1)', whiteSpace:'pre-wrap' }}>{result.plano}</div>
        </Card>

        <button onClick={refazer} style={{ width:'100%', height:42, marginTop:10, background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
          <RefreshCw size={14}/> Refazer com outro sonho
        </button>
      </div>
    )
  }

  /* ── GERANDO ── */
  if (generating) return (
    <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
      <div style={{ fontSize:44, marginBottom:16 }}>🔮</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Montando seu plano...</div>
      <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:24 }}>Estou calculando o caminho até o seu sonho.</div>
      <Loader label="" />
    </div>
  )

  /* ── QUIZ ── */
  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-2)', marginBottom:8 }}>
          <span>Passo {step+1} de {PERGUNTAS.length}</span>
          <span style={{ fontWeight:600, color:'var(--blue)' }}>{Math.round(((step+1)/PERGUNTAS.length)*100)}%</span>
        </div>
        <div style={{ height:8, background:'var(--bg-raised)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', background:'var(--blue)', width:`${((step+1)/PERGUNTAS.length)*100}%`, transition:'width .3s', borderRadius:4 }} />
        </div>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:'1.75rem 1.5rem', marginBottom:'1.5rem', minHeight:220 }}>
        <div style={{ fontSize:32, marginBottom:16 }}>{p.emoji}</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', marginBottom:22, lineHeight:1.35 }}>{p.label}</h2>

        {p.tipo === 'select' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {p.options.map(opt => (
              <button key={opt} onClick={()=>setA(opt)} style={{ textAlign:'left', padding:'14px 16px', borderRadius:12, border:'1.5px solid', cursor:'pointer', fontSize:14.5, fontFamily:'inherit', transition:'all .12s', borderColor: cur===opt?'var(--blue)':'var(--border-2)', background: cur===opt?'var(--blue-bg)':'var(--bg-input)', color: cur===opt?'var(--blue)':'var(--text-1)', fontWeight: cur===opt?600:500 }}>
                {opt}
              </button>
            ))}
          </div>
        ) : p.tipo === 'estado' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(70px,1fr))', gap:8, maxHeight:280, overflowY:'auto' }}>
            {UFS.map(uf => (
              <button key={uf} onClick={()=>{ setAnswers(prev=>({...prev, estado:uf, cidade:undefined})); }} style={{ padding:'12px 6px', borderRadius:10, border:'1.5px solid', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', borderColor: cur===uf?'var(--blue)':'var(--border-2)', background: cur===uf?'var(--blue-bg)':'var(--bg-input)', color: cur===uf?'var(--blue)':'var(--text-1)' }} title={ESTADOS[uf].nome}>
                {uf}
              </button>
            ))}
          </div>
        ) : p.tipo === 'cidade' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
            {answers.estado && ESTADOS[answers.estado].cidades.map(c => (
              <button key={c} onClick={()=>setA(c)} style={{ textAlign:'left', padding:'13px 16px', borderRadius:11, border:'1.5px solid', cursor:'pointer', fontSize:14.5, fontFamily:'inherit', borderColor: cur===c?'var(--blue)':'var(--border-2)', background: cur===c?'var(--blue-bg)':'var(--bg-input)', color: cur===c?'var(--blue)':'var(--text-1)', fontWeight: cur===c?600:500 }}>
                {c}
              </button>
            ))}
            <div style={{ fontSize:12, color:'var(--text-3)', textAlign:'center', padding:'8px' }}>
              Não achou sua cidade? Escolhe a mais próxima. 😊
            </div>
          </div>
        ) : p.tipo === 'money' ? (
          <input autoFocus inputMode="numeric" style={{...inp, fontSize:22, textAlign:'center', color:'var(--blue)'}}
            placeholder={p.ph} value={cur||''}
            onChange={e=>setA(formatMoneyInput(e.target.value))}
            onKeyDown={e=>{ if(e.key==='Enter'&&canNext) next() }} />
        ) : (
          <input autoFocus type={p.tipo} inputMode={p.tipo==='number'?'numeric':'text'} style={inp}
            placeholder={p.ph} value={cur||''}
            onChange={e=>setA(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&canNext) next() }} />
        )}
      </div>

      <div style={{ display:'flex', gap:10 }}>
        {step > 0 && (
          <button onClick={back} style={{ height:52, padding:'0 22px', background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:12, fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            Voltar
          </button>
        )}
        <button onClick={next} disabled={!canNext} style={{ flex:1, height:52, background: canNext?'var(--blue)':'var(--bg-raised)', color: canNext?'#fff':'var(--text-3)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: canNext?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {step < PERGUNTAS.length-1 ? <>Continuar <ArrowRight size={17}/></> : <>✨ Descobrir meu plano</>}
        </button>
      </div>
    </div>
  )
}

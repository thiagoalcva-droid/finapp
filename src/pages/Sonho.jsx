import { useState, useEffect } from 'react'
import { Star, ArrowRight, RefreshCw, Sparkles } from 'lucide-react'
import { callClaude, SONHO_SYSTEM } from '../lib/claude'
import { loadDream, saveDream } from '../lib/api'
import { fmt, Loader, Card, CardTitle } from '../components/shared'

const PERGUNTAS = [
  { id:'idade',    label:'Quantos anos você tem?', type:'number', ph:'Ex: 28' },
  { id:'cidade',   label:'Em qual cidade você mora?', type:'text', ph:'Ex: Salvador, BA' },
  { id:'trabalho', label:'Como você ganha seu dinheiro?', type:'select', options:['Trabalho com carteira assinada (CLT)','Trabalho por conta própria / autônomo','Sou empresário / dono de negócio','Sou funcionário público','Estudante (renda de estágio/bolsa)','Ainda não tenho renda fixa'] },
  { id:'renda',    label:'Quanto você ganha por mês? (aproximado)', type:'number', ph:'Ex: 3000' },
  { id:'aporte_mensal', label:'Quanto você consegue guardar/investir por mês?', type:'number', ph:'Ex: 300' },
  { id:'sonho',    label:'Qual é o seu maior sonho de compra? Seja específico!', type:'text', ph:'Ex: uma moto Honda CB 500, uma viagem pra Disney, um apartamento...' },
  { id:'gosta_viajar', label:'Você gosta de viajar?', type:'select', options:['Amo viajar, é minha paixão','Gosto de vez em quando','Prefiro guardar pra outras coisas'] },
]

export default function Sonho({ userId }) {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGen]  = useState(false)
  const [result, setResult]   = useState(null)

  useEffect(() => {
    loadDream(userId).then(d => {
      if (d && d.plano_gerado) {
        setResult({ sonho:d.sonho, preco_estimado:+d.preco_sonho, meses:d.meses_sonho, aporte_mensal:+d.aporte_mensal, plano:d.plano_gerado, viavel:true })
        setAnswers({ idade:d.idade, cidade:d.cidade, trabalho:d.trabalho, renda:d.renda, aporte_mensal:d.aporte_mensal, sonho:d.sonho, gosta_viajar:d.gosta_viajar })
      }
      setLoading(false)
    })
  },[userId])

  const set = (v) => setAnswers(p => ({ ...p, [PERGUNTAS[step].id]: v }))
  const cur = answers[PERGUNTAS[step].id]
  const canNext = cur !== undefined && cur !== ''

  const next = () => {
    if (step < PERGUNTAS.length-1) setStep(step+1)
    else gerar()
  }

  const gerar = async () => {
    setGen(true)
    try {
      const perfil = `Idade: ${answers.idade} anos. Cidade: ${answers.cidade}. Trabalho: ${answers.trabalho}. Renda mensal: R$ ${answers.renda}. Pode investir por mês: R$ ${answers.aporte_mensal}. SONHO: ${answers.sonho}. Gosta de viajar: ${answers.gosta_viajar}.`
      const raw   = await callClaude(SONHO_SYSTEM, [{ role:'user', content:`Meu perfil: ${perfil}\n\nEstime o preço do meu sonho e monte meu plano para conquistar.` }], 900)
      const clean = raw.replace(/```json|```/g,'').trim()
      const r = JSON.parse(clean)
      setResult(r)
      await saveDream(userId, {
        idade:+answers.idade, cidade:answers.cidade, trabalho:answers.trabalho,
        renda:+answers.renda, aporte_mensal:+answers.aporte_mensal, sonho:answers.sonho,
        gosta_viajar: answers.gosta_viajar?.includes('Amo')||answers.gosta_viajar?.includes('Gosto'),
        plano_gerado:r.plano, preco_sonho:r.preco_estimado, meses_sonho:r.meses,
      }).catch(()=>{})
    } catch(e) {
      setResult({ erro: 'Não consegui gerar seu plano agora. Tenta de novo em instantes.' })
    }
    setGen(false)
  }

  const refazer = () => { setResult(null); setStep(0); setAnswers({}) }

  const inp = { width:'100%', height:48, padding:'0 14px', borderRadius:10, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:16 }

  if (loading) return <Loader label="Carregando..." />

  /* ── RESULTADO ── */
  if (result) {
    if (result.erro) return (
      <div style={{ textAlign:'center', padding:'2rem' }}>
        <div style={{ color:'var(--red)', fontSize:14, marginBottom:16 }}>{result.erro}</div>
        <button onClick={refazer} style={{ height:42, padding:'0 20px', background:'var(--blue)', color:'#131B2E', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>Tentar de novo</button>
      </div>
    )
    const anos = Math.floor(result.meses/12)
    const mm   = result.meses%12
    const anosTxt = result.anos_texto || (anos>0 ? `${anos} ${anos===1?'ano':'anos'}${mm>0?` e ${mm} ${mm===1?'mês':'meses'}`:''}` : `${result.meses} meses`)
    return (
      <div>
        <div style={{ background:'linear-gradient(135deg,#1a1305 0%,#0d0d0f 60%)', border:'1px solid rgba(212,175,55,.35)', borderRadius:16, padding:'1.5rem', marginBottom:'1rem', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🌟</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:4 }}>Seu sonho:</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#f5d67a', marginBottom:16 }}>{result.sonho}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <div style={{ background:'rgba(0,0,0,.4)', borderRadius:12, padding:'14px' }}>
              <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:4 }}>Custa aproximadamente</div>
              <div style={{ fontSize:19, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'#fff' }}>{fmt(result.preco_estimado)}</div>
            </div>
            <div style={{ background:'rgba(0,0,0,.4)', borderRadius:12, padding:'14px' }}>
              <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:4 }}>Você conquista em</div>
              <div style={{ fontSize:19, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:'#34D399' }}>{anosTxt}</div>
            </div>
          </div>

          <div style={{ background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#34D399', fontWeight:600 }}>
            💰 Guardando {fmt(result.aporte_mensal)} por mês
          </div>
        </div>

        <Card>
          <CardTitle><Sparkles size={13}/> Seu plano personalizado</CardTitle>
          <div style={{ fontSize:14, lineHeight:1.8, color:'var(--text-1)', whiteSpace:'pre-wrap' }}>{result.plano}</div>
        </Card>

        <button onClick={refazer} style={{ width:'100%', height:44, background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
          <RefreshCw size={14}/> Refazer com outro sonho
        </button>
      </div>
    )
  }

  /* ── GERANDO ── */
  if (generating) return (
    <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
      <div style={{ fontSize:44, marginBottom:16 }}>🔮</div>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--text-1)', marginBottom:8 }}>Montando seu plano...</div>
      <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>Estou pesquisando o preço do seu sonho e calculando o caminho até ele.</div>
      <Loader label="" />
    </div>
  )

  /* ── QUIZ ── */
  const p = PERGUNTAS[step]
  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-2)', marginBottom:8 }}>
          <span>Pergunta {step+1} de {PERGUNTAS.length}</span>
          <span>{Math.round((step/PERGUNTAS.length)*100)}%</span>
        </div>
        <div style={{ height:6, background:'var(--bg-raised)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', background:'#d4af37', width:`${((step+1)/PERGUNTAS.length)*100}%`, transition:'width .3s' }} />
        </div>
      </div>

      <div style={{ background:'linear-gradient(135deg,#1a1305 0%,#0d0d0f 70%)', border:'1px solid rgba(212,175,55,.25)', borderRadius:16, padding:'1.5rem', marginBottom:'1.5rem', minHeight:200 }}>
        <div style={{ fontSize:26, marginBottom:14 }}>{['🎂','📍','💼','💵','🐷','🌟','✈️'][step]}</div>
        <h2 style={{ fontSize:19, fontWeight:700, color:'var(--text-1)', marginBottom:20, lineHeight:1.4 }}>{p.label}</h2>

        {p.type === 'select' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {p.options.map(opt => (
              <button key={opt} onClick={()=>set(opt)} style={{ textAlign:'left', padding:'13px 16px', borderRadius:10, border:'1px solid', cursor:'pointer', fontSize:14, fontFamily:'inherit', transition:'all .12s', borderColor: cur===opt?'#d4af37':'var(--border-2)', background: cur===opt?'rgba(212,175,55,.12)':'var(--bg-input)', color: cur===opt?'#f5d67a':'var(--text-1)', fontWeight: cur===opt?600:400 }}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input autoFocus style={inp} type={p.type} placeholder={p.ph} value={cur||''} onChange={e=>set(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&canNext) next() }} />
        )}
      </div>

      <div style={{ display:'flex', gap:10 }}>
        {step > 0 && (
          <button onClick={()=>setStep(step-1)} style={{ height:48, padding:'0 20px', background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:12, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Voltar
          </button>
        )}
        <button onClick={next} disabled={!canNext} style={{ flex:1, height:48, background: canNext?'linear-gradient(90deg,#d4af37,#f5d67a)':'var(--bg-raised)', color: canNext?'#1a1305':'var(--text-3)', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: canNext?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {step < PERGUNTAS.length-1 ? <>Próxima <ArrowRight size={16}/></> : <>✨ Descobrir meu plano</>}
        </button>
      </div>
    </div>
  )
}

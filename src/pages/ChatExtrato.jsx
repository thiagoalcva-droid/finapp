import { useState, useEffect, useRef } from 'react'
import { Mic, ImageIcon, Square } from 'lucide-react'
import { callClaude, callClaudeVision, EXTRATO_SYSTEM } from '../lib/claude'
import { insertTransactions, loadChat, saveMsg } from '../lib/api'
import { fmt, CatIcon, Bubble, Loader, Note } from '../components/shared'

export default function ChatExtrato({ userId, txns, setTxns }) {
  const [msgs, setMsgs]         = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [histLoad, setHistLoad] = useState(true)
  const [recording, setRecording] = useState(false)
  const chatRef = useRef(null)
  const fileRef = useRef(null)
  const recRef  = useRef(null)

  useEffect(() => {
    loadChat(userId).then(h => {
      if (h.length > 0) setMsgs(h)
      else setMsgs([{ role:'ai', text:'Olá! Manda suas transações que eu registro na hora:\n\n📋 Cola o extrato bancário\n📷 Envia FOTO do extrato\n🎤 Fala as transações\n✍️ Escreve: "gastei 50 no posto, recebi 500 de PIX"\n\nRegistro tudo automaticamente no seu painel.' }])
      setHistLoad(false)
    })
  }, [userId])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [msgs, loading])

  const addMsg = async (role, text, image) => {
    setMsgs(prev => [...prev, { role, text, image }])
    await saveMsg(userId, role, text).catch(() => {})
  }

  /* Salva automaticamente e resume o que foi feito */
  const registrar = async (found) => {
    if (found.length === 0) {
      await addMsg('ai', 'Não consegui identificar nenhuma transação. Pode tentar de novo? Me diz o valor e o que foi, tipo "gastei 50 no mercado".')
      return
    }
    try {
      const saved = await insertTransactions(userId, found)
      setTxns(prev => [...prev, ...saved])

      const entradas = saved.filter(t => t.type === 'in')
      const saidas   = saved.filter(t => t.type === 'out')
      const totalIn  = entradas.reduce((s,t)=>s+t.amt,0)
      const totalOut = saidas.reduce((s,t)=>s+t.amt,0)

      let resumo = `✅ Registrei ${saved.length} ${saved.length===1?'transação':'transações'}:\n\n`
      saved.forEach(t => {
        const sinal = t.type==='in' ? '+' : '−'
        resumo += `${CAT_ICON(t.cat)} ${t.desc} — ${sinal}${fmt(t.amt)}  (${t.cat})\n`
      })
      resumo += `\n`
      if (totalIn > 0)  resumo += `💰 Entradas: ${fmt(totalIn)}\n`
      if (totalOut > 0) resumo += `💸 Saídas: ${fmt(totalOut)}\n`
      resumo += `\nJá está tudo no seu painel!`

      await addMsg('ai', resumo)
    } catch (e) {
      await addMsg('ai', `Ops, deu um erro ao salvar: ${e.message}. Tenta de novo?`)
    }
  }

  const process = async (textOverride) => {
    const txt = (textOverride || input).trim()
    if (!txt) return
    setInput('')
    await addMsg('user', txt)
    setLoading(true)
    try {
      const raw   = await callClaude(EXTRATO_SYSTEM, [{ role:'user', content:txt }], 1500)
      const clean = raw.replace(/```json|```/g,'').trim()
      await registrar(JSON.parse(clean).transactions || [])
    } catch (e) {
      await addMsg('ai', `Ops, deu um erro: ${e.message}. Tenta de novo?`)
    }
    setLoading(false)
  }

  /* ── FOTO DO EXTRATO (Claude Vision) ── */
  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 5*1024*1024) { await addMsg('ai','Imagem muito grande (máx 5 MB). Tira uma foto menor.'); return }
    setLoading(true)
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload  = () => res(r.result)
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const base64 = dataUrl.split(',')[1]
      await addMsg('user', '', dataUrl)
      const raw   = await callClaudeVision(EXTRATO_SYSTEM, base64, file.type, 'Extraia TODAS as transações desta imagem de extrato bancário. Responda apenas com o JSON.', 2000)
      const clean = raw.replace(/```json|```/g,'').trim()
      await registrar(JSON.parse(clean).transactions || [])
    } catch (err) {
      await addMsg('ai', `Não consegui ler a imagem: ${err.message}. Tenta uma foto mais nítida?`)
    }
    setLoading(false)
  }

  /* ── ÁUDIO (Web Speech API) ── */
  const toggleAudio = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { addMsg('ai','Seu navegador não suporta reconhecimento de voz. Usa o Chrome.'); return }
    if (recording) { recRef.current?.stop(); return }
    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setRecording(false)
      process(text)
    }
    rec.onerror = () => { setRecording(false); addMsg('ai','Não consegui ouvir. Tenta de novo num lugar mais silencioso.') }
    rec.onend   = () => setRecording(false)
    recRef.current = rec
    setRecording(true)
    rec.start()
  }

  const EXAMPLES = [
    { label: 'Extrato exemplo',  text: '14/08 PIX IFOOD*12345 R$ 47,80\n14/08 DEB POSTO IPIRANGA R$ 180,00\n10/08 CRED SALARIO EMPRESA LTDA R$ 8.500,00\n12/08 DEB SPOTIFY R$ 21,90' },
    { label: '+ Aluguel',        text: 'Paguei aluguel R$ 1.500 dia 5' },
    { label: '+ PIX recebido',   text: 'Recebi PIX R$ 500 de João hoje' },
  ]

  if (histLoad) return <Loader label="Carregando histórico..." />

  return (
    <div>
      <Note>Manda o extrato (texto, <strong>foto</strong> 📷 ou <strong>áudio</strong> 🎤) e eu registro tudo na hora, direto no seu painel. Sem burocracia.</Note>

      <div ref={chatRef} style={{ background:'var(--bg-raised)', borderRadius:12, padding:'1rem', minHeight:260, maxHeight:420, overflowY:'auto', marginBottom:12, display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m,i) => <Bubble key={i} msg={m} />)}
        {loading && <Loader label="Lendo e registrando..." />}
        {recording && (
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--red)', fontSize:13 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', animation:'pulse-dot 1s infinite' }} />
            Ouvindo... fala as transações e para quando terminar.
          </div>
        )}
      </div>

      <input type="file" ref={fileRef} accept="image/*" onChange={handleImage} style={{ display:'none' }} />

      <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
        <button onClick={()=>fileRef.current?.click()} title="Enviar foto do extrato"
          style={{ width:38, height:38, border:'1px solid var(--border-2)', borderRadius:8, background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--blue)', flexShrink:0 }}>
          <ImageIcon size={15} />
        </button>
        <button onClick={toggleAudio} title="Falar transações"
          style={{ width:38, height:38, border:'1px solid', borderColor: recording?'var(--red)':'var(--border-2)', borderRadius:8, background: recording?'var(--red-bg)':'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: recording?'var(--red)':'var(--blue)', flexShrink:0 }}>
          {recording ? <Square size={13} /> : <Mic size={15} />}
        </button>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();process()} }}
          placeholder="Cola o extrato ou descreve as transações..."
          style={{ flex:1, resize:'none', border:'1px solid var(--border-2)', borderRadius:8, padding:'9px 12px', fontSize:16, background:'var(--bg-input)', color:'var(--text-1)', fontFamily:'inherit', height:42 }} />
        <button onClick={()=>process()} disabled={loading}
          style={{ height:38, padding:'0 18px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:600, opacity:loading?.6:1, flexShrink:0 }}>
          Enviar
        </button>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
        {EXAMPLES.map(e=>(
          <button key={e.label} onClick={()=>process(e.text)}
            style={{ fontSize:11, padding:'5px 10px', border:'1px solid var(--border-2)', borderRadius:20, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit' }}>
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* Helper de ícone (evita import circular) */
function CAT_ICON(cat) {
  const map = { 'Renda':'💰','Renda Extra':'💵','Moradia':'🏠','Saúde':'❤️','Serviços':'📡','Assinaturas':'📱','Alimentação':'🛒','Delivery':'🍔','Gasolina':'⛽','Transporte':'🚌','Vestuário':'👗','Lazer':'🎉','Outros':'📦' }
  return map[cat] || '📦'
}

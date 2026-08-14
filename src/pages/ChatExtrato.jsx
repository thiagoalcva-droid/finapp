import { useState, useEffect, useRef } from 'react'
import { Mic, ImageIcon, Square } from 'lucide-react'
import { callClaude, callClaudeVision, EXTRATO_SYSTEM } from '../lib/claude'
import { insertTransactions, loadChat, saveMsg } from '../lib/api'
import { fmt, CatIcon, Bubble, Loader, Note } from '../components/shared'

export default function ChatExtrato({ userId, txns, setTxns }) {
  const [msgs, setMsgs]         = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [pending, setPending]   = useState([])
  const [histLoad, setHistLoad] = useState(true)
  const [recording, setRecording] = useState(false)
  const chatRef = useRef(null)
  const fileRef = useRef(null)
  const recRef  = useRef(null)

  useEffect(() => {
    loadChat(userId).then(h => {
      if (h.length > 0) setMsgs(h)
      else setMsgs([{ role:'ai', text:'Olá! Você pode:\n\n📋 Colar seu extrato bancário\n📷 Enviar FOTO do extrato (clique no ícone de imagem)\n🎤 Falar as transações (clique no microfone)\n✍️ Escrever livremente: "paguei aluguel 1500 ontem"\n\nEu identifico tudo, categorizo e confirmo antes de salvar.' }])
      setHistLoad(false)
    })
  }, [userId])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [msgs, loading, pending])

  const addMsg = async (role, text) => {
    setMsgs(prev => [...prev, { role, text }])
    await saveMsg(userId, role, text).catch(() => {})
  }

  const handleFound = async (found) => {
    if (found.length === 0) {
      await addMsg('ai','Não identifiquei transações. Tente de novo com mais detalhes.')
    } else {
      setPending(found.map(t => ({ ...t, id: crypto.randomUUID() })))
      await addMsg('ai', `Encontrei ${found.length} transação(ões). Revise e confirme abaixo.`)
    }
  }

  const process = async (textOverride) => {
    const txt = (textOverride || input).trim()
    if (!txt) return
    setInput('')
    await addMsg('user', txt)
    setLoading(true)
    try {
      const raw   = await callClaude(EXTRATO_SYSTEM, [{ role:'user', content:txt }], 1200)
      const clean = raw.replace(/```json|```/g,'').trim()
      await handleFound(JSON.parse(clean).transactions || [])
    } catch (e) {
      await addMsg('ai', `Erro: ${e.message}`)
    }
    setLoading(false)
  }

  /* ── FOTO DO EXTRATO (Claude Vision) ── */
  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 5*1024*1024) { await addMsg('ai','Imagem muito grande (máx 5 MB). Tire uma foto menor.'); return }
    await addMsg('user', `📷 Enviou foto: ${file.name}`)
    setLoading(true)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload  = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const raw   = await callClaudeVision(EXTRATO_SYSTEM, base64, file.type, 'Extraia TODAS as transações desta imagem de extrato bancário. Responda apenas com o JSON.', 1500)
      const clean = raw.replace(/```json|```/g,'').trim()
      await handleFound(JSON.parse(clean).transactions || [])
    } catch (err) {
      await addMsg('ai', `Erro ao ler a imagem: ${err.message}`)
    }
    setLoading(false)
  }

  /* ── ÁUDIO (Web Speech API) ── */
  const toggleAudio = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { addMsg('ai','Seu navegador não suporta reconhecimento de voz. Use o Chrome.'); return }
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
    rec.onerror = () => { setRecording(false); addMsg('ai','Não consegui ouvir. Tente de novo em um lugar mais silencioso.') }
    rec.onend   = () => setRecording(false)
    recRef.current = rec
    setRecording(true)
    rec.start()
  }

  const confirm = async () => {
    try {
      const saved = await insertTransactions(userId, pending)
      setTxns(prev => [...prev, ...saved])
      setPending([])
      await addMsg('ai', `✅ ${saved.length} transação(ões) salvas!`)
    } catch (e) { await addMsg('ai', `Erro ao salvar: ${e.message}`) }
  }

  const cancel = () => { setPending([]); addMsg('ai', 'Cancelado.') }

  const EXAMPLES = [
    { label: 'Extrato exemplo',  text: '14/08 PIX IFOOD*12345 R$ 47,80\n14/08 DEB POSTO IPIRANGA R$ 180,00\n10/08 CRED SALARIO EMPRESA LTDA R$ 8.500,00\n12/08 DEB SPOTIFY R$ 21,90' },
    { label: '+ Aluguel',        text: 'Paguei aluguel R$ 1.500 dia 5' },
    { label: '+ PIX recebido',   text: 'Recebi PIX R$ 500 de João hoje' },
  ]

  if (histLoad) return <Loader label="Carregando histórico..." />

  return (
    <div>
      <Note>Cole o extrato, envie uma <strong>foto</strong> 📷 ou <strong>fale</strong> 🎤 as transações. A IA identifica, categoriza e pede confirmação.</Note>

      <div ref={chatRef} style={{ background:'var(--bg-raised)', borderRadius:12, padding:'1rem', minHeight:260, maxHeight:400, overflowY:'auto', marginBottom:12, display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m,i) => <Bubble key={i} msg={m} />)}

        {pending.length > 0 && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-2)', borderRadius:10, padding:12, animation:'fadeIn .2s ease' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.04em' }}>
              {pending.length} transação(ões) identificadas
            </div>
            {pending.map((t,j) => (
              <div key={j} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom: j<pending.length-1 ? '1px solid var(--border)':undefined }}>
                <CatIcon cat={t.cat} size={26} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.desc}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)', marginTop:1 }}>{t.cat} · {t.nec ? 'Necessário':'Supérfluo'} · {t.fixed ? 'Fixo':'Variável'}</div>
                </div>
                <span style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color: t.type==='in' ? 'var(--green)':'var(--red)', flexShrink:0 }}>
                  {t.type==='in' ? '+':'-'}{fmt(t.amt)}
                </span>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={confirm} style={{ flex:1, height:38, background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                ✓ Confirmar e salvar
              </button>
              <button onClick={cancel} style={{ height:38, padding:'0 14px', background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:8, fontSize:13, cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading && <Loader label="Processando com IA..." />}
        {recording && (
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--red)', fontSize:13 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', animation:'pulse-dot 1s infinite' }} />
            Ouvindo... fale as transações e pare de falar quando terminar.
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
          placeholder="Cole o extrato ou descreva as transações..."
          style={{ flex:1, resize:'none', border:'1px solid var(--border-2)', borderRadius:8, padding:'9px 12px', fontSize:13, background:'var(--bg-input)', color:'var(--text-1)', fontFamily:'inherit', height:42 }} />
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

import { useState, useEffect, useRef } from 'react'
import { Mic, Paperclip, Square, Send } from 'lucide-react'
import { callClaude, callClaudeVision, callClaudeDoc, EXTRATO_SYSTEM } from '../lib/claude'
import { insertTransactions, insertEvent, loadChat, saveMsg, loadGoals, updateGoal } from '../lib/api'
import { fmt, Bubble, Loader } from '../components/shared'

export default function ChatExtrato({ userId, txns, setTxns }) {
  const [msgs, setMsgs]         = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [histLoad, setHistLoad] = useState(true)
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs]   = useState(0)
  const [pendingEvent, setPendingEvent] = useState(null)
  const chatRef = useRef(null)
  const fileRef = useRef(null)
  const recRef  = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    loadChat(userId).then(h => {
      if (h.length > 0) setMsgs(h)
      else setMsgs([{ role:'ai', text:'Olá! Eu sou seu assistente financeiro. 🪙\n\nManda pra mim:\n\n💸 Suas transações — texto, foto 📷, PDF 📄 ou áudio 🎤\n📅 Seus compromissos — "tenho consulta dia 20 às 14h"\n\nEu registro tudo na hora e te aviso dos compromissos!' }])
      setHistLoad(false)
    })
  }, [userId])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [msgs, loading, pendingEvent])

  const addMsg = async (role, text, image) => {
    setMsgs(prev => [...prev, { role, text, image }])
    await saveMsg(userId, role, text, image).catch(() => {})
  }

  /* Salva transacoes E compromissos automaticamente */
  const registrar = async (data) => {
    const found  = data.transactions || []
    const events = data.events || []
    const deposits = data.goal_deposits || []

    if (found.length === 0 && events.length === 0 && deposits.length === 0) {
      await addMsg('ai', 'Não consegui identificar nenhuma transação ou compromisso. Pode me dizer de novo? Ex: "gastei 50 no mercado" ou "tenho consulta dia 20 às 14h".')
      return
    }

    let resumo = ''

    // Depósitos em meta/sonho
    if (deposits.length > 0) {
      const goals = await loadGoals(userId).catch(()=>[])
      for (const dep of deposits) {
        const hint = (dep.goal_hint||'').toLowerCase()
        const goal = goals.find(g => g.name.toLowerCase().includes(hint) || hint.includes(g.name.toLowerCase())) || goals[0]
        if (goal) {
          const novo = Math.min(+goal.current_amount + dep.amt, +goal.target_amount)
          await updateGoal(goal.id, { current_amount:novo }).catch(()=>{})
          const saved = await insertTransactions(userId, [{ date:new Date().toISOString().slice(0,10), desc:`Guardado para: ${goal.name}`, amt:dep.amt, type:'out', cat:'Meta', nec:true, fixed:false }]).catch(()=>[])
          setTxns(prev => [...prev, ...saved])
          const p = Math.round((novo/+goal.target_amount)*100)
          resumo += `🎯 Guardei ${fmt(dep.amt)} na sua meta "${goal.name}"! Você já está com ${p}% do caminho. Bora! 💪\n`
        } else {
          resumo += `Você não tem uma meta criada ainda. Cria uma na aba Metas ou no Meu Sonho que aí eu registro seus aportes! 🌟\n`
        }
      }
    }

    if (found.length > 0) {
      try {
        const saved = await insertTransactions(userId, found)
        setTxns(prev => [...prev, ...saved])
        const totalIn  = saved.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)
        const totalOut = saved.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)
        resumo += `✅ Registrei ${saved.length} ${saved.length===1?'transação':'transações'}:\n\n`
        saved.forEach(t => {
          const sinal = t.type==='in' ? '+' : '−'
          resumo += `${CAT_ICON(t.cat)} ${t.desc} — ${sinal}${fmt(t.amt)}  (${t.cat})\n`
        })
        resumo += `\n`
        if (totalIn > 0)  resumo += `💰 Entradas: ${fmt(totalIn)}\n`
        if (totalOut > 0) resumo += `💸 Saídas: ${fmt(totalOut)}\n`
      } catch (e) {
        resumo += `Ops, erro ao salvar as transações: ${e.message}\n`
      }
    }

    if (events.length > 0) {
      // Guarda o compromisso pendente e mostra a caixinha bonita perguntando o aviso
      const ev = events[0]
      const d = new Date(ev.event_date)
      const quando = d.toLocaleDateString('pt-BR',{ day:'2-digit', month:'long' }) + ' às ' + d.toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' })
      resumo += `\n📅 Entendi seu compromisso: **${ev.title}** — ${quando}.`
      setPendingEvent(ev)
    }

    if (found.length > 0) resumo += `\nJá está tudo no seu painel!`
    await addMsg('ai', resumo.trim().replace(/\*\*/g,''))
  }

  /* Confirma o aviso escolhido na caixinha e salva o compromisso */
  const confirmarEvento = async (minutos) => {
    if (!pendingEvent) return
    const ev = pendingEvent
    setPendingEvent(null)
    try {
      await insertEvent(userId, { title:ev.title, description:'', event_date:ev.event_date, reminder_minutes:minutos })
      const aviso = minutos >= 1440 ? '1 dia antes' : '3 horas antes'
      await addMsg('ai', `✅ Pronto! Vou te avisar **${aviso}** do seu compromisso "${ev.title}". Pode confiar, não vou deixar você esquecer! 😉`.replace(/\*\*/g,''))
    } catch (e) {
      await addMsg('ai', `Ops, não consegui salvar o compromisso: ${e.message}`)
    }
  }

  const process = async (textOverride) => {
    const txt = (textOverride || input).trim()
    if (!txt) return
    setInput('')
    setPendingEvent(null)  // digitar outra msg fecha a caixinha
    await addMsg('user', txt)
    setLoading(true)
    try {
      const raw   = await callClaude(EXTRATO_SYSTEM, [{ role:'user', content:txt }], 1500)
      const clean = raw.replace(/```json|```/g,'').trim()
      await registrar(JSON.parse(clean))
    } catch (e) {
      await addMsg('ai', `Ops, deu um erro: ${e.message}. Tenta de novo?`)
    }
    setLoading(false)
  }

  /* ── ANEXO: FOTO ou PDF ── */
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 10*1024*1024) { await addMsg('ai','Arquivo muito grande (máx 10 MB). Envia um menor.'); return }
    setLoading(true)
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload  = () => res(r.result)
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const base64 = dataUrl.split(',')[1]
      const isPDF  = file.type === 'application/pdf'

      let raw
      if (isPDF) {
        await addMsg('user', `📄 ${file.name}`)
        raw = await callClaudeDoc(EXTRATO_SYSTEM, base64, 'Extraia TODAS as transações deste extrato bancário. Responda apenas com o JSON.', 3000)
      } else {
        await addMsg('user', '', dataUrl)
        raw = await callClaudeVision(EXTRATO_SYSTEM, base64, file.type, 'Extraia TODAS as transações desta imagem de extrato bancário. Responda apenas com o JSON.', 2000)
      }
      const clean = raw.replace(/```json|```/g,'').trim()
      await registrar(JSON.parse(clean))
    } catch (err) {
      await addMsg('ai', `Não consegui ler o arquivo: ${err.message}. Tenta uma foto ou PDF mais nítido?`)
    }
    setLoading(false)
  }

  /* ── ÁUDIO: grava áudio real (tocável) + transcreve + registra ── */
  const startAudio = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
      // Grava o áudio de verdade
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size>0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop())
        clearInterval(timerRef.current)
        const blob = new Blob(chunksRef.current, { type:'audio/webm' })
        const audioUrl = await new Promise(res => {
          const r = new FileReader(); r.onload = ()=>res(r.result); r.readAsDataURL(blob)
        })
        const texto = transcriptRef.current.trim()
        // mostra a bolha com o áudio tocável
        setMsgs(prev => [...prev, { role:'user', text:'', audio:audioUrl }])
        await saveMsg(userId, 'user', texto ? `🎤 ${texto}` : '🎤 (áudio)', null).catch(()=>{})
        // registra a transação a partir da transcrição
        if (texto) {
          setLoading(true)
          try {
            const raw = await callClaude(EXTRATO_SYSTEM, [{ role:'user', content:texto }], 1500)
            await registrar(JSON.parse(raw.replace(/```json|```/g,'').trim()))
          } catch(e) { await addMsg('ai', `Ops, não entendi o áudio: ${e.message}. Tenta de novo?`) }
          setLoading(false)
        } else {
          await addMsg('ai', 'Não consegui entender o que você falou. Pode repetir mais devagar?')
        }
      }
      mediaRef.current = mr
      mr.start()

      // Transcreve em paralelo
      transcriptRef.current = ''
      if (SR) {
        const rec = new SR()
        rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true
        rec.onresult = (e) => {
          let full = ''
          for (let i=0;i<e.results.length;i++) full += e.results[i][0].transcript
          transcriptRef.current = full
        }
        recRef.current = rec
        try { rec.start() } catch(_){}
      }

      // Timer visual
      setRecSecs(0)
      timerRef.current = setInterval(()=>setRecSecs(s=>s+1), 1000)
      setRecording(true)
    } catch(err) {
      addMsg('ai','Preciso da permissão do microfone pra gravar. Libera o acesso e tenta de novo. 🎤')
    }
  }

  const stopAudio = () => {
    setRecording(false)
    try { recRef.current?.stop() } catch(_){}
    try { mediaRef.current?.stop() } catch(_){}
  }

  const toggleAudio = () => { recording ? stopAudio() : startAudio() }
  const fmtSecs = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  if (histLoad) return <Loader label="Carregando conversa..." />

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, height:'100%' }}>
      {/* Mensagens — ocupa toda a tela */}
      <div ref={chatRef} style={{ flex:1, minHeight:0, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m,i) => <Bubble key={i} msg={m} />)}

        {pendingEvent && (
          <div style={{ alignSelf:'flex-start', maxWidth:'92%', background:'var(--bg-card)', border:'1px solid var(--blue-border)', borderRadius:14, padding:16, animation:'fadeIn .2s ease', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:18 }}>🔔</span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Como quer ser avisado?</span>
            </div>
            <div style={{ fontSize:12.5, color:'var(--text-2)', marginBottom:14, lineHeight:1.5 }}>
              Escolhe quando eu devo te lembrar do seu compromisso pra você não perder:
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={()=>confirmarEvento(180)} style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--blue-border)', background:'var(--blue-bg)', color:'var(--blue)', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
                ⏰ Me avisa <strong>3 horas antes</strong>
              </button>
              <button onClick={()=>confirmarEvento(1440)} style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--blue-border)', background:'var(--blue-bg)', color:'var(--blue)', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
                📅 Me avisa <strong>1 dia antes</strong>
              </button>
            </div>
          </div>
        )}
        {loading && <Loader label="Lendo e registrando..." />}
        {recording && (
          <div style={{ alignSelf:'flex-end', display:'flex', alignItems:'center', gap:10, background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:12, padding:'10px 16px' }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background:'var(--red)', animation:'pulse-dot 1s infinite' }} />
            <span style={{ fontSize:14, fontWeight:600, color:'var(--red)', fontFamily:"'JetBrains Mono',monospace" }}>{fmtSecs(recSecs)}</span>
            <span style={{ fontSize:12, color:'var(--text-2)' }}>gravando... toque no ■ pra enviar</span>
          </div>
        )}
      </div>

      {/* Barra de entrada — fixa embaixo */}
      <div style={{ flexShrink:0, borderTop:'1px solid var(--border)', background:'var(--bg-card)', padding:'10px 12px calc(10px + env(safe-area-inset-bottom))' }}>
        <input type="file" ref={fileRef} accept="image/*,application/pdf" onChange={handleFile} style={{ display:'none' }} />
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <button onClick={()=>fileRef.current?.click()} title="Anexar extrato (foto ou PDF)"
            style={{ width:40, height:40, border:'1px solid var(--border-2)', borderRadius:10, background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--blue)', flexShrink:0 }}>
            <Paperclip size={17} />
          </button>
          <button onClick={toggleAudio} title="Falar"
            style={{ width:40, height:40, border:'1px solid', borderColor: recording?'var(--red)':'var(--border-2)', borderRadius:10, background: recording?'var(--red-bg)':'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: recording?'var(--red)':'var(--blue)', flexShrink:0 }}>
            {recording ? <Square size={14} /> : <Mic size={17} />}
          </button>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();process()} }}
            placeholder="Transação ou compromisso..."
            rows={1}
            style={{ flex:1, resize:'none', border:'1px solid var(--border-2)', borderRadius:10, padding:'10px 12px', fontSize:16, background:'var(--bg-input)', color:'var(--text-1)', fontFamily:'inherit', maxHeight:100 }} />
          <button onClick={()=>process()} disabled={loading} aria-label="Enviar"
            style={{ width:40, height:40, background:'var(--blue)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:loading?.6:1, flexShrink:0 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CAT_ICON(cat) {
  const map = { 'Renda':'💰','Renda Extra':'💵','Moradia':'🏠','Saúde':'❤️','Saude':'❤️','Serviços':'📡','Servicos':'📡','Assinaturas':'📱','Alimentação':'🛒','Alimentacao':'🛒','Delivery':'🍔','Gasolina':'⛽','Transporte':'🚌','Vestuário':'👗','Vestuario':'👗','Lazer':'🎉','Transferências':'🔄','Transferencias':'🔄','Saque':'🏧','Contas':'🧾','Investimentos':'📈','Taxas':'🏦','Pet':'🐾','Educação':'🎓','Educacao':'🎓','Presentes':'🎁','Outros':'📦' }
  return map[cat] || '🔄'
}

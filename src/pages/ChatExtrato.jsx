import { useState, useEffect, useRef } from 'react'
import { Mic, ImageIcon } from 'lucide-react'
import { callClaude, EXTRATO_SYSTEM } from '../lib/claude'
import { insertTransactions, loadChat, saveMsg } from '../lib/api'
import { fmt, CAT, CatIcon, Bubble, Loader, Note } from '../components/shared'

export default function ChatExtrato({ userId, txns, setTxns }) {
  const [msgs, setMsgs]         = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [pending, setPending]   = useState([])
  const [histLoad, setHistLoad] = useState(true)
  const chatRef = useRef(null)

  useEffect(() => {
    loadChat(userId).then(h => {
      if (h.length > 0) setMsgs(h)
      else setMsgs([{ role:'ai', text:'Olá! Cole seu extrato bancário, descreva transações em texto ou use os exemplos abaixo.\n\nVou identificar cada lançamento, categorizar automaticamente e confirmar com você antes de salvar. 📊' }])
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

  const process = async (textOverride) => {
    const txt = (textOverride || input).trim()
    if (!txt) return
    setInput('')
    await addMsg('user', txt)
    setLoading(true)
    try {
      const raw   = await callClaude(EXTRATO_SYSTEM, [{ role:'user', content:txt }], 1000)
      const clean = raw.replace(/```json|```/g,'').trim()
      const found = JSON.parse(clean).transactions || []
      if (found.length === 0) {
        await addMsg('ai','Não identifiquei transações. Tente colar um extrato bancário ou descreva assim: "Paguei aluguel R$ 1.500 ontem".')
      } else {
        setPending(found.map(t => ({ ...t, id: crypto.randomUUID() })))
        await addMsg('ai', `Encontrei ${found.length} transação(ões). Revise e confirme abaixo para salvar no sistema.`)
      }
    } catch (e) {
      await addMsg('ai', `Erro: ${e.message}. Verifique sua conexão e tente novamente.`)
    }
    setLoading(false)
  }

  const confirm = async () => {
    try {
      const saved = await insertTransactions(userId, pending)
      setTxns(prev => [...prev, ...saved])
      setPending([])
      await addMsg('ai', `✅ ${saved.length} transação(ões) salvas com sucesso!`)
    } catch (e) { await addMsg('ai', `Erro ao salvar: ${e.message}`) }
  }

  const cancel = () => { setPending([]); addMsg('ai', 'Cancelado. Pode enviar um novo extrato.') }

  const EXAMPLES = [
    { label: 'Extrato banco',  text: '14/05 PIX IFOOD*12345 R$ 47,80\n14/05 DEB POSTO IPIRANGA R$ 180,00\n10/05 CRED SALARIO EMPRESA LTDA R$ 8.500,00\n12/05 DEB SPOTIFY R$ 21,90\n08/05 DEB SUPERMERCADO ATACADAO R$ 320,00' },
    { label: '+ Aluguel',      text: 'Paguei aluguel R$ 1.500 dia 5' },
    { label: '+ PIX recebido', text: 'Recebi PIX R$ 500 de João hoje' },
    { label: '+ Cartão',       text: 'Comprei no cartão Renner R$ 220 hoje' },
  ]

  if (histLoad) return <Loader label="Carregando histórico..." />

  return (
    <div>
      <Note>Cole o extrato bancário, descreva em texto livre ou use os exemplos. A IA identifica, categoriza e pede confirmação antes de salvar.</Note>

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
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
        <button style={{ width:36, height:36, border:'1px solid var(--border-2)', borderRadius:8, background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', flexShrink:0 }}>
          <ImageIcon size={14} />
        </button>
        <button style={{ width:36, height:36, border:'1px solid var(--border-2)', borderRadius:8, background:'var(--bg-raised)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', flexShrink:0 }}>
          <Mic size={14} />
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

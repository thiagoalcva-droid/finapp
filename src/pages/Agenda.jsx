import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Bell, BellOff, Calendar } from 'lucide-react'
import { callClaude, AGENDA_SYSTEM } from '../lib/claude'
import { loadAgenda, insertEvent, deleteEvent } from '../lib/api'
import { requestPermission, scheduleEventReminder, notify } from '../lib/notifications'
import { Bubble, Loader, Card, CardTitle, Note } from '../components/shared'

const MINUTES = [10,15,20,30,45,60,120]
const fmtDt   = d => new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
const isFuture= d => new Date(d) > new Date()

export default function Agenda({ userId }) {
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [perm, setPerm]         = useState(Notification.permission)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ title:'', description:'', event_date:'', reminder_minutes:30 })
  const [saving, setSaving]     = useState(false)
  const [chatMsgs, setChatMsgs] = useState([{ role:'ai', text:'Pode me dizer o compromisso e eu crio para você. Ex: "Reunião com banco na quinta-feira às 14h, me lembre 30 minutos antes"' }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoad] = useState(false)
  const chatRef = useRef(null)
  const timers  = useRef([])

  useEffect(() => {
    loadAgenda(userId).then(d=>{ setEvents(d); setLoading(false) })
    return () => timers.current.forEach(clearTimeout)
  },[userId])

  useEffect(() => {
    events.filter(e=>isFuture(e.event_date)&&!e.notified).forEach(e=>{
      const t = scheduleEventReminder(e)
      if(t) timers.current.push(t)
    })
  },[events])

  useEffect(() => { if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[chatMsgs])

  const askPerm = async () => {
    const ok = await requestPermission()
    setPerm(ok ? 'granted':'denied')
    if(ok) notify('Casado Investing — Notificações ativadas!','Você receberá alertas de compromissos e despesas.')
  }

  const save = async (e) => {
    e.preventDefault()
    if(!form.title||!form.event_date) return
    setSaving(true)
    try {
      const ev = await insertEvent(userId,{ ...form, reminder_minutes:+form.reminder_minutes })
      setEvents(prev=>[...prev,ev].sort((a,b)=>new Date(a.event_date)-new Date(b.event_date)))
      setShowForm(false); setForm({ title:'', description:'', event_date:'', reminder_minutes:30 })
    } catch(err) { alert('Erro: '+err.message) }
    setSaving(false)
  }

  const remove = async (id) => {
    await deleteEvent(id).catch(()=>{})
    setEvents(prev=>prev.filter(e=>e.id!==id))
  }

  const sendChat = async () => {
    const txt = chatInput.trim(); if(!txt) return
    setChatInput('')
    setChatMsgs(prev=>[...prev,{role:'user',text:txt}])
    setChatLoad(true)
    try {
      const raw   = await callClaude(AGENDA_SYSTEM,[{role:'user',content:txt}],400)
      const clean = raw.replace(/```json|```/g,'').trim()
      const found = JSON.parse(clean).events||[]
      if(found.length===0) {
        setChatMsgs(prev=>[...prev,{role:'ai',text:'Não entendi o compromisso. Tente: "Reunião às 15h amanhã, me lembre 20 minutos antes".'}])
      } else {
        for(const ev of found) {
          const saved = await insertEvent(userId,{ ...ev, reminder_minutes:ev.reminder_minutes||30 })
          setEvents(prev=>[...prev,saved].sort((a,b)=>new Date(a.event_date)-new Date(b.event_date)))
        }
        const names = found.map(e=>`"${e.title}"`).join(', ')
        setChatMsgs(prev=>[...prev,{role:'ai',text:`✅ Compromisso ${names} adicionado! Você será lembrado ${found[0].reminder_minutes||30} minutos antes.`}])
      }
    } catch {
      setChatMsgs(prev=>[...prev,{role:'ai',text:'Erro ao processar. Tente novamente.'}])
    }
    setChatLoad(false)
  }

  const upcoming = events.filter(e=>isFuture(e.event_date))
  const past     = events.filter(e=>!isFuture(e.event_date))

  const inp = { width:'100%', height:40, padding:'0 12px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:13, marginBottom:10 }

  return (
    <div>
      {perm !== 'granted' && (
        <div style={{ background:'var(--amber-bg)', border:'1px solid var(--amber-border)', borderRadius:10, padding:'12px 16px', marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--amber)' }}>⚠️ Ativar notificações</div>
            <div style={{ fontSize:12, color:'var(--text-2)', marginTop:3 }}>Para receber alertas de compromissos e despesas, ative as notificações.</div>
          </div>
          <button onClick={askPerm} style={{ height:36, padding:'0 16px', background:'var(--amber)', color:'#000', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
            Ativar agora
          </button>
        </div>
      )}
      {perm === 'granted' && (
        <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:10, padding:'10px 14px', marginBottom:'1rem', display:'flex', alignItems:'center', gap:8 }}>
          <Bell size={14} color="var(--green)" />
          <span style={{ fontSize:12, color:'var(--green)', fontWeight:500 }}>Notificações ativas — você será alertado no horário certo.</span>
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <Card style={{ flex:1, minWidth:280, marginBottom:0 }}>
          <CardTitle><Calendar size={13} /> Adicionar pelo chat</CardTitle>
          <div ref={chatRef} style={{ background:'var(--bg-raised)', borderRadius:8, padding:'10px', minHeight:100, maxHeight:200, overflowY:'auto', marginBottom:10, display:'flex', flexDirection:'column', gap:8 }}>
            {chatMsgs.map((m,i)=><Bubble key={i} msg={m} />)}
            {chatLoading && <Loader label="Processando..." />}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') sendChat() }}
              placeholder="Descreva o compromisso..."
              style={{ ...inp, marginBottom:0, flex:1, height:36 }} />
            <button onClick={sendChat} style={{ height:36, padding:'0 14px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:600 }}>↗</button>
          </div>
        </Card>

        <Card style={{ flex:1, minWidth:280, marginBottom:0 }}>
          <CardTitle><Plus size={13} /> Adicionar manualmente</CardTitle>
          {!showForm ? (
            <button onClick={()=>setShowForm(true)} style={{ width:'100%', height:40, background:'var(--bg-raised)', border:'1px dashed var(--border-2)', borderRadius:8, color:'var(--text-2)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              + Novo compromisso
            </button>
          ) : (
            <form onSubmit={save}>
              <input style={inp} type="text" placeholder="Título do compromisso" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required />
              <input style={inp} type="text" placeholder="Descrição (opcional)" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
              <input style={inp} type="datetime-local" value={form.event_date} onChange={e=>setForm(p=>({...p,event_date:e.target.value}))} required />
              <select style={{ ...inp, cursor:'pointer' }} value={form.reminder_minutes} onChange={e=>setForm(p=>({...p,reminder_minutes:e.target.value}))}>
                {MINUTES.map(m=><option key={m} value={m}>Alertar {m} minutos antes</option>)}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" disabled={saving} style={{ flex:1, height:38, background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {saving ? 'Salvando...':'Salvar'}
                </button>
                <button type="button" onClick={()=>setShowForm(false)} style={{ height:38, padding:'0 14px', background:'var(--bg-raised)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:8, fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {loading ? <Loader label="Carregando agenda..." /> : (
        <>
          {upcoming.length > 0 && (
            <Card>
              <CardTitle><Bell size={13} /> Próximos compromissos ({upcoming.length})</CardTitle>
              {upcoming.map(ev=>(
                <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'var(--blue-bg)', border:'1px solid var(--blue-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Bell size={16} color="var(--blue)" />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>{ev.description}</div>}
                    <div style={{ fontSize:11, color:'var(--blue)', marginTop:3 }}>📅 {fmtDt(ev.event_date)} · ⏰ Alerta {ev.reminder_minutes}min antes</div>
                  </div>
                  <button onClick={()=>remove(ev.id)} style={{ width:32, height:32, border:'none', background:'var(--red-bg)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Trash2 size={13} color="var(--red)" />
                  </button>
                </div>
              ))}
            </Card>
          )}

          {upcoming.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:13 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
              Nenhum compromisso futuro. Adicione pelo chat ou pelo formulário acima.
            </div>
          )}

          {past.length > 0 && (
            <Card>
              <CardTitle>Compromissos passados</CardTitle>
              {past.slice(0,5).map(ev=>(
                <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)', opacity:.5 }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <BellOff size={14} color="var(--text-3)" />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:'var(--text-2)' }}>{ev.title}</div>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{fmtDt(ev.event_date)}</div>
                  </div>
                  <button onClick={()=>remove(ev.id)} style={{ width:28, height:28, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Trash2 size={12} color="var(--text-3)" />
                  </button>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

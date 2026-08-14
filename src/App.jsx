import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { loadTransactions } from './lib/api'
import { checkExpenseAlerts, requestPermission } from './lib/notifications'
import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import ChatExtrato   from './pages/ChatExtrato'
import Despesas      from './pages/Despesas'
import GastosAnalise from './pages/GastosAnalise'
import Agenda        from './pages/Agenda'
import Alertas       from './pages/Alertas'
import Conselhos     from './pages/Conselhos'

const TABS = [
  { id:'dashboard', icon:'📊', label:'Dashboard'       },
  { id:'chat',      icon:'💬', label:'Chat'            },
  { id:'despesas',  icon:'💳', label:'Despesas'        },
  { id:'gastos',    icon:'⚖️',  label:'Análise'         },
  { id:'agenda',    icon:'📅', label:'Agenda'          },
  { id:'alertas',   icon:'🔔', label:'Alertas'         },
  { id:'conselhos', icon:'💡', label:'Conselhos IA'    },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoad, setAuthLoad] = useState(true)
  const [tab, setTab]         = useState('dashboard')
  const [txns, setTxns]       = useState([])
  const [txnLoad, setTxnLoad] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => { setSession(session); setAuthLoad(false) })
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  },[])

  useEffect(() => {
    if(!session?.user) { setTxns([]); return }
    setTxnLoad(true)
    loadTransactions(session.user.id).then(d=>setTxns(d)).catch(console.error).finally(()=>setTxnLoad(false))
  },[session?.user?.id])

  if(authLoad) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:14 }}>💰</div>
        <div style={{ width:28, height:28, border:'2px solid var(--border-3)', borderTop:'2px solid var(--blue)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto' }} />
      </div>
    </div>
  )

  if(!session) return <Auth />

  const user = session.user
  const name = user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0]

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <header style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-card)', padding:'0 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:54 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>💰</div>
            <span style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', letterSpacing:'-0.3px' }}>FinApp</span>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'var(--blue-bg)', color:'var(--blue)', border:'1px solid var(--blue-border)', fontWeight:600 }}>✦ Claude AI</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--blue-bg)', border:'1px solid var(--blue-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--blue)' }}>
              {name[0].toUpperCase()}
            </div>
            <span style={{ fontSize:13, color:'var(--text-2)' }}>{name}</span>
            <button onClick={()=>supabase.auth.signOut()} style={{ fontSize:12, padding:'5px 12px', border:'1px solid var(--border-2)', borderRadius:8, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit' }}>
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-card)', padding:'0 20px', overflowX:'auto', flexShrink:0 }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', gap:0 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'11px 14px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1, fontWeight: tab===t.id ? 600:400, color: tab===t.id ? 'var(--text-1)':'var(--text-3)', borderBottom: tab===t.id ? '2px solid var(--blue)':'2px solid transparent', transition:'color .12s, border-color .12s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ flex:1, maxWidth:960, margin:'0 auto', width:'100%', padding:'1.5rem 20px 4rem' }}>
        {txnLoad ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'2rem 0', color:'var(--text-3)', fontSize:13 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-3)', animation:'pulse-dot 1.2s infinite' }} />
            Carregando...
          </div>
        ) : (
          <>
            {tab==='dashboard' && <Dashboard txns={txns} />}
            {tab==='chat'      && <ChatExtrato userId={user.id} txns={txns} setTxns={setTxns} />}
            {tab==='despesas'  && <Despesas txns={txns} />}
            {tab==='gastos'    && <GastosAnalise txns={txns} setTxns={setTxns} />}
            {tab==='agenda'    && <Agenda userId={user.id} />}
            {tab==='alertas'   && <Alertas userId={user.id} />}
            {tab==='conselhos' && <Conselhos txns={txns} />}
          </>
        )}
      </main>
    </div>
  )
}

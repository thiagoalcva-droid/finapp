import { useState, useEffect, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { loadTransactions } from './lib/api'
import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import ChatExtrato   from './pages/ChatExtrato'
import Despesas      from './pages/Despesas'
import GastosAnalise from './pages/GastosAnalise'
import Metas         from './pages/Metas'
import Investir      from './pages/Investir'
import Agenda        from './pages/Agenda'
import Alertas       from './pages/Alertas'
import Conselhos     from './pages/Conselhos'

const TABS = [
  { id:'dashboard', icon:'📊', label:'Dashboard'    },
  { id:'chat',      icon:'💬', label:'Chat'         },
  { id:'despesas',  icon:'💳', label:'Despesas'     },
  { id:'gastos',    icon:'⚖️',  label:'Análise'      },
  { id:'metas',     icon:'🎯', label:'Metas'        },
  { id:'investir',  icon:'👑', label:'Investir'     },
  { id:'agenda',    icon:'📅', label:'Agenda'       },
  { id:'alertas',   icon:'🔔', label:'Alertas'      },
  { id:'conselhos', icon:'💡', label:'Conselhos IA' },
]

const MONTH_LABELS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function App() {
  const [session, setSession]   = useState(null)
  const [authLoad, setAuthLoad] = useState(true)
  const [tab, setTab]           = useState('dashboard')
  const [txns, setTxns]         = useState([])
  const [txnLoad, setTxnLoad]   = useState(false)
  const [month, setMonth]       = useState('todos')

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

  /* Meses disponiveis nas transacoes */
  const availableMonths = useMemo(() => {
    const set = new Set(txns.map(t=>t.date?.slice(0,7)).filter(Boolean))
    return [...set].sort().reverse()
  },[txns])

  /* Transacoes filtradas pelo mes selecionado */
  const filteredTxns = useMemo(() => {
    if(month==='todos') return txns
    return txns.filter(t=>t.date?.startsWith(month))
  },[txns, month])

  if(authLoad) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:14 }}>🪙</div>
        <div style={{ width:28, height:28, border:'2px solid var(--border-3)', borderTop:'2px solid #d4af37', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto' }} />
      </div>
    </div>
  )

  if(!session) return <Auth />

  const user = session.user
  const name = user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0]

  /* Abas que respeitam o filtro de mes */
  const monthAware = ['dashboard','despesas','gastos','conselhos'].includes(tab)

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <header style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-card)', padding:'env(safe-area-inset-top) 20px 0', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:54 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/icon-192.png" alt="" style={{ width:30, height:30, borderRadius:8 }} />
            <span style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', letterSpacing:'-0.3px' }}>Casado Investing</span>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'rgba(212,175,55,.12)', color:'#d4af37', border:'1px solid rgba(212,175,55,.3)', fontWeight:600 }}>✦ IA</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(212,175,55,.12)', border:'1px solid rgba(212,175,55,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#d4af37' }}>
              {name[0].toUpperCase()}
            </div>
            <span style={{ fontSize:13, color:'var(--text-2)' }}>{name}</span>
            <button onClick={()=>supabase.auth.signOut()} style={{ fontSize:12, padding:'5px 12px', border:'1px solid var(--border-2)', borderRadius:8, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit' }}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <div style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-card)', padding:'0 20px', overflowX:'auto', flexShrink:0 }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', gap:0 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'11px 12px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1, fontWeight: tab===t.id ? 600:400, color: tab===t.id ? 'var(--text-1)':'var(--text-3)', borderBottom: tab===t.id ? '2px solid var(--blue)':'2px solid transparent', transition:'color .12s, border-color .12s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {monthAware && availableMonths.length > 0 && (
        <div style={{ background:'var(--bg)', padding:'12px 20px 0' }}>
          <div style={{ maxWidth:960, margin:'0 auto', display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
            <button onClick={()=>setMonth('todos')} style={{ fontSize:11, padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap', background: month==='todos'?'var(--blue)':'var(--bg-raised)', color: month==='todos'?'#fff':'var(--text-2)' }}>
              Todos
            </button>
            {availableMonths.map(m=>(
              <button key={m} onClick={()=>setMonth(m)} style={{ fontSize:11, padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap', background: month===m?'var(--blue)':'var(--bg-raised)', color: month===m?'#fff':'var(--text-2)' }}>
                {MONTH_LABELS[+m.slice(5,7)-1]} {m.slice(0,4)}
              </button>
            ))}
          </div>
        </div>
      )}

      <main style={{ flex:1, maxWidth:960, margin:'0 auto', width:'100%', padding:'1.5rem 20px 4rem' }}>
        {txnLoad ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'2rem 0', color:'var(--text-3)', fontSize:13 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-3)', animation:'pulse-dot 1.2s infinite' }} />
            Carregando...
          </div>
        ) : (
          <>
            {tab==='dashboard' && <Dashboard txns={filteredTxns} allTxns={txns} />}
            {tab==='chat'      && <ChatExtrato userId={user.id} txns={txns} setTxns={setTxns} />}
            {tab==='despesas'  && <Despesas txns={filteredTxns} setTxns={setTxns} />}
            {tab==='gastos'    && <GastosAnalise txns={filteredTxns} setTxns={setTxns} />}
            {tab==='metas'     && <Metas userId={user.id} txns={txns} />}
            {tab==='investir'  && <Investir userId={user.id} txns={txns} />}
            {tab==='agenda'    && <Agenda userId={user.id} />}
            {tab==='alertas'   && <Alertas userId={user.id} />}
            {tab==='conselhos' && <Conselhos txns={filteredTxns} />}
          </>
        )}
      </main>
    </div>
  )
}

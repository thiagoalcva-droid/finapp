import { useState, useEffect, useMemo } from 'react'
import { MessageCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import { loadTransactions, clearAllTransactions } from './lib/api'
import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import ChatExtrato   from './pages/ChatExtrato'
import Entradas      from './pages/Entradas'
import Despesas      from './pages/Despesas'
import GastosAnalise from './pages/GastosAnalise'
import Metas         from './pages/Metas'
import Investir      from './pages/Investir'
import Sonho         from './pages/Sonho'
import Alertas       from './pages/Alertas'
import Conselhos     from './pages/Conselhos'

/* Menu organizado por grupos. Chat e Agenda ficam FORA do menu:
   - Chat = botao flutuante (FAB)
   - Agenda = 100% pelo chat */
const MENU = [
  { group: null, items: [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
  ]},
  { group: 'TRANSAÇÕES', items: [
    { id:'entradas',  icon:'💚', label:'Entradas' },
    { id:'despesas',  icon:'💳', label:'Despesas' },
    { id:'gastos',    icon:'🔍', label:'Para onde vai meu dinheiro' },
  ]},
  { group: 'MEU FUTURO', items: [
    { id:'investir',  icon:'👑', label:'Ficar milionário' },
    { id:'sonho',     icon:'🌟', label:'Meu sonho' },
    { id:'metas',     icon:'🎯', label:'Metas' },
  ]},
  { group: null, items: [
    { id:'alertas',   icon:'🔔', label:'Contas e Assinaturas' },
    { id:'conselhos', icon:'💡', label:'Conselhos IA' },
  ]},
]
const ALL_TABS = MENU.flatMap(g => g.items)
const tabLabel = (id) => id==='chat' ? 'Chat' : (ALL_TABS.find(t=>t.id===id)?.label || '')

const MONTH_LABELS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function App() {
  const [session, setSession]   = useState(null)
  const [authLoad, setAuthLoad] = useState(true)
  const [tab, setTab]           = useState('dashboard')
  const [txns, setTxns]         = useState([])
  const [txnLoad, setTxnLoad]   = useState(false)
  const [month, setMonth]       = useState('todos')
  const [menuOpen, setMenuOpen] = useState(false)

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

  const availableMonths = useMemo(() => {
    const set = new Set(txns.map(t=>t.date?.slice(0,7)).filter(Boolean))
    return [...set].sort().reverse()
  },[txns])

  const filteredTxns = useMemo(() => {
    if(month==='todos') return txns
    return txns.filter(t=>t.date?.startsWith(month))
  },[txns, month])

  const clearAll = async () => {
    if(!window.confirm('⚠️ Isso vai APAGAR TODAS as suas transações (entradas e saídas) permanentemente. Tem certeza?')) return
    if(!window.confirm('Última confirmação: apagar tudo mesmo? Esta ação não pode ser desfeita.')) return
    try {
      await clearAllTransactions(session.user.id)
      setTxns([])
      alert('Todas as transações foram apagadas.')
    } catch(e){ alert('Erro ao apagar: '+e.message) }
  }

  if(authLoad) return (
    <div style={{ height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <img src="/icon-192.png" alt="" style={{ width:56, height:56, borderRadius:14, marginBottom:14 }} />
        <div style={{ width:28, height:28, border:'2px solid var(--border-3)', borderTop:'2px solid #d4af37', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto' }} />
      </div>
    </div>
  )

  if(!session) return <Auth />

  const user = session.user
  const name = user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0]
  const monthAware = ['dashboard','entradas','despesas','gastos','conselhos'].includes(tab)
  const isChat = tab === 'chat'

  return (
    <div style={{ height:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── CABEÇALHO ESTÁTICO (nunca rola) ── */}
      <header style={{ flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg-card)', padding:'env(safe-area-inset-top) 16px 0' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:54 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={()=>setMenuOpen(true)} aria-label="Menu" style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', flexDirection:'column', justifyContent:'center', gap:4, padding:8, flexShrink:0 }}>
              <span style={{ width:20, height:2, background:'var(--text-1)', borderRadius:2 }} />
              <span style={{ width:20, height:2, background:'var(--text-1)', borderRadius:2 }} />
              <span style={{ width:20, height:2, background:'var(--text-1)', borderRadius:2 }} />
            </button>
            <img src="/icon-192.png" alt="" style={{ width:28, height:28, borderRadius:8 }} />
            <span style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', letterSpacing:'-0.3px' }}>Casado Investing</span>
          </div>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(212,175,55,.12)', border:'1px solid rgba(212,175,55,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#d4af37', flexShrink:0 }}>
            {name[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── MENU LATERAL ── */}
      {menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, animation:'fadeIn .15s ease' }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:0, left:0, bottom:0, width:'82%', maxWidth:300, background:'var(--bg-card)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', paddingTop:'env(safe-area-inset-top)', animation:'slideIn .2s ease' }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <img src="/icon-192.png" alt="" style={{ width:40, height:40, borderRadius:10 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>Casado Investing</div>
                <div style={{ fontSize:12, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Olá, {name}!</div>
              </div>
              <button onClick={()=>setMenuOpen(false)} aria-label="Fechar" style={{ width:30, height:30, border:'none', background:'var(--bg-raised)', borderRadius:8, cursor:'pointer', color:'var(--text-2)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
              {MENU.map((g,gi)=>(
                <div key={gi} style={{ marginBottom:4 }}>
                  {g.group && (
                    <div style={{ padding:'12px 20px 6px', fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'var(--text-3)', textTransform:'uppercase' }}>{g.group}</div>
                  )}
                  {g.items.map(t=>(
                    <button key={t.id} onClick={()=>{ setTab(t.id); setMenuOpen(false) }} style={{ width:'100%', textAlign:'left', padding:'12px 20px', border:'none', cursor:'pointer', fontSize:14, fontFamily:'inherit', display:'flex', alignItems:'center', gap:12, background: tab===t.id ? 'var(--blue-bg)':'transparent', color: tab===t.id ? 'var(--blue)':'var(--text-1)', fontWeight: tab===t.id ? 600:400, borderLeft: tab===t.id ? '3px solid var(--blue)':'3px solid transparent' }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{t.icon}</span>
                      <span style={{ lineHeight:1.3 }}>{t.label}</span>
                    </button>
                  ))}
                  {gi < MENU.length-1 && <div style={{ height:1, background:'var(--border)', margin:'8px 20px 4px' }} />}
                </div>
              ))}
            </nav>

            <div style={{ padding:'12px 20px calc(12px + env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)' }}>
              <button onClick={()=>supabase.auth.signOut()} style={{ width:'100%', height:42, border:'1px solid var(--border-2)', borderRadius:10, cursor:'pointer', background:'none', color:'var(--text-2)', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTRO DE MÊS (estático, não rola) ── */}
      {monthAware && availableMonths.length > 0 && (
        <div style={{ flexShrink:0, background:'var(--bg)', padding:'10px 16px 0' }}>
          <div style={{ maxWidth:960, margin:'0 auto', display:'flex', gap:6, overflowX:'auto', overflowY:'hidden', paddingBottom:6 }}>
            <button onClick={()=>setMonth('todos')} style={{ fontSize:11, padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap', flexShrink:0, background: month==='todos'?'var(--blue)':'var(--bg-raised)', color: month==='todos'?'#131B2E':'var(--text-2)' }}>
              Todos
            </button>
            {availableMonths.map(m=>(
              <button key={m} onClick={()=>setMonth(m)} style={{ fontSize:11, padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap', flexShrink:0, background: month===m?'var(--blue)':'var(--bg-raised)', color: month===m?'#131B2E':'var(--text-2)' }}>
                {MONTH_LABELS[+m.slice(5,7)-1]} {m.slice(0,4)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CORPO (só isto rola) ── */}
      <main style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column' }}>
        <div style={{ maxWidth:960, margin:'0 auto', width:'100%', flex:1, display:'flex', flexDirection:'column', padding: isChat ? '0' : '1.25rem max(16px, env(safe-area-inset-left)) calc(5rem + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-right))' }}>
          {txnLoad ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'2rem 16px', color:'var(--text-3)', fontSize:13 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-3)', animation:'pulse-dot 1.2s infinite' }} />
              Carregando...
            </div>
          ) : (
            <>
              {tab==='dashboard' && <Dashboard txns={filteredTxns} allTxns={txns} />}
              {tab==='chat'      && <ChatExtrato userId={user.id} txns={txns} setTxns={setTxns} />}
              {tab==='entradas'  && <Entradas txns={filteredTxns} setTxns={setTxns} onClearAll={clearAll} />}
              {tab==='despesas'  && <Despesas txns={filteredTxns} setTxns={setTxns} onClearAll={clearAll} />}
              {tab==='gastos'    && <GastosAnalise txns={filteredTxns} setTxns={setTxns} />}
              {tab==='metas'     && <Metas userId={user.id} txns={txns} />}
              {tab==='investir'  && <Investir userId={user.id} txns={txns} />}
              {tab==='sonho'     && <Sonho userId={user.id} />}
              {tab==='alertas'   && <Alertas userId={user.id} />}
              {tab==='conselhos' && <Conselhos txns={filteredTxns} />}
            </>
          )}
        </div>
      </main>

      {/* ── BOTÃO FLUTUANTE DO CHAT (some só dentro do chat) ── */}
      {!isChat && (
        <button onClick={()=>setTab('chat')} aria-label="Abrir chat"
          style={{ position:'fixed', right:18, bottom:'calc(20px + env(safe-area-inset-bottom))', width:58, height:58, borderRadius:'50%', border:'none', background:'var(--blue)', color:'#131B2E', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(212,176,74,.45)', zIndex:150 }}>
          <MessageCircle size={26} />
        </button>
      )}
    </div>
  )
}

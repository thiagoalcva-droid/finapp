export const CAT = {
  'Renda':       { icon: '💰', color: '#34D399', bg: 'rgba(52,211,153,.12)'  },
  'Renda Extra': { icon: '💵', color: '#34D399', bg: 'rgba(52,211,153,.12)'  },
  'Moradia':     { icon: '🏠', color: '#60A5FA', bg: 'rgba(96,165,250,.12)'  },
  'Saúde':       { icon: '❤️',  color: '#F87171', bg: 'rgba(248,113,113,.12)' },
  'Serviços':    { icon: '📡', color: '#A78BFA', bg: 'rgba(167,139,250,.12)' },
  'Assinaturas': { icon: '📱', color: '#818CF8', bg: 'rgba(129,140,248,.12)' },
  'Alimentação': { icon: '🛒', color: '#34D399', bg: 'rgba(52,211,153,.12)'  },
  'Delivery':    { icon: '🍔', color: '#FB923C', bg: 'rgba(251,146,60,.12)'  },
  'Gasolina':    { icon: '⛽', color: '#FBBF24', bg: 'rgba(251,191,36,.12)'  },
  'Transporte':  { icon: '🚌', color: '#FBBF24', bg: 'rgba(251,191,36,.12)'  },
  'Vestuário':   { icon: '👗', color: '#A78BFA', bg: 'rgba(167,139,250,.12)' },
  'Lazer':       { icon: '🎉', color: '#60A5FA', bg: 'rgba(96,165,250,.12)'  },
  'Outros':      { icon: '📦', color: '#6B7280', bg: 'rgba(107,114,128,.12)' },
}

export const fmt  = n => Number(n).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
export const pct  = (a,b) => b === 0 ? 0 : Math.round((a/b)*100)
export const uid  = () => crypto.randomUUID ? crypto.randomUUID() : Date.now()+Math.random()

/* ── Btn ────────────────────────────────────────────────────── */
export function Btn({ children, onClick, variant='primary', size='md', disabled, style={} }) {
  const base = {
    border: 'none', borderRadius: 8, fontFamily: 'inherit',
    fontWeight: 500, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: 6, transition: 'all .15s',
    opacity: disabled ? 0.5 : 1, ...style,
  }
  const sizes = { sm: { fontSize: 12, padding: '5px 12px' }, md: { fontSize: 13, padding: '9px 18px' }, lg: { fontSize: 14, padding: '12px 24px' } }
  const variants = {
    primary:   { background: 'var(--blue)',     color: '#fff'          },
    secondary: { background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border-2)' },
    danger:    { background: 'var(--red-bg)',    color: 'var(--red)',    border: '1px solid var(--red-border)' },
    ghost:     { background: 'transparent',      color: 'var(--text-2)', border: '1px solid var(--border-2)' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant] }}>{children}</button>
}

/* ── CatIcon ────────────────────────────────────────────────── */
export function CatIcon({ cat, size=32 }) {
  const cfg = CAT[cat] || CAT['Outros']
  return <div style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, background: cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize: size*.42 }}>{cfg.icon}</div>
}

/* ── Toggle ─────────────────────────────────────────────────── */
export function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ width:34, height:19, borderRadius:10, border:'none', cursor:'pointer', background: on ? 'var(--green)':'var(--red)', position:'relative', flexShrink:0, transition:'background .2s' }}>
      <span style={{ position:'absolute', top:2.5, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left .2s', left: on ? 17:3 }} />
    </button>
  )
}

/* ── Badge ──────────────────────────────────────────────────── */
export function Badge({ label, color='blue' }) {
  const colors = {
    green:  { bg: 'var(--green-bg)',  text: 'var(--green)',  border: 'var(--green-border)'  },
    red:    { bg: 'var(--red-bg)',    text: 'var(--red)',    border: 'var(--red-border)'    },
    blue:   { bg: 'var(--blue-bg)',   text: 'var(--blue)',   border: 'var(--blue-border)'   },
    amber:  { bg: 'var(--amber-bg)',  text: 'var(--amber)',  border: 'var(--amber-border)'  },
    purple: { bg: 'var(--purple-bg)', text: 'var(--purple)', border: 'rgba(167,139,250,.25)' },
  }
  const c = colors[color] || colors.blue
  return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:500, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{label}</span>
}

/* ── Loader ─────────────────────────────────────────────────── */
export function Loader({ label='Carregando...' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 0' }}>
      {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-3)', animation:`pulse-dot 1.2s ${i*.2}s infinite` }} />)}
      <span style={{ fontSize:12, color:'var(--text-3)' }}>{label}</span>
    </div>
  )
}

/* ── Bubble ─────────────────────────────────────────────────── */
export function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ?'flex-end':'flex-start', gap:3, animation:'fadeIn .2s ease' }}>
      <span style={{ fontSize:11, color:'var(--text-3)', padding:'0 4px' }}>{isUser ? 'Você':'Casado IA'}</span>
      {msg.image && (
        <img src={msg.image} alt="Extrato enviado" style={{ maxWidth:'70%', borderRadius:12, border:'1px solid var(--border-2)', marginBottom: msg.text ? 4:0 }} />
      )}
      {msg.text && (
        <div style={{ padding:'10px 14px', borderRadius:12, fontSize:13, lineHeight:1.6, maxWidth:'88%', background: isUser ? 'var(--blue-dark)':'var(--bg-raised)', border: isUser ? 'none':'1px solid var(--border-2)', color:'var(--text-1)' }}>
          {msg.text.split('\n').map((l,i) => <span key={i} style={{ display:'block' }}>{l||'\u00a0'}</span>)}
        </div>
      )}
    </div>
  )
}

/* ── Card ───────────────────────────────────────────────────── */
export const Card = ({ children, style={} }) => (
  <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:var_radius_lg, padding:'1.25rem', marginBottom:'1rem', ...style }}>
    {children}
  </div>
)

const var_radius_lg = 14

/* ── CardTitle ──────────────────────────────────────────────── */
export const CardTitle = ({ children }) => (
  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:'1rem', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'.04em' }}>
    {children}
  </div>
)

/* ── MetricCard ─────────────────────────────────────────────── */
export function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:'var(--bg-raised)', borderRadius:10, padding:'14px 16px', borderLeft: accent ? `3px solid ${accent}`:undefined }}>
      <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-2)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

/* ── Note ───────────────────────────────────────────────────── */
export const Note = ({ children }) => (
  <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:'1rem', padding:'9px 12px', background:'var(--bg-raised)', borderRadius:8, borderLeft:'2px solid var(--border-3)' }}>
    {children}
  </div>
)

/* ── TxnRow ─────────────────────────────────────────────────── */
export function TxnRow({ t }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <CatIcon cat={t.cat} size={32} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.desc}</div>
        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{t.cat} · {t.date?.slice(5)?.replace('-','/')}</div>
      </div>
      <span style={{ fontSize:13, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color: t.type==='in' ? 'var(--green)':'var(--red)' }}>
        {t.type==='in' ? '+':'-'}{fmt(t.amt)}
      </span>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Edit3, Trash2, Download, X } from 'lucide-react'
import { updateTransaction, deleteTransaction } from '../lib/api'
import { fmt, pct, CAT, CatIcon, Badge, Card, CardTitle } from '../components/shared'

const CATS = Object.keys(CAT)

export default function Despesas({ txns, setTxns, onClearAll }) {
  const [filter, setFilter]   = useState('todos')
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({})

  const totalOut = txns.filter(t=>t.type==='out').reduce((s,t)=>s+t.amt,0)

  const byCat = useMemo(() => {
    const map = {}
    txns.filter(t=>t.type==='out').forEach(t=>{
      if(!map[t.cat]) map[t.cat]={ amt:0, hasUnnec:false }
      map[t.cat].amt += t.amt
      if(!t.nec) map[t.cat].hasUnnec = true
    })
    return Object.entries(map).sort((a,b)=>b[1].amt-a[1].amt).map(([cat,v])=>({cat,...v}))
  },[txns])

  const filtered = byCat.filter(c=>{
    if(filter==='nec')   return !c.hasUnnec
    if(filter==='unnec') return c.hasUnnec
    return true
  })

  const outTxns = txns.filter(t=>t.type==='out').slice().sort((a,b)=>new Date(b.date)-new Date(a.date))

  const startEdit = (t) => { setEditing(t.id); setForm({ desc:t.desc, amt:t.amt, cat:t.cat, date:t.date }) }

  const saveEdit = async () => {
    await updateTransaction(editing, { desc:form.desc, amt:+form.amt, cat:form.cat, date:form.date }).catch(e=>alert(e.message))
    setTxns(prev=>prev.map(t=>t.id===editing ? {...t, desc:form.desc, amt:+form.amt, cat:form.cat, date:form.date}:t))
    setEditing(null)
  }

  const remove = async (id) => {
    if(!window.confirm('Excluir esta transação?')) return
    await deleteTransaction(id).catch(e=>alert(e.message))
    setTxns(prev=>prev.filter(t=>t.id!==id))
  }

  const exportCSV = () => {
    const rows = [['Data','Descrição','Valor','Tipo','Categoria','Fixo','Necessário']]
    txns.forEach(t=>rows.push([t.date, t.desc, t.amt, t.type==='in'?'Entrada':'Saída', t.cat, t.fixed?'Sim':'Não', t.nec?'Sim':'Não']))
    const csv  = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `casado-investing-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const filters = [['todos','Todas'],['nec','Necessárias'],['unnec','Com supérfluos']]
  const inp = { width:'100%', height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:12, marginBottom:8 }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        {filters.map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ fontSize:11, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, background: filter===k ? 'var(--blue)':'var(--bg-raised)', color: filter===k ? '#131B2E':'var(--text-2)' }}>
            {l}
          </button>
        ))}
        <button onClick={exportCSV} style={{ fontSize:11, padding:'6px 14px', borderRadius:20, border:'1px solid var(--border-2)', cursor:'pointer', fontFamily:'inherit', fontWeight:600, background:'none', color:'var(--text-2)', display:'flex', alignItems:'center', gap:5, marginLeft:'auto' }}>
          <Download size={11}/> Exportar CSV
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:'1rem' }}>
        {filtered.slice(0,8).map(c=>{
          const cfg = CAT[c.cat]||CAT['Outros']
          const p   = pct(c.amt,totalOut)
          return (
            <div key={c.cat} style={{ background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:20, marginBottom:8 }}>{cfg.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>{c.cat}</div>
              <div style={{ fontSize:15, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-1)', marginTop:3 }}>{fmt(c.amt)}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{p}% das saídas</div>
              <div style={{ height:3, background:'var(--bg-card)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
                <div style={{ height:'100%', background:cfg.color, width:`${p}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <Card>
        <CardTitle>Todas as transações ({outTxns.length})</CardTitle>
        {outTxns.length===0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-3)', fontSize:13 }}>
            Nenhuma transação. Use o Chat para adicionar.
          </div>
        ) : outTxns.map(t=>(
          <div key={t.id}>
            {editing===t.id ? (
              <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', background:'var(--bg-raised)', borderRadius:8, padding:'12px', marginBottom:6 }}>
                <input style={inp} type="text" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="Descrição" />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <input style={inp} type="number" value={form.amt} onChange={e=>setForm(p=>({...p,amt:e.target.value}))} step="0.01" min="0" />
                  <select style={{...inp, cursor:'pointer'}} value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <input style={inp} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={saveEdit} style={{ flex:1, height:34, background:'var(--blue)', color:'#131B2E', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>✓ Salvar</button>
                  <button onClick={()=>setEditing(null)} style={{ height:34, padding:'0 12px', background:'var(--bg-card)', color:'var(--text-2)', border:'1px solid var(--border-2)', borderRadius:8, fontSize:12, cursor:'pointer' }}><X size={12}/></button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <CatIcon cat={t.cat} size={30} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.desc}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{t.date?.slice(5)?.replace('-','/')} · {t.cat}</div>
                </div>
                <span style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--red)', flexShrink:0 }}>-{fmt(t.amt)}</span>
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  <button onClick={()=>startEdit(t)} style={{ width:28, height:28, border:'none', background:'var(--blue-bg)', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Edit3 size={11} color="var(--blue)" />
                  </button>
                  <button onClick={()=>remove(t.id)} style={{ width:28, height:28, border:'none', background:'var(--red-bg)', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Trash2 size={11} color="var(--red)" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {onClearAll && (
        <button onClick={onClearAll} style={{ width:'100%', height:40, marginTop:8, background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          🗑️ Limpar todas as transações
        </button>
      )}
    </div>
  )
}

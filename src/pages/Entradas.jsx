import { useMemo, useState } from 'react'
import { Edit3, Trash2, Download, X } from 'lucide-react'
import { updateTransaction, deleteTransaction } from '../lib/api'
import { fmt, pct, CAT, CatIcon, Card, CardTitle } from '../components/shared'

const CATS = Object.keys(CAT)

export default function Entradas({ txns, setTxns, onClearAll }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({})

  const totalIn = txns.filter(t=>t.type==='in').reduce((s,t)=>s+t.amt,0)

  const byCat = useMemo(() => {
    const map = {}
    txns.filter(t=>t.type==='in').forEach(t=>{ map[t.cat]=(map[t.cat]||0)+t.amt })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>({cat,amt}))
  },[txns])

  const inTxns = txns.filter(t=>t.type==='in').slice().sort((a,b)=>new Date(b.date)-new Date(a.date))

  const startEdit = (t) => { setEditing(t.id); setForm({ desc:t.desc, amt:t.amt, cat:t.cat, date:t.date }) }

  const saveEdit = async () => {
    await updateTransaction(editing, { desc:form.desc, amt:+form.amt, cat:form.cat, date:form.date }).catch(e=>alert(e.message))
    setTxns(prev=>prev.map(t=>t.id===editing ? {...t, desc:form.desc, amt:+form.amt, cat:form.cat, date:form.date}:t))
    setEditing(null)
  }

  const remove = async (id) => {
    if(!window.confirm('Excluir esta entrada?')) return
    await deleteTransaction(id).catch(e=>alert(e.message))
    setTxns(prev=>prev.filter(t=>t.id!==id))
  }

  const exportCSV = () => {
    const rows = [['Data','Descrição','Valor','Categoria']]
    inTxns.forEach(t=>rows.push([t.date, t.desc, t.amt, t.cat]))
    const csv  = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `entradas-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const inp = { width:'100%', height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:16, marginBottom:8 }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:20, padding:'6px 16px', fontSize:13, fontWeight:600, color:'var(--green)' }}>
          Total recebido: {fmt(totalIn)}
        </div>
        <button onClick={exportCSV} style={{ fontSize:11, padding:'6px 14px', borderRadius:20, border:'1px solid var(--border-2)', cursor:'pointer', fontFamily:'inherit', fontWeight:600, background:'none', color:'var(--text-2)', display:'flex', alignItems:'center', gap:5, marginLeft:'auto' }}>
          <Download size={11}/> Exportar CSV
        </button>
      </div>

      {byCat.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:'1rem' }}>
          {byCat.slice(0,6).map(c=>{
            const cfg = CAT[c.cat]||CAT['Renda']
            const p   = pct(c.amt,totalIn)
            return (
              <div key={c.cat} style={{ background:'var(--bg-raised)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{cfg.icon}</div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>{c.cat}</div>
                <div style={{ fontSize:15, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--green)', marginTop:3 }}>{fmt(c.amt)}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{p}% das entradas</div>
                <div style={{ height:3, background:'var(--bg-card)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:cfg.color, width:`${p}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Card>
        <CardTitle>Todas as entradas ({inTxns.length})</CardTitle>
        {inTxns.length===0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-3)', fontSize:13 }}>
            Nenhuma entrada ainda. Use o Chat para registrar recebimentos.
          </div>
        ) : inTxns.map(t=>(
          <div key={t.id}>
            {editing===t.id ? (
              <div style={{ background:'var(--bg-raised)', borderRadius:8, padding:'12px', marginBottom:6 }}>
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
                <span style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:'var(--green)', flexShrink:0 }}>+{fmt(t.amt)}</span>
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

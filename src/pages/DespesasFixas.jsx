import { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { loadAlerts, insertAlert, deleteAlert } from '../lib/api'
import { fmt, Card, CardTitle, Loader, Note } from '../components/shared'

/* Despesas fixas comuns pré-listadas para facilitar */
const SUGESTOES = [
  { nome:'Aluguel', icon:'🏠' }, { nome:'Condomínio', icon:'🏢' },
  { nome:'Conta de luz', icon:'💡' }, { nome:'Conta de água', icon:'🚿' },
  { nome:'Internet', icon:'📶' }, { nome:'Telefone/Celular', icon:'📱' },
  { nome:'Gás', icon:'🔥' }, { nome:'Plano de saúde', icon:'❤️' },
  { nome:'Escola/Faculdade', icon:'🎓' }, { nome:'Financiamento', icon:'🏦' },
]

export default function DespesasFixas({ userId }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome]     = useState('')
  const [valor, setValor]   = useState('')
  const [dia, setDia]       = useState('')

  useEffect(() => {
    loadAlerts(userId).then(d=>{ setItems(d); setLoading(false) }).catch(()=>setLoading(false))
  },[userId])

  const total = items.reduce((s,i)=>s + (+i.amount||0), 0)

  const add = async (nomePre) => {
    const n = nomePre || nome
    if(!n || !valor) { if(!nomePre) return }
    const v = +String(valor).replace(/\D/g,'')/100 || 0
    try {
      const item = await insertAlert(userId, { title:n, amount: nomePre ? 0 : v, due_day: +dia||5, kind:'fixa' })
      setItems(prev=>[...prev,item])
      setNome(''); setValor(''); setDia(''); setShowForm(false)
    } catch(e){ alert('Erro: '+e.message) }
  }

  const remove = async (id) => {
    await deleteAlert(id).catch(()=>{})
    setItems(prev=>prev.filter(i=>i.id!==id))
  }

  const money = (raw) => { const d=String(raw).replace(/\D/g,''); return d? (parseInt(d,10)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'' }
  const inp = { width:'100%', height:44, padding:'0 14px', borderRadius:10, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:16, marginBottom:10 }

  if (loading) return <Loader label="Carregando despesas fixas..." />

  return (
    <div>
      <Note>Aqui ficam suas <strong>despesas fixas</strong> — aquelas que se repetem todo mês (aluguel, luz, internet...). Te ajudamos a nunca esquecer nenhuma! 🧾</Note>

      {items.length > 0 && (
        <div style={{ background:'linear-gradient(135deg, var(--itau-navy), var(--itau-navy-2))', borderRadius:14, padding:'1.25rem', marginBottom:'1rem', color:'#fff' }}>
          <div style={{ fontSize:12, opacity:.85, marginBottom:4 }}>Total de despesas fixas por mês</div>
          <div style={{ fontSize:26, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(total)}</div>
        </div>
      )}

      <button onClick={()=>setShowForm(!showForm)} style={{ width:'100%', height:46, marginBottom:'1rem', background: showForm?'var(--bg-raised)':'var(--blue)', color: showForm?'var(--text-2)':'#fff', border: showForm?'1px solid var(--border-2)':'none', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
        {showForm ? <><X size={15}/> Cancelar</> : <><Plus size={15}/> Adicionar despesa fixa</>}
      </button>

      {showForm && (
        <Card>
          <CardTitle>Nova despesa fixa</CardTitle>
          <input style={inp} placeholder="Nome (ex: Aluguel)" value={nome} onChange={e=>setNome(e.target.value)} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <input style={inp} inputMode="numeric" placeholder="R$ 0,00" value={money(valor)} onChange={e=>setValor(e.target.value)} />
            <input style={inp} inputMode="numeric" placeholder="Dia venc. (ex: 5)" value={dia} onChange={e=>setDia(e.target.value)} />
          </div>
          <button onClick={()=>add()} style={{ width:'100%', height:44, background:'var(--blue)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>Salvar</button>
        </Card>
      )}

      {/* Sugestões rápidas */}
      <Card>
        <CardTitle>Adicionar rápido</CardTitle>
        <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:12 }}>Toque para adicionar (você preenche o valor depois):</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {SUGESTOES.filter(s=>!items.find(i=>i.title===s.nome)).map(s=>(
            <button key={s.nome} onClick={()=>add(s.nome)} style={{ padding:'8px 14px', borderRadius:20, border:'1px solid var(--border-2)', background:'var(--bg-card)', color:'var(--text-1)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              {s.icon} {s.nome}
            </button>
          ))}
        </div>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardTitle>Suas despesas fixas ({items.length})</CardTitle>
          {items.map(i=>(
            <div key={i.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{i.title}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>Vence dia {i.due_day}</div>
              </div>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color: +i.amount>0 ? 'var(--text-1)':'var(--text-3)' }}>
                {+i.amount>0 ? fmt(+i.amount) : 'sem valor'}
              </span>
              <button onClick={()=>remove(i.id)} style={{ width:30, height:30, border:'none', background:'var(--red-bg)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Trash2 size={12} color="var(--red)" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

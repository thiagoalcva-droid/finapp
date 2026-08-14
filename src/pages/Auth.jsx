import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [pass,  setPass]      = useState('')
  const [name,  setName]      = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name } } })
        if (error) throw error
        setMsg({ ok: true, text: 'Conta criada! Verifique seu e-mail.' }); setMode('login')
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setMsg({ ok: true, text: 'E-mail de recuperação enviado!' }); setMode('login')
      }
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setLoading(false)
  }

  const inp = { width:'100%', height:44, padding:'0 14px', marginBottom:12, borderRadius:10, border:'1px solid var(--border-2)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:14 }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg, var(--itau-navy) 0%, var(--itau-navy-2) 55%, #071A2E 100%)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <img src="/icon-192.png" alt="Casado Investing" style={{ width:76, height:76, borderRadius:18, marginBottom:14, boxShadow:'0 8px 24px rgba(0,0,0,.3)' }} />
          <h1 style={{ fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>Casado Investing</h1>
          <p style={{ color:'rgba(255,255,255,.75)', marginTop:8, fontSize:14 }}>Organize suas finanças com inteligência artificial</p>
        </div>

        <div style={{ background:'var(--bg-card)', borderRadius:18, padding:'2rem', boxShadow:'0 12px 40px rgba(0,0,0,.25)' }}>
          <h2 style={{ fontSize:18, fontWeight:600, color:'var(--text-1)', marginBottom:24, textAlign:'center' }}>
            {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta grátis' : 'Recuperar senha'}
          </h2>

          {msg && (
            <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13, background: msg.ok ? 'var(--green-bg)':'var(--red-bg)', color: msg.ok ? 'var(--green)':'var(--red)', border:`1px solid ${msg.ok ? 'var(--green-border)':'var(--red-border)'}` }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handle}>
            {mode === 'register' && <input style={inp} type="text" placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} required />}
            <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            {mode !== 'reset' && <input style={inp} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} />}
            <button type="submit" disabled={loading} style={{ width:'100%', height:46, background: loading ? 'var(--blue-dark)':'var(--blue)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:4, transition:'background .15s' }}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar'}
            </button>
          </form>

          <div style={{ marginTop:20, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            {mode === 'login' && <>
              <button onClick={()=>{setMode('reset');setMsg(null)}} style={{ fontSize:13, color:'var(--text-2)', background:'none', border:'none', cursor:'pointer' }}>Esqueci minha senha</button>
              <span style={{ fontSize:13, color:'var(--text-2)' }}>Não tem conta?{' '}
                <button onClick={()=>{setMode('register');setMsg(null)}} style={{ color:'var(--blue)', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:13 }}>Criar grátis</button>
              </span>
            </>}
            {mode !== 'login' && <button onClick={()=>{setMode('login');setMsg(null)}} style={{ fontSize:13, color:'var(--text-2)', background:'none', border:'none', cursor:'pointer' }}>← Voltar ao login</button>}
          </div>
        </div>
        <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,.55)', marginTop:20 }}>Seus dados são privados e protegidos · Supabase + Claude AI</p>
      </div>
    </div>
  )
}

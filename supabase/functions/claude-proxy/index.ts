// Edge Function: claude-proxy
// Esconde a chave da Anthropic no servidor — o navegador nunca vê a chave.
//
// COMO INSTALAR (pelo painel do Supabase, sem terminal):
// 1. Supabase → Edge Functions → Deploy new function → nome: claude-proxy
// 2. Cole este código inteiro e clique em Deploy
// 3. Em Edge Functions → claude-proxy → Secrets, adicione:
//    ANTHROPIC_API_KEY = sk-ant-... (sua chave)
// 4. No Vercel, DELETE a variável VITE_ANTHROPIC_KEY e faça Redeploy
//    (o app detecta automaticamente e passa a usar o proxy)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const auth = req.headers.get('Authorization')
  if (!auth) return new Response(JSON.stringify({ error: { message: 'Não autenticado' } }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })
    return new Response(await res.text(), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: String(e) } }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

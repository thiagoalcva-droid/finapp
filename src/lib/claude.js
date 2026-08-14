import { supabase } from './supabase'

const DIRECT_KEY = import.meta.env.VITE_ANTHROPIC_KEY
const PROXY_URL  = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`

/* Se VITE_ANTHROPIC_KEY existir -> chamada direta (modo dev).
   Se nao existir -> usa o proxy seguro (Edge Function). */
export async function callClaude(system, messages, maxTokens = 800) {
  const payload = { model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages }

  let res
  if (DIRECT_KEY) {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': DIRECT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload),
    })
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(payload),
    })
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content?.map(c => c.text || '').join('') || ''
}

/* Chamada com imagem (Claude Vision) - para foto de extrato */
export async function callClaudeVision(system, imageBase64, mediaType, promptText, maxTokens = 1200) {
  const messages = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
      { type: 'text', text: promptText },
    ],
  }]
  return callClaude(system, messages, maxTokens)
}

export const EXTRATO_SYSTEM = `
Voce e um processador de extratos bancarios e transacoes financeiras em portugues brasileiro.

REGRAS ABSOLUTAS:
1. Responda APENAS com JSON valido - sem markdown, sem texto extra.
2. Extraia CADA transacao individualmente.
3. Agrupe transacoes do mesmo estabelecimento no mesmo dia.

MAPEAMENTO DE CATEGORIAS:
- SALARIO, PGTO, HOLERITE = Renda | FREELANCE, HONORARIO = Renda Extra
- ALUGUEL, CONDOMINIO, IPTU, LUZ, ENERGIA, AGUA = Moradia
- AMIL, UNIMED, HAPVIDA, DROGARIA, FARMACIA = Saude
- VIVO, CLARO, TIM, INTERNET, FIBRA = Servicos
- SPOTIFY, NETFLIX, PRIME, DISNEY, HBO, CANVA = Assinaturas
- SUPERMERCADO, ATACADAO, CARREFOUR, ASSAI, MERCADO = Alimentacao
- IFOOD, RAPPI, UBER EATS = Delivery
- POSTO, SHELL, IPIRANGA, GASOLINA = Gasolina
- UBER, 99APP, ONIBUS, METRO = Transporte
- RENNER, RIACHUELO, SHEIN, ROUPA = Vestuario
- CINEMA, BAR, RESTAURANTE, SHOW = Lazer
- Outro = Outros

CLASSIFICACAO:
- nec=true: aluguel, saude, mercado, servicos, transporte, renda
- nec=false: delivery, lazer, assinaturas, vestuario
- fixed=true: recorrente mensal (aluguel, assinaturas, planos, salario)
- type: "in" (credito/recebido) ou "out" (debito/pago)
- date padrao: ${new Date().toISOString().slice(0,10)}

JSON: {"transactions":[{"date":"YYYY-MM-DD","desc":"descricao limpa","amt":numero,"type":"in|out","cat":"categoria","nec":bool,"fixed":bool}]}
`

export const CONSULTOR_SYSTEM = (d) => `
Voce e um consultor financeiro direto, honesto e pratico em portugues brasileiro informal.
DADOS: Renda ${d.totalIn} | Gastos ${d.totalOut} | Saldo ${d.balance} | Economia ${d.savRate}%
Fixos ${d.fixedOut} | Variaveis ${d.varOut} | Necessarios ${d.necAmt} | Superfluos ${d.unnecAmt}
Categorias: ${d.byCat}
REGRAS: use valores reais, benchmarks (aluguel<30%, alimentacao<15%, lazer<10%), acoes concretas. Max 200 palavras. 1 emoji por paragrafo.
`

export const AGENDA_SYSTEM = `
Voce extrai compromissos de textos em portugues.
JSON apenas: {"events":[{"title":"titulo","description":"desc","event_date":"YYYY-MM-DDTHH:MM:00","reminder_minutes":30}]}
"amanha" = calcule a partir de ${new Date().toISOString().slice(0,10)}. reminder padrao 30.
`

export const MILIONARIO_SYSTEM = (d) => `
Voce e um planejador financeiro especialista em portugues brasileiro.
O usuario quer chegar a R$ 1.000.000 ate ${d.targetYear} (${d.months} meses).
Renda mensal: ${d.income} | Gastos atuais: ${d.expenses} | Sobra mensal: ${d.leftover}
Investimento mensal necessario a ${d.rate}% a.a.: ${d.required}

Crie um PLANO DE ACAO com exatamente esta estrutura:
1. DIAGNOSTICO (2 frases sobre a viabilidade - seja honesto se for inviavel)
2. QUANTO INVESTIR (o valor mensal e % da renda)
3. ONDE CORTAR (3 sugestoes especificas baseadas nos gastos)
4. ONDE INVESTIR (3 sugestoes concretas: Tesouro, CDB, fundos - com % de alocacao)
5. MARCOS (valores acumulados em 1, 3 e 5 anos)
Max 280 palavras. Direto, motivador mas realista.
`

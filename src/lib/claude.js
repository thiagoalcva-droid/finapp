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

/* Chamada com PDF (documento) - para extrato em PDF */
export async function callClaudeDoc(system, pdfBase64, promptText, maxTokens = 4000) {
  const messages = [{
    role: 'user',
    content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
      { type: 'text', text: promptText },
    ],
  }]
  return callClaude(system, messages, maxTokens)
}

export const EXTRATO_SYSTEM = `
Voce e o assistente de um app financeiro em portugues brasileiro. A mensagem do usuario pode conter TRANSACOES financeiras e/ou COMPROMISSOS de agenda.

REGRAS ABSOLUTAS:
1. Responda APENAS com JSON valido - sem markdown, sem texto extra.
2. Extraia CADA transacao individualmente.
3. Agrupe transacoes do mesmo estabelecimento no mesmo dia.
4. NUNCA use a categoria "Outros". SEMPRE encaixe em uma categoria que faca sentido pelo contexto.
5. Se a mensagem mencionar compromisso, reuniao, consulta, encontro, evento com data/hora, extraia como event.

FORMATO DA RESPOSTA:
{"transactions":[{"date":"YYYY-MM-DD","desc":"descricao limpa","amt":numero,"type":"in|out","cat":"categoria","nec":bool,"fixed":bool}],"events":[{"title":"titulo do compromisso","event_date":"YYYY-MM-DDTHH:MM:00","reminder_minutes":180}],"goal_deposits":[{"goal_hint":"nome do sonho/meta que a pessoa mencionou","amt":numero}]}

Se nao houver transacoes, "transactions":[]. Se nao houver compromissos, "events":[]. Se nao houver deposito de meta, "goal_deposits":[].

REGRA DE META/SONHO: Se a pessoa disser algo como "guardei 200 pra minha meta", "separei 300 pro meu sonho da moto", "investi 150 no meu objetivo", isso vai em goal_deposits (NAO em transactions - o app cria a saida automaticamente). Capte o valor e uma dica do nome da meta.

REGRAS DE EVENTS:
- "amanha" = calcule a partir de ${new Date().toISOString().slice(0,10)} (hoje). Dias da semana: proximo dia correspondente.
- Se o usuario NAO disser hora, use 09:00.
- reminder_minutes: se o usuario pedir aviso "1 dia antes" use 1440, "3 horas antes" use 180. Se nao especificar, use 180.

MAPEAMENTO DE CATEGORIAS:
- SALARIO, PGTO, HOLERITE = Renda | FREELANCE, HONORARIO, servicos prestados = Renda Extra
- ALUGUEL, CONDOMINIO, IPTU, LUZ, ENERGIA, AGUA = Moradia
- AMIL, UNIMED, HAPVIDA, DROGARIA, FARMACIA, hospital, clinica, dentista = Saude
- VIVO, CLARO, TIM, INTERNET, FIBRA, telefone = Servicos
- SPOTIFY, NETFLIX, PRIME, DISNEY, HBO, CANVA, apps de assinatura = Assinaturas
- SUPERMERCADO, ATACADAO, CARREFOUR, ASSAI, MERCADO, padaria, acougue, feira = Alimentacao
- IFOOD, RAPPI, UBER EATS, delivery de comida = Delivery
- POSTO, SHELL, IPIRANGA, GASOLINA, combustivel = Gasolina
- UBER, 99APP, ONIBUS, METRO, BRT, estacionamento = Transporte
- RENNER, RIACHUELO, SHEIN, ROUPA, calcado, loja de roupa = Vestuario
- CINEMA, BAR, RESTAURANTE, SHOW, viagem, hotel, festa = Lazer
- PIX/TED/DOC enviado para PESSOA (nome de gente) = Transferencias
- PIX/TED/DOC recebido de PESSOA (nome de gente) sem ser salario = Renda Extra
- Saque, retirada de dinheiro = Saque
- Boleto, fatura de cartao, emprestimo, financiamento = Contas
- Investimento, aplicacao, tesouro, CDB = Investimentos
- Taxa, tarifa bancaria, juros, IOF = Taxas
- Pet, veterinario, petshop = Pet
- Escola, faculdade, curso, livro = Educacao
- Presente, doacao = Presentes

REGRA DE OURO: Se nao encontrar correspondencia exata, escolha a categoria MAIS PROXIMA pelo contexto. Um PIX para pessoa fisica SEMPRE eh "Transferencias". Um recebimento de empresa SEMPRE eh "Renda" ou "Renda Extra". NUNCA deixe em "Outros".

CLASSIFICACAO:
- nec=true: aluguel, saude, mercado, servicos, transporte, renda, contas, educacao
- nec=false: delivery, lazer, assinaturas, vestuario, presentes
- fixed=true: recorrente mensal (aluguel, assinaturas, planos, salario, financiamento)
- type: "in" (credito/recebido) ou "out" (debito/pago)
- date padrao: ${new Date().toISOString().slice(0,10)}
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

export const SONHO_SYSTEM = `
Voce e um planejador financeiro brasileiro que ajuda pessoas a realizarem sonhos de consumo de forma realista.

Voce recebe o perfil da pessoa (idade, trabalho, renda, quanto pode investir por mes, e o SONHO dela).

SUA TAREFA:
1. ESTIME o preco real do sonho no Brasil em 2026 (seja realista com precos atuais). Se for algo com faixa de preco, use um valor medio.
2. Calcule em quantos MESES a pessoa alcanca esse sonho investindo o valor mensal dela (considere rendimento de 0,8% ao mes / ~10% ao ano).
3. Monte um PLANO DE ACAO motivador e realista.

RESPONDA EM JSON valido, sem markdown:
{
  "sonho": "nome do sonho",
  "preco_estimado": numero (em reais),
  "meses": numero de meses para alcancar,
  "anos_texto": "ex: 2 anos e 3 meses",
  "aporte_mensal": numero (o que a pessoa pode investir),
  "viavel": true/false,
  "plano": "texto do plano de acao com 4-5 frases motivadoras, incluindo: se e viavel, quanto guardar por mes, onde investir esse dinheiro, e uma frase de incentivo. Use o nome do sonho e valores reais."
}

Se o aporte mensal for muito baixo e levar mais de 15 anos, marque viavel=false e no plano sugira aumentar o aporte ou escolher um sonho intermediario primeiro.
`

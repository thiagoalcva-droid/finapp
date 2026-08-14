# 🪙 Casado Investing

App de finanças pessoais com IA — a marca do Casado. Tema escuro: preto, branco, azul e ouro.

## Funcionalidades

| Aba | O que faz |
|-----|-----------|
| 📊 Dashboard | Saldo, fluxo de caixa, categorias, últimas transações |
| 💬 Chat | Cole extrato bancário — IA categoriza automaticamente |
| 💳 Despesas | Visão por categoria + todas as transações |
| ⚖️ Análise | Fixos/variáveis, necessário/supérfluo, projeção 10 anos, consultor IA |
| 📅 Agenda | Compromissos com alarmes (via chat ou formulário) |
| 🔔 Alertas | Despesas fixas com avisos 3, 2 e 1 dia antes do vencimento |
| 💡 Conselhos IA | 5 conselhos personalizados + pergunta livre |

---

## 🚀 Deploy em 4 passos (~15 minutos)

### Passo 1 — Banco de dados (Supabase)

1. Acesse **supabase.com** → New project
2. Escolha nome, senha e região South America
3. Menu lateral: **SQL Editor** → cole o arquivo `database.sql` → **Run**
4. Menu lateral: **Settings → API** → copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

### Passo 2 — Chave da IA (Anthropic)

1. Acesse **console.anthropic.com**
2. **API Keys → Create Key** → copie → `VITE_ANTHROPIC_KEY`

### Passo 3 — Subir no GitHub

```bash
# Na pasta finapp:
git init
git add .
git commit -m "FinApp v2"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/finapp.git
git push -u origin main
```

### Passo 4 — Deploy no Vercel

1. Acesse **vercel.com** → **Add New Project** → importe `finapp`
2. Em **Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | https://xxxx.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | eyJhbGci... |
| `VITE_ANTHROPIC_KEY` | sk-ant-... |

3. **Deploy** ✓

---

## 📱 Instalar como app no celular

Após o deploy, no celular:
- **Android (Chrome):** Menu → "Adicionar à tela inicial"
- **iPhone (Safari):** Compartilhar → "Adicionar à tela de início"

Com o app instalado, as notificações de agenda e alertas funcionam mesmo com o navegador fechado.

---

## Rodar localmente

```bash
npm install
cp .env.example .env
# Edite .env com suas chaves
npm run dev
# Acesse http://localhost:5173
```

---

## Custo estimado

| Serviço | Custo |
|---------|-------|
| Supabase | Grátis (plano free) |
| Vercel | Grátis |
| Claude API | ~R$ 2–5/mês (uso pessoal) |

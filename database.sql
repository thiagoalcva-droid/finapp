-- ══════════════════════════════════════════════════════════════
--  FinApp v2 — Database Setup
--  Cole no SQL Editor do Supabase e clique em Run
-- ══════════════════════════════════════════════════════════════

-- 1. Transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  description text NOT NULL,
  amount      decimal(12,2) NOT NULL,
  type        text NOT NULL CHECK (type IN ('in','out')),
  category    text NOT NULL DEFAULT 'Outros',
  fixed       boolean DEFAULT false,
  necessary   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_transactions" ON transactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_txn_user_date ON transactions(user_id, date DESC);

-- 2. Mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       text NOT NULL CHECK (role IN ('user','ai')),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_messages" ON chat_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Agenda / compromissos
CREATE TABLE IF NOT EXISTS agenda (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title            text NOT NULL,
  description      text,
  event_date       timestamptz NOT NULL,
  reminder_minutes int DEFAULT 30,
  notified         boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_agenda" ON agenda FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_user_date ON agenda(user_id, event_date ASC);

-- 4. Alertas de despesas fixas
CREATE TABLE IF NOT EXISTS expense_alerts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  amount      decimal(12,2),
  due_day     int NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  alert_days  int[] DEFAULT '{3,2,1}',
  alert_hour  int DEFAULT 8,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE expense_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_alerts" ON expense_alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Subscriptions de push notification (para alertas em background)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_push" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

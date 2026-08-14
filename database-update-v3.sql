-- ══════════════════════════════════════════════════════════════
--  Casado Investing v3 — ATUALIZAÇÃO do banco
--  Cole no SQL Editor do Supabase e clique em Run
--  (Seguro rodar mesmo com as tabelas antigas já criadas)
-- ══════════════════════════════════════════════════════════════

-- 1. Metas financeiras
CREATE TABLE IF NOT EXISTS goals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           text NOT NULL,
  target_amount  decimal(14,2) NOT NULL,
  current_amount decimal(14,2) DEFAULT 0,
  deadline       date,
  icon           text DEFAULT '🎯',
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_goals" ON goals;
CREATE POLICY "own_goals" ON goals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Investimentos
CREATE TABLE IF NOT EXISTS investments (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           text NOT NULL,
  monthly_amount decimal(14,2) NOT NULL,
  initial_amount decimal(14,2) DEFAULT 0,
  annual_rate    decimal(5,2) DEFAULT 12,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_investments" ON investments;
CREATE POLICY "own_investments" ON investments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Plano Milionário
CREATE TABLE IF NOT EXISTS millionaire_plan (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  target_year        int NOT NULL,
  monthly_investment decimal(14,2),
  annual_rate        decimal(5,2) DEFAULT 12,
  action_plan        text,
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE millionaire_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_plan" ON millionaire_plan;
CREATE POLICY "own_plan" ON millionaire_plan FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

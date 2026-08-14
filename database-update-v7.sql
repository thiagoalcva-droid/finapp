-- ══════════════════════════════════════════════════════════════
--  Casado Investing v7 — Onboarding (quiz inicial)
--  Cole no SQL Editor do Supabase e clique em Run
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS onboarding (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  completo       boolean DEFAULT false,
  renda          decimal(14,2),
  despesas       jsonb,           -- { "Aluguel": 1500, "Luz": 200, ... }
  total_despesas decimal(14,2),
  tem_sonho      boolean,
  sonho          text,
  quer_milhao    boolean,
  prazo_milhao   int,             -- anos
  pode_investir  decimal(14,2),   -- calculado: (renda - despesas) - 20% diversao
  updated_at     timestamptz DEFAULT now()
);
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_onboarding" ON onboarding;
CREATE POLICY "own_onboarding" ON onboarding FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

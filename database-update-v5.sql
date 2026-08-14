-- ══════════════════════════════════════════════════════════════
--  Casado Investing v5 — Perfil do sonho (quiz)
--  Cole no SQL Editor do Supabase e clique em Run
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dream_profile (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  idade          int,
  cidade         text,
  trabalho       text,
  renda          decimal(14,2),
  aporte_mensal  decimal(14,2),
  sonho          text,
  gosta_viajar   boolean,
  extra          jsonb,
  plano_gerado   text,
  preco_sonho    decimal(14,2),
  meses_sonho    int,
  updated_at     timestamptz DEFAULT now()
);
ALTER TABLE dream_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_dream" ON dream_profile;
CREATE POLICY "own_dream" ON dream_profile FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

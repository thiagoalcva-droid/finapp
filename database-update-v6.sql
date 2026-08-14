-- ══════════════════════════════════════════════════════════════
--  Casado Investing v6 — Despesas fixas
--  Cole no SQL Editor do Supabase e clique em Run
-- ══════════════════════════════════════════════════════════════

-- Garante as colunas usadas pela aba Despesas Fixas
ALTER TABLE expense_alerts ADD COLUMN IF NOT EXISTS amount decimal(14,2) DEFAULT 0;
ALTER TABLE expense_alerts ADD COLUMN IF NOT EXISTS kind text DEFAULT 'fixa';

-- ══════════════════════════════════════════════════════════════
--  Casado Investing v4 — guardar imagem no chat
--  Cole no SQL Editor do Supabase e clique em Run
-- ══════════════════════════════════════════════════════════════

-- Adiciona coluna para guardar a foto do extrato permanentemente
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text;

-- Buyer contact + transfer bank (anti lost-contact) + needs_contact status

ALTER TABLE public.payment_reports
  ADD COLUMN IF NOT EXISTS buyer_contact TEXT,
  ADD COLUMN IF NOT EXISTS contact_platform TEXT
    CHECK (contact_platform IS NULL OR contact_platform IN ('ig', 'threads', 'line')),
  ADD COLUMN IF NOT EXISTS transfer_bank TEXT;

COMMENT ON COLUMN public.payment_reports.buyer_contact IS '買家聯絡方式（IG / Threads / LINE 暱稱）';
COMMENT ON COLUMN public.payment_reports.contact_platform IS '聯絡平台：ig | threads | line';
COMMENT ON COLUMN public.payment_reports.transfer_bank IS '買家轉帳銀行（對照銀行 App）';

ALTER TABLE public.payment_reports
  DROP CONSTRAINT IF EXISTS payment_reports_status_check;

ALTER TABLE public.payment_reports
  ADD CONSTRAINT payment_reports_status_check
  CHECK (
    status IN (
      'pending',
      'confirmed',
      'auto_confirmed',
      'rejected',
      'needs_contact'
    )
  );

NOTIFY pgrst, 'reload schema';

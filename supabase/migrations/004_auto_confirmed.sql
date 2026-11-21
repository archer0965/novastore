-- Allow auto_confirmed status for smart bank-text reconciliation

ALTER TABLE public.payment_reports
  DROP CONSTRAINT IF EXISTS payment_reports_status_check;

ALTER TABLE public.payment_reports
  ADD CONSTRAINT payment_reports_status_check
  CHECK (status IN ('pending', 'confirmed', 'auto_confirmed', 'rejected'));

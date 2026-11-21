-- Per-seller LINE Messaging API credentials for independent push

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_channel_secret TEXT;

COMMENT ON COLUMN public.profiles.line_channel_access_token IS
  '賣家自有 LINE Official Account Channel Access Token（選填；未設則退回系統預設）';
COMMENT ON COLUMN public.profiles.line_channel_secret IS
  '賣家自有 LINE Channel Secret（選填，供後續 webhook／驗證擴充）';

NOTIFY pgrst, 'reload schema';

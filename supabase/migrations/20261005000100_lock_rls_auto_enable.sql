-- Supabase's "automatic RLS" option installs public.rls_auto_enable(), a SECURITY DEFINER
-- function that the API could call directly. It only needs to fire as an event trigger,
-- so nobody gets to execute it through the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

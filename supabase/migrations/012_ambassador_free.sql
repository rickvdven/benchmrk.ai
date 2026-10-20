-- approved ambassadors (gyms, coaches, creators) use RoxEngine for free
create or replace function public.admin_set_ambassador(_uid uuid, _status text, _pct int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.ambassadors set status = _status, commission_pct = coalesce(_pct, commission_pct),
    approved_at = case when _status = 'approved' then coalesce(approved_at, now()) else approved_at end
   where user_id = _uid;
  if _status = 'approved' then
    update public.subscriptions set status = 'exempt', updated_at = now() where user_id = _uid and status <> 'active';
  end if;
end $$;

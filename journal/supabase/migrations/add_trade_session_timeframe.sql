alter table public.trades
  add column if not exists ny_session text,
  add column if not exists timeframe text;

alter table public.trades
  drop constraint if exists trades_ny_session_check;

alter table public.trades
  add constraint trades_ny_session_check
  check (ny_session is null or ny_session in ('10-11 AM NY', '2-3 PM NY'));

alter table public.trades
  drop constraint if exists trades_timeframe_check;

alter table public.trades
  add constraint trades_timeframe_check
  check (timeframe is null or timeframe in ('1 min', '3 min'));

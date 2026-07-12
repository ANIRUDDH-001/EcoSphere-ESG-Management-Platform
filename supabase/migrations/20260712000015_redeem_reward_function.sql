-- b2_05: Transactional reward redemption SQL function
-- redeem_reward(p_employee uuid, p_reward uuid) -> returns public.reward_redemptions row

create or replace function public.redeem_reward(
  p_employee uuid,
  p_reward uuid
)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points_balance int;
  v_points_required int;
  v_stock int;
  v_redemption public.reward_redemptions;
begin
  -- 1. Lock employee profile row to prevent concurrent points double-spending
  select points_balance
    into v_points_balance
    from public.profiles
   where id = p_employee
     for update;

  if not found then
    raise exception 'employee_not_found';
  end if;

  -- 2. Lock reward row to prevent overselling of stock
  select points_required, stock
    into v_points_required, v_stock
    from public.rewards
   where id = p_reward
     for update;

  if not found then
    raise exception 'reward_not_found';
  end if;

  -- 3. Assertions
  if v_stock <= 0 then
    raise exception 'out_of_stock';
  end if;

  if v_points_balance < v_points_required then
    raise exception 'insufficient_points';
  end if;

  -- 4. Deduct points from employee
  update public.profiles
     set points_balance = points_balance - v_points_required
   where id = p_employee;

  -- 5. Decrement stock from reward item
  update public.rewards
     set stock = stock - 1
   where id = p_reward;

  -- 6. Insert redemption record
  insert into public.reward_redemptions (
    employee_id,
    reward_id,
    points_spent,
    status
  ) values (
    p_employee,
    p_reward,
    v_points_required,
    'fulfilled'
  )
  returning * into v_redemption;

  return v_redemption;
end;
$$;

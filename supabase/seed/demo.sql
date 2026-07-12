-- demo.sql — EcoSphere demo dataset (i_02)
-- Idempotent: clears domain rows then re-seeds a single believable org.
-- One company, 4 departments, 14 assigned employees (+1 admin), time-spread data,
-- deliberate imbalance so scores + AI insight + leaderboard + reports all read true.
-- No emoji anywhere (DESIGN §1). Numbers only; triggers/functions recompute scores.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Clean domain data (idempotent re-run) — keep auth-backed profiles + settings
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.reward_redemptions;
delete from public.badge_awards;
delete from public.challenge_participations;
delete from public.employee_participations;
delete from public.training_completions;
delete from public.diversity_metrics;
delete from public.compliance_issues;
delete from public.audits;
delete from public.csr_activities;
delete from public.challenges;
delete from public.carbon_transactions;
delete from public.environmental_goals;
delete from public.policy_acknowledgements;
delete from public.notifications;

-- Remove extra badges/rewards from prior seeds (keep nothing; we re-seed a known set)
delete from public.badge_awards;
delete from public.badges;
delete from public.rewards;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Consolidate to 4 real departments; drop test-pollution departments
-- ─────────────────────────────────────────────────────────────────────────────
-- Reassign every non-admin profile to one of the 4 real departments, with real names,
-- and reset gamification counters to a clean baseline.
update public.profiles set xp = 0, points_balance = 0;

-- Engineering (ENG) 11111111...  — manager + 3 employees
update public.profiles set full_name = 'Priya Sharma',  department_id = '11111111-1111-1111-1111-111111111111' where id = '0d6e8629-4e96-4f7f-98e4-97b6963b1c11';
update public.profiles set full_name = 'Arjun Mehta',   department_id = '11111111-1111-1111-1111-111111111111' where id = '3e22e09c-ce19-4ce0-bf5d-e4a7e86ccb52';
update public.profiles set full_name = 'Rahul Verma',   department_id = '11111111-1111-1111-1111-111111111111' where id = '6a777d0b-d43e-49cb-ba3f-720a51c21902';
update public.profiles set full_name = 'Sneha Iyer',    department_id = '11111111-1111-1111-1111-111111111111' where id = 'c512633e-465c-411b-b7fa-03ee4933ffa4';

-- Finance (FIN) 44444444...  — 3 employees
update public.profiles set full_name = 'Vikram Nair',   department_id = '44444444-4444-4444-4444-444444444444' where id = '43cbc079-ea72-468f-87bb-e7e08d8c7b80';
update public.profiles set full_name = 'Anjali Rao',    department_id = '44444444-4444-4444-4444-444444444444' where id = '87c36281-2849-4270-ae62-d9a3e36f15c2';
update public.profiles set full_name = 'Karan Singh',   department_id = '44444444-4444-4444-4444-444444444444' where id = '350aaf0e-fa9e-4dce-b748-0d006150ee25';

-- HR (HR) 33333333...  — 4 employees (star department)
update public.profiles set full_name = 'Meera Joshi',   department_id = '33333333-3333-3333-3333-333333333333' where id = '851f51a1-360b-4fe2-9398-f165c1508e41';
update public.profiles set full_name = 'Rohan Das',     department_id = '33333333-3333-3333-3333-333333333333' where id = 'ce29e22f-c8b4-4f10-96df-07e29a3153a8';
update public.profiles set full_name = 'Divya Menon',   department_id = '33333333-3333-3333-3333-333333333333' where id = 'c2f528eb-0cef-44f9-8f0d-c256d648b468';
update public.profiles set full_name = 'Aditya Kapoor', department_id = '33333333-3333-3333-3333-333333333333' where id = '3c08a6b6-a3cb-4b1b-b118-ef756d6c79fe';

-- Marketing (MKT) 22222222...  — 3 employees (lagging department)
update public.profiles set full_name = 'Nisha Reddy',   department_id = '22222222-2222-2222-2222-222222222222' where id = '81540a1c-41b1-46d3-9d7e-ca697e6be6f5';
update public.profiles set full_name = 'Sanjay Gupta',  department_id = '22222222-2222-2222-2222-222222222222' where id = 'a6cb7a08-9037-41b2-892b-a92d48d48e1b';
update public.profiles set full_name = 'Pooja Bhatt',   department_id = '22222222-2222-2222-2222-222222222222' where id = '3fce1354-8870-49d0-a677-49f0ab60fd7b';

update public.profiles set full_name = 'Admin User', department_id = null where id = '446628b7-323d-44cc-8478-5b403d447a0d';

-- Detach heads then delete the test departments (no rows reference them anymore)
update public.departments set head_id = null, parent_id = null;
delete from public.department_scores where department_id not in (
  '11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222');
delete from public.departments where code not in ('ENG','FIN','HR','MKT');

-- Canonical names, codes, employee counts, heads
update public.departments set name = 'Engineering', employee_count = 4, head_id = '0d6e8629-4e96-4f7f-98e4-97b6963b1c11' where code = 'ENG';
update public.departments set name = 'Finance',     employee_count = 3 where code = 'FIN';
update public.departments set name = 'Human Resources', employee_count = 4 where code = 'HR';
update public.departments set name = 'Marketing',   employee_count = 3 where code = 'MKT';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Environmental — carbon transactions over 12 months (deliberate imbalance)
--    Engineering carries heavy manufacturing + energy load -> low env score.
-- ─────────────────────────────────────────────────────────────────────────────
-- Engineering: energy (8000 kWh) + manufacturing (3000 units); Marketing energy+fleet;
-- Finance light; HR lightest. UUID literals cast explicitly (union resolves types to text otherwise).
insert into public.carbon_transactions (date, department_id, source_type, source_ref, quantity, emission_factor_id, co2e, is_auto, note)
select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '11111111-1111-1111-1111-111111111111'::uuid, 'energy'::source_type, 'Plant meter', 8000, '77777777-7777-7777-7777-777777777771'::uuid, 8000*0.5, false, 'Monthly grid electricity' from generate_series(0,11) g
union all select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '11111111-1111-1111-1111-111111111111'::uuid, 'manufacturing'::source_type, 'Line A', 3000, '77777777-7777-7777-7777-777777777774'::uuid, 3000*1.5, false, 'Monthly production output' from generate_series(0,11) g
union all select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '22222222-2222-2222-2222-222222222222'::uuid, 'energy'::source_type, 'Office meter', 2000, '77777777-7777-7777-7777-777777777771'::uuid, 2000*0.5, false, 'Monthly office electricity' from generate_series(0,11) g
union all select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '22222222-2222-2222-2222-222222222222'::uuid, 'fleet'::source_type, 'Campaign travel', 4000, '77777777-7777-7777-7777-777777777772'::uuid, 4000*0.25, false, 'Monthly field travel' from generate_series(0,11) g
union all select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '44444444-4444-4444-4444-444444444444'::uuid, 'energy'::source_type, 'Office meter', 1500, '77777777-7777-7777-7777-777777777771'::uuid, 1500*0.5, false, 'Monthly office electricity' from generate_series(0,11) g
union all select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '44444444-4444-4444-4444-444444444444'::uuid, 'purchase'::source_type, 'Office supplies', 2000, '77777777-7777-7777-7777-777777777773'::uuid, 2000*0.1, false, 'Monthly procurement' from generate_series(0,11) g
union all select (date_trunc('month', current_date) - (g || ' months')::interval)::date, '33333333-3333-3333-3333-333333333333'::uuid, 'energy'::source_type, 'Office meter', 1200, '77777777-7777-7777-7777-777777777771'::uuid, 1200*0.5, false, 'Monthly office electricity' from generate_series(0,11) g;

-- Environmental goals: HR achieved, Engineering + Marketing missing target, Finance on track
insert into public.environmental_goals (name, department_id, metric, baseline, target, target_date, current_value, status) values
 ('Cut office energy 20%',        '33333333-3333-3333-3333-333333333333', 'kWh/month', 1600, 1200, current_date + 90, 1200, 'achieved'),
 ('Reduce plant emissions 15%',   '11111111-1111-1111-1111-111111111111', 'kgCO2e/month', 9000, 7000, current_date + 120, 8700, 'active'),
 ('Lower travel footprint 25%',   '22222222-2222-2222-2222-222222222222', 'km/month', 5000, 3500, current_date - 10, 4600, 'missed'),
 ('Paperless procurement',        '44444444-4444-4444-4444-444444444444', 'reams/month', 40, 20, current_date + 60, 28, 'active');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Governance — policy acknowledgements + audits + compliance issues
--    Finance carries overdue + failed audit -> low governance ("why is gov low?").
-- ─────────────────────────────────────────────────────────────────────────────
-- Acknowledgements: everyone acks every policy; Finance leaves some pending (lower ack rate)
insert into public.policy_acknowledgements (policy_id, employee_id, status, acknowledged_at)
select pol.id, pr.id,
       case when pr.department_id = '44444444-4444-4444-4444-444444444444' and pol.rn > 3 then 'pending' else 'acknowledged' end,
       case when pr.department_id = '44444444-4444-4444-4444-444444444444' and pol.rn > 3 then null else now() - (pol.rn || ' days')::interval end
from (select id, row_number() over (order by created_at) rn from public.esg_policies) pol
cross join public.profiles pr
where pr.role <> 'admin';

-- Audits: Finance has a failed audit; others pass
insert into public.audits (id, title, department_id, auditor_id, scheduled_date, completed_date, findings, result, status) values
 ('a0000001-0000-0000-0000-000000000001', 'Q2 Financial Controls Review', '44444444-4444-4444-4444-444444444444', '446628b7-323d-44cc-8478-5b403d447a0d', current_date - 40, current_date - 30, 'Gaps in expense approval trail and vendor due diligence.', 'fail', 'completed'),
 ('a0000001-0000-0000-0000-000000000002', 'Data Privacy Audit',            '33333333-3333-3333-3333-333333333333', '446628b7-323d-44cc-8478-5b403d447a0d', current_date - 35, current_date - 25, 'Controls effective; minor documentation updates advised.', 'pass', 'completed'),
 ('a0000001-0000-0000-0000-000000000003', 'ISO 14001 Environmental Audit', '11111111-1111-1111-1111-111111111111', '446628b7-323d-44cc-8478-5b403d447a0d', current_date - 20, current_date - 12, 'Emissions monitoring in place; targets pending.', 'pass', 'completed');

-- Compliance issues: two overdue + one open on Finance -> governance penalty
insert into public.compliance_issues (audit_id, severity, description, owner_id, due_date, status, is_overdue) values
 ('a0000001-0000-0000-0000-000000000001', 'high',     'Implement dual-approval for expenses over 5,000',      '43cbc079-ea72-468f-87bb-e7e08d8c7b80', current_date - 15, 'open', true),
 ('a0000001-0000-0000-0000-000000000001', 'critical', 'Complete vendor due-diligence documentation',           '87c36281-2849-4270-ae62-d9a3e36f15c2', current_date - 5,  'open', true),
 ('a0000001-0000-0000-0000-000000000001', 'medium',   'Quarterly reconciliation sign-off outstanding',         '350aaf0e-fa9e-4dce-b748-0d006150ee25', current_date + 10, 'open', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Social — CSR activities, participations, training, diversity
--    HR strong participation; Marketing lagging (one PENDING for the live demo).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.csr_activities (id, title, category_id, department_id, description, activity_date, location, points, capacity, status) values
 ('c5000001-0000-0000-0000-000000000001', 'Community Tree Plantation', '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Plant 500 saplings at the riverside reserve.', current_date - 20, 'Riverside Reserve', 50, 40, 'active'),
 ('c5000001-0000-0000-0000-000000000002', 'Coastal Cleanup Drive',     '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Beach cleanup and waste segregation.',        current_date - 12, 'Marina Beach',      40, 30, 'active'),
 ('c5000001-0000-0000-0000-000000000003', 'Blood Donation Camp',       '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Company-wide blood donation drive.',          current_date - 8,  'HQ Auditorium',     30, 50, 'active'),
 ('c5000001-0000-0000-0000-000000000004', 'Digital Literacy Workshop', '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Teach basic computer skills at local school.', current_date - 4, 'Govt. School No. 4', 45, 25, 'active');

-- Approved CSR participations (drive points_balance + social participation rate)
-- HR: 3 of 4 approved; Engineering: 2 of 4; Finance: 1 of 3; Marketing: 0 approved yet.
insert into public.employee_participations (employee_id, activity_id, proof_url, approval_status, points_earned, completion_date, reviewed_by) values
 ('851f51a1-360b-4fe2-9398-f165c1508e41', 'c5000001-0000-0000-0000-000000000001', 'csr-proofs/851f51a1/tree.jpg',  'approved', 50, current_date - 19, '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('ce29e22f-c8b4-4f10-96df-07e29a3153a8', 'c5000001-0000-0000-0000-000000000001', 'csr-proofs/ce29e22f/tree.jpg',  'approved', 50, current_date - 19, '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('c2f528eb-0cef-44f9-8f0d-c256d648b468', 'c5000001-0000-0000-0000-000000000002', 'csr-proofs/c2f528eb/beach.jpg', 'approved', 40, current_date - 11, '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('3e22e09c-ce19-4ce0-bf5d-e4a7e86ccb52', 'c5000001-0000-0000-0000-000000000003', 'csr-proofs/3e22e09c/blood.jpg', 'approved', 30, current_date - 7,  '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('6a777d0b-d43e-49cb-ba3f-720a51c21902', 'c5000001-0000-0000-0000-000000000003', 'csr-proofs/6a777d0b/blood.jpg', 'approved', 30, current_date - 7,  '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('43cbc079-ea72-468f-87bb-e7e08d8c7b80', 'c5000001-0000-0000-0000-000000000003', 'csr-proofs/43cbc079/blood.jpg', 'approved', 30, current_date - 7,  '0d6e8629-4e96-4f7f-98e4-97b6963b1c11');

-- PENDING participation for the live demo approval (Marketing employee) — moves the lagging dept
insert into public.employee_participations (employee_id, activity_id, proof_url, approval_status, points_earned, completion_date) values
 ('81540a1c-41b1-46d3-9d7e-ca697e6be6f5', 'c5000001-0000-0000-0000-000000000004', 'csr-proofs/81540a1c/workshop.jpg', 'pending', 0, null);

-- Training completions per department (avg completion_pct feeds social score)
insert into public.training_completions (employee_id, course_name, completion_pct, completed_at)
select id, 'ESG Fundamentals',
       case department_id
         when '33333333-3333-3333-3333-333333333333' then 92
         when '11111111-1111-1111-1111-111111111111' then 74
         when '44444444-4444-4444-4444-444444444444' then 62
         else 48 end,
       current_date - 30
from public.profiles where role <> 'admin'
union all
select id, 'Workplace Ethics',
       case department_id
         when '33333333-3333-3333-3333-333333333333' then 88
         when '11111111-1111-1111-1111-111111111111' then 70
         when '44444444-4444-4444-4444-444444444444' then 58
         else 52 end,
       current_date - 15
from public.profiles where role <> 'admin';

-- Diversity metrics (latest period per department)
insert into public.diversity_metrics (department_id, period, gender_ratio, avg_tenure, training_hours, headcount) values
 ('33333333-3333-3333-3333-333333333333', '2026-Q2', 0.52, 5.2, 38, 4),
 ('11111111-1111-1111-1111-111111111111', '2026-Q2', 0.32, 3.4, 26, 4),
 ('44444444-4444-4444-4444-444444444444', '2026-Q2', 0.45, 2.6, 22, 3),
 ('22222222-2222-2222-2222-222222222222', '2026-Q2', 0.40, 1.8, 18, 3);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Gamification — challenges, XP, badges, rewards, a redemption
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.challenges (id, title, category_id, description, xp, difficulty, evidence_required, deadline, status) values
 ('c8000001-0000-0000-0000-000000000001', 'Cycle to Work Week',   '66666666-6666-6666-6666-666666666666', 'Commute by bicycle for five working days.', 100, 'easy',   true,  current_date + 20, 'active'),
 ('c8000001-0000-0000-0000-000000000002', 'Zero-Waste Lunch',     '66666666-6666-6666-6666-666666666666', 'Bring a waste-free lunch for two weeks.',   150, 'medium', true,  current_date + 30, 'active'),
 ('c8000001-0000-0000-0000-000000000003', 'Step Challenge 50k',   '66666666-6666-6666-6666-666666666666', 'Log 50,000 steps in a week.',               80,  'easy',   false, current_date - 5,  'completed');

-- Approved challenge participations (set xp_awarded directly; profiles.xp set below)
insert into public.challenge_participations (challenge_id, employee_id, progress, proof_url, approval_status, xp_awarded, reviewed_by) values
 ('c8000001-0000-0000-0000-000000000001', '851f51a1-360b-4fe2-9398-f165c1508e41', 100, 'csr-proofs/851f51a1/cycle.jpg', 'approved', 100, '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('c8000001-0000-0000-0000-000000000003', '851f51a1-360b-4fe2-9398-f165c1508e41', 100, null,                             'approved', 80,  '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('c8000001-0000-0000-0000-000000000001', 'ce29e22f-c8b4-4f10-96df-07e29a3153a8', 100, 'csr-proofs/ce29e22f/cycle.jpg', 'approved', 100, '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('c8000001-0000-0000-0000-000000000003', 'c2f528eb-0cef-44f9-8f0d-c256d648b468', 100, null,                             'approved', 80,  '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('c8000001-0000-0000-0000-000000000001', '3e22e09c-ce19-4ce0-bf5d-e4a7e86ccb52', 100, 'csr-proofs/3e22e09c/cycle.jpg', 'approved', 100, '0d6e8629-4e96-4f7f-98e4-97b6963b1c11'),
 ('c8000001-0000-0000-0000-000000000002', '81540a1c-41b1-46d3-9d7e-ca697e6be6f5', 40,  'csr-proofs/81540a1c/lunch.jpg', 'pending',  0,   null);

-- Points balances (from approved CSR) and XP (from approved challenges)
update public.profiles set points_balance = 100, xp = 180 where id = '851f51a1-360b-4fe2-9398-f165c1508e41'; -- Meera Joshi (HR)
update public.profiles set points_balance = 50,  xp = 100 where id = 'ce29e22f-c8b4-4f10-96df-07e29a3153a8'; -- Rohan Das (HR)
update public.profiles set points_balance = 40,  xp = 80  where id = 'c2f528eb-0cef-44f9-8f0d-c256d648b468'; -- Divya Menon (HR)
update public.profiles set points_balance = 30,  xp = 100 where id = '3e22e09c-ce19-4ce0-bf5d-e4a7e86ccb52'; -- Arjun Mehta (ENG)
update public.profiles set points_balance = 30,  xp = 0   where id = '6a777d0b-d43e-49cb-ba3f-720a51c21902'; -- Rahul Verma (ENG)
update public.profiles set points_balance = 30,  xp = 0   where id = '43cbc079-ea72-468f-87bb-e7e08d8c7b80'; -- Vikram Nair (FIN)

-- Badge catalogue (Lucide icon names; rule types match fn_evaluate_badges)
insert into public.badges (id, name, description, unlock_rule, icon) values
 ('ba000001-0000-0000-0000-000000000001', 'Community Champion',    'Complete an approved CSR activity.', '{"type":"participations_approved","gte":1}', 'HeartHandshake'),
 ('ba000001-0000-0000-0000-000000000002', 'Rising Star',           'Earn 100 XP.',                       '{"type":"xp","gte":100}',                    'Star'),
 ('ba000001-0000-0000-0000-000000000003', 'Sustainability Leader', 'Earn 300 XP.',                       '{"type":"xp","gte":300}',                    'Trophy'),
 ('ba000001-0000-0000-0000-000000000004', 'Challenge Finisher',    'Complete two approved challenges.',  '{"type":"challenges_completed","gte":2}',    'Medal');

-- Rewards catalogue
insert into public.rewards (id, name, description, points_required, stock, status) values
 ('bb000001-0000-0000-0000-000000000001', 'Eco Tote Bag',            'Organic-cotton branded tote.',        150, 50,  'active'),
 ('bb000001-0000-0000-0000-000000000002', 'Tree Planted in Your Name','We plant a tree on your behalf.',    500, 100, 'active'),
 ('bb000001-0000-0000-0000-000000000003', 'Coffee Voucher',          'Voucher for the campus cafe.',        120, 40,  'active'),
 ('bb000001-0000-0000-0000-000000000004', 'Extra Day Off',           'One additional paid day of leave.',  5000, 20,  'active');

-- Evaluate badges for everyone (awards Community Champion / Rising Star, etc.)
do $$
declare r record;
begin
  for r in select id from public.profiles where role <> 'admin' loop
    perform public.fn_evaluate_badges(r.id);
  end loop;
end $$;

-- A completed reward redemption (Meera redeems the Coffee Voucher: 100 balance is short,
-- so use the Eco Tote for someone with enough — award via the transactional function).
-- Give Meera enough for the tote to make the redemption believable, then redeem.
update public.profiles set points_balance = 200 where id = '851f51a1-360b-4fe2-9398-f165c1508e41';
select public.redeem_reward('851f51a1-360b-4fe2-9398-f165c1508e41', 'bb000001-0000-0000-0000-000000000001');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Recompute scores for all departments + org snapshot
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select id from public.departments loop
    perform public.fn_recompute_department_score(r.id);
  end loop;
end $$;
select public.fn_recompute_org_score();

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Backfill org score snapshots for a rising 6-month trend (outside txn ok)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.org_score_snapshots (snapshot_date, overall_esg, environmental, social, governance)
select d::date,
       round(58 + (m * 2.2), 1),
       round(60 + (m * 2.0), 1),
       round(50 + (m * 2.6), 1),
       round(64 + (m * 1.4), 1)
from (
  select generate_series(date_trunc('month', current_date) - interval '6 months',
                         date_trunc('month', current_date) - interval '1 month',
                         interval '1 month') as d,
         row_number() over () - 1 as m
) s(d, m)
on conflict (snapshot_date) do nothing;

-- Seed Departments
insert into public.departments (id, name, code) values 
('11111111-1111-1111-1111-111111111111', 'Engineering', 'ENG'),
('22222222-2222-2222-2222-222222222222', 'Marketing', 'MKT'),
('33333333-3333-3333-3333-333333333333', 'HR', 'HR'),
('44444444-4444-4444-4444-444444444444', 'Finance', 'FIN')
on conflict (id) do update set name = excluded.name, code = excluded.code;

-- Settings (Singleton)
insert into public.esg_settings (id, env_weight, social_weight, gov_weight)
values (1, 0.40, 0.30, 0.30)
on conflict (id) do nothing;

-- Roles and department allocations for profiles auto-created by auth trigger
-- Admin
update public.profiles set role = 'admin' where email = 'admin@ecosphere.test';
-- Manager
update public.profiles set role = 'manager', department_id = '11111111-1111-1111-1111-111111111111' where email = 'manager@ecosphere.test';
-- Employee
update public.profiles set role = 'employee', department_id = '11111111-1111-1111-1111-111111111111' where email = 'employee@ecosphere.test';
-- Extra employees
update public.profiles set role = 'employee', department_id = '22222222-2222-2222-2222-222222222222' where email = 'emp2@ecosphere.test';
update public.profiles set role = 'employee', department_id = '33333333-3333-3333-3333-333333333333' where email = 'emp3@ecosphere.test';

-- Dept Head (Manager is head of ENG)
update public.departments set head_id = (select id from public.profiles where email = 'manager@ecosphere.test') where id = '11111111-1111-1111-1111-111111111111';

-- Categories
insert into public.categories (id, name, type) values
('55555555-5555-5555-5555-555555555555', 'Community Service', 'csr_activity'),
('66666666-6666-6666-6666-666666666666', 'Health & Wellness', 'challenge')
on conflict (id) do nothing;

-- Emission factors
insert into public.emission_factors (id, name, source_type, unit, factor_kgco2e, status) values
('77777777-7777-7777-7777-777777777771', 'Grid Electricity', 'energy', 'kWh', 0.5, 'active'),
('77777777-7777-7777-7777-777777777772', 'Company Vehicle', 'fleet', 'km', 0.25, 'active'),
('77777777-7777-7777-7777-777777777773', 'Office Supplies', 'purchase', 'USD', 0.1, 'active'),
('77777777-7777-7777-7777-777777777774', 'Manufacturing Line A', 'manufacturing', 'unit', 1.5, 'active')
on conflict (id) do nothing;

-- Goal
insert into public.environmental_goals (id, name, department_id, metric, baseline, target, target_date) values
('88888888-8888-8888-8888-888888888888', 'Reduce Paper Usage', '11111111-1111-1111-1111-111111111111', 'kg', 100, 50, '2026-12-31')
on conflict (id) do nothing;

-- Policy (Owner is Admin)
insert into public.esg_policies (id, name, pillar, body, version, effective_date, requires_ack, owner_id) values
('99999999-9999-9999-9999-999999999999', 'Zero Waste Policy', 'environmental', 'We are committed to zero waste.', '1.0', '2026-01-01', true, (select id from public.profiles where email = 'admin@ecosphere.test'))
on conflict (id) do nothing;

-- Badge
insert into public.badges (id, name, description, unlock_rule, icon) values
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Green Pioneer', 'First environmental goal achieved', '{"type":"goal","count":1}', 'award')
on conflict (id) do nothing;

-- Reward
insert into public.rewards (id, name, description, points_required, stock) values
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Extra Day Off', 'One extra day of PTO', 5000, 100)
on conflict (id) do nothing;

-- Product Profile
insert into public.product_esg_profiles (id, product_name, sku, carbon_per_unit, recyclable_pct, emission_factor_id) values
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Eco Widget', 'WIDG-001', 2.5, 95.0, '77777777-7777-7777-7777-777777777774')
on conflict (id) do nothing;

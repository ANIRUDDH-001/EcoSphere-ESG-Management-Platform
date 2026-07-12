-- b1_02: private csr-proofs storage bucket + policies
-- employees upload their own proof; managers/admin can read for review

-- Create the storage bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'csr-proofs',
  'csr-proofs',
  false,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;

-- Policy: authenticated owner can upload their own objects
create policy "csr_proofs_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'csr-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: owner can read their own objects
create policy "csr_proofs_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'csr-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: managers and admins can read all objects (for review)
create policy "csr_proofs_select_manager_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'csr-proofs'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('manager', 'admin')
    )
  );

-- Policy: owner can update/replace their own upload
create policy "csr_proofs_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'csr-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

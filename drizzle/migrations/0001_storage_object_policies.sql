-- predictiv_data: owner-scoped, first folder is the user id
CREATE POLICY "predictiv_data_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'predictiv_data' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "predictiv_data_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'predictiv_data' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "predictiv_data_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'predictiv_data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- user_documents: owner-scoped
CREATE POLICY "user_documents_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user_documents_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user_documents_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user_documents_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars: private bucket, owner writes, any signed-in user may read (profile pictures)
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_select_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
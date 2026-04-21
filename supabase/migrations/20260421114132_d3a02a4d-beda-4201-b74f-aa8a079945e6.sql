DROP POLICY IF EXISTS "notifications_insert_any_auth" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'sales_manager'::app_role)
  );

DROP POLICY IF EXISTS "inbox_insert" ON public.inbox_messages;
CREATE POLICY "inbox_insert" ON public.inbox_messages FOR INSERT TO authenticated
  WITH CHECK (NOT has_role(auth.uid(), 'viewer'::app_role));
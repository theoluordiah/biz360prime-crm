-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_manager', 'sales_rep', 'viewer');
CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'cold');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table — security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'sales_manager' THEN 2
    WHEN 'sales_rep' THEN 3
    WHEN 'viewer' THEN 4
  END
  LIMIT 1
$$;

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_title TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  temperature lead_temperature DEFAULT 'warm',
  tags TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Pipeline stages
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT NOT NULL,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  source TEXT,
  industry TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_close_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Activities (timeline)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'note','email','call','meeting','stage_change'
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Email templates
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  tone TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Activity log (audit)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_u BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_companies_u BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_contacts_u BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_deals_u BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Track stage_changed_at on deals
CREATE OR REPLACE FUNCTION public.track_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_deals_stage BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.track_stage_change();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  -- First user becomes admin, others sales_rep
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first_user;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first_user THEN 'admin'::app_role ELSE 'sales_rep'::app_role END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS POLICIES =====

-- Profiles: viewable by all authenticated, updatable by self or admin
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- User roles: only admin can write; everyone authenticated can read (for UI)
CREATE POLICY "roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert_admin" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_update_admin" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_delete_admin" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Helper: can the user see all (admin/manager/viewer) vs only own (sales_rep)?
-- Companies
CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
  OR public.has_role(auth.uid(), 'viewer') OR owner_id = auth.uid()
);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (
  NOT public.has_role(auth.uid(), 'viewer')
);
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager') OR owner_id = auth.uid()
);
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
);

-- Contacts
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
  OR public.has_role(auth.uid(), 'viewer') OR owner_id = auth.uid()
);
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (
  NOT public.has_role(auth.uid(), 'viewer')
);
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager') OR owner_id = auth.uid()
);
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
);

-- Pipeline stages — readable by all authenticated; writable by admin/manager
CREATE POLICY "stages_select" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "stages_insert" ON public.pipeline_stages FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
);
CREATE POLICY "stages_update" ON public.pipeline_stages FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
);
CREATE POLICY "stages_delete" ON public.pipeline_stages FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Deals
CREATE POLICY "deals_select" ON public.deals FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
  OR public.has_role(auth.uid(), 'viewer') OR owner_id = auth.uid()
);
CREATE POLICY "deals_insert" ON public.deals FOR INSERT TO authenticated WITH CHECK (
  NOT public.has_role(auth.uid(), 'viewer')
);
CREATE POLICY "deals_update" ON public.deals FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager') OR owner_id = auth.uid()
);
CREATE POLICY "deals_delete" ON public.deals FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager')
);

-- Activities
CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "activities_delete" ON public.activities FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Email templates
CREATE POLICY "templates_select" ON public.email_templates FOR SELECT TO authenticated USING (
  owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "templates_insert" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "templates_update" ON public.email_templates FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "templates_delete" ON public.email_templates FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Audit log: admin reads, all authenticated insert
CREATE POLICY "audit_select_admin" ON public.audit_log FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR actor_id = auth.uid()
);
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- Seed default pipeline stages
INSERT INTO public.pipeline_stages (name, position, is_won, is_lost) VALUES
  ('Lead', 1, false, false),
  ('Qualified', 2, false, false),
  ('Proposal', 3, false, false),
  ('Negotiation', 4, false, false),
  ('Won', 5, true, false),
  ('Lost', 6, false, true);

-- Indexes
CREATE INDEX idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_deals_stage ON public.deals(stage_id);
CREATE INDEX idx_deals_owner ON public.deals(owner_id);
CREATE INDEX idx_activities_contact ON public.activities(contact_id);
CREATE INDEX idx_activities_deal ON public.activities(deal_id);
-- Multi-branch RLS: branch_id = tenant_id
-- Roles: OWNER (all branches), SENIOR_ADMIN / ADMIN (own branch)

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — read profiles safely under RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()::text AND role = 'OWNER'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_branch_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(target_branch_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_owner()
    OR public.user_branch_id() = target_branch_id;
$$;

CREATE OR REPLACE FUNCTION public.is_senior_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_role() IN ('OWNER', 'SENIOR_ADMIN');
$$;

-- ---------------------------------------------------------------------------
-- Auto-create profile on Supabase Auth signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, branch_id, updated_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'ADMIN'::"Role",
    NEW.raw_user_meta_data->>'branch_id',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------

CREATE POLICY "branches_select"
  ON public.branches FOR SELECT TO authenticated
  USING (public.is_owner() OR id = public.user_branch_id());

CREATE POLICY "branches_insert"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());

CREATE POLICY "branches_update"
  ON public.branches FOR UPDATE TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "branches_delete"
  ON public.branches FOR DELETE TO authenticated
  USING (public.is_owner());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid()::text OR public.is_owner());

CREATE POLICY "profiles_select_branch"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_senior_or_owner()
    AND branch_id IS NOT NULL
    AND branch_id = public.user_branch_id()
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------

CREATE POLICY "employees_select"
  ON public.employees FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY "employees_insert"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_senior_or_owner() AND public.can_access_branch(branch_id));

CREATE POLICY "employees_update"
  ON public.employees FOR UPDATE TO authenticated
  USING (public.is_senior_or_owner() AND public.can_access_branch(branch_id))
  WITH CHECK (public.is_senior_or_owner() AND public.can_access_branch(branch_id));

CREATE POLICY "employees_delete"
  ON public.employees FOR DELETE TO authenticated
  USING (public.is_owner() AND public.can_access_branch(branch_id));

-- ---------------------------------------------------------------------------
-- shifts
-- ---------------------------------------------------------------------------

CREATE POLICY "shifts_select_owner"
  ON public.shifts FOR SELECT TO authenticated
  USING (public.is_owner());

CREATE POLICY "shifts_select_branch"
  ON public.shifts FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY "shifts_select_own"
  ON public.shifts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = shifts.employee_id
        AND e.profile_id = auth.uid()::text
    )
  );

CREATE POLICY "shifts_insert"
  ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.is_senior_or_owner() AND public.can_access_branch(branch_id));

CREATE POLICY "shifts_update"
  ON public.shifts FOR UPDATE TO authenticated
  USING (public.is_senior_or_owner() AND public.can_access_branch(branch_id))
  WITH CHECK (public.is_senior_or_owner() AND public.can_access_branch(branch_id));

CREATE POLICY "shifts_delete"
  ON public.shifts FOR DELETE TO authenticated
  USING (public.is_owner());

-- ---------------------------------------------------------------------------
-- inventory_items (via shift.branch_id)
-- ---------------------------------------------------------------------------

CREATE POLICY "inventory_select"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = inventory_items.shift_id
        AND (
          public.is_owner()
          OR public.can_access_branch(s.branch_id)
          OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = s.employee_id AND e.profile_id = auth.uid()::text
          )
        )
    )
  );

CREATE POLICY "inventory_insert"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = inventory_items.shift_id
        AND (
          public.can_access_branch(s.branch_id)
          OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = s.employee_id AND e.profile_id = auth.uid()::text
          )
        )
    )
  );

CREATE POLICY "inventory_update"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = inventory_items.shift_id
        AND (
          public.is_senior_or_owner() AND public.can_access_branch(s.branch_id)
          OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = s.employee_id AND e.profile_id = auth.uid()::text
          )
        )
    )
  );

CREATE POLICY "inventory_delete"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (public.is_senior_or_owner());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

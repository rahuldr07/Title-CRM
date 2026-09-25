GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
    EXECUTE format('ALTER ROLE %I BYPASSRLS', current_user);
  ELSIF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls) THEN
    RAISE WARNING
      'Role % has neither superuser nor BYPASSRLS. npm run db:seed will be refused by the policies below; grant BYPASSRLS or seed first.',
      current_user;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'roles', 'people', 'departments', 'products', 'clients', 'counties',
    'county_links', 'levels', 'orders', 'order_stages', 'order_events',
    'invoices', 'leads', 'lead_notes', 'leave_requests', 'attendance',
    'pay_runs', 'payslips', 'petty_cash', 'loans', 'loan_payments', 'openings', 'candidates',
    'assignment_rules', 'sla_rules', 'stage_budgets', 'tenant_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
    $f$, t);
  END LOOP;
END
$$;

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
CREATE POLICY tenant_isolation ON role_permissions
  USING (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND r.tenant_id = app_current_tenant()))
  WITH CHECK (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND r.tenant_id = app_current_tenant()));

ALTER TABLE people_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_departments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON people_departments;
CREATE POLICY tenant_isolation ON people_departments
  USING (EXISTS (SELECT 1 FROM people p WHERE p.id = person_id AND p.tenant_id = app_current_tenant()))
  WITH CHECK (EXISTS (SELECT 1 FROM people p WHERE p.id = person_id AND p.tenant_id = app_current_tenant()));

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self ON tenants;
CREATE POLICY tenant_self ON tenants
  USING (id = app_current_tenant())
  WITH CHECK (id = app_current_tenant());

CREATE OR REPLACE FUNCTION app_memberships(p_user_id text)
RETURNS TABLE (tenant_id uuid, slug text, name text, plan text, state text, person_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug, t.name, t.plan, t.state, p.id
  FROM people p
  JOIN tenants t ON t.id = p.tenant_id
  WHERE p.user_id = p_user_id
    AND p.active
  ORDER BY t.name
$$;

REVOKE ALL ON FUNCTION app_memberships(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_memberships(text) TO app_user;

CREATE OR REPLACE FUNCTION public.__apply_schema_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION public.__apply_schema_sql(text) FROM PUBLIC, anon, authenticated;
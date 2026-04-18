CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.track_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
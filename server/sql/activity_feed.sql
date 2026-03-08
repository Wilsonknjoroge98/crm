CREATE OR REPLACE FUNCTION notify_policy_created()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
v_first_name text;
  v_last_name text;
  v_client_name text;
  v_event_text text;
BEGIN
  -- look up client name
SELECT first_name, last_name
INTO v_first_name, v_last_name
FROM clients
WHERE id = NEW.client_id;

IF v_first_name IS NULL AND v_last_name IS NULL THEN
    v_client_name := 'Unknown client';
ELSE
    v_client_name := concat_ws(' ', v_first_name, v_last_name);
END IF;

  -- construct event text with effective_date formatted as YYYY-MM-DD
  v_event_text := format(
    'Policy created for client %s (effective on %s)',
    v_client_name,
    to_char(NEW.effective_date, 'YYYY-MM-DD')
  );

INSERT INTO activity_feed ("agent_id", "policy_id", "event", "amount", "createdAt")
VALUES (NEW.writing_agent_id, NEW.id, v_event_text, NEW.premium_amount, NEW.created_at);

RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS policy_created_trigger ON policies;

CREATE TRIGGER policy_created_trigger
    AFTER INSERT ON policies
    FOR EACH ROW
    EXECUTE FUNCTION notify_policy_created();
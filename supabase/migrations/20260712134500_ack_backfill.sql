CREATE OR REPLACE FUNCTION fn_ensure_acks(p_policy_id uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO policy_acknowledgements (policy_id, employee_id, status)
    SELECT p_policy_id, id, 'pending'
    FROM profiles
    WHERE NOT EXISTS (
        SELECT 1 FROM policy_acknowledgements 
        WHERE policy_id = p_policy_id AND employee_id = profiles.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_policy_ack_backfill()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.requires_ack = true AND NEW.status = 'active' THEN
        PERFORM fn_ensure_acks(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_policy_ack_backfill_trigger ON esg_policies;
CREATE TRIGGER trg_policy_ack_backfill_trigger
AFTER INSERT OR UPDATE ON esg_policies
FOR EACH ROW
EXECUTE FUNCTION trg_policy_ack_backfill();

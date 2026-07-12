CREATE OR REPLACE FUNCTION fn_send_ack_reminders()
RETURNS void AS $$
DECLARE
    v_count INT := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT pa.id, pa.employee_id, pa.policy_id, pa.reminder_count, p.name AS policy_name
        FROM policy_acknowledgements pa
        JOIN esg_policies p ON p.id = pa.policy_id
        WHERE pa.status = 'pending'
        -- pending ack older than 3 days
        AND pa.created_at < now() - interval '3 days'
        -- check idempotency: not reminded today
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = pa.employee_id
              AND n.type = 'policy_reminder'
              AND (n.payload->>'policy_id')::uuid = pa.policy_id
              AND n.created_at >= current_date
        )
    LOOP
        -- increment reminder count
        UPDATE policy_acknowledgements
        SET reminder_count = COALESCE(reminder_count, 0) + 1
        WHERE id = r.id;

        -- call create_notification
        PERFORM create_notification(
            r.employee_id,
            'policy_reminder',
            'Please acknowledge policy: ' || r.policy_name,
            'Your acknowledgment is required for ' || r.policy_name,
            jsonb_build_object('policy_id', r.policy_id)
        );

        v_count := v_count + 1;
    END LOOP;

    -- log run
    INSERT INTO job_runs (job_name, affected_count, ran_at)
    VALUES ('policy_ack_reminders', v_count, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- schedule via pg_cron if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule('policy_ack_reminders_daily', '0 9 * * *', 'SELECT fn_send_ack_reminders();');
  END IF;
END
$$;

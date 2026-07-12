CREATE OR REPLACE FUNCTION fn_flag_overdue_issues()
RETURNS void AS $$
DECLARE
    v_count INT := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT id, owner_id, description
        FROM compliance_issues
        WHERE status = 'open'
        AND is_overdue = false
        AND due_date < current_date
    LOOP
        -- flag as overdue
        UPDATE compliance_issues
        SET is_overdue = true
        WHERE id = r.id;

        -- call create_notification
        PERFORM create_notification(
            r.owner_id,
            'issue_overdue',
            'Overdue Compliance Issue',
            'Your compliance issue "' || r.description || '" is overdue.',
            jsonb_build_object('issue_id', r.id)
        );

        v_count := v_count + 1;
    END LOOP;

    -- log run
    INSERT INTO job_runs (job_name, affected_count, ran_at)
    VALUES ('flag_overdue_issues', v_count, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- schedule via pg_cron if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule('flag_overdue_issues_daily', '0 10 * * *', 'SELECT fn_flag_overdue_issues();');
  END IF;
END
$$;

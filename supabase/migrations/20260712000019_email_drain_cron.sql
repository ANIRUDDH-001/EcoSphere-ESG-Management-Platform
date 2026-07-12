-- b3_05: Add emailed_at column and pg_cron job for email drain

-- 1. Add column to track email status (idempotency)
ALTER TABLE public.notifications ADD COLUMN emailed_at timestamptz;

-- 2. Create function to drain emails
CREATE OR REPLACE FUNCTION public.fn_drain_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected_count int := 0;
    v_notify_email boolean;
    v_notif record;
    v_request_id bigint;
BEGIN
    -- Check if globally enabled (assumes id=1 for esg_settings)
    SELECT notify_email INTO v_notify_email FROM public.esg_settings WHERE id = 1;

    IF v_notify_email THEN
        -- Find pending notifications (up to 50 per batch)
        FOR v_notif IN 
            SELECT n.id, n.type, p.email, p.full_name
            FROM public.notifications n
            JOIN public.profiles p ON n.employee_id = p.id
            WHERE n.emailed_at IS NULL
            LIMIT 50
            FOR UPDATE OF n SKIP LOCKED
        LOOP
            -- Send to Cloud Run API via pg_net
            -- This is an async fire-and-forget call; if it fails, the row won't be re-tried because we mark it emailed_at
            -- In a true robust system, we would await response, but pg_net is async. We just mark it here.
            SELECT net.http_post(
                url:='http://api:8080/email/send',
                body:=json_build_object(
                    'to', v_notif.email,
                    'type', v_notif.type,
                    'title', 'New ' || v_notif.type || ' Notification',
                    'body', 'Hello ' || v_notif.full_name || ', you have a new notification of type ' || v_notif.type || ' in EcoSphere.'
                )::jsonb,
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer dev-metrics-token"}'::jsonb
            ) INTO v_request_id;

            UPDATE public.notifications SET emailed_at = now() WHERE id = v_notif.id;
            v_affected_count := v_affected_count + 1;
        END LOOP;
    END IF;

    -- Log to job_runs
    INSERT INTO public.job_runs (job_name, affected_count, status, details)
    VALUES (
        'email_drain', 
        v_affected_count, 
        'success', 
        jsonb_build_object('notify_email_enabled', v_notify_email)
    );

    RAISE NOTICE 'Drained % emails', v_affected_count;
END;
$$;

-- 3. Schedule job via pg_cron
-- Remove if exists
SELECT cron.unschedule('email-drain-job');

-- Schedule every minute
SELECT cron.schedule(
    'email-drain-job',
    '* * * * *',
    $$ SELECT public.fn_drain_emails(); $$
);

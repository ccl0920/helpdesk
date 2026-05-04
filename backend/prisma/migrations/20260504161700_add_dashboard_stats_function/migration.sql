CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  v_total BIGINT;
  v_open BIGINT;
  v_ai_resolved BIGINT;
  v_avg_seconds NUMERIC;
  v_avg_hours NUMERIC;
  v_percent_ai NUMERIC;
  v_tickets_per_day JSON;
BEGIN
  SELECT COUNT(*) INTO v_total FROM ticket;
  SELECT COUNT(*) INTO v_open FROM ticket WHERE status = 'OPEN';
  SELECT COUNT(*) INTO v_ai_resolved FROM ticket WHERE "resolvedBy" = 'AI';

  SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) INTO v_avg_seconds
  FROM ticket WHERE status = 'RESOLVED';

  v_avg_hours := CASE
    WHEN v_avg_seconds IS NOT NULL THEN ROUND((v_avg_seconds / 3600)::numeric, 1)
    ELSE NULL
  END;

  v_percent_ai := CASE
    WHEN v_total > 0 THEN ROUND((v_ai_resolved::numeric / v_total::numeric) * 100, 1)
    ELSE 0
  END;

  SELECT json_agg(
    json_build_object('date', (d.dt)::date, 'count', COALESCE(t.count, 0))
    ORDER BY d.dt
  ) INTO v_tickets_per_day
  FROM generate_series(
    CURRENT_DATE - INTERVAL '29 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS d(dt)
  LEFT JOIN (
    SELECT DATE("createdAt") AS day, COUNT(*)::int AS count
    FROM ticket
    WHERE "createdAt" >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY DATE("createdAt")
  ) t ON (d.dt)::date = t.day;

  RETURN json_build_object(
    'total', v_total,
    'open', v_open,
    'aiResolved', v_ai_resolved,
    'percentAiResolved', v_percent_ai,
    'avgResolutionTimeHours', v_avg_hours,
    'ticketsPerDay', COALESCE(v_tickets_per_day, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql;

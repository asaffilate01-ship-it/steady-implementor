# Incident response

## Severity

- **SEV-1:** confirmed sensitive-data exposure, payment integrity loss, active credential compromise or platform-wide outage.
- **SEV-2:** material tenant isolation failure, major provider/payment degradation or sustained elevated errors.
- **SEV-3:** limited defect with a workaround and no confirmed confidentiality or financial impact.

## First response

1. Name an incident lead and open a restricted incident record.
2. Preserve request IDs, audit events, webhook events, deployment SHA and provider logs.
3. Contain the issue: disable the affected adapter or feature flag, revoke credentials, or block a route at the edge.
4. Do not destroy evidence or rewrite migration history.
5. Restore service through a reviewed forward fix or a rehearsed deployment rollback.

## Security and privacy handling

Determine which people, tenants, data fields, countries and time ranges are affected. Involve the data protection and legal contacts immediately for suspected personal-data compromise. Qualified counsel must determine regulatory and customer notification obligations and deadlines.

## Recovery and follow-up

Reconcile payments and settlements, verify row-level policies, rotate exposed credentials, and run smoke tests before closing containment. Produce a blameless review with timeline, root cause, control gaps, owners and due dates. Add an automated regression test wherever practical.

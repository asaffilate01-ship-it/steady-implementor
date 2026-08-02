## Summary

Describe the user-facing change, the reason for it and any release risk.

## Verification

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm run security:audit`
- [ ] `npm run security:audit:all`
- [ ] `npm run test:e2e` for UI, routing, authentication or API changes
- [ ] New or changed migrations were rehearsed against staging

## Release safety

- [ ] No `.env`, credentials, private keys or production data are included
- [ ] Generated files were rebuilt and committed
- [ ] Changes to payments, providers, roles or RLS include failure-path testing
- [ ] Feature flags remain safe for production
- [ ] Rollback impact and required operational actions are documented

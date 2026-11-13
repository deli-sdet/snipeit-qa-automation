# Part 1 — Questions / Ambiguities for Product & Development

To clarify before sign-off:

1. **API error contract.** The API reference lists a *200* response for validation errors. Is HTTP 200 with `{"status":"error"}` the intended contract, or should validation failures return 4xx (e.g. 422)? Integrators that check only status codes will treat failed creates/updates as successful (risk R2).
2. **Which attributes are "safe/editable" and who may edit them?** Are `name` and `notes` editable by every role with *Assets: Edit*, or are some fields restricted? Should edits to a **checked-out** asset be allowed, and should they be audited the same way?
3. **Asset tag uniqueness rules.** Is uniqueness enforced against **soft-deleted** assets too? Case-sensitive (`qa-1` vs `QA-1`)? Trimmed whitespace? What should happen when two users submit the same auto-incremented tag at the same time?
4. **Checkout rules.** Which status labels are deployable? Should checkout be blocked for *Pending/Archived* assets, and can an already-assigned asset be checked out again without a checkin? Is `expected_checkin` mandatory for any asset category?
5. **Demo environment constraints.** How often does the demo reset, and are deletes/API-token generation intentionally blocked in demo mode? For CI, can we get a dedicated instance (Docker) with a seeded DB and a service-account token instead of the shared demo?
6. **Field limits.** Confirm max lengths for `name`, `serial`, `notes` and accepted characters, so boundary tests use the documented values, not ones inferred from code.
7. **Timestamps & time zone.** Is `updated_at` stored in UTC and shown in the user's locale? This affects "updated in the last 7 days" queries (Part 4) and UI-vs-API comparisons.

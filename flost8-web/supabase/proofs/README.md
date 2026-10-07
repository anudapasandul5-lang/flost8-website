# SQL proofs

In-memory Postgres (PGlite) with Supabase stubs, run against the real migrations. They touch no live database.

```
npm i --no-save @electric-sql/pglite
node supabase/proofs/contacts_rls.proof.mjs       # migrations 010 + 011 + 012: RLS, merge/undo, publish hold, history, notes, reminders, purge, snooze, manager whatsapp
node supabase/proofs/contacts_scripts.proof.mjs   # seed script, intake linking, cutover script
node supabase/proofs/phase2_security.proof.mjs    # attacker view of the whole chain: whatsapp column, sheet rows, owner-only functions, contact_stats
```

All three exit non-zero on any failure. `pglite` is deliberately not in package.json.

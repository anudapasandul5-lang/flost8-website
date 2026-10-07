# SQL proofs

In-memory Postgres (PGlite) with Supabase stubs, run against the real migrations. They touch no live database.

```
npm i --no-save @electric-sql/pglite
node supabase/proofs/contacts_rls.proof.mjs       # migrations 010 + 011: RLS, merge/undo, publish hold, history, notes, reminders, purge
node supabase/proofs/contacts_scripts.proof.mjs   # seed script, intake linking, cutover script
```

Both exit non-zero on any failure. `pglite` is deliberately not in package.json.

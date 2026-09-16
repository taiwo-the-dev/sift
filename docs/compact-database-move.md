# Compact Supabase database move

Sift keeps every indexed ERC-8004 identity. This move reduces storage by
removing duplicated raw-text search indexes and replacing the old discovery
copy with one bounded record per agent.

The old project remains the source and rollback copy until the new project has
passed validation. The transfer never deletes or updates the source.

## Local variables

Keep the current project in the normal variables and put the new project in the
temporary variables:

```dotenv
SUPABASE_URL=https://OLD_PROJECT.supabase.co
SUPABASE_SECRET_KEY=OLD_SERVER_SECRET
COMPACT_SUPABASE_URL=https://NEW_PROJECT.supabase.co
COMPACT_SUPABASE_SECRET_KEY=NEW_SERVER_SECRET
SUPABASE_DB_PASSWORD=NEW_PROJECT_DATABASE_PASSWORD
```

All five values are local or deployment secrets. Never commit `.env.local`.

## Apply and copy

Link the CLI to the new project, inspect the dry run, apply the complete schema,
then start the resumable transfer:

```bash
npx supabase link --project-ref NEW_PROJECT_REFERENCE
npm run db:push:dry-run
npm run db:push
npm run db:transfer:compact
```

The transfer copies canonical agents, services, category evidence, health,
reputation, scores, sync checkpoints, and hiring history. It does not copy
short-lived dashboard challenges, sessions, or MCP approval tokens. Users must
reconnect their wallet after the cutover.

If the network stops, run `npm run db:transfer:compact` again. UUID-keyed large
tables resume after the last target record and all writes are idempotent.

## Validate before switching

The transfer finishes by rebuilding discovery and checking that the agent and
discovery counts match. Do not switch Sift if that check fails.

After it passes:

1. Replace local `SUPABASE_URL` and `SUPABASE_SECRET_KEY` with the new values.
2. Run `npm run report:catalogue` and open discovery, filters, search, profiles,
   bookmarks, compare, and task history on both BSC networks.
3. Replace the same two secrets in GitHub Actions and Vercel.
4. Redeploy and run the release smoke test.
5. Keep the old project unchanged until the production checks pass.

The `COMPACT_SUPABASE_*` variables are migration-only and can be removed after
the cutover.

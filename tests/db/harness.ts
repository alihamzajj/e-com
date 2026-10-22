/**
 * In-process Postgres (PGlite) with the minimum of Supabase's platform objects
 * (auth.users, auth.uid(), storage, API roles) so the real migrations and RLS
 * policies can be exercised without Docker or a hosted project.
 */
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ), ''
  )::uuid;
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
`;

export type Actor = { kind: "anon" } | { kind: "user"; id: string } | { kind: "service" };
export const anon: Actor = { kind: "anon" };
export const service: Actor = { kind: "service" };
export const user = (id: string): Actor => ({ kind: "user", id });

export class TestDb {
  readonly db: PGlite;
  private constructor(db: PGlite) {
    this.db = db;
  }

  static async create(options: { seed?: boolean } = {}) {
    const db = new PGlite();
    await db.exec(SUPABASE_STUBS);
    const dir = path.join(process.cwd(), "supabase", "migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      try {
        await db.exec(readFileSync(path.join(dir, file), "utf8"));
      } catch (error) {
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
    if (options.seed) {
      await db.exec(readFileSync(path.join(process.cwd(), "supabase", "seed.sql"), "utf8"));
    }
    return new TestDb(db);
  }

  /** Run SQL as a Supabase API role, like PostgREST does for each request. */
  async as<T = Record<string, unknown>>(actor: Actor, sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.transaction(async (tx: Transaction) => {
      await applyActor(tx, actor);
      const result = await tx.query<T>(sql, params);
      return result.rows;
    });
  }

  async one<T = Record<string, unknown>>(actor: Actor, sql: string, params: unknown[] = []): Promise<T> {
    const rows = await this.as<T>(actor, sql, params);
    if (rows.length !== 1) throw new Error(`Expected one row, got ${rows.length}`);
    return rows[0];
  }

  /** Superuser access for fixtures. */
  async sql<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.db.query<T>(sql, params)).rows;
  }

  async createUser(email: string, role: "customer" | "staff" | "admin" = "customer", permissions: string[] = []) {
    const [row] = await this.sql<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
      [email, JSON.stringify({ full_name: email.split("@")[0] })],
    );
    if (role !== "customer") {
      await this.sql(`update public.profiles set role = $2, permissions = $3 where id = $1`, [row.id, role, permissions]);
    }
    return row.id;
  }

  async close() {
    await this.db.close();
  }
}

async function applyActor(tx: Transaction, actor: Actor) {
  if (actor.kind === "anon") {
    await tx.exec(`set local role anon`);
    await tx.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
  } else if (actor.kind === "service") {
    await tx.exec(`set local role service_role`);
    await tx.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
  } else {
    await tx.exec(`set local role authenticated`);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: actor.id, role: "authenticated" }),
    ]);
  }
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Run the actual migrations and RLS policies in disposable PostgreSQL/WASM.
// No live Supabase database or production credentials are used.
test("notification triggers and per-user permissions", async (t) => {
  const db = new PGlite();
  const first = "00000000-0000-0000-0000-000000000001";
  const second = "00000000-0000-0000-0000-000000000002";
  const admin = "00000000-0000-0000-0000-000000000003";
  async function login(id, email) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.email', $2, false)",
      [id, email],
    );
    await db.exec("set role authenticated");
  }
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
      grant usage on schema auth to authenticated;
      create table public.leads(id uuid primary key default gen_random_uuid(), source text, status text, name text);
      create table public.followups(id uuid primary key default gen_random_uuid(), lead_id uuid references public.leads(id) on delete cascade, status text);
      insert into auth.users values ('${first}'), ('${second}'), ('${admin}');
    `);
    for (const file of [
      "page-access.sql",
      "flexible-imports.sql",
      "personal-workspaces.sql",
      "page-names.sql",
      "custom-sections.sql",
      "activity-notifications.sql",
      "google-sheets-connections.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/${file}`, import.meta.url), "utf8"),
      );
    }
    // Installation is repeatable and does not duplicate triggers.
    await db.exec(
      await readFile(
        new URL("../supabase/activity-notifications.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`insert into public.crm_admins values ('${admin}')`);
    await login(first, "first@example.com");
    const ownSource = `Personal leads / ${first}`;
    const lead = (
      await db.query(
        "insert into leads(source,status,name) values ($1,'new','Private contact') returning id",
        [ownSource],
      )
    ).rows[0];

    await t.test("a personal lead generates a readable event for its owner", async () => {
      const { rows } = await db.query("select * from crm_activity");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].message, "New lead added");
      assert.equal(rows[0].actor_id, first);
      assert.equal(rows[0].entity_id, lead.id);
    });
    await t.test(
      "other normal users cannot read or forge its notifications",
      async () => {
        await login(second, "second@example.com");
        assert.equal((await db.query("select * from crm_activity")).rows.length, 0);
        await assert.rejects(
          db.query(
            "insert into crm_activity(source,section,message) values ($1,'leads','Fake update')",
            [ownSource],
          ),
          /permission denied/,
        );
      },
    );
    await t.test(
      "status, follow-ups, rename and bulk imports generate activity",
      async () => {
        await login(first, "first@example.com");
        await db.query("update leads set status='contacted' where id=$1", [lead.id]);
        await db.query("insert into followups(lead_id,status) values ($1,'pending')", [
          lead.id,
        ]);
        await db.query(
          "insert into crm_page_labels(source,name) values ($1,'My campaign')",
          [ownSource],
        );
        await db.query(
          'insert into crm_import_rows(source,fields) values ($1,\'{"Name":"One"}\'), ($1,\'{"Name":"Two"}\')',
          [ownSource],
        );
        const { rows } = await db.query("select message from crm_activity");
        assert.ok(rows.some((row) => row.message === "Lead status changed to contacted"));
        assert.ok(rows.some((row) => row.message === "Follow-up scheduled"));
        assert.ok(rows.some((row) => row.message === "Page renamed to My campaign"));
        assert.equal(
          rows.filter((row) => row.message === "2 file rows imported").length,
          1,
        );
      },
    );
    await t.test(
      "read status belongs to each account and requires event access",
      async () => {
        const eventId = (await db.query("select id from crm_activity limit 1")).rows[0]
          .id;
        await db.query(
          "insert into crm_activity_reads(event_id,user_id) values ($1,$2)",
          [eventId, first],
        );
        await assert.rejects(
          db.query("insert into crm_activity_reads(event_id,user_id) values ($1,$2)", [
            eventId,
            second,
          ]),
          /row-level security/,
        );
        await login(second, "second@example.com");
        assert.equal((await db.query("select * from crm_activity_reads")).rows.length, 0);
        await assert.rejects(
          db.query("insert into crm_activity_reads(event_id,user_id) values ($1,$2)", [
            eventId,
            second,
          ]),
          /row-level security/,
        );
        await login(admin, "admin@example.com");
        assert.ok((await db.query("select * from crm_activity")).rows.length >= 5);
        assert.equal((await db.query("select * from crm_activity_reads")).rows.length, 0);
      },
    );
    await t.test(
      "sharing and revocation notify only recipient and administrator",
      async () => {
        // Invitations are written by the server function's service role.
        await db.exec("reset role");
        await db.query(
          "insert into crm_page_members(source,email,invited_by) values ('Shared campaign','second@example.com',$1)",
          [admin],
        );
        await db.query(
          "insert into leads(source,status) values ('Shared campaign','new')",
        );
        await login(second, "second@example.com");
        assert.ok(
          (
            await db.query(
              "select * from crm_activity where message='Page access shared'",
            )
          ).rows.length,
        );
        assert.ok(
          (await db.query("select * from crm_activity where message='New lead added'"))
            .rows.length,
        );
        await login(admin, "admin@example.com");
        await db.exec("delete from crm_page_members where source='Shared campaign'");
        await login(second, "second@example.com");
        assert.ok(
          (
            await db.query(
              "select * from crm_activity where message='Page access removed'",
            )
          ).rows.length,
        );
        assert.equal(
          (await db.query("select * from crm_activity where message='New lead added'"))
            .rows.length,
          0,
        );
        await login(first, "first@example.com");
        assert.equal(
          (await db.query("select * from crm_activity where source='Shared campaign'"))
            .rows.length,
          0,
        );
      },
    );
    await t.test(
      "uploaded-row changes, completed follow-ups and deletions are recorded",
      async () => {
        await login(first, "first@example.com");
        await db.query(
          'update crm_import_rows set fields = \'{"Name":"Edited"}\' where source=$1',
          [ownSource],
        );
        await db.query("delete from crm_import_rows where source=$1", [ownSource]);
        await db.query("update followups set status='done' where lead_id=$1", [lead.id]);
        await db.query("delete from leads where id=$1", [lead.id]);
        const { rows } = await db.query("select message,entity_id from crm_activity");
        assert.ok(rows.some((row) => row.message === "2 uploaded rows updated"));
        assert.ok(rows.some((row) => row.message === "2 uploaded rows deleted"));
        assert.ok(rows.some((row) => row.message === "Follow-up completed"));
        const deleted = rows.find((row) => row.message === "Lead deleted");
        assert.ok(deleted);
        assert.equal(deleted.entity_id, null);
      },
    );
    await t.test(
      "normal users can create named sections without exposing them to other accounts",
      async () => {
        await login(first, "first@example.com");
        const section = (
          await db.query("select crm_create_section('October campaign') as source")
        ).rows[0].source;
        assert.match(section, /^Section \/ /);
        assert.equal(
          (await db.query("select name from crm_page_labels where source=$1", [section]))
            .rows[0].name,
          "October campaign",
        );
        const access = (await db.query("select crm_access_context() as value")).rows[0]
          .value;
        assert.ok(access.sources.includes(section));
        await db.query("insert into leads(source,status) values ($1,'new')", [section]);
        await db.query(
          "insert into crm_import_rows(source,fields,file_name) values ($1,'{\"Name\":\"Contact\"}','October import')",
          [section],
        );
        await login(second, "second@example.com");
        assert.equal(
          (await db.query("select * from crm_sections where source=$1", [section])).rows
            .length,
          0,
        );
        assert.equal(
          (await db.query("select * from leads where source=$1", [section])).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from crm_import_rows where source=$1", [section]))
            .rows.length,
          0,
        );
        await assert.rejects(
          db.query("insert into leads(source,status) values ($1,'new')", [section]),
          /row-level security/,
        );
        await login(admin, "admin@example.com");
        assert.equal(
          (await db.query("select * from crm_sections where source=$1", [section])).rows
            .length,
          1,
        );
        await login(second, "second@example.com");
        await assert.rejects(
          db.query("select crm_delete_section($1)", [section]),
          /section owner/,
        );
        await login(first, "first@example.com");
        await db.query("select crm_delete_section($1)", [section]);
        assert.equal(
          (await db.query("select * from crm_sections where source=$1", [section])).rows
            .length,
          0,
        );
        assert.equal(
          (await db.query("select * from leads where source=$1", [section])).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from crm_import_rows where source=$1", [section]))
            .rows.length,
          0,
        );
        await db.query("select crm_delete_section(crm_personal_source())");
        assert.equal(
          (await db.query("select * from leads where source=crm_personal_source()")).rows
            .length,
          0,
        );
        await assert.rejects(
          db.query("select crm_delete_section('Website')"),
          /section owner/,
        );
        await login(admin, "admin@example.com");
        await db.query(
          "insert into leads(source,status) values ('Legacy campaign','new')",
        );
        await db.query("select crm_delete_section('Legacy campaign')");
        assert.equal(
          (await db.query("select * from leads where source='Legacy campaign'")).rows
            .length,
          0,
        );
        await assert.rejects(
          db.query("select crm_create_section('   ')"),
          /section name/,
        );
      },
    );
  } finally {
    await db.close();
  }
});

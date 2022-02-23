CREATE EXTENSION IF NOT EXISTS plv8;
CREATE EXTENSION IF NOT EXISTS http;
DROP TRIGGER IF EXISTS schema ON schema;
DROP FUNCTION IF EXISTS schema;
DROP TABLE IF EXISTS schema;
CREATE FUNCTION schema()
RETURNS TRIGGER
LANGUAGE plv8 AS $$

const { execute } = plv8
const wrap = obj => '$' + '$' + JSON.stringify(obj, null, 2) + '$' + '$'
const transaction = sql => execute(`
SELECT http_post('https://capsule.dock.nx.digital/v2/query', ${wrap({
  "type": "bulk",
  "source": "default",
  "args": [
    {
      "type": "run_sql",
      "args": {
        "source": "default",
        "sql": sql,
        "cascade": false,
        "read_only": false
      }
    }
  ]
})}, 'application/json');
`)

if (TG_OP === 'DELETE') {
  transaction(`
DROP TABLE ${OLD.object};
-- COMMIT;
-- SELECT status FROM http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_untrack_table","args":{"table":{"name":"${OLD.object}","schema":"public"}}}', 'application/json');
`)
  return NEW
}
if (TG_OP === 'UPDATE') {
  throw new Error(`UPDATE not implemented yet`)
}
const { object = '', inherits = [], fields = {}, comments = {} } = NEW
if (!object) throw new Error(`No object specified`)
if (!fields) throw new Error(`No fields specified`)
const column_type = ([k, v]) => {
  const tables = []
  let type = {
    text: 'TEXT',
    string: 'TEXT',
    float: 'REAL',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    timestamp: 'TIMESTAMPZ',
    object: 'JSONB',
  }[v]
  // TODO: if (Array.isArray(v)) type = `ENUM (${Object.keys(v).map(k => `'${k}'`).join(', ')})`
  // TODO: if (tables.includes(v)) type = `INTEGER REFERENCES ${v}(id)`
  if (!type) throw new Error(`Unknown type ${v} for ${k}`)
  return `"${k}" ${type}`
}
const statement = transaction(`
CREATE TABLE "${object}" (
  "id" SERIAL NOT NULL,
  ${Object.entries(fields).map(column_type).join(',\n  ')},
  CONSTRAINT "UNIQUE_${object}" UNIQUE (${Object.keys(fields).map(k => `"${k}"`)}),
  CONSTRAINT "PK_${object}" PRIMARY KEY ("id")
) INHERITS (${inherits.map(k => `"${k}"`)});
-- TODO: COMMENT ON TABLE "${object}" IS '${comments.table || ''}';
-- TODO: COMMENT ON COLUMN "${object}"."${k}" IS '${comments[k] || ''}';
COMMIT;
SELECT status FROM http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}', 'application/json');
`)
return NEW

$$;
CREATE TABLE "schema" (
  "object" TEXT NOT NULL,
  "inherits" JSONB NOT NULL,
  "fields" JSONB NOT NULL,
  "comments" JSONB NOT NULL,
  CONSTRAINT "PK_schema" PRIMARY KEY ("object")
);
CREATE TRIGGER schema BEFORE INSERT OR UPDATE OR DELETE ON schema
FOR EACH ROW EXECUTE FUNCTION schema();

-- INSERT INTO schema ("object", "inherits", "fields", "comments") VALUES ('instrument', '["resolution"]', '{"uid": "string", "name": "string", "country": "string", "currency": "string"}', '{}');
-- DELETE FROM schema;

-- DROP TABLE "instrument";
-- CREATE TABLE "instrument" (
--   "id" SERIAL NOT NULL,
--   "uid" TEXT NOT NULL,
--   "name" TEXT NOT NULL,
--   "country" TEXT NOT NULL,
--   "currency" TEXT NOT NULL,
--   CONSTRAINT "UNIQUE_instrument" UNIQUE ("uid", "name", "country", "currency"),
--   CONSTRAINT "PK_instrument" PRIMARY KEY ("id")
-- ) INHERITS ("resolution");

-- -- ATTEMPT 1 > HTTP call to hasura's "track_table" endpoint
-- -- Working only with a transaction and a commit between create table and http call
-- -- curl -X POST -H "Content-Type: application/json" -d '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}' https://capsule.dock.nx.digital/v1/metadata
-- SELECT status FROM http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}', 'application/json');
-- SELECT net.http_post(url:='https://capsule.dock.nx.digital/v1/metadata', body:='{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}'::jsonb, 'application/json') AS r_id;
-- SELECT (response).body::json FROM net.http_collect_response(r_id:=1);
-- BEGIN;
-- CREATE TABLE "instrument" (
--   "id" SERIAL NOT NULL,
--   "uid" TEXT NOT NULL,
--   "name" TEXT NOT NULL,
--   "country" TEXT NOT NULL,
--   "currency" TEXT NOT NULL,
--   CONSTRAINT "UNIQUE_instrument" UNIQUE ("uid", "name", "country", "currency"),
--   CONSTRAINT "PK_instrument" PRIMARY KEY ("id")
-- ) INHERITS ("resolution");
-- COMMIT;
-- SELECT status FROM http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}', 'application/json');
-- END;

-- -- ATTEMPT 2 > Reverse engeneering of hasura's metadata
-- SELECT * FROM hdb_catalog.hdb_metadata;
-- UPDATE hdb_catalog.hdb_metadata
-- SET metadata = '{"sources":[{"kind":"postgres","name":"default","tables":[{"table":{"schema":"public","name":"schema"}}],"configuration":{"connection_info":{"use_prepared_statements":true,"database_url":{"from_env":"HASURA_GRAPHQL_DATABASE_URL"},"isolation_level":"read-committed","pool_settings":{"connection_lifetime":600,"retries":1,"idle_timeout":180,"max_connections":50}}}}],"version":3}';
-- UPDATE hdb_catalog.hdb_metadata
-- SET metadata = jsonb_set(metadata::jsonb, '{sources,0,tables}', (metadata->'sources'->0->'tables')::jsonb || '{"table":{"name":"instrument","schema":"public"}}'::jsonb);
-- UPDATE hdb_catalog.hdb_metadata
-- SET metadata = jsonb_set(metadata::jsonb, '{sources,0,tables}', '[{"table": {"name": "schema", "schema": "public"}}]'::jsonb);

-- -- ATTEMP 3 > Create 2 TRIGGERS
-- DROP TABLE IF EXISTS trig;
-- DROP FUNCTION IF EXISTS hasura_autotrack;
-- DROP TRIGGER IF EXISTS hasura_autotrack ON trig;
-- CREATE TABLE trig (a INTEGER);
-- CREATE FUNCTION hasura_autotrack()
-- RETURNS TRIGGER
-- LANGUAGE plv8 AS $$
-- const result = plv8.execute(`SELECT status FROM http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}', 'application/json');`);
-- plv8.elog(NOTICE, JSON.stringify(result));
-- $$;
-- CREATE TRIGGER hasura_autotrack BEFORE INSERT OR UPDATE OR DELETE ON trig
-- FOR EACH ROW EXECUTE FUNCTION hasura_autotrack();

-- -- ATTEMP 4 > Create DDL TRIGGERS
-- -- NOTE: ERROR: PL/v8 functions cannot return type event_trigger
-- -- https://www.postgresql.org/docs/current/event-trigger-matrix.html
-- DROP EVENT TRIGGER IF EXISTS hasura_autotrack;
-- DROP FUNCTION IF EXISTS hasura_autotrack;
-- CREATE FUNCTION hasura_autotrack() RETURNS event_trigger
-- LANGUAGE plpgsql AS $$DECLARE
--   r RECORD;
-- BEGIN
-- IF tg_tag = 'CREATE TABLE' THEN
--   FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
--   LOOP
--     IF r.object_type = 'table' THEN
--       RAISE NOTICE 'date %, command %, r %, query %', statement_timestamp(), tg_tag, r.object_identity, current_query();
--       -- SELECT http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"'||r.object_identity||'","schema":"public"}}}', 'application/json');
--       PERFORM http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}', 'application/json');
--     END IF;
--   END LOOP;
-- END IF;
-- END$$;
-- CREATE EVENT TRIGGER hasura_autotrack ON ddl_command_end
-- EXECUTE FUNCTION hasura_autotrack();

-- -- ATTEMPT 5 > Async HTTP call
-- -- https://github.com/supabase/pg_net/ > request stay pendiing


-- -- ATTEMPT 6 > Async call via cron task
-- -- https://github.com/cybertec-postgresql/pg_timetable > additional process to start
-- -- pg_cron > -c shared_preload_libraries='pg_cron' -c cron.database_name='pgdb'
-- CREATE TABLE "cron"."task" (
--   "name" TEXT NOT NULL,
--   "todo" TEXT NOT NULL,
--   "at" DATETIME,
--   "start" DATETIME,
--   "end" DATETIME,
--   CONSTRAINT "PK_task" PRIMARY KEY ("name")
-- );
-- CREATE FUNCTION "run_task"

-- -- ATTEMPT 7 > Run one http call to run transaction
-- SELECT http_post('https://capsule.dock.nx.digital/v2/query', $${
--   "type": "bulk",
--   "source": "default",
--   "args": [
--     {
--       "type": "run_sql",
--       "args": {
--         "source": "default",
--         "sql": "BEGIN;\nCREATE TABLE \"instrument\" (\n  \"id\" SERIAL NOT NULL,\n  \"uid\" TEXT NOT NULL,\n  \"name\" TEXT NOT NULL,\n  \"country\" TEXT NOT NULL,\n  \"currency\" TEXT NOT NULL,\n  CONSTRAINT \"UNIQUE_instrument\" UNIQUE (\"uid\", \"name\", \"country\", \"currency\"),\n  CONSTRAINT \"PK_instrument\" PRIMARY KEY (\"id\")\n) INHERITS (\"resolution\");\nCOMMIT;\nSELECT status FROM http_post('https://capsule.dock.nx.digital/v1/metadata', '{\"type\":\"pg_track_table\",\"args\":{\"table\":{\"name\":\"instrument\",\"schema\":\"public\"}}}', 'application/json');\nEND;",
--         "cascade": false,
--         "read_only": false
--       }
--     }
--   ]
-- }$$, 'application/json');

/*
query {
  schema {
    object
    inherits
    fields
  }
}
mutation {
  insert_schema_one(object: {
    object: "instrument",
    inherits: [
      "resolution"
    ],
    fields: {
      uid: "text",
      name: "text",
      country: "text",
      currency: "text"
    },
    comments: {
      object: "This is the instrument table",
      uid: "This is the instrument identifier used internally by NeoXam or his client"
    }
  }) {
    object
  }
}
mutation {
  delete_schema_by_pk(object: "instrument") {
    object
  }
}
*/

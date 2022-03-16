import * as utils from './utils.js'
const { execute_sql, business_object_insert, business_rule_insert, business_object_trigger, business_rule_trigger } = utils

const ADDITIONAL_COLUMNS = `
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_change" INT,
  "valid" TSTZRANGE NOT NULL DEFAULT TSTZRANGE(NOW(), NULL),`

// prettier-ignore
const PLV8_UTILS = (() => {
const log = str => plv8.elog(NOTICE, typeof str !== 'string' ? JSON.stringify(str) : str)
const execute = str => (log(str), plv8.execute(str))
const quote = v => typeof v === 'object' ? `'${JSON.stringify(v)}'` : typeof v === 'string' ? `'${v}'` : v
const update = (table, changeset, where) => execute(`UPDATE ${table} SET ${Object.entries(changeset).map(([k, v]) => `"${k}" = ${quote(v)}`).join(',\n')}${where ? ' WHERE ' + Object.entries(where).map(([k, v]) => `"${k}" = ${typeof v === 'object' ? `'${JSON.stringify(v)}'` : typeof v === 'string' ? `'${v}'` : v}`).join(' AND ') : ''} RETURNING *;`)

}).toString().slice(8, -1)

const scenarios_modeling = [
  {
    name: 'Modeling - Business Object',
    tests: [
      { input: [{}], error: 'No object specified' },
      {
        input: [
          {
            object: 'instrument',
            inherits: [],
            fields: { uid: 'string', name: 'string', country: 'string', currency: 'string' },
            comments: {
              object: 'This is the instrument table',
              uid: 'This is the instrument identifier used internally by NeoXam or his client',
            },
          },
        ],
        output: `
CREATE TABLE "instrument" (
  "id" SERIAL NOT NULL,
  "uid" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "currency" TEXT NOT NULL,${ADDITIONAL_COLUMNS}
  CONSTRAINT "UNIQUE_instrument" UNIQUE ("uid", "name", "country", "currency"),
  CONSTRAINT "PK_instrument" PRIMARY KEY ("id")
);
COMMENT ON TABLE "instrument" IS 'This is the instrument table';
COMMENT ON COLUMN "instrument"."uid" IS 'This is the instrument identifier used internally by NeoXam or his client';

CREATE TRIGGER permission BEFORE INSERT OR UPDATE OR DELETE ON "instrument"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "instrument"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"columns":["id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"columns":["id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            object: 'equity',
            inherits: ['instrument'],
            fields: { issuer: 'string', share_number: 'integer' },
          },
        ],
        output: `
CREATE TABLE "equity" (
  "issuer" TEXT NOT NULL,
  "share_number" INTEGER NOT NULL,${ADDITIONAL_COLUMNS}
  CONSTRAINT "UNIQUE_equity" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number"),
  CONSTRAINT "PK_equity" PRIMARY KEY ("id")
) INHERITS ("instrument");


CREATE TRIGGER permission BEFORE INSERT OR UPDATE OR DELETE ON "equity"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "equity"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"equity","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["issuer","share_number","id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"columns":["issuer","share_number","id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"columns":["issuer","share_number","id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            object: 'preferred',
            inherits: ['equity'],
            fields: { rate: 'float' },
          },
        ],
        output: `
CREATE TABLE "preferred" (
  "rate" REAL NOT NULL,${ADDITIONAL_COLUMNS}
  CONSTRAINT "UNIQUE_preferred" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number", "rate"),
  CONSTRAINT "PK_preferred" PRIMARY KEY ("id")
) INHERITS ("equity");


CREATE TRIGGER permission BEFORE INSERT OR UPDATE OR DELETE ON "preferred"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "preferred"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"preferred","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["rate","id","uid","name","country","currency","issuer","share_number","source","resolution","updated_by","updated_at","last_change","valid"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"columns":["rate","id","uid","name","country","currency","issuer","share_number","source","resolution","updated_by","updated_at","last_change","valid"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"columns":["rate","id","uid","name","country","currency","issuer","share_number","source","resolution","updated_by","updated_at","last_change","valid"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            object: 'bond',
            inherits: ['instrument'],
            fields: { maturity_date: 'timestamp' },
          },
        ],
        output: `
CREATE TABLE "bond" (
  "maturity_date" TIMESTAMPTZ NOT NULL,${ADDITIONAL_COLUMNS}
  CONSTRAINT "UNIQUE_bond" UNIQUE ("uid", "name", "country", "currency", "maturity_date"),
  CONSTRAINT "PK_bond" PRIMARY KEY ("id")
) INHERITS ("instrument");


CREATE TRIGGER permission BEFORE INSERT OR UPDATE OR DELETE ON "bond"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "bond"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"bond","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["maturity_date","id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"columns":["maturity_date","id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"columns":["maturity_date","id","uid","name","country","currency","source","resolution","updated_by","updated_at","last_change","valid"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            object: 'coupon',
            inherits: [],
            fields: { bond_id: 'bond', date: 'timestamp', currency: 'text', coupon: 'float' },
          },
        ],
        output: `
CREATE TABLE "coupon" (
  "id" SERIAL NOT NULL,
  "bond_id" INTEGER NOT NULL REFERENCES "bond"("id"),
  "date" TIMESTAMPTZ NOT NULL,
  "currency" TEXT NOT NULL,
  "coupon" REAL NOT NULL,${ADDITIONAL_COLUMNS}
  CONSTRAINT "UNIQUE_coupon" UNIQUE ("bond_id", "date", "currency", "coupon"),
  CONSTRAINT "PK_coupon" PRIMARY KEY ("id")
);


CREATE TRIGGER permission BEFORE INSERT OR UPDATE OR DELETE ON "coupon"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "coupon"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"coupon","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["id","bond_id","date","currency","coupon","source","resolution","updated_by","updated_at","last_change","valid"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"columns":["id","bond_id","date","currency","coupon","source","resolution","updated_by","updated_at","last_change","valid"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"columns":["id","bond_id","date","currency","coupon","source","resolution","updated_by","updated_at","last_change","valid"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
    ],
    business_object_insert,
  },
  {
    name: 'Modeling - Business Rule',
    tests: [
      { input: [{}], error: 'No rule specified' },
      {
        input: [
          {
            rule: 'approve',
            language: 'js',
            type: 'mutation',
            input: {
              instrument_id: 'integer',
            },
            output: 'instrument',
            // code: `RETURN QUERY UPDATE "instrument" SET "resolution" = 'approved' WHERE id = instrument_id RETURNING *;`,
            // code: (() => { return plv8.execute(`UPDATE "instrument" SET "resolution" = 'approved' WHERE id = ${instrument_id} RETURNING *;`) }).toString().slice(8, -1),
            code: PLV8_UTILS + `return update('instrument', { resolution: 'approved' }, { id: instrument_id })`,
            comments: {
              rule: 'This is the rule function',
              instrument_id: 'This is the instrument identifier used internally by NeoXam or his client',
            },
          },
        ],
        output: `
CREATE FUNCTION
approve(instrument_id INTEGER)
RETURNS SETOF instrument
LANGUAGE plv8 VOLATILE
AS $function$
${PLV8_UTILS}return update('instrument', { resolution: 'approved' }, { id: instrument_id })
$function$;
COMMENT ON FUNCTION approve(instrument_id integer) IS 'This is the rule function';

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_function","args":{"function":{"name":"approve","schema":"public"},"configuration":{"exposed_as":"mutation"}}},{"type":"pg_create_function_permission","args":{"function":{"schema":"public","name":"approve"},"role":"user"}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            rule: 'reject',
            language: 'sql',
            input: {
              instrument_id: 'integer',
            },
            output: 'instrument',
            code: `RETURN QUERY UPDATE "instrument" SET "resolution" = 'rejected' WHERE id = instrument_id RETURNING *;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
reject(instrument_id INTEGER)
RETURNS SETOF instrument
LANGUAGE plpgsql VOLATILE
AS $function$BEGIN
RETURN QUERY UPDATE "instrument" SET "resolution" = 'rejected' WHERE id = instrument_id RETURNING *;
END$function$;


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_function","args":{"function":{"name":"reject","schema":"public"},"configuration":{"exposed_as":"mutation"}}},{"type":"pg_create_function_permission","args":{"function":{"schema":"public","name":"reject"},"role":"user"}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            rule: 'candidates',
            language: 'sql',
            type: 'query',
            output: 'instrument',
            code: `RETURN QUERY SELECT * FROM instrument WHERE resolution IS NULL;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
candidates()
RETURNS SETOF instrument
LANGUAGE plpgsql STABLE
AS $function$BEGIN
RETURN QUERY SELECT * FROM instrument WHERE resolution IS NULL;
END$function$;


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_function","args":{"function":{"name":"candidates","schema":"public"},"configuration":{"exposed_as":"query"}}},{"type":"pg_create_function_permission","args":{"function":{"schema":"public","name":"candidates"},"role":"user"}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
      {
        input: [
          {
            rule: 'golden',
            language: 'sql',
            type: 'query',
            input: {
              instrument_id: 'integer',
            },
            output: 'instrument',
            code: `RETURN QUERY
SELECT * FROM instrument
WHERE instrument.resolution = 'approved'
AND instrument.uid = golden.uid
ORDER BY instrument.source DESC
LIMIT 1;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
golden(instrument_id INTEGER)
RETURNS SETOF instrument
LANGUAGE plpgsql STABLE
AS $function$BEGIN
RETURN QUERY
SELECT * FROM instrument
WHERE instrument.resolution = 'approved'
AND instrument.uid = golden.uid
ORDER BY instrument.source DESC
LIMIT 1;
END$function$;


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_function","args":{"function":{"name":"golden","schema":"public"},"configuration":{"exposed_as":"query"}}},{"type":"pg_create_function_permission","args":{"function":{"schema":"public","name":"golden"},"role":"user"}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`,
      },
    ],
    business_rule_insert,
  },
]

const scenarios = scenarios_modeling

//! RUN TEST
console.clear()
import { assertEquals, assertRejects } from 'https://deno.land/std@0.127.0/testing/asserts.ts'
for await (const { name, tests, ...rest } of scenarios) {
  for await (const [i, { input, output, error }] of Object.entries(tests)) {
    for await (const [k, fn] of Object.entries(rest)) {
      if (error) await Deno.test(`${name} #${k} #${i}`, async () => await assertRejects(async () => await fn(...input), Error, error))
      else await Deno.test(`${name} #${k} #${i}`, async () => assertEquals(await fn(...input), output))
      // if (!error) {
      //   const sql = await fn(...input)
      //   const response = await execute_sql(sql)
      //   console.log(`${name} #${k} #${i}`, response.status, await response.text())
      // }
    }
  }
}
export default scenarios

//! PRE TEST
await execute_sql(`
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS plv8;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"clear_metadata","args":{}}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
SELECT pg_sleep(1.5);
CREATE TYPE "role" AS ENUM ('user', 'steward', 'admin', 'robot');
CREATE TYPE "source" AS ENUM ('manual', 'bloomberg', 'reuters');
CREATE TYPE "resolution" AS ENUM ('rejected', 'approved');
CREATE TABLE "history" (
  "id" SERIAL NOT NULL,
  "table" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "row" JSONB,
  CONSTRAINT "PK_history" PRIMARY KEY ("id")
);
CREATE FUNCTION history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $trigger$BEGIN
IF (TG_OP = 'INSERT') THEN
  INSERT INTO history ("table", "operation", "row") VALUES (TG_RELNAME, 'INSERT', row_to_json(NEW));
  RETURN NEW;
END IF;
IF (TG_OP = 'UPDATE') THEN
  IF (OLD != NEW) THEN
    -- OLD.history = NULL;
    INSERT INTO history ("table", "operation", "row") VALUES (TG_RELNAME, 'UPDATE', row_to_json(NEW)) RETURNING id INTO NEW.last_change;
    -- NEW.history = row_to_json(OLD)::jsonb;
  END IF;
  RETURN NEW;
END IF;
IF (TG_OP = 'DELETE') THEN
  INSERT INTO history ("table", "operation", "row") VALUES (TG_RELNAME, 'DELETE', row_to_json(OLD));
  RETURN OLD;
END IF;
END$trigger$;
${business_object_trigger}
${business_rule_trigger}
CREATE TABLE "permission" (
  "id" SERIAL NOT NULL,
  "target" TEXT NOT NULL, -- role or user
  "rule" TEXT NOT NULL, -- REFERENCES "business_rule"("rule")
  CONSTRAINT "PK_permission" PRIMARY KEY ("id")
);
CREATE FUNCTION permission() RETURNS trigger
LANGUAGE plv8 AS $trigger$
const { execute } = plv8
let [{ 'x-hasura-user-id': id, 'x-hasura-role': role }] = execute(\`SELECT * FROM jsonb_to_record(current_setting('hasura.user', true)::jsonb) AS data("x-hasura-user-id" "text", "x-hasura-role" "text");\`)
id = id || ''
role = role || 'anon'
if (NEW) NEW.updated_by = id
if (NEW) NEW.updated_at = new Date()
const permissions = execute(\`SELECT * FROM permission WHERE target IN ('\${id}', '\${role}');\`)
if (permissions.length === 0) throw new Error(\`No permissions defined for \${id} / \${role}\`)
permissions.forEach(v => plv8.execute(\`SELECT \${v.rule}();\`))
return NEW
$trigger$;
CREATE FUNCTION allow() RETURNS VOID LANGUAGE plv8 STABLE AS $$return$$;
CREATE FUNCTION deny() RETURNS VOID LANGUAGE plv8 STABLE AS $$throw new Error('deny')$$;
INSERT INTO permission (target, rule) VALUES ('admin', 'allow');
INSERT INTO permission (target, rule) VALUES ('user', 'deny');
INSERT INTO permission (target, rule) VALUES ('anon', 'deny');
SELECT pg_sleep(.5);
SELECT deny() FROM (SELECT * FROM net._http_response WHERE status_code != 200) AS error;
`)
//! POST TEST
await execute_sql(
  scenarios_modeling[0].tests
    .filter(({ input: [{ object }] }) => object)
    .map(
      ({ input: [{ object, inherits = [], fields = {}, comments = {} }] }) =>
        `INSERT INTO business_object("object", "inherits", "fields", "comments")
VALUES ('${object}', '${JSON.stringify(inherits)}', '${JSON.stringify(fields)}', '${JSON.stringify(comments)}');
SELECT pg_sleep(.5);`,
    )
    .filter(v => v)
    .join('\n'),
)
await execute_sql(
  scenarios_modeling[1].tests
    .filter(({ input: [{ rule }] }) => rule)
    .map(
      ({ input: [{ rule, language = 'sql', type = 'mutation', input = {}, output = 'null', code, comments = {} }] }) =>
        `INSERT INTO business_rule("rule", "language", "type", "input", "output", "code", "comments")
VALUES ('${rule}', '${language}', '${type}', '${JSON.stringify(input)}', '${output}', $code$${code}$code$, '${JSON.stringify(comments)}');
SELECT pg_sleep(.5);`,
    )
    .filter(v => v)
    .join('\n'),
)
await execute_sql(`
INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR');
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-297920657', 'EPA:BNP', 'FR', 'EUR', 'BNP', '730372026');
INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-320404407', 'NASDAQ:TSLA', 'US', 'USD', 'TESLA', '194491300', 0.07);
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-519487830', 'AB-PREF-7%', 'FR', 'EUR', 'ALPHABET', '693264265');
INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-694964950', 'NASDAQ:GOOGL', 'US', 'USD', 'ALPHABET', '175190113', 0.05);
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-857828573', 'EPA:AF', 'FR', 'EUR', 'AIR FRANCE KLM', '194491300');
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-943649527', 'AF-PREF-5%', 'FR', 'EUR', 'AIR FRANCE KLM', '787057726');
INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-439903446', 'GGL-2027-2.3%', 'FR', 'EUR', '2027-01-01');
INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-744967405', 'KLM-2023-7%', 'FR', 'EUR', '2023-01-01');
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2022-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2023-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2024-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2025-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2026-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2027-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2022-01-01', 'USD', 0.07);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2023-01-01', 'USD', 0.07);
`)
await execute_sql(`
SELECT reject(id) FROM candidates() WHERE "uid" = 'FR-018066960' AND "country" = 'FR';
SELECT approve(id) FROM instrument WHERE "uid" = 'FR-018066960' AND "country" = 'FR';
SELECT approve(id) FROM instrument WHERE "uid" = 'FR-018066960' AND "country" = 'FR'; -- SAME QUERY AS ABOVE, WILL NOT APPEAR IN history TABLE
UPDATE instrument SET "resolution" = 'approved' WHERE "uid" = 'FR-018066960' AND "country" = 'FR'; -- SAME QUERY AS ABOVE, WILL NOT APPEAR IN history TABLE
UPDATE instrument SET "resolution" = 'approved' WHERE "uid" = 'FR-018066960' AND "country" = 'FR'; -- SAME QUERY AS ABOVE, WILL NOT APPEAR IN history TABLE

INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'US', 'USD');
SELECT reject(id) FROM candidates() WHERE "uid" = 'FR-018066960' AND "country" = 'US';
-- UPDATE history SET "date" = '2020-01-01' WHERE id IN(SELECT max(id) FROM history); -- force date for last history entry
-- UPDATE history SET "date" = '2020-01-01' WHERE "table" = 'instrument' AND row->>'uid' = 'FR-018066960' AND row->>'country' = 'FR';

INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'IT', 'EUR');
DELETE FROM instrument WHERE "country" = 'IT';
INSERT INTO instrument (uid, name, country, currency, source) VALUES ('FR-018066960', 'af-private-debt', 'FR', 'EUR', 'bloomberg');

-- SELECT * FROM history WHERE "date" < '2021-01-01';
-- SELECT * FROM history WHERE row->>'uid' = 'FR-018066960'; -- THIS WORKS
-- SELECT * FROM history WHERE row['uid']::text = 'FR-018066960'; -- THIS DOESN'T WORKS
-- SELECT id FROM candidates();
-- SELECT row['resolution'] FROM history WHERE "table" = 'instrument' AND "row_id" = 1 AND date < '2022-03-10' ORDER BY date DESC LIMIT 2;
SELECT deny() FROM (SELECT * FROM net._http_response WHERE status_code != 200) AS error;
`)

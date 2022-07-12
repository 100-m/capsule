import * as utils from './utils.js'
const { execute_sql, business_object_insert, business_rule_insert, business_object_feature, business_rule_feature, triggers } = utils

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
            fields: { name: 'string', country: 'string', currency: 'string' },
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
  "currency" TEXT NOT NULL,
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "user" TEXT NOT NULL,
  "asat" TSTZRANGE NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, NULL),
  "asof" TSTZRANGE NOT NULL DEFAULT tstzrange(NULL, NULL),
  EXCLUDE USING gist (uid WITH =, source WITH =, asat WITH &&, asof WITH &&),
  CONSTRAINT "PK_instrument" PRIMARY KEY ("id")
);
COMMENT ON TABLE "instrument" IS 'This is the instrument table';
COMMENT ON COLUMN "instrument"."uid" IS 'This is the instrument identifier used internally by NeoXam or his client';

CREATE TRIGGER "01_permission" BEFORE INSERT OR UPDATE OR DELETE ON "instrument"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER "02_asat" BEFORE INSERT OR UPDATE OR DELETE ON "instrument"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asat();
CREATE TRIGGER "03_asof" BEFORE INSERT ON "instrument"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asof();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["id","uid","name","country","currency","source","resolution","user","asat","asof"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"columns":["id","uid","name","country","currency","source","resolution","user","asat","asof"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"columns":["id","uid","name","country","currency","source","resolution","user","asat","asof"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"instrument","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
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
  "share_number" INTEGER NOT NULL,
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "user" TEXT NOT NULL,
  "asat" TSTZRANGE NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, NULL),
  "asof" TSTZRANGE NOT NULL DEFAULT tstzrange(NULL, NULL),
  EXCLUDE USING gist (uid WITH =, source WITH =, asat WITH &&, asof WITH &&),
  CONSTRAINT "PK_equity" PRIMARY KEY ("id")
) INHERITS ("instrument");


CREATE TRIGGER "01_permission" BEFORE INSERT OR UPDATE OR DELETE ON "equity"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER "02_asat" BEFORE INSERT OR UPDATE OR DELETE ON "equity"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asat();
CREATE TRIGGER "03_asof" BEFORE INSERT ON "equity"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asof();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"equity","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["issuer","share_number","id","uid","name","country","currency","source","resolution","user","asat","asof"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"columns":["issuer","share_number","id","uid","name","country","currency","source","resolution","user","asat","asof"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"columns":["issuer","share_number","id","uid","name","country","currency","source","resolution","user","asat","asof"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"equity","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
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
  "rate" REAL NOT NULL,
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "user" TEXT NOT NULL,
  "asat" TSTZRANGE NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, NULL),
  "asof" TSTZRANGE NOT NULL DEFAULT tstzrange(NULL, NULL),
  EXCLUDE USING gist (uid WITH =, source WITH =, asat WITH &&, asof WITH &&),
  CONSTRAINT "PK_preferred" PRIMARY KEY ("id")
) INHERITS ("equity");


CREATE TRIGGER "01_permission" BEFORE INSERT OR UPDATE OR DELETE ON "preferred"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER "02_asat" BEFORE INSERT OR UPDATE OR DELETE ON "preferred"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asat();
CREATE TRIGGER "03_asof" BEFORE INSERT ON "preferred"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asof();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"preferred","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["rate","id","uid","name","country","currency","issuer","share_number","source","resolution","user","asat","asof"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"columns":["rate","id","uid","name","country","currency","issuer","share_number","source","resolution","user","asat","asof"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"columns":["rate","id","uid","name","country","currency","issuer","share_number","source","resolution","user","asat","asof"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"preferred","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
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
  "maturity_date" TIMESTAMPTZ NOT NULL,
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "user" TEXT NOT NULL,
  "asat" TSTZRANGE NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, NULL),
  "asof" TSTZRANGE NOT NULL DEFAULT tstzrange(NULL, NULL),
  EXCLUDE USING gist (uid WITH =, source WITH =, asat WITH &&, asof WITH &&),
  CONSTRAINT "PK_bond" PRIMARY KEY ("id")
) INHERITS ("instrument");


CREATE TRIGGER "01_permission" BEFORE INSERT OR UPDATE OR DELETE ON "bond"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER "02_asat" BEFORE INSERT OR UPDATE OR DELETE ON "bond"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asat();
CREATE TRIGGER "03_asof" BEFORE INSERT ON "bond"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asof();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"bond","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["maturity_date","id","uid","name","country","currency","source","resolution","user","asat","asof"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"columns":["maturity_date","id","uid","name","country","currency","source","resolution","user","asat","asof"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"columns":["maturity_date","id","uid","name","country","currency","source","resolution","user","asat","asof"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"bond","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
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
  "uid" TEXT NOT NULL,
  "bond_id" INTEGER NOT NULL REFERENCES "bond"("id"),
  "date" TIMESTAMPTZ NOT NULL,
  "currency" TEXT NOT NULL,
  "coupon" REAL NOT NULL,
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "user" TEXT NOT NULL,
  "asat" TSTZRANGE NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, NULL),
  "asof" TSTZRANGE NOT NULL DEFAULT tstzrange(NULL, NULL),
  EXCLUDE USING gist (uid WITH =, source WITH =, asat WITH &&, asof WITH &&),
  CONSTRAINT "PK_coupon" PRIMARY KEY ("id")
);


CREATE TRIGGER "01_permission" BEFORE INSERT OR UPDATE OR DELETE ON "coupon"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER "02_asat" BEFORE INSERT OR UPDATE OR DELETE ON "coupon"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asat();
CREATE TRIGGER "03_asof" BEFORE INSERT ON "coupon"
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION asof();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"coupon","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["id","uid","bond_id","date","currency","coupon","source","resolution","user","asat","asof"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"columns":["id","uid","bond_id","date","currency","coupon","source","resolution","user","asat","asof"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"columns":["id","uid","bond_id","date","currency","coupon","source","resolution","user","asat","asof"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"coupon","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
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
            code: `RETURN QUERY SELECT * FROM instrument WHERE resolution IS NULL AND upper(asat) IS NULL;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
candidates()
RETURNS SETOF instrument
LANGUAGE plpgsql STABLE
AS $function$BEGIN
RETURN QUERY SELECT * FROM instrument WHERE resolution IS NULL AND upper(asat) IS NULL;
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
              uid: 'string',
            },
            output: 'instrument',
            code: `RETURN QUERY
SELECT * FROM instrument
WHERE instrument.uid = golden.uid
AND instrument.resolution = 'approved'
AND upper(asat) IS NULL
ORDER BY instrument.source DESC
LIMIT 1;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
golden(uid TEXT)
RETURNS SETOF instrument
LANGUAGE plpgsql STABLE
AS $function$BEGIN
RETURN QUERY
SELECT * FROM instrument
WHERE instrument.uid = golden.uid
AND instrument.resolution = 'approved'
AND upper(asat) IS NULL
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

//! INITIALIZE
await execute_sql(`
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS plv8;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS btree_gist;
SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"clear_metadata","args":{}}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
SELECT pg_sleep(2);
CREATE TYPE "source" AS ENUM ('manual', 'bloomberg', 'reuters');
CREATE TYPE "resolution" AS ENUM ('rejected', 'approved');
`)
await execute_sql(triggers)
await execute_sql(business_object_feature)
await execute_sql(business_rule_feature)
await execute_sql(`
INSERT INTO permission (target, code) VALUES ('admin', '');
INSERT INTO permission (target, code) VALUES ('user', $$
// NOTE: We must use loose comparison == or != or cast values before comparing because of plv8
if (TG_OP === 'INSERT' && NEW.resolution) throw new Error('4-eyes violation detected')
if (TG_OP === 'UPDATE' && NEW.resolution != OLD.resolution) {
  if (OLD.user == NEW.user) throw new Error('4-eyes violation detected')
}
$$);
`)
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
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('8-1', 8, '2022-01-01', 'USD', 0.023);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('8-2', 8, '2023-01-01', 'USD', 0.023);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('8-3', 8, '2024-01-01', 'USD', 0.023);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('8-4', 8, '2025-01-01', 'USD', 0.023);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('8-5', 8, '2026-01-01', 'USD', 0.023);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('8-6', 8, '2027-01-01', 'USD', 0.023);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('9-1', 9, '2022-01-01', 'USD', 0.07);
INSERT INTO coupon (uid, bond_id, date, currency, coupon) VALUES ('9-2', 9, '2023-01-01', 'USD', 0.07);
`)
await execute_sql(`
SELECT reject(id) FROM candidates() WHERE "uid" = 'FR-018066960';
SELECT approve(id) FROM instrument WHERE "uid" = 'FR-018066960';
SELECT approve(id) FROM instrument WHERE "uid" = 'FR-018066960'; -- SAME QUERY AS ABOVE, WILL NOT APPEAR IN history
UPDATE instrument SET "resolution" = 'approved' WHERE "uid" = 'FR-018066960'; -- SAME QUERY AS ABOVE, WILL NOT APPEAR IN history
UPDATE instrument SET "resolution" = 'approved' WHERE "uid" = 'FR-018066960'; -- SAME QUERY AS ABOVE, WILL NOT APPEAR IN history
DO $$BEGIN ASSERT (SELECT count(*) FROM instrument WHERE "uid" = 'FR-018066960') = 3, 'Duplicate entries for approve/reject';END$$;

DO $$BEGIN ASSERT (SELECT count(*) FROM instrument WHERE "uid" = 'FR-018066960' AND resolution IS NULL AND upper(asat) IS NULL) = 0, '4 eyes already approved';END$$;
UPDATE instrument SET "currency" = 'USD' WHERE "uid" = 'FR-018066960';
DO $$BEGIN ASSERT (SELECT count(*) FROM instrument WHERE "uid" = 'FR-018066960' AND resolution IS NULL AND upper(asat) IS NULL) = 1, '4 eyes activated automatically';END$$;

INSERT INTO instrument (uid, name, country, currency, source, resolution, "user") VALUES ('FR-018066960', 'af-private-debt', 'FR', 'EUR', 'bloomberg', 'approved', 'user-id-1-trying-to-hack-the-system');
DO $$BEGIN ASSERT (SELECT count(*) FROM instrument WHERE "user" = 'user-id-1-trying-to-hack-the-system') = 0, 'User impersonation';END$$;
DO LANGUAGE plv8 $$
try {
  plv8.execute("INSERT INTO instrument (uid, name, country, currency, source, resolution) VALUES ('FR-018066960', 'af-private-debt', 'FR', 'EUR', 'bloomberg', 'approved');")
} catch(e) {
  if (e.message !== 'conflicting key value violates exclusion constraint "instrument_uid_source_asat_asof_excl"') throw e
}
$$;
`)

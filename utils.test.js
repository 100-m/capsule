import {
  execute_hasura_sql,
  execute,
  log,
  business_object_insert_sql,
  business_object_delete_sql,
  business_rule_insert_sql,
  business_rule_delete_sql,
  trigger_table_insert_sql,
} from './utils.js'

const scenarios_modeling = [
  {
    name: 'Modeling - Business Object',
    tests: [
      { input: [{}], error: 'No object specified' },
      {
        input: [
          {
            object: 'instrument',
            inherits: ['resolution'],
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
  "currency" TEXT NOT NULL,
  CONSTRAINT "UNIQUE_instrument" UNIQUE ("uid", "name", "country", "currency"),
  CONSTRAINT "PK_instrument" PRIMARY KEY ("id")
) INHERITS ("resolution");
COMMENT ON TABLE "instrument" IS 'This is the instrument table';
COMMENT ON COLUMN "instrument"."uid" IS 'This is the instrument identifier used internally by NeoXam or his client';

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"instrument","schema":"public"}}}');
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
  CONSTRAINT "UNIQUE_equity" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number"),
  CONSTRAINT "PK_equity" PRIMARY KEY ("id")
) INHERITS ("instrument");


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"equity","schema":"public"}}}');
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
  CONSTRAINT "UNIQUE_preferred" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number", "rate"),
  CONSTRAINT "PK_preferred" PRIMARY KEY ("id")
) INHERITS ("equity");


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"preferred","schema":"public"}}}');
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
  CONSTRAINT "UNIQUE_bond" UNIQUE ("uid", "name", "country", "currency", "maturity_date"),
  CONSTRAINT "PK_bond" PRIMARY KEY ("id")
) INHERITS ("instrument");


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"bond","schema":"public"}}}');
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
  "coupon" REAL NOT NULL,
  CONSTRAINT "UNIQUE_coupon" UNIQUE ("bond_id", "date", "currency", "coupon"),
  CONSTRAINT "PK_coupon" PRIMARY KEY ("id")
);


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"coupon","schema":"public"}}}');
`,
      },
    ],
    business_object_insert_sql,
  },
  {
    name: 'Modeling - Business Rule',
    tests: [
      { input: [{}], error: 'No rule specified' },
      {
        input: [
          {
            rule: 'approve',
            language: 'sql',
            type: 'mutation',
            input: {
              instrument_id: 'integer',
            },
            output: 'instrument',
            code: `RETURN QUERY
UPDATE instrument SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
WHERE id = instrument_id
RETURNING *;`,
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
LANGUAGE plpgsql VOLATILE
AS $function$BEGIN

RETURN QUERY
UPDATE instrument SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
WHERE id = instrument_id
RETURNING *;

END$function$;
COMMENT ON FUNCTION approve(instrument_id integer) IS 'This is the rule function';

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_function","args":{"function":{"name":"approve","schema":"public"},"configuration":{"exposed_as":"mutation"},"source":"default"}}');
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
            code: `RETURN QUERY
UPDATE instrument SET resolution_status = 'rejected', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
WHERE id = instrument_id
RETURNING *;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
reject(instrument_id INTEGER)
RETURNS SETOF instrument
LANGUAGE plpgsql VOLATILE
AS $function$BEGIN

RETURN QUERY
UPDATE instrument SET resolution_status = 'rejected', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
WHERE id = instrument_id
RETURNING *;

END$function$;


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_function","args":{"function":{"name":"reject","schema":"public"},"configuration":{"exposed_as":"mutation"},"source":"default"}}');
`,
      },
      {
        input: [
          {
            rule: 'candidates',
            language: 'sql',
            type: 'query',
            output: 'instrument',
            code: `RETURN QUERY
SELECT * FROM instrument
WHERE resolution_status IS NULL;`,
            comments: {},
          },
        ],
        output: `
CREATE FUNCTION
candidates()
RETURNS SETOF instrument
LANGUAGE plpgsql STABLE
AS $function$BEGIN

RETURN QUERY
SELECT * FROM instrument
WHERE resolution_status IS NULL;

END$function$;


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_function","args":{"function":{"name":"candidates","schema":"public"},"configuration":{"exposed_as":"query"},"source":"default"}}');
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
WHERE instrument.resolution_status = 'approved'
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
WHERE instrument.resolution_status = 'approved'
AND instrument.uid = golden.uid
ORDER BY instrument.source DESC
LIMIT 1;

END$function$;


SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_function","args":{"function":{"name":"golden","schema":"public"},"configuration":{"exposed_as":"query"},"source":"default"}}');
`,
      },
      //       {
      //         input: [
      //           {
      //             rule: 'reject',
      //             input: {
      //               instrument_id: 'integer',
      //             },
      //             language: 'js',
      //             code: `const instrument = select('instrument', instrument_id)
      // instrument.resolution_status = 'rejected'
      // instrument.resolution_date = new Date() || CURRENT_TIMESTAMP
      // instrument.resolution_user = CURRENT_USER
      // update('instrument', instrument)`,
      //             comments: {
      //               rule: 'This is the rule function',
      //               instrument_id: 'This is the instrument identifier used internally by NeoXam or his client',
      //             },
      //           },
      //         ],
      //         output: `
      // CREATE FUNCTION
      // reject(instrument_id INTEGER)
      // RETURNS VOID
      // LANGUAGE plv8
      // AS $function$BEGIN

      // const instrument = select('instrument', instrument_id)
      // instrument.resolution_status = 'rejected'
      // instrument.resolution_date = new Date() || CURRENT_TIMESTAMP
      // instrument.resolution_user = CURRENT_USER
      // update('instrument', instrument)

      // END$function$;
      // COMMENT ON FUNCTION reject(instrument_id integer) IS 'This is the rule function';

      // SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_function","args":{"function":{"name":"reject","schema":"public"},"configuration":{"exposed_as":"mutation"},"source":"default"}}');
      // `,
      //       },
    ],
    business_rule_insert_sql,
  },
]
const scenarios_trigger = [
  {
    name: 'Modeling - Trigger Table',
    tests: [
      {
        input: ['business_object'],
        output: `
CREATE FUNCTION business_object()
RETURNS TRIGGER
LANGUAGE plv8 AS $trigger$

const log = ${log.toString()}
const execute = ${execute.toString()}
const business_object_delete_sql = ${business_object_delete_sql.toString()}
const business_object_insert_sql = ${business_object_insert_sql.toString()}

if (TG_OP === 'INSERT') {
  execute(business_object_insert_sql(NEW))
  return NEW
}
if (TG_OP === 'UPDATE') {
  execute(business_object_delete_sql(OLD))
  execute(business_object_insert_sql(NEW))
  return NEW
}
if (TG_OP === 'DELETE') {
  execute(business_object_delete_sql(OLD))
  return NEW
}

$trigger$;
CREATE TABLE "business_object" (
  "object" TEXT NOT NULL,
  "inherits" JSONB NOT NULL,
  "fields" JSONB NOT NULL,
  "comments" JSONB NOT NULL,
  CONSTRAINT "PK_business_object" PRIMARY KEY ("object")
);
CREATE TRIGGER business_object BEFORE INSERT OR UPDATE OR DELETE ON business_object
FOR EACH ROW EXECUTE FUNCTION business_object();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"business_object","schema":"public"}}}');
`,
      },
      {
        input: ['business_rule'],
        output: `
CREATE FUNCTION business_rule()
RETURNS TRIGGER
LANGUAGE plv8 AS $trigger$

const log = ${log.toString()}
const execute = ${execute.toString()}
const business_rule_delete_sql = ${business_rule_delete_sql.toString()}
const business_rule_insert_sql = ${business_rule_insert_sql.toString()}

if (TG_OP === 'INSERT') {
  execute(business_rule_insert_sql(NEW))
  return NEW
}
if (TG_OP === 'UPDATE') {
  execute(business_rule_delete_sql(OLD))
  execute(business_rule_insert_sql(NEW))
  return NEW
}
if (TG_OP === 'DELETE') {
  execute(business_rule_delete_sql(OLD))
  return NEW
}

$trigger$;
CREATE TABLE "business_rule" (
  "rule" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "comments" JSONB NOT NULL,
  CONSTRAINT "PK_business_rule" PRIMARY KEY ("rule")
);
CREATE TRIGGER business_rule BEFORE INSERT OR UPDATE OR DELETE ON business_rule
FOR EACH ROW EXECUTE FUNCTION business_rule();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"business_rule","schema":"public"}}}');
`,
      },
    ],
    trigger_table_insert_sql,
  },
]

const scenarios = scenarios_modeling

//! PRE TEST
console.clear()
await execute_hasura_sql(`
DROP TRIGGER IF EXISTS business_object ON business_object;
DROP FUNCTION IF EXISTS business_object;
DROP TABLE IF EXISTS business_object;
DROP TRIGGER IF EXISTS business_rule ON business_rule;
DROP FUNCTION IF EXISTS business_rule;
DROP TABLE IF EXISTS business_rule;
DROP FUNCTION IF EXISTS "propose";
DROP FUNCTION IF EXISTS "approve";
DROP FUNCTION IF EXISTS "reject";
DROP FUNCTION IF EXISTS "candidates";
DROP FUNCTION IF EXISTS "golden";
DROP TABLE IF EXISTS "coupon";
DROP TABLE IF EXISTS "bond";
DROP TABLE IF EXISTS "preferred";
DROP TABLE IF EXISTS "equity";
DROP TABLE IF EXISTS "instrument";
DROP TABLE IF EXISTS "resolution";
DROP TABLE IF EXISTS "user";
DROP TYPE IF EXISTS "source";
DROP TYPE IF EXISTS "status";
DROP TYPE IF EXISTS "role";
CREATE TYPE "source" AS ENUM ('manual', 'bloomberg', 'reuters');
CREATE TYPE "status" AS ENUM ('rejected', 'approved');
CREATE TYPE "role" AS ENUM ('user', 'steward', 'admin', 'robot');
CREATE TABLE "user" (
  "id" SERIAL NOT NULL,
  "role" "role" NOT NULL,
  CONSTRAINT "PK_user" PRIMARY KEY ("id")
);
CREATE TABLE "resolution" (
  "source" "source" NOT NULL DEFAULT 'manual',
  "update_user_id" INTEGER NOT NULL DEFAULT 1,
  "update_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolution_status" "status",
  "resolution_date" TIMESTAMPTZ,
  "resolution_user_id" INTEGER
);
`)
//! RUN TEST
import { assertEquals, assertRejects } from 'https://deno.land/std@0.127.0/testing/asserts.ts'
for await (const { name, tests, ...rest } of scenarios) {
  for await (const [i, { input, output, error }] of Object.entries(tests)) {
    for await (const [k, fn] of Object.entries(rest)) {
      if (error) await Deno.test(`${name} #${k} #${i}`, async () => await assertRejects(async () => await fn(...input), Error, error))
      else await Deno.test(`${name} #${k} #${i}`, async () => assertEquals(await fn(...input), output))
      // if (!error) {
      //   const sql = await fn(...input)
      //   const response = await execute_hasura_sql(sql)
      //   console.log(`${name} #${k} #${i}`, response.status, await response.text())
      // }
    }
  }
}
export default scenarios
//! POST TEST
await execute_hasura_sql(trigger_table_insert_sql('business_object'))
await execute_hasura_sql(trigger_table_insert_sql('business_rule'))
await execute_hasura_sql(
  scenarios_modeling[0].tests
    .filter(({ input: [{ object }] }) => object)
    .map(
      ({ input: [{ object, inherits = [], fields = {}, comments = {} }] }) =>
        `INSERT INTO business_object("object", "inherits", "fields", "comments")
VALUES ('${object}', '${JSON.stringify(inherits)}', '${JSON.stringify(fields)}', '${JSON.stringify(comments)}');`,
    )
    .filter(v => v)
    .join('\n'),
)
await execute_hasura_sql(
  scenarios_modeling[1].tests
    .filter(({ input: [{ rule }] }) => rule)
    .map(
      ({ input: [{ rule, language = 'sql', type = 'mutation', input = {}, output = 'null', code, comments = {} }] }) =>
        `INSERT INTO business_rule("rule", "language", "type", "input", "output", "code", "comments")
VALUES ('${rule}', '${language}', '${type}', '${JSON.stringify(input)}', '${output}', $code$${code}$code$, '${JSON.stringify(comments)}');`,
    )
    .filter(v => v)
    .join('\n'),
)
// await execute_hasura_sql(`
// INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR');
// INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-297920657', 'EPA:BNP', 'FR', 'EUR', 'BNP', '730372026');
// INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-320404407', 'NASDAQ:TSLA', 'US', 'USD', 'TESLA', '194491300', 0.07);
// INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-519487830', 'AB-PREF-7%', 'FR', 'EUR', 'ALPHABET', '693264265');
// INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-694964950', 'NASDAQ:GOOGL', 'US', 'USD', 'ALPHABET', '175190113', 0.05);
// INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-857828573', 'EPA:AF', 'FR', 'EUR', 'AIR FRANCE KLM', '194491300');
// INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-943649527', 'AF-PREF-5%', 'FR', 'EUR', 'AIR FRANCE KLM', '787057726');
// INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-439903446', 'GGL-2027-2.3%', 'FR', 'EUR', '2027-01-01');
// INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-744967405', 'KLM-2023-7%', 'FR', 'EUR', '2023-01-01');
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2022-01-01', 'USD', 0.023);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2023-01-01', 'USD', 0.023);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2024-01-01', 'USD', 0.023);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2025-01-01', 'USD', 0.023);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2026-01-01', 'USD', 0.023);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2027-01-01', 'USD', 0.023);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2022-01-01', 'USD', 0.07);
// INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2023-01-01', 'USD', 0.07);
// `)

await execute_hasura_sql(`
SELECT $$1. Valentin propose FR-018066960, pending$$;
INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR');

SELECT $$2. Clément approve FR-018066960, valid$$;
SELECT id FROM candidates();
SELECT approve(1);

SELECT $$3. Laurent propose FR-297920657, invalid car unauthorized, pas les droits de création$$;
-- INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-297920657', 'EPA:BNP', 'FR', 'EUR', 'BNP', '730372026');
-- SELECT id FROM candidates();
-- assert number of candidates is the same

SELECT $$4. Serge propose FR-320404407, valid, bypass du 4eyes car superadmin$$;
INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-320404407', 'NASDAQ:TSLA', 'US', 'USD', 'TESLA', '194491300', 0.07);

SELECT $$5. Laurent propose une modification pour FR-018066960, pending$$;
INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBTZZZ', 'FR', 'ZZZ');

SELECT $$6. Clément reject la modification de FR-018066960, invalid car rejected$$;
SELECT id FROM candidates();
SELECT reject(3);

SELECT $$7. Robot-Bloomberg propose FR-519487830, valid, source Bloomberg$$;
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-519487830', 'AB-PREF-7%', 'FR', 'EUR', 'ALPHABET', '693264265');

-- SELECT $$8. Valentin propose DE123 sans la currency, donc invalid car errored, requête mal former, hack du truc$$;
-- INSERT INTO preferred (uid, name, country, issuer, share_number, rate) VALUES ('FR-694964950', 'NASDAQ:GOOGL', 'US', 'ALPHABET', '175190113', 0.05);
`)

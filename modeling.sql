DROP FUNCTION IF EXISTS modeling;
DROP TRIGGER IF EXISTS modeling ON modeling;
DROP TABLE IF EXISTS modeling;
CREATE FUNCTION
modeling()
RETURNS trigger
LANGUAGE plv8 AS $$

if (!NEW) throw new Error(`DELETE table ${table}`)
let { table = '', inherits = [], columns = {}, comments = {} } = NEW
if (!table) throw new Error(`No table specified`)
if (!columns) throw new Error(`No columns specified`)
const column_type = ([k, v]) => {
  const tables = []
  let type = {
    text: 'VARCHAR',
    string: 'VARCHAR',
    float: 'REAL',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    timestamp: 'TIMESTAMPZ',
    object: 'JSONB',
  }[v]
  // if (Array.isArray(v)) type = `ENUM (${Object.keys(v).map(k => `'${k}'`).join(', ')})`
  // if (tables.includes(v)) type = `INTEGER REFERENCES ${v}(id)`
  if (!type) throw new Error(`Unknown type ${v} for ${k}`)
  return `"${k}" ${type}`
}
const statement = `CREATE TABLE "${table}" (
  "id" SERIAL NOT NULL,
  ${Object.entries(columns).map(column_type).join(',\n  ')},
  CONSTRAINT "UNIQUE_${table}" UNIQUE (${Object.keys(columns).map(k => `"${k}"`)}),
  CONSTRAINT "PK_${table}" PRIMARY KEY ("id")
) INHERITS (${inherits.map(k => `"${k}"`)})`
const { prepare, execute, find_function, elog } = plv8
execute(statement)
return NEW

$$;
CREATE TABLE "modeling" (
  "table" VARCHAR NOT NULL,
  "inherits" JSONB NOT NULL,
  "columns" JSONB NOT NULL,
  "comments" JSONB NOT NULL,
  CONSTRAINT "PK_modeling" PRIMARY KEY ("table")
);
CREATE TRIGGER modeling BEFORE INSERT OR DELETE ON modeling
FOR EACH ROW EXECUTE FUNCTION modeling();
INSERT INTO modeling ("table", "inherits", "columns", "comments") VALUES ('instrument', '["resolution"]', '{"uid": "string", "name": "string", "country": "string", "currency": "string"}', '{}');

/*
mutation {
  schema(args: {
    table: 'instrument',
    inherits: ['resolution'],
    columns: {
      uid: 'text',
      name: 'text',
      country: 'text',
      currency: 'text',
    },
    comments: {
      table: 'This is the instrument table',
      uid: 'This is the instrument identifier used internally by NeoXam or his client',
    },
  }) {
    table
  }
}
*/

/*
DO $$

const { table = '', inherits = [], columns = {}, comments = {} } = {
  table: 'instrument',
  inherits: ['resolution'],
  columns: {
    uid: 'text',
    name: 'text',
    country: 'text',
    currency: 'text',
  },
  comments: {
    table: 'This is the instrument table',
    uid: 'This is the instrument identifier used internally by NeoXam or his client',
  },
}

if (!table) throw new Error(`No table specified`)
if (!inherits) inherits = []
if (!columns) throw new Error(`No columns specified`)
if (!comments) comments = {}
const column_type = ([k, v]) => {
  const tables = []
  let type = {
    text: 'VARCHAR',
    string: 'VARCHAR',
    float: 'REAL',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    timestamp: 'TIMESTAMPZ',
    object: 'JSONB',
  }[v]
  // if (Array.isArray(v)) type = `ENUM (${Object.keys(v).map(k => `'${k}'`).join(', ')})`
  // if (tables.includes(v)) type = `INTEGER REFERENCES ${v}(id)`
  if (!type) throw new Error(`Unknown type ${v} for ${k}`)
  return `"${k}" ${type}`
}
const statement = `CREATE TABLE "${table}" (
  "id" SERIAL NOT NULL,
  ${Object.entries(columns).map(column_type).join(',\n  ')},
  CONSTRAINT "UNIQUE_${table}" UNIQUE (${Object.keys(columns).map(k => `"${k}"`)}),
  CONSTRAINT "PK_${table}" PRIMARY KEY ("id")
) INHERITS (${inherits.map(k => `"${k}"`)})`
const { prepare, execute, find_function, elog } = plv8
execute(statement)

$$ LANGUAGE plv8;
*/

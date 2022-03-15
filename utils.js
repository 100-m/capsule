// @ts-check
// https://codewithhugo.com/jsdoc-typescript-typings-types-d-ts/
// npm i -g jsdoc tsd-jsdoc
// mkdir .doc
// ln -s $NVM_BIN/../lib/node_modules/tsd-jsdoc/dist .doc/tsd
// jsdoc -t .doc/tsd -r utils.js -d .doc/types
//! MOCK plv8
export const NOTICE = 'NOTICE'
export const plv8 = {
  execute: sql => {
    return {
      [`SELECT object FROM business_object;`]: ['bond', 'equity', 'instrument', 'preferred'].map(v => ({ object: v })),
      [`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('instrument');`]: [
        'id',
        'uid',
        'name',
        'country',
        'currency',
      ].map(v => ({ column_name: v })),
      [`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('equity');`]: [
        'id',
        'uid',
        'name',
        'country',
        'currency',
        'issuer',
        'share_number',
      ].map(v => ({ column_name: v })),
    }[sql] || []
  },
  elog: console.log,
}
export const execute_hasura_sql = async sql => {
  const response = await fetch('https://capsule.dock.nx.digital/v2/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      {
        type: 'bulk',
        source: 'default',
        args: [
          {
            type: 'run_sql',
            args: {
              source: 'default',
              sql: sql,
              cascade: true,
              read_only: false,
            },
          },
        ],
      },
      null,
      2,
    ),
  })
  // if (response.status !== 200) console.error(sql, response.status, await response.text())
  if (response.status !== 200) throw new Error(await response.text())
  console.log(response.status, sql.split('\n').filter(v => v)[0])
  return response
}

//! UTILS plv8
/**
 *
 * @param {string} str
 * @returns void
 */
export const log = str => plv8.elog(NOTICE, typeof str !== 'string' ? JSON.stringify(str) : str)
/**
 * https://plv8.github.io/#-code-plv8-execute-code-
 * @param {string} str
 * @returns {{}[] | number}
 */
export const execute = str => (log(str), plv8.execute(str))

//! UTILS capsule
export const business_object_insert_sql = ({ object, inherits = [], fields = {}, comments = {} }) => {
  if (!object) throw new Error(`No object specified`)
  if (!fields) throw new Error(`No fields specified`)
  const PG_TYPES = {
    // Javascript primitives
    null: 'VOID',
    string: 'TEXT',
    number: 'REAL',
    array: 'JSONB',
    object: 'JSONB',
    // Database types
    serial: 'SERIAL',
    text: 'TEXT',
    float: 'REAL',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    timestamp: 'TIMESTAMPTZ',
    json: 'JSONB',
  }
  const column_type = ([k, v]) => {
    let [field, nullable] = k.endsWith('?') ? [k.slice(0, -1), ''] : [k, ' NOT NULL']
    let type = PG_TYPES[v]
    if (Array.isArray(v)) throw new Error(`Array type not implemented yet`)
    if (Array.isArray(v))
      type = `ENUM (${Object.keys(v)
        .map(k => `'${k}'`)
        .join(', ')})`
    if (!type) {
      const objects = execute('SELECT object FROM business_object;').map(v => v.object)
      if (objects.includes(v)) type = `INTEGER${nullable} REFERENCES "${v}"("id")`
      nullable = ''
    }
    if (!type) throw new Error(`Unknown type ${v} for ${field}`)
    return `"${field}" ${type}${nullable}`
  }
  // prettier-ignore
  const inherited_fields = inherits.length ? execute(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (${inherits.map(k => `'${k}'`)});`).map(v => v.column_name) : []
  const id_field = inherited_fields.find(v => v === 'id') ? {} : { id: 'serial' }
  const str_columns = Object.entries({ ...id_field, ...fields })
    .map(column_type)
    .join(',\n  ')
  const str_unique = inherited_fields
    .filter(k => k !== 'id')
    .concat(Object.keys(fields))
    .map(k => `"${k}"`)
    .join(', ')
  const str_inherits = inherits.length ? ` INHERITS (${inherits.map(k => `"${k}"`).join(', ')})` : ''
  const str_comments = Object.entries(comments)
    .map(([k, v]) => (k === 'object' ? `COMMENT ON TABLE "${object}" IS '${v || ''}';` : `COMMENT ON COLUMN "${object}"."${k}" IS '${v || ''}';`))
    .join('\n')
  return `
CREATE TABLE "${object}" (
  ${str_columns},
  "source" "source" NOT NULL DEFAULT 'manual',
  "resolution" "resolution",
  "valid" TSTZRANGE NOT NULL DEFAULT TSTZRANGE(NOW(), NULL),
  "last_update" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_change" INT,
  CONSTRAINT "UNIQUE_${object}" UNIQUE (${str_unique}),
  CONSTRAINT "PK_${object}" PRIMARY KEY ("id")
)${str_inherits};
${str_comments}

CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "${object}"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"${object}","schema":"public"}}}');
`
}
export const business_object_delete_sql = ({ object }) => {
  if (!object) throw new Error(`No object specified`)
  return `
DROP TRIGGER history ON "${object}";
DROP TABLE "${object}";
SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_untrack_table","args":{"table":{"name":"${object}","schema":"public"}}}');
`
}
export const business_rule_insert_sql = ({ rule, language = 'sql', type = 'mutation', input = {}, output = 'null', code, comments = { rule: '' } }) => {
  if (!rule) throw new Error(`No rule specified`)
  if (!code) throw new Error(`No code specified`)
  const PG_TYPES = {
    // Javascript primitives
    null: 'VOID',
    string: 'TEXT',
    number: 'REAL',
    array: 'JSONB',
    object: 'JSONB',
    // Database types
    serial: 'SERIAL',
    text: 'TEXT',
    float: 'REAL',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    timestamp: 'TIMESTAMPTZ',
    json: 'JSONB',
  }
  const PG_LANGUAGES = {
    sql: 'plpgsql',
    js: 'plv8',
    // py: 'plpythonu',
  }
  language = language.replace('javascript', 'js').replace('python', 'py')
  if (!PG_LANGUAGES[language]) throw new Error(`Language ${language} not supported`)
  const str_input = Object.entries(input)
    .map(([k, v]) => `${k} ${PG_TYPES[v]}`)
    .join(', ')
  const str_lang = {
    js: `\n${code}\n`,
    sql: `BEGIN\n${code}\nEND`,
    // py: code,
  }
  return `
CREATE FUNCTION
${rule}(${str_input})
RETURNS ${PG_TYPES[output] || `SETOF ${output}`}
LANGUAGE ${PG_LANGUAGES[language]} ${type === 'mutation' ? 'VOLATILE' : 'STABLE'}
AS $function$${str_lang[language]}$function$;
${comments.rule ? `COMMENT ON FUNCTION ${rule}(instrument_id integer) IS '${comments.rule || ''}';` : ''}

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_function","args":{"function":{"name":"${rule}","schema":"public"},"configuration":{"exposed_as":"${type}"},"source":"default"}}');
`
}
export const business_rule_delete_sql = ({ rule, type }) => {
  if (!rule) throw new Error(`No rule specified`)
  return `
DROP FUNCTION ${rule};
SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_untrack_function","args":{"function":{"name":"${rule}","schema":"public"},"configuration":{"exposed_as":"${type}"},"source":"default"}}');
`
}
export const trigger_table_insert_sql = type =>
  type === 'business_object'
    ? `
CREATE FUNCTION business_object()
RETURNS TRIGGER
LANGUAGE plv8 AS $trigger$

${[log, execute, business_object_insert_sql, business_object_delete_sql].map(fn => `const ${fn.name} = ${fn.toString()}`).join('\n')}

if (TG_OP === 'INSERT') {
  execute(business_object_insert_sql(NEW))
}
if (TG_OP === 'UPDATE') {
  execute(business_object_delete_sql(OLD))
  execute(business_object_insert_sql(NEW))
}
if (TG_OP === 'DELETE') {
  execute(business_object_delete_sql(OLD))
}
return NEW

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
`
    : `
CREATE FUNCTION business_rule()
RETURNS TRIGGER
LANGUAGE plv8 AS $trigger$

${[log, execute, business_rule_insert_sql, business_rule_delete_sql].map(fn => `const ${fn.name} = ${fn.toString()}`).join('\n')}

if (TG_OP === 'INSERT') {
  execute(business_rule_insert_sql(NEW))
}
if (TG_OP === 'UPDATE') {
  execute(business_rule_delete_sql(OLD))
  execute(business_rule_insert_sql(NEW))
}
if (TG_OP === 'DELETE') {
  execute(business_rule_delete_sql(OLD))
}
return NEW

$trigger$;
CREATE TABLE "business_rule" (
  "rule" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "comments" JSONB NOT NULL,
  CONSTRAINT "PK_business_rule" PRIMARY KEY ("rule")
);
CREATE TRIGGER business_rule BEFORE INSERT OR UPDATE OR DELETE ON business_rule
FOR EACH ROW EXECUTE FUNCTION business_rule();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_track_table","args":{"table":{"name":"business_rule","schema":"public"}}}');
`
export const trigger_table_delete_sql = type =>
  type === 'business_object'
    ? `
DROP TRIGGER business_object ON business_object;
DROP FUNCTION business_object;
DROP TABLE business_object;
`
    : `
DROP TRIGGER business_rule ON business_rule;
DROP FUNCTION business_rule;
DROP TABLE business_rule;
`

//! MOCK plv8
export const NOTICE = 'NOTICE'
export const plv8 = {
  execute: sql => {
    return (
      {
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
    )
  },
  elog: console.log,
}
export const execute_sql = async sql => {
  const response = await fetch('https://capsule.dock.nx.digital/v2/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-admin-secret': 'fMIhN8q92lOQWVGH',
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
export const execute_graphql = async gql => {
  const token = (await import('https://esm.sh/jsonwebtoken')).default.sign(
    {
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['anon', 'admin', 'user', 'steward', 'configurator'],
        'x-hasura-default-role': 'user',
        'x-hasura-user-id': 'user-id-1',
      },
    },
    'fMIhN8q92lOQWVGHI8WMRlnpdvTbUNljOzjWUgCCVlA=',
    { algorithm: 'HS256', expiresIn: '1 day' },
  )
  const response = await fetch('https://capsule.dock.nx.digital/v1/graphql', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: gql,
      variables: null,
    }),
  })
  if (response.status !== 200) throw new Error(await response.text())
  const { data } = await response.json()
  return data
}

//! UTILS plv8
/** @type {(str: string) => void} */
export const log = str => plv8.elog(NOTICE, typeof str !== 'string' ? JSON.stringify(str) : str)
/** @type {(str: string) => { [key: string]: string }[] | number} */
export const execute = str => (log(str), plv8.execute(str))

//! UTILS capsule
export const business_object_insert = ({ object, inherits = [], fields = {}, comments = {} }) => {
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
  const str_columns_track = Object.keys({ ...id_field, ...fields })
    .concat(inherited_fields)
    .concat(['source', 'resolution', 'updated_by', 'updated_at', 'last_change', 'valid'])
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(k => `"${k}"`)
    .join(',')
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
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_change" INT,
  "valid" TSTZRANGE NOT NULL DEFAULT TSTZRANGE(NOW(), NULL),
  CONSTRAINT "UNIQUE_${object}" UNIQUE (${str_unique}),
  CONSTRAINT "PK_${object}" PRIMARY KEY ("id")
)${str_inherits};
${str_comments}

CREATE TRIGGER permission BEFORE INSERT OR UPDATE OR DELETE ON "${object}"
FOR EACH ROW EXECUTE FUNCTION permission();
CREATE TRIGGER history BEFORE INSERT OR UPDATE OR DELETE ON "${object}"
FOR EACH ROW EXECUTE FUNCTION history();

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"${object}","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"${object}","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":[${str_columns_track}]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"${object}","schema":"public"},"role":"user","permission":{"columns":[${str_columns_track}],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"${object}","schema":"public"},"role":"user","permission":{"columns":[${str_columns_track}],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"${object}","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`
}
export const business_object_delete = ({ object }) => {
  if (!object) throw new Error(`No object specified`)
  return `
DROP TRIGGER history ON "${object}";
DROP TABLE "${object}";
SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_untrack_table","args":{"table":{"name":"${object}","schema":"public"}}}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`
}
export const business_rule_insert = ({ rule, language = 'sql', type = 'mutation', input = {}, output = 'null', code, comments = {} }) => {
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

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_function","args":{"function":{"name":"${rule}","schema":"public"},"configuration":{"exposed_as":"${type}"}}},{"type":"pg_create_function_permission","args":{"function":{"schema":"public","name":"${rule}"},"role":"user"}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`
}
export const business_rule_delete = ({ rule, type }) => {
  if (!rule) throw new Error(`No rule specified`)
  return `
DROP FUNCTION ${rule};
SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"pg_untrack_function","args":{"function":{"name":"${rule}","schema":"public"},"configuration":{"exposed_as":"${type}"}}}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`
}
export const business_object_trigger = `
CREATE FUNCTION business_object()
RETURNS TRIGGER
LANGUAGE plv8 AS $trigger$

${[log, execute, business_object_insert, business_object_delete].map(fn => `const ${fn.name} = ${fn.toString()}`).join('\n')}

if (TG_OP === 'INSERT') {
  execute(business_object_insert(NEW))
}
if (TG_OP === 'UPDATE') {
  execute(business_object_delete(OLD))
  execute(business_object_insert(NEW))
}
if (TG_OP === 'DELETE') {
  execute(business_object_delete(OLD))
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

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"business_object","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"business_object","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["object","inherits","fields","comments"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"business_object","schema":"public"},"role":"user","permission":{"columns":["object","inherits","fields","comments"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"business_object","schema":"public"},"role":"user","permission":{"columns":["object","inherits","fields","comments"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"business_object","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`
export const business_rule_trigger = `
CREATE FUNCTION business_rule()
RETURNS TRIGGER
LANGUAGE plv8 AS $trigger$

${[log, execute, business_rule_insert, business_rule_delete].map(fn => `const ${fn.name} = ${fn.toString()}`).join('\n')}

if (TG_OP === 'INSERT') {
  execute(business_rule_insert(NEW))
}
if (TG_OP === 'UPDATE') {
  execute(business_rule_delete(OLD))
  execute(business_rule_insert(NEW))
}
if (TG_OP === 'DELETE') {
  execute(business_rule_delete(OLD))
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

SELECT net.http_post('https://capsule.dock.nx.digital/v1/metadata', '{"type":"bulk","args":[{"type":"pg_track_table","args":{"table":{"name":"business_rule","schema":"public"}}},{"type":"pg_create_insert_permission","args":{"table":{"name":"business_rule","schema":"public"},"role":"user","permission":{"check":{},"allow_upsert":true,"backend_only":false,"set":{},"columns":["rule","language","type","input","output","code","comments"]}}},{"type":"pg_create_select_permission","args":{"table":{"name":"business_rule","schema":"public"},"role":"user","permission":{"columns":["rule","language","type","input","output","code","comments"],"computed_fields":[],"backend_only":false,"filter":{},"limit":null,"allow_aggregations":true}}},{"type":"pg_create_update_permission","args":{"table":{"name":"business_rule","schema":"public"},"role":"user","permission":{"columns":["rule","language","type","input","output","code","comments"],"filter":{},"backend_only":false,"set":{},"check":{}}}},{"type":"pg_create_delete_permission","args":{"table":{"name":"business_rule","schema":"public"},"role":"user","permission":{"backend_only":false,"filter":{}}}}]}', '{}'::jsonb, '{"content-type":"application/json","x-hasura-admin-secret":"fMIhN8q92lOQWVGH"}'::jsonb, 5000);
`

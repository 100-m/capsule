# Capsule Documentation

This [documentation (capsule.nx.digital)](https://capsule.nx.digital/) is hosted on [github](https://github.com/100-m/capsule) and can be [edited directly there](https://github.com/100-m/capsule/edit/main/README.md).

The API is accessible on https://capsule.dock.nx.digital. Postgres and Hasura run on an AWS server dock and via [this configuration](https://github.com/100-m/capsule/blob/main/docker-compose.yml).

Capsule is a Research & Development project developed by NeoXam Lab for a data management system with the following features:
- [ ] Database with authorisation capabilities, user or role or feature or row level based
- [x] Database with validation capabilities, 4-eyes, resolution
- [x] Database with multi-source capabilities
- [-] Database with audit/bitemporality capabilities, as-at and as-of, history, rollback
- [x] Database with hierarchic capabilities, inheritance, relations
- [x] System with modeling capabilities
- [x] System with business rules capabilities, database-level or application-level (lambda) based
- [ ] System with computed field capabilities, stored or virtual
- [ ] System with dependency graph capabilities
- [ ] System with workflow capabilities, scheduling, run cmd, wait for, user input/validation
- [ ] System with cross-filtering capabilities
- [ ] System with search capabilities
- [ ] System with quality-check capabilities (= business rules ?)
- [x] System with testing capabilities
- [x] API in GraphQL & Rest
- [x] API with realtime capabilities
- [x] API documentation
- [x] Playground Back ([Hasura](https://capsule.dock.nx.digital/console) or [Apollo](https://studio.apollographql.com/sandbox/explorer) console)
- [ ] Playground Front (Code editor + Forms)
- [ ] SDK with methods:
  1. version
  2. login/logout
  3. create/delete = modeling
  4. call = business_object or business_rule (log equivalent sql/rest/graphql requests)
  5. realtime (include store + vue)

Usage:
- click on [Run on Hasura](https://capsule.dock.nx.digital/console)
- copy a request example bellow
- paste the request on the central panel, bellow "GraphiQL >"
- click on the play ">" button

## Propose an instrument (an equity here)
> Note: source can be omitted (manual by default), user_id can be forced (for superadmin only)
```gql
mutation {
  insert_equity_one(object: {
    uid: "FR-297920657",
    name: "EPA:BNP",
    country: "FR",
    currency: "EUR",
    issuer: "BNP",
    share_number: 730372026,
    source: "manuel",
    user_id: 1
  }) {
    id
  }
}
```

## List all candidates
```gql
query {
  candidates {
    id
  }
}
```

## Approve a candidate
```gql
mutation {
  approve(args: {
    instrument_id: 1
  }) {
    id
  }
}
```

## Retrieve the golden copy for an instrument
```gql
query {
  golden(args: {
    uid: "FR-297920657"
  }) {
    name
    country
    currency
  }
}
```

## Modeling
```ts
// NOTE: on ne va pas faire un DSL complexe et complet, pour un comportement différent, plus de contraintes, des valeurs par default, etc... il faudra fait en SQL directement
type business_object = {
  object: string
  inherits?: [string]
  fields: {
    [key: string]: 'text' | 'float' | 'integer' | 'boolean' | 'date' | 'time' | 'timestamp' | 'object'
  }
  comments: {
    table: string
    [key: field]: string
  }
}
```

## List all classes, info, descriptions
```gql
query {
  business_object {
    object
    inherits
    fields
    comments
  }
}
```
## Create a business object
```gql
mutation {
  insert_business_object_one(object: {
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
```

## Create a business rule
```gql
mutation {
  insert_business_rule_one(object: {
    rule: "approve",
    input: {
      instrument_id: "integer",
    },
    output: "instrument",
    language: "sql",
    content: """
      UPDATE instrument SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
      WHERE id = instrument_id
      RETURNING *;
    """,
    comments: {
      rule: "This is the rule function",
      instrument_id: "This is the instrument identifier used internally by NeoXam or his client"
    }
  }) {
    object
  }
}
# OR
mutation {
  insert_business_rule_one(object: {
    rule: "approve",
    inputs: {
      instrument_id: "integer",
    },
    output: null,
    language: "sql",
    content: """
      // Provided JS function are
      // execute(sql: string) [native]
      // log/info/debug(text: string) [wrap elog]
      // select(object: string, id: number) [wrap execute]
      // insert(object: object)
      // update(object: object)
      // upsert(object: object)
      // delete(object: object)
      const instrument = select('instrument', instrument_id)
      instrument.resolution_status = 'approved'
      instrument.resolution_date = new Date() || CURRENT_TIMESTAMP
      instrument.resolution_user = CURRENT_USER
      update(instrument)
    """,
    comments: {
      rule: "This is the rule function",
      instrument_id: "This is the instrument identifier used internally by NeoXam or his client"
    }
  }) {
    object
  }
}
```

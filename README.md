# Capsule Documentation

Capsule is a Research & Development project developed by NeoXam Lab for a data management system with the following features:
- [-] Database with authorisation capabilities, user or role or feature or row level based
- [-] Database with audit capabilities, history, rollback
- [x] Database with validation capabilities, 4-eyes, resolution
- [ ] Database with bitemporality capabilities, as-at and as-of
- [x] Database with modeling capabilities
- [0] Database with business rules capabilities, database-server or application-server (lambda)
- [ ] Database with computed field capabilities, stored or virtual
- [ ] System with dependency graph capabilities
- [ ] System with workflow / scheduling capabilities
- [x] API in GraphQL & Rest
- [x] API documented

The documentation is located here https://github.com/100-m/capsule and can be edited directly on github.  
The API runs on https://capsule.dock.nx.digital via [this configuration](https://github.com/100-m/capsule/blob/main/docker-compose.yml).  
The documentation , and will reflect immediately any change on the GraphQL API.

- [Edit on github](https://github.com/100-m/capsule/edit/main/README.md)  
- [Run on Hasura](https://capsule.dock.nx.digital/console)  
- [Run on Apollo](https://studio.apollographql.com/sandbox/explorer)  

Here are sample requests that can be run on Hasura by doing the following:
  - click on [Run on Hasura](https://capsule.dock.nx.digital/console)
  - copy a request example bellow
  - paste the request on the central panel, bellow "GraphiQL >"
  - click on the play ">" button

## Propose an instrument (an equity here)
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
type schema = {
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
  schema {
    object
    inherits
    fields
    comments
  }
}
```
## Create a new class
```gql
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
```

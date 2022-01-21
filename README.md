# Capsule Documentation

This documentation is generated from https://github.com/100-m/capsule.  
The API is run on https://capsule.dock.nx.digital via [this configuration](https://github.com/100-m/capsule/blob/main/docker-compose.yml).  
The documentation can be edited directly on github, and will reflect immediately any change on the GraphQL API.

[Edit on github](https://github.com/100-m/capsule/edit/main/README.md)  
[Run on Hasura](https://capsule.dock.nx.digital/console)  
[Run on Apollo](https://studio.apollographql.com/sandbox/explorer)  

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
type schema = {
  table: string
  extends?: [string]
  columns: {
    [key: string]: 'string?' | 'integer?' | 'float?' | 'date?'
  }
  comments: {
    table: string
    [key: column]: string
  }
  // NOTE: on ne va pas faire un DSL complexe et complet.
  // Une contrainte d'unicité sera créer auto
  // pour un comportement différent, plus de contraintes, des valeurs par default, etc..
  // il faudra fait en SQL directement

  // constrains: {
  //   unique: ['uid', 'name', 'country', 'currency', 'issuer', 'share_number']
  // },
}

// Requête SQL
fetch('https://capsule.dock.nx.digital/v2/query', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    type: 'bulk',
    source: 'default',
    args: [
      {
        type: 'run_sql',
        args: {
          source: 'default',
          sql: `
CREATE TABLE "equity" (
  "issuer" VARCHAR NOT NULL,
  "share_number" INTEGER NOT NULL,
  CONSTRAINT "equity_unique" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number"),
  CONSTRAINT "PK_equity_id" PRIMARY KEY ("id")
) INHERITS (instrument);
COMMENT ON TABLE "equity" IS 'This is the equity table';
COMMENT ON COLUMN "equity"."issuer" IS 'This is the issuer of the equity table';
`,
          cascade: false,
          read_only: false,
        },
      },
    ],
  }),
})
```

## List all classes, info, descriptions
```gql
query {
  schema {
    table
    extends
    columns
    comments
  }
}
```
## Create a new class
```gql
mutation {
  schema(args: {
    table: 'equity',
    extends: ['instrument', 'audit'],
    columns: {
      issuer: 'string',
      share_number: 'integer',
    },
    comments: {
      table: 'This is the table users'
      issuer: 'string',
      share_number: 'integer',
    },
  }) {
    table
  }
}
```

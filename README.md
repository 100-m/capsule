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

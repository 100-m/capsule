# Capsule Documentation

This [documentation (capsule.nx.digital)](https://capsule.nx.digital/) is hosted on [github](https://github.com/100-m/capsule) and can be [edited directly there](https://github.com/100-m/capsule/edit/main/README.md).

The API is accessible on https://capsule.dock.nx.digital. Postgres and Hasura run on an AWS server "dock" and via [this configuration](https://github.com/100-m/capsule/blob/main/docker-compose.yml).

Capsule is a Research & Development project developed by NeoXam Lab for a data management system with the following features:
- [-] [Database with authorisation capabilities](#1-authorisation.md), user or role or feature rights with row or column level security
- [-] [Database with bi-temporality capabilities](#2), as-at and as-of, history, rollback
- [x] Database with multi-source capabilities
- [x] Database with validation capabilities, 4-eyes, resolution
- [x] Database with hierarchic capabilities, inheritance, relations
- [ ] Database with internationalization capabilities
- [x] System with modeling capabilities
- [x] System with business rules capabilities, database-level (sql/js) or application-level (lambda) based
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
  2. login/logout + reset_password/magic_link/mfa_phone
  3. create/drop = modeling business_object or business_rule
  4. insert/update/upsert/delete = data (log equivalent sql/rest/graphql requests)
  5. realtime (include store + vue)

Usage:
- click on [Run on Hasura](https://capsule.dock.nx.digital/console)
- copy a request example bellow
- paste the request on the central panel, bellow "GraphiQL >"
- click on the play ">" button
# 1. Authorisation
Cette section concerne les fonctionnalités de User Management, Authentification et Authorisation.

Le système d'Authentification est un système externe à la DB.  
Le système d'Authentification permet la gestion des utilisateurs. Creation/Suppression/Invitation/Monitoring  
Le système d'Authentification génère un token contenant le user/role. JWT  
Le système d'Authentification peut gérer des connections externe. SSO/Social  
Le système d'Authentification peut gérer des fonctionnalité avancée. MFA/magic-link  
Le système d'Authentification peut être un SAAS (Auth0, Okta) ou ON-PREMISE (gotrue, keycloak).  
TODO: Faire un script simple de création de user/token.  
TODO: Faire un setup de service ON-PREMISE  

Un user à un seul role. par DEFAULT "user".  
Un user non-authentifié à le role "anon".  
Les roles définissent un ensemble de permissions de lecture/écriture que l'utilisateur doit respecter.  
Les permissions peuvent être ajouter/surchargée par user.  

Les permissions de lecture correspondent à "SELECT".  
Les permissions d'écriture correspondent à "INSERT", "UPDATE", "DELETE".  

Les permissions de lecture limite l'accès au niveau de la ligne. (Limitation supabase et pas hasura ?)  
Les permissions d'écriture limite l'accès au niveau de la colonne ou de la fonctionnalité via une fonction custom de CHECK.  

Les permission d'écriture peuvent être gérer dans un trigger postgres.  
Dans hasura, les permissions sont gérer au niveau graphql.  
Dans supabase, les permissions sont gérer via les "row level security" de postgres.  

Scenario:
- Le superadmin créer le role data "steward" avec la règle: "can update resolution when creator is not me"
- Le superadmin créer 2 utilisateurs avec le role data "steward" et leur transmet un password
- Valentin créer l'instrument 'FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR' (role steward)
- Valentin essaye d'approuver l'insertion et change le status en 'approved' mais n'a pas les droits (4-eyes rights)
- Clément approuve l'insertion (role steward != user)

Links
- https://hasura.io/docs/latest/graphql/core/auth/index.html
- https://hasura.io/docs/latest/graphql/core/auth/authorization/index.html
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://supabase.com/docs/guides/auth/row-level-security
- https://app.supabase.io/project/ovlsonksobrdaavhmiga/api?page=auth
- https://graphql.org/learn/authorization/

# 2. Bi-Temporality
Links:
- https://supabase.com/blog/2022/03/08/audit
- https://wiki.postgresql.org/wiki/SQL2011Temporal
- https://www.juxt.pro/blog/value-of-bitemporality
- https://github.com/scalegenius/pg_bitemporal
- https://www.youtube.com/watch?v=x5ooi_pKxQc / https://www.postgresql.eu/events/pgdayparis2019/sessions/session/2291/slides/171/pgdayparis_2019_msedivy_bitemporality.pdf

Scenario:
- Valentin créer l'instrument 'FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'GBP' le 2022-01-01
- Valentin change la devise en EUR le 2022-02-01
- Clément change la devise en USD le 2022-02-01
- Clément change la date de validité de son changement pour 2050-01-01
- Valentin peut voir l'instrument qu'il a proposé et changer la date de "As Of" pour voir la version future et passée

# 3. Multi-source
Scenario:
- Valentin créer l'instrument 'FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR'
- Robot-Bloomberg créer l'instrument 'FR-018066960', 'af-private-debt', 'FR', 'EUR', 'bloomberg'
- Clément veut voir la golden copy et voit la version de Robot-Bloomberg. Il voit également la liste des sources disponible. Il peut changer de source.

# 4. Validation
Scenario: Voir le scénario d'Authorisation

# 5. Hierarchy
Scenario:
- Clément créer le data model instrument/equity/preferred
- Clément créer un preferred stock, avec les champs hérité d'instrument et equity
- Clément consulte le dictionnaire métier et voit l'arbre des relations entre les objets métier

# Modeling
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
```

# Data Management
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

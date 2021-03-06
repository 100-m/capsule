# Capsule Documentation

This [documentation (capsule.nx.digital)](https://capsule.nx.digital/) is hosted on [github](https://github.com/100-m/capsule) and can be [edited directly there](https://github.com/100-m/capsule/edit/main/README.md).

The API is accessible on https://capsule.dock.nx.digital. Postgres and Hasura run on an AWS server "dock" and via [this configuration](https://github.com/100-m/capsule/blob/main/docker-compose.yml).

Capsule is a Research & Development project developed by NeoXam Lab for a data management system with the following features:

- [x] [Database with authorisation capabilities](#1-authorisation), user or role or feature rights with row or column level security
- [ ] [Database with bi-temporality capabilities](#2-bi-temporality), as-at and as-of, history, rollback
- [x] [Database with multi-source capabilities](#3-multi-source)
- [x] [Database with validation capabilities](#4-validation), 4-eyes, resolution
- [x] [Database with hierarchic capabilities](#5-hierarchy), inheritance, relations
- [ ] [Database with internationalisation capabilities](#6-internationalisation)
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

Development:

- `git clone git@github.com:100-m/capsule.git`
- `deno test --no-check --allow-net --watch`
- `npx prettier * --write`

Remote:

- `ssh dock`
- `cd capsule.dock.nx.digital`
- `dc rm -fs;sudo /bin/rm -rf volumes/db/data;sudo mkdir volumes/db/data;sudo chmod 777 volumes/db/data;dc up -d;dc logs -f`

# 1. Authorisation

Cette section concerne les fonctionnalit??s de User Management, Authentification et Authorisation.

Le syst??me d'Authentification est un syst??me externe ?? la DB.  
Le syst??me d'Authentification permet la gestion des utilisateurs. Creation/Suppression/Role/Invitation/Monitoring  
Le syst??me d'Authentification g??n??re un token contenant le user/role. JWT  
Le syst??me d'Authentification peut ??tre un SAAS (Auth0, Okta) ou ON-PREMISE (gotrue, keycloak).  
Le syst??me d'Authentification peut g??rer des connections externe. SSO/Social  
Le syst??me d'Authentification peut g??rer des fonctionnalit??s avanc??es. MFA/magic-link

Un user ?? un seul role. par DEFAULT "user".  
Un user non-authentifi?? ?? le role "anon".  
Un role peut "h??rit??" d'autres roles. https://capsule.dock.nx.digital/console/settings/inherited-roles
Les roles d??finissent un ensemble de permissions de lecture/??criture que l'utilisateur doit respecter.  
Les permissions peuvent ??tre ajouter/surcharg??e par user.

Les permissions de lecture correspondent ?? "SELECT".  
Les permissions d'??criture correspondent ?? "INSERT", "UPDATE", "DELETE".

Les permissions de lecture limite l'acc??s au niveau de la ligne. (Limitation supabase et pas hasura ?)  
Les permissions d'??criture limite l'acc??s au niveau de la colonne ou de la fonctionnalit?? via une fonction custom de CHECK.

Les permission d'??criture peuvent ??tre g??rer dans un trigger postgres.  
Dans hasura, les permissions peuvent ??tre g??rer au niveau graphql.  
Dans supabase, les permissions peuvent ??tre g??rer via les user et policy postgres. (row level security)

Scenario:

- Le superadmin cr??er le role data "steward" avec la r??gle: "can update resolution when creator is not me"
- Le superadmin cr??er 2 utilisateurs avec le role data "steward" et leur transmet un password
- Valentin cr??er l'instrument 'FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR' (role steward)
- Valentin essaye d'approuver l'insertion et change le status en 'approved' mais n'a pas les droits (4-eyes rights)
- Cl??ment approuve l'insertion (role steward != user)

Links

- https://hasura.io/docs/latest/graphql/core/auth/index.html
- https://hasura.io/docs/latest/graphql/core/auth/authorization/index.html
- https://github.com/hasura/graphql-engine/issues/4112
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://supabase.com/docs/guides/auth/row-level-security
- https://app.supabase.io/project/ovlsonksobrdaavhmiga/api?page=auth
- https://graphql.org/learn/authorization/

# 2. Bi-Temporality

Scenario:

- Valentin cr??er l'instrument 'FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'GBP' le 2022-01-01
- Valentin change la devise en EUR le 2022-02-01
- Cl??ment change la devise en USD le 2022-02-01
- Cl??ment change la date de validit?? de son changement pour 2050-01-01
- Valentin peut voir l'instrument qu'il a propos?? et changer la date de "As Of" pour voir la version future et pass??e

Links:

- https://supabase.com/blog/2022/03/08/audit
- https://github.com/hasura/audit-trigger / https://wiki.postgresql.org/wiki/Audit_trigger_91plus
- https://wiki.postgresql.org/wiki/SQL2011Temporal
- https://www.juxt.pro/blog/value-of-bitemporality
- https://github.com/scalegenius/pg_bitemporal
- https://www.youtube.com/watch?v=x5ooi_pKxQc / https://www.postgresql.eu/events/pgdayparis2019/sessions/session/2291/slides/171/pgdayparis_2019_msedivy_bitemporality.pdf

# 3. Multi-source

Scenario:

- Valentin cr??er l'instrument 'FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR'
- Robot-Bloomberg cr??er l'instrument 'FR-018066960', 'af-private-debt', 'FR', 'EUR', 'bloomberg'
- Cl??ment veut voir la golden copy et voit la version de Robot-Bloomberg. Il voit ??galement la liste des sources disponible. Il peut changer de source.

# 4. Validation

Scenario: Voir le sc??nario d'Authorisation

# 5. Hierarchy

Scenario:

- Cl??ment cr??er le data model instrument/equity/preferred
- Cl??ment cr??er un preferred stock, avec les champs h??rit?? d'instrument et equity
- Cl??ment consulte le dictionnaire m??tier et voit l'arbre des relations entre les objets m??tier

# 6. Internationalisation

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
  insert_business_object_one(
    object: {
      object: "instrument"
      inherits: ["resolution"]
      fields: { uid: "text", name: "text", country: "text", currency: "text" }
      comments: { object: "This is the instrument table", uid: "This is the instrument identifier used internally by NeoXam or his client" }
    }
  ) {
    object
  }
}
```

## Create a business rule

```gql
mutation {
  insert_business_rule_one(
    object: {
      rule: "approve"
      input: { instrument_id: "integer" }
      output: "instrument"
      language: "sql"
      content: """
      UPDATE instrument SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
      WHERE id = instrument_id
      RETURNING *;
      """
      comments: { rule: "This is the rule function", instrument_id: "This is the instrument identifier used internally by NeoXam or his client" }
    }
  ) {
    object
  }
}
```

# Data Management

## Propose an instrument (an equity here)

> Note: source can be omitted (manual by default), user_id can be forced (for superadmin only)

```gql
mutation {
  insert_equity_one(
    object: { uid: "FR-297920657", name: "EPA:BNP", country: "FR", currency: "EUR", issuer: "BNP", share_number: 730372026 }
  ) {
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
  approve(args: { instrument_id: 1 }) {
    id
  }
}
```

## Retrieve the golden copy for an instrument

```gql
query {
  golden(args: { uid: "FR-297920657" }) {
    name
    country
    currency
  }
}
```

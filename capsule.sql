/*

1. User / Roles / Rights
User {
  STEWARD
  ADMIN
  ROBOT
}
login({ username, password })
logout()
authorize(user, event): boolean

2. Audit
event.date
event.user
event.effetive_date
rollback(date)?
rollback(event_id)?

3. Status / X-eyes
Status {
  REJECTED
  PENDING
  APPROVED
}
propose(candidate): integer
approve(event_id): void
reject(event_id): void

4. Multi-Source
Source {
  GOLDEN
  MANUAL
  BLOOMBERG
  REUTERS
}
gild(source)
gild(fn)

- On peut utiliser une GENERATED COLUMN: https://sqlite.org/gencol.html
- On doit pouvoir forcer une source ? et bypass la golden actuelle ?
- On peut considérer des priorités via ordre dans l'enum
- Code à extraire pour l'audit ? https://github.com/100-m/calcifer-sql/tree/fcf5ae3f7fbcb793f4c81691badf7bb966123997/src/migrate.js#L338-L380

Tous les concepts si dessus sont apporté par la capsule
  Note: Idéalement rien ne transparait dans le schema des autres tables
    - pas de capsule_id
    - la notion d'unicité "Business" doit être déportée sur la capsule
  Note: Idéalement rien ne transparait dans l'utilisation, on insert un objet comme si le schema ne contenait pas de capsule et elle intervient de manière transparente

Toutes les requêtes se font par l'intermédiaire de la capsule
  Ex: insérer un objet, requêter un objet, à une version ou un status ou une source particulière

Les requêtes se transforme en event et en record et sont enrichies par la capsule

*/

/*

2021-10-21:
-- DONE:
Chaque event à lieu à 1h d'interval en commençant à 8h du mat
1. Valentin propose (la création de) FR123, pending
2. Clément approve (la création de) FR123, valid
3. Laurent propose (la création de) IT123, invalid car unauthorized, pas les droits de création
4. Serge propose (la création de) GB123, valid, bypass du 4eyes car superadmin
5. Laurent propose (la modification de) FR123, pending
6. Clément reject (la modification de) FR123, invalid car rejected
7. Robot-Bloomberg propose (la création de) FR123, valid, source Bloomberg
8. Valentin propose (la création de) DE123 sans la currency, donc invalid car errored, requête mal former, hack du truc
  - Apparait dans les logs, enregistrer après le rollback de la transaction

En sortie de ça on a:
- 3 capsules (FR123, IT123, GB123)
- 8 events
- 5 instruments (3 valid, 2 invalid > info portée par la capsule)

-- TODO: Faire des exemples de requêtes type
1. récupérer un instrument gold
2. récupérer l'audit d'un instument
- invalider une valeur ?
- valider une valeur invalid ?
- forcer une source ?
- ajouter une date d'effet (à posteriori ou au moment de la requête) ?
3. récupérer tous les candidats encore pending

-- TODO: Tech
1. Faire une transaction
2. Stocker les ids dans une table tmp et les utiliser par la suite
3. Faire les fonctions qui construise les requêtes

2021-10-24:
Nom de table au singulier, plus simple pour les joins: https://stackoverflow.com/questions/338156/table-naming-dilemma-singular-vs-plural-names

2021-10-25:
Status de la capsule, à tout moment savoir son état
Chain des events compliquer, problématique pour les query
TODO Val: Avoir une date de résolution attacher à l'évènement
TODO Clem+Val: Définir les requêtes de l'objet + signature de fonction

- Récupérer un instrument gold
- Récupérer une capsule ? on le veut ou pas
- Récupérer tous les candidats encore pending

2021-11-17:

login(user): token

propose(instrument, source?): event_id
approve(event_id): void
reject(event_id): void

candidates(unique_key): [instrument]
golden(unique_key): instrument

get(unique_key, filter): instrument JOIN event JOIN capsule
get('FR001', { source: 'manuel' }, { limit: 1 }) > status 'pending' donc point rouge

---

propose
- create a capsule if needed, or retrieve
- create an event
- returns the event_id

candidates(unique_key) === get(unique_key, { status: 'pending' })
golden(unique_key) === get(unique_key, { status: 'valid' }, { limit: 1, order: { source: ['bloomberg', 'manual'] }})

on oublie les fonctions status et value, au profit de get

---

NEXT STEPS:
- implem SQL
- implem GRAPHQL

*/

DROP TABLE IF EXISTS instrument;
DROP TABLE IF EXISTS capsule;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS user;
CREATE TABLE instrument (
  id INTEGER PRIMARY KEY,
  isin TEXT NOT NULL CHECK(LENGTH(isin) == 5),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL
);
CREATE TABLE capsule (
  id INTEGER PRIMARY KEY,
  capsule_class,
  capsule_key,
  UNIQUE(capsule_class, capsule_key)
);
CREATE TABLE event (
  id INTEGER PRIMARY KEY,
  capsule_id,
  target_id,
  user_id,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type CHECK(type IN ('propose', 'approve', 'reject')),
  source CHECK(source IN ('manual', 'bloomberg', 'reuters')),
  resolution_status CHECK(resolution_status IN ('rejected', 'pending', 'approved')),
  resolution_date TIMESTAMP,
  resolution_user_id
);
CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('steward', 'admin', 'robot')),
  rights JSON
);

INSERT INTO user (name, role) VALUES ('valentin', 'steward');
INSERT INTO user (name, role) VALUES ('clement', 'steward');
INSERT INTO user (name, role) VALUES ('laurent', 'steward');
INSERT INTO user (name, role) VALUES ('serge', 'admin');
INSERT INTO user (name, role) VALUES ('bloomberg', 'robot');


.mode column
.header off
SELECT "

1. Valentin propose (la création de) FR123, pending

";
.header on

BEGIN;
CREATE TEMP TABLE tmp (key, value);

INSERT INTO tmp (key, value) VALUES ('user_id', (SELECT id FROM user WHERE name = 'valentin'));

INSERT INTO capsule (capsule_class, capsule_key) VALUES ('instrument', 'FR123');
INSERT INTO tmp (key, value) VALUES ('capsule_id', LAST_INSERT_ROWID());

INSERT INTO instrument (isin, name, country, currency) VALUES ('FR123', 'EQUITY-FR', 'France', 'EUR');
INSERT INTO tmp (key, value) VALUES ('instrument_id', LAST_INSERT_ROWID());

INSERT INTO event (capsule_id, target_id, user_id, type, source, resolution_status) VALUES (
  (SELECT value FROM tmp WHERE key = 'capsule_id'),
  (SELECT value FROM tmp WHERE key = 'instrument_id'),
  (SELECT value FROM tmp WHERE key = 'user_id'),
  'propose',
  'manual',
  'pending'
);

DROP TABLE tmp;
END;

SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

.header off
SELECT "

2. Clément approve (la création de) FR123, valid

";
.header on

UPDATE event SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = (SELECT id FROM user WHERE name = 'clement') WHERE id = (SELECT event.id FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id WHERE isin = 'FR123' AND type = 'propose' AND resolution_status = 'pending' LIMIT 1);

SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

-- .header off
-- SELECT "

-- 3. Laurent propose (la création de) IT123, invalid car unauthorized, pas les droits de création

-- ";
-- .header on

-- INSERT INTO instrument (id, isin, name, country, currency) VALUES (2, 'IT123', 'EQUITY-IT', 'Italy', 'EUR');
-- INSERT INTO capsule (id, capsule_class, capsule_key) VALUES (2, 'instrument', 'IT123');
-- INSERT INTO event (id, capsule_id, target_id, extra) VALUES (3, 2, 2, json('{
--   "event_type": "propose",
--   "event_date": "2021-10-22T10:00:00",
--   "event_user": "laurent",
--   "source_type": "manual",
--   "status": "invalid",
--   "error": "unauthorized"
-- }'));

-- SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

-- .header off
-- SELECT "

-- 4. Serge propose (la création de) GB123, valid, bypass du 4eyes car superadmin

-- ";
-- .header on

-- INSERT INTO instrument (id, isin, name, country, currency) VALUES (3, 'GB123', 'EQUITY-GB', 'England', 'GBP');
-- INSERT INTO capsule (id, capsule_class, capsule_key) VALUES (3, 'instrument', 'GB123');
-- INSERT INTO event (id, capsule_id, target_id, extra) VALUES (4, 3, 3, json('{
--   "event_type": "propose",
--   "event_date": "2021-10-22T11:00:00",
--   "event_user": "serge",
--   "source_type": "manual",
--   "status": "valid"
-- }'));

-- SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

-- .header off
-- SELECT "

-- 5. Laurent propose (la modification de) FR123, pending

-- ";
-- .header on

-- INSERT INTO instrument (id, isin, name, country, currency) VALUES (4, 'FR123', 'EQUITY-FR', 'Italy', 'EUR');
-- INSERT INTO event (id, capsule_id, target_id, extra) VALUES (5, 1, 4, json('{
--   "event_type": "propose",
--   "event_date": "2021-10-22T12:00:00",
--   "event_user": "laurent",
--   "source_type": "manual",
--   "status": "pending"
-- }'));

-- SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

-- SELECT '';

-- .header off
-- SELECT "

-- 6. Clément reject (la modification de) FR123, invalid car rejected

-- ";
-- .header on

-- INSERT INTO event (id, capsule_id, target_id, extra) VALUES (6, 1, 4, json('{
--   "event_type": "reject",
--   "event_date": "2021-10-22T13:00:00",
--   "event_user": "clement",
--   "source_type": "manual",
--   "status": "invalid",
--   "error": "rejected"
-- }'));

-- SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

-- .header off
-- SELECT "

-- 7. Robot-Bloomberg propose (la création de) FR123, valid, source Bloomberg

-- ";
-- .header on

-- INSERT INTO instrument (id, isin, name, country, currency) VALUES (5, 'FR123', 'EQUITY-BLOOM-FR', 'France', 'EUR');
-- INSERT INTO event (id, capsule_id, target_id, extra) VALUES (7, 1, 4, json('{
--   "event_type": "propose",
--   "event_date": "2021-10-22T14:00:00",
--   "event_user": "robot-bloomberg",
--   "source_type": "bloomberg",
--   "status": "valid"
-- }'));

-- SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

-- .header off
-- SELECT "

-- 8. Valentin propose (la création de) DE123 sans la currency, donc invalid car errored, requête mal former, hack du truc

-- ";
-- .header on

-- -- TODO: Transaction & Rollback
-- INSERT INTO instrument (id, isin, name, country, currency) VALUES (5, 'DE123', 'EQUITY-DE', 'Deutschland', NULL);
-- INSERT INTO capsule (id, capsule_class, capsule_key) VALUES (5, 'instrument', 'DE123');
-- INSERT INTO event (id, capsule_id, target_id, extra) VALUES (8, 5, 4, json('{
--   "event_type": "propose",
--   "event_payload": {
--     "isin": "DE123",
--     "name": "EQUITY-DE",
--     "country": "Deutschland",
--     "currency": null
--   },
--   "event_date": "2021-10-22T15:00:00",
--   "event_user": "valentin",
--   "source_type": "bloomberg",
--   "status": "valid"
-- }'));

-- SELECT isin, name, country, currency, source, date, resolution_status, resolution_date FROM instrument JOIN event ON instrument.id = event.target_id JOIN capsule ON capsule.id = event.capsule_id;

.header off
SELECT '';
SELECT '';

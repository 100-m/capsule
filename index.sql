DROP FUNCTION IF EXISTS propose;
DROP FUNCTION IF EXISTS approve;
DROP FUNCTION IF EXISTS reject;
DROP FUNCTION IF EXISTS candidates;
DROP FUNCTION IF EXISTS golden;
DROP TABLE IF EXISTS resolution;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS capsule;
DROP TABLE IF EXISTS coupon;
DROP TABLE IF EXISTS bond;
DROP TABLE IF EXISTS preferred;
DROP TABLE IF EXISTS equity;
DROP TABLE IF EXISTS instrument;
CREATE TABLE "resolution" (
  "source" VARCHAR NOT NULL,
  "user_id" INTEGER NOT NULL,
  "resolution_status" VARCHAR,
  "resolution_date" TIMESTAMPTZ,
  "resolution_user_id" INTEGER
);
CREATE TABLE "instrument" (
  "id" SERIAL NOT NULL,
  "uid" VARCHAR NOT NULL,
  "name" VARCHAR NOT NULL,
  "country" VARCHAR NOT NULL,
  "currency" VARCHAR NOT NULL,
  CONSTRAINT "instrument_unique" UNIQUE ("uid", "name", "country", "currency"),
  CONSTRAINT "PK_instrument_id" PRIMARY KEY ("id")
) INHERITS (resolution);
CREATE TABLE "equity" (
  "issuer" VARCHAR NOT NULL,
  "share_number" INTEGER NOT NULL
) INHERITS (instrument);
CREATE TABLE "preferred" (
  "rate" FLOAT NOT NULL
) INHERITS (equity);
CREATE TABLE "bond" (
  "maturity_date" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PK_bond_id" PRIMARY KEY ("id")
) INHERITS (instrument);
CREATE TABLE "coupon" (
  "id" SERIAL NOT NULL,
  "bond_id" INTEGER NOT NULL,
  -- "coupon_reference" INTEGER NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "currency" VARCHAR NOT NULL,
  "coupon" FLOAT NOT NULL,
  CONSTRAINT "FK_bond_id" FOREIGN KEY ("bond_id") REFERENCES "bond"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  -- CONSTRAINT "FK_coupon_reference" FOREIGN KEY ("coupon_reference") REFERENCES "bond"("coupon_reference") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "PK_coupon_id" PRIMARY KEY ("id")
);

-- CREATE TABLE "capsule" (
--   "id" SERIAL NOT NULL,
--   "capsule_class" VARCHAR NOT NULL,
--   "capsule_uid" VARCHAR NOT NULL,
--   CONSTRAINT "capsule_unique" UNIQUE ("capsule_class", "capsule_uid"),
--   -- CONSTRAINT "FK_capsule_uid" FOREIGN KEY ("capsule_uid") REFERENCES "capsule_class"("uid") ON DELETE CASCADE ON UPDATE NO ACTION,
--   CONSTRAINT "PK_capsule_id" PRIMARY KEY ("id")
-- );
-- CREATE TABLE "event" (
--   "id" SERIAL NOT NULL,
--   "date" TIMESTAMPTZ NOT NULL DEFAULT now(),
--   "user_id" INTEGER NOT NULL,
--   "type" VARCHAR NOT NULL,
--   "source" VARCHAR NOT NULL,
--   "resolution_status" VARCHAR,
--   "resolution_date" TIMESTAMPTZ,
--   "resolution_user_id" INTEGER,
--   "capsule_id" INTEGER NOT NULL,
--   "instrument_id" INTEGER NOT NULL,
--   CONSTRAINT "event_unique" UNIQUE ("capsule_id", "instrument_id", "user_id", "type", "source"),
--   CONSTRAINT "FK_capsule_id" FOREIGN KEY ("capsule_id") REFERENCES "capsule"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
--   CONSTRAINT "FK_instrument_id" FOREIGN KEY ("instrument_id") REFERENCES "instrument"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
--   CONSTRAINT "PK_event_id" PRIMARY KEY ("id")
-- );

---

-- https://www.youtube.com/watch?v=WDBiPbP1iJY&t=380s
-- hasura_session json
-- (hasura_session ->> 'x-hasura-user-id')::integer
CREATE FUNCTION
-- constraint_id, constraint_class, constraint_args
propose(candidate_id integer, candidate_class text, source text)
RETURNS SETOF event
LANGUAGE plpgsql
AS $$
DECLARE candidate_record record;
DECLARE capsule_id integer;
DECLARE instrument_id integer;
BEGIN

  SELECT * INTO candidate_record FROM %candidate_class% WHERE id = candidate_id;

  INSERT INTO capsule (capsule_class, capsule_uid)
  VALUES (record_class, uid)
  ON CONFLICT (capsule_class, capsule_uid) DO UPDATE SET id = capsule.id
  RETURNING id INTO capsule_id;

  -- INSERT INTO instrument (name, uid, country, currency)
  -- VALUES (name, uid, country, currency)
  -- RETURNING id INTO instrument_id;

  RETURN QUERY
  INSERT INTO event (capsule_id, instrument_id, source, type, user_id)
  VALUES (capsule_id, instrument_id, source, 'propose', 1000)
  RETURNING *;

END$$;

CREATE FUNCTION
approve(event_id integer)
RETURNS SETOF event
LANGUAGE plpgsql
AS $$BEGIN

  RETURN QUERY
  UPDATE event SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
  WHERE id = event_id
  RETURNING *;

END$$;

CREATE FUNCTION
reject(event_id integer)
RETURNS SETOF event
LANGUAGE plpgsql
AS $$BEGIN

  RETURN QUERY
  UPDATE event SET resolution_status = 'rejected', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
  WHERE id = event_id
  RETURNING *;

END$$;

CREATE FUNCTION
candidates()
RETURNS SETOF event
LANGUAGE plpgsql STABLE
AS $$BEGIN

  RETURN QUERY
  SELECT * FROM event
  WHERE event.resolution_status IS NULL
  AND event.type = 'propose';

END$$;

CREATE FUNCTION
golden(uid text)
RETURNS instrument
LANGUAGE plpgsql STABLE
AS $$
DECLARE result instrument;
BEGIN

  SELECT * FROM event INTO result
  JOIN capsule ON event.capsule_id = capsule.id
  JOIN instrument ON event.instrument_id = instrument.id
  WHERE event.resolution_status = 'approved'
  AND instrument.uid = golden.uid
  ORDER BY event.source DESC
  LIMIT 1;
  -- IF result.uid IS NULL THEN
  --   RAISE 'no golden instrument found';
  -- END IF;
  RETURN result;

END$$;

INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR');
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-297920657', 'EPA:BNP', 'FR', 'EUR', 'BNP', '730372026');
INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-320404407', 'NASDAQ:TSLA', 'US', 'USD', 'TESLA', '194491300', 0.07);
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-519487830', 'AB-PREF-7%', 'FR', 'EUR', 'ALPHABET', '693264265');
INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-694964950', 'NASDAQ:GOOGL', 'US', 'USD', 'ALPHABET', '175190113', 0.05);
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-857828573', 'EPA:AF', 'FR', 'EUR', 'AIR FRANCE KLM', '194491300');
INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-943649527', 'AF-PREF-5%', 'FR', 'EUR', 'AIR FRANCE KLM', '787057726');
INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-439903446', 'GGL-2027-2.3%', 'FR', 'EUR', '2027-01-01');
INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-744967405', 'KLM-2023-7%', 'FR', 'EUR', '2023-01-01');
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2022-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2023-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2024-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2025-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2026-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2027-01-01', 'USD', 0.023);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2022-01-01', 'USD', 0.07);
INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2023-01-01', 'USD', 0.07);

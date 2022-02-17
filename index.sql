DROP FUNCTION IF EXISTS "propose";
DROP FUNCTION IF EXISTS "approve";
DROP FUNCTION IF EXISTS "reject";
DROP FUNCTION IF EXISTS "candidates";
DROP FUNCTION IF EXISTS "golden";
DROP TABLE IF EXISTS "coupon";
DROP TABLE IF EXISTS "bond";
DROP TABLE IF EXISTS "preferred";
DROP TABLE IF EXISTS "equity";
DROP TABLE IF EXISTS "instrument";
DROP TABLE IF EXISTS "resolution";
DROP TABLE IF EXISTS "user";
DROP TYPE IF EXISTS "source";
DROP TYPE IF EXISTS "status";
DROP TYPE IF EXISTS "role";
CREATE TYPE "source" AS ENUM ('manual', 'bloomberg', 'reuters');
CREATE TYPE "status" AS ENUM ('rejected', 'approved');
CREATE TYPE "role" AS ENUM ('user', 'steward', 'admin', 'robot');
CREATE TABLE "user" (
  "id" SERIAL NOT NULL,
  "role" role NOT NULL,
  CONSTRAINT "PK_user" PRIMARY KEY ("id")
);
CREATE TABLE "resolution" (
  "source" "source" NOT NULL DEFAULT 'manual',
  "update_user_id" INTEGER NOT NULL DEFAULT 1,
  "update_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolution_status" status,
  "resolution_date" TIMESTAMPTZ,
  "resolution_user_id" INTEGER
);
CREATE TABLE "instrument" (
  "id" SERIAL NOT NULL,
  "uid" VARCHAR NOT NULL,
  "name" VARCHAR NOT NULL,
  "country" VARCHAR NOT NULL,
  "currency" VARCHAR NOT NULL,
  CONSTRAINT "UNIQUE_instrument" UNIQUE ("uid", "name", "country", "currency"),
  CONSTRAINT "PK_instrument" PRIMARY KEY ("id")
) INHERITS ("resolution");
CREATE TABLE "equity" (
  "issuer" VARCHAR NOT NULL,
  "share_number" INTEGER NOT NULL,
  CONSTRAINT "UNIQUE_equity" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number"),
  CONSTRAINT "PK_equity" PRIMARY KEY ("id")
) INHERITS ("instrument");
CREATE TABLE "preferred" (
  "rate" FLOAT NOT NULL,
  CONSTRAINT "UNIQUE_preferred" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number", "rate"),
  CONSTRAINT "PK_preferred" PRIMARY KEY ("id")
) INHERITS ("equity");
CREATE TABLE "bond" (
  "maturity_date" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "UNIQUE_bond" UNIQUE ("uid", "name", "country", "currency", "maturity_date"),
  CONSTRAINT "PK_bond" PRIMARY KEY ("id")
) INHERITS ("instrument");
CREATE TABLE "coupon" (
  "id" SERIAL NOT NULL,
  "bond_id" INTEGER NOT NULL REFERENCES "bond"("id"),
  "date" TIMESTAMPTZ NOT NULL,
  "currency" VARCHAR NOT NULL,
  "coupon" FLOAT NOT NULL,
  CONSTRAINT "PK_coupon" PRIMARY KEY ("id")
);

-- https://www.youtube.com/watch?v=WDBiPbP1iJY&t=380s
-- hasura_session json
-- (hasura_session ->> 'x-hasura-user-id')::integer

CREATE FUNCTION
approve(instrument_id integer)
RETURNS SETOF instrument
LANGUAGE plpgsql
AS $$BEGIN

  RETURN QUERY
  UPDATE instrument SET resolution_status = 'approved', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
  WHERE id = instrument_id
  RETURNING *;

END$$;

CREATE FUNCTION
reject(instrument_id integer)
RETURNS SETOF instrument
LANGUAGE plpgsql
AS $$BEGIN

  RETURN QUERY
  UPDATE instrument SET resolution_status = 'rejected', resolution_date = CURRENT_TIMESTAMP, resolution_user_id = 1000
  WHERE id = instrument_id
  RETURNING *;

END$$;

CREATE FUNCTION
candidates()
RETURNS SETOF instrument
LANGUAGE plpgsql
AS $$BEGIN

  RETURN QUERY
  SELECT * FROM instrument
  WHERE resolution_status IS NULL;

END$$;

CREATE FUNCTION
golden(uid text)
RETURNS SETOF instrument
LANGUAGE plpgsql
AS $$
BEGIN

  RETURN QUERY
  SELECT * FROM instrument
  WHERE instrument.resolution_status = 'approved'
  AND instrument.uid = golden.uid
  ORDER BY instrument.source DESC
  LIMIT 1;

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

/*
CREATE EXTENSION IF NOT EXISTS plv8;
DROP FUNCTION IF EXISTS insert;
DROP FUNCTION IF EXISTS update;
DROP FUNCTION IF EXISTS delete;
DROP TABLE IF EXISTS result;

CREATE FUNCTION
insert(object_class text, object jsonb)
RETURNS result
LANGUAGE plv8 IMMUTABLE STRICT AS $$

  const { prepare, execute, find_function, elog } = plv8
  const { id } = execute(`INSERT INTO "${object_class}" (${Object.keys(object).join(',')}) values (${Object.values(object).join(',')})`)
  return object

$$;
SELECT insert("equity", '{
  "uid": "FR-297920657",
  "name": "EPA:BNP",
  "country": "FR",
  "currency": "EUR",
  "issuer": "BNP",
  "share_number": 730372026,
  "source": "manuel",
  "user_id": 1
}');

CREATE FUNCTION
delete(class text, object jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$BEGIN

  RETURN 1;

END$$;

CREATE FUNCTION
update(class text, object jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$BEGIN

  RETURN 1;

END$$;

CREATE FUNCTION
propose(class text, object jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$BEGIN

  RETURN 1;

END$$;
*/

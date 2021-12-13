DROP FUNCTION IF EXISTS propose;
DROP FUNCTION IF EXISTS approve;
DROP FUNCTION IF EXISTS reject;
DROP FUNCTION IF EXISTS candidates;
DROP FUNCTION IF EXISTS golden;
DROP TABLE IF EXISTS coupon;
DROP TABLE IF EXISTS bond;
DROP TABLE IF EXISTS preferred;
DROP TABLE IF EXISTS equity;
DROP TABLE IF EXISTS instrument;
DROP TABLE IF EXISTS resolution;
CREATE TABLE "resolution" (
  "source" VARCHAR NOT NULL,
  "update_user_id" INTEGER NOT NULL DEFAULT 1,
  "update_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "share_number" INTEGER NOT NULL,
  CONSTRAINT "equity_unique" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number"),
  CONSTRAINT "PK_equity_id" PRIMARY KEY ("id")
) INHERITS (instrument);
CREATE TABLE "preferred" (
  "rate" FLOAT NOT NULL,
  CONSTRAINT "preferred_unique" UNIQUE ("uid", "name", "country", "currency", "issuer", "share_number", "rate"),
  CONSTRAINT "PK_preferred_id" PRIMARY KEY ("id")
) INHERITS (equity);
CREATE TABLE "bond" (
  "maturity_date" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "bond_unique" UNIQUE ("uid", "name", "country", "currency", "maturity_date"),
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

---

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
LANGUAGE plpgsql STABLE
AS $$BEGIN

  RETURN QUERY
  SELECT * FROM instrument
  WHERE resolution_status IS NULL;

END$$;

CREATE FUNCTION
golden(uid text)
RETURNS SETOF instrument
LANGUAGE plpgsql STABLE
AS $$
BEGIN

  RETURN QUERY
  SELECT * FROM instrument
  WHERE instrument.resolution_status = 'approved'
  AND instrument.uid = golden.uid
  ORDER BY instrument.source DESC
  LIMIT 1;

END$$;

-- INSERT INTO instrument (uid, name, country, currency) VALUES ('FR-018066960', 'AF-PRIVATE-DEBT', 'FR', 'EUR');
-- INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-297920657', 'EPA:BNP', 'FR', 'EUR', 'BNP', '730372026');
-- INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-320404407', 'NASDAQ:TSLA', 'US', 'USD', 'TESLA', '194491300', 0.07);
-- INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-519487830', 'AB-PREF-7%', 'FR', 'EUR', 'ALPHABET', '693264265');
-- INSERT INTO preferred (uid, name, country, currency, issuer, share_number, rate) VALUES ('FR-694964950', 'NASDAQ:GOOGL', 'US', 'USD', 'ALPHABET', '175190113', 0.05);
-- INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-857828573', 'EPA:AF', 'FR', 'EUR', 'AIR FRANCE KLM', '194491300');
-- INSERT INTO equity (uid, name, country, currency, issuer, share_number) VALUES ('FR-943649527', 'AF-PREF-5%', 'FR', 'EUR', 'AIR FRANCE KLM', '787057726');
-- INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-439903446', 'GGL-2027-2.3%', 'FR', 'EUR', '2027-01-01');
-- INSERT INTO bond (uid, name, country, currency, maturity_date) VALUES ('FR-744967405', 'KLM-2023-7%', 'FR', 'EUR', '2023-01-01');
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2022-01-01', 'USD', 0.023);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2023-01-01', 'USD', 0.023);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2024-01-01', 'USD', 0.023);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2025-01-01', 'USD', 0.023);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2026-01-01', 'USD', 0.023);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (8, '2027-01-01', 'USD', 0.023);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2022-01-01', 'USD', 0.07);
-- INSERT INTO coupon (bond_id, date, currency, coupon) VALUES (9, '2023-01-01', 'USD', 0.07);

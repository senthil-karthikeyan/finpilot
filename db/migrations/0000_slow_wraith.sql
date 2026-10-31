CREATE TABLE IF NOT EXISTS "customers" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"onboarded_at" date NOT NULL,
	"kyc_status" text NOT NULL,
	"segment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_kyc_status_check" CHECK ("customers"."kyc_status" IN ('VERIFIED','PENDING','REVIEW')),
	CONSTRAINT "customers_segment_check" CHECK ("customers"."segment" IN ('Mass','Affluent','HNI'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instruments" (
	"instrument_id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"instrument_name" text NOT NULL,
	"asset_class" text NOT NULL,
	"sector" text,
	"exchange" text NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"last_price" numeric(18, 4) NOT NULL,
	"price_as_of" date NOT NULL,
	"risk_band" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_symbol_unique" UNIQUE("symbol"),
	CONSTRAINT "instruments_asset_class_check" CHECK ("instruments"."asset_class" IN ('EQUITY','ETF','MUTUAL_FUND','BOND','REIT','GSEC')),
	CONSTRAINT "instruments_exchange_check" CHECK ("instruments"."exchange" IN ('NSE','BSE','OTC')),
	CONSTRAINT "instruments_last_price_check" CHECK ("instruments"."last_price" >= 0),
	CONSTRAINT "instruments_risk_band_check" CHECK ("instruments"."risk_band" IN ('LOW','MEDIUM','HIGH'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"account_id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"account_type" text NOT NULL,
	"provider" text NOT NULL,
	"opened_at" date NOT NULL,
	"status" text NOT NULL,
	"base_currency" text DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_type_check" CHECK ("accounts"."account_type" IN ('BROKERAGE','MUTUAL_FUND','RETIREMENT')),
	CONSTRAINT "accounts_status_check" CHECK ("accounts"."status" IN ('ACTIVE','DORMANT','CLOSED'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_profiles" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"risk_score" smallint NOT NULL,
	"risk_level" text NOT NULL,
	"assessed_at" date NOT NULL,
	"horizon_years" smallint NOT NULL,
	"liquidity_need" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_profiles_score_check" CHECK ("risk_profiles"."risk_score" BETWEEN 0 AND 100),
	CONSTRAINT "risk_profiles_level_check" CHECK ("risk_profiles"."risk_level" IN ('Conservative','Moderate','Growth','Aggressive')),
	CONSTRAINT "risk_profiles_horizon_check" CHECK ("risk_profiles"."horizon_years" > 0),
	CONSTRAINT "risk_profiles_liquidity_check" CHECK ("risk_profiles"."liquidity_need" IN ('LOW','MEDIUM','HIGH'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"goal_id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"goal_type" text NOT NULL,
	"goal_name" text NOT NULL,
	"target_amount" numeric(18, 2) NOT NULL,
	"current_funded_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"target_date" date NOT NULL,
	"priority" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_type_check" CHECK ("goals"."goal_type" IN ('EMERGENCY_FUND','EDUCATION','RETIREMENT','TRAVEL','WEALTH_CREATION','HOME_PURCHASE')),
	CONSTRAINT "goals_name_length_check" CHECK (length("goals"."goal_name") BETWEEN 3 AND 60),
	CONSTRAINT "goals_target_amount_check" CHECK ("goals"."target_amount" > 0),
	CONSTRAINT "goals_funded_amount_check" CHECK ("goals"."current_funded_amount" >= 0),
	CONSTRAINT "goals_priority_check" CHECK ("goals"."priority" IN ('LOW','MEDIUM','HIGH'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holdings_snapshot" (
	"account_id" text NOT NULL,
	"instrument_id" text NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"avg_cost" numeric(18, 4) NOT NULL,
	"snapshot_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holdings_snapshot_account_id_instrument_id_snapshot_date_pk" PRIMARY KEY("account_id","instrument_id","snapshot_date"),
	CONSTRAINT "holdings_quantity_check" CHECK ("holdings_snapshot"."quantity" >= 0),
	CONSTRAINT "holdings_avg_cost_check" CHECK ("holdings_snapshot"."avg_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"transaction_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"instrument_id" text,
	"transaction_type" text NOT NULL,
	"trade_date" date NOT NULL,
	"quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"status" text NOT NULL,
	"is_future" boolean DEFAULT false NOT NULL,
	"before_open_flag" boolean DEFAULT false NOT NULL,
	"on_closed_flag" boolean DEFAULT false NOT NULL,
	"import_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_type_check" CHECK ("transactions"."transaction_type" IN ('BUY','SELL','DIVIDEND','FEE')),
	CONSTRAINT "transactions_quantity_check" CHECK ("transactions"."quantity" >= 0),
	CONSTRAINT "transactions_price_check" CHECK ("transactions"."price" >= 0),
	CONSTRAINT "transactions_status_check" CHECK ("transactions"."status" IN ('SETTLED','PENDING','REVERSED'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_batches" (
	"batch_id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"imported_by" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"future_dated_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	CONSTRAINT "import_batches_status_check" CHECK ("import_batches"."status" IN ('COMPLETED','FAILED'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_rows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"transaction_id" text,
	"outcome" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_rows_outcome_check" CHECK ("import_rows"."outcome" IN ('imported','future_dated','duplicate','rejected'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('VIEWER','ADMIN'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "holdings_snapshot" ADD CONSTRAINT "holdings_snapshot_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "holdings_snapshot" ADD CONSTRAINT "holdings_snapshot_instrument_id_instruments_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("instrument_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_instrument_id_instruments_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("instrument_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_import_batches_batch_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("batch_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("batch_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_segment" ON "customers" USING btree ("segment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_kyc" ON "customers" USING btree ("kyc_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_search" ON "customers" USING gin (to_tsvector('simple', "full_name" || ' ' || "email" || ' ' || "city" || ' ' || "customer_id"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_customer" ON "accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_goals_customer" ON "goals" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_holdings_account" ON "holdings_snapshot" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tx_account_date" ON "transactions" USING btree ("account_id","trade_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tx_instrument" ON "transactions" USING btree ("instrument_id") WHERE "transactions"."instrument_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tx_status" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tx_is_future" ON "transactions" USING btree ("is_future") WHERE "transactions"."is_future" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tx_batch" ON "transactions" USING btree ("import_batch_id") WHERE "transactions"."import_batch_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_import_rows_batch" ON "import_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE VIEW "public"."v_monthly_net_flows" AS (
  SELECT
    a.customer_id,
    DATE_TRUNC('month', t.trade_date)::DATE                         AS month,
    SUM(CASE WHEN t.transaction_type = 'BUY'  THEN t.amount ELSE 0 END)  AS buy_total,
    SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.amount ELSE 0 END)  AS sell_total,
    SUM(CASE
          WHEN t.transaction_type = 'SELL' THEN  t.amount
          WHEN t.transaction_type = 'BUY'  THEN -t.amount
          ELSE 0
        END)                                                         AS net_flow
  FROM transactions t
  JOIN accounts a ON a.account_id = t.account_id
  WHERE t.status          = 'SETTLED'
    AND t.transaction_type IN ('BUY','SELL')
    AND NOT t.is_future
    AND t.trade_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
  GROUP BY a.customer_id, DATE_TRUNC('month', t.trade_date)
);--> statement-breakpoint
CREATE VIEW "public"."v_portfolio_positions" AS (
  SELECT
    h.account_id,
    a.customer_id,
    a.account_type,
    a.provider,
    a.status                                                          AS account_status,
    a.base_currency,
    h.instrument_id,
    i.symbol,
    i.instrument_name,
    i.asset_class,
    i.sector,
    i.risk_band,
    i.last_price,
    i.price_as_of,
    h.quantity,
    h.avg_cost,
    h.snapshot_date,
    ROUND(h.quantity * i.last_price,                           2)    AS market_value,
    ROUND(h.quantity * h.avg_cost,                             2)    AS cost_basis,
    ROUND(h.quantity * i.last_price - h.quantity * h.avg_cost, 2)    AS unrealised_pnl,
    CASE WHEN h.avg_cost > 0
      THEN ROUND((i.last_price - h.avg_cost) / h.avg_cost * 100, 2)
      ELSE NULL
    END                                                               AS unrealised_pnl_pct
  FROM holdings_snapshot h
  JOIN accounts    a ON a.account_id    = h.account_id
  JOIN instruments i ON i.instrument_id = h.instrument_id
);
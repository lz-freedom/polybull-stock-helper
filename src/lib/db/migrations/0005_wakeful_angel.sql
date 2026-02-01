CREATE TABLE "usage_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"mode" varchar(30) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"limit" integer NOT NULL,
	"period_key" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"mode" varchar(30) NOT NULL,
	"agent_run_id" integer,
	"session_id" uuid,
	"delta" integer NOT NULL,
	"reason" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "status" varchar(20) DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "thread_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_counters_user_id_idx" ON "usage_counters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_counters_mode_idx" ON "usage_counters" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "usage_counters_period_key_idx" ON "usage_counters" USING btree ("period_key");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_user_mode_period_key_idx" ON "usage_counters" USING btree ("user_id","mode","period_key");--> statement-breakpoint
CREATE INDEX "usage_logs_user_id_idx" ON "usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_logs_mode_idx" ON "usage_logs" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "usage_logs_created_at_idx" ON "usage_logs" USING btree ("created_at");
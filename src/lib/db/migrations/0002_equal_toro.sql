CREATE TABLE "agent_run_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_run_id" integer NOT NULL,
	"event_id" varchar(64) NOT NULL,
	"type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_run_events" ADD CONSTRAINT "agent_run_events_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_run_events_run_id_id_idx" ON "agent_run_events" USING btree ("agent_run_id","id");
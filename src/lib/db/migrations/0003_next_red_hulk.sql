ALTER TABLE "chat_sessions" ALTER COLUMN "stock_symbol" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "exchange_acronym" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "facts_snapshots" ALTER COLUMN "stock_symbol" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "facts_snapshots" ALTER COLUMN "exchange_acronym" SET DATA TYPE varchar(100);
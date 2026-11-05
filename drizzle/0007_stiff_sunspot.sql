CREATE TABLE "mux_webhook_receipts" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mux_webhook_receipts_received_idx" ON "mux_webhook_receipts" USING btree ("received_at");
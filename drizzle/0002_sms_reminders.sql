CREATE TYPE "public"."sms_kind" AS ENUM('due_soon', 'due_today', 'overdue_1', 'overdue_7', 'overdue_30', 'receipt', 'disbursed');--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid,
	"phone" text NOT NULL,
	"kind" "sms_kind" NOT NULL,
	"dedupe_key" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"channel" text,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_messages_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_loan_idx" ON "sms_messages" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "sms_created_idx" ON "sms_messages" USING btree ("created_at");
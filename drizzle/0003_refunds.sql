CREATE TYPE "public"."refund_status" AS ENUM('pending_approval', 'approved', 'paid', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."sms_kind" ADD VALUE 'refund';--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_request_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"payee_msisdn" text NOT NULL,
	"network" "momo_network" NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending_approval' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"paid_by" uuid,
	"paid_at" timestamp with time zone,
	"payout_method" "payment_method",
	"payout_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_payment_request_id_unique" UNIQUE("payment_request_id")
);
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_request_id_payment_requests_id_fk" FOREIGN KEY ("payment_request_id") REFERENCES "public"."payment_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_decided_by_staff_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paid_by_staff_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_loan_idx" ON "refunds" USING btree ("loan_id");--> statement-breakpoint
-- Open refund cases for any Mobile Money overpayments recorded before this workflow existed.
INSERT INTO "refunds" ("payment_request_id", "loan_id", "amount", "payee_msisdn", "network", "reason")
SELECT "id", "loan_id", "excess", "payer_msisdn", "network",
  COALESCE("failure_reason", 'Paid more than was owed')
FROM "payment_requests"
WHERE "status" = 'successful' AND "excess" > 0
ON CONFLICT ("payment_request_id") DO NOTHING;

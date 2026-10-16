CREATE TYPE "public"."kyc_status" AS ENUM('awaiting_capture', 'processing', 'verified', 'review', 'rejected', 'retake');--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE 'id_front' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE 'id_back' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE 'selfie' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "kyc_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"status" "kyc_status" DEFAULT 'awaiting_capture' NOT NULL,
	"provider" text,
	"provider_job_id" text,
	"provider_status" text,
	"provider_reason" text,
	"id_fields" jsonb,
	"checks" jsonb,
	"decision_reason" text,
	"consent_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_checks_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "kyc_checks_provider_job_id_unique" UNIQUE("provider_job_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "kyc_status" "kyc_status";--> statement-breakpoint
ALTER TABLE "kyc_checks" ADD CONSTRAINT "kyc_checks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_checks" ADD CONSTRAINT "kyc_checks_reviewed_by_staff_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyc_application_idx" ON "kyc_checks" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "kyc_status_idx" ON "kyc_checks" USING btree ("status");
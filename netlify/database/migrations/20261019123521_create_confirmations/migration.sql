CREATE TABLE "confirmations" (
	"id" serial PRIMARY KEY,
	"submission_id" uuid NOT NULL UNIQUE,
	"name" text NOT NULL,
	"attendance" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

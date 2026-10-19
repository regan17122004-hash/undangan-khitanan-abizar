import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const confirmations = pgTable("confirmations", {
  id: serial().primaryKey(),
  submissionId: uuid("submission_id").notNull().unique(),
  name: text().notNull(),
  attendance: text({ enum: ["hadir", "tidak_hadir"] }).notNull(),
  message: text().notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const studyEntries = sqliteTable('study_entries', {
  key: text('key').primaryKey(),
  day: integer('day').notNull(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  problemId: integer('problem_id').notNull(),
  minutes: integer('minutes').notNull(),
  result: text('result').notNull(),
  reason: text('reason').notNull(),
  idea: text('idea').notNull(),
  caution: text('caution').notNull(),
});
export const studySettings = sqliteTable('study_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

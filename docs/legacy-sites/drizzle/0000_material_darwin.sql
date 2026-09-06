CREATE TABLE `study_entries` (
	`key` text PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`problem_id` integer NOT NULL,
	`minutes` integer NOT NULL,
	`result` text NOT NULL,
	`reason` text NOT NULL,
	`idea` text NOT NULL,
	`caution` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_area` ON `reports` (`status`,`lat`,`lon`);--> statement-breakpoint
CREATE INDEX `reports_author` ON `reports` (`author`,`created`);
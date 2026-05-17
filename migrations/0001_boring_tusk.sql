CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quarter_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`quarter` text NOT NULL,
	`is_open` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shared_goal_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`shared_goal_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`goal_id` text NOT NULL,
	FOREIGN KEY (`shared_goal_id`) REFERENCES `shared_goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shared_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`thrust_area` text NOT NULL,
	`uom_type` text NOT NULL,
	`target` real NOT NULL,
	`department` text NOT NULL,
	`manager_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

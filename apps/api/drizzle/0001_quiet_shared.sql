CREATE TABLE `shared_files` (
	`id` varchar(36) NOT NULL,
	`file_id` varchar(36) NOT NULL,
	`shared_by` varchar(128) NOT NULL,
	`shared_with` varchar(128) NOT NULL,
	`revoked_at` timestamp NULL,
	`expires_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_files_id` PRIMARY KEY(`id`)
);

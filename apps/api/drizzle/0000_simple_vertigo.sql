CREATE TABLE `files` (
	`id` varchar(36) NOT NULL,
	`filename` varchar(512) NOT NULL,
	`blob_name` varchar(1024) NOT NULL,
	`owner_address` varchar(128) NOT NULL,
	`size` int NOT NULL,
	`mime_type` varchar(256),
	`iv` varchar(64),
	`encrypted_dek` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);

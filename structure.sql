CREATE TABLE `folders` (
	`id` binary(16) NOT NULL,
	`created_time` int(11) NOT NULL default '0',
	`updated_time` int(11) NOT NULL default '0',
	`parent_id` binary(16) NULL default NULL,
	`owner_id` binary(16) NULL default NULL,
	`is_encrypted` tinyint(1) NOT NULL default '0',
	`encryption_method` int(11) NOT NULL default '0',
PRIMARY KEY (`id`)
) CHARACTER SET=utf8;

CREATE TABLE `notes` (
	`id` binary(16) NOT NULL,
	`completed` tinyint(1) NOT NULL default '0',
	`created_time` int(11) NOT NULL default '0',
	`updated_time` int(11) NOT NULL default '0',
	`parent_id` binary(16) NULL default NULL,
	`owner_id` binary(16),
	`is_encrypted` tinyint(1) NOT NULL default '0',
	`encryption_method` int(11) NOT NULL default '0',
PRIMARY KEY (`id`)
) CHARACTER SET=utf8;

CREATE TABLE `users` (
	`id` binary(16) NOT NULL,
	`email` varchar(256) NOT NULL default '',
	`password` varchar(256) NOT NULL default '',
	`validated` tinyint(1) NOT NULL default '0',
	`created_time` int(11) NOT NULL default '0',
	`updated_time` int(11) NOT NULL default '0',
	`owner_id` binary(16),
PRIMARY KEY (`id`)
) CHARACTER SET=utf8;

CREATE TABLE `sessions` (
	`id` binary(16) NOT NULL,
	`owner_id` binary(16),
	`client_id` binary(16),
	`created_time` int(11) NOT NULL default '0',
	`updated_time` int(11) NOT NULL default '0',
PRIMARY KEY (`id`)
) CHARACTER SET=utf8;

CREATE TABLE `changes` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`user_id` binary(16),
	`client_id` binary(16),
	`created_time` int(11) NOT NULL default '0',
	`updated_time` int(11) NOT NULL default '0',
	`type` int(11) NOT NULL default '0',
	`item_id` binary(16),
	`item_type` int(11) NOT NULL default '0',
	`item_field` int(11) NOT NULL default '0',
	`delta` MEDIUMTEXT,
	`previous_id` int(11) NOT NULL default '0',
PRIMARY KEY (`id`)
) CHARACTER SET=utf8;

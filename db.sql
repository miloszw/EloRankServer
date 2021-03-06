
CREATE DATABASE /*!32312 IF NOT EXISTS*/ `elorank` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `elorank`;

CREATE TABLE `polls` (
  `name` varchar(45) DEFAULT NULL,
  `id` int(8) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8;

CREATE TABLE `alternatives` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `url` varchar(120) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `polls_id` int(11) NOT NULL,
  `ranked_times` int(11) DEFAULT '0',
  `name` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `polls_id` (`polls_id`),
  CONSTRAINT `alternatives_ibfk_1` FOREIGN KEY (`polls_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;

CREATE TABLE `challenges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `poll_id` int(11) NOT NULL,
  `alt1_id` int(11) NOT NULL,
  `alt2_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `alt1_id` (`alt1_id`),
  KEY `alt2_id` (`alt2_id`),
  KEY `poll_id` (`poll_id`),
  CONSTRAINT `challenges_ibfk_1` FOREIGN KEY (`alt1_id`) REFERENCES `alternatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `challenges_ibfk_2` FOREIGN KEY (`alt2_id`) REFERENCES `alternatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `challenges_ibfk_3` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=502 DEFAULT CHARSET=utf8;
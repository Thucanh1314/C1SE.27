-- Migration: Create workspace_surveys junction table
-- Purpose: Link surveys to workspaces for workspace-based survey management

CREATE TABLE IF NOT EXISTS `workspace_surveys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT NOT NULL,
  `survey_id` INT NOT NULL,
  `added_by` INT NOT NULL COMMENT 'User who added the survey to workspace',
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_active` BOOLEAN DEFAULT TRUE,
  
  -- Indexes
  UNIQUE KEY `uq_workspace_survey` (`workspace_id`, `survey_id`),
  KEY `idx_workspace_id` (`workspace_id`),
  KEY `idx_survey_id` (`survey_id`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_is_active` (`is_active`),
  
  -- Foreign keys
  CONSTRAINT `fk_workspace_surveys_workspace` 
    FOREIGN KEY (`workspace_id`) 
    REFERENCES `workspaces` (`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_workspace_surveys_survey` 
    FOREIGN KEY (`survey_id`) 
    REFERENCES `surveys` (`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_workspace_surveys_added_by` 
    FOREIGN KEY (`added_by`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for faster lookups
CREATE INDEX `idx_workspace_surveys_added_at` ON `workspace_surveys`(`added_at`);

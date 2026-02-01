-- Add payment and sanction columns to user_assignments if they don't exist
USE TccPortal;

ALTER TABLE user_assignments
ADD COLUMN IF NOT EXISTS year_level VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS major VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment VARCHAR(20) DEFAULT 'paid', -- 'paid' or 'owing'
ADD COLUMN IF NOT EXISTS amount_lacking DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sanctions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sanction_reason TEXT DEFAULT NULL;

-- Also fix column assignment_type to be nullable or remove constraint if needed, but adding columns is priority.

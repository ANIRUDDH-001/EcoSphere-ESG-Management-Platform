-- Make owner_id and due_date NOT NULL in compliance_issues table

ALTER TABLE compliance_issues 
  ALTER COLUMN owner_id SET NOT NULL,
  ALTER COLUMN due_date SET NOT NULL;

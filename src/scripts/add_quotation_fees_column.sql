-- Add quotation_fees column to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_fees TEXT;

-- Add comment to the column
COMMENT ON COLUMN quotations.quotation_fees IS 'Fees associated with the quotation';

-- Grant necessary permissions
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY; 
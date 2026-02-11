-- Create a table to store AI insights for each survey
CREATE TABLE IF NOT EXISTS survey_ai_insights (
    survey_id UUID PRIMARY KEY REFERENCES surveys(id) ON DELETE CASCADE,
    insights JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE survey_ai_insights ENABLE ROW LEVEL SECURITY;

-- Create policies (Allowing authenticated users to read insights, and service role/owner to manage)
CREATE POLICY "Allow public read-only access to insights" 
ON survey_ai_insights FOR SELECT 
USING (true);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to auto-update updated_at
CREATE TRIGGER update_survey_ai_insights_updated_at
BEFORE UPDATE ON survey_ai_insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fix adaptations table schema to match code expectations
ALTER TABLE public.adaptations 
DROP CONSTRAINT IF EXISTS adaptations_adaptation_type_check;

-- Add missing columns if they don't exist
ALTER TABLE public.adaptations 
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update adaptation type constraint to include new types
ALTER TABLE public.adaptations 
ADD CONSTRAINT adaptations_adaptation_type_check 
CHECK (adaptation_type IN (
    'field_reorder', 'field_reordering', 'progressive_disclosure', 
    'context_switching', 'error_prevention', 'completion_guidance'
));

-- Update applied_at to support both timestamp and ISO string
ALTER TABLE public.adaptations 
ALTER COLUMN applied_at TYPE TEXT;

-- Create index for is_active column
CREATE INDEX IF NOT EXISTS idx_adaptations_is_active ON public.adaptations(is_active);

-- Create index for confidence column
CREATE INDEX IF NOT EXISTS idx_adaptations_confidence ON public.adaptations(confidence);

-- Create index for metadata JSONB
CREATE INDEX IF NOT EXISTS idx_adaptations_metadata_gin ON public.adaptations USING gin(metadata);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "adaptations_update_policy" ON public.adaptations;
CREATE POLICY "adaptations_update_policy" ON public.adaptations
    FOR UPDATE USING (true);

-- Grant permissions for new columns
GRANT UPDATE ON public.adaptations TO anon;

-- Add comments for new columns
COMMENT ON COLUMN public.adaptations.confidence IS 'Confidence score for the adaptation recommendation (0-1)';
COMMENT ON COLUMN public.adaptations.is_active IS 'Whether this adaptation is currently active';
COMMENT ON COLUMN public.adaptations.description IS 'Human-readable description of the adaptation';
COMMENT ON COLUMN public.adaptations.metadata IS 'Additional metadata about the adaptation source and context';

-- Create function to get active adaptations for a session/form
CREATE OR REPLACE FUNCTION public.get_active_adaptations(session_uuid UUID, form_identifier TEXT)
RETURNS TABLE (
    id UUID,
    adaptation_type TEXT,
    confidence DECIMAL(3,2),
    config JSONB,
    applied_at TEXT,
    description TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.adaptation_type,
        a.confidence,
        a.config,
        a.applied_at,
        a.description,
        a.metadata
    FROM public.adaptations a
    WHERE a.session_id = session_uuid 
      AND a.form_id = form_identifier
      AND a.is_active = true
    ORDER BY a.created_at DESC;
END;
$$ language 'plpgsql';

-- Create function to deactivate old adaptations when new ones are applied
CREATE OR REPLACE FUNCTION public.deactivate_old_adaptations()
RETURNS trigger AS $$
BEGIN
    -- Deactivate previous adaptations of the same type for the same session/form
    UPDATE public.adaptations 
    SET is_active = false 
    WHERE session_id = NEW.session_id 
      AND form_id = NEW.form_id 
      AND adaptation_type = NEW.adaptation_type 
      AND id != NEW.id
      AND is_active = true;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically deactivate old adaptations
DROP TRIGGER IF EXISTS deactivate_old_adaptations_trigger ON public.adaptations;
CREATE TRIGGER deactivate_old_adaptations_trigger
    AFTER INSERT ON public.adaptations
    FOR EACH ROW
    EXECUTE FUNCTION public.deactivate_old_adaptations();
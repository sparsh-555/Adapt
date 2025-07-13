-- Add visual_emphasis to supported adaptation types
-- This migration adds support for the visual_emphasis adaptation type

ALTER TABLE public.adaptations 
DROP CONSTRAINT IF EXISTS adaptations_adaptation_type_check;

ALTER TABLE public.adaptations 
ADD CONSTRAINT adaptations_adaptation_type_check 
CHECK (adaptation_type IN (
    'field_reorder', 
    'field_reordering', 
    'progressive_disclosure', 
    'context_switching', 
    'error_prevention', 
    'completion_guidance',
    'validation_timing', 
    'visual_emphasis'
));

-- Add comment for new adaptation types
COMMENT ON CONSTRAINT adaptations_adaptation_type_check ON public.adaptations 
IS 'Valid adaptation types including validation_timing and visual_emphasis for enhanced form optimization';
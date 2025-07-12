-- Add missing event types to behavior_events constraint
ALTER TABLE public.behavior_events 
DROP CONSTRAINT IF EXISTS behavior_events_event_type_check;

ALTER TABLE public.behavior_events 
ADD CONSTRAINT behavior_events_event_type_check 
CHECK (event_type IN (
    'mouse_move', 'mouse_click', 'key_press', 'scroll', 
    'focus', 'blur', 'form_submit', 'field_change',
    'page_load', 'page_unload', 'resize', 'orientation_change'
));

-- Add comment
COMMENT ON CONSTRAINT behavior_events_event_type_check ON public.behavior_events 
IS 'Allowed event types for behavior tracking including page events';
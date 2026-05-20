-- First, delete all existing admin users
DELETE FROM public.admin_users;

-- Insert only the allowed admin users
INSERT INTO public.admin_users (id, email)
SELECT 
    id,
    email
FROM auth.users
WHERE email IN (
    'amaadourme@gmail.com'
)
ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role; 
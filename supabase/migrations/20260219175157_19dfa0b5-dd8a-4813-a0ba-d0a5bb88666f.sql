UPDATE auth.users
SET encrypted_password = crypt('Retireby40*', gen_salt('bf'))
WHERE email = 'matthewhow94@gmail.com';
# How to make yourself a Platform Super Admin

Platform super admins can access **Platform Admin** (`/platform`), switch between tenants, and impersonate users. Your user must be listed in the `platform_super_admins` table.

## Option 1: Run the script (easiest)

From the project root, with `.env.local` containing `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`:

```bash
npx tsx scripts/make-super-admin.ts your-email@example.com
```

Replace `your-email@example.com` with the email you use to sign in. The script looks up your user in Supabase Auth and adds them to `platform_super_admins`. You must have signed in at least once so your user exists in `auth.users` (and `public.users`).

## Option 2: Supabase Dashboard (SQL)

1. Open your Supabase project → **SQL Editor**.
2. Find your user id (run this and note the `id` for your email):

   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```

3. Add that user as a super admin:

   ```sql
   INSERT INTO public.platform_super_admins (user_id)
   VALUES ('paste-the-uuid-here')
   ON CONFLICT (user_id) DO NOTHING;
   ```

## Option 3: Supabase Dashboard (Table Editor)

1. Go to **Table Editor** → **platform_super_admins**.
2. Get your user id from **Authentication** → **Users** (copy the UUID of your user).
3. In **platform_super_admins**, click **Insert row** and set `user_id` to that UUID.

---

After adding yourself, sign out and sign back in (or refresh), then open **Platform Admin** from the sidebar (or go to `/platform`). You’ll see **Switch tenant** and **Tenants**; use **Work in this tenant** to work as that tenant.

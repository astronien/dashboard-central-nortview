# Auth System Setup Guide

This dashboard now uses **Turso** (libSQL) for the login system with role-based
access control (BSM/Asst.BSM = admin, PIA = read-only).

## 1. Install Turso CLI

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | sh

# Verify
$HOME/.turso/turso --version
# → turso version v1.x.x
```

Add to PATH (optional):
```bash
echo 'export PATH="$HOME/.turso:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 2. Authenticate

```bash
turso auth login
# → Opens browser for GitHub OAuth
turso auth whoami   # verify
```

## 3. Create Database

```bash
# Pick region close to you: sin (Singapore), hkg, aws-ap-northeast-1, etc.
turso db create studio7-dashboard --location aws-ap-northeast-1
```

Get credentials:
```bash
turso db show studio7-dashboard --url
# → libsql://studio7-dashboard-astronien.aws-ap-northeast-1.turso.io

turso db tokens create studio7-dashboard
# → eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## 4. Update `.env`

```env
VITE_TURSO_DATABASE_URL=libsql://studio7-dashboard-astronien.aws-ap-northeast-1.turso.io
VITE_TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIs...
```

## 5. Install Dependencies

```bash
npm install
```

## 6. Seed Admin Users

```bash
npm run seed:admin
```

Expected output:
```
→ Initialising schema...
✓ Schema ready
✓ Created admin: admin / admin123
✓ Created admin: asst_admin / admin123

🎉 Seed complete. You can now login with:
   admin / admin123   (BSM)
   asst_admin / admin123   (Asst. BSM)
```

Verify via Turso shell:
```bash
turso db shell studio7-dashboard "SELECT id, username, role, name FROM users;"
# ID     USERNAME       ROLE    NAME
# 1      admin          admin   Branch Sales Manager
# 2      asst_admin     admin   Assistant Branch Sales Manager
```

## 7. Run Dev Server

```bash
npm run dev
# → http://localhost:3000
```

You should see the **LoginPage** (not the dashboard).

## 8. Test the Login

### Admin login
```
Username: admin
Password: admin123
```
- Forced to change password on first login (≥ 6 chars)
- Sees: Home, Staff, Reports, KPI Preset, Settings
- Can upload files, edit presets, etc.

### PIA login
After admin uploads a target file, PIA users are auto-created with `username = emp_id` and `password = emp_id`:
```
Username: 25293      (any emp_id from the target file)
Password: 25293      (default = emp_id, must change on first login)
```
- Sees: Home + Staff Profile only
- Staff Profile is locked to their own officer
- Cannot upload, edit, or switch officers

### Logout
Click the **LogOut** icon (top right) → returns to LoginPage.

## 9. Build for Production

```bash
npm run build
# → dist/
```

## 10. Deploy (e.g. Vercel)

```bash
# Install Vercel CLI if needed
npm install -g vercel

vercel link

# Add env vars
vercel env add VITE_TURSO_DATABASE_URL production
# paste URL
vercel env add VITE_TURSO_AUTH_TOKEN production
# paste token

# Deploy
vercel --prod
```

## 11. How PIA Users Get Created

PIA accounts are **auto-synced** every time an admin uploads a target file.
The logic in `App.tsx → handleUploadFile`:

```ts
if (kind === "target" && rows.length > 0) {
  void syncPiaFromOfficers(
    rows.map((r) => ({
      name: `${r.NAME ?? ""} ${r.SURNAME ?? ""}`.trim(),
      empId: String(r["STAFF ID"] ?? r.emp_id ?? "").trim(),
      branch: String(r["BRANCH NAME"] ?? "").trim(),
    })),
  );
}
```

Each officer with a `STAFF ID` becomes a PIA user with:
- `username = emp_id`
- `password = emp_id` (must change on first login)
- `role = pia`
- `mustChangePassword = 1`

## 12. Role Permissions Matrix

| View / Action | Admin (BSM/Asst.BSM) | PIA (User) |
|---------------|----------------------|------------|
| Login         | ✓                    | ✓          |
| Home          | ✓                    | ✓ (read)   |
| Staff Profile | ✓ (any officer)      | ✓ (own only) |
| Officer switcher | ✓                  | ✗ (locked)  |
| Reports       | ✓                    | ✗ (hidden)  |
| KPI Preset    | ✓                    | ✗ (hidden)  |
| Settings      | ✓                    | ✗ (hidden)  |
| Upload files  | ✓                    | ✗          |
| Edit presets  | ✓                    | ✗          |
| Logout        | ✓                    | ✓          |

## 13. Troubleshooting

### "Turso is not configured"
- Check `.env` has both `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN`
- Restart `npm run dev` after editing `.env`
- Make sure values are not still the placeholder `"your-database.turso.io"`

### Login fails for admin/admin123
- Check the seed actually ran successfully:
  ```bash
  turso db shell studio7-dashboard "SELECT username FROM users;"
  ```
- If empty, run `npm run seed:admin` again

### PIA can't see their data
- Verify the admin uploaded a target file that includes their `emp_id`
- Run:
  ```bash
  turso db shell studio7-dashboard "SELECT username, officer_id FROM users WHERE role='pia' LIMIT 5;"
  ```
- If their `emp_id` is missing, re-upload the target file

### Token expired
- Turso tokens are long-lived but can be rotated:
  ```bash
  turso db tokens create studio7-dashboard
  ```
- Update `.env` with the new token, restart dev server

### Session keeps logging out
- localStorage might be disabled (private mode)
- Browser is clearing storage on exit
- Check Application → Local Storage → `studio7_auth_session`

### Stale session in browser
- DevTools → Application → Local Storage → delete `studio7_auth_session`
- Or run in console: `localStorage.removeItem("studio7_auth_session")`

## 14. Reset / Delete Data

```bash
# Open SQL shell
turso db shell studio7-dashboard
```

```sql
-- Delete all users (admin + pia)
DELETE FROM users;

-- Delete all PIA only
DELETE FROM users WHERE role = 'pia';

-- List everything
SELECT * FROM users;
.quit
```

After deleting admin, re-run `npm run seed:admin` to recreate.

## 15. File Structure

```
src/
├── lib/auth/
│   ├── tursoClient.ts    # libSQL client + schema init
│   ├── users.ts          # User CRUD + password hashing
│   ├── session.ts        # base64 session token
│   ├── authContext.tsx   # React context (login/logout/changePassword)
│   ├── piSync.ts         # sync PIA users from target upload
│   ├── users.test.ts     # password hashing tests
│   ├── session.test.ts   # session token tests
│   └── piSync.test.ts    # PIA sync tests
├── components/
│   └── LoginPage.tsx     # full-screen branded login
├── App.tsx               # wrapped in <AuthProvider> + <AppGate>
├── main.tsx
└── vite-env.d.ts         # Vite env types

scripts/
└── seed-admin.ts         # seed initial admin users
```

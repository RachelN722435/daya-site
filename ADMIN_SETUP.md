# Daya admin: setup (about 10 minutes, once)

Your admin lives at **your-site-address/admin**, for example `daya-site.vercel.app/admin`.
It edits your page text, looks, Daya’s Diary articles, weekly affirmation, WhatsApp/email,
occasions and body types, and uploads photos.

## 1. Put the files on GitHub
1. Unzip `daya-admin.zip`.
2. In your `daya-site` repo choose **Add file > Upload files** and drag in every loose file
   (all the `.html` files, `boot.js`, `admin.js`, `admin.css`, `content.js`, `layout.js`,
   `pages.js`, `styles.css`, `vercel.json`, `setup.sql`, `README.md`, `ADMIN_SETUP.md`).
   GitHub will replace the files that already exist.
3. The server file has to live in a folder called `api`. Add it like this:
   **Add file > Create new file**, and in the name box type `api/site.js`
   (typing the `/` makes the folder). Open `api/site.js` from the unzipped folder in any
   text editor, copy everything, paste it into GitHub, and click **Commit changes**.

## 2. Set up Supabase (once)
1. Open your Supabase project > **SQL Editor** > **New query**.
2. Open `setup.sql`, copy everything, paste it in, and press **Run**. It says "Success".
   It is safe to run again. It doesn't touch your old site's saved content.

## 3. Add four settings in Vercel
Vercel > your `daya-site` project > **Settings > Environment Variables**. Add these four
(tick Production, Preview and Development):

| Name | What to put |
|---|---|
| `SUPABASE_URL` | Your Supabase project address, e.g. `https://hcqzgqdezosaqfsadjyq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The same secret key your old site uses (copy it from the old Vercel project's variables, or Supabase > Project Settings > API) |
| `ADMIN_PASSWORD` | A password you choose. Make it long. |
| `ADMIN_SESSION_SECRET` | Any long random text, 20+ characters. You never type it again. |

Never paste the secret key into a chat, a GitHub file, or a message. It only belongs in Vercel.

Then go to **Deployments**, open the latest one, and choose **Redeploy** so the new settings load.

## 4. Use it
Open `/admin`, sign in, edit, and press **Save changes**. Visitors see the update within
about 30 seconds. Sessions last 12 hours.

### Good to know
- Until you press Save for the first time, the site shows the starting content from `content.js`.
  After the first Save, the admin's version is what visitors see.
- Photos you upload are shrunk automatically (largest side 1600 px) before they are stored.
- "Choose from library" lists every photo already in your Supabase `site-images` storage,
  including your old site's photos.
- Looks with an **Old price** appear under Best deals. Looks marked **Best look** appear on the
  homepage. Untick **Show this look on the site** to hide one without deleting it.
- Articles can be saved as drafts (untick **Published**).
- Your data is saved under its own name (`daya-site`), so your old site's content is untouched.

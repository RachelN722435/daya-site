# Daya website

Plain HTML, CSS and JavaScript, plus one small server file (`api/site.js`) for the admin.

- **Admin:** `/admin`. Setup steps are in `ADMIN_SETUP.md`.
- `content.js` holds the starting content. After you save in the admin, the admin's version is used.
- `boot.js` loads the saved content, then draws the page. If the admin service is down, the
  site falls back to the last copy it saw, and then to `content.js`.

# Firebase Setup Guide — Poetry Evaluation Study

Follow these steps once. After that, the site runs itself.

---

## Step 1 — Create a Firebase project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Give it a name (e.g. `poetry-study`) → Continue
4. Disable Google Analytics (you don't need it) → **Create project**

---

## Step 2 — Create a Realtime Database

1. In the left sidebar click **Build → Realtime Database**
2. Click **"Create database"**
3. Choose a location close to you (any region is fine)
4. When asked about rules, choose **"Start in test mode"** → Enable

   > Test mode allows open reads/writes for 30 days. You will
   > tighten this in Step 6 after everything is working.

---

## Step 3 — Register a web app and get your credentials

1. Go to **Project Settings** (gear icon, top-left)
2. Scroll down to **"Your apps"** → click the **`</>`** (Web) icon
3. Give the app a nickname (e.g. `poetry-study-web`) → **Register app**
4. Firebase shows you a config block that looks like this:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "poetry-study.firebaseapp.com",
  databaseURL: "https://poetry-study-default-rtdb.firebaseio.com",
  projectId: "poetry-study",
  storageBucket: "poetry-study.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. Open **`firebase-config.js`** in this project and paste each value
   into the matching field.
6. Also set `ADMIN_EMAIL` to the Gmail address you will use to sign in
   to the admin dashboard.

---

## Step 4 — Enable Google Sign-In (for the admin dashboard)

1. In the Firebase Console, go to **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in providers**, click **Google**
4. Toggle it **Enabled** → enter a support email → **Save**

---

## Step 5 — Authorise your domain (GitHub Pages)

After you deploy (Step 7), you need to tell Firebase that your
GitHub Pages domain is allowed to use Google Sign-In.

1. **Build → Authentication → Settings → Authorised domains**
2. Click **"Add domain"**
3. Add: `YOUR_USERNAME.github.io`

---

## Step 6 — Lock down the database rules

Now that everything works, replace the permissive test rules with
these stricter ones so only the study can write data and only
you can read it.

1. **Build → Realtime Database → Rules** tab
2. Replace the existing rules with:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".write": "!data.exists()",
        ".read":  false
      }
    },
    ".read":  false,
    ".write": false
  }
}
```

What this means:
- Participants can **write** a new session (once — they can't overwrite)
- Nobody can **read** via the public API (only the admin dashboard
  reads via the Firebase SDK with your authenticated account)

> **Note:** For the admin dashboard to read data, update the rules
> to allow reads for your UID:
>
> ```json
> {
>   "rules": {
>     "sessions": {
>       ".read":  "auth.token.email === 'your.email@gmail.com'",
>       "$sessionId": {
>         ".write": "!data.exists()"
>       }
>     }
>   }
> }
> ```
> Replace `your.email@gmail.com` with your actual admin email.

---

## Step 7 — Deploy to GitHub Pages

1. Create a new **public** GitHub repository
2. Push all 7 files into the root of the repo:
   ```
   index.html
   admin.html
   style.css
   script.js
   admin.js
   poems.js
   firebase-config.js
   ```
3. Go to the repo **Settings → Pages**
4. Under **"Branch"**, select `main` → `/ (root)` → **Save**
5. Wait ~60 seconds. Your site will be live at:
   - `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
   - Admin dashboard: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/admin.html`

---

## Step 8 — Test it end to end

1. Open `index.html` on your live site
2. Complete the study as a test participant
3. Open `admin.html`, sign in with your Google account
4. You should see your test response appear in the dashboard

---

## File overview

| File | Purpose |
|------|---------|
| `firebase-config.js` | **Your credentials — edit this file** |
| `index.html` | Participant-facing study |
| `script.js` | Study logic + Firebase write |
| `admin.html` | Admin dashboard (Google Auth protected) |
| `admin.js` | Dashboard logic + live data + CSV export |
| `style.css` | All styles (study + admin) |
| `poems.js` | Poem data — add/remove comparisons here |

---

## Viewing your data directly in Firebase

You can always go to **Build → Realtime Database → Data** in the
Firebase Console to see the raw JSON of every session, without
needing the admin dashboard at all. This is the "just download the
JSON" approach your friend mentioned.

---

## Data structure in Firebase

```
/sessions/
  sess_abc123/
    sessionId:   "sess_abc123_1718000000000"
    familiarity: "somewhat_familiar"
    completedAt: "2025-06-10T14:22:00.000Z"
    responses/
      0/
        theme:             "Longing"
        poemA_id:          "Longing-B-1"
        poemB_id:          "Longing-G-1"
        participantChoice: "A"
        displaySwapped:    false
        timestamp:         "2025-06-10T14:20:11.000Z"
      1/ ...
      2/ ...
```

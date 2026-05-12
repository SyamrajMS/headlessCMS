# 🍽️ Restaurant Headless CMS — GitHub Edition

A fully serverless headless CMS powered entirely by GitHub. No backend, no database, no hosting costs.

---

## 📁 File Structure

```
headlessCMS/
├── index.html          ← Public restaurant website
├── admin.html          ← Admin dashboard
├── admin.js            ← Admin logic (GitHub API, CRUD, publish)
├── content/
│   ├── site.json       ← Header, nav, hero, about section
│   ├── footer.json     ← Footer contact, hours, social links
│   └── products.json   ← Menu items (food products)
└── images/             ← Uploaded product photos (auto-created)
```

---

## 🚀 Step-by-Step Setup Guide

### Step 1 — Create the GitHub Repository

1. Go to **https://github.com/new**
2. Name it `headlessCMS` (or your restaurant name — no spaces)
3. Set it to **Public** ← required for free GitHub Pages
4. Check **"Add a README file"**
5. Click **Create repository**

---

### Step 2 — Upload the Project Files

You have two options:

#### Option A — Use GitHub Desktop (Easiest)
1. Download [GitHub Desktop](https://desktop.github.com/)
2. Click **Clone a Repository** → choose your new repo
3. Copy all project files into the cloned folder
4. Click **Commit to main** → **Push origin**

#### Option B — Upload via GitHub Website
1. Open your repository on GitHub
2. Click **Add file → Upload files**
3. Drag and drop all project files and the `content/` folder
4. Click **Commit changes**

> ⚠️ Make sure to upload the `content/` folder with all three JSON files inside.

---

### Step 3 — Enable GitHub Pages

1. In your repository, go to **Settings → Pages**
2. Under **"Source"**, select **Deploy from a branch**
3. Choose **`main`** branch, **`/ (root)`** folder
4. Click **Save**
5. Wait ~2 minutes. Your site will be live at:
   ```
   https://YOUR-USERNAME.github.io/headlessCMS/
   ```

---

### Step 4 — Create a Personal Access Token (PAT)

This token lets the admin page write to your repository.

1. Go to **GitHub → Settings** (top-right avatar)
2. Scroll down to **Developer settings → Personal access tokens → Fine-grained tokens**
3. Click **Generate new token**
4. Give it a name: `Restaurant CMS`
5. Set **Repository access** → **Only select repositories** → choose `headlessCMS`
6. Under **Repository permissions**, set:
   - **Contents** → **Read and write**
7. Click **Generate token**
8. **Copy the token immediately** — you won't see it again!

> 🔒 This token only has access to this one repository. It cannot touch anything else on your GitHub account.

---

### Step 5 — First-Time Admin Setup

1. Visit: `https://YOUR-USERNAME.github.io/headlessCMS/admin.html`
2. You'll see a **First-Time Setup** screen
3. Fill in:
   - **GitHub Username** — your GitHub username
   - **Repository Name** — `headlessCMS`
   - **Personal Access Token** — paste the token from Step 4
   - **Admin Password** — choose a simple password for your client
4. Click **Save & Continue**
5. ✅ You're in! The dashboard will load your content.

> After first-time setup, your client only needs to enter the **Admin Password** to log in — they never see the GitHub token.

---

### Step 6 — Give Access to Your Client

Tell your client:
- **Admin URL:** `https://YOUR-USERNAME.github.io/headlessCMS/admin.html`
- **Password:** (the one you set in Step 5)

That's it. They can now update their restaurant content without any GitHub knowledge.

---

## ✏️ How to Edit Content

### Header & Nav
- Change restaurant name, logo initials, tagline
- Add/edit/remove nav bar links
- Update hero headline, subtext, and CTA button
- Edit the About section text and stats

### Footer
- Update address, phone, email
- Edit opening hours rows
- Manage social media links

### Products (Menu Items)
- **Add** new food items with name, description, price, category, and badge
- **Upload** product photos — stored directly in the GitHub repo
- **Edit** any existing item
- **Delete** items you no longer serve

### Publishing
After making changes, click the **🚀 Publish Changes** button.  
The website updates automatically within **30–60 seconds**.

---

## 🌐 How It Works (Technical)

```
Admin Panel                           GitHub Repo
     │                                     │
     │  1. Edit content in forms           │
     │  2. Click "Publish"                 │
     │  ──── GitHub API (PUT) ────────────>│  Updates JSON files
     │                                     │
Public Website                            │
     │  ←── Fetch raw JSON ───────────────┤
     │  Renders content dynamically        │
```

- **Content** lives as JSON files in the `content/` folder
- **Images** are stored in the `images/` folder
- **Website** fetches content from `raw.githubusercontent.com` (public read)
- **Admin** writes via the GitHub Contents API (authenticated with PAT)

---

## ❓ FAQ

**Q: Is my GitHub token safe?**  
A: Yes. The token is stored only in your browser's `localStorage`. It is never hardcoded in any file, so it's not visible in the source code.

**Q: What if I change my GitHub token?**  
A: Click "Reset / Re-configure GitHub" on the admin login screen and enter the new token.

**Q: Can I use a custom domain?**  
A: Yes! In GitHub → Settings → Pages, you can add a custom domain (e.g. `restaurant.com`).

**Q: What's the cost?**  
A: **Free.** GitHub Pages is free for public repositories. GitHub API calls are free within generous rate limits.

**Q: How fast do changes go live?**  
A: GitHub Pages deploys in ~30–60 seconds after a publish.

---

## 🛠️ Customization

To change the restaurant name/branding before deploying, edit `content/site.json` directly.

To change colors, edit the CSS variables at the top of `index.html`:
```css
:root {
  --gold: #c9a84c;   /* accent color */
  --bg:   #080808;   /* background   */
}
```

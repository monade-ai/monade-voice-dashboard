# monade-dashboard Deployment Guide

## Prerequisites
- Access to the GitHub org repo
- `.env` credentials file (shared separately by Shashwat)
- Access to the Cloudflare account where `monade.ai` is managed

---

## Step 1 — GitHub Secrets *(Shashwat will handle this)*
Shashwat will update the following in **GitHub repo → Settings → Secrets and variables → Actions**:
- `CLOUDFLARE_API_TOKEN` — from the correct Cloudflare account
- `CLOUDFLARE_ACCOUNT_ID` — from the correct Cloudflare account

---

## Step 2 — Create the Worker in Cloudflare
1. **Cloudflare Dashboard → Workers & Pages → Create**
2. Select **Pages → Direct Upload**
3. Name it exactly `monade-dashboard`
4. Upload any dummy file (e.g. a blank `index.html`) to get past the upload step
5. Click **Create**

---

## Step 3 — Trigger First Deployment
Push an empty commit to `main`:
```bash
git commit --allow-empty -m "ci: trigger initial deployment"
git push origin main
```
Watch **GitHub → Actions tab** — the build and deploy should complete in ~2-3 minutes.

---

## Step 4 — Add Custom Domain
Once deployment succeeds:
1. **Cloudflare → Workers & Pages → monade-dashboard → Settings → Domains & Routes → Add Custom Domain**
2. Enter `dashboard.monade.ai`
3. Cloudflare auto-creates the DNS record ✅

---

## Step 5 — Add Runtime Environment Variables
**Cloudflare → Workers & Pages → monade-dashboard → Settings → Variables and Secrets**

Add all keys from the `.env` file shared by Shashwat here.

Then redeploy:
```bash
git commit --allow-empty -m "chore: redeploy with env vars"
git push origin main
```

---

## Done
Your dashboard will be live at `https://dashboard.monade.ai`
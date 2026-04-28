# Setup Guide

## Immediate use (no code needed)

1. Download or clone this repo
2. Open `website/index.html` in Chrome or Edge
3. Click **Pull Latest Jobs** in the sidebar to simulate a job board scan
4. Download resumes from `resumes/usa/` or `resumes/india/`
5. Track applications in `tracker/RaviTeja_Chimata_JobTracker_2026.xlsx`

---

## GitHub Pages (host the dashboard online — free)

Turn the website into a live URL you can open on your phone anywhere:

1. Push this repo to GitHub (make it **private** to protect personal data)
2. Go to **Settings → Pages**
3. Set Source to `main` branch, folder `/website`
4. Your dashboard will be live at `https://yourusername.github.io/job-search/`

---

## Automated daily job pull (GitHub Actions)

The workflow at `.github/workflows/daily_pull.yml` runs every weekday at 9 AM UTC.

**To activate:**

1. The workflow file is already in the repo — it runs automatically on push
2. Edit `scripts/pull_jobs.js` and replace the placeholder with real scraper logic (see comments in the file)
3. Go to **Settings → Secrets → Actions** and add any API keys:
   - `LINKEDIN_API_KEY` — RapidAPI LinkedIn Jobs endpoint (~$10/month)
   - `INDEED_API_KEY` — optional, Indeed has an RSS feed that works without auth
4. Push and the action will run on schedule

**Free scraping options (no API key needed):**
- Indeed RSS: `https://www.indeed.com/rss?q=supplier+quality+engineer&l=Texas`
- Naukri: use Playwright in headless mode (see `scripts/pull_jobs.js` comments)

---

## Making the website read live data

Once GitHub Actions is writing to `data/jobs.json`, update `website/index.html` to fetch it:

Replace the `JOBS_SEED` constant at the top of the script block with:

```javascript
// Load jobs from data file (when hosted on GitHub Pages)
let allJobs = [];
fetch('../data/jobs.json')
  .then(r => r.json())
  .then(jobs => {
    allJobs = jobs;
    renderJobs();
  });
```

---

## Privacy note

This repo contains personal contact information (phone, email). Keep it **private** on GitHub unless you intentionally want it public. If sharing publicly, remove or redact the contact details from `README.md` and the resume files.

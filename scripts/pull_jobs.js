/**
 * pull_jobs.js — Daily job pull script for Ravi Teja Chimata job search
 *
 * This starter script writes placeholder data so the workflow succeeds
 * immediately. Replace the sections marked TODO with real scraper logic
 * (Playwright, Puppeteer, or official APIs).
 *
 * Run locally:  node scripts/pull_jobs.js
 * Run in CI:    GitHub Actions calls this automatically (see .github/workflows/daily_pull.yml)
 */

const fs   = require('fs');
const path = require('path');

// ── CONFIG ─────────────────────────────────────────────────────────────────
const JOBS_FILE     = path.join(__dirname, '../data/jobs.json');
const PULL_LOG_FILE = path.join(__dirname, '../data/pull_log.json');

const PROFILE = {
  keywords: [
    'Quality Engineer', 'Supplier Quality Engineer', 'Lead Quality Engineer',
    'Quality Manager', 'Supplier Quality Manager', 'EV Battery Quality',
    'APQP', 'PPAP', 'PFMEA', 'IATF 16949', 'Automotive Quality',
  ],
  locations: ['Austin TX', 'Texas', 'Remote', 'Pune', 'Bengaluru', 'Chennai', 'Noida'],
  h1bRequired: true,   // filter USA jobs to H1B sponsors only
};

// ── LOAD EXISTING DATA ──────────────────────────────────────────────────────
let existingJobs = [];
let pullLog      = [];

try { existingJobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')); } catch (_) {}
try { pullLog      = JSON.parse(fs.readFileSync(PULL_LOG_FILE, 'utf8')); } catch (_) {}

const existingIds = new Set(existingJobs.map(j => j.id));

// ── TODO: REAL SCRAPER GOES HERE ────────────────────────────────────────────
// Replace this section with actual scraping logic, for example:
//
// Option A — Playwright (headless browser):
//   const { chromium } = require('playwright');
//   const browser = await chromium.launch();
//   const page = await browser.newPage();
//   await page.goto('https://www.linkedin.com/jobs/search/?keywords=Quality+Engineer&location=Texas');
//   const jobs = await page.evaluate(() => { /* extract job cards */ });
//
// Option B — Indeed RSS (no auth required):
//   const feed = await fetch('https://www.indeed.com/rss?q=supplier+quality+engineer&l=Texas');
//
// Option C — RapidAPI / LinkedIn Unofficial API:
//   const response = await fetch('https://linkedin-jobs-search.p.rapidapi.com/', { headers: { 'X-RapidAPI-Key': process.env.LINKEDIN_API_KEY } });
//
// Option D — Naukri.com (India):
//   Naukri has no public API — use Playwright to scrape search results
//
// ────────────────────────────────────────────────────────────────────────────

// Placeholder: simulated new jobs (replace with real scraper output)
const scrapedJobs = [
  // Format: one object per job found
  // {
  //   id: 'linkedin-12345',        // unique ID from source
  //   title: 'Supplier Quality Engineer',
  //   company: 'Aptiv',
  //   location: 'Austin, TX',
  //   market: 'USA',               // 'USA' or 'India'
  //   salary: '$100K–$125K',
  //   link: 'https://...',
  //   description: '...',
  //   h1bSponsor: true,
  //   remote: true,
  //   difficulty: 'Medium',        // Easy / Medium / Hard
  //   matchScore: 87,
  //   pullDate: new Date().toISOString(),
  //   isNew: true,
  //   source: 'LinkedIn',
  // }
];

// ── DEDUPLICATE ──────────────────────────────────────────────────────────────
const newJobs = scrapedJobs.filter(j => !existingIds.has(j.id));

// ── ARCHIVE OLD JOBS (older than 30 days and not in latest scrape) ────────
const scrapedIds    = new Set(scrapedJobs.map(j => j.id));
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const updatedJobs = existingJobs.map(j => {
  if (!scrapedIds.has(j.id) && new Date(j.pullDate) < thirtyDaysAgo) {
    return { ...j, archived: true, archivedDate: new Date().toISOString().split('T')[0] };
  }
  return { ...j, isNew: false };
});

const allJobs = [...newJobs, ...updatedJobs];

// ── WRITE FILES ──────────────────────────────────────────────────────────────
fs.writeFileSync(JOBS_FILE, JSON.stringify(allJobs, null, 2));

const logEntry = {
  timestamp:   new Date().toISOString(),
  newJobs:     newJobs.length,
  totalJobs:   allJobs.filter(j => !j.archived).length,
  archivedJobs: allJobs.filter(j => j.archived).length,
  sources:     ['LinkedIn', 'Indeed', 'Naukri'],
  status:      'success',
};
pullLog.unshift(logEntry);
fs.writeFileSync(PULL_LOG_FILE, JSON.stringify(pullLog.slice(0, 90), null, 2)); // keep 90 days

console.log(`✅ Pull complete — ${newJobs.length} new jobs found, ${allJobs.length} total`);

/**
 * pull_jobs.js — Real Job Scraper for Ravi Teja Chimata
 *
 * Sources:  Indeed RSS (USA + India) — FREE, no API key needed
 * Titles:   Quality Engineer | Supplier Quality Engineer | Launch Quality Engineer
 *           Lead Quality Engineer | Assistant Manager Quality
 * Markets:  USA (H1B sponsor filter) + India (Pune, Bengaluru, Chennai, Noida)
 *
 * Run locally:  node scripts/pull_jobs.js
 * Auto run:     GitHub Actions calls this every weekday at 9 AM UTC
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

// ── FILE PATHS ────────────────────────────────────────────────────────────
const ROOT         = path.join(__dirname, '..');
const JOBS_FILE    = path.join(ROOT, 'data', 'jobs.json');
const LOG_FILE     = path.join(ROOT, 'data', 'pull_log.json');
const ARCHIVE_FILE = path.join(ROOT, 'data', 'archived_jobs.json');

// ══════════════════════════════════════════════════════════════════════════
// SEARCH MATRIX — 5 title types × locations
// ══════════════════════════════════════════════════════════════════════════

const USA_SEARCHES = [
  // ── 1. Quality Engineer ──────────────────────────────────────────────
  { title: 'Quality Engineer automotive',        location: 'Texas',         market: 'USA' },
  { title: 'Quality Engineer automotive',        location: 'Michigan',      market: 'USA' },
  { title: 'Senior Quality Engineer automotive', location: 'Texas',         market: 'USA' },
  { title: 'Senior Quality Engineer automotive', location: 'Michigan',      market: 'USA' },
  { title: 'Senior Quality Engineer automotive', location: 'Indiana',       market: 'USA' },
  { title: 'Quality Engineer EV battery',        location: 'United States', market: 'USA' },
  { title: 'Quality Engineer APQP PPAP',         location: 'United States', market: 'USA' },
  { title: 'Quality Engineer IATF 16949',        location: 'Remote',        market: 'USA' },

  // ── 2. Supplier Quality Engineer ─────────────────────────────────────
  { title: 'Supplier Quality Engineer',          location: 'Texas',         market: 'USA' },
  { title: 'Supplier Quality Engineer',          location: 'Michigan',      market: 'USA' },
  { title: 'Supplier Quality Engineer',          location: 'Indiana',       market: 'USA' },
  { title: 'Supplier Quality Engineer',          location: 'Ohio',          market: 'USA' },
  { title: 'Supplier Quality Engineer',          location: 'Remote',        market: 'USA' },
  { title: 'Senior Supplier Quality Engineer',   location: 'United States', market: 'USA' },
  { title: 'Supplier Quality Engineer PPAP',     location: 'United States', market: 'USA' },

  // ── 3. Launch Quality Engineer ───────────────────────────────────────
  { title: 'Launch Quality Engineer',            location: 'United States', market: 'USA' },
  { title: 'Launch Quality Engineer automotive', location: 'Michigan',      market: 'USA' },
  { title: 'Launch Quality Engineer APQP',       location: 'United States', market: 'USA' },
  { title: 'APQP Launch Engineer',               location: 'Michigan',      market: 'USA' },
  { title: 'New Model Launch Quality Engineer',  location: 'United States', market: 'USA' },

  // ── 4. Lead Quality Engineer ─────────────────────────────────────────
  { title: 'Lead Quality Engineer',              location: 'Texas',         market: 'USA' },
  { title: 'Lead Quality Engineer',              location: 'Michigan',      market: 'USA' },
  { title: 'Lead Quality Engineer',              location: 'United States', market: 'USA' },
  { title: 'Lead Quality Engineer automotive',   location: 'Remote',        market: 'USA' },

  // ── 5. Assistant Manager Quality ─────────────────────────────────────
  { title: 'Assistant Manager Quality',          location: 'United States', market: 'USA' },
  { title: 'Quality Manager automotive',         location: 'Michigan',      market: 'USA' },
  { title: 'Quality Manager automotive',         location: 'Texas',         market: 'USA' },
  { title: 'Quality Assurance Manager',          location: 'United States', market: 'USA' },
];

const INDIA_SEARCHES = [
  // ── 1. Quality Engineer ──────────────────────────────────────────────
  { title: 'Quality Engineer automotive',        location: 'Pune',       market: 'India' },
  { title: 'Quality Engineer automotive',        location: 'Bengaluru',  market: 'India' },
  { title: 'Quality Engineer automotive',        location: 'Chennai',    market: 'India' },
  { title: 'Senior Quality Engineer',            location: 'Pune',       market: 'India' },
  { title: 'Senior Quality Engineer EV',         location: 'Bengaluru',  market: 'India' },
  { title: 'Quality Engineer IATF 16949',        location: 'Pune',       market: 'India' },

  // ── 2. Supplier Quality Engineer ─────────────────────────────────────
  { title: 'Supplier Quality Engineer',          location: 'Pune',       market: 'India' },
  { title: 'Supplier Quality Engineer',          location: 'Bengaluru',  market: 'India' },
  { title: 'Supplier Quality Engineer',          location: 'Chennai',    market: 'India' },
  { title: 'Supplier Quality Engineer',          location: 'Noida',      market: 'India' },
  { title: 'Supplier Quality Engineer',          location: 'Manesar',    market: 'India' },
  { title: 'Senior Supplier Quality Engineer',   location: 'Pune',       market: 'India' },

  // ── 3. Launch Quality Engineer ───────────────────────────────────────
  { title: 'Launch Quality Engineer',            location: 'Pune',       market: 'India' },
  { title: 'Launch Quality Engineer',            location: 'Chennai',    market: 'India' },
  { title: 'APQP Engineer automotive',           location: 'Pune',       market: 'India' },
  { title: 'New Model Launch Quality',           location: 'Pune',       market: 'India' },
  { title: 'APQP PPAP Engineer',                 location: 'Bengaluru',  market: 'India' },

  // ── 4. Lead Quality Engineer ─────────────────────────────────────────
  { title: 'Lead Quality Engineer',              location: 'Pune',       market: 'India' },
  { title: 'Lead Quality Engineer',              location: 'Bengaluru',  market: 'India' },
  { title: 'Lead Quality Engineer',              location: 'Chennai',    market: 'India' },

  // ── 5. Assistant Manager Quality ─────────────────────────────────────
  { title: 'Assistant Manager Quality',          location: 'Pune',       market: 'India' },
  { title: 'Assistant Manager Quality',          location: 'Bengaluru',  market: 'India' },
  { title: 'Assistant Manager Quality',          location: 'Chennai',    market: 'India' },
  { title: 'Assistant Manager Quality',          location: 'Noida',      market: 'India' },
  { title: 'Deputy Manager Quality automotive',  location: 'Pune',       market: 'India' },
  { title: 'Quality Manager automotive',         location: 'Pune',       market: 'India' },
  { title: 'Quality Manager automotive',         location: 'Chennai',    market: 'India' },
];

// ══════════════════════════════════════════════════════════════════════════
// SCORING — keywords matched against Ravi's resume
// ══════════════════════════════════════════════════════════════════════════
const KEYWORDS = [
  { w: 'APQP',             pts: 3 }, { w: 'PPAP',            pts: 3 },
  { w: 'PFMEA',            pts: 3 }, { w: 'FMEA',            pts: 2 },
  { w: 'Control Plan',     pts: 3 }, { w: 'IATF 16949',      pts: 3 },
  { w: 'IATF16949',        pts: 3 }, { w: '8D',              pts: 3 },
  { w: 'SPC',              pts: 3 }, { w: 'GD&T',            pts: 3 },
  { w: 'MSA',              pts: 2 }, { w: 'Gage R&R',        pts: 2 },
  { w: 'Cp/Cpk',           pts: 2 }, { w: 'Cpk',             pts: 2 },
  { w: 'EV',               pts: 3 }, { w: 'electric vehicle', pts: 3 },
  { w: 'battery',          pts: 3 }, { w: 'automotive',      pts: 2 },
  { w: 'supplier quality', pts: 3 }, { w: 'launch',          pts: 2 },
  { w: 'DMAIC',            pts: 2 }, { w: 'Six Sigma',       pts: 2 },
  { w: 'root cause',       pts: 2 }, { w: 'RCCA',            pts: 2 },
  { w: 'Kaizen',           pts: 2 }, { w: 'Poka Yoke',       pts: 2 },
  { w: 'poka-yoke',        pts: 2 }, { w: 'SCAR',            pts: 2 },
  { w: 'MRB',              pts: 2 }, { w: 'NCM',             pts: 1 },
  { w: 'stamping',         pts: 1 }, { w: 'injection molding',pts: 1 },
  { w: 'welding',          pts: 1 }, { w: 'DVP',             pts: 1 },
  { w: 'CMM',              pts: 1 }, { w: 'Minitab',         pts: 1 },
  { w: 'Power BI',         pts: 1 }, { w: 'Tableau',         pts: 1 },
];
const MAX_PTS = KEYWORDS.reduce((s, k) => s + k.pts, 0);

function scoreJob(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  let raw = 0;
  const matched = [];
  for (const k of KEYWORDS) {
    if (text.includes(k.w.toLowerCase())) { raw += k.pts; matched.push(k.w); }
  }
  return {
    score: Math.min(98, Math.round(50 + (raw / MAX_PTS) * 48)),
    matched,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// H1B SPONSOR DETECTION
// ══════════════════════════════════════════════════════════════════════════
const H1B_SPONSORS = [
  'tesla','ford','toyota','aptiv','bosch','honeywell','ge ','apple','amazon',
  'google','microsoft','siemens','continental','magna','borgwarner','delphi',
  'lear','autoliv','valeo','faurecia','forvia','denso','aisin','nifco',
  'yinlun','carrier','eaton','rivian','lucid','stellantis','general motors',
  'honda','hyundai','kia','cummins','dana','raytheon','boeing','northrop',
  'texas instruments','nxp','infineon','onsemi','jabil','flex',
];

function isH1B(company, desc) {
  const t = (company + ' ' + desc).toLowerCase();
  if (/no sponsorship|without sponsorship|must be authorized|us citizen|security clearance/i.test(t)) return false;
  if (/visa sponsorship|h1b|h-1b|work authorization|will sponsor/i.test(t)) return true;
  return H1B_SPONSORS.some(s => t.includes(s));
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════
function classifyTitle(title) {
  const t = title.toLowerCase();
  if (/assistant manager|deputy manager|asst\.?\s*manager/i.test(t)) return 'Assistant Manager Quality';
  if (/\blead\b/i.test(t))     return 'Lead Quality Engineer';
  if (/launch|apqp/i.test(t))  return 'Launch Quality Engineer';
  if (/supplier/i.test(t))     return 'Supplier Quality Engineer';
  return 'Quality Engineer';
}

function classifyDifficulty(score, title, desc) {
  const t = (title + desc).toLowerCase();
  if (/10\+\s*years|12\+\s*years|15\+\s*years/.test(t)) return 'Hard';
  if (score >= 82) return 'Easy';
  if (score >= 68) return 'Medium';
  return 'Hard';
}

function cleanHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ').trim().substring(0, 450);
}

function extractCompany(item) {
  const parts = item.title.split(' - ');
  return parts.length >= 2 ? parts[parts.length - 1].trim() : (item.source || 'Unknown');
}

function extractSalary(desc, market) {
  const usa  = desc.match(/\$[\d,]+K?(?:\s*[-–]\s*\$[\d,]+K?)?(?:\s*(?:per year|\/yr|annually))?/i);
  if (usa) return usa[0];
  const ind  = desc.match(/₹[\d,.]+(?:\s*[-–]\s*₹[\d,.]+)?\s*(?:LPA|lpa|lac)?|[\d.]+\s*[-–]\s*[\d.]+\s*LPA/i);
  if (ind) return ind[0];
  return 'Salary not listed';
}

function makeId(link) {
  const clean = link.replace(/[?&](utm_|jk=|from=|vjs=)[^&]*/g, '').substring(0, 80);
  return 'job-' + Buffer.from(clean).toString('base64').replace(/[^a-zA-Z0-9]/g,'').substring(0,20);
}

function fmtDate(str) {
  const d = str ? new Date(str) : new Date();
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── HTTP FETCH ────────────────────────────────────────────────────────────
function fetchURL(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchURL(res.headers.location, redirects + 1));
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── RSS PARSER ────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRx.exec(xml)) !== null) {
    const block = m[1];
    const get = tag => {
      const r = new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'
      );
      const x = r.exec(block);
      return x ? (x[1] || x[2] || '').trim() : '';
    };
    items.push({
      title:       get('title'),
      link:        get('link'),
      description: get('description'),
      pubDate:     get('pubDate'),
      source:      get('source'),
    });
  }
  return items;
}

// ── BUILD INDEED RSS URL ──────────────────────────────────────────────────
function rssURL(title, location, market) {
  const q = encodeURIComponent(title);
  const l = encodeURIComponent(location);
  const base = market === 'India' ? 'https://in.indeed.com' : 'https://www.indeed.com';
  return `${base}/rss?q=${q}&l=${l}&sort=date&fromage=14&limit=25`;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
async function pullJobs() {
  console.log('\n' + '═'.repeat(62));
  console.log('  JOB PULL — Ravi Teja Chimata Job Search');
  console.log('  ' + new Date().toISOString());
  console.log('═'.repeat(62));

  // Load existing
  let existing = [], log = [], archived = [];
  try { existing = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')); } catch (_) {}
  try { log      = JSON.parse(fs.readFileSync(LOG_FILE,  'utf8')); } catch (_) {}
  try { archived = JSON.parse(fs.readFileSync(ARCHIVE_FILE,'utf8')); } catch (_) {}

  const existingIds = new Set(existing.map(j => j.id));
  const allSearches = [...USA_SEARCHES, ...INDIA_SEARCHES];
  const raw = [];
  let errors = 0;

  // ── RUN SEARCHES ──────────────────────────────────────────────────────
  for (let i = 0; i < allSearches.length; i++) {
    const s   = allSearches[i];
    const url = rssURL(s.title, s.location, s.market);
    const pct = `[${String(i+1).padStart(2)}/${allSearches.length}]`;
    process.stdout.write(`  ${pct} ${s.market.padEnd(5)} | ${s.title.padEnd(38)} @ ${s.location} ... `);

    try {
      const xml   = await fetchURL(url);
      const items = parseRSS(xml);
      process.stdout.write(`${items.length} results\n`);

      for (const item of items) {
        if (!item.title || !item.link) continue;
        const company         = extractCompany(item);
        const desc            = cleanHtml(item.description);
        const { score, matched } = scoreJob(item.title, desc);
        const id              = makeId(item.link);

        raw.push({
          id,
          title:          item.title.split(' - ')[0].trim(),
          company,
          location:       s.location,
          market:         s.market,
          category:       classifyTitle(item.title),
          diff:           classifyDifficulty(score, item.title, desc),
          score,
          matchedKeywords: matched,
          salaryDisplay:  extractSalary(desc, s.market),
          remote:         /remote|work from home|wfh/i.test(item.title + desc + s.location),
          h1b:            s.market === 'India' ? false : isH1B(company, desc),
          link:           item.link,
          description:    desc,
          pullDate:       fmtDate(item.pubDate),
          pullTimestamp:  new Date().toISOString(),
          isNew:          !existingIds.has(id),
          source:         s.market === 'India' ? 'Indeed India' : 'Indeed USA',
          searchTitle:    s.title,
        });
      }
    } catch (err) {
      process.stdout.write(`SKIP (${err.message.substring(0,40)})\n`);
      errors++;
    }

    await sleep(700); // polite delay
  }

  // ── DEDUPLICATE ──────────────────────────────────────────────────────
  const seen    = new Set();
  const unique  = [];
  for (const job of raw) {
    const key = `${job.title.toLowerCase().substring(0,30)}|${job.company.toLowerCase().substring(0,20)}`;
    if (!seen.has(job.id) && !seen.has(key)) {
      seen.add(job.id); seen.add(key);
      unique.push(job);
    }
  }

  // ── FILTER RELEVANCE ─────────────────────────────────────────────────
  const relevant = unique.filter(j => {
    const t = (j.title + ' ' + j.description).toLowerCase();
    return (t.includes('quality') || t.includes('qms') || t.includes('iatf')) && j.score >= 50;
  });

  relevant.sort((a, b) => b.score - a.score);

  // ── ARCHIVE STALE JOBS (not seen in 30 days) ─────────────────────────
  const freshIds   = new Set(relevant.map(j => j.id));
  const cutoff     = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const keepActive = [];
  const nowArchive = [];

  for (const job of existing) {
    const d = new Date(job.pullTimestamp || 0);
    if (!freshIds.has(job.id) && d < cutoff) {
      nowArchive.push({ ...job, archived: true, archivedDate: fmtDate(new Date()) });
    } else {
      keepActive.push({ ...job, isNew: false });
    }
  }

  const brandNew   = relevant.filter(j => !existingIds.has(j.id));
  const refreshed  = relevant.filter(j =>  existingIds.has(j.id));
  const unchanged  = keepActive.filter(j => !freshIds.has(j.id));
  const finalJobs  = [...brandNew, ...refreshed, ...unchanged];
  const allArchived = [...nowArchive, ...archived].slice(0, 300);

  // ── STATS ─────────────────────────────────────────────────────────────
  const cats = {};
  for (const t of [
    'Quality Engineer','Supplier Quality Engineer',
    'Launch Quality Engineer','Lead Quality Engineer','Assistant Manager Quality',
  ]) cats[t] = finalJobs.filter(j => j.category === t).length;

  console.log('\n' + '─'.repeat(62));
  console.log(`  ✅ Complete — ${brandNew.length} new | ${finalJobs.length} total | ${errors} errors`);
  console.log(`  🇺🇸 USA: ${finalJobs.filter(j=>j.market==='USA').length}   🇮🇳 India: ${finalJobs.filter(j=>j.market==='India').length}`);
  console.log('\n  By title category:');
  for (const [cat, count] of Object.entries(cats)) {
    console.log(`    ${'▸'} ${cat.padEnd(36)} ${count}`);
  }
  console.log('─'.repeat(62) + '\n');

  // ── WRITE ────────────────────────────────────────────────────────────
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(JOBS_FILE,    JSON.stringify(finalJobs,   null, 2));
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(allArchived, null, 2));

  log.unshift({
    timestamp:    new Date().toISOString(),
    newJobs:      brandNew.length,
    totalJobs:    finalJobs.length,
    usaJobs:      finalJobs.filter(j => j.market === 'USA').length,
    indiaJobs:    finalJobs.filter(j => j.market === 'India').length,
    archivedJobs: nowArchive.length,
    searchesRun:  allSearches.length,
    searchErrors: errors,
    byCategory:   cats,
    status:       errors < allSearches.length * 0.5 ? 'success' : 'partial',
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log.slice(0, 90), null, 2));
}

pullJobs().catch(err => { console.error('Fatal:', err); process.exit(1); });

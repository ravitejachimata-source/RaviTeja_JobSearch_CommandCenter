/**
 * pull_jobs.js — Multi-Source Apify Job Scraper v2
 * Ravi Teja Chimata | Quality Engineer Job Search
 *
 * Sources:
 *   1. Indeed USA      → valig/indeed-jobs-scraper
 *   2. Indeed India    → valig/indeed-jobs-scraper (country: in)
 *   3. LinkedIn USA    → worldunboxer/rapid-linkedin-scraper (title-based URLs)
 *   4. Glassdoor USA   → valig/glassdoor-jobs-scraper
 *   5. Naukri India    → automation-lab/naukri-scraper
 *
 * Title categories:
 *   1. Quality Engineer
 *   2. Supplier Quality Engineer
 *   3. Launch Quality Engineer
 *   4. Lead Quality Engineer
 *   5. Assistant Manager Quality
 */

'use strict';
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT         = path.join(__dirname, '..');
const JOBS_FILE    = path.join(ROOT, 'data', 'jobs.json');
const LOG_FILE     = path.join(ROOT, 'data', 'pull_log.json');
const ARCHIVE_FILE = path.join(ROOT, 'data', 'archived_jobs.json');

const APIFY_KEY = process.env.APIFY_API_KEY;
if (!APIFY_KEY) { console.error('ERROR: APIFY_API_KEY not set.'); process.exit(1); }

// ── ACTORS ───────────────────────────────────────────────────────────────────
const ACTORS = {
  indeed:    'valig~indeed-jobs-scraper',
  linkedin:  'worldunboxer~rapid-linkedin-scraper',
  glassdoor: 'valig~glassdoor-jobs-scraper',
  naukri:    'automation-lab~naukri-scraper',
};

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH MATRIX
// Key insight: use TITLE-level searches, not keyword soup
// ══════════════════════════════════════════════════════════════════════════════

// ── INDEED USA (field: title) ─────────────────────────────────────────────
const INDEED_USA = [
  // Quality Engineer
  { title: 'Quality Engineer',                    location: 'Texas',         limit: 20 },
  { title: 'Quality Engineer',                    location: 'Michigan',      limit: 20 },
  { title: 'Senior Quality Engineer',             location: 'United States', limit: 20 },
  { title: 'Quality Engineer APQP',               location: 'United States', limit: 15 },
  { title: 'Quality Engineer EV battery',         location: 'United States', limit: 15 },
  // Supplier Quality Engineer
  { title: 'Supplier Quality Engineer',           location: 'United States', limit: 25 },
  { title: 'Supplier Quality Engineer',           location: 'Texas',         limit: 15 },
  { title: 'Supplier Quality Engineer',           location: 'Michigan',      limit: 20 },
  { title: 'Senior Supplier Quality Engineer',    location: 'United States', limit: 15 },
  // Launch Quality Engineer
  { title: 'Launch Quality Engineer',             location: 'United States', limit: 20 },
  { title: 'Advanced Quality Engineer APQP',      location: 'United States', limit: 15 },
  { title: 'Advanced Product Quality Engineer',   location: 'United States', limit: 15 },
  // Lead Quality Engineer
  { title: 'Lead Quality Engineer',               location: 'United States', limit: 20 },
  { title: 'Lead Quality Engineer',               location: 'Texas',         limit: 15 },
  // Assistant Manager Quality
  { title: 'Quality Manager automotive',          location: 'United States', limit: 20 },
  { title: 'Quality Assurance Manager',           location: 'Michigan',      limit: 15 },
  { title: 'Assistant Manager Quality',           location: 'United States', limit: 15 },
];

// ── INDEED INDIA (field: title) ───────────────────────────────────────────
const INDEED_INDIA = [
  { title: 'Quality Engineer automotive',         location: 'Pune',          limit: 20 },
  { title: 'Quality Engineer automotive',         location: 'Bengaluru',     limit: 20 },
  { title: 'Quality Engineer automotive',         location: 'Chennai',       limit: 15 },
  { title: 'Senior Quality Engineer',             location: 'Pune',          limit: 15 },
  { title: 'Supplier Quality Engineer',           location: 'Pune',          limit: 20 },
  { title: 'Supplier Quality Engineer',           location: 'Bengaluru',     limit: 15 },
  { title: 'Supplier Quality Engineer',           location: 'Chennai',       limit: 15 },
  { title: 'Launch Quality Engineer',             location: 'Pune',          limit: 15 },
  { title: 'APQP Engineer',                       location: 'Pune',          limit: 15 },
  { title: 'Lead Quality Engineer',               location: 'Pune',          limit: 15 },
  { title: 'Lead Quality Engineer',               location: 'Bengaluru',     limit: 15 },
  { title: 'Assistant Manager Quality',           location: 'Pune',          limit: 15 },
  { title: 'Assistant Manager Quality',           location: 'Bengaluru',     limit: 15 },
  { title: 'Deputy Manager Quality',              location: 'Pune',          limit: 15 },
  { title: 'Quality Manager automotive',          location: 'Pune',          limit: 15 },
];

// ── LINKEDIN USA (use title-specific search + date filter) ────────────────
// LinkedIn actor uses 'keywords' but we pass EXACT job titles + f_TPR=r604800 (7 days)
// This is much more accurate than keyword soup
const LINKEDIN_USA = [
  { keywords: '"Quality Engineer" automotive',          location: 'United States', limit: 25 },
  { keywords: '"Supplier Quality Engineer"',            location: 'United States', limit: 25 },
  { keywords: '"Supplier Quality Engineer"',            location: 'Texas',         limit: 15 },
  { keywords: '"Launch Quality Engineer"',              location: 'United States', limit: 20 },
  { keywords: '"Lead Quality Engineer"',                location: 'United States', limit: 20 },
  { keywords: '"Quality Manager" automotive PPAP',      location: 'United States', limit: 20 },
  { keywords: '"Assistant Manager" quality automotive', location: 'United States', limit: 15 },
  { keywords: '"Quality Engineer" EV battery PFMEA',    location: 'United States', limit: 15 },
  { keywords: '"Supplier Quality" APQP PPAP IATF',      location: 'United States', limit: 15 },
];

// ── GLASSDOOR USA ────────────────────────────────────────────────────────
const GLASSDOOR_USA = [
  { keyword: 'Supplier Quality Engineer',   location: 'United States', limit: 20 },
  { keyword: 'Quality Engineer automotive', location: 'United States', limit: 20 },
  { keyword: 'Launch Quality Engineer',     location: 'United States', limit: 15 },
  { keyword: 'Lead Quality Engineer',       location: 'United States', limit: 15 },
  { keyword: 'Quality Manager automotive',  location: 'United States', limit: 15 },
];

// ── NAUKRI INDIA ─────────────────────────────────────────────────────────
const NAUKRI_SEARCHES = [
  { keyword: 'quality engineer APQP PPAP',              location: 'Pune' },
  { keyword: 'quality engineer PFMEA IATF',             location: 'Bengaluru' },
  { keyword: 'quality engineer EV battery',             location: 'Pune' },
  { keyword: 'supplier quality engineer PPAP SCAR',     location: 'Pune' },
  { keyword: 'supplier quality engineer IATF audit',    location: 'Bengaluru' },
  { keyword: 'supplier quality engineer PPAP',          location: 'Chennai' },
  { keyword: 'launch quality engineer APQP',            location: 'Pune' },
  { keyword: 'APQP engineer new model launch',          location: 'Pune' },
  { keyword: 'lead quality engineer APQP PPAP',         location: 'Pune' },
  { keyword: 'lead quality engineer automotive',        location: 'Bengaluru' },
  { keyword: 'assistant manager quality PPAP IATF',     location: 'Pune' },
  { keyword: 'deputy manager quality automotive',       location: 'Chennai' },
  { keyword: 'quality manager automotive PPAP',         location: 'Pune' },
];

// ── SCORING ───────────────────────────────────────────────────────────────
const KW = [
  {w:'APQP',p:3},{w:'PPAP',p:3},{w:'PFMEA',p:3},{w:'FMEA',p:2},
  {w:'Control Plan',p:3},{w:'IATF 16949',p:3},{w:'IATF16949',p:3},
  {w:'8D',p:3},{w:'SPC',p:3},{w:'GD&T',p:3},{w:'MSA',p:2},
  {w:'Gage R&R',p:2},{w:'Cp/Cpk',p:2},{w:'Cpk',p:2},
  {w:'EV',p:3},{w:'electric vehicle',p:3},{w:'battery',p:2},
  {w:'automotive',p:2},{w:'supplier quality',p:3},{w:'launch',p:2},
  {w:'DMAIC',p:2},{w:'Six Sigma',p:2},{w:'root cause',p:2},
  {w:'RCCA',p:2},{w:'Kaizen',p:2},{w:'SCAR',p:2},{w:'MRB',p:2},
  {w:'corrective action',p:2},{w:'stamping',p:1},{w:'injection molding',p:1},
  {w:'welding',p:1},{w:'CMM',p:1},{w:'Minitab',p:1},{w:'Power BI',p:1},
  {w:'DVP',p:1},{w:'LPA',p:2},{w:'audit',p:1},{w:'SCAR',p:2},
];
const MAX_PTS = KW.reduce((s,k)=>s+k.p,0);

function scoreJob(title, desc) {
  const t = (title+' '+desc).toLowerCase();
  let raw=0; const matched=[];
  for (const k of KW) { if(t.includes(k.w.toLowerCase())){raw+=k.p;matched.push(k.w);} }
  return { score: Math.min(98, Math.round(50+(raw/MAX_PTS)*48)), matched };
}

// ── RELEVANCE FILTER ──────────────────────────────────────────────────────
const MUST  = /quality|qms|iatf|apqp|ppap|pfmea|supplier.*quality/i;
const BLOCK = /\b(budtender|cannabis|marijuana|dispensary|police|dispatcher|cashier|arabic.*speaker|ai.*training|translator|driver|janitor|cleaner|retail.*sales|barista|nurse|teacher|accountant|electrician|plumber|hvac tech|cook|chef|server|waiter)\b/i;

function isRelevant(title, desc, s) {
  if (BLOCK.test(title)) return false;
  const text = title + ' ' + desc;
  if (!MUST.test(text)) return false;
  if (s < 52) return false;
  return true;
}

// ── H1B DETECTION ────────────────────────────────────────────────────────
const H1B_COS = ['tesla','ford','toyota','aptiv','bosch','honeywell','apple','amazon',
  'google','microsoft','siemens','continental','magna','borgwarner','lear','autoliv',
  'valeo','faurecia','forvia','denso','aisin','nifco','yinlun','carrier','eaton',
  'rivian','lucid','stellantis','general motors','honda','hyundai','kia','cummins',
  'dana','raytheon','boeing','jabil','flex','te connectivity','nexteer','summit polymers',
  'us farathane','yanfeng','shape corp','gentex','adac','martinrea','shiloh',
];

function isH1B(company, desc) {
  const t = (company+' '+desc).toLowerCase();
  if (/no sponsorship|without sponsorship|must be authorized|us citizen only|security clearance required/i.test(t)) return false;
  if (/visa sponsorship|h1b|h-1b|will sponsor|work authorization|transfer/i.test(t)) return true;
  return H1B_COS.some(s=>t.includes(s));
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function catTitle(title) {
  const t = title.toLowerCase();
  if (/assistant manager|deputy manager|asst\.?\s*manager/i.test(t)) return 'Assistant Manager Quality';
  if (/\blead\b/i.test(t))    return 'Lead Quality Engineer';
  if (/launch|advanced product quality/i.test(t)) return 'Launch Quality Engineer';
  if (/supplier/i.test(t))    return 'Supplier Quality Engineer';
  return 'Quality Engineer';
}

function diff(s) { return s>=82?'Easy':s>=68?'Medium':'Hard'; }

const clean = h => (h||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().substring(0,600);

const fmtDate = d => {
  const dt=d?new Date(d):new Date();
  const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
};

const mkId = (src,id) => `${src}-${String(id).replace(/[^a-zA-Z0-9]/g,'').substring(0,24)}`;
const sleep = ms => new Promise(r=>setTimeout(r,ms));

// ── APIFY CALL ────────────────────────────────────────────────────────────
function apifyRun(actor, input, timeoutSecs=120) {
  return new Promise((resolve,reject) => {
    const body = JSON.stringify(input);
    const url  = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_KEY}&timeout=${timeoutSecs}&clean=true&limit=200`;
    const req  = https.request(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},
      timeout:(timeoutSecs+30)*1000,
    }, res => {
      let data='';
      res.on('data',c=>data+=c);
      res.on('end',()=>{
        if(res.statusCode>=200&&res.statusCode<300){
          try{resolve(JSON.parse(data));}catch(e){reject(new Error('JSON:'+e.message));}
        } else reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0,200)}`));
      });
    });
    req.on('error',reject);
    req.on('timeout',()=>{req.destroy();reject(new Error('Timeout'));});
    req.write(body); req.end();
  });
}

// ── PROCESSORS ───────────────────────────────────────────────────────────

function procIndeed(items, market, searchTitle) {
  const out = [];
  for (const item of (items||[])) {
    const rawTitle = item.title || '';
    const title    = rawTitle.replace(/\s*[-–|].*$/, '').trim(); // strip "- Company Name"
    const company  = item.employer?.name || 'Unknown';
    const desc     = clean(item.description?.text || item.description?.html || '');
    const {score:s, matched} = scoreJob(title, desc);
    if (!isRelevant(title, desc, s)) continue;

    // Extract salary from Indeed structured data first, then text
    let salary = 'Not listed';
    if (item.baseSalary?.min) {
      salary = `$${Math.round(item.baseSalary.min/1000)}K–$${Math.round(item.baseSalary.max/1000)}K/yr`;
    } else {
      const m = desc.match(/\$[\d,]+(?:K)?(?:\s*[-–]\s*\$[\d,]+(?:K)?)?(?:\s*(?:\/yr|per year|annually|\/hour|\/hr))?/i);
      if (m) salary = m[0];
    }
    if (market === 'India') {
      const m = desc.match(/₹[\d,.]+(?:\s*[-–]\s*₹[\d,.]+)?\s*(?:LPA|lpa|lac)?|[\d.]+\s*[-–]\s*[\d.]+\s*LPA/i);
      if (m) salary = m[0];
    }

    out.push({
      id:              mkId(market==='India'?'indeed-in':'indeed-us', item.key||item.url||Math.random()),
      title,
      company,
      location:        item.location?.city || searchTitle,
      locationFull:    [item.location?.city, item.location?.admin1Code].filter(Boolean).join(', '),
      market,
      category:        catTitle(title),
      diff:            diff(s),
      score:           s,
      matchedKeywords: matched,
      salaryDisplay:   salary,
      remote:          /remote|work from home|wfh/i.test(title+desc),
      h1b:             market==='India'?false:isH1B(company,desc),
      jobUrl:          item.jobUrl || item.url,
      link:            item.jobUrl || item.url,
      description:     desc,
      pullDate:        fmtDate(item.datePublished),
      pullTimestamp:   new Date().toISOString(),
      isNew:           true,
      source:          market==='India'?'Indeed India':'Indeed USA',
    });
  }
  return out;
}

function procLinkedIn(items, searchKeywords) {
  const out = [];
  for (const item of (items||[])) {
    const title   = (item.job_title || '').trim();
    const company = item.company_name || 'Unknown';
    const desc    = clean(item.job_description || '');
    const {score:s, matched} = scoreJob(title, desc);
    if (!isRelevant(title, desc, s)) continue;

    const salary = item.salary_range || 'Not listed';

    out.push({
      id:              mkId('linkedin', item.job_id || Math.random()),
      title,
      company,
      location:        item.location || 'United States',
      market:          'USA',
      category:        catTitle(title),
      diff:            diff(s),
      score:           s,
      matchedKeywords: matched,
      salaryDisplay:   salary,
      remote:          /remote|hybrid/i.test(item.location||''),
      h1b:             isH1B(company, desc),
      jobUrl:          item.job_url || item.apply_url,
      link:            item.job_url || item.apply_url,
      description:     desc,
      pullDate:        fmtDate(item.time_posted ? new Date() : null),
      pullTimestamp:   new Date().toISOString(),
      isNew:           true,
      source:          'LinkedIn',
    });
  }
  return out;
}

function procGlassdoor(items, searchKeyword) {
  const out = [];
  for (const item of (items||[])) {
    const title   = (item.jobTitle || item.title || '').trim();
    const company = item.employer?.name || item.companyName || 'Unknown';
    const desc    = clean(item.jobDescription || item.description || '');
    const {score:s, matched} = scoreJob(title, desc);
    if (!isRelevant(title, desc, s)) continue;

    // Glassdoor has structured salary
    let salary = 'Not listed';
    if (item.payCurrency && item.payPeriod) {
      if (item.payLow && item.payHigh)
        salary = `$${Math.round(item.payLow/1000)}K–$${Math.round(item.payHigh/1000)}K/${item.payPeriod==='ANNUAL'?'yr':'hr'}`;
    }

    out.push({
      id:              mkId('glassdoor', item.jobListingId || item.id || Math.random()),
      title,
      company,
      location:        item.location || item.locationName || 'United States',
      market:          'USA',
      category:        catTitle(title),
      diff:            diff(s),
      score:           s,
      matchedKeywords: matched,
      salaryDisplay:   salary,
      companyRating:   item.employer?.rating || null,
      remote:          /remote|hybrid/i.test(item.location||''),
      h1b:             isH1B(company, desc),
      jobUrl:          item.jobUrl || item.url || item.applyUrl,
      link:            item.jobUrl || item.url || item.applyUrl,
      description:     desc,
      pullDate:        fmtDate(item.listingDate || item.datePosted),
      pullTimestamp:   new Date().toISOString(),
      isNew:           true,
      source:          'Glassdoor',
    });
  }
  return out;
}

function procNaukri(items, keyword) {
  const out = [];
  for (const item of (items||[])) {
    const title   = (item.title || '').trim();
    const company = item.company || item.companyName || 'Unknown';
    const desc    = clean(item.jobDescription || item.description || '');
    const skills  = Array.isArray(item.skills) ? item.skills.join(' ') : (item.skills||'');
    const {score:s, matched} = scoreJob(title, desc+' '+skills);
    if (!isRelevant(title, desc, s)) continue;

    // Naukri salary in lakhs
    let salary = 'Not disclosed';
    if (item.salary && item.salary !== 'Not disclosed' && item.salary !== '') {
      salary = item.salary;
    } else if (item.minSalary && item.maxSalary) {
      salary = `₹${item.minSalary}–${item.maxSalary} LPA`;
    }

    out.push({
      id:              mkId('naukri', item.jobId || Math.random()),
      title,
      company,
      location:        item.location || item.jobLocation || 'India',
      market:          'India',
      category:        catTitle(title),
      diff:            diff(s),
      score:           s,
      matchedKeywords: matched,
      salaryDisplay:   salary,
      experience:      item.experience || item.experienceText || '',
      remote:          /remote|work from home/i.test(title+desc),
      h1b:             false,
      jobUrl:          item.url || item.jobUrl || item.applyLink,
      link:            item.url || item.jobUrl || item.applyLink,
      description:     desc.substring(0,600),
      pullDate:        fmtDate(item.createdDate || item.datePosted),
      pullTimestamp:   new Date().toISOString(),
      isNew:           true,
      source:          'Naukri.com',
    });
  }
  return out;
}

function dedup(jobs) {
  const seenId=new Set(), seenKey=new Set(), out=[];
  for (const j of jobs) {
    const key=`${j.title.toLowerCase().substring(0,35)}|${j.company.toLowerCase().substring(0,20)}`;
    if(!seenId.has(j.id)&&!seenKey.has(key)){ seenId.add(j.id); seenKey.add(key); out.push(j); }
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n'+'═'.repeat(68));
  console.log('  MULTI-SOURCE JOB PULL v2 — Ravi Teja Chimata');
  console.log('  Sources: Indeed USA · Indeed India · LinkedIn · Glassdoor · Naukri');
  console.log('  '+new Date().toISOString());
  console.log('═'.repeat(68)+'\n');

  let existing=[],log=[],archived=[];
  try{existing=JSON.parse(fs.readFileSync(JOBS_FILE,'utf8'));}catch(_){}
  try{log=JSON.parse(fs.readFileSync(LOG_FILE,'utf8'));}catch(_){}
  try{archived=JSON.parse(fs.readFileSync(ARCHIVE_FILE,'utf8'));}catch(_){}
  const existingIds=new Set(existing.map(j=>j.id));

  const allRaw=[]; let total=0, errors=0;

  // ── 1. INDEED USA ──────────────────────────────────────────────────────
  console.log('🇺🇸  Indeed USA...\n');
  for (const s of INDEED_USA) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.title.padEnd(40)} @ ${s.location} ... `);
    try {
      const items = await apifyRun(ACTORS.indeed, {country:'us', title:s.title, location:s.location, limit:s.limit, datePosted:'14'}, 90);
      const proc  = procIndeed(items,'USA',s.title);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,50)})\n`); errors++; }
    await sleep(1000);
  }

  // ── 2. INDEED INDIA ────────────────────────────────────────────────────
  console.log('\n🇮🇳  Indeed India...\n');
  for (const s of INDEED_INDIA) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.title.padEnd(40)} @ ${s.location} ... `);
    try {
      const items = await apifyRun(ACTORS.indeed, {country:'in', title:s.title, location:s.location, limit:s.limit, datePosted:'14'}, 90);
      const proc  = procIndeed(items,'India',s.title);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,50)})\n`); errors++; }
    await sleep(1000);
  }

  // ── 3. LINKEDIN USA ────────────────────────────────────────────────────
  console.log('\n💼  LinkedIn USA...\n');
  for (const s of LINKEDIN_USA) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.keywords.padEnd(44)} ... `);
    try {
      const items = await apifyRun(ACTORS.linkedin, {
        keywords:   s.keywords,
        location:   s.location,
        limit:      s.limit,
        datePosted: 'Past week',
      }, 90);
      const proc = procLinkedIn(items, s.keywords);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,50)})\n`); errors++; }
    await sleep(1200);
  }

  // ── 4. GLASSDOOR USA ───────────────────────────────────────────────────
  console.log('\n🔍  Glassdoor USA...\n');
  for (const s of GLASSDOOR_USA) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.keyword.padEnd(44)} ... `);
    try {
      const items = await apifyRun(ACTORS.glassdoor, {
        keyword:    s.keyword,
        location:   s.location,
        limit:      s.limit,
        datePosted: 'last14days',
      }, 90);
      const proc = procGlassdoor(items, s.keyword);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,50)})\n`); errors++; }
    await sleep(1000);
  }

  // ── 5. NAUKRI INDIA ────────────────────────────────────────────────────
  console.log('\n🇮🇳  Naukri.com...\n');
  for (const s of NAUKRI_SEARCHES) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.keyword.padEnd(44)} @ ${s.location} ... `);
    try {
      const items = await apifyRun(ACTORS.naukri, {
        keyword:  s.keyword,
        location: s.location,
        maxItems: 50,
      }, 120);
      const proc = procNaukri(items, s.keyword);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,50)})\n`); errors++; }
    await sleep(1500);
  }

  // ── DEDUPLICATE & SORT ────────────────────────────────────────────────
  const unique = dedup(allRaw);
  unique.sort((a,b)=>b.score-a.score);

  // ── NEW vs EXISTING ───────────────────────────────────────────────────
  const brandNew  = unique.filter(j=>!existingIds.has(j.id));
  const refreshed = unique.filter(j=> existingIds.has(j.id)).map(j=>({...j,isNew:false}));
  const freshIds  = new Set(unique.map(j=>j.id));
  const cutoff    = new Date(Date.now()-30*24*60*60*1000);
  const stillLive=[], nowArchive=[];
  for (const j of existing) {
    const d=new Date(j.pullTimestamp||0);
    if(!freshIds.has(j.id)&&d<cutoff) nowArchive.push({...j,archived:true,archivedDate:fmtDate(new Date())});
    else if(!freshIds.has(j.id)) stillLive.push({...j,isNew:false});
  }
  const finalJobs   = [...brandNew,...refreshed,...stillLive];
  const allArchived = [...nowArchive,...archived].slice(0,500);

  // ── STATS ─────────────────────────────────────────────────────────────
  const CATS=['Quality Engineer','Supplier Quality Engineer','Launch Quality Engineer','Lead Quality Engineer','Assistant Manager Quality'];
  const cats={};
  for(const c of CATS) cats[c]=finalJobs.filter(j=>j.category===c).length;

  const bySrc={};
  for(const j of finalJobs){bySrc[j.source]=(bySrc[j.source]||0)+1;}

  console.log('\n'+'─'.repeat(68));
  console.log(`  ✅ Complete`);
  console.log(`  Raw scraped:    ${allRaw.length}  →  After dedup+filter: ${unique.length}`);
  console.log(`  New this pull:  ${brandNew.length}  |  Total active: ${finalJobs.length}`);
  console.log(`  🇺🇸 USA: ${finalJobs.filter(j=>j.market==='USA').length}  |  🇮🇳 India: ${finalJobs.filter(j=>j.market==='India').length}  |  Errors: ${errors}/${total}`);
  console.log('\n  By source:');
  for(const[src,n] of Object.entries(bySrc)) console.log(`    ▸ ${src.padEnd(16)} ${n}`);
  console.log('\n  By title category:');
  for(const[c,n] of Object.entries(cats)) console.log(`    ▸ ${c.padEnd(36)} ${n}`);
  console.log('─'.repeat(68)+'\n');

  // ── WRITE FILES ───────────────────────────────────────────────────────
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(JOBS_FILE,    JSON.stringify(finalJobs,  null,2));
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(allArchived,null,2));

  log.unshift({
    timestamp:    new Date().toISOString(),
    newJobs:      brandNew.length,
    totalJobs:    finalJobs.length,
    usaJobs:      finalJobs.filter(j=>j.market==='USA').length,
    indiaJobs:    finalJobs.filter(j=>j.market==='India').length,
    archivedJobs: nowArchive.length,
    searchesRun:  total,
    searchErrors: errors,
    byCategory:   cats,
    bySource:     bySrc,
    sources:      ['Indeed USA','Indeed India','LinkedIn','Glassdoor','Naukri.com'],
    status:       errors<total*0.4?'success':'partial',
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log.slice(0,90),null,2));
  console.log(`  Wrote: jobs.json (${finalJobs.length}), pull_log.json (${log.length}), archived (${allArchived.length})\n`);
}

main().catch(err=>{console.error('Fatal:',err.message); process.exit(1);});
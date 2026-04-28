/**
 * pull_jobs.js — Apify-Powered Real Job Scraper
 * Ravi Teja Chimata | Quality Engineer Job Search
 *
 * Sources:
 *   Indeed USA   → valig~indeed-jobs-scraper
 *   Indeed India → valig~indeed-jobs-scraper (country: in)
 *   Naukri India → muhammetakkurtt~naukri-job-scraper
 *
 * Title categories:
 *   1. Quality Engineer
 *   2. Supplier Quality Engineer
 *   3. Launch Quality Engineer
 *   4. Lead Quality Engineer
 *   5. Assistant Manager Quality
 *
 * Run locally:   APIFY_API_KEY=your_key node scripts/pull_jobs.js
 * GitHub CI:     Uses APIFY_API_KEY secret automatically
 */

'use strict';
const fs    = require('fs');
const path  = require('path');
const https = require('https');

// ── PATHS ─────────────────────────────────────────────────────────────────────
const ROOT         = path.join(__dirname, '..');
const JOBS_FILE    = path.join(ROOT, 'data', 'jobs.json');
const LOG_FILE     = path.join(ROOT, 'data', 'pull_log.json');
const ARCHIVE_FILE = path.join(ROOT, 'data', 'archived_jobs.json');

const APIFY_KEY = process.env.APIFY_API_KEY;
if (!APIFY_KEY) {
  console.error('ERROR: APIFY_API_KEY not set. Add it as GitHub Secret or export locally.');
  process.exit(1);
}

// Actor IDs (~ replaces / for URL encoding)
const INDEED_ACTOR = 'valig~indeed-jobs-scraper';
const NAUKRI_ACTOR = 'muhammetakkurtt~naukri-job-scraper';

// ── SEARCH MATRIX ─────────────────────────────────────────────────────────────
const INDEED_USA = [
  // Quality Engineer
  { keyword: 'Quality Engineer APQP PPAP automotive',     location: 'United States' },
  { keyword: 'Quality Engineer PFMEA IATF 16949',         location: 'Michigan' },
  { keyword: 'Quality Engineer EV battery manufacturing', location: 'United States' },
  { keyword: 'Senior Quality Engineer APQP automotive',   location: 'Texas' },
  { keyword: 'Senior Quality Engineer EV PFMEA',          location: 'United States' },
  // Supplier Quality Engineer
  { keyword: 'Supplier Quality Engineer PPAP APQP',       location: 'United States' },
  { keyword: 'Supplier Quality Engineer IATF automotive', location: 'Michigan' },
  { keyword: 'Supplier Quality Engineer SCAR MRB',        location: 'United States' },
  { keyword: 'Senior Supplier Quality Engineer PPAP',     location: 'Texas' },
  { keyword: 'Supplier Quality Engineer EV battery',      location: 'United States' },
  // Launch Quality Engineer
  { keyword: 'Launch Quality Engineer APQP PPAP',         location: 'United States' },
  { keyword: 'Launch Quality Engineer PFMEA automotive',  location: 'Michigan' },
  { keyword: 'New Model Launch Quality Engineer APQP',    location: 'United States' },
  { keyword: 'APQP Launch Quality Engineer',              location: 'United States' },
  // Lead Quality Engineer
  { keyword: 'Lead Quality Engineer APQP automotive',     location: 'United States' },
  { keyword: 'Lead Quality Engineer PPAP PFMEA',          location: 'Texas' },
  { keyword: 'Lead Quality Engineer EV battery',          location: 'United States' },
  { keyword: 'Lead Supplier Quality Engineer PPAP',       location: 'United States' },
  // Assistant Manager Quality
  { keyword: 'Assistant Manager Quality IATF automotive', location: 'United States' },
  { keyword: 'Quality Manager APQP PPAP automotive',      location: 'Michigan' },
  { keyword: 'Quality Manager EV IATF 16949',             location: 'United States' },
  { keyword: 'Quality Assurance Manager APQP IATF',       location: 'United States' },
];

const INDEED_INDIA = [
  // Quality Engineer
  { keyword: 'Quality Engineer APQP PPAP automotive',     location: 'Pune' },
  { keyword: 'Quality Engineer PFMEA IATF automotive',    location: 'Bengaluru' },
  { keyword: 'Quality Engineer PPAP SPC automotive',      location: 'Chennai' },
  { keyword: 'Senior Quality Engineer APQP PFMEA',        location: 'Pune' },
  { keyword: 'Quality Engineer EV battery PFMEA',         location: 'Bengaluru' },
  // Supplier Quality Engineer
  { keyword: 'Supplier Quality Engineer PPAP SCAR',       location: 'Pune' },
  { keyword: 'Supplier Quality Engineer APQP IATF',       location: 'Bengaluru' },
  { keyword: 'Supplier Quality Engineer PPAP audit',      location: 'Chennai' },
  { keyword: 'Senior Supplier Quality Engineer PPAP',     location: 'Pune' },
  { keyword: 'Supplier Quality Engineer MRB corrective',  location: 'Noida' },
  // Launch Quality Engineer
  { keyword: 'Launch Quality Engineer APQP automotive',   location: 'Pune' },
  { keyword: 'APQP engineer new model launch quality',    location: 'Pune' },
  { keyword: 'Launch Quality PPAP PFMEA automotive',      location: 'Chennai' },
  { keyword: 'New Model Launch Quality APQP PFMEA',       location: 'Bengaluru' },
  // Lead Quality Engineer
  { keyword: 'Lead Quality Engineer APQP PPAP',           location: 'Pune' },
  { keyword: 'Lead Quality Engineer automotive IATF',     location: 'Bengaluru' },
  { keyword: 'Lead Quality Engineer EV battery PFMEA',    location: 'Pune' },
  // Assistant Manager Quality
  { keyword: 'Assistant Manager Quality PPAP IATF',       location: 'Pune' },
  { keyword: 'Assistant Manager Quality APQP automotive', location: 'Bengaluru' },
  { keyword: 'Deputy Manager Quality PPAP automotive',    location: 'Chennai' },
  { keyword: 'Quality Manager APQP PPAP automotive',      location: 'Pune' },
];

const NAUKRI_KEYWORDS = [
  'quality engineer APQP PPAP PFMEA',
  'quality engineer IATF 16949 SPC',
  'senior quality engineer APQP supplier',
  'quality engineer EV battery PFMEA',
  'supplier quality engineer PPAP APQP SCAR',
  'supplier quality engineer IATF 16949 audit',
  'supplier quality engineer MRB corrective action',
  'senior supplier quality engineer PPAP',
  'launch quality engineer APQP PPAP',
  'new model launch quality APQP PFMEA',
  'APQP engineer launch quality automotive',
  'lead quality engineer APQP PPAP automotive',
  'lead supplier quality engineer IATF',
  'lead quality engineer EV manufacturing',
  'assistant manager quality PPAP APQP',
  'deputy manager quality automotive IATF',
  'quality manager APQP PPAP IATF automotive',
];

// ── SCORING ───────────────────────────────────────────────────────────────────
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
];
const MAX_PTS = KW.reduce((s,k)=>s+k.p,0);

function score(title, desc) {
  const t = (title+' '+desc).toLowerCase();
  let raw=0; const matched=[];
  for (const k of KW) { if(t.includes(k.w.toLowerCase())){raw+=k.p;matched.push(k.w);} }
  return { score: Math.min(98, Math.round(50+(raw/MAX_PTS)*48)), matched };
}

// ── FILTERS ───────────────────────────────────────────────────────────────────
const MUST  = /quality|qms|iatf|apqp|ppap|pfmea/i;
const BLOCK = /truck driver|janitorial|cleaner|film installer|sales.*car|mechanic\b|cashier|warehouse pick|service advisor/i;

function relevant(title, desc, s) {
  return !BLOCK.test(title) && MUST.test(title+' '+desc) && s >= 52;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const clean = h => (h||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
  .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().substring(0,500);

const fmtDate = d => { const dt=d?new Date(d):new Date(), m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${m[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; };
const mkId    = (src,id) => `${src}-${String(id).replace(/[^a-zA-Z0-9]/g,'').substring(0,24)}`;
const sleep   = ms => new Promise(r=>setTimeout(r,ms));

const H1B_COS = ['tesla','ford','toyota','aptiv','bosch','honeywell','apple','amazon','google','microsoft','siemens','continental','magna','borgwarner','lear','autoliv','valeo','faurecia','denso','aisin','nifco','yinlun','carrier','eaton','rivian','lucid','stellantis','general motors','honda','hyundai','kia','cummins','dana','raytheon','boeing','jabil','flex','te connectivity'];
function h1b(company, desc) {
  const t=(company+' '+desc).toLowerCase();
  if(/no sponsorship|without sponsorship|must be authorized|us citizen only/i.test(t)) return false;
  if(/visa sponsorship|h1b|h-1b|will sponsor|work authorization/i.test(t)) return true;
  return H1B_COS.some(s=>t.includes(s));
}

function catTitle(title) {
  const t=title.toLowerCase();
  if(/assistant manager|deputy manager/i.test(t)) return 'Assistant Manager Quality';
  if(/\blead\b/i.test(t)) return 'Lead Quality Engineer';
  if(/launch|apqp launch/i.test(t)) return 'Launch Quality Engineer';
  if(/supplier/i.test(t)) return 'Supplier Quality Engineer';
  return 'Quality Engineer';
}

function diff(s) { return s>=82?'Easy':s>=68?'Medium':'Hard'; }

function salaryUSA(text) {
  const m=text.match(/\$[\d,]+(?:K)?(?:\s*[-–]\s*\$[\d,]+(?:K)?)?(?:\s*(?:\/yr|per year|annually))?/i);
  return m?m[0]:'Salary not listed';
}

// ── APIFY CALL ────────────────────────────────────────────────────────────────
function apifyRun(actor, input, timeout=120) {
  return new Promise((resolve,reject) => {
    const body = JSON.stringify(input);
    const url  = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_KEY}&timeout=${timeout}&clean=true&limit=100`;
    const req  = https.request(url, { method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}, timeout:(timeout+30)*1000 }, res => {
      let data='';
      res.on('data',c=>data+=c);
      res.on('end',()=>{
        if(res.statusCode>=200&&res.statusCode<300){ try{resolve(JSON.parse(data));}catch(e){reject(new Error('JSON:'+e.message));} }
        else reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0,150)}`));
      });
    });
    req.on('error',reject);
    req.on('timeout',()=>{ req.destroy(); reject(new Error('Timeout')); });
    req.write(body); req.end();
  });
}

// ── PROCESSORS ───────────────────────────────────────────────────────────────
function procIndeed(items, market, keyword, location) {
  const out=[];
  for (const item of (items||[])) {
    const title   = (item.title||'').replace(/\s*-\s*.+$/,'').trim();
    const company = item.employer?.name||'Unknown';
    const desc    = clean(item.description?.text||item.description?.html||'');
    const {score:s, matched} = score(title, desc);
    if (!relevant(title, desc, s)) continue;
    out.push({
      id:              mkId(market==='India'?'indeed-in':'indeed-us', item.key||item.url||Math.random()),
      title, company,
      location:        item.location?.city||location,
      market,
      category:        catTitle(title),
      diff:            diff(s),
      score:           s,
      matchedKeywords: matched,
      salaryDisplay:   item.baseSalary?.min ? `$${Math.round(item.baseSalary.min/1000)}K–$${Math.round(item.baseSalary.max/1000)}K` : salaryUSA(desc),
      remote:          /remote|work from home|wfh/i.test(title+desc+location),
      h1b:             market==='India'?false:h1b(company,desc),
      link:            item.jobUrl||item.url,
      description:     desc,
      pullDate:        fmtDate(item.datePublished),
      pullTimestamp:   new Date().toISOString(),
      isNew:           true,
      source:          market==='India'?'Indeed India':'Indeed USA',
      searchKeyword:   keyword,
    });
  }
  return out;
}

function procNaukri(items, keyword) {
  const out=[];
  for (const item of (items||[])) {
    const title   = item.title||'';
    const desc    = clean(item.jobDescription||'');
    const skills  = (item.tagsAndSkills||'').split(',').map(s=>s.trim());
    const {score:s, matched} = score(title, desc+' '+skills.join(' '));
    if (!relevant(title, desc, s)) continue;
    let sal='Not disclosed';
    if (item.salaryDetail&&!item.salaryDetail.hideSalary&&item.salaryDetail.maximumSalary>0) {
      const mn=(item.salaryDetail.minimumSalary/100000).toFixed(1);
      const mx=(item.salaryDetail.maximumSalary/100000).toFixed(1);
      sal=`₹${mn}–${mx} LPA`;
    } else if (item.salary&&item.salary!=='Not disclosed') sal=item.salary;
    out.push({
      id:              mkId('naukri',item.jobId||Math.random()),
      title:           title.trim(),
      company:         item.companyName||'Unknown',
      location:        item.location||'India',
      market:          'India',
      category:        catTitle(title),
      diff:            diff(s),
      score:           s,
      matchedKeywords: matched,
      salaryDisplay:   sal,
      remote:          /remote|work from home/i.test(title+desc),
      h1b:             false,
      link:            item.jdURL,
      description:     desc.substring(0,500),
      experience:      item.experienceText||'',
      pullDate:        fmtDate(item.createdDate),
      pullTimestamp:   new Date().toISOString(),
      isNew:           true,
      source:          'Naukri.com',
      searchKeyword:   keyword,
    });
  }
  return out;
}

function dedup(jobs) {
  const ids=new Set(), keys=new Set(), out=[];
  for (const j of jobs) {
    const k=`${j.title.toLowerCase().substring(0,30)}|${j.company.toLowerCase().substring(0,20)}`;
    if(!ids.has(j.id)&&!keys.has(k)){ ids.add(j.id); keys.add(k); out.push(j); }
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n'+'═'.repeat(64));
  console.log('  APIFY JOB PULL — Ravi Teja Chimata');
  console.log('  '+new Date().toISOString());
  console.log('═'.repeat(64)+'\n');

  let existing=[],log=[],archived=[];
  try{existing=JSON.parse(fs.readFileSync(JOBS_FILE,'utf8'));}catch(_){}
  try{log=JSON.parse(fs.readFileSync(LOG_FILE,'utf8'));}catch(_){}
  try{archived=JSON.parse(fs.readFileSync(ARCHIVE_FILE,'utf8'));}catch(_){}
  const existingIds=new Set(existing.map(j=>j.id));

  const allRaw=[]; let total=0, errors=0;

  // Indeed USA
  console.log('🇺🇸  Indeed USA...\n');
  for (const s of INDEED_USA) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.keyword.substring(0,44).padEnd(44)} ... `);
    try {
      const items = await apifyRun(INDEED_ACTOR,{country:'us',keyword:s.keyword,location:s.location,maxResults:25,datePosted:'last14days'},90);
      const proc  = procIndeed(items,'USA',s.keyword,s.location);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,45)})\n`); errors++; }
    await sleep(1200);
  }

  // Indeed India
  console.log('\n🇮🇳  Indeed India...\n');
  for (const s of INDEED_INDIA) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${s.keyword.substring(0,44).padEnd(44)} ... `);
    try {
      const items = await apifyRun(INDEED_ACTOR,{country:'in',keyword:s.keyword,location:s.location,maxResults:25,datePosted:'last14days'},90);
      const proc  = procIndeed(items,'India',s.keyword,s.location);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,45)})\n`); errors++; }
    await sleep(1200);
  }

  // Naukri
  console.log('\n🇮🇳  Naukri.com...\n');
  for (const kw of NAUKRI_KEYWORDS) {
    total++;
    process.stdout.write(`  [${String(total).padStart(2)}] ${kw.substring(0,44).padEnd(44)} ... `);
    try {
      const items = await apifyRun(NAUKRI_ACTOR,{keyword:kw,maxJobs:50},120);
      const proc  = procNaukri(items,kw);
      allRaw.push(...proc);
      process.stdout.write(`${(items||[]).length} raw → ${proc.length} matched\n`);
    } catch(e) { process.stdout.write(`SKIP (${e.message.substring(0,45)})\n`); errors++; }
    await sleep(1500);
  }

  // Dedup + sort
  const unique = dedup(allRaw);
  unique.sort((a,b)=>b.score-a.score);

  // New vs existing
  const brandNew  = unique.filter(j=>!existingIds.has(j.id));
  const refreshed = unique.filter(j=>existingIds.has(j.id)).map(j=>({...j,isNew:false}));
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

  const CATS=['Quality Engineer','Supplier Quality Engineer','Launch Quality Engineer','Lead Quality Engineer','Assistant Manager Quality'];
  const cats={}; for(const c of CATS) cats[c]=finalJobs.filter(j=>j.category===c).length;

  console.log('\n'+'─'.repeat(64));
  console.log(`  ✅ Complete — ${brandNew.length} new | ${finalJobs.length} total | ${errors}/${total} errors`);
  console.log(`  🇺🇸 USA: ${finalJobs.filter(j=>j.market==='USA').length}   🇮🇳 India: ${finalJobs.filter(j=>j.market==='India').length}`);
  console.log('\n  By category:');
  for(const[c,n] of Object.entries(cats)) console.log(`    ▸ ${c.padEnd(36)} ${n}`);
  console.log('─'.repeat(64)+'\n');

  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(JOBS_FILE,    JSON.stringify(finalJobs,  null,2));
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(allArchived,null,2));
  log.unshift({timestamp:new Date().toISOString(),newJobs:brandNew.length,totalJobs:finalJobs.length,usaJobs:finalJobs.filter(j=>j.market==='USA').length,indiaJobs:finalJobs.filter(j=>j.market==='India').length,archivedJobs:nowArchive.length,searchesRun:total,searchErrors:errors,byCategory:cats,sources:['Indeed USA','Indeed India','Naukri.com'],status:errors<total*0.4?'success':'partial'});
  fs.writeFileSync(LOG_FILE, JSON.stringify(log.slice(0,90),null,2));
  console.log(`  data/jobs.json (${finalJobs.length}), pull_log.json (${log.length}), archived (${allArchived.length})\n`);
}

main().catch(err=>{ console.error('Fatal:',err.message); process.exit(1); });

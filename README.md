# Ravi Teja Chimata — Job Search Command Center

> 8+ years | Quality Engineering | EV Battery | Automotive | Tesla · Yanfeng · Aisin USA

A personal job search repository containing tailored ATS-optimised resumes, an application tracker spreadsheet, and an interactive job dashboard website — covering both **USA (H1B Transfer Ready)** and **India (Open to Relocation)** markets.

---

## 📁 Repository Structure

```
├── website/
│   └── index.html              ← Full job search dashboard (open in browser)
│
├── resumes/
│   ├── usa/                    ← 5 tailored resumes for US roles (H1B Transfer Ready)
│   │   ├── 01_Tesla_SrQualityEngineer_USA.docx
│   │   ├── 02_Ford_SupplierQualityEngineer_USA.docx
│   │   ├── 03_Toyota_QualityEngineer_USA.docx
│   │   ├── 04_Aptiv_SrSQE_USA.docx
│   │   └── 05_Nifco_SQE_USA.docx
│   │
│   └── india/                  ← 5 tailored resumes for India roles (No Austin TX)
│       ├── 06_Bosch_SQManager_India.docx
│       ├── 07_TataMotors_SrQE_EV_India.docx
│       ├── 08_Motherson_LeadQE_India.docx
│       ├── 09_Valeo_SQManager_India.docx
│       └── 10_OlaElectric_AdvQE_India.docx
│
└── tracker/
    └── RaviTeja_Chimata_JobTracker_2026.xlsx  ← Excel tracker (21 India + 21 USA jobs)
```

---

## 🌐 Dashboard Website

Open `website/index.html` directly in any browser — no server needed.

**Features:**
- 📋 Overview with skill match bars, top roles, salary benchmarks
- 🔍 Job listings with filters (market, difficulty, remote, H1B), sorting, and match scores
- 🔄 **Pull Latest Jobs** button — simulates live job board scanning with step-by-step progress, injects new listings, and archives old ones
- 📅 History & Archive — full pull log with timestamps, timeline view by pull date, archived jobs section
- 📄 Tailored Resumes panel with download links
- 🗺 Strategy panel — 4-week application plan, H1B advice, India market tips, LinkedIn optimisation

---

## 📄 Resumes

Each `.docx` file is tailored for a specific role with:
- ATS-optimised keywords from the actual job description
- Role-specific professional summary
- Consistent Calibri formatting, right-aligned dates, bullet numbering
- **USA resumes**: `Austin, TX | H1B Transfer Ready` in header
- **India resumes**: `Open to Relocation across India` in header — no US city mentioned

| # | File | Company | Market | Match |
|---|------|---------|--------|-------|
| 1 | `01_Tesla_SrQualityEngineer_USA.docx` | Tesla Inc. | 🇺🇸 USA | 96% |
| 2 | `02_Ford_SupplierQualityEngineer_USA.docx` | Ford Motor Company | 🇺🇸 USA | 88% |
| 3 | `03_Toyota_QualityEngineer_USA.docx` | Toyota Motor NA | 🇺🇸 USA | 86% |
| 4 | `04_Aptiv_SrSQE_USA.docx` | Aptiv | 🇺🇸 USA | 87% |
| 5 | `05_Nifco_SQE_USA.docx` | Nifco America | 🇺🇸 USA | 90% |
| 6 | `06_Bosch_SQManager_India.docx` | Bosch India | 🇮🇳 India | 93% |
| 7 | `07_TataMotors_SrQE_EV_India.docx` | Tata Motors / TPEM | 🇮🇳 India | 91% |
| 8 | `08_Motherson_LeadQE_India.docx` | Motherson Group | 🇮🇳 India | 88% |
| 9 | `09_Valeo_SQManager_India.docx` | Valeo India | 🇮🇳 India | 85% |
| 10 | `10_OlaElectric_AdvQE_India.docx` | Ola Electric | 🇮🇳 India | 82% |

---

## 📊 Excel Tracker

`tracker/RaviTeja_Chimata_JobTracker_2026.xlsx` contains 5 sheets:

1. **Resume Analysis** — Full recruiter-eye assessment, strengths, gaps, improvements
2. **India Jobs** — 21 India openings (High / Medium / Stretch categories)
3. **USA Jobs** — 21 USA openings with H1B notes
4. **Daily Tracker** — Fillable log with dropdowns (Status, Market, Resume Variant)
5. **Dashboard & Goals** — Weekly targets, salary benchmarks, top companies

---

## 🛠 Core Skills (ATS Keywords)

`APQP` · `PPAP` · `PFMEA` · `Control Plans` · `SPC` · `DOE` · `MSA` · `GD&T` · `8D` · `DMAIC` · `RCCA` · `LPA` · `CQI Audits` · `IATF 16949` · `ISO 9001` · `EV Battery Quality` · `Supplier Quality Management` · `MRB / NCM` · `SCAR` · `Cp/Cpk` · `Pp/Ppk` · `Poka-Yoke` · `Kaizen` · `Minitab` · `Power BI` · `Tableau` · `SQL` · `Plex` · `Teamcenter`

---

## 📬 Contact

- **Email:** ravitejachimata@gmail.com
- **Phone:** +1 812-927-6309
- **LinkedIn:** [linkedin.com/in/ravi-teja-c-814478b1](https://www.linkedin.com/in/ravi-teja-c-814478b1/)
- **Location:** Austin, TX | H1B Transfer Ready | Open to India Relocation

---

## 🚀 How to Use This Repo

1. **Clone** the repo to your local machine
2. Open `website/index.html` in Chrome or Edge for the full dashboard
3. Use the **Pull Latest Jobs** button in the dashboard to simulate job board scans
4. Download `.docx` resumes from `resumes/usa/` or `resumes/india/` for the relevant role
5. Track daily applications in `tracker/RaviTeja_Chimata_JobTracker_2026.xlsx`
6. Update this README and commit changes as you apply to new roles

---

## 🔮 Future Enhancements (if converting to live app)

- Replace the simulated pull with real scrapers (Node.js + Playwright) hitting LinkedIn, Indeed, and Naukri
- Add a GitHub Action to run the pull daily at 9 AM and commit new job listings to `data/jobs.json`
- Deploy `website/index.html` to GitHub Pages for access from any device
- Add email alerts via GitHub Actions + SendGrid when new high-match jobs appear

---

*Generated with AI assistance · Last updated: April 2026*

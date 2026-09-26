# 🪑 AnalyticsMFC — Operational Intelligence Platform

> **Modern Furniture Co. · Melbourne, VIC**  
> *AI-Powered Operational Analytics Platform — Past, Present, and Future Intelligence.*

[![Platform](https://img.shields.io/badge/Platform-Web%20Application-blue.svg)](#)
[![Tech](https://img.shields.io/badge/Tech-Vanilla%20JS%20%7C%20HTML5%20%7C%20CSS3-orange.svg)](#)
[![Charts](https://img.shields.io/badge/Charts-Chart.js%204.4.0-purple.svg)](#)
[![Data Parsing](https://img.shields.io/badge/Parser-PapaParse%205.4.1-green.svg)](#)
[![AI Integration](https://img.shields.io/badge/AI-Google%20Gemini%20%2B%20Offline%20Engine-emerald.svg)](#)

---

## 📌 Overview

**AnalyticsMFC** is an operational analytics dashboard and conversational intelligence platform developed for **Modern Furniture Co. (MFC)**, a bespoke furniture manufacturer based in Melbourne, Australia. 

The platform analyses 24 months of operational data (2025–2026) across sales orders, general financial ledgers, HR rosters, timber inventories, and workshop production stages. It empowers executives, workshop leads, and sales teams to evaluate past performance, diagnose active workshop bottlenecks, estimate delivery commitment risks, forecast trends, and query business intelligence using an integrated AI assistant.

---

## 🏛️ Core Architecture: The Four Pillars

The platform organizes operational intelligence across four logical pillars:

```
AnalyticsMFC
├── 📜 PAST (Descriptive Analytics)
│   ├── Executive Snapshot (Company-wide KPIs & interactive drill-down)
│   ├── Orders & Sales (Pipeline register, search, filters, order modal)
│   ├── Financial P&L (Monthly revenue vs. costs, cost breakdowns, margins)
│   ├── Human Resources (Roster, skill distribution, wage costs, leave events)
│   └── Inventory History (Timber stock levels, consumption trends, reorders)
│
├── ⚡ PRESENT (Diagnostic & Workshop Floor Operations)
│   ├── Operations Board (3-level stage ➔ product ➔ order drill-down)
│   └── Commitment Risk (Pre-WIP workload bands, due date reliability rule)
│
├── 🔮 FUTURE (Predictive & Strategic Drivers)
│   ├── Forecasts & Risk (3-month trend extrapolation, live risk alerts)
│   └── Correlation Drivers (Ranked drivers & dynamic scatter plots)
│
└── 🤖 INTELLIGENCE (Augmented Analytics & Data Governance)
    ├── Ask AI — FurBuddy (Gemini 1.5 & offline rule engine with progressive disclosure)
    └── Data Profile & Quality (Automated schema inspection & quality report)
```

---

## ✨ Key Features

### 1. Executive Snapshot & Interactive Drill-Downs
* Real-time KPI scorecards: Total Revenue, Total Inquiries, Acceptance Rate, On-Time Delivery %, Revenue minus costs, and Active Staff.
* Interactive charts: Click any segment on the **Order Status Breakdown** or **Orders by Product Type** charts to open a granular Deep-Dive Panel showing stage hour breakdowns, average quote values, and product win rates.

### 2. Live Order Register & Order Detail Modal
* Searchable, filterable order table with status filtering (`DELIVERED`, `LOST`) and product categorization.
* Click any order row to open the **Order Detail Modal**, displaying planned production hours (Design, Milling, Joinery, Finishing), complexity ratings, and late delivery penalty badges.

### 3. Shop Floor Operations Board (3-Level Drill-Down)
* **Level 0 (Stage Overview)**: Visual cards for Design ✏️, Milling ⚙️, Joinery 🔧, and Finishing 🎨 showing active orders and planned hours.
* **Level 1 (Product Drill-Down)**: Open orders segmented by furniture type.
* **Level 2 (Order Detail)**: Individual active order cards with direct modal inspection.

### 4. Commitment Risk & Reference-Class Workload Bands
* Classifies historical orders into Pre-WIP concurrent workload bands: `<10`, `10-11`, `12-13`, `14-15`, and `16+`.
* **Empirical Insight**: Orders accepted with `<12` active orders achieve 0–4.5% late delivery; late delivery jumps to **44.8%** at 14–15 orders and **82.7%** at 16+ orders.
* Dynamically highlights the current shop floor active workload band in **red** so sales teams avoid committing to unachievable delivery dates.

### 5. Ask AI — FurBuddy (Conversational Intelligence)
* Powered by **Google Gemini 1.5 Flash** with an offline deterministic rule engine fallback.
* **Progressive Disclosure**: Provides concise direct answers first, with dynamic follow-up buttons:
  * **`Why?`**: Reveals quantitative evidence, sample sizes ($n$), and p-values.
  * **`What should I do?`**: Displays actionable management advice.
  * **`How reliable is this?`**: Discloses analytical limitations and observation windows.
* **Strict Privacy Guardrails**: Intercepts queries seeking individual employee salaries or customer personal information.
* **Floating AI Chat (FAB)**: Quick access button available across all screens.

### 6. Client-Side Data Ingestion & Persistence
* Bundled sample dataset automatically loads 7 core CSV files covering the 24-month operational period.
* Support for custom enterprise CSV drag-and-drop uploads with schema validation.
* Browser `localStorage` persistence and rehydration.

---

## 🚀 Getting Started

AnalyticsMFC is built as a lightweight, zero-dependency client-side web application. No Node.js compilation, backend database, or build steps are required.

### Quick Launch

1. **Direct Browser Launch**:
   * Double-click [`index.html`](index.html) or right-click and open it with **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox**, or **Safari**.

2. **Using a Local Static Server (Optional)**:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Or using npx
   npx serve .
   ```
   Then navigate to `http://localhost:8000` in your web browser.

---

## 📂 Project Structure

```
MFC-A2-App-main/
├── index.html                   # Main dashboard shell & web application
├── app.js                       # Core application engine, metrics, charts, & FurBuddy AI
├── style.css                    # Custom CSS design system, typography, & layouts
├── README.md                    # Project documentation & overview
├── MFC_A2_Prompts_Submission.docx # Assignment 2 chronological prompt engineering log
└── data/                        # Operational CSV datasets (2025–2026)
    ├── customers_data.csv       # Customer records
    ├── design_log.csv           # Design phase records
    ├── financial_ledger.csv     # Daily ledger revenue & cost entries
    ├── hr_events_log.csv        # Staff leave & milestone events
    ├── hr_roster.csv            # Employee roster, roles, & skill levels
    ├── inventory_log.csv        # Timber consumption & reorder events
    └── orders_data.csv          # Comprehensive sales & order pipeline data
```

---

## 🛠️ Technology Stack

* **Frontend**: Semantic HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3.
* **Visualization**: [Chart.js](https://www.chartjs.org/) (v4.4.0) for responsive bar, line, doughnut, pie, and scatter charts.
* **Data Ingestion**: [PapaParse](https://www.papaparse.com/) (v5.4.1) for client-side CSV parsing.
* **AI Engine**: Google Gemini 1.5 REST API (configurable via browser UI) with an offline rule-based classification engine fallback.
* **Storage**: Browser `localStorage` for session persistence and API key storage.

---

## 📄 License & Attribution

Developed for Modern Furniture Co. (MFC) — Operational Intelligence & Analytics Assessment.  
Melbourne, Victoria, Australia.

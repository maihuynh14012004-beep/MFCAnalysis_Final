/* ═══════════════════════════════════════════════════════════
   AnalyticsMCF – app.js v3
   Past → Present → Future → Ask AI architecture
   Full drill-down, intent routing, structured AI answers,
   correlation drivers, forecasts, feedback system
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Global state ── */
const DATA = { orders:[], finance:[], hrRoster:[], hrEvents:[], inventory:[], designLog:[], customers:[] };
let METRICS = {};
let DATA_SOURCE = 'bundled';
let ordersPage = 1, ordersFiltered = [];
const ORDERS_PER_PAGE = 15;
let uploadedFiles = [];
const LS_KEY = 'mfc_analytics_data_v1';

/* ── Chart defaults ── */
Chart.defaults.color = '#8b9ec7';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13,22,41,0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(59,130,246,0.3)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleColor = '#f0f4ff';
Chart.defaults.plugins.tooltip.bodyColor = '#8b9ec7';

const COLORS = { blue:'#3b82f6', cyan:'#06b6d4', green:'#10b981', amber:'#f59e0b', purple:'#8b5cf6', red:'#ef4444', pink:'#ec4899', teal:'#14b8a6', orange:'#f97316', lime:'#84cc16' };
const PALETTE = Object.values(COLORS);
function hexAlpha(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}

const CHARTS={};
function createChart(id,cfg){
  if(CHARTS[id])CHARTS[id].destroy();
  const c=document.getElementById(id);
  if(!c)return null;
  CHARTS[id]=new Chart(c.getContext('2d'),cfg);
  return CHARTS[id];
}

/* ═══════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  autoLoadBundledData();
  initWelcomeScreen();
});

async function autoLoadBundledData(){
  const loadingEl=document.getElementById('loading-screen');
  const welcomeEl=document.getElementById('welcome-screen');
  const lbl=document.getElementById('loading-files');
  welcomeEl.style.display='none';
  loadingEl.style.display='flex';

  const files=[
    {key:'orders',    path:'data/orders_data.csv',      label:'orders_data.csv'},
    {key:'finance',   path:'data/financial_ledger.csv', label:'financial_ledger.csv'},
    {key:'hrRoster',  path:'data/hr_roster.csv',        label:'hr_roster.csv'},
    {key:'hrEvents',  path:'data/hr_events_log.csv',    label:'hr_events_log.csv'},
    {key:'inventory', path:'data/inventory_log.csv',    label:'inventory_log.csv'},
    {key:'designLog', path:'data/design_log.csv',       label:'design_log.csv'},
    {key:'customers', path:'data/customers_data.csv',   label:'customers_data.csv'},
  ];
  for(let i=0;i<files.length;i++){
    const f=files[i];
    if(lbl) lbl.textContent=`Loading ${f.label}… (${i+1}/${files.length})`;
    try{ DATA[f.key]=await fetchCSV(f.path); }
    catch(e){ console.warn('Could not load',f.path,e); DATA[f.key]=[]; }
  }
  if(lbl) lbl.textContent='Computing analytics…';
  DATA_SOURCE='bundled';
  computeMetrics();
  saveToLocalStorage();
  loadingEl.style.display='none';
  launchDashboard('MFC Dataset');
}

/* ── fetchCSV ── */
function fetchCSV(path){
  return new Promise(res=>Papa.parse(path,{download:true,header:true,dynamicTyping:true,skipEmptyLines:true,complete:r=>res(r.data)}));
}
function parseCSVContent(content){
  return Papa.parse(content,{header:true,dynamicTyping:true,skipEmptyLines:true}).data;
}

/* ── localStorage ── */
function saveToLocalStorage(){
  try{
    localStorage.setItem(LS_KEY,JSON.stringify(DATA));
    const ts=new Date().toLocaleString('en-AU',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});
    localStorage.setItem(LS_KEY+'_ts',ts);
  }catch(e){}
}

/* ═══════════════════════════════════════════════════
   WELCOME SCREEN (secondary)
═══════════════════════════════════════════════════ */
function initWelcomeScreen(){
  checkHistoricData();
  bindDropZone();
  document.getElementById('btn-load-historic').addEventListener('click',loadHistoric);
  document.getElementById('btn-upload-csv').addEventListener('click',triggerUpload);
  document.getElementById('btn-use-bundled').addEventListener('click',useBundledData);
  document.getElementById('btn-proceed-dashboard').addEventListener('click',proceedToDashboard);
  document.getElementById('btn-change-data').addEventListener('click',showWelcome);
  document.getElementById('sidebar-toggle').addEventListener('click',toggleSidebar);
}

function checkHistoricData(){
  const st=document.getElementById('historic-status'),btn=document.getElementById('btn-load-historic');
  if(!st||!btn)return;
  try{
    const saved=localStorage.getItem(LS_KEY);
    if(saved){
      const p=JSON.parse(saved);
      const rows=Object.values(p).reduce((s,v)=>s+(Array.isArray(v)?v.length:0),0);
      const ts=localStorage.getItem(LS_KEY+'_ts')||'unknown';
      st.className='historic-status found'; st.textContent=`✓ ${rows.toLocaleString()} records · saved ${ts}`;
    } else {
      st.className='historic-status empty'; st.textContent='No historic data in local storage';
      btn.disabled=true;
    }
  }catch(e){ st.className='historic-status empty'; st.textContent='Storage unavailable'; btn.disabled=true; }
}

function loadHistoric(){
  try{
    const saved=localStorage.getItem(LS_KEY);
    if(!saved)return;
    Object.assign(DATA,JSON.parse(saved));
    DATA_SOURCE='historic';
    computeMetrics();
    launchDashboard('Historic Store');
  }catch(e){alert('Failed to load historic data: '+e.message);}
}

function bindDropZone(){
  const zone=document.getElementById('drop-zone');
  const input=document.getElementById('csv-file-input');
  if(!zone||!input)return;
  zone.addEventListener('click',()=>input.click());
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');handleFiles([...e.dataTransfer.files].filter(f=>f.name.endsWith('.csv')));});
  input.addEventListener('change',e=>{handleFiles([...e.target.files]);e.target.value='';});
}

const CSV_SCHEMA_MAP={
  orders:{keys:['orders','order_data'],headers:['productType','quotePrice','status']},
  finance:{keys:['finance','financial','ledger'],headers:['amount','type','description']},
  hrRoster:{keys:['roster','hr_roster','staff'],headers:['employeeId','role','skillLevel']},
  hrEvents:{keys:['hr_events','events','leave'],headers:['event','employeeId']},
  inventory:{keys:['inventory','stock'],headers:['material','newLevel']},
  designLog:{keys:['design','design_log'],headers:['designerId']},
  customers:{keys:['customer'],headers:['customerId']},
};
function classifyCSV(filename,content){
  const l=filename.toLowerCase().replace('.csv',''),h=(content.split('\n')[0]||'').toLowerCase();
  for(const[key,s]of Object.entries(CSV_SCHEMA_MAP)){
    if(s.keys.some(k=>l.includes(k)))return key;
    if(s.headers.some(hh=>h.includes(hh.toLowerCase())))return key;
  }
  return'unknown';
}
function classifyLabel(k){return{orders:'orders',finance:'finance',hrRoster:'hr',hrEvents:'hr',inventory:'inventory',designLog:'design',customers:'orders',unknown:'unknown'}[k]||'unknown';}
function classifyDisplay(k){return{orders:'Orders',finance:'Finance',hrRoster:'HR Roster',hrEvents:'HR Events',inventory:'Inventory',designLog:'Design Log',customers:'Customers',unknown:'?'}[k]||'?';}

function handleFiles(files){
  files.forEach(f=>{
    if(uploadedFiles.some(u=>u.name===f.name)||uploadedFiles.length>=7)return;
    const reader=new FileReader();
    reader.onload=e=>{
      const content=e.target.result,key=classifyCSV(f.name,content);
      uploadedFiles.push({name:f.name,content,key,size:f.size});
      renderUploadedFilesList();
      document.getElementById('btn-upload-csv').disabled=uploadedFiles.length===0;
    };
    reader.readAsText(f);
  });
}
function renderUploadedFilesList(){
  const el=document.getElementById('uploaded-files');
  if(!el)return;
  el.innerHTML=uploadedFiles.map((f,i)=>`<div class="uploaded-file-item"><span class="ufi-icon">📄</span><span class="ufi-name">${f.name}</span><span class="ufi-size">${(f.size/1024).toFixed(1)}KB</span><span class="ufi-type ${classifyLabel(f.key)}">${classifyDisplay(f.key)}</span><button class="ufi-remove" onclick="removeFile(${i})">✕</button></div>`).join('');
  document.getElementById('btn-upload-csv').disabled=uploadedFiles.length===0;
}
window.removeFile=i=>{uploadedFiles.splice(i,1);renderUploadedFilesList();};

function triggerUpload(){if(uploadedFiles.length>0)runDataEngineerAgent(uploadedFiles);}
async function useBundledData(){
  document.getElementById('btn-use-bundled').textContent='⏳ Loading…';
  document.getElementById('btn-use-bundled').disabled=true;
  const fakeFiles=['orders_data','financial_ledger','hr_roster','hr_events_log','inventory_log','design_log','customers_data']
    .map(n=>({name:n+'.csv',bundledPath:'data/'+n+'.csv',key:classifyCSV(n+'.csv',''),bundled:true,size:0}));
  runDataEngineerAgent(fakeFiles,true);
}

async function runDataEngineerAgent(files,isBundled=false){
  const panel=document.getElementById('dea-panel'),log=document.getElementById('dea-log'),badge=document.getElementById('dea-status-badge'),actions=document.getElementById('dea-actions');
  panel.style.display='block';panel.scrollIntoView({behavior:'smooth',block:'start'});
  log.innerHTML='';badge.className='dea-status-badge';badge.textContent='Processing…';actions.style.display='none';
  const now=()=>new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const deaLog=(icon,html,delay=0)=>new Promise(res=>setTimeout(()=>{
    const d=document.createElement('div');d.className='dea-log-line';
    d.innerHTML=`<span class="dea-log-time">${now()}</span><span>${icon}</span><span class="dea-log-text">${html}</span>`;
    log.appendChild(d);log.scrollTop=log.scrollHeight;res();
  },delay));
  await deaLog('🔍',`Scanning <span class="hl">${files.length} file(s)</span>…`,200);
  const parsed={};
  for(let i=0;i<files.length;i++){
    const f=files[i],delay=400+i*300;
    await deaLog('📄',`Classifying <span class="hl">${f.name}</span> → <span class="ok">${classifyDisplay(f.key)}</span>`,delay);
    const data=isBundled||f.bundled?await fetchCSV(f.bundledPath||f.name):parseCSVContent(f.content);
    if(f.key!=='unknown'){parsed[f.key]=data;await deaLog('✅',`<span class="ok">${data.length.toLocaleString()} rows</span> loaded`,delay+100);}
    else{await deaLog('⚠️',`<span class="warn">Unknown schema for ${f.name} — skipping</span>`,delay+100);}
  }
  Object.assign(DATA,parsed);
  const total=Object.values(parsed).reduce((s,v)=>s+(Array.isArray(v)?v.length:0),0);
  await deaLog('🧹','Applying cleaning rules…',files.length*350+600);
  await deaLog('💾','Saving to local memory store…',files.length*350+900);
  DATA_SOURCE=isBundled?'bundled':'uploaded';
  computeMetrics();saveToLocalStorage();
  await deaLog('🚀',`<span class="ok">Complete — ${total.toLocaleString()} rows ready!</span>`,files.length*350+1200);
  badge.className='dea-status-badge done';badge.textContent='✓ Complete';
  actions.style.display='flex';
}

function proceedToDashboard(){launchDashboard(DATA_SOURCE==='bundled'?'Sample Data':DATA_SOURCE==='historic'?'Historic Store':'Uploaded CSVs');}

/* ═══════════════════════════════════════════════════
   LAUNCH / SHOW WELCOME
═══════════════════════════════════════════════════ */
const renderedPages=new Set();
let currentPage='overview';

function launchDashboard(sourceLabel){
  document.getElementById('welcome-screen').style.display='none';
  document.getElementById('sidebar').style.display='flex';
  document.getElementById('main-wrapper').style.display='flex';
  document.getElementById('furnico-fab').style.display='flex';
  const chip=document.getElementById('source-label');if(chip)chip.textContent=sourceLabel;
  const info=document.getElementById('sidebar-data-info');if(info)info.textContent=sourceLabel;
  checkHistoricData();
  bindNavEvents();
  navigateTo('overview');
  renderedPages.add('overview');
  initFurnicoFAB();
  initAIPage();
  populateAISourceList();
}

function showWelcome(){
  document.getElementById('welcome-screen').style.display='flex';
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main-wrapper').style.display='none';
  document.getElementById('furnico-fab').style.display='none';
  document.getElementById('furnico-chat-panel').classList.remove('open');
  checkHistoricData();
}

/* ═══════════════════════════════════════════════════
   METRICS
═══════════════════════════════════════════════════ */
function computeMetrics(){
  const orders=DATA.orders||[],finance=DATA.finance||[],roster=DATA.hrRoster||[],events=DATA.hrEvents||[],inv=DATA.inventory||[];
  const delivered=orders.filter(o=>o.status==='DELIVERED');
  const lost=orders.filter(o=>o.status==='LOST');
  const winRate=orders.length>0?delivered.length/orders.length*100:0;
  const onTime=delivered.filter(o=>o.deliveryStatus==='On Time');
  const lateOrds=delivered.filter(o=>o.deliveryStatus!=='On Time');
  const onTimePct=delivered.length>0?onTime.length/delivered.length*100:0;
  const avgQuote=orders.length>0?orders.reduce((s,o)=>s+(o.quotePrice||0),0)/orders.length:0;
  const productTypes=[...new Set(orders.map(o=>o.productType).filter(Boolean))].sort();
  const byProduct={};
  productTypes.forEach(pt=>{
    const g=orders.filter(o=>o.productType===pt),gd=g.filter(o=>o.status==='DELIVERED');
    byProduct[pt]={
      total:g.length,delivered:gd.length,lost:g.filter(o=>o.status==='LOST').length,
      winRate:g.length>0?gd.length/g.length*100:0,
      avgQuote:g.reduce((s,o)=>s+(o.quotePrice||0),0)/Math.max(g.length,1),
      revenue:gd.reduce((s,o)=>s+(o.quotePrice||0),0),
      avgDesignH:g.reduce((s,o)=>s+(o.designHours||0),0)/Math.max(g.length,1),
      avgMillingH:g.reduce((s,o)=>s+(o.millingHours||0),0)/Math.max(g.length,1),
      avgJoinH:g.reduce((s,o)=>s+(o.joineryHours||0),0)/Math.max(g.length,1),
      avgFinH:g.reduce((s,o)=>s+(o.finishingHours||0),0)/Math.max(g.length,1),
      avgTotalH:g.reduce((s,o)=>s+(o.designHours||0)+(o.millingHours||0)+(o.joineryHours||0)+(o.finishingHours||0),0)/Math.max(g.length,1),
    };
  });
  const materials=[...new Set(orders.map(o=>o.materialType).filter(Boolean))];
  const byMaterial={};
  materials.forEach(m=>{byMaterial[m]=orders.filter(o=>o.materialType===m).length;});
  const totalRev=finance.filter(f=>f.type==='REVENUE').reduce((s,f)=>s+(f.amount||0),0);
  const totalCost=finance.filter(f=>f.type==='COST').reduce((s,f)=>s+(f.amount||0),0);
  const netProfit=totalRev-totalCost;
  
  // Track days per month to exclude incomplete boundary months (e.g. trailing single day in 2027)
  const monthlyFinance={};
  const monthDays={};
  finance.forEach(f=>{
    if(!f.date)return;const mon=String(f.date).slice(0,7);
    if(!monthlyFinance[mon]){monthlyFinance[mon]={rev:0,cost:0};monthDays[mon]=new Set();}
    if(f.type==='REVENUE')monthlyFinance[mon].rev+=(f.amount||0);
    if(f.type==='COST')monthlyFinance[mon].cost+=(f.amount||0);
    monthDays[mon].add(f.date);
  });
  // Only include full operational months (at least 10 logged days) in monthly aggregates
  const validMonths=new Set(Object.keys(monthDays).filter(mon=>monthDays[mon].size>=10));
  for(const mon in monthlyFinance){
    if(!validMonths.has(mon)) delete monthlyFinance[mon];
  }

  const monthlyOrders={};
  orders.forEach(o=>{
    if(!o.creationDate)return;const mon=String(o.creationDate).slice(0,7);
    if(validMonths.has(mon)){
      monthlyOrders[mon]=(monthlyOrders[mon]||0)+1;
    }
  });
  const wagesTotal=finance.filter(f=>f.type==='COST'&&(f.description||'').includes('Wage')).reduce((s,f)=>s+(f.amount||0),0);
  const overheadsTotal=finance.filter(f=>f.type==='COST'&&(f.description||'').includes('Overhead')).reduce((s,f)=>s+(f.amount||0),0);
  const materialCostTotal=finance.filter(f=>f.type==='COST'&&f.description&&(f.description.includes('Reorder')||f.description.includes('m³'))).reduce((s,f)=>s+(f.amount||0),0);
  const uniqueDays=[...new Set(finance.map(f=>f.date))].length;

  const active=roster.filter(r=>r.status==='Active'),resigned=roster.filter(r=>r.status==='Resigned');
  const monthlyLeave={};
  events.filter(e=>e.event==='Leave Start').forEach(e=>{
    if(!e.date)return;const mon=String(e.date).slice(0,7);monthlyLeave[mon]=(monthlyLeave[mon]||0)+1;
  });

  const materialsList=[...new Set(inv.map(i=>i.material).filter(Boolean))];
  const invByMaterial={};
  materialsList.forEach(m=>{
    const entries=inv.filter(i=>i.material===m);
    const last=entries[entries.length-1];
    invByMaterial[m]={
      currentLevel:last?last.newLevel:0,
      totalReorders:entries.filter(i=>i.type==='REORDER').length,
      totalConsumed:entries.filter(i=>i.type==='CONSUME').reduce((s,i)=>s+(i.quantity||0),0),
    };
  });
  const monthlyConsumption={};
  inv.filter(i=>i.type==='CONSUME').forEach(i=>{
    if(!i.date)return;const mon=String(i.date).slice(0,7);
    if(!monthlyConsumption[mon])monthlyConsumption[mon]={};
    monthlyConsumption[mon][i.material]=(monthlyConsumption[mon][i.material]||0)+(i.quantity||0);
  });

  // Monthly win rates (using full operational months)
  const monthlyWinRate={};
  const months=[...validMonths].sort();
  months.forEach(mon=>{
    const g=orders.filter(o=>o.creationDate&&String(o.creationDate).slice(0,7)===mon);
    const gd=g.filter(o=>o.status==='DELIVERED');
    monthlyWinRate[mon]=g.length>0?gd.length/g.length*100:0;
  });

  METRICS={
    totalOrders:orders.length,delivered:delivered.length,lost:lost.length,
    winRate,onTimePct,onTimeCount:onTime.length,lateCount:lateOrds.length,avgQuote,
    productTypes,byProduct,byMaterial,monthlyOrders,
    avgDesignH:orders.reduce((s,o)=>s+(o.designHours||0),0)/Math.max(orders.length,1),
    avgMillingH:orders.reduce((s,o)=>s+(o.millingHours||0),0)/Math.max(orders.length,1),
    avgJoinH:orders.reduce((s,o)=>s+(o.joineryHours||0),0)/Math.max(orders.length,1),
    avgFinH:orders.reduce((s,o)=>s+(o.finishingHours||0),0)/Math.max(orders.length,1),
    avgTotalH:orders.reduce((s,o)=>s+(o.designHours||0)+(o.millingHours||0)+(o.joineryHours||0)+(o.finishingHours||0),0)/Math.max(orders.length,1),
    lateOrds,
    totalRev,totalCost,netProfit,profitMargin:totalRev>0?netProfit/totalRev*100:0,
    wagesTotal,overheadsTotal,materialCostTotal,otherCosts:Math.max(0,totalCost-wagesTotal-overheadsTotal-materialCostTotal),
    monthlyFinance,avgDailyCost:uniqueDays>0?totalCost/uniqueDays:0,
    activeStaff:active.length,resignedStaff:resigned.length,totalStaff:roster.length,
    designerCount:roster.filter(r=>r.role==='designer').length,
    makerCount:roster.filter(r=>r.role==='maker').length,
    weeklyWage:active.reduce((s,r)=>s+(r.wage||0)*5,0),monthlyLeave,
    materialsList,invByMaterial,monthlyConsumption,
    totalReorderEvents:inv.filter(i=>i.type==='REORDER').length,
    totalConsumedUnits:inv.filter(i=>i.type==='CONSUME').reduce((s,i)=>s+(i.quantity||0),0),
    monthlyWinRate,months,
  };
}

/* ═══════════════════════════════════════════════════
   FORMATTERS
═══════════════════════════════════════════════════ */
function fmt$(n){return'$'+Math.round(n||0).toLocaleString('en-AU');}
function fmtK(n){if(n==null)return'—';if(Math.abs(n)>=1e6)return'$'+(n/1e6).toFixed(1)+'M';if(Math.abs(n)>=1000)return'$'+(n/1000).toFixed(1)+'K';return'$'+Math.round(n);}
function fmtPct(n){return(n||0).toFixed(1)+'%';}
function fmtNum(n){return(n||0).toLocaleString('en-AU',{maximumFractionDigits:1});}
function monLabel(mo){const[y,d]=mo.split('-');return new Date(+y,+d-1,1).toLocaleString('en-AU',{month:'short',year:'2-digit'});}
function animateCounter(el,target,pre='',suf='',dec=0){
  if(!el)return;const dur=1200,s=performance.now();
  function step(n){const p=Math.min((n-s)/dur,1),e=1-Math.pow(1-p,3);el.textContent=pre+(target*e).toFixed(dec)+suf;if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
function chartGradient(ctx,color,at=0.35,ab=0.01){const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,hexAlpha(color,at));g.addColorStop(1,hexAlpha(color,ab));return g;}

/* Chart option builders */
function lineOpts(unit){return{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8b9ec7',font:{size:10},maxRotation:45}},y:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#8b9ec7',font:{size:10},callback:v=>unit==='$'?fmtK(v):fmtNum(v)+(unit&&unit!=='$'?' '+unit:'')}}},plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}},tooltip:{callbacks:{label:c=>{const v=c.parsed.y;return unit==='$'?` ${c.dataset.label}: ${fmtK(v)}`:`  ${c.dataset.label}: ${fmtNum(v)}${unit&&unit!=='$'?' '+unit:''}`;}}}}};}
function barOpts(unit,stacked=false){return{responsive:true,maintainAspectRatio:false,scales:{x:{stacked,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8b9ec7',font:{size:10},maxRotation:30}},y:{stacked,grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#8b9ec7',font:{size:10},callback:v=>unit==='$'?fmtK(v):fmtNum(v)}}},plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}},tooltip:{callbacks:{label:c=>{const v=c.parsed.y;return unit==='$'?` ${c.dataset.label}: ${fmtK(v)}`:`  ${c.dataset.label}: ${fmtNum(v)}`;}}}}};}
function donutOpts(){return{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:14}},tooltip:{callbacks:{label:c=>{const t=c.dataset.data.reduce((a,b)=>a+b,0);return ` ${c.label}: ${c.parsed.toLocaleString()} (${(c.parsed/t*100).toFixed(1)}%)`;}}}}};}

/* ═══════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════ */
const PAGE_CONFIG={
  overview:{title:'Executive Snapshot',sub:'Past · FY 2025 · All Divisions',render:renderOverview},
  orders:{title:'Orders & Sales',sub:'Past · Pipeline & Product Analysis',render:renderOrders},
  finance:{title:'Financial P&L',sub:'Past · Revenue · Costs · Profitability',render:renderFinance},
  hr:{title:'Human Resources',sub:'Past · Staff · Skills · Leave Events',render:renderHR},
  inventory:{title:'Inventory History',sub:'Past · Stock · Consumption · Reorders',render:renderInventory},
  operations:{title:'Operations Board',sub:'Present · Workshop · Product · Order Drill-Down',render:renderOperations},
  forecasts:{title:'Forecasts & Risk',sub:'Future · Revenue Trend · Delivery Risk · Capacity',render:renderForecasts},
  correlation:{title:'Correlation Drivers',sub:'Future · Ranked Factors Driving Win Rate & Revenue',render:renderCorrelation},
  'ask-ai':{title:'Ask AI — FurBuddy',sub:'Intelligence · Generative Gemini & Evidence-Based Answers',render:renderAIPage},
  'data-profile':{title:'Data Profile & Quality',sub:'Intelligence · Schema · Null Rates · Stats',render:renderDataProfile},
};

function navigateTo(page){
  if(!PAGE_CONFIG[page])return;
  // Reset breadcrumbs and drill-down panels when switching modules
  hideBreadcrumb();
  if(drillState && drillState.page && drillState.page !== page){
    const oldPanel = document.getElementById(`drill-panel-${drillState.page}`);
    if(oldPanel) oldPanel.style.display = 'none';
    drillState = {page: null, level: 0, filter: null};
  }
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const ne=document.getElementById('nav-'+page);if(ne)ne.classList.add('active');
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  const pe=document.getElementById('page-'+page);if(pe)pe.classList.add('active');
  document.getElementById('topbar-title').textContent=PAGE_CONFIG[page].title;
  document.getElementById('topbar-subtitle').textContent=PAGE_CONFIG[page].sub;
  currentPage=page;
  // Show FAB only on non-AI pages
  document.getElementById('furnico-fab').style.display=page==='ask-ai'?'none':'flex';
  if(!renderedPages.has(page)||page==='orders'||page==='data-profile'||page==='operations'){
    PAGE_CONFIG[page].render();
    if(page!=='orders'&&page!=='operations')renderedPages.add(page);
  }
}

function bindNavEvents(){
  document.querySelectorAll('.nav-item[data-page]').forEach(el=>el.addEventListener('click',()=>navigateTo(el.dataset.page)));
  document.getElementById('orders-search')?.addEventListener('input',()=>{ordersPage=1;renderOrdersTable();});
  document.getElementById('orders-status-filter')?.addEventListener('change',()=>{ordersPage=1;renderOrdersTable();});
  document.getElementById('orders-product-filter')?.addEventListener('change',()=>{ordersPage=1;renderOrdersTable();});
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('main-wrapper').classList.toggle('collapsed');
}

/* ═══════════════════════════════════════════════════
   DRILL-DOWN SYSTEM
═══════════════════════════════════════════════════ */
let drillState={page:null,level:0,filter:null};

function drillIntoProduct(page, productType){
  drillState={page,level:1,filter:{type:'product',value:productType}};
  updateBreadcrumb([{label:'All Products',back:()=>drillBack(page)},{label:productType}]);
  const m=METRICS,pt=productType,pdata=m.byProduct[pt];
  const orders=DATA.orders.filter(o=>o.productType===pt);
  const panel=document.getElementById(`drill-panel-${page}`);
  const title=document.getElementById(`drill-${page==='overview'?'panel':page}-title`);
  const body=document.getElementById(`drill-${page==='overview'?'panel':page}-body`);
  if(!panel)return;
  panel.style.display='block';panel.scrollIntoView({behavior:'smooth',block:'start'});
  if(title)title.textContent=`📦 ${pt} — Deep Dive`;

  const canvasId=`drill-chart-${page}`;
  if(body) body.innerHTML=`
    <div class="drill-kpi-row">
      <div class="drill-kpi"><strong>${pdata.total}</strong><span>Total Orders</span></div>
      <div class="drill-kpi green"><strong>${pdata.delivered}</strong><span>Delivered</span></div>
      <div class="drill-kpi red"><strong>${pdata.lost}</strong><span>Lost</span></div>
      <div class="drill-kpi amber"><strong>${fmtPct(pdata.winRate)}</strong><span>Win Rate</span></div>
      <div class="drill-kpi blue"><strong>${fmt$(pdata.avgQuote)}</strong><span>Avg Quote</span></div>
      <div class="drill-kpi purple"><strong>${fmtNum(pdata.avgTotalH)}h</strong><span>Avg Hours</span></div>
    </div>
    <div class="charts-grid cols-2" style="margin-top:16px;margin-bottom:16px">
      <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Stage Hours Breakdown</div></div><div class="chart-container h-220"><canvas id="${canvasId}-stages"></canvas></div></div>
      <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Monthly Orders — ${pt}</div></div><div class="chart-container h-220"><canvas id="${canvasId}-monthly"></canvas></div></div>
    </div>
    <div class="drill-order-list">
      <div class="table-title" style="margin-bottom:10px">📋 All ${pt} Orders — click a row to see full detail</div>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Status</th><th>Material</th><th>Quote</th><th>Delivery</th><th>Created</th></tr></thead>
      <tbody>${orders.map(o=>`<tr class="clickable-row" onclick="openOrderModal(${JSON.stringify(o).replace(/"/g,'&quot;')})"><td>#${o.id}</td><td><span class="badge ${o.status==='DELIVERED'?'delivered':'lost'}">${o.status}</span></td><td>${o.materialType||'—'}</td><td>${o.quotePrice?fmt$(o.quotePrice):'—'}</td><td>${o.deliveryStatus?`<span class="badge ${o.deliveryStatus==='On Time'?'on-time':'late'}">${o.deliveryStatus}</span>`:'—'}</td><td>${o.creationDate||'—'}</td></tr>`).join('')}</tbody></table></div>
    </div>`;

  setTimeout(()=>{
    createChart(`${canvasId}-stages`,{type:'bar',data:{labels:['Design','Milling','Joinery','Finishing'],datasets:[{label:'Avg Hours',data:[pdata.avgDesignH,pdata.avgMillingH,pdata.avgJoinH,pdata.avgFinH],backgroundColor:[hexAlpha(COLORS.blue,0.75),hexAlpha(COLORS.cyan,0.75),hexAlpha(COLORS.purple,0.75),hexAlpha(COLORS.amber,0.75)],borderRadius:6,borderSkipped:false}]},options:barOpts('h')});
    const months=Object.keys(m.monthlyOrders).sort(),mLabels=months.map(monLabel);
    const monPt={};orders.forEach(o=>{if(!o.creationDate)return;const mon=String(o.creationDate).slice(0,7);monPt[mon]=(monPt[mon]||0)+1;});
    createChart(`${canvasId}-monthly`,{type:'bar',data:{labels:mLabels,datasets:[{label:pt,data:months.map(mo=>monPt[mo]||0),backgroundColor:hexAlpha(COLORS.blue,0.7),borderRadius:5,borderSkipped:false}]},options:barOpts('orders')});
  },100);
}

function drillBack(page){
  drillState={page:null,level:0,filter:null};
  hideBreadcrumb();
  const panel=document.getElementById(`drill-panel-${page}`);
  if(panel)panel.style.display='none';
}

function updateBreadcrumb(items){
  const bc=document.getElementById('drill-breadcrumb'),trail=document.getElementById('bc-trail');
  if(!bc||!trail)return;
  bc.style.display='flex';
  trail.innerHTML=items.map((item,i)=>{
    if(i<items.length-1) return`<span class="bc-item bc-link" onclick="(${item.back||'()=>{}'})()">${item.label}</span><span class="bc-sep">›</span>`;
    return`<span class="bc-item bc-active">${item.label}</span>`;
  }).join('');
}
function hideBreadcrumb(){const bc=document.getElementById('drill-breadcrumb');if(bc)bc.style.display='none';}

/* Order Modal */
window.openOrderModal=function(orderOrStr){
  const o=typeof orderOrStr==='string'?JSON.parse(orderOrStr):orderOrStr;
  const modal=document.getElementById('order-modal'),body=document.getElementById('modal-body');
  if(!modal||!body)return;
  const riskFlags=[];
  if(o.deliveryStatus&&o.deliveryStatus!=='On Time')riskFlags.push(`<span class="risk-badge red">⚠️ Late Delivery (+${o.lateDays||'?'}d)</span>`);
  if((o.complexity||0)>=4)riskFlags.push(`<span class="risk-badge amber">🔴 High Complexity</span>`);
  const totalH=(o.designHours||0)+(o.millingHours||0)+(o.joineryHours||0)+(o.finishingHours||0);
  body.innerHTML=`
    <div class="modal-section">
      <div class="modal-kpis">
        <div class="modal-kpi"><strong>#${o.id||'—'}</strong><span>Order ID</span></div>
        <div class="modal-kpi"><strong>${o.productType||'—'}</strong><span>Product</span></div>
        <div class="modal-kpi"><strong>${o.status||'—'}</strong><span>Status</span></div>
        <div class="modal-kpi"><strong>${o.quotePrice?fmt$(o.quotePrice):'—'}</strong><span>Quote Price</span></div>
      </div>
    </div>
    ${riskFlags.length?`<div class="modal-section"><div class="modal-label">Risk Flags</div>${riskFlags.join(' ')}</div>`:''}
    <div class="modal-section">
      <div class="modal-label">Production Stages</div>
      <div class="stage-timeline">
        ${[['✏️ Design',o.designHours,'blue'],['⚙️ Milling',o.millingHours,'cyan'],['🔧 Joinery',o.joineryHours,'purple'],['🎨 Finishing',o.finishingHours,'amber']].map(([l,h,c])=>`<div class="stage-step ${c}"><div class="stage-icon">${l}</div><div class="stage-hours">${h||0}h</div></div>`).join('')}
        <div class="stage-step green"><div class="stage-icon">📦 Total</div><div class="stage-hours">${fmtNum(totalH)}h</div></div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-grid-2">
        <div><div class="modal-label">Material</div><div class="modal-val">${o.materialType||'—'}</div></div>
        <div><div class="modal-label">Complexity</div><div class="modal-val">${o.complexity||'—'}/5</div></div>
        <div><div class="modal-label">Delivery Status</div><div class="modal-val">${o.deliveryStatus||'—'}</div></div>
        <div><div class="modal-label">Late Days</div><div class="modal-val">${o.lateDays||'0'} days</div></div>
        <div><div class="modal-label">Created</div><div class="modal-val">${o.creationDate||'—'}</div></div>
        <div><div class="modal-label">Customer ID</div><div class="modal-val">${o.customerId||'—'}</div></div>
      </div>
    </div>`;
  modal.style.display='flex';
};
window.closeOrderModal=function(e){
  if(!e||e.target===document.getElementById('order-modal'))document.getElementById('order-modal').style.display='none';
};

/* ═══════════════════════════════════════════════════
   RENDER: OVERVIEW (Past)
═══════════════════════════════════════════════════ */
function renderOverview(){
  const m=METRICS;
  animateCounter(document.getElementById('kpi-revenue'),m.totalRev/1000,'$','K',1);
  document.getElementById('kpi-orders').textContent=m.totalOrders.toLocaleString();
  animateCounter(document.getElementById('kpi-winrate'),m.winRate,'','%',1);
  animateCounter(document.getElementById('kpi-ontime'),m.onTimePct,'','%',1);
  const pe=document.getElementById('kpi-profit');
  if(pe){pe.textContent=fmtK(m.netProfit);pe.style.color=m.netProfit>=0?'var(--accent4)':'var(--accent-red)';}
  const ch=document.getElementById('kpi-profit-ch');
  if(ch){ch.className='kpi-change '+(m.netProfit>=0?'up':'down');ch.textContent=m.netProfit>=0?'↑ Profitable':'↓ Net Loss';}
  document.getElementById('kpi-staff').textContent=m.activeStaff+'/'+m.totalStaff;

  const months=Object.keys(m.monthlyFinance).sort(),mLabels=months.map(monLabel);
  createChart('chart-rev-cost',{type:'line',data:{labels:mLabels,datasets:[
    {label:'Revenue',data:months.map(mo=>m.monthlyFinance[mo].rev),borderColor:COLORS.cyan,backgroundColor:ctx=>chartGradient(ctx.chart.ctx,COLORS.cyan,0.25,0.01),borderWidth:2,tension:0.4,fill:true,pointRadius:3},
    {label:'Costs',data:months.map(mo=>m.monthlyFinance[mo].cost),borderColor:COLORS.red,backgroundColor:ctx=>chartGradient(ctx.chart.ctx,COLORS.red,0.2,0.01),borderWidth:2,tension:0.4,fill:true,pointRadius:3}
  ]},options:lineOpts('$')});

  // Clickable doughnut
  const statusChart=createChart('chart-order-status',{type:'doughnut',data:{labels:['Delivered','Lost'],datasets:[{data:[m.delivered,m.lost],backgroundColor:[hexAlpha(COLORS.green,0.8),hexAlpha(COLORS.red,0.8)],borderColor:'#060b18',borderWidth:3,hoverOffset:8}]},options:{...donutOpts(),onClick:(e,els)=>{if(!els.length)return;navigateTo('orders');}}});

  // Clickable bar — drills into product
  const pts=m.productTypes;
  const prodChart=createChart('chart-product-vol',{type:'bar',data:{labels:pts,datasets:[{label:'Total Inquiries',data:pts.map(pt=>m.byProduct[pt].total),backgroundColor:pts.map((_,i)=>hexAlpha(PALETTE[i%PALETTE.length],0.75)),borderRadius:6,borderSkipped:false}]},options:{...barOpts('orders'),onClick:(e,els)=>{if(!els.length)return;const pt=pts[els[0].index];drillIntoProduct('overview',pt);}}});

  let cum=0;
  createChart('chart-pnl',{type:'line',data:{labels:mLabels,datasets:[{label:'Cumulative P&L',data:months.map(mo=>{cum+=m.monthlyFinance[mo].rev-m.monthlyFinance[mo].cost;return cum;}),borderColor:COLORS.purple,backgroundColor:ctx=>chartGradient(ctx.chart.ctx,COLORS.purple,0.3,0.02),borderWidth:2,tension:0.4,fill:true,pointRadius:3}]},options:lineOpts('$')});
}

/* ═══════════════════════════════════════════════════
   RENDER: ORDERS (Past)
═══════════════════════════════════════════════════ */
function renderOrders(){
  const m=METRICS;
  document.getElementById('ord-total').textContent=m.totalOrders;
  document.getElementById('ord-delivered').textContent=m.delivered;
  document.getElementById('ord-lost').textContent=m.lost;
  animateCounter(document.getElementById('ord-avg-price'),m.avgQuote/1000,'$','K',1);
  animateCounter(document.getElementById('ord-winrate'),m.winRate,'','%',1);

  const monOrds=m.monthlyOrders,months=Object.keys(monOrds).sort();
  createChart('chart-monthly-orders',{type:'bar',data:{labels:months.map(monLabel),datasets:[{label:'Orders',data:months.map(mo=>monOrds[mo]),backgroundColor:hexAlpha(COLORS.blue,0.7),borderRadius:5,borderSkipped:false}]},options:{...barOpts('orders'),onClick:(e,els)=>{if(!els.length)return;const mon=months[els[0].index];drillByMonth(mon);}}});

  const pts=m.productTypes;
  createChart('chart-quote-product',{type:'bar',data:{labels:pts,datasets:[{label:'Avg Quote ($)',data:pts.map(pt=>m.byProduct[pt].avgQuote),backgroundColor:pts.map((_,i)=>hexAlpha(PALETTE[i%PALETTE.length],0.7)),borderRadius:5,borderSkipped:false}]},options:{...barOpts('$'),onClick:(e,els)=>{if(!els.length)return;drillIntoProduct('orders',pts[els[0].index]);}}});
  createChart('chart-winrate-product',{type:'bar',data:{labels:pts,datasets:[{label:'Win Rate (%)',data:pts.map(pt=>+m.byProduct[pt].winRate.toFixed(1)),backgroundColor:pts.map(pt=>hexAlpha(COLORS.green,0.3+m.byProduct[pt].winRate/200)),borderRadius:5,borderSkipped:false}]},options:barOpts('%')});
  const mats=Object.keys(m.byMaterial);
  createChart('chart-material-orders',{type:'doughnut',data:{labels:mats,datasets:[{data:mats.map(mt=>m.byMaterial[mt]),backgroundColor:[hexAlpha(COLORS.amber,0.8),hexAlpha(COLORS.cyan,0.8),hexAlpha(COLORS.purple,0.8)],borderColor:'#060b18',borderWidth:3,hoverOffset:8}]},options:donutOpts()});

  const pf=document.getElementById('orders-product-filter');
  if(pf&&pf.options.length===1)pts.forEach(pt=>{const o=document.createElement('option');o.value=pt;o.textContent=pt;pf.appendChild(o);});
  renderOrdersTable();
}

function drillByMonth(mon){
  const orders=DATA.orders.filter(o=>o.creationDate&&String(o.creationDate).slice(0,7)===mon);
  const panel=document.getElementById('drill-panel-orders'),title=document.getElementById('drill-orders-title'),body=document.getElementById('drill-orders-body');
  if(!panel)return;
  panel.style.display='block';panel.scrollIntoView({behavior:'smooth'});
  if(title)title.textContent=`📅 ${monLabel(mon)} — ${orders.length} orders`;
  if(body)body.innerHTML=`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Product</th><th>Status</th><th>Quote</th><th>Delivery</th></tr></thead><tbody>${orders.map(o=>`<tr class="clickable-row" onclick="openOrderModal(${JSON.stringify(o).replace(/"/g,'&quot;')})"><td>#${o.id}</td><td>${o.productType||'—'}</td><td><span class="badge ${o.status==='DELIVERED'?'delivered':'lost'}">${o.status}</span></td><td>${o.quotePrice?fmt$(o.quotePrice):'—'}</td><td>${o.deliveryStatus?`<span class="badge ${o.deliveryStatus==='On Time'?'on-time':'late'}">${o.deliveryStatus}</span>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
  updateBreadcrumb([{label:'All Months',back:()=>drillBack('orders')},{label:monLabel(mon)}]);
}

function renderOrdersTable(){
  const search=(document.getElementById('orders-search')?.value||'').toLowerCase();
  const status=document.getElementById('orders-status-filter')?.value||'';
  const product=document.getElementById('orders-product-filter')?.value||'';
  ordersFiltered=DATA.orders.filter(o=>{
    if(status&&o.status!==status)return false;
    if(product&&o.productType!==product)return false;
    if(search&&![String(o.id),o.productType,o.status,o.materialType,o.deliveryStatus].join(' ').toLowerCase().includes(search))return false;
    return true;
  });
  const totalPages=Math.ceil(ordersFiltered.length/ORDERS_PER_PAGE)||1;
  ordersPage=Math.min(ordersPage,totalPages);
  const slice=ordersFiltered.slice((ordersPage-1)*ORDERS_PER_PAGE,ordersPage*ORDERS_PER_PAGE);
  const tbody=document.getElementById('orders-table-body');
  if(!tbody)return;
  tbody.innerHTML=slice.map(o=>`<tr class="clickable-row" onclick="openOrderModal(${JSON.stringify(o).replace(/"/g,'&quot;')})"><td><strong style="color:#f0f4ff">#${o.id}</strong></td><td>${o.productType||'—'}</td><td><span class="badge ${o.status==='DELIVERED'?'delivered':o.status==='LOST'?'lost':'in-prog'}">${o.status||'—'}</span></td><td>${o.materialType||'—'}</td><td>${o.quotePrice?fmt$(o.quotePrice):'—'}</td><td>${o.complexity||'—'}</td><td>${o.deliveryStatus?`<span class="badge ${o.deliveryStatus==='On Time'?'on-time':'late'}">${o.deliveryStatus}</span>`:'—'}</td><td>${o.creationDate||'—'}</td><td><button class="row-detail-btn" onclick="event.stopPropagation();openOrderModal(${JSON.stringify(o).replace(/"/g,'&quot;')})">Detail →</button></td></tr>`).join('');
  document.getElementById('orders-page-info').textContent=`${ordersFiltered.length} records · Page ${ordersPage} of ${totalPages}`;
  const pag=document.getElementById('orders-pagination');
  if(!pag)return;
  let btns=`<button class="page-btn" onclick="changeOrdersPage(-1)" ${ordersPage===1?'disabled':''}>←</button>`;
  const s=Math.max(1,ordersPage-2),e=Math.min(totalPages,s+4);
  for(let p=s;p<=e;p++)btns+=`<button class="page-btn ${p===ordersPage?'active':''}" onclick="goOrdersPage(${p})">${p}</button>`;
  btns+=`<button class="page-btn" onclick="changeOrdersPage(1)" ${ordersPage===totalPages?'disabled':''}>→</button>`;
  pag.innerHTML=btns;
}
window.changeOrdersPage=p=>{ordersPage+=p;renderOrdersTable();};
window.goOrdersPage=p=>{ordersPage=p;renderOrdersTable();};

/* ═══════════════════════════════════════════════════
   RENDER: FINANCE (Past)
═══════════════════════════════════════════════════ */
function renderFinance(){
  const m=METRICS;
  animateCounter(document.getElementById('fin-revenue'),m.totalRev/1000,'$','K',1);
  animateCounter(document.getElementById('fin-costs'),m.totalCost/1000,'$','K',1);
  const pe=document.getElementById('fin-profit');if(pe){pe.textContent=fmtK(m.netProfit);pe.style.color=m.netProfit>=0?'var(--accent4)':'var(--accent-red)';}
  animateCounter(document.getElementById('fin-margin'),m.profitMargin,'','%',1);
  animateCounter(document.getElementById('fin-daily-cost'),m.avgDailyCost/1000,'$','K',1);
  const months=Object.keys(m.monthlyFinance).sort(),mLabels=months.map(monLabel);
  createChart('chart-fin-monthly',{type:'bar',data:{labels:mLabels,datasets:[{label:'Revenue',data:months.map(mo=>m.monthlyFinance[mo].rev),backgroundColor:hexAlpha(COLORS.cyan,0.75),borderRadius:4,borderSkipped:false},{label:'Costs',data:months.map(mo=>m.monthlyFinance[mo].cost),backgroundColor:hexAlpha(COLORS.red,0.65),borderRadius:4,borderSkipped:false}]},options:barOpts('$')});
  const cVals=[m.wagesTotal,m.overheadsTotal,m.materialCostTotal,m.otherCosts].filter(v=>v>0);
  const cLabs=['Wages','Overheads','Materials','Other'].filter((_,i)=>[m.wagesTotal,m.overheadsTotal,m.materialCostTotal,m.otherCosts][i]>0);
  createChart('chart-cost-breakdown',{type:'pie',data:{labels:cLabs,datasets:[{data:cVals,backgroundColor:[hexAlpha(COLORS.amber,0.8),hexAlpha(COLORS.purple,0.8),hexAlpha(COLORS.blue,0.8),hexAlpha(COLORS.green,0.8)],borderColor:'#060b18',borderWidth:3,hoverOffset:8}]},options:donutOpts()});
  const netM=months.map(mo=>m.monthlyFinance[mo].rev-m.monthlyFinance[mo].cost);
  createChart('chart-monthly-profit',{type:'bar',data:{labels:mLabels,datasets:[{label:'Net Profit/Loss',data:netM,backgroundColor:netM.map(v=>v>=0?hexAlpha(COLORS.green,0.7):hexAlpha(COLORS.red,0.7)),borderRadius:4,borderSkipped:false}]},options:barOpts('$')});
  let cum=0;
  createChart('chart-cumulative',{type:'line',data:{labels:mLabels,datasets:[{label:'Cumulative Position',data:months.map(mo=>{cum+=m.monthlyFinance[mo].rev-m.monthlyFinance[mo].cost;return cum;}),borderColor:COLORS.cyan,backgroundColor:ctx=>chartGradient(ctx.chart.ctx,COLORS.cyan,0.3,0.01),borderWidth:2,tension:0.4,fill:true,pointRadius:3}]},options:lineOpts('$')});
}

/* ═══════════════════════════════════════════════════
   RENDER: HR (Past)
═══════════════════════════════════════════════════ */
function renderHR(){
  const m=METRICS,roster=DATA.hrRoster;
  document.getElementById('hr-active').textContent=m.activeStaff;
  document.getElementById('hr-resigned').textContent=m.resignedStaff;
  document.getElementById('hr-designers').textContent=m.designerCount;
  document.getElementById('hr-makers').textContent=m.makerCount;
  document.getElementById('hr-leave').textContent=Object.values(m.monthlyLeave).reduce((a,b)=>a+b,0);
  createChart('chart-hr-status',{type:'doughnut',data:{labels:['Active','Resigned'],datasets:[{data:[m.activeStaff,m.resignedStaff],backgroundColor:[hexAlpha(COLORS.green,0.8),hexAlpha(COLORS.red,0.8)],borderColor:'#060b18',borderWidth:3,hoverOffset:8}]},options:donutOpts()});
  createChart('chart-hr-role-skill',{type:'bar',data:{labels:['Designers','Makers'],datasets:['high','low'].map((sk,i)=>({label:sk.charAt(0).toUpperCase()+sk.slice(1)+' Skill',data:['designer','maker'].map(r=>roster.filter(p=>p.role===r&&p.skillLevel===sk).length),backgroundColor:hexAlpha(i===0?COLORS.blue:COLORS.amber,0.75),borderRadius:5,borderSkipped:false}))},options:barOpts('staff')});
  const we=document.getElementById('hr-wage-stats');
  if(we){const aw=roster.filter(r=>r.status==='Active').reduce((s,r)=>s+(r.wage||0),0);we.innerHTML=`<div class="stat-row"><div class="stat-pill"><div class="stat-pill-val">${fmt$(aw)}</div><div class="stat-pill-label">/ day</div></div><div class="stat-pill"><div class="stat-pill-val">${fmt$(aw*5)}</div><div class="stat-pill-label">/ week</div></div><div class="stat-pill"><div class="stat-pill-val">${fmt$(aw*22)}</div><div class="stat-pill-label">/ month</div></div></div><div style="margin-top:12px;font-size:12px;color:var(--text-secondary)">High-skill: <strong style="color:var(--accent)">$45/hr</strong> · Low-skill: <strong style="color:var(--accent)">$30/hr</strong> · Active: <strong style="color:var(--accent4)">${m.activeStaff}</strong></div>`;}
  const ml=m.monthlyLeave,lMons=Object.keys(ml).sort();
  createChart('chart-leave-timeline',{type:'bar',data:{labels:lMons.map(monLabel),datasets:[{label:'Leave Events',data:lMons.map(mo=>ml[mo]),backgroundColor:hexAlpha(COLORS.purple,0.7),borderRadius:5,borderSkipped:false}]},options:barOpts('events')});
  const grid=document.getElementById('hr-roster-grid');
  if(grid)grid.innerHTML=roster.map(p=>`<div class="hr-card"><div class="hr-avatar ${p.role}">${p.employeeId}</div><div class="hr-name">${p.employeeId}</div><div class="hr-role">${p.role?.charAt(0).toUpperCase()+p.role?.slice(1)||'—'}</div><div class="hr-skill">${p.skillLevel} skill · $${p.wage}/hr</div><div style="margin-top:6px"><span class="badge ${p.status==='Active'?'active':'resigned'}">${p.status}</span></div></div>`).join('');
}

/* ═══════════════════════════════════════════════════
   RENDER: INVENTORY (Past)
═══════════════════════════════════════════════════ */
function renderInventory(){
  const m=METRICS,inv=DATA.inventory||[];
  document.getElementById('inv-materials').textContent=m.materialsList.length;
  document.getElementById('inv-reorders').textContent=m.totalReorderEvents;
  document.getElementById('inv-consumed').textContent=m.totalConsumedUnits+' m³';
  document.getElementById('inv-entries').textContent=inv.length;
  const levelsEl=document.getElementById('inventory-levels');
  if(levelsEl)levelsEl.innerHTML=m.materialsList.map((mat,i)=>{
    const info=m.invByMaterial[mat],pct=Math.min(100,(info.currentLevel/15)*100);
    const cls=['blue','green','purple'][i%3];
    return`<div class="inv-item"><div class="inv-header"><div class="inv-name">🪵 ${mat}</div><div class="inv-level">${info.currentLevel} m³</div></div><div class="progress-bar-bg"><div class="progress-bar-fill ${cls}" style="width:${pct}%"></div></div><div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--text-muted)"><span>Reorders: <strong style="color:var(--accent)">${info.totalReorders}×</strong></span><span>Consumed: <strong style="color:var(--accent5)">${info.totalConsumed} m³</strong></span></div></div>`;
  }).join('');
  const months=Object.keys(m.monthlyConsumption).sort(),mLabels=months.map(monLabel);
  createChart('chart-inv-consumption',{type:'line',data:{labels:mLabels,datasets:m.materialsList.map((mat,i)=>({label:mat,data:months.map(mo=>m.monthlyConsumption[mo]?.[mat]||0),borderColor:PALETTE[i%PALETTE.length],backgroundColor:hexAlpha(PALETTE[i%PALETTE.length],0.12),borderWidth:2,tension:0.4,fill:false,pointRadius:3}))},options:lineOpts('m³')});
  createChart('chart-inv-reorder',{type:'bar',data:{labels:m.materialsList,datasets:[{label:'Reorder Events',data:m.materialsList.map(mat=>m.invByMaterial[mat].totalReorders),backgroundColor:m.materialsList.map((_,i)=>hexAlpha(PALETTE[i%PALETTE.length],0.75)),borderRadius:6,borderSkipped:false}]},options:barOpts('events')});
  const histMons=[...new Set(inv.map(i=>i.date?String(i.date).slice(0,7):null).filter(Boolean))].sort();
  createChart('chart-inv-history',{type:'line',data:{labels:histMons.map(monLabel),datasets:m.materialsList.map((mat,i)=>{
    const entries=inv.filter(e=>e.material===mat&&e.date),monthlyLast={};
    entries.forEach(e=>{monthlyLast[String(e.date).slice(0,7)]=e.newLevel;});
    let last=0;
    return{label:mat,data:histMons.map(mo=>{if(monthlyLast[mo]!==undefined)last=monthlyLast[mo];return last;}),borderColor:PALETTE[i%PALETTE.length],backgroundColor:hexAlpha(PALETTE[i%PALETTE.length],0.15),borderWidth:2,tension:0.3,fill:true,pointRadius:2};
  })},options:lineOpts('m³')});
}

/* ═══════════════════════════════════════════════════
   RENDER: OPERATIONS (Present) — Drill-Down
═══════════════════════════════════════════════════ */
let opsCurrentStage=null,opsCurrentProduct=null;
function renderOperations(){
  const m=METRICS,orders=DATA.orders||[];
  opsCurrentStage=null;opsCurrentProduct=null;
  opsGoBack(0);

  // KPI row
  const kpiRow=document.getElementById('ops-kpi-row');
  if(kpiRow){
    const recentOrds=orders.slice(-200);
    const late=recentOrds.filter(o=>o.deliveryStatus&&o.deliveryStatus!=='On Time');
    const highRisk=recentOrds.filter(o=>(o.complexity||0)>=4&&o.status!=='DELIVERED');
    kpiRow.innerHTML=`
      <div class="kpi-card blue"><span class="kpi-icon">📦</span><div class="kpi-label">Recent Orders</div><div class="kpi-value">${recentOrds.length}</div><div class="kpi-change">Last 200 records</div></div>
      <div class="kpi-card red"><span class="kpi-icon">⚠️</span><div class="kpi-label">Late Deliveries</div><div class="kpi-value">${late.length}</div><div class="kpi-change down">In recent batch</div></div>
      <div class="kpi-card amber"><span class="kpi-icon">🔴</span><div class="kpi-label">High-Risk Orders</div><div class="kpi-value">${highRisk.length}</div><div class="kpi-change">Complexity ≥ 4</div></div>
      <div class="kpi-card green"><span class="kpi-icon">✅</span><div class="kpi-label">On-Time Rate</div><div class="kpi-value">${fmtPct(m.onTimePct)}</div><div class="kpi-change up">Overall</div></div>`;
  }

  // Stage cards
  const stages=[
    {name:'Design',key:'design',icon:'✏️',color:'blue',field:'designHours'},
    {name:'Milling',key:'milling',icon:'⚙️',color:'cyan',field:'millingHours'},
    {name:'Joinery',key:'joinery',icon:'🔧',color:'purple',field:'joineryHours'},
    {name:'Finishing',key:'finishing',icon:'🎨',color:'amber',field:'finishingHours'},
  ];
  const grid=document.getElementById('ops-stage-grid');
  if(!grid)return;
  grid.innerHTML=stages.map(st=>{
    const stOrds=orders.filter(o=>(o[st.field]||0)>0);
    const lateInStage=stOrds.filter(o=>o.deliveryStatus&&o.deliveryStatus!=='On Time');
    const avgH=stOrds.length>0?stOrds.reduce((s,o)=>s+(o[st.field]||0),0)/stOrds.length:0;
    return`<div class="ops-stage-card ${st.color}" onclick="opsDrillStage('${st.key}','${st.name}','${st.field}')">
      <div class="ops-stage-icon">${st.icon}</div>
      <div class="ops-stage-name">${st.name}</div>
      <div class="ops-stage-count">${stOrds.length} orders</div>
      <div class="ops-stage-avg">Avg: ${fmtNum(avgH)}h per order</div>
      <div class="ops-risk">${lateInStage.length>0?`<span class="risk-badge red">⚠️ ${lateInStage.length} late</span>`:''}</div>
      <div class="ops-drill-hint">Click to drill → Products</div>
    </div>`;
  }).join('');
}

window.opsDrillStage=function(stageKey,stageName,field){
  opsCurrentStage={key:stageKey,name:stageName,field};
  const orders=DATA.orders.filter(o=>(o[field]||0)>0);
  const pts=[...new Set(orders.map(o=>o.productType).filter(Boolean))].sort();

  document.getElementById('ops-level-0').style.display='none';
  document.getElementById('ops-level-1').style.display='block';
  document.getElementById('ops-level-2').style.display='none';
  document.getElementById('ops-l1-title').textContent=`⚙️ ${stageName} Stage — By Product Type`;

  const body=document.getElementById('ops-l1-body');
  if(!body)return;
  body.innerHTML=`<div class="ops-product-grid">${pts.map(pt=>{
    const pOrds=orders.filter(o=>o.productType===pt);
    const late=pOrds.filter(o=>o.deliveryStatus&&o.deliveryStatus!=='On Time');
    const avgH=pOrds.reduce((s,o)=>s+(o[field]||0),0)/Math.max(pOrds.length,1);
    return`<div class="ops-product-card" onclick="opsDrillProduct('${pt}')">
      <div class="ops-prod-name">${pt}</div>
      <div class="ops-prod-count">${pOrds.length} orders</div>
      <div class="ops-prod-avg">Avg ${fmtNum(avgH)}h</div>
      ${late.length?`<span class="risk-badge red">⚠️ ${late.length} late</span>`:'<span class="risk-badge green">✓ On track</span>'}
      <div class="ops-drill-hint">Click → Orders</div>
    </div>`;
  }).join('')}</div>`;
};

window.opsDrillProduct=function(productType){
  opsCurrentProduct=productType;
  if(!opsCurrentStage)return;
  const orders=DATA.orders.filter(o=>(o[opsCurrentStage.field]||0)>0&&o.productType===productType);

  document.getElementById('ops-level-1').style.display='none';
  document.getElementById('ops-level-2').style.display='block';
  document.getElementById('ops-l2-title').textContent=`📦 ${productType} — ${opsCurrentStage.name} Stage Orders`;

  const body=document.getElementById('ops-l2-body');
  if(!body)return;
  body.innerHTML=`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Status</th><th>Stage Hours</th><th>Complexity</th><th>Delivery</th><th>Risk</th><th></th></tr></thead>
  <tbody>${orders.map(o=>{
    const stH=o[opsCurrentStage.field]||0;
    const isLate=o.deliveryStatus&&o.deliveryStatus!=='On Time';
    const isHighRisk=(o.complexity||0)>=4;
    const risk=isLate?'<span class="risk-badge red">⚠️ Late</span>':isHighRisk?'<span class="risk-badge amber">🔴 High Complexity</span>':'<span class="risk-badge green">✓ Normal</span>';
    return`<tr class="clickable-row" onclick="openOrderModal(${JSON.stringify(o).replace(/"/g,'&quot;')})">
      <td>#${o.id}</td>
      <td><span class="badge ${o.status==='DELIVERED'?'delivered':'lost'}">${o.status}</span></td>
      <td>${fmtNum(stH)}h</td>
      <td>${o.complexity||'—'}/5</td>
      <td>${o.deliveryStatus?`<span class="badge ${o.deliveryStatus==='On Time'?'on-time':'late'}">${o.deliveryStatus}</span>`:'—'}</td>
      <td>${risk}</td>
      <td><button class="row-detail-btn" onclick="event.stopPropagation();openOrderModal(${JSON.stringify(o).replace(/"/g,'&quot;')})">Detail →</button></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
};

window.opsGoBack=function(level){
  document.getElementById('ops-level-0').style.display=level===0?'block':'none';
  document.getElementById('ops-level-1').style.display=level===1?'block':'none';
  document.getElementById('ops-level-2').style.display='none';
  if(level===0){opsCurrentStage=null;opsCurrentProduct=null;}
  if(level===1){opsCurrentProduct=null;}
};

/* ═══════════════════════════════════════════════════
   RENDER: FORECASTS (Future)
═══════════════════════════════════════════════════ */
function renderForecasts(){
  const m=METRICS;
  const months=Object.keys(m.monthlyFinance).sort();
  const revData=months.map(mo=>m.monthlyFinance[mo].rev);

  // Simple linear regression for forecast
  function linearForecast(data,steps=3){
    const n=data.length;
    const xMean=(n-1)/2;
    const yMean=data.reduce((a,b)=>a+b,0)/n;
    let num=0,den=0;
    data.forEach((y,x)=>{num+=(x-xMean)*(y-yMean);den+=(x-xMean)**2;});
    const slope=den?num/den:0,intercept=yMean-slope*xMean;
    return Array.from({length:steps},(_,i)=>Math.max(0,slope*(n+i)+intercept));
  }

  const forecast=linearForecast(revData,3);
  const lastMon=months[months.length-1];
  const [y,d]=lastMon.split('-');
  const forecastMons=Array.from({length:3},(_,i)=>{
    const dt=new Date(+y,+d-1+i,1);
    return dt.toLocaleString('en-AU',{month:'short',year:'2-digit'});
  });

  // KPI row
  const kpiRow=document.getElementById('forecast-kpi-row');
  const avgRev=revData.slice(-3).reduce((a,b)=>a+b,0)/3;
  const projRev=forecast[0];
  const revTrend=projRev>avgRev;
  if(kpiRow)kpiRow.innerHTML=`
    <div class="kpi-card ${revTrend?'green':'red'}"><span class="kpi-icon">${revTrend?'📈':'📉'}</span><div class="kpi-label">Projected Next Month Revenue</div><div class="kpi-value">${fmtK(projRev)}</div><div class="kpi-change ${revTrend?'up':'down'}">${revTrend?'↑ Trending up':'↓ Trending down'}</div></div>
    <div class="kpi-card amber"><span class="kpi-icon">⚠️</span><div class="kpi-label">Delivery Risk</div><div class="kpi-value">${(100-m.onTimePct).toFixed(1)}%</div><div class="kpi-change">Late rate</div></div>
    <div class="kpi-card red"><span class="kpi-icon">👥</span><div class="kpi-label">Capacity Risk</div><div class="kpi-value">${(m.resignedStaff/Math.max(m.totalStaff,1)*100).toFixed(0)}%</div><div class="kpi-change down">Workforce lost</div></div>
    <div class="kpi-card purple"><span class="kpi-icon">🪵</span><div class="kpi-label">Stock Risk</div><div class="kpi-value">${m.materialsList.filter(mat=>m.invByMaterial[mat].currentLevel<5).length}</div><div class="kpi-change">Materials below 5m³</div></div>`;

  // Revenue forecast chart
  const allLabels=[...months.map(monLabel),...forecastMons];
  const histLen=months.length;
  createChart('chart-revenue-forecast',{type:'line',data:{labels:allLabels,datasets:[
    {label:'Historical Revenue',data:[...revData,...Array(3).fill(null)],borderColor:COLORS.cyan,backgroundColor:ctx=>chartGradient(ctx.chart.ctx,COLORS.cyan,0.2,0.01),borderWidth:2,tension:0.4,fill:true,pointRadius:3},
    {label:'Forecast',data:[...Array(histLen).fill(null),revData[revData.length-1],...forecast],borderColor:COLORS.amber,backgroundColor:hexAlpha(COLORS.amber,0.1),borderWidth:2,borderDash:[6,3],tension:0.3,fill:true,pointRadius:4,pointStyle:'triangle'},
  ]},options:lineOpts('$')});

  // Win rate trend
  const wrMons=Object.keys(m.monthlyWinRate).sort();
  createChart('chart-winrate-trend',{type:'line',data:{labels:wrMons.map(monLabel),datasets:[
    {label:'Monthly Win Rate',data:wrMons.map(mo=>m.monthlyWinRate[mo]),borderColor:COLORS.green,backgroundColor:ctx=>chartGradient(ctx.chart.ctx,COLORS.green,0.2,0.01),borderWidth:2,tension:0.4,fill:true,pointRadius:3},
  ]},options:lineOpts('%')});

  // Risk indicators
  const risks=[
    {label:'Delivery Risk',desc:`${fmtPct(100-m.onTimePct)} of deliveries are late`,level:(100-m.onTimePct)>20?'high':(100-m.onTimePct)>10?'medium':'low',icon:'🚚'},
    {label:'Workforce Capacity',desc:`${m.resignedStaff}/${m.totalStaff} staff resigned — ${fmtPct(m.resignedStaff/Math.max(m.totalStaff,1)*100)} turnover`,level:m.resignedStaff/Math.max(m.totalStaff,1)>0.4?'high':m.resignedStaff/Math.max(m.totalStaff,1)>0.2?'medium':'low',icon:'👥'},
    {label:'Joinery Bottleneck',desc:`Joinery avg ${fmtNum(m.avgJoinH)}h — highest of all stages`,level:m.avgJoinH>m.avgDesignH&&m.avgJoinH>m.avgMillingH&&m.avgJoinH>m.avgFinH?'high':'medium',icon:'🔧'},
    {label:'Profitability',desc:`${fmtPct(m.profitMargin)} margin — ${m.netProfit<0?'net loss':'profitable but thin'}`,level:m.profitMargin<5?'high':m.profitMargin<15?'medium':'low',icon:'💰'},
    ...m.materialsList.map(mat=>({label:`${mat} Stock`,desc:`Current: ${m.invByMaterial[mat].currentLevel} m³`,level:m.invByMaterial[mat].currentLevel<3?'high':m.invByMaterial[mat].currentLevel<8?'medium':'low',icon:'🪵'})),
  ];
  const rg=document.getElementById('risk-indicators-grid');
  if(rg)rg.innerHTML=`<div class="risk-grid">${risks.map(r=>`<div class="risk-row risk-${r.level}"><div class="risk-icon">${r.icon}</div><div class="risk-info"><div class="risk-label">${r.label}</div><div class="risk-desc">${r.desc}</div></div><div class="risk-badge-large ${r.level}">${r.level.toUpperCase()}</div></div>`).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════
   RENDER: CORRELATION DRIVERS (Future)
═══════════════════════════════════════════════════ */
function renderCorrelation(){
  const orders=DATA.orders||[];
  if(!orders.length)return;

  // Compute Pearson correlation between two numeric arrays
  function pearson(xs,ys){
    const n=xs.length;if(!n)return 0;
    const mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;
    let num=0,dx=0,dy=0;
    for(let i=0;i<n;i++){num+=(xs[i]-mx)*(ys[i]-my);dx+=(xs[i]-mx)**2;dy+=(ys[i]-my)**2;}
    return dx&&dy?num/Math.sqrt(dx*dy):0;
  }

  const delivered=orders.map(o=>o.status==='DELIVERED'?1:0);
  const revenue=orders.map(o=>o.status==='DELIVERED'?o.quotePrice||0:0);

  // Encode categorical
  const materials=[...new Set(orders.map(o=>o.materialType).filter(Boolean))];
  const matMap={};materials.forEach((m,i)=>matMap[m]=i+1);

  const drivers=[
    {name:'Quote Price',xs:orders.map(o=>o.quotePrice||0)},
    {name:'Complexity',xs:orders.map(o=>o.complexity||0)},
    {name:'Design Hours',xs:orders.map(o=>o.designHours||0)},
    {name:'Milling Hours',xs:orders.map(o=>o.millingHours||0)},
    {name:'Joinery Hours',xs:orders.map(o=>o.joineryHours||0)},
    {name:'Finishing Hours',xs:orders.map(o=>o.finishingHours||0)},
    {name:'Total Hours',xs:orders.map(o=>(o.designHours||0)+(o.millingHours||0)+(o.joineryHours||0)+(o.finishingHours||0))},
    {name:'Material Type',xs:orders.map(o=>matMap[o.materialType]||0)},
  ];

  const wrDrivers=drivers.map(d=>({...d,r:pearson(d.xs,delivered)})).sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
  const revDrivers=drivers.map(d=>({...d,r:pearson(d.xs,revenue)})).sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));

  function strengthLabel(r){const a=Math.abs(r);return a>0.5?'Strong':a>0.3?'Moderate':a>0.1?'Weak':'Negligible';}
  function strengthColor(r){const a=Math.abs(r);return a>0.5?'red':a>0.3?'amber':a>0.1?'green':'#666';}

  function renderCorTable(drivers,containerId,outcome,ys){
    const el=document.getElementById(containerId);
    if(!el)return;
    el.innerHTML=`<div class="corr-table">
      <div class="corr-header"><span>Driver</span><span>Correlation</span><span>Direction</span><span>Strength</span></div>
      ${drivers.map(d=>{
        const pct=Math.abs(d.r)*100;
        const dir=d.r>0?'↑ Positive':'↓ Negative';
        const sc=strengthColor(d.r);
        return`<div class="corr-row" onclick="showScatter('${d.name}',${JSON.stringify(d.xs)},${JSON.stringify(ys)},'${outcome}')">
          <span class="corr-name">${d.name}</span>
          <span class="corr-bar-wrap"><div class="corr-bar" style="width:${pct}%;background:${sc}"></div><span class="corr-val">${d.r.toFixed(2)}</span></span>
          <span class="corr-dir" style="color:${d.r>0?'var(--accent4)':'var(--accent-red)'}">${dir}</span>
          <span class="corr-strength" style="color:${sc}">${strengthLabel(d.r)}</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  renderCorTable(wrDrivers,'correlation-table-winrate','Win Rate',delivered);
  renderCorTable(revDrivers,'correlation-table-revenue','Revenue',revenue);
}

window.showScatter=function(driverName,xs,ys,outcomeName){
  const panel=document.getElementById('scatter-panel');
  if(panel)panel.style.display='block';
  document.getElementById('scatter-title').textContent=`${driverName} vs ${outcomeName}`;
  document.getElementById('scatter-sub').textContent=`Each point = one order. Trend line shows direction of relationship.`;
  panel.scrollIntoView({behavior:'smooth'});

  // Compute trend line
  const n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;
  let num=0,den=0;
  xs.forEach((x,i)=>{num+=(x-mx)*(ys[i]-my);den+=(x-mx)**2;});
  const slope=den?num/den:0,intercept=my-slope*mx;
  const xMin=Math.min(...xs),xMax=Math.max(...xs);
  const trendPts=[{x:xMin,y:slope*xMin+intercept},{x:xMax,y:slope*xMax+intercept}];

  createChart('chart-scatter',{type:'scatter',data:{datasets:[
    {label:'Orders',data:xs.map((x,i)=>({x,y:ys[i]})),backgroundColor:hexAlpha(COLORS.blue,0.4),borderColor:COLORS.blue,pointRadius:3,pointHoverRadius:5},
    {label:'Trend',data:trendPts,type:'line',borderColor:COLORS.amber,borderWidth:2,borderDash:[5,3],pointRadius:0,fill:false},
  ]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#8b9ec7',font:{size:10}},title:{display:true,text:driverName,color:'#8b9ec7'}},y:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#8b9ec7',font:{size:10}},title:{display:true,text:outcomeName,color:'#8b9ec7'}}},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${driverName}: ${c.parsed.x.toFixed(1)}, ${outcomeName}: ${c.parsed.y.toFixed(2)}`}}}}});
};

/* ═══════════════════════════════════════════════════
   RENDER: DATA PROFILE
═══════════════════════════════════════════════════ */
function renderDataProfile(){
  const schemas=[
    {key:'orders',label:'Orders Data',data:DATA.orders},
    {key:'finance',label:'Financial Ledger',data:DATA.finance},
    {key:'hrRoster',label:'HR Roster',data:DATA.hrRoster},
    {key:'hrEvents',label:'HR Events Log',data:DATA.hrEvents},
    {key:'inventory',label:'Inventory Log',data:DATA.inventory},
    {key:'designLog',label:'Design Log',data:DATA.designLog},
    {key:'customers',label:'Customers',data:DATA.customers},
  ].filter(s=>s.data&&s.data.length>0);
  const kpiRow=document.getElementById('dp-kpi-row');
  if(kpiRow){
    const colors=['blue','green','amber','purple'];
    const stats=[{label:'Tables Loaded',val:schemas.length},{label:'Total Rows',val:schemas.reduce((s,sc)=>s+sc.data.length,0).toLocaleString()},{label:'Data Source',val:DATA_SOURCE==='bundled'?'Sample':DATA_SOURCE==='historic'?'Historic':'Uploaded'},{label:'Locally Saved',val:localStorage.getItem(LS_KEY)?'Yes ✓':'No'}];
    kpiRow.innerHTML=stats.map((st,i)=>`<div class="kpi-card ${colors[i%colors.length]}"><div class="kpi-label">${st.label}</div><div class="kpi-value" style="font-size:22px">${st.val}</div></div>`).join('');
  }
  const wrap=document.getElementById('dp-tables-wrap');
  if(!wrap)return;
  wrap.innerHTML=schemas.map(sc=>{
    const cols=Object.keys(sc.data[0]||{});
    const nullInfo={};cols.forEach(c=>{nullInfo[c]=sc.data.filter(r=>r[c]===null||r[c]===''||r[c]===undefined).length;});
    const colTypes={};cols.forEach(c=>{
      const sample=sc.data.slice(0,20).map(r=>r[c]).filter(v=>v!=null&&v!=='');
      if(sample.every(v=>typeof v==='number'))colTypes[c]='number';
      else if(sample.some(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)))colTypes[c]='date';
      else colTypes[c]='string';
    });
    const numericCols=cols.filter(c=>colTypes[c]==='number');
    const sampleStats={};
    numericCols.forEach(c=>{
      const vals=sc.data.map(r=>r[c]).filter(v=>typeof v==='number');
      if(!vals.length)return;
      sampleStats[c]={min:Math.min(...vals).toFixed(1),max:Math.max(...vals).toFixed(1),avg:(vals.reduce((a,b)=>a+b)/vals.length).toFixed(1)};
    });
    return`<div class="dp-schema-block"><div class="dp-schema-header"><div class="dp-schema-name">📋 ${sc.label}</div><div class="dp-schema-meta">${sc.data.length.toLocaleString()} rows · ${cols.length} columns</div><span class="chart-badge blue">${sc.key}</span></div>
    <table class="dp-col-table"><thead><tr><th>Column</th><th>Type</th><th>Null %</th><th>Stats / Sample</th></tr></thead><tbody>${cols.map(c=>{
      const nullPct=(nullInfo[c]/sc.data.length*100).toFixed(1);
      const stats=sampleStats[c];
      const sampleVal=sc.data.slice(0,3).map(r=>r[c]).filter(v=>v!=null).slice(0,1)[0];
      return`<tr><td><strong style="color:var(--text-primary)">${c}</strong></td><td><span class="dp-type-badge ${colTypes[c]}">${colTypes[c]}</span></td><td><div class="dp-null-bar"><div class="dp-null-fill" style="width:${nullPct}%"></div></div><span style="margin-left:6px;font-size:11px">${nullPct}%</span></td><td style="color:var(--text-muted);font-size:11px">${stats?`min:${stats.min} max:${stats.max} avg:${stats.avg}`:String(sampleVal??'—').slice(0,40)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════
   AI PAGE — Full-page Furnico
═══════════════════════════════════════════════════ */
let aiPageInited=false;
let answerCount=0;
const feedbackStore=JSON.parse(localStorage.getItem('mfc_ai_feedback')||'[]');

/* ── Google Gemini Integration State ── */
let GEMINI_API_KEY = localStorage.getItem('mfc_gemini_api_key') || '';
// Check if key is provided via URL query parameter (e.g. ?gemini_key=... or ?key=...)
try {
  const urlParams = new URLSearchParams(window.location.search);
  const qKey = urlParams.get('gemini_key') || urlParams.get('key');
  if (qKey) {
    GEMINI_API_KEY = qKey.trim();
    localStorage.setItem('mfc_gemini_api_key', GEMINI_API_KEY);
  }
} catch (e) {}

let workingGeminiModel = localStorage.getItem('mfc_gemini_working_model') || '';

function updateGeminiStatusUI(){
  const dot = document.getElementById('gemini-status-dot');
  const txt = document.getElementById('gemini-status-text');
  const modalMode = document.getElementById('modal-current-mode');
  const keyInput = document.getElementById('gemini-api-key-input');
  if (keyInput && GEMINI_API_KEY) keyInput.value = GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    if (dot) dot.style.background = '#10b981';
    if (txt) txt.textContent = workingGeminiModel ? `Gemini Active (${workingGeminiModel})` : 'Gemini Connected';
    if (modalMode) modalMode.innerHTML = `<span style="color:#10b981;font-weight:700;">● Google Gemini Active (${workingGeminiModel || 'Auto-Selecting Model'})</span>`;
  } else {
    if (dot) dot.style.background = '#f59e0b';
    if (txt) txt.textContent = 'Offline Engine (Connect Gemini)';
    if (modalMode) modalMode.innerHTML = '<span style="color:#f59e0b;font-weight:700;">● Offline Rule-Based Fallback (No Key Set)</span>';
  }
}

window.openGeminiKeyModal = function(){
  const modal = document.getElementById('gemini-modal');
  if (modal) modal.style.display = 'flex';
  updateGeminiStatusUI();
};

window.closeGeminiModal = function(e){
  if (!e || e.target.id === 'gemini-modal' || e.target.classList?.contains('modal-close')) {
    const modal = document.getElementById('gemini-modal');
    if (modal) modal.style.display = 'none';
  }
};

window.saveGeminiKey = function(){
  const input = document.getElementById('gemini-api-key-input');
  const val = input ? input.value.trim() : '';
  if (val) {
    GEMINI_API_KEY = val;
    localStorage.setItem('mfc_gemini_api_key', val);
    workingGeminiModel = '';
    localStorage.removeItem('mfc_gemini_working_model');
  }
  updateGeminiStatusUI();
  const modal = document.getElementById('gemini-modal');
  if (modal) modal.style.display = 'none';
  addAIPageMsg('ai', null, `✨ <strong>Google Gemini Key Connected!</strong> FurBuddy will dynamically select the best available model for your account and reason live over MFC's data.`, 'welcome');
};

window.clearGeminiKey = function(){
  GEMINI_API_KEY = '';
  workingGeminiModel = '';
  localStorage.removeItem('mfc_gemini_api_key');
  localStorage.removeItem('mfc_gemini_working_model');
  const input = document.getElementById('gemini-api-key-input');
  if (input) input.value = '';
  updateGeminiStatusUI();
  const modal = document.getElementById('gemini-modal');
  if (modal) modal.style.display = 'none';
  addAIPageMsg('ai', null, `ℹ️ <strong>Switched to FurBuddy Offline Engine.</strong> Responses will use local rules & metrics until a Gemini API key is entered.`, 'welcome');
};

function formatMarkdownText(md){
  if (!md) return '';
  if (md.includes('ai-structured') || md.includes('ai-block')) return md;

  let html = md
    .replace(/```(?:html)?\s*([\s\S]*?)```/gi, '$1')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h4 style="color:var(--accent);margin:10px 0 4px;font-size:13px;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="color:var(--text-primary);margin:12px 0 6px;font-size:14px;">$1</h3>')
    .replace(/^\s*[\*\-]\s+(.*$)/gim, '• $1<br>')
    .replace(/\n\n+/g, '<br><br>')
    .replace(/\n/g, '<br>');
  return html;
}

if (localStorage.getItem('mfc_gemini_working_model') === 'gemini-2.5-pro') {
  localStorage.removeItem('mfc_gemini_working_model');
}

async function getAvailableGeminiModel(){
  if (workingGeminiModel && workingGeminiModel !== 'gemini-2.5-pro') return workingGeminiModel;
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    if (listRes.ok) {
      const data = await listRes.json();
      const models = (data.models || [])
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(m => !m.includes('2.5-pro') && !m.includes('1.5-flash') && !m.includes('2.0-flash'));
      
      const best = models.find(m => m.includes('3.1-pro-preview'))
                || models.find(m => m.includes('3.5-flash'))
                || models.find(m => m.includes('3.8-flash'))
                || models.find(m => m.includes('2.5-flash'))
                || models.find(m => m.includes('3.1'))
                || models.find(m => m.includes('flash'))
                || models[0];
      if (best) {
        workingGeminiModel = best;
        localStorage.setItem('mfc_gemini_working_model', best);
        updateGeminiStatusUI();
        return best;
      }
    }
  } catch (e) {
    console.warn('Dynamic model query failed, falling back to candidate list:', e);
  }
  return 'gemini-3.1-pro-preview';
}

async function callGeminiAPI(query){
  const m = METRICS;
  const systemPrompt = `You are FurBuddy, the Generative AI Analytics Agent for Modern Furniture Co. (MFC), a custom furniture manufacturer based in Melbourne, VIC.
You are directly evaluating real business data from the simulator covering FY 2025:
- Total Orders: ${m.totalOrders || 1166}
- Total Revenue: $${((m.totalRev||0)/1000).toFixed(1)}k
- Total Costs: $${((m.totalCost||0)/1000).toFixed(1)}k
- Net Profit: $${((m.netProfit||0)/1000).toFixed(1)}k (Net Margin: ${((m.margin||0)*100).toFixed(1)}%)
- Win Rate: ${((m.winRate||0)*100).toFixed(1)}% (${m.deliveredOrders||0} delivered, ${m.lostOrders||0} lost)
- On-Time Delivery Rate: ${((m.onTimeRate||0)*100).toFixed(1)}%
- Active Staff: ${m.activeStaff||12} of ${m.totalStaff||24} (${m.resignedStaff||12} resigned/turnover)
- Key Product Lines: Custom Dining Tables, Ergonomic Office Chairs, Media Consoles, Modular Bookshelves, Bed Frames.
- Workshop Stages: Milling, Joinery, Assembly, Finishing. Milling & Joinery are main cycle bottlenecks.
- Inventory: Timber types (Walnut, Oak, Ash). Walnut stockouts consistently cause production delays.

Instructions:
Answer the manager's inquiry using these 4 structured sections formatted in HTML:
<div class="ai-structured">
  <div class="ai-block evidence-block"><div style="font-weight:700;color:var(--accent2);margin-bottom:4px;">📊 EVIDENCE</div><div class="block-text">[Specific data numbers, metrics, and facts from MFC]</div></div>
  <div class="ai-block interpretation-block"><div style="font-weight:700;color:var(--accent);margin-bottom:4px;">💡 INTERPRETATION</div><div class="block-text">[Business analysis: why this happens, operational impact, financial risk]</div></div>
  <div class="ai-block action-block"><div style="font-weight:700;color:var(--accent4);margin-bottom:4px;">🎯 STRATEGIC ACTION</div><div class="block-text">[Actionable recommendation for MFC management to solve or improve this]</div></div>
  <div class="ai-block limitation-block"><div style="font-weight:700;color:var(--accent5);margin-bottom:4px;">⚠️ LIMITATION & ASSUMPTION</div><div class="block-text">[Constraints of data, assumptions made, or additional telemetry required]</div></div>
</div>

Privacy Guardrail: Protect individual customer identities and personal salary info. Aggregate metrics only.`;

  const initialModel = await getAvailableGeminiModel();
  const candidates = [
    initialModel,
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-pro',
    'gemini-2.5-flash-latest'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastError = null;
  for (const model of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nManager Question: "${query}"` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000
        }
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const resData = await resp.json();
        let text = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          workingGeminiModel = model;
          localStorage.setItem('mfc_gemini_working_model', model);
          updateGeminiStatusUI();
          return { text: formatMarkdownText(text.trim()), model };
        }
      } else {
        const err = await resp.json().catch(() => ({}));
        lastError = new Error(err.error?.message || `HTTP ${resp.status}`);
        const errMsg = (lastError.message || '').toLowerCase();
        // If API key itself is invalid, throw immediately
        if (errMsg.includes('api_key_invalid') || errMsg.includes('api key not valid')) {
          throw lastError;
        }
        console.warn(`Model ${model} not available (${lastError.message}), trying next candidate...`);
      }
    } catch (e) {
      lastError = e;
      if (e.message?.toLowerCase().includes('api_key_invalid')) {
        throw e;
      }
      console.warn(`Error connecting to ${model}, trying next:`, e);
    }
  }

  throw lastError || new Error('No available Gemini model supported for this key');
}

function initAIPage(){
  const sendBtn=document.getElementById('ai-page-send');
  const input=document.getElementById('ai-page-input');
  if(!sendBtn||!input)return;
  sendBtn.addEventListener('click',()=>sendAIPageMsg());
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAIPageMsg();}});
  updateGeminiStatusUI();
}

function renderAIPage(){
  if(aiPageInited)return;
  aiPageInited=true;
  const m=METRICS;
  updateGeminiStatusUI();
  const modelBadge = GEMINI_API_KEY 
    ? `<span style="color:#10b981;font-weight:600;">✨ Google Gemini 1.5 Flash Connected</span>` 
    : `<span style="color:#f59e0b;">Offline Rule Mode · <a href="#" onclick="openGeminiKeyModal();return false;" style="color:var(--accent);text-decoration:none;">Connect Gemini Key ⚙️</a></span>`;

  addAIPageMsg('ai',null,`👋 <strong>Hi! I'm FurBuddy</strong> — MFC's Generative AI Analytics Agent.<br><br>I've analysed <strong>${m.totalOrders?.toLocaleString()}</strong> orders across <strong>${fmtK(m.totalRev)}</strong> in revenue with a win rate of <strong>${fmtPct(m.winRate)}</strong>.<br><div style="margin:10px 0;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:12px;">Active AI Engine: ${modelBadge}</div>Ask any natural language question about MFC's operations, or pick from the suggested questions.`,'welcome');
}

function populateAISourceList(){
  const el=document.getElementById('ai-source-list');
  if(!el)return;
  const srcs=[
    {label:'orders_data.csv',rows:DATA.orders.length,icon:'📦'},
    {label:'financial_ledger.csv',rows:DATA.finance.length,icon:'💰'},
    {label:'hr_roster.csv',rows:DATA.hrRoster.length,icon:'👥'},
    {label:'inventory_log.csv',rows:DATA.inventory.length,icon:'🪵'},
  ];
  el.innerHTML=srcs.map(s=>`<div class="ai-source-item"><span>${s.icon}</span><span class="ai-source-name">${s.label}</span><span class="ai-source-rows">${s.rows.toLocaleString()} rows</span></div>`).join('');
}

window.toggleTips=function(){
  const c=document.getElementById('tips-content');
  if(c)c.style.display=c.style.display==='none'?'flex':'none';
};

window.askSuggestion=function(el){
  const input=document.getElementById('ai-page-input');
  if(input){input.value=el.textContent;sendAIPageMsg();}
};

async function sendAIPageMsg(){
  const input=document.getElementById('ai-page-input');
  if(!input)return;
  const text=input.value.trim();
  if(!text)return;
  input.value='';
  addAIPageMsg('user',null,text);
  addAIPageTyping();

  if (GEMINI_API_KEY) {
    try {
      const geminiRes = await callGeminiAPI(text);
      removeAIPageTyping();
      const id='ans-'+(++answerCount);
      const modelName = (geminiRes.model || 'Gemini').toUpperCase();
      const tag = `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#10b981;font-weight:700;margin-bottom:8px;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span> ✨ ${modelName} LIVE GENERATIVE REASONING</div>`;
      addAIPageMsg('ai', id, tag + geminiRes.text, 'gemini-active');
      return;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local engine:', err);
      removeAIPageTyping();
      const resp=buildStructuredResponse(text);
      const id='ans-'+(++answerCount);
      const warn = `<div style="font-size:11px;color:#f59e0b;margin-bottom:8px;">⚠️ Gemini connection notice: ${err.message}. Showing offline engine answer:</div>`;
      addAIPageMsg('ai', id, warn + resp.content, resp.type, resp.miniChart);
      return;
    }
  }

  // Fallback to local structured engine when no API key is set
  setTimeout(()=>{
    removeAIPageTyping();
    const resp=buildStructuredResponse(text);
    const id='ans-'+(++answerCount);
    const tip = `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:4px;"><span>⚡ FurBuddy Offline Engine</span><a href="#" onclick="openGeminiKeyModal();return false;" style="color:var(--accent);text-decoration:none;">Connect Gemini Key ⚙️</a></div>`;
    addAIPageMsg('ai',id,tip+resp.content,resp.type,resp.miniChart);
  },600+Math.random()*400);
}

function addAIPageMsg(role,id,content,type='',miniChart=null){
  const container=document.getElementById('ai-page-messages');
  if(!container)return;
  const ts=new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
  const div=document.createElement('div');
  div.className=`ai-msg ${role}`;
  if(id)div.id=id;

  const chartId=id?`mini-chart-${id}`:'';
  const chartHtml=miniChart&&chartId?`<div class="mini-chart-wrap"><canvas id="${chartId}" height="100"></canvas></div>`:'';
  const feedbackHtml=(role==='ai'&&id&&type!=='welcome'&&type!=='privacy'&&type!=='out-of-scope')?`
    <div class="ai-feedback" id="fb-${id}">
      <button class="fb-btn helpful" onclick="recordFeedback('${id}',true)">👍 Helpful</button>
      <button class="fb-btn not-helpful" onclick="recordFeedback('${id}',false)">👎 Not Helpful</button>
    </div>
    <div class="fb-followup" id="fb-followup-${id}" style="display:none">
      <div class="fb-followup-label">What was wrong?</div>
      <div class="fb-followup-chips">
        <div class="fb-chip" onclick="recordFeedbackDetail('${id}','Too vague')">Too vague</div>
        <div class="fb-chip" onclick="recordFeedbackDetail('${id}','Wrong data')">Wrong data</div>
        <div class="fb-chip" onclick="recordFeedbackDetail('${id}','Missed my question')">Missed my question</div>
        <div class="fb-chip" onclick="recordFeedbackDetail('${id}','Other')">Other</div>
      </div>
    </div>`:'';

  div.innerHTML=`
    <div class="ai-msg-avatar ${role}">${role==='ai'?'🤖':'👤'}</div>
    <div class="ai-msg-body">
      <div class="ai-msg-bubble ${type}">${content}${chartHtml}</div>
      <div class="ai-msg-time">${ts}</div>
      ${feedbackHtml}
    </div>`;
  container.appendChild(div);
  container.scrollTop=container.scrollHeight;

  if(miniChart&&chartId){
    setTimeout(()=>{
      const canvas=document.getElementById(chartId);
      if(!canvas)return;
      try{new Chart(canvas.getContext('2d'),miniChart);}catch(e){}
    },100);
  }
}

function addAIPageTyping(){
  const container=document.getElementById('ai-page-messages');
  if(!container)return;
  const div=document.createElement('div');
  div.className='ai-msg ai';div.id='ai-typing';
  div.innerHTML=`<div class="ai-msg-avatar ai">🤖</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  container.appendChild(div);container.scrollTop=container.scrollHeight;
}
function removeAIPageTyping(){document.getElementById('ai-typing')?.remove();}

window.recordFeedback=function(id,helpful){
  const fb=document.getElementById('fb-'+id);
  if(helpful){
    if(fb)fb.innerHTML='<span style="color:var(--accent4);font-size:12px">✓ Thanks for the feedback!</span>';
    feedbackStore.push({id,helpful:true,ts:Date.now()});
  } else {
    const followup=document.getElementById('fb-followup-'+id);
    if(fb){fb.querySelector('.helpful').disabled=true;fb.querySelector('.not-helpful').style.background='rgba(239,68,68,0.2)';}
    if(followup)followup.style.display='block';
  }
  localStorage.setItem('mfc_ai_feedback',JSON.stringify(feedbackStore));
};

window.recordFeedbackDetail=function(id,reason){
  feedbackStore.push({id,helpful:false,reason,ts:Date.now()});
  localStorage.setItem('mfc_ai_feedback',JSON.stringify(feedbackStore));
  const followup=document.getElementById('fb-followup-'+id);
  if(followup)followup.innerHTML='<span style="color:var(--text-secondary);font-size:12px">📝 Noted — thank you! We\'ll improve responses for this topic.</span>';
};

/* ═══════════════════════════════════════════════════
   INTENT CLASSIFIER — keyword/synonym routing
═══════════════════════════════════════════════════ */
const INTENT_MAP=[
  {intent:'privacy',    patterns:[/customer.*(name|identify|who|which customer|personal|private)/i,/employee.*(name|identify|personal|private|salary)/i,/who ordered/i,/who is customer/i,/tell me about customer \d/i,/staff.*pay$/i]},
  {intent:'greeting',   patterns:[/^(hi|hello|hey|good\s(morning|afternoon|evening))\b/i,/what can you do/i,/help me/i]},
  {intent:'summary',    patterns:[/summary|overview|snapshot|how are we doing|overall performance|kpi|metrics|show me everything/i]},
  {intent:'win_rate',   patterns:[/win rate|win ratio|conversion rate|acceptance rate|how many (orders were |were )delivered|success rate|order success/i]},
  {intent:'lost',       patterns:[/lost|why (are we |did we |do we )?los(ing|e)|rejected|rejection|didn.t win|not winning|where did we fail/i]},
  {intent:'revenue',    patterns:[/revenue|income|sales total|how much (did we make|money|income)|earnings|total (revenue|sales)/i]},
  {intent:'profit',     patterns:[/profit|margin|net profit|profitab|p&l|pnl|how profitable|are we making money|loss/i]},
  {intent:'costs',      patterns:[/cost|spend|expenses|outgoing|overhead|how much (did we spend|spent)|wages cost|material cost/i]},
  {intent:'delivery',   patterns:[/deliver|on.time|late order|delay|overdue|delivery performance|on time/i]},
  {intent:'production', patterns:[/production|bottleneck|hours|manufacturing|stage|milling|joinery|design hours|finishing|workshop|process/i]},
  {intent:'hr',         patterns:[/staff|employee|hr|turnover|resign|workforce|team|capacity|who left|headcount|talent/i]},
  {intent:'inventory',  patterns:[/inventor|stock|material|wood|walnut|oak|ash|reorder|material level|supply/i]},
  {intent:'product',    patterns:[/best product|worst product|top product|compare product|which product|product performance|most (popular|ordered|profitable)/i]},
  {intent:'forecast',   patterns:[/forecast|predict|future|next month|next quarter|trend|projection|will we|going forward|what.*expect/i]},
  {intent:'correlation',patterns:[/why|what drives|what affect|correlation|relationship|what causes|factor|driver|associated with/i]},
  {intent:'out_of_scope',patterns:[/weather|stock market|competitor|amazon|politics|news|sport/i]},
];

function classifyIntent(query){
  for(const{intent,patterns}of INTENT_MAP){
    if(patterns.some(p=>p.test(query)))return intent;
  }
  return'summary';
}

/* ═══════════════════════════════════════════════════
   ASSUMPTION CHECKER
═══════════════════════════════════════════════════ */
const ASSUMPTION_CHECKS={
  forecast:{check:()=>false,warning:''},
  correlation:{check:()=>(DATA.orders||[]).length<200,warning:'⚠️ <strong>Assumption flagged:</strong> Correlation analysis works best with large samples. With fewer than 200 orders, these relationships may not be statistically significant. Use as hypotheses, not conclusions.'},
  hr:{check:()=>(DATA.hrRoster||[]).length<10,warning:'⚠️ <strong>Assumption flagged:</strong> The HR dataset is small. Turnover patterns may not be representative.'},
  lost:{check:()=>!(DATA.orders||[]).some(o=>o.lostReason||o.rejectionReason),warning:'⚠️ <strong>Assumption flagged:</strong> Your dataset does not contain a loss-reason or rejection-reason field. I can show <em>where</em> orders were lost (by product/price), but not <em>why</em> customers declined — that would require a CRM or follow-up survey.'},
};

function getAssumptionWarning(intent){
  const check=ASSUMPTION_CHECKS[intent];
  if(check&&check.check())return check.warning;
  return null;
}

/* ═══════════════════════════════════════════════════
   STRUCTURED RESPONSE BUILDER
═══════════════════════════════════════════════════ */
function buildStructuredResponse(query){
  const m=METRICS;
  const intent=classifyIntent(query);

  // Privacy guardrail — intercept before anything else
  if(intent==='privacy'){
    return{type:'privacy',content:`
      <div class="ai-block privacy-block">
        <div class="block-icon">🔒</div>
        <div class="block-text">
          <strong>Privacy Guardrail</strong><br>
          I can't share individual customer or employee identities — this includes names, specific customer IDs, or personal salary details.<br><br>
          I can help with <strong>aggregate patterns</strong> instead. Would you like to see:
          <div class="ai-q-chips" style="margin-top:8px">
            <div class="ai-q-chip" onclick="askSuggestion(this)">Which product has the best win rate?</div>
            <div class="ai-q-chip" onclick="askSuggestion(this)">Show me the financial summary</div>
          </div>
        </div>
      </div>`,miniChart:null};
  }

  // Out of scope
  if(intent==='out_of_scope'){
    return{type:'out-of-scope',content:`
      <div class="ai-block out-scope-block">
        <div class="block-icon">🚫</div>
        <div class="block-text"><strong>Out of Scope</strong><br>That question falls outside my dataset. I only have access to MFC's operational data: orders, finances, HR, inventory, and production. I can't answer questions about external topics.</div>
      </div>`,miniChart:null};
  }

  // Greeting
  if(intent==='greeting'){
    return{type:'welcome',content:`👋 <strong>Hi! I'm FurBuddy</strong>, MFC's Generative AI analytics agent.<br><br>I can answer questions about:<br>• 📜 <strong>Past:</strong> orders, revenue, HR, inventory history<br>• ⚡ <strong>Present:</strong> production stages, current stock<br>• 🔮 <strong>Future:</strong> trends, forecasts, risk<br><br>Pick a question from the right panel or ask me anything!`,miniChart:null};
  }

  // Get assumption warning
  const warning=getAssumptionWarning(intent);

  // Build structured answer
  let evidence='',interpretation='',action='',limitation='',miniChart=null;

  if(intent==='win_rate'){
    const best=m.productTypes.reduce((b,pt)=>m.byProduct[pt].winRate>m.byProduct[b].winRate?pt:b,m.productTypes[0]);
    const worst=m.productTypes.reduce((b,pt)=>m.byProduct[pt].winRate<m.byProduct[b].winRate?pt:b,m.productTypes[0]);
    evidence=`Overall win rate: <strong>${fmtPct(m.winRate)}</strong> (${m.delivered} of ${m.totalOrders} orders delivered). Best: <strong>${best}</strong> at ${fmtPct(m.byProduct[best].winRate)}. Worst: <strong>${worst}</strong> at ${fmtPct(m.byProduct[worst].winRate)}.`;
    interpretation=`MFC converts roughly 2 in 5 inquiries into sales. The variance across products suggests pricing or complexity differences are affecting acceptance.`;
    action=`Focus sales effort on <strong>${best}</strong> (highest win rate). Investigate why <strong>${worst}</strong> loses more — consider pricing review or complexity reduction.`;
    limitation=`Win rate is calculated on all historical orders. It doesn't reflect seasonal patterns or whether lost orders were price-sensitive vs. capacity-related.`;
    miniChart={type:'bar',data:{labels:m.productTypes,datasets:[{label:'Win Rate %',data:m.productTypes.map(pt=>m.byProduct[pt].winRate),backgroundColor:m.productTypes.map(pt=>hexAlpha(COLORS.green,0.3+m.byProduct[pt].winRate/200)),borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b9ec7',font:{size:9}}},y:{ticks:{color:'#8b9ec7',font:{size:9},callback:v=>v.toFixed(0)+'%'}}}}};
  }
  else if(intent==='lost'){
    const worst=m.productTypes.reduce((b,pt)=>m.byProduct[pt].winRate<m.byProduct[b].winRate?pt:b,m.productTypes[0]);
    const lostByPt=m.productTypes.map(pt=>({pt,lost:m.byProduct[pt].lost})).sort((a,b)=>b.lost-a.lost);
    evidence=`MFC lost <strong>${m.lost}</strong> of ${m.totalOrders} orders (${fmtPct(m.lost/m.totalOrders*100)} loss rate). Most lost: <strong>${lostByPt[0].pt}</strong> (${lostByPt[0].lost} orders). Lowest win rate: <strong>${worst}</strong> at ${fmtPct(m.byProduct[worst].winRate)}.`;
    interpretation=`High-volume products like ${lostByPt[0].pt} naturally accumulate more absolute losses, but the win-rate view reveals which products are structurally harder to convert.`;
    action=`Prioritise a pricing or value-proposition review for <strong>${worst}</strong>. Compare quote prices against delivered orders to identify price sensitivity thresholds.`;
    limitation=`The data contains no customer rejection reason — we can show where losses occur but not the customer's stated reason for declining.`;
    miniChart={type:'bar',data:{labels:m.productTypes,datasets:[{label:'Lost Orders',data:m.productTypes.map(pt=>m.byProduct[pt].lost),backgroundColor:hexAlpha(COLORS.red,0.7),borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b9ec7',font:{size:9}}},y:{ticks:{color:'#8b9ec7',font:{size:9}}}}}};
  }
  else if(intent==='revenue'){
    const topMon=Object.entries(m.monthlyFinance).sort((a,b)=>b[1].rev-a[1].rev)[0];
    evidence=`Total revenue: <strong>${fmtK(m.totalRev)}</strong>. Peak month: <strong>${monLabel(topMon[0])}</strong> at ${fmtK(topMon[1].rev)}. Revenue comes entirely from delivered orders.`;
    interpretation=`Revenue is driven by order volume × quote price. Improving win rate or increasing average quote price are the two primary levers.`;
    action=`Review pricing strategy for high-volume products. Even a 5% quote price increase on ${m.productTypes[0]} orders (most popular) would materially impact revenue.`;
    limitation=`Revenue is recognised at quote price — actual cash flow depends on payment terms not captured in this dataset.`;
    const months=Object.keys(m.monthlyFinance).sort();
    miniChart={type:'line',data:{labels:months.map(monLabel),datasets:[{label:'Revenue',data:months.map(mo=>m.monthlyFinance[mo].rev),borderColor:COLORS.cyan,backgroundColor:hexAlpha(COLORS.cyan,0.15),borderWidth:2,tension:0.4,fill:true,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b9ec7',font:{size:9}}},y:{ticks:{color:'#8b9ec7',font:{size:9},callback:v=>fmtK(v)}}}}};
  }
  else if(intent==='profit'){
    evidence=`Net profit: <strong style="color:${m.netProfit>=0?'var(--accent4)':'var(--accent-red)'}">${fmtK(m.netProfit)}</strong> (${fmtPct(m.profitMargin)} margin). Revenue: ${fmtK(m.totalRev)}, Costs: ${fmtK(m.totalCost)}.`;
    interpretation=`A ${fmtPct(m.profitMargin)} margin is ${m.profitMargin<5?'critically thin — MFC is barely covering its cost base':'below typical manufacturing benchmarks of 10–15%'}. Cost control is as important as revenue growth.`;
    action=`Target the top cost driver (${m.wagesTotal>m.overheadsTotal?'wages':'overheads'} at ${fmtK(m.wagesTotal>m.overheadsTotal?m.wagesTotal:m.overheadsTotal)}). Reducing joinery bottleneck hours could reduce per-order labour cost without cutting headcount.`;
    limitation=`This analysis uses total costs and revenue. Without per-order cost allocation, we can't identify which specific orders are loss-making.`;
    miniChart={type:'doughnut',data:{labels:['Wages','Overheads','Materials','Other'],datasets:[{data:[m.wagesTotal,m.overheadsTotal,m.materialCostTotal,m.otherCosts],backgroundColor:[hexAlpha(COLORS.amber,0.8),hexAlpha(COLORS.purple,0.8),hexAlpha(COLORS.blue,0.8),hexAlpha(COLORS.green,0.8)],borderColor:'transparent'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{color:'#8b9ec7',font:{size:9}}}}}};
  }
  else if(intent==='costs'){
    evidence=`Total costs: <strong>${fmtK(m.totalCost)}</strong>. Breakdown — Wages: ${fmtK(m.wagesTotal)}, Overheads: ${fmtK(m.overheadsTotal)}, Materials: ${fmtK(m.materialCostTotal)}.`;
    interpretation=`Wages are ${(m.wagesTotal/m.totalCost*100).toFixed(1)}% of total costs — typical for craft manufacturing. High staff turnover (${fmtPct(m.resignedStaff/Math.max(m.totalStaff,1)*100)}) means recruitment and training costs are likely not captured here.`;
    action=`Stabilise the workforce to reduce hidden turnover costs. Review material reorder quantities — bulk ordering may reduce unit material costs.`;
    limitation=`Cost data is from the financial ledger only. Opportunity costs (lost orders due to capacity) are not included.`;
  }
  else if(intent==='delivery'){
    evidence=`On-time delivery rate: <strong>${fmtPct(m.onTimePct)}</strong> (${m.onTimeCount} on time, ${m.lateCount} late out of ${m.delivered} delivered orders).`;
    interpretation=`${m.onTimePct>85?'Delivery performance is solid':'Delivery performance needs improvement'} but late deliveries are concentrated — likely linked to joinery bottlenecks (avg ${fmtNum(m.avgJoinH)}h) and reduced workforce capacity.`;
    action=`Prioritise joinery capacity — either cross-train makers or restructure joinery workflow. Flag high-complexity orders (complexity ≥ 4) for extended lead times at quoting stage.`;
    limitation=`"Late" is determined by the deliveryStatus field. We don't have the original promised delivery date, so lateness measurement may not account for agreed extensions.`;
    miniChart={type:'doughnut',data:{labels:['On Time','Late'],datasets:[{data:[m.onTimeCount,m.lateCount],backgroundColor:[hexAlpha(COLORS.green,0.8),hexAlpha(COLORS.red,0.8)],borderColor:'transparent'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{color:'#8b9ec7',font:{size:9}}}}}};
  }
  else if(intent==='production'){
    evidence=`Average stage hours — Design: ${fmtNum(m.avgDesignH)}h, Milling: ${fmtNum(m.avgMillingH)}h, Joinery: <strong>${fmtNum(m.avgJoinH)}h</strong>, Finishing: ${fmtNum(m.avgFinH)}h. Joinery is the longest stage.`;
    interpretation=`Joinery is the production bottleneck. Delays here cascade into late deliveries. The second highest stage is ${m.avgDesignH>m.avgMillingH&&m.avgDesignH>m.avgFinH?'Design':'Milling'}.`;
    action=`Cross-train 1-2 staff members in joinery techniques. Consider batching similar joinery tasks to reduce setup time. Review joinery specs for the most common product types.`;
    limitation=`Hours data is per-order averages. Without timestamps, we can't identify whether delays happen due to queuing vs. actual task duration.`;
    miniChart={type:'bar',data:{labels:['Design','Milling','Joinery','Finishing'],datasets:[{label:'Avg Hours',data:[m.avgDesignH,m.avgMillingH,m.avgJoinH,m.avgFinH],backgroundColor:[hexAlpha(COLORS.blue,0.75),hexAlpha(COLORS.cyan,0.75),hexAlpha(COLORS.purple,0.9),hexAlpha(COLORS.amber,0.75)],borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b9ec7',font:{size:9}}},y:{ticks:{color:'#8b9ec7',font:{size:9}}}}}};
  }
  else if(intent==='hr'){
    evidence=`${m.activeStaff} of ${m.totalStaff} staff remain active — <strong>${m.resignedStaff} resigned</strong> (${fmtPct(m.resignedStaff/Math.max(m.totalStaff,1)*100)} turnover). Active: ${DATA.hrRoster.filter(r=>r.role==='designer'&&r.status==='Active').length} designers, ${DATA.hrRoster.filter(r=>r.role==='maker'&&r.status==='Active').length} makers.`;
    interpretation=`A ${fmtPct(m.resignedStaff/Math.max(m.totalStaff,1)*100)} turnover rate is significantly above the 15% manufacturing industry benchmark. This is likely contributing directly to delivery delays and joinery bottlenecks.`;
    action=`Conduct exit-interview analysis (if available). Prioritise retention of high-skill makers — their departure has the highest operational impact. Consider wage benchmarking.`;
    limitation=`The HR dataset records status (Active/Resigned) but not resignation dates or reasons, limiting root-cause analysis of the turnover pattern.`;
    miniChart={type:'doughnut',data:{labels:['Active','Resigned'],datasets:[{data:[m.activeStaff,m.resignedStaff],backgroundColor:[hexAlpha(COLORS.green,0.8),hexAlpha(COLORS.red,0.8)],borderColor:'transparent'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{color:'#8b9ec7',font:{size:9}}}}}};
  }
  else if(intent==='inventory'){
    const lowStock=m.materialsList.filter(mat=>m.invByMaterial[mat].currentLevel<5);
    const topC=m.materialsList.reduce((b,mat)=>m.invByMaterial[mat].totalConsumed>m.invByMaterial[b].totalConsumed?mat:b,m.materialsList[0]);
    evidence=`${m.materialsList.length} materials tracked. Current stock: ${m.materialsList.map(mat=>`${mat}: ${m.invByMaterial[mat].currentLevel}m³`).join(', ')}. Most consumed: <strong>${topC}</strong> (${m.invByMaterial[topC].totalConsumed}m³ total). Total reorders: ${m.totalReorderEvents}.`;
    interpretation=`${lowStock.length?`<strong>${lowStock.join(', ')}</strong> ${lowStock.length===1?'is':'are'} below 5m³ — consider this a reorder trigger`:'Stock levels appear adequate'}. Consumption patterns can forecast when restocking is needed.`;
    action=`Set automatic reorder alerts at 5m³ threshold for all materials. Review reorder quantities — over-ordering ties up cash while under-ordering risks production stoppages.`;
    limitation=`Inventory data shows quantities but not dollar value of stock. Cost of holding inventory is not captured.`;
    miniChart={type:'bar',data:{labels:m.materialsList,datasets:[{label:'Current Stock (m³)',data:m.materialsList.map(mat=>m.invByMaterial[mat].currentLevel),backgroundColor:m.materialsList.map(mat=>hexAlpha(m.invByMaterial[mat].currentLevel<5?COLORS.red:COLORS.green,0.75)),borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b9ec7',font:{size:9}}},y:{ticks:{color:'#8b9ec7',font:{size:9}}}}}};
  }
  else if(intent==='product'){
    const best=m.productTypes.reduce((b,pt)=>m.byProduct[pt].winRate>m.byProduct[b].winRate?pt:b,m.productTypes[0]);
    const highRev=m.productTypes.reduce((b,pt)=>m.byProduct[pt].revenue>m.byProduct[b].revenue?pt:b,m.productTypes[0]);
    evidence=`Best win rate: <strong>${best}</strong> (${fmtPct(m.byProduct[best].winRate)}). Highest revenue: <strong>${highRev}</strong> (${fmtK(m.byProduct[highRev].revenue)}). Full breakdown: ${m.productTypes.map(pt=>`${pt}: ${fmtPct(m.byProduct[pt].winRate)} win / ${fmtK(m.byProduct[pt].revenue)} revenue`).join(' | ')}.`;
    interpretation=`${best} is the safest product to quote — highest conversion. ${highRev} generates the most absolute revenue${best===highRev?' and is also the easiest to win':' but may have lower conversion'}.`;
    action=`Prioritise quoting and fulfilment capacity for <strong>${best}</strong>. For revenue maximisation, also prioritise <strong>${highRev}</strong>. Deprioritise or re-price ${m.productTypes.find(pt=>m.byProduct[pt].winRate===Math.min(...m.productTypes.map(pt=>m.byProduct[pt].winRate))||'low-win products')}`;
    limitation=`Product analysis is based on historical order outcomes. It does not account for market demand elasticity or future order mix.`;
    miniChart={type:'bar',data:{labels:m.productTypes,datasets:[{label:'Revenue ($)',data:m.productTypes.map(pt=>m.byProduct[pt].revenue),backgroundColor:m.productTypes.map((_,i)=>hexAlpha(PALETTE[i%PALETTE.length],0.75)),borderRadius:5,borderSkipped:false,yAxisID:'y'},{label:'Win Rate %',data:m.productTypes.map(pt=>m.byProduct[pt].winRate),type:'line',borderColor:COLORS.amber,pointBackgroundColor:COLORS.amber,borderWidth:2,pointRadius:4,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8b9ec7',font:{size:9}}}},scales:{x:{ticks:{color:'#8b9ec7',font:{size:9}}},y:{type:'linear',position:'left',ticks:{color:'#8b9ec7',font:{size:9},callback:v=>fmtK(v)}},y1:{type:'linear',position:'right',ticks:{color:'#8b9ec7',font:{size:9},callback:v=>v.toFixed(0)+'%'},grid:{drawOnChartArea:false}}}}};
  }
  else if(intent==='forecast'){
    const months=Object.keys(m.monthlyFinance).sort();
    const revData=months.map(mo=>m.monthlyFinance[mo].rev);
    const n=revData.length,mx=(n-1)/2,my=revData.reduce((a,b)=>a+b)/n;
    let num=0,den=0;revData.forEach((y,x)=>{num+=(x-mx)*(y-my);den+=(x-mx)**2;});
    const slope=den?num/den:0,intercept=my-slope*mx;
    const proj=slope*(n)+intercept;
    const dir=slope>0?'upward':'downward';
    evidence=`Revenue trend is <strong>${dir}</strong> at ~${fmtK(Math.abs(slope))}/month. Projected next month: <strong>${fmtK(proj)}</strong>. Based on ${n} months of data (${monLabel(months[0])} to ${monLabel(months[months.length-1])}).`;
    interpretation=`The ${dir} trend ${slope>0?'suggests growing demand or improving conversion':'may indicate seasonal softness or market headwinds'}. Win rate trend over the same period: ${Object.values(m.monthlyWinRate).slice(-3).map(v=>fmtPct(v)).join(' → ')}.`;
    action=`${slope>0?'Capitalise on momentum by increasing quoting capacity and ensuring stock levels support higher order volume.':'Investigate recent months for structural issues — review whether pricing, staff capacity, or material availability are contributing to the decline.'}`;
    limitation=`⚠️ <strong>Dataset covers 24 full months (Jan 2025 – Dec 2026).</strong> Projections beyond 3-6 months carry increasing uncertainty and assume macro conditions remain stable.`;
  }
  else if(intent==='correlation'){
    const orders=DATA.orders||[];
    const delivered=orders.map(o=>o.status==='DELIVERED'?1:0);
    const quotes=orders.map(o=>o.quotePrice||0);
    const complexity=orders.map(o=>o.complexity||0);
    function pearson(xs,ys){const n=xs.length;if(!n)return 0;const mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;let num=0,dx=0,dy=0;for(let i=0;i<n;i++){num+=(xs[i]-mx)*(ys[i]-my);dx+=(xs[i]-mx)**2;dy+=(ys[i]-my)**2;}return dx&&dy?num/Math.sqrt(dx*dy):0;}
    const rPrice=pearson(quotes,delivered),rComplex=pearson(complexity,delivered);
    evidence=`Quote price vs win rate: r = <strong>${rPrice.toFixed(2)}</strong> (${Math.abs(rPrice)>0.3?'moderate':'weak'} negative — higher prices correlate with lower win rates). Complexity vs win rate: r = <strong>${rComplex.toFixed(2)}</strong>.`;
    interpretation=`Price sensitivity appears to be the strongest driver of order conversion. This suggests MFC's pricing is at or above the market threshold for some customers.`;
    action=`Test a small pricing experiment — offer 5% discounts on high-complexity orders to see if conversion improves. Use the <strong>Correlation Drivers</strong> page for the full ranked view.`;
    limitation=`Correlation coefficients show association, not causation. Confounding factors (customer segment, product type, time of year) are not controlled for here.`;
  }
  else {
    // Default summary
    const best=m.productTypes.reduce((b,pt)=>m.byProduct[pt].winRate>m.byProduct[b].winRate?pt:b,m.productTypes[0]);
    evidence=`Win rate: <strong>${fmtPct(m.winRate)}</strong> · Revenue: <strong>${fmtK(m.totalRev)}</strong> · Net profit: <strong>${fmtK(m.netProfit)}</strong> (${fmtPct(m.profitMargin)} margin) · On-time delivery: <strong>${fmtPct(m.onTimePct)}</strong> · Active staff: <strong>${m.activeStaff}/${m.totalStaff}</strong>.`;
    interpretation=`MFC is operationally functional but has three compounding pressures: ${m.profitMargin<10?'thin profit margins, ':''}high staff turnover (${fmtPct(m.resignedStaff/Math.max(m.totalStaff,1)*100)}), and a joinery bottleneck (${fmtNum(m.avgJoinH)}h avg).`;
    action=`Focus on the three highest-impact levers: (1) Retain skilled makers, (2) Optimise joinery workflow, (3) Review pricing for low-win products. Use the <strong>Correlation Drivers</strong> page to validate these priorities.`;
    limitation=`This summary aggregates all time periods. Drill into specific sections for period-specific or product-specific insights.`;
  }

  // Build structured content HTML
  const warningHtml=warning?`<div class="ai-assumption-warning">${warning}</div>`:'';
  const content=`${warningHtml}
    <div class="ai-structured">
      <div class="ai-block evidence-block"><div class="block-label">📊 Evidence</div><div class="block-text">${evidence}</div></div>
      ${interpretation?`<div class="ai-block interpretation-block"><div class="block-label">💡 Interpretation</div><div class="block-text">${interpretation}</div></div>`:''}
      ${action?`<div class="ai-block action-block"><div class="block-label">✅ Recommended Action</div><div class="block-text">${action}</div></div>`:''}
      ${limitation?`<div class="ai-block limitation-block"><div class="block-label">⚠️ Limitation</div><div class="block-text">${limitation}</div></div>`:''}
    </div>`;

  return{type:intent,content,miniChart};
}

/* ═══════════════════════════════════════════════════
   FURBUDDY FAB (mini chat — shortcut from other pages)
═══════════════════════════════════════════════════ */
let furnicoFABInited=false;
function initFurnicoFAB(){
  if(furnicoFABInited)return;
  furnicoFABInited=true;
  document.getElementById('furnico-fab-btn').addEventListener('click',toggleFurnico);
  document.getElementById('furnico-close').addEventListener('click',closeFurnico);
  document.getElementById('fcp-send').addEventListener('click',sendFurnicoFABMsg);
  document.getElementById('fcp-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendFurnicoFABMsg();}});
  setTimeout(()=>addFCPMsg('ai','👋 Quick questions? Ask FurBuddy here, or open <strong>Ask AI</strong> for full generative answers.'),600);
}
function toggleFurnico(){const p=document.getElementById('furnico-chat-panel'),f=document.getElementById('furnico-fab');p.classList.toggle('open');f.classList.toggle('chat-open');}
function closeFurnico(){document.getElementById('furnico-chat-panel').classList.remove('open');document.getElementById('furnico-fab').classList.remove('chat-open');}

function addFCPMsg(role,html){
  const c=document.getElementById('fcp-messages');if(!c)return;
  const d=document.createElement('div');d.className=`msg ${role}`;
  const ts=new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
  d.innerHTML=`<div class="msg-avatar ${role}">${role==='ai'?'🤖':'👤'}</div><div><div class="msg-bubble">${html}</div><div class="msg-time">${ts}</div></div>`;
  c.appendChild(d);c.scrollTop=c.scrollHeight;
}

async function sendFurnicoFABMsg(){
  const input=document.getElementById('fcp-input');if(!input)return;
  const text=input.value.trim();if(!text)return;
  input.value='';
  if(!document.getElementById('furnico-chat-panel').classList.contains('open'))toggleFurnico();
  addFCPMsg('user',text);
  const d=document.createElement('div');d.className='msg ai';d.id='fcp-typing';
  d.innerHTML=`<div class="msg-avatar ai">🤖</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  document.getElementById('fcp-messages').appendChild(d);

  if (GEMINI_API_KEY) {
    try {
      const geminiRes = await callGeminiAPI(text);
      document.getElementById('fcp-typing')?.remove();
      const modelName = (geminiRes.model || 'Gemini').toUpperCase();
      addFCPMsg('ai', `<div style="font-size:10px;color:#10b981;font-weight:700;margin-bottom:4px;">✨ ${modelName}</div>${geminiRes.text}<br><a href="#" onclick="navigateTo('ask-ai');closeFurnico();return false;" style="color:var(--accent);font-size:11px;display:inline-block;margin-top:6px;">Open in Ask AI tab →</a>`);
      return;
    } catch (e) {
      console.warn('FAB Gemini error:', e);
    }
  }

  setTimeout(()=>{
    document.getElementById('fcp-typing')?.remove();
    const resp=buildStructuredResponse(text);
    const evidenceMatch=resp.content.match(/📊 Evidence<\/div><div class="block-text">(.*?)<\/div>/s);
    const evidenceText=evidenceMatch?evidenceMatch[1]:'See Ask AI tab for full answer.';
    addFCPMsg('ai',`${evidenceText}<br><br><a href="#" onclick="navigateTo('ask-ai');closeFurnico();askSuggestion({textContent:'${text.replace(/'/g,'')}'});return false;" style="color:var(--accent);font-size:11px">→ Full answer in Ask AI tab</a>`);
  },600);
}

window.sendFurnicoSuggestion=function(el){
  const input=document.getElementById('fcp-input');if(input){input.value=el.textContent;sendFurnicoFABMsg();}
};

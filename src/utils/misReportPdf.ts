// src/utils/misReportPdf.ts
//
// "Download PDF" for the Daily MIS Report — the app's version of the web
// admin's MIS_Report_<Branch>_<date>.pdf.
//
// Built from the same GET /v1/MISReport/get?bId=…&date=… response the web
// prints from (HAR-confirmed 2026-10-08: the web renders the PDF in the
// browser from that JSON — there is no server-side PDF endpoint). Sections,
// labels, field mapping and colours are ported from the web's print view, so
// both files read the same. Like utils/assessmentPdf.ts it is a printed
// document, so it copies the web printout's look, not the app's screen styling.
//
// Differences on purpose: the web's "All departments" table runs off the right
// edge of the page and its pages are cut to content height; here everything
// fits A4 width and each section group starts a new A4 page.

import { scaleCssPx } from './printScale';
import { generatePDF } from 'react-native-html-to-pdf';
import { openPdf } from './openPdf';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const esc = (v: any) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** 6422020 → "6,422,020.00" (the web's en-PK 2-decimal format). */
const money = (v: any) => {
  const n = Number(v ?? 0) || 0;
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${group(i)}.${d}`;
};
/** 1016 → "1,016". */
const count = (v: any) => {
  const n = Math.round(Number(v ?? 0) || 0);
  return `${n < 0 ? '-' : ''}${group(String(Math.abs(n)))}`;
};

// Dates are read straight off the "YYYY-MM-DD[THH:mm]" strings rather than via
// Date(), so the device's timezone can't shift them a day.
const parts = (v: any) => {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  return m ? { y: +m[1], mo: +m[2], d: +m[3], hh: m[4], mm: m[5] } : null;
};
const pad = (n: number) => String(n).padStart(2, '0');
/** "2026-10-08" → "08 Oct 2026". */
const dMonY = (v: any) => {
  const p = parts(v);
  return p ? `${pad(p.d)} ${MONTHS[p.mo - 1]} ${p.y}` : '';
};
/** "2026-10-08" → "Thursday, 08 October 2026". */
const longDate = (v: any) => {
  const p = parts(v);
  if (!p) return '';
  const dow = DAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()];
  return `${dow}, ${pad(p.d)} ${MONTHS_LONG[p.mo - 1]} ${p.y}`;
};
/** "2026-10-08T14:02:30+05:00" → "08 Oct 2026, 14:02". */
const stamp = (v: any) => {
  const p = parts(v);
  return p ? `${dMonY(v)}${p.hh ? `, ${p.hh}:${p.mm}` : ''}` : '';
};
/** "2026-10-08" → "08-10-26". */
const shortDate = (v: any) => {
  const p = parts(v);
  return p ? `${pad(p.d)}-${pad(p.mo)}-${String(p.y).slice(2)}` : '—';
};

const BREAKUP: [string, string][] = [
  ['gym_new', 'Gym New'],
  ['gym_renew', 'Gym Existing / Renew'],
  ['pt_new', 'Personal Training New'],
  ['pt_renew', 'Personal Training Renew'],
  ['gx', 'GX Studio'],
  ['nutrition', 'Nutrition'],
  ['physio', 'Physio'],
  ['academy', 'Academy'],
  ['cafe', 'Café'],
  ['other', 'Other'],
];

const section = (title: string, body: string) =>
  `<div class="sec"><div class="sec-t">${title}</div>${body}</div>`;

const table = (head: [string, boolean?][], rows: string) =>
  `<table>${head.length ? `<thead><tr>${head.map(([h, num]) => `<th${num ? ' class="num"' : ''}>${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows}</tbody></table>`;

const kv = (label: string, value: string, num = true) =>
  `<tr><td>${label}</td><td${num ? ' class="num"' : ''}>${value}</td></tr>`;

const deptHead = (label: string) => `<tr class="dept"><td colspan="2">${label}</td></tr>`;

const kpi = (label: string, value: string, sub: string, blue = false) =>
  `<div class="kpi${blue ? ' blue' : ''}"><label>${label}</label><strong>${value}</strong><span>${sub}</span></div>`;

const bars = (items: { name: string; value: number }[], fmt: (v: any) => string, opts: { trend?: boolean; color?: string } = {}) => {
  const max = Math.max(1, ...items.map(i => Number(i.value) || 0));
  return items.map(i => `
    <div class="${opts.trend ? 'trend-row' : 'bar-row'}">
      <span class="bar-l">${esc(i.name)}</span>
      <div class="track"><div class="fill" style="width:${Math.min(100, ((Number(i.value) || 0) / max) * 100)}%;${opts.color ? `background:${opts.color}` : ''}"></div></div>
      <span class="bar-v">${fmt(i.value)}</span>
    </div>`).join('');
};

export const buildMISReportHtml = (data: Record<string, any>): string => {
  const meta = data.meta ?? {};
  const ex = data.executive ?? {};
  const ff = data.footfall ?? {};
  const hr = data.hr ?? {};
  const dep = data.departments ?? {};
  const bu = data.sales?.breakup_today ?? {};
  const today = data.sales?.today ?? {};
  const mtd = data.sales?.mtd ?? {};
  const cafe = data.cafe ?? {};
  const topToday: any[] = data.trainers?.top_today ?? [];
  const topMtd: any[] = data.trainers?.top_mtd ?? [];
  const oldest: any[] = data.membership?.oldest_active_packages ?? [];
  const byBranch: any[] = data.by_branch ?? [];
  const trend: any[] = data.trend ?? [];
  const leads = dep.social_leads ?? {};
  const fy = data.fiscal_year ?? {};
  const fyMonths: any[] = fy.monthly ?? [];
  const fyServices: any[] = fy.top_service_packages ?? fy.top_packages ?? [];
  const fyCafe: any[] = fy.top_cafe_products ?? [];
  const physio = dep.physio_detail ?? {};
  const nutri = dep.nutrition_detail ?? {};

  const branch = meta.branch_label || 'All Branches';
  const asOf = dMonY(meta.date);
  const footer = `<div class="foot"><span>Vostro World · ${esc(branch)} · Confidential management report</span><span>Generated ${stamp(meta.generated_at)}</span></div>`;

  const sum = (keys: string[]) => keys.reduce(
    (a, k) => ({ qty: a.qty + (Number(bu[k]?.qty) || 0), net: a.net + (Number(bu[k]?.net) || 0) }),
    { qty: 0, net: 0 },
  );
  const gym = sum(['gym_new', 'gym_renew']);
  const pt = sum(['pt_new', 'pt_renew']);
  const DASH = '—';
  const overview: { name: string; qty: any; todayNet: any; mtdNet: any; activity: string }[] = [
    { name: 'Gym membership', qty: gym.qty, todayNet: gym.net, mtdNet: DASH, activity: `${count(ex.active_gym_members)} gym active${asOf ? ` as of ${asOf}` : ''}` },
    { name: 'Personal training', qty: pt.qty, todayNet: pt.net, mtdNet: DASH, activity: `${count(hr.pt_staff_present)} trainers present` },
    { name: 'GX / Vitality studio', qty: bu.gx?.qty ?? 0, todayNet: bu.gx?.net ?? 0, mtdNet: DASH, activity: `${count(ff.studio_total)} studio check-ins` },
    { name: 'Nutrition', qty: bu.nutrition?.qty ?? 0, todayNet: bu.nutrition?.net ?? 0, mtdNet: dep.nutrition?.mtd_net ?? 0, activity: `${count(dep.nutrition?.appointments_today)} appointments` },
    { name: 'Physiotherapy', qty: bu.physio?.qty ?? 0, todayNet: bu.physio?.net ?? 0, mtdNet: dep.physio?.mtd_net ?? 0, activity: `${count(dep.physio?.appointments_today)} appointments` },
    { name: 'Fitness academy', qty: bu.academy?.qty ?? 0, todayNet: bu.academy?.net ?? 0, mtdNet: DASH, activity: 'Training programmes' },
    { name: 'Café', qty: bu.cafe?.qty ?? 0, todayNet: bu.cafe?.net ?? 0, mtdNet: ex.cafe_mtd_net, activity: `${count(cafe.meals)} meals · ${count(cafe.drinks)} drinks` },
    { name: 'Other sales', qty: bu.other?.qty ?? 0, todayNet: bu.other?.net ?? 0, mtdNet: DASH, activity: 'Misc. categories' },
    { name: 'Social / leads', qty: leads.leads_today ?? 0, todayNet: DASH, mtdNet: DASH, activity: `${count(leads.leads_today)} leads · ${count(leads.payments)} paid · ${count(leads.visit_completed)} visits` },
  ];

  const salesRow = (label: string, r: any = {}, total = false) =>
    `<tr${total ? ' class="total"' : ''}><td>${label}</td><td class="num">${r.qty ?? 0}</td><td class="num">${money(r.price)}</td><td class="num">${money(r.discount)}</td><td class="num">${money(r.tax)}</td><td class="num">${money(r.net)}</td></tr>`;
  const salesHead: [string, boolean?][] = [['Particulars'], ['Qty', true], ['Price', true], ['Discount', true], ['GST', true], ['Net', true]];

  const deptBars = BREAKUP
    .map(([k, label]) => ({ name: label.length > 22 ? `${label.slice(0, 20)}…` : label, value: Number(bu[k]?.net) || 0 }))
    .filter(i => i.value > 0);

  const staffOff = [...(hr.late_staff ?? []), ...(hr.absent_staff ?? []), ...(hr.leave_staff ?? [])].slice(0, 16);

  // ── Page 1: headline, overview, finance ──────────────────────────────────
  const page1 = `
    <div class="banner">
      <h1>VOSTRO WORLD (${esc(String(branch).toUpperCase())}) — DAILY MIS REPORT</h1>
      <p><strong>Report date:</strong> ${longDate(meta.date)} · <strong>Month to date:</strong> ${dMonY(meta.month_start)} – ${asOf}</p>
      <p>Sales net = price + tax (Detailed Sales Report). Discounts shown separately in sales tables.</p>
    </div>
    <div class="kpis">
      ${kpi('Today sales', `Rs ${money(ex.sales_today_net)}`, `Services ${money(ex.services_today_net)} · Café ${money(ex.cafe_today_net)}`)}
      ${kpi('Month sales', `Rs ${money(ex.sales_mtd_net)}`, `Services ${money(ex.services_mtd_net)} · Café ${money(ex.cafe_mtd_net)}`)}
      ${kpi('Today profit', `Rs ${money(ex.profit_today)}`, `Expenses today Rs ${money(ex.expenses_today)}`)}
      ${kpi(asOf ? `Active clients (${asOf})` : 'Active clients', count(ex.active_clients), `Any service · ${count(ex.active_packages)} lines · Gym ${count(ex.active_gym_members)}`)}
      ${kpi('Footfall', count(ff.total_checkins), `M/F ${count(ff.total_males)}/${count(ff.total_females)} · Absent paid ${count(ff.absent_paid_gym)}`)}
      ${kpi('Staff', `${count(hr.present)}/${count(hr.total_staff)}`, `Absent ${count(hr.absent)} · Late ${count(hr.late)} · Leave ${count(hr.leave_count)}`)}
    </div>
    ${section('All departments — overview', table(
      [['Department'], ['Today qty', true], ['Today net (Rs)', true], ['MTD / reference', true], ['Activity &amp; notes']],
      overview.map(r => `<tr>
        <td><strong>${r.name}</strong></td>
        <td class="num">${r.qty}</td>
        <td class="num">${r.todayNet === DASH ? DASH : money(r.todayNet)}</td>
        <td class="num">${r.mtdNet === DASH ? DASH : money(r.mtdNet)}</td>
        <td>${r.activity}</td></tr>`).join(''),
    ))}
    <div class="two">
      ${section('Finance', table([], [
        kv('Sales MTD (net)', `Rs ${money(ex.sales_mtd_net)}`),
        kv('Expenses MTD', `Rs ${money(ex.expenses_mtd)}`),
        kv('Expenses today', `Rs ${money(ex.expenses_today)}`),
        kv('Profit today', `Rs ${money(ex.profit_today)}`),
        kv('Pending expense approvals', count(ex.pending_expense_approvals)),
      ].join('')))}
      ${meta.is_all_branches && byBranch.length
        ? section('Branch comparison (today)', table(
          [['Branch'], ['Sales', true], ['Footfall', true], ['Staff', true]],
          byBranch.map(b => `<tr><td>${esc(b.branch_label)}</td><td class="num">${money(b.total_sales_today)}</td><td class="num">${count(b.totalCheckins)}</td><td class="num">${count(b.presentStaff)}</td></tr>`).join(''),
        ))
        : section('Membership snapshot', table([], [
          kv('Active clients (all services)', count(ex.active_clients)),
          kv('Active packages', count(ex.active_packages)),
          kv('Walk-ins / visitors', count(ff.visitors_walkins)),
        ].join('')))}
    </div>
    ${footer}`;

  // ── Page 2: sales tables + charts ────────────────────────────────────────
  const page2 = `
    ${section('Sales summary', table(salesHead, salesRow('Sales month-to-date', mtd) + salesRow('Today total', today, true)))}
    ${section('Daily sales breakup by department', table(salesHead,
      BREAKUP.map(([k, label]) => salesRow(label, bu[k])).join('') + salesRow('Grand total', today, true),
    ))}
    <div class="two">
      <div>
        <p class="chart-t">Sales by department (today net)</p>
        ${deptBars.length ? bars(deptBars, money) : '<p class="note">No sales in this period.</p>'}
      </div>
      <div>
        <p class="chart-t">Last 7 days — sales (Rs net)</p>
        ${trend.length ? bars(trend.map(t => ({ name: t.label, value: t.sales })), money, { trend: true }) : '<p class="note">No trend data</p>'}
      </div>
    </div>
    ${footer}`;

  // ── Page 3: footfall, café/HR/PT, trainers, packages, staff ──────────────
  const page3 = `
    <div class="two">
      ${section('Footfall', table([], [
        kv('Morning (7–12)', count(ff.morning)),
        kv('Afternoon (12–5)', count(ff.afternoon)),
        kv('Evening (5–11)', count(ff.evening)),
        kv('Total check-ins', count(ff.total_checkins)),
        kv('Females / males', `${count(ff.total_females)} / ${count(ff.total_males)}`),
        kv('Busiest / slowest', `${esc(ff.busiest_slot || DASH)} / ${esc(ff.slowest_slot || DASH)}`, false),
        kv('Absent paid (gym)', count(ff.absent_paid_gym)),
        kv('GX studio total', count(ff.studio_total)),
      ].join('')) + `<p class="chart-t">Footfall chart</p>${bars(
        [{ name: 'Morning', value: ff.morning }, { name: 'Afternoon', value: ff.afternoon }, { name: 'Evening', value: ff.evening }],
        count, { color: '#0f766e' },
      )}`)}
      ${section('Café · HR · Personal training', table([], [
        deptHead('Café'),
        kv('Net sales', `Rs ${money(cafe.net_today)}`),
        kv('Meals / drinks / sides', `${count(cafe.meals)} / ${count(cafe.drinks)} / ${count(cafe.sides)}`),
        deptHead('Human resources'),
        kv('Present / total', `${count(hr.present)} / ${count(hr.total_staff)}`),
        kv('Absent / late / leave', `${count(hr.absent)} / ${count(hr.late)} / ${count(hr.leave_count)}`),
        deptHead('Personal training'),
        kv('Trainers present', count(hr.pt_staff_present)),
        kv('PT new / renew (qty)', `${count(bu.pt_new?.qty)} / ${count(bu.pt_renew?.qty)}`),
      ].join('')))}
    </div>
    ${section('Top PT trainers — today &amp; month', table(
      [['Trainer'], ['Today qty', true], ['Today net', true], ['MTD qty', true], ['MTD net', true]],
      topMtd.length
        ? topMtd.map(t => {
          const td = topToday.find(x => x.trainer_id === t.trainer_id);
          return `<tr><td>${esc(t.trainer_name)}</td><td class="num">${td?.qty ?? 0}</td><td class="num">${money(td?.net ?? 0)}</td><td class="num">${t.qty}</td><td class="num">${money(t.net)}</td></tr>`;
        }).join('')
        : '<tr><td colspan="5">No PT sales this month</td></tr>',
    ))}
    <div class="two">
      ${section('Longest active packages', table(
        [['Client'], ['Started']],
        oldest.length
          ? oldest.slice(0, 8).map(p => `<tr><td>${esc(p.client_name)}<br/><span class="small">${esc(p.package_name)}</span></td><td>${shortDate(p.start_date)}</td></tr>`).join('')
          : '<tr><td colspan="2">No active packages</td></tr>',
      ))}
      ${section('Staff late / absent / leave', table(
        [['Name'], ['Status']],
        staffOff.length
          ? staffOff.map(s => `<tr><td>${esc(s.name)}<br/><span class="small">${esc(s.department)}</span></td><td>${esc(s.status)}</td></tr>`).join('')
          : '<tr><td colspan="2">All staff accounted for</td></tr>',
      ))}
    </div>
    ${footer}`;

  // ── Page 4: fiscal year ──────────────────────────────────────────────────
  const page4 = `
    <div class="banner blue">
      <h1>Fiscal year performance</h1>
      <p><strong>${esc(fy.label || 'Fiscal year')}</strong> · ${esc(fy.period_label || DASH)}</p>
      <p>Sales net and expenses by calendar month from fiscal year start through the selected report month (full months). Sales use Detailed Sales rules (price + tax).</p>
    </div>
    <div class="kpis">
      ${kpi('Period sales (net)', `Rs ${money(fy.totals?.sales_net)}`, `${count(fy.totals?.sales_qty)} transactions`, true)}
      ${kpi('Period expenses', `Rs ${money(fy.totals?.expenses)}`, 'Approved expenses only', true)}
      ${kpi('Period profit', `Rs ${money(fy.totals?.profit)}`, 'Sales net minus expenses', true)}
    </div>
    ${section('Month-wise sales &amp; expenses', table(
      [['Month'], ['Qty', true], ['Sales net', true], ['Expenses', true], ['Profit', true]],
      fyMonths.map(m => `<tr><td>${esc(m.label)}${m.is_partial ? ' *' : ''}</td><td class="num">${count(m.sales_qty)}</td><td class="num">${money(m.sales_net)}</td><td class="num">${money(m.expenses)}</td><td class="num">${money(m.profit)}</td></tr>`).join('')
      + `<tr class="total"><td>Total</td><td class="num">${count(fy.totals?.sales_qty)}</td><td class="num">${money(fy.totals?.sales_net)}</td><td class="num">${money(fy.totals?.expenses)}</td><td class="num">${money(fy.totals?.profit)}</td></tr>`,
    ) + `<p class="chart-t">Sales by month (net Rs)</p>${
      fyMonths.length ? bars(fyMonths.map(m => ({ name: m.label, value: m.sales_net })), money) : '<p class="note">No sales in this period.</p>'}`)}
    ${footer}`;

  // ── Page 5: fiscal top lists, physio & nutrition ─────────────────────────
  const topRows = (list: any[], empty: string) => list.length
    ? list.map(p => `<tr><td>${esc(p.package_name)}</td><td class="num">${p.qty}</td><td class="num">${money(p.net)}</td></tr>`).join('')
    : `<tr><td colspan="3">${empty}</td></tr>`;
  const page5 = `
    ${section('Top gym &amp; services (fiscal period)', table([['Package'], ['Qty', true], ['Net', true]], topRows(fyServices, 'No service sales')))}
    ${section('Top café products (fiscal period)', table([['Product'], ['Qty', true], ['Net', true]], topRows(fyCafe, 'No café sales')))}
    ${section('Physio &amp; nutrition detail', table([], [
      deptHead('Physiotherapy'),
      kv('Appointments today / MTD', `${count(physio.appointments_today)} / ${count(physio.appointments_mtd)}`),
      kv('Consultations conducted today / MTD', `${count(physio.consultations_conducted_today)} / ${count(physio.consultations_conducted_mtd)}`),
      deptHead('Nutrition'),
      kv('Meal plans issued today / MTD', `${count(nutri.meal_plans_issued_today)} / ${count(nutri.meal_plans_issued_mtd)}`),
      kv('Consultations today / MTD · Conversions MTD', `${count(nutri.consultations_today)} / ${count(nutri.consultations_mtd)} · ${count(nutri.conversions_mtd)}`),
    ].join('')))}
    ${footer}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>${scaleCssPx(`
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #0f172a; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 794px; padding: 38px 45px 40px; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .banner { background: linear-gradient(135deg, #b80022, #e8002b); border-radius: 8px; color: #fff; margin-bottom: 12px; padding: 16px 18px; }
  .banner.blue { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); }
  .banner h1 { font-size: 18px; font-weight: 800; letter-spacing: .03em; line-height: 1.25; margin: 0; }
  .banner p { font-size: 10px; line-height: 1.45; margin: 5px 0 0; opacity: .96; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-bottom: 11px; }
  .kpi { background: #fafafa; border: 1px solid #cbd5e1; border-radius: 4px; border-top: 3px solid #e8002b; padding: 8px 9px; }
  .kpi.blue { border-top-color: #2563eb; }
  .kpi label { color: #64748b; display: block; font-size: 8px; font-weight: 700; letter-spacing: .06em; margin-bottom: 3px; text-transform: uppercase; }
  .kpi strong { color: #0f172a; font-size: 15px; font-weight: 800; }
  .kpi span { color: #64748b; display: block; font-size: 8px; line-height: 1.35; margin-top: 3px; }
  .sec { margin-bottom: 11px; page-break-inside: avoid; }
  .sec-t { background: #1e293b; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .1em; margin: 0 0 6px; padding: 8px 10px; text-align: center; text-transform: uppercase; }
  table { border-collapse: collapse; font-size: 9.5px; width: 100%; }
  td, th { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #e2e8f0; color: #1e293b; font-size: 9px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
  td.num, th.num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
  tr.total td { background: #fef2f2; border-top: 2px solid #e8002b; font-weight: 800; }
  tr.dept td { background: #f1f5f9; font-weight: 700; }
  .small { font-size: 8px; color: #64748b; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .chart-t { color: #1e293b; font-size: 10px; font-weight: 800; letter-spacing: .05em; margin: 8px 0 5px; text-transform: uppercase; }
  .bar-row, .trend-row { display: grid; align-items: center; gap: 5px; font-size: 8.5px; margin-bottom: 4px; }
  .bar-row { grid-template-columns: 78px 1fr 62px; }
  .trend-row { grid-template-columns: 44px 1fr 62px; margin-bottom: 3px; }
  .bar-l { color: #334155; font-weight: 600; }
  .track { background: #e2e8f0; border-radius: 3px; height: 11px; overflow: hidden; }
  .fill { background: #e8002b; border-radius: 3px; height: 100%; }
  .bar-v { font-size: 8.5px; font-weight: 700; text-align: right; }
  .note { color: #64748b; font-size: 8px; margin: 4px 0 0; }
  .foot { border-top: 2px solid #e8002b; color: #64748b; display: flex; font-size: 8px; font-weight: 600; justify-content: space-between; margin-top: 10px; padding-top: 6px; }
`)}</style></head><body>
  <div class="page">${page1}</div>
  <div class="page">${page2}</div>
  <div class="page">${page3}</div>
  <div class="page">${page4}</div>
  <div class="page">${page5}</div>
</body></html>`;
};

/**
 * Render to MIS_Report_<Branch>_<YYYY-MM-DD>.pdf (the web's file name, e.g.
 * MIS_Report_AllBranches_2026-10-08.pdf). `data` is the `data` object of the
 * MISReport/get response.
 *
 * iOS opens the in-app PdfViewer (preview + Share / Save to Files) — the share
 * sheet's own preview launches Apple's Preview app, which the Simulator kills.
 * Android's WebView can't render PDFs, so Android goes straight to the share
 * sheet. Cancelling the sheet is not an error.
 */
export const downloadMISReportPdf = async (data: Record<string, any>, navigation: any) => {
  const branch = String(data?.meta?.branch_label || 'AllBranches').replace(/[^\w-]+/g, '');
  const fileName = `MIS_Report_${branch}_${data?.meta?.date ?? ''}`;
  const { filePath } = await generatePDF({
    html: buildMISReportHtml(data),
    fileName,
    width: 595,   // A4 in points
    height: 842,
    padding: 0,
    shouldPrintBackgrounds: true,
  });
  await openPdf(filePath, fileName, 'MIS Report', navigation);
};

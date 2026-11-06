// COPIED VERBATIM from the Keyley funnel: github.com/Wilsonknjoroge98/gsq apps/keyley-web/src/lib/snapshot.ts
// (branch feat/keyley-one-type, commit 1733903). Do not edit here: change it in the funnel and copy it again,
// so the agent sees exactly the estimate the lead downloaded.
// Keyley Estimate: a 2-page PDF built in the lead's own browser (nothing is uploaded or stored).
// Page 1 their equity, their estimate and their agent; page 2 four ways mortgage protection can work.
// jsPDF is loaded only when the lead taps Download (dynamic import), so the funnel itself stays light.
//
// Wording rules (Shea, 2026-11-05): products described generally with "features and availability vary by carrier
// and state"; no promise that a policy stops a foreclosure; the price is the LEVEL TERM estimate that was quoted;
// the lender is never shown; home value and equity only when ATTOM's value confidence is high.
import type { jsPDF as JsPDF } from 'jspdf';

export interface SnapshotAgent {
  name: string;
  npn?: string | null;
  photoDataUrl?: string | null; // a data: URL; remote photos are fetched by the caller
}

export interface SnapshotData {
  firstName: string;
  lastName: string;
  address: { line1: string; line2: string } | null;
  person?: { sex: 'male' | 'female'; dob: { m: string; d: string; y: string }; tobacco: boolean } | null; // the line under the address
  homeValue: number | null; // null = unknown or low confidence: value and equity are left out
  balance: number; // ATTOM's estimate, or the lead's own number when they adjusted it
  yearsLeft: number;
  quote: { low: number; high: number; term: number; coverage: number } | null;
  agent: SnapshotAgent | null;
  callNumber: string; // E.164, e.g. +18338927535
  callDigits?: string; // auto-sent after connect so the call routes to Keyley (e.g. "1")
  generatedAt?: Date;
}

const INK = '#000000', CHAR = '#2F4550', SLATE = '#586F7C', LIGHT = '#B8DBD9', GHOST = '#F4F4F9', LINE = '#DCE3E7', WHITE = '#FFFFFF';
const W = 612, H = 792, M = 54; // US letter in points, 0.75 in margins

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const equityOf = (d: SnapshotData) => (d.homeValue != null ? Math.max(0, d.homeValue - d.balance) : null);
export const telHref = (d: SnapshotData) => `tel:${d.callNumber}${d.callDigits ? `,${d.callDigits}` : ''}`;
export const displayPhone = (e164: string) => {
  const m = e164.replace(/\D/g, '').replace(/^1/, '');
  return m.length === 10 ? `(${m.slice(0, 3)}) ${m.slice(3, 6)}-${m.slice(6)}` : e164;
};
// "Male  ·  Born 03/02/1974  ·  Non-Tobacco" (Shea, 2026-11-06). Parts that are missing are left out.
export const personLine = (p: SnapshotData['person']) => {
  if (!p) return '';
  const pad = (v: string) => String(v || '').padStart(2, '0');
  const born = p.dob?.m && p.dob?.d && /^\d{4}$/.test(p.dob?.y || '') ? `Born ${pad(p.dob.m)}/${pad(p.dob.d)}/${p.dob.y}` : '';
  return [p.sex === 'male' ? 'Male' : p.sex === 'female' ? 'Female' : '', born, p.tobacco ? 'Tobacco' : 'Non-Tobacco']
    .filter(Boolean)
    .join('  ·  ');
};

export const fileName = (d: SnapshotData) =>
  `Keyley-Estimate-${(d.firstName || 'Your').replace(/[^A-Za-z0-9]+/g, '')}.pdf`;

function logo(doc: JsPDF, x: number, y: number, size = 22, dark = false) {
  doc.setFillColor(dark ? LIGHT : CHAR);
  doc.roundedRect(x, y, size, size, size * 0.25, size * 0.25, 'F');
  const s = size / 32;
  doc.setFillColor(dark ? CHAR : LIGHT);
  // house: roof triangle + body with a door
  doc.triangle(x + 16 * s, y + 7 * s, x + 7 * s, y + 14.5 * s, x + 25 * s, y + 14.5 * s, 'F');
  doc.rect(x + 7 * s, y + 14.5 * s, 18 * s, 10.5 * s, 'F');
  doc.setFillColor(dark ? LIGHT : CHAR);
  doc.rect(x + 13.5 * s, y + 19.5 * s, 5 * s, 5.5 * s, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.62);
  doc.setTextColor(dark ? WHITE : CHAR);
  doc.text('K E Y L E Y', x + size + 8, y + size * 0.7);
}

function header(doc: JsPDF, d: SnapshotData, page: number) {
  logo(doc, M, M - 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(SLATE);
  doc.text(`Your Estimate  ·  Page ${page} of 2`, W - M, M + 8, { align: 'right' });
  doc.setDrawColor(LINE);
  doc.setLineWidth(1);
  doc.line(M, M + 28, W - M, M + 28);
  void d;
}

const AGENT_H = 54; // the agent strip on page 1

// The lowest y page content may reach: just above the disclaimer footer (same math as footer()).
function contentBottom(doc: JsPDF) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(DISCLAIMER, W - 2 * M).length;
  return H - M + 6 - (lines - 1) * 9 - 8;
}

function footer(doc: JsPDF, text: string) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(SLATE);
  const lines = doc.splitTextToSize(text, W - 2 * M);
  doc.text(lines, M, H - M + 6 - (lines.length - 1) * 9);
}

const DISCLAIMER =
  'Keyley is a service of FEX Digital LLC. Keyley is not an insurance company, a lender or an insurance agent; independent licensed agents ' +
  'provide quotes and coverage. Home and mortgage figures are estimates from public records or from you and may be inaccurate. Keyley is not ' +
  'affiliated with any mortgage lender. Quotes are estimates; final rates depend on underwriting. Features and availability vary by carrier and state.';

function title(doc: JsPDF, text: string, y: number, size = 26) {
  doc.setFont('times', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(INK);
  const lines = doc.splitTextToSize(text, W - 2 * M);
  doc.text(lines, M, y);
  return y + lines.length * size * 1.1;
}

function para(doc: JsPDF, text: string, x: number, y: number, width: number, size = 10.5, color = INK, lh = 1.45) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * size * lh;
}

/* ---------- equity over time (illustration) ---------- */

/** Assumed mortgage rate for the payoff curve (the lead's real rate is unknown). Printed on the page. */
export const ASSUMED_RATE = 0.065;
/** Assumed yearly home value growth for the equity chart (Shea, 2026-11-05: one flat 4%, not a range). Printed on the page. */
export const HOME_GROWTH = 0.04;

/** Balance after `years`, paying off `balance` on schedule over `yearsLeft` at ASSUMED_RATE. 0 once paid off. */
export function balanceAfterYears(balance: number, yearsLeft: number, years: number, rate = ASSUMED_RATE): number {
  const n = Math.max(1, Math.round(yearsLeft * 12)), k = Math.round(years * 12), r = rate / 12;
  if (k >= n) return 0;
  const g = Math.pow(1 + r, n), payment = (balance * r * g) / (g - 1);
  return Math.max(0, balance * Math.pow(1 + r, k) - (payment * (Math.pow(1 + r, k) - 1)) / r);
}

export interface EquityPoint { years: number; value: number; owed: number; equity: number }
/** Equity at each milestone if they never sell or refinance: value grows HOME_GROWTH a year while the balance pays down. */
export function equityProjection(homeValue: number, balance: number, yearsLeft: number, milestones = [0, 10, 20, 30]): EquityPoint[] {
  return milestones.map((t) => {
    const owed = balanceAfterYears(balance, yearsLeft, t);
    const value = homeValue * Math.pow(1 + HOME_GROWTH, t);
    return { years: t, value, owed, equity: Math.max(0, value - owed) };
  });
}
/** "$135k", "$1.2M" */
export const short = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(n / 1000)}k`);

/* ---------- page 1: your equity, your estimate, your agent ---------- */

/** House drawing filled from the bottom: light blue = the share they own, charcoal = what is still owed. */
export function equityHouse(doc: JsPDF, x: number, y: number, w: number, h: number, owned: number) {
  const roofH = h * 0.38, bodyH = h - roofH, eave = w * 0.08;
  const bx = x + eave, bw = w - 2 * eave, by = y + roofH;
  doc.setFillColor(CHAR);
  doc.triangle(x + w / 2, y, x, by, x + w, by, 'F');
  doc.rect(bx, by, bw, bodyH, 'F');
  const f = Math.max(0, Math.min(1, owned)), level = f * h;
  doc.setFillColor(LIGHT);
  const bodyFill = Math.min(level, bodyH);
  if (bodyFill > 0) doc.rect(bx, y + h - bodyFill, bw, bodyFill, 'F');
  if (level > bodyH) {
    const rise = Math.min(level - bodyH, roofH), half = (w / 2) * (1 - rise / roofH), cx = x + w / 2, topY = by - rise;
    doc.triangle(x, by, x + w, by, cx - half, topY, 'F');
    doc.triangle(x + w, by, cx + half, topY, cx - half, topY, 'F');
  }
  doc.setFillColor(WHITE);
  doc.roundedRect(x + w / 2 - w * 0.08, y + h - bodyH * 0.42, w * 0.16, bodyH * 0.42, 3, 3, 'F');
  doc.roundedRect(bx + bw * 0.12, by + bodyH * 0.18, bw * 0.2, bodyH * 0.2, 2, 2, 'F');
  doc.roundedRect(bx + bw * 0.68, by + bodyH * 0.18, bw * 0.2, bodyH * 0.2, 2, 2, 'F');
}

// Name, address and the person line, centered and evenly spaced between the header rule and the
// price box (Shea, 2026-11-06): the same gap above the name, between the lines and
// above the box, measured from each line's cap height to the baseline above it.
// Returns the y where the price box starts.
const RULE_Y = M + 28, BOX_TOP = 196, GAP_MIN = 12, GAP_MAX = 24;
const CAP = { times: 0.662, helvetica: 0.718 };
function topBlock(doc: JsPDF, d: SnapshotData) {
  const width = W - 2 * M;
  const blocks: { text: string[]; font: 'times' | 'helvetica'; style: string; size: number; lh: number; color: string }[] = [];
  const add = (text: string, font: 'times' | 'helvetica', style: string, size: number, lh: number, color: string) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    blocks.push({ text: doc.splitTextToSize(text, width), font, style, size, lh, color });
  };
  add(`${d.firstName} ${d.lastName}`.trim() || 'Your estimate', 'times', 'bold', 30, 1.1, INK);
  if (d.address) add([d.address.line1, d.address.line2].filter(Boolean).join(', '), 'helvetica', 'normal', 14, 1.3, CHAR);
  const who = personLine(d.person);
  if (who) add(who, 'helvetica', 'normal', 12.5, 1.3, SLATE);

  const height = (b: (typeof blocks)[number]) => CAP[b.font] * b.size + (b.text.length - 1) * b.size * b.lh;
  const total = blocks.reduce((sum, b) => sum + height(b), 0);
  const gap = Math.min(GAP_MAX, Math.max(GAP_MIN, (BOX_TOP - RULE_Y - total) / (blocks.length + 1)));
  let y = RULE_Y;
  for (const b of blocks) {
    const baseline = y + gap + CAP[b.font] * b.size;
    doc.setFont(b.font, b.style);
    doc.setFontSize(b.size);
    doc.setTextColor(b.color);
    doc.text(b.text, W / 2, baseline, { lineHeightFactor: b.lh, align: 'center' }); // centered (Shea, 2026-11-06)
    y = baseline + (b.text.length - 1) * b.size * b.lh;
  }
  return y + gap;
}

function pageHome(doc: JsPDF, d: SnapshotData) {
  header(doc, d, 1);
  let y = topBlock(doc, d);

  const equity = equityOf(d);
  const first = (d.firstName || '').trim();

  // ---- the estimate: price on the left, details as bullets on the right ----
  if (d.quote) {
    // label centered across the top; below it the price (left) and the details as bullets (right), each centered
    const eh = 118, top = 40; // `top` = the title band; the price and bullets share the rest
    doc.setFillColor(LIGHT);
    doc.roundedRect(M, y, W - 2 * M, eh, 12, 12, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(INK);
    doc.text('Your Mortgage Protection Estimate', W / 2, y + 32, { align: 'center' });
    doc.setDrawColor(WHITE);
    doc.setLineWidth(1);
    const bx = W - M - 172, leftC = (M + bx - 16) / 2, bodyMid = y + top + (eh - top) / 2 - 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(INK);
    const range = d.quote.low === d.quote.high ? money(d.quote.low) : `${money(d.quote.low)} – ${money(d.quote.high)}`;
    doc.text(`${range} / month`, leftC, bodyMid + 10, { align: 'center' });
    // the details as bullets on the right (Shea, 2026-11-05)
    doc.line(bx - 16, y + top + 5, bx - 16, y + eh - 19);
    const bullets = [`${money(d.quote.coverage)} of Coverage`, `${d.quote.term}-Year Level Term`, 'Final Rate Set Upon Approval'];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(CHAR);
    // the bullet block is centered in the right side; the bullets stay aligned with each other
    const blockW = 11 + Math.max(...bullets.map((t) => doc.getTextWidth(t)));
    const rx = (bx - 16 + W - M) / 2 - blockW / 2;
    bullets.forEach((t, i) => {
      const by = bodyMid - 13 + i * 17;
      doc.setFillColor(CHAR);
      doc.circle(rx + 2, by - 3.6, 2.2, 'F');
      doc.text(t, rx + 11, by);
    });
    y += eh + 12;
  }

  // ---- the equity (or, with no reliable home value, the balance) ----
  const hasEquity = equity != null && !!d.homeValue;
  if (hasEquity) {
    const share = equity! / d.homeValue!;
    // ---- three boxes side by side: home value, still owed, equity (highlighted) ----
    const gap = 10, bw3 = (W - 2 * M - 2 * gap) / 3, bh3 = 74;
    const box = (i: number, label: string, value: string, sub: string, dark: boolean) => {
      const x = M + i * (bw3 + gap);
      doc.setFillColor(dark ? CHAR : GHOST);
      doc.roundedRect(x, y, bw3, bh3, 12, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(dark ? LIGHT : SLATE);
      const cx = x + bw3 / 2;
      doc.text(label, cx, y + 20, { align: 'center' });
      doc.setFontSize(dark ? 26 : 22);
      doc.setTextColor(dark ? WHITE : INK);
      doc.text(value, cx, y + 47, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(dark ? LIGHT : SLATE);
      doc.text(sub, cx, y + 63, { align: 'center' });
    };
    box(0, 'HOME VALUE', money(d.homeValue!), 'Estimated today', false);
    box(1, 'STILL OWED', money(d.balance), `About ${d.yearsLeft} years left`, false);
    box(2, first && first.length <= 12 ? `${first.toUpperCase()}'S EQUITY` : 'YOUR EQUITY', money(equity!), `About ${Math.round(share * 100)}% of your home`, true);
    y += bh3 + 12;

    // ---- equity over time, if they never sell or refinance ----
    const pts = equityProjection(d.homeValue!, d.balance, d.yearsLeft);
    // The card gives up height (from the chart) when a long name, address or the
    // person line pushed everything down, so the agent strip never meets the disclaimer.
    const shrink = Math.max(0, Math.min(60, 226 - (contentBottom(doc) - 12 - AGENT_H - 12 - y)));
    const cardH = 226 - shrink;
    doc.setFillColor(GHOST);
    doc.roundedRect(M, y, W - 2 * M, cardH, 14, 14, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(INK);
    doc.text('Your Equity Over Time', M + 20, y + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(SLATE);
    doc.text('If you never sell or refinance, your share of the home keeps growing.', M + 20, y + 46);
    // legend
    const key = (kx: number, color: string, label: string) => {
      doc.setFillColor(color);
      doc.roundedRect(kx, y + 22, 9, 9, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(SLATE);
      doc.text(label, kx + 13, y + 30);
    };
    key(W - M - 140, LIGHT, 'Yours');
    key(W - M - 86, CHAR, 'Still Owed');
    // bars: total height = projected value (4% midpoint), light bottom = equity, dark top = still owed
    const chartTop = y + 76, chartH = 96 - shrink, base = chartTop + chartH;
    const maxV = Math.max(...pts.map((p) => p.value));
    const slot = (W - 2 * M - 40) / pts.length, barW = Math.min(64, slot * 0.5);
    let paidShown = false;
    pts.forEach((p, i) => {
      const cx = M + 20 + slot * i + slot / 2, bx = cx - barW / 2;
      const hTot = (p.value / maxV) * chartH, hOwed = (p.owed / maxV) * chartH;
      doc.setFillColor(LIGHT);
      doc.roundedRect(bx, base - hTot, barW, hTot, 4, 4, 'F');
      if (hOwed > 0.5) {
        doc.setFillColor(CHAR);
        doc.roundedRect(bx, base - hTot, barW, hOwed, 4, 4, 'F');
        if (hOwed > 6) doc.rect(bx, base - hTot + hOwed - 4, barW, 4, 'F');
      }
      // equity range above the bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(i === 0 ? 10 : 11);
      doc.setTextColor(CHAR);
      const label = short(p.equity);
      doc.text(label, cx, base - hTot - 7, { align: 'center' });
      // under the bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(INK);
      doc.text(p.years === 0 ? 'Today' : `In ${p.years} Years`, cx, base + 15, { align: 'center' });
      if (!paidShown && p.years > 0 && p.owed === 0) {
        paidShown = true;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(SLATE);
        doc.text(`Paid Off in Year ${Math.ceil(d.yearsLeft)}`, cx, base + 27, { align: 'center' });
      }
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE);
    doc.text(`Illustration only, not a prediction: assumes ${Math.round(HOME_GROWTH * 100)}% yearly home growth (values can also fall) and on-time payments at ${(ASSUMED_RATE * 100).toFixed(1)}%.`, M + 20, y + cardH - 13);
    y += cardH;
  } else {
    const heroH = 150;
    doc.setFillColor(GHOST);
    doc.roundedRect(M, y, W - 2 * M, heroH, 14, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    doc.text('LEFT ON YOUR MORTGAGE', W / 2, y + 42, { align: 'center' });
    doc.setFontSize(48);
    doc.setTextColor(CHAR);
    doc.text(money(d.balance), W / 2, y + 92, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(SLATE);
    doc.text(doc.splitTextToSize(`About ${d.yearsLeft} years of payments left. With level term protection, the mortgage can be paid off so your family can stay in the home.`, W - 2 * M - 120), W / 2, y + 122, { align: 'center', lineHeightFactor: 1.4 });
    y += heroH;
  }
  y += 12;

  // ---- your agent and the call ----
  const ah = AGENT_H;
  doc.setDrawColor(LINE);
  doc.setFillColor(WHITE);
  doc.roundedRect(M, y, W - 2 * M, ah, 10, 10, 'FD');
  let tx = M + 16;
  if (d.agent?.photoDataUrl) {
    try { doc.addImage(d.agent.photoDataUrl, M + 12, y + 9, 36, 36); tx = M + 58; } catch { /* text only */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(SLATE);
  doc.text('YOUR LICENSED AGENT', tx, y + 22);
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(INK);
  doc.text(d.agent ? `${d.agent.name}${d.agent.npn ? `  ·  NPN ${d.agent.npn}` : ''}` : 'Talk to a licensed agent about your estimate', tx, y + 40);
  const bw = 172, bh = 32, bx = W - M - bw - 11, byy = y + (ah - bh) / 2;
  doc.setFillColor(CHAR);
  doc.roundedRect(bx, byy, bw, bh, 16, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(WHITE);
  doc.text(`Call ${displayPhone(d.callNumber)}`, bx + bw / 2, byy + 20.5, { align: 'center' });
  doc.link(bx, byy, bw, bh, { url: telHref(d) });

  footer(doc, DISCLAIMER);
}

/* ---------- page 2: three ways it can work ---------- */
function chartAxes(doc: JsPDF, x: number, y: number, w: number, h: number, left = 'Today', right = 'Mortgage Paid Off') {
  doc.setDrawColor(LINE);
  doc.setLineWidth(1);
  doc.line(x, y + h, x + w, y + h);
  doc.line(x, y, x, y + h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(SLATE);
  doc.text(left, x, y + h + 10);
  doc.text(right, x + w, y + h + 10, { align: 'right' });
}
function legend(doc: JsPDF, x: number, y: number, color: string, label: string, dashed = false) {
  doc.setDrawColor(color);
  doc.setLineWidth(2.5);
  if (dashed) doc.setLineDashPattern([3, 2], 0);
  doc.line(x, y - 3, x + 16, y - 3);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(SLATE);
  doc.text(label, x + 21, y);
}
/** the mortgage balance curve (amortizing: slow at first, faster near the end) */
function balanceCurve(doc: JsPDF, x: number, y: number, w: number, h: number, color: string, dashed: boolean) {
  doc.setDrawColor(color);
  doc.setLineWidth(2.5);
  if (dashed) doc.setLineDashPattern([4, 3], 0);
  const n = 24, r = 0.065 / 12, N = 360;
  const bal = (k: number) => (Math.pow(1 + r, N) - Math.pow(1 + r, k)) / (Math.pow(1 + r, N) - 1);
  let px = x, py = y;
  for (let i = 1; i <= n; i++) {
    const t = i / n, nx = x + t * w, ny = y + (1 - bal(t * N)) * h;
    doc.line(px, py, nx, ny);
    px = nx; py = ny;
  }
  doc.setLineDashPattern([], 0);
}

function option(doc: JsPDF, y: number, n: number, name: string, tagline: string, body: string, draw: (x: number, y: number, w: number, h: number) => void) {
  const cardH = 120, chartW = 180, chartH = 62;
  doc.setFillColor(GHOST);
  doc.roundedRect(M, y, W - 2 * M, cardH, 12, 12, 'F');
  doc.setFillColor(CHAR);
  doc.circle(M + 26, y + 28, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(WHITE);
  doc.text(String(n), M + 26, y + 32.5, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(INK);
  doc.text(name, M + 48, y + 33);
  const textW = W - 2 * M - chartW - 64;
  let ty = para(doc, tagline, M + 22, y + 52, textW, 10.5, CHAR, 1.3);
  doc.setFont('helvetica', 'bold');
  ty = para(doc, body, M + 22, ty + 3, textW, 9.75, SLATE, 1.35);
  draw(W - M - chartW - 22, y + 40, chartW, chartH);
  void ty;
  return y + cardH + 9;
}

function pageOptions(doc: JsPDF, d: SnapshotData) {
  header(doc, d, 2);
  let y = title(doc, 'Four Ways Mortgage Protection Can Work', M + 66, 24);
  y = para(doc, 'Your agent will walk you through which of these fit your family and your budget. Here is the short version.', M, y - 2, W - 2 * M, 10, SLATE) + 2;

  y = option(doc, y, 1, 'Level Term',
    'Pays off the mortgage, with room to spare.',
    'The death benefit stays the same for the whole term. As your balance drops, it can pay off the mortgage and leave money for your family.',
    (x, cy, w, h) => {
      chartAxes(doc, x, cy, w, h);
      // shaded "left over" area between the level line and the falling balance
      doc.setFillColor('#E4F1F0');
      const n = 24, r = 0.065 / 12, N = 360;
      const bal = (k: number) => (Math.pow(1 + r, N) - Math.pow(1 + r, k)) / (Math.pow(1 + r, N) - 1);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, top = cy + 2, by = cy + 2 + (1 - bal(t * N)) * (h - 2);
        doc.rect(x + (i / n) * w, top, w / n + 0.5, by - top, 'F');
      }
      doc.setDrawColor(CHAR);
      doc.setLineWidth(2.5);
      doc.line(x, cy + 2, x + w, cy + 2);
      balanceCurve(doc, x, cy + 2, w, h - 2, SLATE, true);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(CHAR);
      doc.text('Left Over for Family', x + w - 4, cy + 18, { align: 'right' });
      legend(doc, x, cy - 8, CHAR, 'Coverage');
      legend(doc, x + 70, cy - 8, SLATE, 'Mortgage Balance', true);
    });

  y = option(doc, y, 2, 'Decreasing Term',
    'Coverage that shrinks along with your mortgage.',
    'The death benefit steps down over the years left on your mortgage, so your coverage tracks what you still owe.',
    (x, cy, w, h) => {
      chartAxes(doc, x, cy, w, h);
      balanceCurve(doc, x, cy + 2, w, h - 2, CHAR, false);
      balanceCurve(doc, x, cy + 2, w, h - 2, LIGHT, true);
      legend(doc, x, cy - 8, CHAR, 'Coverage');
      legend(doc, x + 92, cy - 8, LIGHT, 'Mortgage Balance', true);
    });

  y = option(doc, y, 3, 'Equity Protection',
    'Keeps the payments going while your family decides.',
    'Covers your mortgage payments for a set period, so your family has time to keep the home, sell it or refinance, without a rushed decision.',
    (x, cy, w, h) => {
      // timeline: a claim, the payments covered for a set period, then the family's three choices
      const mid = cy + h * 0.5, bandEnd = x + w * 0.58, fork = x + w * 0.66;
      doc.setFillColor(LIGHT);
      doc.roundedRect(x + 8, mid - 11, bandEnd - x - 8, 22, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(CHAR);
      doc.text('Payments Covered', x + 8 + (bandEnd - x - 8) / 2, mid + 2.6, { align: 'center' });
      doc.setFillColor(CHAR);
      doc.circle(x + 8, mid, 4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(SLATE);
      doc.text('After a Claim', x, cy + h + 9);
      doc.setDrawColor(CHAR);
      doc.setLineWidth(1.6);
      doc.line(bandEnd, mid, fork, mid);
      const opts: [string, number][] = [['Keep the Home', cy + 6], ['Sell It', mid], ['Refinance', cy + h - 6]];
      for (const [label, oy] of opts) {
        doc.line(fork, mid, fork + 10, oy);
        doc.setFillColor(CHAR);
        doc.circle(fork + 12, oy, 2.4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(INK);
        doc.text(label, fork + 18, oy + 2.6);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(SLATE);
      doc.text('Your Family Decides', x + w, cy + h + 9, { align: 'right' });
      legend(doc, x, cy - 8, LIGHT, 'Time to Decide, Not a Forced Sale');
    });
  y = option(doc, y, 4, 'Mortgage Acceleration',
    'Protect the home, and aim to pay it off early.',
    'Protects your family while building cash value you may use to pay the mortgage off years sooner. Costs more than term; growth is not guaranteed.',
    (x, cy, w, h) => {
      chartAxes(doc, x, cy, w, h, 'Today', 'Original Payoff');
      // protection the whole time
      doc.setDrawColor(CHAR);
      doc.setLineWidth(2.5);
      doc.line(x, cy + 2, x + w, cy + 2);
      // the original 30-year balance
      balanceCurve(doc, x, cy + 2, w, h - 2, SLATE, true);
      // cash value growing (slow at first, faster later), meeting the balance early
      const r = 0.065 / 12, N = 360;
      const bal = (k: number) => (Math.pow(1 + r, N) - Math.pow(1 + r, k)) / (Math.pow(1 + r, N) - 1);
      const meet = 0.68; // where the cash value meets the remaining balance (illustration)
      const cv = (t: number) => bal(meet * N) * Math.pow(t / meet, 1.7);
      doc.setDrawColor('#7FBFBC');
      doc.setLineWidth(2.5);
      let px = x, py = cy + h;
      for (let i = 1; i <= 20; i++) {
        const t = (i / 20) * meet, nx = x + t * w, ny = cy + 2 + (1 - cv(t)) * (h - 2);
        doc.line(px, py, nx, ny);
        px = nx; py = ny;
      }
      doc.setFillColor(CHAR);
      doc.circle(px, py, 3.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(CHAR);
      doc.text('Paid Off Early', px + 7, py - 7);
      legend(doc, x, cy - 8, CHAR, 'Coverage');
      legend(doc, x + 62, cy - 8, '#7FBFBC', 'Cash Value');
      legend(doc, x + 132, cy - 8, SLATE, 'Balance', true);
    });
  void y;
  footer(doc, 'Charts are illustrations, not projections of your policy. ' + DISCLAIMER);
}

/** Builds the PDF. Pass a jsPDF constructor in tests; the browser path loads it lazily. */
export async function buildSnapshot(d: SnapshotData, JsPDFCtor?: typeof JsPDF): Promise<JsPDF> {
  const Ctor = JsPDFCtor ?? (await import('jspdf')).jsPDF;
  const doc = new Ctor({ unit: 'pt', format: 'letter' });
  const date = (d.generatedAt ?? new Date()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  doc.setProperties({ title: `Keyley Estimate for ${d.firstName}`, subject: `Mortgage protection estimate, ${date}`, author: 'Keyley', creator: 'Keyley' });
  pageHome(doc, d);
  doc.addPage();
  pageOptions(doc, d);
  return doc;
}

/** Browser: build and download. */
export async function downloadSnapshot(d: SnapshotData) {
  const doc = await buildSnapshot(d);
  doc.save(fileName(d));
}

/** Browser: build and show the PDF in a tab the caller opened during the tap (so pop-up blockers allow it).
 *  No tab (blocked, in-app browsers): download instead. */
export async function openSnapshot(d: SnapshotData, tab: Window | null) {
  const doc = await buildSnapshot(d);
  if (tab && !tab.closed) {
    tab.location.href = URL.createObjectURL(doc.output('blob'));
  } else {
    doc.save(fileName(d));
  }
}

// Loads the PDF library ahead of the tap (the loading screen calls it), so View My Estimate opens fast.
export const preloadPdf = () => import('jspdf').then(() => undefined);

/** Fetches a photo as a data: URL for the PDF. Null when it can't be read (CORS, network); the PDF is then text only. */
export async function photoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    // Square crop (same framing as the page: 35% across, 20% down) so the PDF never stretches the photo.
    const img = await createImageBitmap(blob);
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) * 0.35, sy = (img.height - side) * 0.2;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, 240, 240);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}

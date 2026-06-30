import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, PDFPage, PDFFont, RGB, StandardFonts, rgb } from "pdf-lib";
import type { LaunchEstimatorInput, LaunchEstimatorLead, LaunchEstimatorResult } from "./types";
import { integrationLabels, OPERATIONAL_GOALS } from "./config";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const SIDEBAR_W = 158;
const GAP = 14;
const MAIN_RIGHT = PAGE_W - MARGIN - SIDEBAR_W - GAP;
const MAIN_W = MAIN_RIGHT - MARGIN;

const C = {
  ink: rgb(0.07, 0.11, 0.14),
  muted: rgb(0.42, 0.46, 0.5),
  teal: rgb(0.0, 0.76, 0.71),
  tealDark: rgb(0.0, 0.55, 0.52),
  sidebar: rgb(0.03, 0.14, 0.16),
  sidebarDeep: rgb(0.02, 0.1, 0.12),
  white: rgb(1, 1, 1),
  border: rgb(0.88, 0.9, 0.92),
  card: rgb(0.97, 0.98, 0.99),
  quote: rgb(0.04, 0.2, 0.22),
  heroBg: rgb(0.12, 0.22, 0.24),
};

function goalLabels(ids: string[]): string[] {
  const map = new Map(OPERATIONAL_GOALS.map((g) => [g.id, g.label]));
  return ids.map((id) => map.get(id as never) ?? id);
}

function capitalizeGoal(label: string): string {
  return label
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function dispatchEfficiencyBadge(opportunities: LaunchEstimatorResult["opportunities"]): string {
  const row = opportunities.find((o) => o.label.toLowerCase().includes("dispatcher"));
  if (!row) return "+18%";
  const nums = row.value.match(/\d+/g);
  if (!nums?.length) return "+18%";
  return `+${nums[nums.length - 1]}%`;
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type DrawCtx = {
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
};

function drawText(
  ctx: DrawCtx,
  text: string,
  x: number,
  y: number,
  opts?: { size?: number; font?: PDFFont; color?: RGB; maxWidth?: number; lineGap?: number }
): number {
  const size = opts?.size ?? 9;
  const font = opts?.font ?? ctx.regular;
  const color = opts?.color ?? C.ink;
  const lineGap = opts?.lineGap ?? 3;
  const lines = opts?.maxWidth ? wrapLines(text, font, size, opts.maxWidth) : [text];
  lines.forEach((line, i) => {
    ctx.page.drawText(line, { x, y: y - i * (size + lineGap), size, font, color });
  });
  return y - lines.length * (size + lineGap);
}

function drawSectionLabel(ctx: DrawCtx, label: string, x: number, y: number): number {
  ctx.page.drawRectangle({ x, y: y - 11, width: 3, height: 14, color: C.teal });
  drawText(ctx, label.toUpperCase(), x + 10, y, { size: 7.5, font: ctx.bold, color: C.tealDark });
  return y - 20;
}

function drawMetricCard(
  ctx: DrawCtx,
  x: number,
  topY: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub?: string
) {
  ctx.page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: C.card,
    borderColor: C.border,
    borderWidth: 1,
  });

  const pad = 8;
  const innerW = w - pad * 2;
  let textY = topY - pad - 6;
  textY = drawText(ctx, label, x + pad, textY, {
    size: 6.5,
    color: C.muted,
    maxWidth: innerW,
    lineGap: 2,
  });
  textY -= 3;
  textY = drawText(ctx, value, x + pad, textY, {
    size: 10.5,
    font: ctx.bold,
    color: C.ink,
    maxWidth: innerW,
  });
  if (sub) {
    drawText(ctx, sub, x + pad, textY - 2, { size: 6.5, color: C.muted, maxWidth: innerW });
  }
}

function drawTagPill(ctx: DrawCtx, x: number, topY: number, label: string, maxW: number): { x: number; h: number } {
  const size = 6.5;
  const padX = 7;
  const padY = 5;
  const lines = wrapLines(label, ctx.regular, size, maxW - padX * 2);
  const lineH = size + 2;
  const textH = lines.length * lineH;
  const h = textH + padY * 2;
  const w = maxW;

  ctx.page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: C.card,
    borderColor: C.border,
    borderWidth: 0.75,
  });

  lines.forEach((line, i) => {
    ctx.page.drawText(line, {
      x: x + padX,
      y: topY - padY - size - i * lineH,
      size,
      font: ctx.regular,
      color: C.ink,
    });
  });

  return { x: x + w + 6, h };
}

function drawIntegrationBadge(ctx: DrawCtx, x: number, topY: number, label: string): number {
  const size = 7.5;
  const padX = 8;
  const h = 22;
  const textW = ctx.bold.widthOfTextAtSize(label, size);
  const w = Math.min(Math.max(textW + padX * 2, 48), 72);

  ctx.page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: C.white,
    borderColor: C.border,
    borderWidth: 1,
  });
  ctx.page.drawText(label, {
    x: x + padX,
    y: topY - h / 2 - size / 2 + 1,
    size,
    font: ctx.bold,
    color: C.ink,
  });
  return x + w + 6;
}

async function embedImage(doc: PDFDocument, relativePath: string) {
  try {
    const bytes = await readFile(join(process.cwd(), "public", relativePath));
    if (relativePath.endsWith(".png")) return doc.embedPng(bytes);
    return doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function drawHeroPanel(ctx: DrawCtx, x: number, topY: number, w: number, h: number, efficiency: string) {
  const { page } = ctx;
  page.drawRectangle({ x, y: topY - h, width: w, height: h, color: C.heroBg });

  const badgeW = 108;
  const badgeH = 48;
  const badgeX = x + w - badgeW - 8;
  const badgeY = topY - h + 10;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: C.sidebarDeep,
    opacity: 0.95,
  });
  drawText(ctx, "DISPATCH EFFICIENCY", badgeX + 7, badgeY + badgeH - 12, {
    size: 5.5,
    color: rgb(0.7, 0.82, 0.84),
  });
  drawText(ctx, efficiency, badgeX + 7, badgeY + badgeH - 28, {
    size: 14,
    font: ctx.bold,
    color: C.teal,
  });
  drawText(ctx, "Potential Improvement", badgeX + 7, badgeY + badgeH - 40, {
    size: 5.5,
    color: rgb(0.7, 0.82, 0.84),
  });
}

function drawSidebar(
  ctx: DrawCtx,
  result: LaunchEstimatorResult,
  input: LaunchEstimatorInput,
  yTop: number,
  yBottom: number
) {
  const x = PAGE_W - MARGIN - SIDEBAR_W;
  ctx.page.drawRectangle({ x, y: yBottom, width: SIDEBAR_W, height: yTop - yBottom, color: C.sidebar });

  let y = yTop - 24;
  drawText(ctx, "AT A GLANCE", x + 12, y, { size: 8.5, font: ctx.bold, color: C.white });
  y -= 22;

  const rows: { label: string; value: string; sub?: string }[] = [
    { label: "Timeline", value: result.timelineWeeksDisplay, sub: `(${result.timelineLabel})` },
    {
      label: "Investment",
      value: result.estimatedImplementationLabel.replace(" + custom planning", ""),
      sub: "One-time implementation",
    },
    {
      label: "Monthly Platform",
      value: result.estimatedMonthlyLabel.replace("/mo", ""),
      sub: "Estimated recurring",
    },
    { label: "Fleet Size", value: `${input.truckCount} trucks` },
    { label: "Branches", value: result.branchCountDisplay },
    { label: "Integrations", value: `${result.integrationCount} systems` },
  ];

  for (const row of rows) {
    drawText(ctx, row.label, x + 12, y, { size: 6.5, color: rgb(0.65, 0.78, 0.8) });
    y -= 11;
    y = drawText(ctx, row.value, x + 12, y, {
      size: 10,
      font: ctx.bold,
      color: C.white,
      maxWidth: SIDEBAR_W - 24,
    });
    y -= 2;
    if (row.sub) {
      y = drawText(ctx, row.sub, x + 12, y, { size: 6.5, color: rgb(0.55, 0.68, 0.7) });
    }
    y -= 10;
  }

  drawText(ctx, "Primary Outcome", x + 12, y, { size: 6.5, color: rgb(0.65, 0.78, 0.8) });
  y -= 11;
  y = drawText(
    ctx,
    "Launch an intelligence layer that improves dispatch efficiency, capacity planning, and profitability.",
    x + 12,
    y,
    { size: 7.5, color: C.white, maxWidth: SIDEBAR_W - 24, lineGap: 2 }
  );

  const quoteH = 82;
  const quoteY = yBottom + 14;
  ctx.page.drawRectangle({
    x: x + 8,
    y: quoteY,
    width: SIDEBAR_W - 16,
    height: quoteH,
    color: C.quote,
  });
  drawText(ctx, "\u201C", x + 14, quoteY + quoteH - 16, { size: 20, font: ctx.bold, color: C.teal });
  drawText(
    ctx,
    "We help fleet operators make smarter decisions every day using the systems they already have.",
    x + 14,
    quoteY + quoteH - 32,
    { size: 7,
      color: rgb(0.82, 0.9, 0.91),
      maxWidth: SIDEBAR_W - 28,
      lineGap: 2 }
  );
}

export async function buildLaunchEstimatePdf(
  input: LaunchEstimatorInput,
  result: LaunchEstimatorResult,
  lead: LaunchEstimatorLead
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: DrawCtx = { page, regular, bold };

  const company = lead.companyName || input.companyName;
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const integrations = integrationLabels(input.integrations);
  const goals = goalLabels(input.goals).map(capitalizeGoal);
  const efficiency = dispatchEfficiencyBadge(result.opportunities);

  const footerH = 40;
  const sidebarBottom = MARGIN + footerH + 6;
  const sidebarTop = PAGE_H - MARGIN - 38;

  const logo = await embedImage(doc, "branding/fleet-intelligence-logo.png");
  const logoH = 24;
  const logoW = logo ? (logo.width / logo.height) * logoH : 0;
  const headerTop = PAGE_H - MARGIN;

  if (logo) {
    page.drawImage(logo, { x: MARGIN, y: headerTop - logoH, width: logoW, height: logoH });
  } else {
    drawText(ctx, "CORNERSTONE FLEET INTELLIGENCE", MARGIN, headerTop - 10, {
      size: 7.5,
      font: bold,
      color: C.teal,
    });
  }

  const tagline = "BETTER DECISIONS. STRONGER FLEETS. HIGHER PERFORMANCE.";
  const tagMaxW = MAIN_RIGHT - MARGIN - 8;
  const tagLines = wrapLines(tagline, regular, 6, tagMaxW);
  tagLines.forEach((line, i) => {
    const lineW = regular.widthOfTextAtSize(line, 6);
    page.drawText(line, {
      x: MAIN_RIGHT - lineW,
      y: headerTop - 8 - i * 9,
      size: 6,
      font: regular,
      color: C.muted,
    });
  });

  const HERO_W = 132;
  const HERO_H = 88;
  const heroX = MAIN_RIGHT - HERO_W;
  const heroTop = headerTop - logoH - 16;

  const titleColW = heroX - MARGIN - 12;
  let titleY = heroTop - 4;
  titleY = drawText(ctx, "Fleet Intelligence", MARGIN, titleY, {
    size: 17,
    font: bold,
    color: C.ink,
    maxWidth: titleColW,
  });
  titleY -= 2;
  titleY = drawText(ctx, "Launch Estimate", MARGIN, titleY, {
    size: 17,
    font: bold,
    color: C.ink,
    maxWidth: titleColW,
  });
  titleY -= 10;
  drawText(ctx, "Prepared for ", MARGIN, titleY, { size: 10, color: C.muted });
  const prefixW = regular.widthOfTextAtSize("Prepared for ", 10);
  drawText(ctx, company, MARGIN + prefixW, titleY, {
    size: 10,
    font: bold,
    color: C.teal,
    maxWidth: titleColW - prefixW,
  });
  titleY -= 14;
  drawText(ctx, dateStr, MARGIN, titleY, { size: 8.5, color: C.muted });

  drawHeroPanel(ctx, heroX, heroTop, HERO_W, HERO_H, efficiency);

  let y = Math.min(titleY, heroTop - HERO_H) - 18;

  y = drawSectionLabel(ctx, "Implementation Scope", MARGIN, y);

  const cardGap = 5;
  const cardW = (MAIN_W - cardGap * 2) / 3;
  const cardH = 58;
  const scopeTop = y;
  const scope = [
    { label: "Estimated Monthly Platform", value: result.estimatedMonthlyLabel },
    { label: "Estimated Implementation", value: result.estimatedImplementationLabel },
    {
      label: "Estimated Timeline",
      value: result.timelineWeeksDisplay,
      sub: `(${result.timelineLabel})`,
    },
    { label: "Complexity", value: result.complexity },
    { label: "Branches", value: result.branchCountDisplay },
    { label: "Fleet Size", value: `${input.truckCount} trucks` },
    { label: "Integrations", value: `${result.integrationCount} systems` },
  ];
  scope.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawMetricCard(
      ctx,
      MARGIN + col * (cardW + cardGap),
      scopeTop - row * (cardH + cardGap),
      cardW,
      cardH,
      item.label,
      item.value,
      item.sub
    );
  });
  const scopeRows = Math.ceil(scope.length / 3);
  y = scopeTop - scopeRows * (cardH + cardGap) - 14;

  y = drawSectionLabel(ctx, "Operational Focus", MARGIN, y);
  const focusCols = 2;
  const focusW = (MAIN_W - 6) / focusCols;
  const focusRowH = 20;
  let focusTop = y;
  result.operationalFocus.forEach((item, i) => {
    const col = i % focusCols;
    const row = Math.floor(i / focusCols);
    const cx = MARGIN + col * (focusW + 6);
    const cy = focusTop - row * focusRowH;
    ctx.page.drawRectangle({
      x: cx,
      y: cy - focusRowH + 2,
      width: focusW,
      height: focusRowH - 2,
      color: C.card,
      borderColor: C.border,
      borderWidth: 0.5,
    });
    drawText(ctx, item, cx + 6, cy - 5, { size: 6.5, color: C.ink, maxWidth: focusW - 12 });
  });
  const focusRows = Math.ceil(result.operationalFocus.length / focusCols);
  y = focusTop - focusRows * focusRowH - 12;

  y = drawSectionLabel(ctx, "Selected Goals", MARGIN, y);
  const goalCols = 2;
  const goalW = (MAIN_W - 6) / goalCols;
  let goalTop = y;
  goals.slice(0, 6).forEach((goal, i) => {
    const col = i % goalCols;
    const row = Math.floor(i / goalCols);
    const cx = MARGIN + col * (goalW + 6);
    const cy = goalTop - row * 22;
    drawTagPill(ctx, cx, cy, goal, goalW);
  });
  const goalRows = Math.ceil(Math.min(goals.length, 6) / goalCols);
  y = goalTop - goalRows * 22 - 12;

  y = drawSectionLabel(ctx, "Systems to Connect", MARGIN, y);
  let intX = MARGIN;
  let intRowTop = y;
  const intRowH = 26;
  integrations.slice(0, 8).forEach((label, i) => {
    if (i > 0 && i % 4 === 0) {
      intRowTop -= intRowH;
      intX = MARGIN;
    }
    intX = drawIntegrationBadge(ctx, intX, intRowTop, label);
  });

  drawSidebar(ctx, result, input, sidebarTop, sidebarBottom);

  const footerY = MARGIN;
  page.drawLine({
    start: { x: MARGIN, y: footerY + footerH },
    end: { x: PAGE_W - MARGIN, y: footerY + footerH },
    thickness: 0.5,
    color: C.border,
  });

  if (logo) {
    const fh = 14;
    const fw = (logo.width / logo.height) * fh;
    page.drawImage(logo, { x: MARGIN, y: footerY + 10, width: fw, height: fh });
    drawText(ctx, "Cornerstone Fleet Intelligence", MARGIN + fw + 6, footerY + 18, {
      size: 6.5,
      font: bold,
      color: C.ink,
    });
    drawText(ctx, "Operational intelligence for industrial fleets", MARGIN + fw + 6, footerY + 9, {
      size: 5.5,
      color: C.muted,
    });
  }

  const site = "cornerstonefleetintel.com";
  const email = "hello@cornerstonefleetintel.com";
  const siteW = regular.widthOfTextAtSize(site, 6.5);
  drawText(ctx, site, PAGE_W / 2 - siteW / 2, footerY + 14, { size: 6.5, color: C.tealDark });
  const emailW = regular.widthOfTextAtSize(email, 6.5);
  drawText(ctx, email, PAGE_W - MARGIN - emailW, footerY + 14, { size: 6.5, color: C.tealDark });

  return doc.save();
}

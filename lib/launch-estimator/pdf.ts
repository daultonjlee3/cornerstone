import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { LaunchEstimatorInput, LaunchEstimatorLead, LaunchEstimatorResult } from "./types";
import { integrationLabels, OPERATIONAL_GOALS } from "./config";

function goalLabels(ids: string[]): string[] {
  const map = new Map(OPERATIONAL_GOALS.map((g) => [g.id, g.label]));
  return ids.map((id) => map.get(id as never) ?? id);
}

export async function buildLaunchEstimatePdf(
  input: LaunchEstimatorInput,
  result: LaunchEstimatorResult,
  lead: LaunchEstimatorLead
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const lineHeight = 16;
  const pageWidth = 612;
  const pageHeight = 792;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const teal = rgb(0.18, 0.83, 0.75);

  const writeln = (text: string, opts?: { bold?: boolean; size?: number; color?: typeof teal }) => {
    if (y < margin + lineHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(text.slice(0, 120), {
      x: margin,
      y,
      size: opts?.size ?? 10,
      font: opts?.bold ? bold : regular,
      color: opts?.color,
    });
    y -= lineHeight;
  };

  const section = (title: string) => {
    y -= 6;
    writeln(title, { bold: true, size: 12, color: teal });
    y -= 4;
  };

  writeln("CORNERSTONE FLEET INTELLIGENCE", { bold: true, size: 9, color: teal });
  writeln("Fleet Intelligence Launch Estimate", { bold: true, size: 18 });
  writeln(`Prepared for ${lead.companyName || input.companyName}`, { size: 11 });
  writeln(new Date().toLocaleDateString("en-US", { dateStyle: "long" }), { size: 9 });
  y -= 8;

  section("Implementation Scope");
  writeln(`Estimated implementation: ${result.estimatedImplementationLabel}`);
  writeln(`Estimated timeline: ${result.timelineWeeksDisplay} (${result.timelineLabel})`);
  writeln(`Complexity: ${result.complexity}`);
  if (result.customPlanningRecommended) {
    writeln("Custom implementation planning may be recommended.");
  }
  writeln(`Branches: ${result.branchCountDisplay}`);
  writeln(`Fleet size: ${input.truckCount} trucks`);
  writeln(`Integrations: ${result.integrationCount} systems`);

  section("Operational Focus");
  for (const item of result.operationalFocus) {
    writeln(`• ${item}`);
  }

  section("Selected Goals");
  for (const goal of goalLabels(input.goals)) {
    writeln(`• ${goal}`);
  }

  section("Systems to Connect");
  for (const label of integrationLabels(input.integrations)) {
    writeln(`• ${label}`);
  }

  section("Operational Opportunity (Illustrative)");
  for (const opp of result.opportunities) {
    writeln(`${opp.label}: ${opp.value}`);
  }
  y -= 4;
  writeln(result.disclaimer, { size: 8 });

  section("Company Profile");
  writeln(`Industry: ${input.industry}`);
  writeln(`Daily jobs: ${input.dailyJobs}`);
  writeln(`Dispatchers: ${input.dispatcherCount}`);
  writeln(`Contact: ${lead.email}`);
  if (lead.phone) writeln(`Phone: ${lead.phone}`);

  y -= 12;
  writeln("Next step: Schedule a discovery call with Cornerstone to validate scope and timeline.", {
    size: 9,
  });
  writeln("cornerstonecmms.co/contact", { size: 9, color: teal });

  return doc.save();
}

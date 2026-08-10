import type { SectionData } from "./pci-utils.ts";
import { parsePCIValue } from "./pci-utils.ts";
import { TRIGGER_STATE_PCI } from "../config/riskScales.ts";

export type RehabTreatment =
  | "No M&R"
  | "Preventive Maintenance (Seal Coat)"
  | "AC Rehabilitation"
  | "PCC Rehabilitation"
  | "AC Reconstruction"
  | "PCC Reconstruction";

export type RehabYear = "Year 1" | "Year 2" | "Year 3" | "Year 4" | "Year 5" | "Not Scheduled";

export const REHAB_YEARS: RehabYear[] = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Not Scheduled"];

// Same 5-color-plus-none ramp FDOT's SAPMP "5-Year Major Rehabilitation
// Needs" map uses for mr_year (captured from its published web map renderer).
export const REHAB_YEAR_COLORS: Record<RehabYear, string> = {
  "Year 1": "#ffbde8",
  "Year 2": "#ffd27e",
  "Year 3": "#a2ff73",
  "Year 4": "#73b1ff",
  "Year 5": "#73ffdf",
  "Not Scheduled": "#d4d4d4",
};

export interface RehabPlanItem {
  section: SectionData;
  pci: number;
  surfaceFamily: "AC" | "PCC";
  treatment: RehabTreatment;
  priorityYear: RehabYear;
  color: string;
}

// The riding/wearing surface drives the M&R treatment, not what's underneath
// it - "Asphalt on PCC" is rehabilitated as an asphalt surface (mill &
// overlay), same as plain "Asphalt". Only "Concrete" is an exposed PCC
// surface.
function getSurfaceFamily(section: SectionData): "AC" | "PCC" {
  return section.Type.trim().toLowerCase() === "concrete" ? "PCC" : "AC";
}

// Planning-level treatment by PCI, collapsed from the same 7-band ramp used
// everywhere else (pciCategories) down to the M&R actions FDOT's SAPMP
// Rehabilitation Plan tab reports (mr_type): no action above the trigger
// PCI, seal coat at the trigger already documented in riskScales.ts, major
// rehabilitation through Fair/Poor/Very Poor, reconstruction once a branch
// is Serious or worse.
function getTreatment(pci: number, family: "AC" | "PCC"): RehabTreatment {
  if (pci >= TRIGGER_STATE_PCI) return "No M&R";
  if (pci >= 71) return "Preventive Maintenance (Seal Coat)";
  if (pci >= 26) return family === "PCC" ? "PCC Rehabilitation" : "AC Rehabilitation";
  return family === "PCC" ? "PCC Reconstruction" : "AC Reconstruction";
}

// Priority year: branches that trigger (PCI below TRIGGER_STATE_PCI) are
// ranked worst-PCI-first - the same ordering risk.ts' comparePriorityOrders
// already compares itself against - and spread evenly across a 5-year
// window, worst branches first.
export function computeRehabPlan(sections: SectionData[]): RehabPlanItem[] {
  const branches = sections.filter((s) => s.sampleUnit === undefined);

  const scored = branches.map((section) => {
    const pci = parsePCIValue(section["PCI Rating"]);
    const surfaceFamily = getSurfaceFamily(section);
    return { section, pci, surfaceFamily, treatment: getTreatment(pci, surfaceFamily) };
  });

  const triggered = scored.filter((s) => s.treatment !== "No M&R").sort((a, b) => a.pci - b.pci);
  const yearBySection = new Map<string, RehabYear>();
  triggered.forEach((item, i) => {
    const bucket = Math.min(4, Math.floor((i * 5) / triggered.length));
    yearBySection.set(item.section.Section, REHAB_YEARS[bucket]);
  });

  return scored.map((item) => {
    const priorityYear = yearBySection.get(item.section.Section) ?? "Not Scheduled";
    return { ...item, priorityYear, color: REHAB_YEAR_COLORS[priorityYear] };
  });
}

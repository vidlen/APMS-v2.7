import type { SectionData } from "./pci-utils.ts";
import { parsePCIValue } from "./pci-utils.ts";

export type RehabTreatment =
  | "No M&R"
  | "Seal Coat / Crack Sealing"
  | "5 cm Overlay"
  | "6 cm Overlay"
  | "12 cm Structural Overlay";

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

// The thesis's four-case-study treatment matrix: a PCI ceiling below which
// that treatment applies, most severe first so a branch matches exactly one
// row. Exported as-is (not just folded into getTreatment) so the tab can
// render the same table it decides from, rather than a second hand-typed
// copy of it.
export const REHAB_METHODOLOGY: { treatment: RehabTreatment; maxPci: number }[] = [
  { treatment: "12 cm Structural Overlay", maxPci: 40 },
  { treatment: "6 cm Overlay", maxPci: 53 },
  { treatment: "5 cm Overlay", maxPci: 65 },
  { treatment: "Seal Coat / Crack Sealing", maxPci: 80 },
];

// PCI above which no treatment is needed - the least severe row's ceiling.
export const REHAB_TRIGGER_PCI = REHAB_METHODOLOGY[REHAB_METHODOLOGY.length - 1].maxPci;

export interface RehabPlanItem {
  section: SectionData;
  pci: number;
  treatment: RehabTreatment;
  priorityYear: RehabYear;
  color: string;
}

function getTreatment(pci: number): RehabTreatment {
  for (const { treatment, maxPci } of REHAB_METHODOLOGY) {
    if (pci <= maxPci) return treatment;
  }
  return "No M&R";
}

// Priority year: branches that trigger (any treatment other than No M&R) are
// ranked worst-PCI-first - the same ordering risk.ts' comparePriorityOrders
// already compares itself against - and spread evenly across a 5-year
// window, worst branches first.
export function computeRehabPlan(sections: SectionData[]): RehabPlanItem[] {
  const branches = sections.filter((s) => s.sampleUnit === undefined);

  const scored = branches.map((section) => {
    const pci = parsePCIValue(section["PCI Rating"]);
    return { section, pci, treatment: getTreatment(pci) };
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

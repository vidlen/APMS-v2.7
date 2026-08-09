/**
 * risk-adapter.ts
 * -----------------------------------------------------------------------------
 * Bridges the app's existing SectionData (the PCI tab's data model) into the
 * risk engine's BranchRiskInput, so the Risk tab can score the same 75
 * branches the PCI map already shows, with no separate dataset to maintain.
 *
 * The dummy GeoJSON does not yet carry `role`, `lastInspectionYear` or
 * `dominantDistress` per branch (brief backlog item B - a real inventory
 * task, not something inferable from what's already committed). Until that
 * lands, this file supplies defensible stand-ins:
 *
 *  - lastInspectionYear: the survey year already being viewed. This is not a
 *    guess - the branch's PCI figure itself comes from that year's survey.
 *  - role: inferred from the branch's Section code. ponytail: a name-based
 *    heuristic, not a real per-branch assignment. Ceiling: cannot tell a
 *    high-speed exit taxiway from an ordinary connector by code alone, so
 *    every code that isn't clearly a runway, a full-length parallel taxiway,
 *    or an apron defaults to secondary_taxiway. Upgrade path: add a real
 *    `role` field to each GeoJSON feature (backlog item B) and read it here
 *    in preference to the heuristic.
 *  - dominantDistress: left undefined for all 75 branches (-> hazard class
 *    'other'). Per-sample-unit PAVER distress records exist for two runways
 *    only (06/24, 07L/25R, via SEED_SAMPLE_UNIT_SOURCES); aggregating "the
 *    distress with the highest total deduct" from those would cover 2 of 75
 *    register rows and is deferred rather than shipped half-done.
 *
 * toBranchRiskInputs' third argument is the upgrade path promised above: an
 * admin-entered override per branch (Admin -> Risk Inventory, persisted via
 * setSectionRiskMeta - localStorage demo overrides, same status as PCI edits,
 * never the committed calibration itself). Any field left unset there still
 * falls back to the stand-ins documented above.
 *
 * The fourth argument is backlog M: Teammate A's Tier 1 Markov forecast
 * (Admin -> Tier 1 Forecast, brief section 11). scoreBranch has resolved
 * Tier 1 ahead of Tier 2/3 since the original draft - a branch with a
 * matching entry here scores on it automatically; every branch without one
 * keeps scoring on Tier 3 exactly as before. Nothing about this module ever
 * blocked on Teammate A's delivery; this argument is simply where it plugs
 * in once it exists.
 * -----------------------------------------------------------------------------
 */

// .ts extensions below are required so `node --test` can resolve this module
// directly (see the note in risk.ts) - Vite and tsc both resolve it fine.
import type { SectionData } from './pci-utils.ts';
import { parsePCIValue } from './pci-utils.ts';
import type { SurveyYear } from './survey-years.ts';
import type { BranchRiskInput } from './risk.ts';
import type { BranchRole } from '../config/riskScales.ts';
import type { SectionRiskMetaOverride } from './data-overrides.ts';
import type { MarkovForecastEntry } from './markov-forecast.ts';

// SHIA's own runway designators ("06/24", "07L/25R"). Matches exactly two of
// the 75 codes.
const RUNWAY_PATTERN = /^\d{2}[LCR]?\/\d{2}[LCR]?$/;

// NP1-NP3 / SP1-SP2: the full-length parallel taxiways, distinguishable from
// every other taxiway code by their dimension (3100-3760 m, matching runway
// length) as well as the NP/SP prefix.
const PARALLEL_TAXIWAY_PATTERN = /^(NP|SP)\d/;

export function roleFromSectionName(section: string): BranchRole {
  const name = section.trim();
  if (RUNWAY_PATTERN.test(name)) return 'runway';
  if (name.startsWith('Remote Apron')) return 'remote_apron';
  if (name.startsWith('Apron')) return 'active_apron';
  if (PARALLEL_TAXIWAY_PATTERN.test(name)) return 'parallel_taxiway';
  // Every remaining code (N#, NC#, S#, SC#, M#, WC#, EC#, NCY, NPW, SPW,
  // NPE, SPE, ...) is a shorter connector/exit taxiway - see the ceiling note
  // in the file header. This is the fallback, not an inference.
  return 'secondary_taxiway';
}

export function toBranchRiskInputs(
  sections: SectionData[],
  year: SurveyYear,
  overridesByBranch: Record<string, SectionRiskMetaOverride> = {},
  markovByBranch: Record<string, MarkovForecastEntry> = {},
): BranchRiskInput[] {
  const parsedYear = Number.parseInt(year, 10);
  const defaultInspectionYear = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();

  return sections.map((s) => {
    const override = overridesByBranch[s.Section];
    return {
      branchId: s.Section,
      branchName: s.Section,
      role: override?.role ?? roleFromSectionName(s.Section),
      currentPci: parsePCIValue(s['PCI Rating']),
      lastInspectionYear: override?.lastInspectionYear ?? defaultInspectionYear,
      dominantDistress: override?.dominantDistress,
      detectability: override?.detectability,
      // LfcOverride mirrors BranchRiskInput['overrides'] field for field
      // (backlog L) - passed straight through, applied last in scoreBranch.
      overrides: override?.lfcOverride,
      // Backlog M - present only for a branch Teammate A's forecast covers.
      markovTriggerProbability: markovByBranch[s.Section]?.markovTriggerProbability,
    };
  });
}

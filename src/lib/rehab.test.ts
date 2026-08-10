/**
 * rehab.test.ts
 * -----------------------------------------------------------------------------
 * computeRehabPlan is the one non-obvious piece of logic in rehab.ts: the
 * surface-family/treatment decision per PCI band, and the worst-PCI-first
 * bucketing of triggered branches across a 5-year window. A silently-wrong
 * bucket count or a mis-typed treatment would misinform the Rehabilitation
 * Plan tab's map colors and register without ever throwing.
 * -----------------------------------------------------------------------------
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRehabPlan } from './rehab.ts';
import { TRIGGER_STATE_PCI } from '../config/riskScales.ts';
import type { SectionData } from './pci-utils.ts';

function section(overrides: Partial<SectionData> & { Section: string; "PCI Rating": string }): SectionData {
  return { PCN: '80/F/A/X/T', Type: 'Asphalt', ...overrides };
}

test('a branch at or above the trigger PCI gets No M&R and is Not Scheduled', () => {
  const plan = computeRehabPlan([section({ Section: 'A1', 'PCI Rating': String(TRIGGER_STATE_PCI) })]);
  assert.equal(plan[0].treatment, 'No M&R');
  assert.equal(plan[0].priorityYear, 'Not Scheduled');
});

test('an exposed Concrete surface gets a PCC treatment, "Asphalt on PCC" gets an AC treatment', () => {
  const plan = computeRehabPlan([
    section({ Section: 'PCC1', 'PCI Rating': '50', Type: 'Concrete' }),
    section({ Section: 'COMPOSITE1', 'PCI Rating': '50', Type: 'Asphalt on PCC' }),
  ]);
  assert.equal(plan.find((p) => p.section.Section === 'PCC1')?.treatment, 'PCC Rehabilitation');
  assert.equal(plan.find((p) => p.section.Section === 'COMPOSITE1')?.treatment, 'AC Rehabilitation');
});

test('treatment escalates from seal coat to rehabilitation to reconstruction as PCI drops', () => {
  const plan = computeRehabPlan([
    section({ Section: 'SEAL', 'PCI Rating': '75' }),
    section({ Section: 'REHAB', 'PCI Rating': '50' }),
    section({ Section: 'RECON', 'PCI Rating': '20' }),
  ]);
  assert.equal(plan.find((p) => p.section.Section === 'SEAL')?.treatment, 'Preventive Maintenance (Seal Coat)');
  assert.equal(plan.find((p) => p.section.Section === 'REHAB')?.treatment, 'AC Rehabilitation');
  assert.equal(plan.find((p) => p.section.Section === 'RECON')?.treatment, 'AC Reconstruction');
});

test('triggered branches are bucketed worst-PCI-first across exactly 5 years', () => {
  // 10 triggered branches, evenly spread PCI so ordering is unambiguous.
  const sections = Array.from({ length: 10 }, (_, i) =>
    section({ Section: `B${i}`, 'PCI Rating': String(10 + i * 5) })
  );
  const plan = computeRehabPlan(sections);
  const byPci = plan.slice().sort((a, b) => a.pci - b.pci);
  assert.equal(byPci[0].priorityYear, 'Year 1', 'worst PCI must land in Year 1');
  assert.equal(byPci[9].priorityYear, 'Year 5', 'best-of-the-triggered PCI must land in Year 5');
  for (const year of ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']) {
    assert.equal(plan.filter((p) => p.priorityYear === year).length, 2, `${year} should get 2 of 10`);
  }
});

test('sample-unit rows are excluded from the branch-level plan', () => {
  const plan = computeRehabPlan([
    section({ Section: 'X1', 'PCI Rating': '50' }),
    section({ Section: 'X1', 'PCI Rating': '40', sampleUnit: 3 }),
  ]);
  assert.equal(plan.length, 1);
});

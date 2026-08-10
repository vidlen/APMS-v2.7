/**
 * rehab.test.ts
 * -----------------------------------------------------------------------------
 * computeRehabPlan is the one non-obvious piece of logic in rehab.ts: the
 * four-case-study PCI threshold table (REHAB_METHODOLOGY) that decides a
 * branch's treatment, and the worst-PCI-first bucketing of triggered
 * branches across a 5-year window. A silently-wrong boundary or bucket count
 * would misinform the Rehabilitation Plan tab's map colors and register
 * without ever throwing.
 * -----------------------------------------------------------------------------
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRehabPlan, REHAB_TRIGGER_PCI } from './rehab.ts';
import type { SectionData } from './pci-utils.ts';

function section(overrides: Partial<SectionData> & { Section: string; "PCI Rating": string }): SectionData {
  return { PCN: '80/F/A/X/T', Type: 'Asphalt', ...overrides };
}

test('a branch above the trigger PCI gets No M&R and is Not Scheduled', () => {
  const plan = computeRehabPlan([section({ Section: 'A1', 'PCI Rating': String(REHAB_TRIGGER_PCI + 1) })]);
  assert.equal(plan[0].treatment, 'No M&R');
  assert.equal(plan[0].priorityYear, 'Not Scheduled');
});

test('each of the four case-study thresholds selects its own treatment at the boundary', () => {
  const plan = computeRehabPlan([
    section({ Section: 'SEAL', 'PCI Rating': '80' }), // <= 80
    section({ Section: 'OV5', 'PCI Rating': '65' }), // <= 65
    section({ Section: 'OV6', 'PCI Rating': '53' }), // <= 53
    section({ Section: 'OV12', 'PCI Rating': '40' }), // <= 40
  ]);
  assert.equal(plan.find((p) => p.section.Section === 'SEAL')?.treatment, 'Seal Coat / Crack Sealing');
  assert.equal(plan.find((p) => p.section.Section === 'OV5')?.treatment, '5 cm Overlay');
  assert.equal(plan.find((p) => p.section.Section === 'OV6')?.treatment, '6 cm Overlay');
  assert.equal(plan.find((p) => p.section.Section === 'OV12')?.treatment, '12 cm Structural Overlay');
});

test('a PCI just above a threshold falls into the lighter treatment, not the heavier one', () => {
  const plan = computeRehabPlan([
    section({ Section: 'JUST_ABOVE_65', 'PCI Rating': '66' }),
    section({ Section: 'JUST_ABOVE_53', 'PCI Rating': '54' }),
    section({ Section: 'JUST_ABOVE_40', 'PCI Rating': '41' }),
  ]);
  assert.equal(plan.find((p) => p.section.Section === 'JUST_ABOVE_65')?.treatment, 'Seal Coat / Crack Sealing');
  assert.equal(plan.find((p) => p.section.Section === 'JUST_ABOVE_53')?.treatment, '5 cm Overlay');
  assert.equal(plan.find((p) => p.section.Section === 'JUST_ABOVE_40')?.treatment, '6 cm Overlay');
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

/**
 * risk-adapter.test.ts
 * -----------------------------------------------------------------------------
 * Pins roleFromSectionName's boundary cases against SHIA's real branch codes
 * (from public/data/pavement-data.json) - the heuristic is a plain lookup
 * table's worth of regex, but it is the one piece of non-obvious branching
 * logic in risk-adapter.ts, so it gets a check.
 * -----------------------------------------------------------------------------
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleFromSectionName, toBranchRiskInputs } from './risk-adapter.ts';
import type { SectionData } from './pci-utils.ts';

test('roleFromSectionName classifies every branch code shape', () => {
  // Runways: two-digit heading, optional L/C/R suffix.
  assert.equal(roleFromSectionName('06/24'), 'runway');
  assert.equal(roleFromSectionName('07L/25R'), 'runway');
  assert.equal(roleFromSectionName('07R/25L'), 'runway');

  // Full-length parallel taxiways: NP/SP followed by a digit.
  assert.equal(roleFromSectionName('NP1'), 'parallel_taxiway');
  assert.equal(roleFromSectionName('SP2'), 'parallel_taxiway');

  // NPE/NPW/SPE/SPW are short connectors, not the ~3.7km parallel taxiways -
  // NP/SP followed by a letter must NOT match the parallel pattern.
  assert.equal(roleFromSectionName('NPE'), 'secondary_taxiway');
  assert.equal(roleFromSectionName('SPW'), 'secondary_taxiway');

  // Aprons and remote aprons.
  assert.equal(roleFromSectionName('Apron A'), 'active_apron');
  assert.equal(roleFromSectionName('Remote Apron B'), 'remote_apron');

  // Ordinary connector/exit taxiways fall back to secondary_taxiway.
  assert.equal(roleFromSectionName('N3'), 'secondary_taxiway');
  assert.equal(roleFromSectionName('SC4'), 'secondary_taxiway');
});

const SECTION: SectionData = {
  Section: 'N3',
  'PCI Rating': '82',
  PCN: '111/R/D/W/T',
  Type: 'Asphalt',
};

test('toBranchRiskInputs falls back to the heuristic and the survey year when no override is set', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024');
  assert.equal(input.role, 'secondary_taxiway', 'heuristic default for an N-code');
  assert.equal(input.lastInspectionYear, 2024, 'survey year, no admin override');
  assert.equal(input.dominantDistress, undefined);
});

test('toBranchRiskInputs prefers an admin-entered override over the heuristic default', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024', {
    N3: { role: 'runway', lastInspectionYear: 2019, dominantDistress: 'RAVELING', detectability: 'hidden' },
  });
  assert.equal(input.role, 'runway', 'explicit override wins over roleFromSectionName');
  assert.equal(input.lastInspectionYear, 2019, 'explicit override wins over the survey year');
  assert.equal(input.dominantDistress, 'RAVELING');
  assert.equal(input.detectability, 'hidden', 'detectability override reaches the risk engine input');
});

test('toBranchRiskInputs applies a partial override field-by-field, not all-or-nothing', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024', {
    N3: { dominantDistress: 'ALLIGATOR CR' },
  });
  assert.equal(input.role, 'secondary_taxiway', 'role still falls back to the heuristic');
  assert.equal(input.lastInspectionYear, 2024, 'lastInspectionYear still falls back to the survey year');
  assert.equal(input.dominantDistress, 'ALLIGATOR CR', 'only the overridden field changes');
});

test('toBranchRiskInputs threads lfcOverride through as BranchRiskInput.overrides (backlog L)', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024', {
    N3: { lfcOverride: { likelihood: 10, note: 'Expert panel', setBy: 'J. Doe', setOn: '2026-01-15' } },
  });
  assert.deepEqual(input.overrides, {
    likelihood: 10,
    note: 'Expert panel',
    setBy: 'J. Doe',
    setOn: '2026-01-15',
  });
});

test('toBranchRiskInputs leaves overrides undefined when no lfcOverride is set', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024', { N3: { role: 'runway' } });
  assert.equal(input.overrides, undefined);
});

test('toBranchRiskInputs sets markovTriggerProbability for a branch Teammate A\'s forecast covers (backlog M)', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024', {}, {
    N3: { branchId: 'N3', horizonYears: 5, triggerPci: 80, markovTriggerProbability: 0.34 },
  });
  assert.equal(input.markovTriggerProbability, 0.34);
});

test('toBranchRiskInputs leaves markovTriggerProbability undefined for a branch the forecast does not cover', () => {
  const [input] = toBranchRiskInputs([SECTION], '2024', {}, {
    'some-other-branch': { branchId: 'some-other-branch', horizonYears: 5, triggerPci: 80, markovTriggerProbability: 0.34 },
  });
  assert.equal(input.markovTriggerProbability, undefined, 'falls back to Tier 2/3, exactly as before this branch had a forecast');
});

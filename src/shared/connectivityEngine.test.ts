import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNewbornGrowthSummary,
  calculatePregnancyStage,
  canTransitionConnection,
  computeNextSequentialId,
  formatUniqueId,
  summarizeVaccinationProgress,
} from './connectivityEngine';

test('Unique ID formatting and collision-free sequential generation', () => {
  assert.equal(formatUniqueId('ASHA', 2026, 1), 'ASHA-2026-0001');
  assert.equal(formatUniqueId('PAT', 2026, 42), 'PAT-2026-0042');

  const nextAsha = computeNextSequentialId('ASHA', ['ASHA-2026-0001', 'ASHA-2026-0003'], 2026);
  assert.equal(nextAsha, 'ASHA-2026-0004');

  const firstPat = computeNextSequentialId('PAT', [], 2026);
  assert.equal(firstPat, 'PAT-2026-0001');

  // Handles out-of-order and mixed years cleanly
  const nextPat = computeNextSequentialId('PAT', ['PAT-2025-0099', 'PAT-2026-0001', 'PAT-2026-0002'], 2026);
  assert.equal(nextPat, 'PAT-2026-0003');
});

test('Pregnancy stage and weeks remaining calculation', () => {
  const first = calculatePregnancyStage(10);
  assert.equal(first.trimester, 'First Trimester');
  assert.equal(first.weeksRemaining, 30);

  const second = calculatePregnancyStage(22);
  assert.equal(second.trimester, 'Second Trimester');
  assert.equal(second.weeksRemaining, 18);

  const third = calculatePregnancyStage(34);
  assert.equal(third.trimester, 'Third Trimester');
  assert.equal(third.weeksRemaining, 6);
});

test('Newborn growth summary tracks weight delta and flags low weight', () => {
  const thriving = calculateNewbornGrowthSummary(2.9, 3.2, '2026-11-10', new Date('2026-11-21'));
  assert.equal(thriving.ageDays, 11);
  assert.equal(thriving.weightGainKg, 0.3);
  assert.equal(thriving.growthStatus, 'THRIVING');

  const attention = calculateNewbornGrowthSummary(2.4, 2.0, '2026-11-15', new Date('2026-11-21'));
  assert.equal(attention.growthStatus, 'NEEDS_ATTENTION');
});

test('Vaccination progress summary counts completed, pending, and overdue accurately', () => {
  const stats = summarizeVaccinationProgress([
    { status: 'COMPLETED' },
    { status: 'COMPLETED' },
    { status: 'PENDING' },
    { status: 'OVERDUE' },
  ]);
  assert.equal(stats.totalCount, 4);
  assert.equal(stats.completedCount, 2);
  assert.equal(stats.pendingCount, 2);
  assert.equal(stats.overdueCount, 1);
  assert.equal(stats.completionPct, 50);
});

test('Connection state transitions prevent duplicates and require pending state for approval/rejection', () => {
  assert.deepEqual(canTransitionConnection(null, 'REQUEST'), {
    allowed: true,
    nextStatus: 'PENDING',
  });
  assert.equal(canTransitionConnection('CONNECTED', 'REQUEST').allowed, false);
  assert.equal(canTransitionConnection('PENDING', 'REQUEST').allowed, false);
  assert.deepEqual(canTransitionConnection('REJECTED', 'REQUEST'), {
    allowed: true,
    nextStatus: 'PENDING',
  });

  assert.deepEqual(canTransitionConnection('PENDING', 'APPROVE'), {
    allowed: true,
    nextStatus: 'CONNECTED',
  });
  assert.deepEqual(canTransitionConnection('PENDING', 'REJECT'), {
    allowed: true,
    nextStatus: 'REJECTED',
  });
  assert.equal(canTransitionConnection('CONNECTED', 'REJECT').allowed, false);
});

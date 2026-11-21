import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDangerSigns } from './dangerSigns';

test('detects positive pregnancy vaginal bleeding danger sign', () => {
  const res = detectDangerSigns('The pregnant woman has vaginal bleeding.', 'ANC');
  assert.equal(res.status, 'positive_detected');
  assert.equal(res.matches[0]?.code, 'PREG_VAGINAL_BLEEDING');
  assert.equal(res.matches[0]?.severityCategory, 'IMMEDIATE_PHC_REFERRAL');
});

test('handles negation cleanly: Mother has no bleeding must NOT trigger danger alert', () => {
  const res = detectDangerSigns('Mother has no bleeding. Weight is 52 kg.', 'ANC');
  assert.equal(res.status, 'none_detected');
  assert.equal(res.matches.length, 0);
  assert.equal(res.negatedMatches.length, 1);
  assert.equal(res.negatedMatches[0]?.code, 'PREG_VAGINAL_BLEEDING');
});

test('handles Indic code-mixed negation: bleeding illa and khoon nahi aa raha', () => {
  const knRes = detectDangerSigns('Nandini avarige bleeding illa, ANC checkup agide.', 'ANC');
  assert.equal(knRes.status, 'none_detected');
  assert.equal(knRes.matches.length, 0);

  const hiRes = detectDangerSigns('Mata ko khoon nahi aa raha hai, sab theek hai.', 'ANC');
  assert.equal(hiRes.status, 'none_detected');
  assert.equal(hiRes.matches.length, 0);
});

test('detects newborn high fever and not feeding simultaneously', () => {
  const res = detectDangerSigns('The newborn has high fever and is not feeding.', 'NEWBORN');
  assert.equal(res.status, 'positive_detected');
  const codes = res.matches.map((m) => m.code);
  assert.ok(codes.includes('NB_FEVER_OR_HYPOTHERMIA'));
  assert.ok(codes.includes('NB_POOR_FEEDING'));
});

test('does not trigger poor feeding when newborn is feeding properly', () => {
  const res = detectDangerSigns('Baby weight 2.8 kilo, baby is feeding properly.', 'NEWBORN');
  assert.equal(res.status, 'none_detected');
  assert.equal(res.matches.length, 0);
});

test('flags uncertain danger phrase as uncertain_pending_safety instead of silently safe', () => {
  const res = detectDangerSigns('Maybe mother has vaginal bleeding?', 'ANC');
  assert.equal(res.status, 'uncertain_pending_safety');
  assert.equal(res.uncertainMatches.length, 1);
});

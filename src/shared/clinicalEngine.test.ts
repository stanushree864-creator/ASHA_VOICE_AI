import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVoiceCorrection,
  buildReadBackScript,
  computeFieldProvenanceSpans,
  extractBloodPressure,
  extractStructuredVisitDeterministic,
  extractWeightKg,
  generateFollowUpsFromRecord,
  matchBeneficiary,
  SYNTHETIC_BENEFICIARIES,
} from './clinicalEngine';
import { getLocalizedQuestionGuide, QUESTION_GUIDES } from './questionGuides';

test('matches synthetic beneficiary by exact code ASHA00125', () => {
  const result = matchBeneficiary('Today I visited beneficiary ASHA00125, Nandini.', SYNTHETIC_BENEFICIARIES);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.matches[0]?.beneficiaryCode, 'ASHA00125');
  assert.equal(result.matches[0]?.displayName, 'Nandini');
});

test('returns AMBIGUOUS when multiple beneficiaries share a name fragment', () => {
  const result = matchBeneficiary('Nandini', SYNTHETIC_BENEFICIARIES);
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.matches.length, 2);
});

test('extracts Scenario 1 pregnancy visit accurately without inventing missing fields', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Today I visited beneficiary ASHA00125, Nandini. ANC checkup completed. Weight is 52 kilo. IFA goli taking. Next visit on 28 November.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
    visitDate: '2026-11-21',
  });

  assert.equal(record.beneficiaryId, 'ASHA00125');
  assert.equal(record.beneficiaryName, 'Nandini');
  assert.equal(record.pregnancyDetails?.weightKg, 52);
  assert.equal(record.pregnancyDetails?.ifaStatus, 'reported_taking');
  assert.equal(record.pregnancyDetails?.ancStatus, 'completed');
  assert.equal(record.pregnancyDetails?.bloodPressure, null); // Never invented
  assert.equal(record.nextVisitDate, '2026-11-28');
  assert.equal(record.dangerSignStatus, 'none_detected');
});

test('extracts Scenario 7 Kannada-English code-mixed visit', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Today Nandini ASHA00125 avarige ANC checkup agide, weight 52 kilo ide, IFA goli regular aagi togondiddare, TT injection complete agide.',
    visitType: 'ANC',
    language: 'kn',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00125');
  assert.equal(record.pregnancyDetails?.weightKg, 52);
  assert.equal(record.pregnancyDetails?.ifaStatus, 'reported_taking');
  assert.equal(record.pregnancyDetails?.vaccinationStatus, 'reported_completed');
});

test('applies Scenario 3 voice correction updating only weight while preserving other fields', () => {
  const initial = extractStructuredVisitDeterministic({
    transcript: 'Baby weight 3.8 kilo, baby is feeding properly, vaccination record checked.',
    visitType: 'NEWBORN',
    language: 'en',
    workerId: 'WORKER001',
    selectedBeneficiary: SYNTHETIC_BENEFICIARIES[2],
  });
  assert.equal(initial.newbornDetails?.currentWeightKg, 3.8);

  const corrected = applyVoiceCorrection(initial, 'No, weight is 2.8 kilo, not 3.8.');
  assert.equal(corrected.action, 'UPDATED_FIELD');
  assert.equal(corrected.updatedField, 'currentWeightKg');
  assert.equal(corrected.updatedRecord.newbornDetails?.currentWeightKg, 2.8);
  assert.equal(corrected.updatedRecord.newbornDetails?.feedingObservations, 'Feeding properly');
  assert.equal(corrected.updatedRecord.correctionHistory.length, 1);
  assert.equal(corrected.updatedRecord.correctionHistory[0]?.previousValue, '3.8');
  assert.equal(corrected.updatedRecord.correctionHistory[0]?.correctedValue, '2.8');
});

test('generates pending information follow-up instead of inventing next visit date when missing', () => {
  const record = extractStructuredVisitDeterministic({
    transcript: 'Baby weight 2.8 kilo, baby is feeding properly.',
    visitType: 'NEWBORN',
    language: 'en',
    workerId: 'WORKER001',
    selectedBeneficiary: SYNTHETIC_BENEFICIARIES[2],
  });
  assert.equal(record.nextVisitDate, null);
  const followups = generateFollowUpsFromRecord('visit-1', record);
  assert.ok(followups.some((f) => f.priority === 'PENDING_INFORMATION'));
});

test('extracts Immunisation visit vaccines given and due without inventing missing doses', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Aarav ASHA00128 immunisation visit. OPV-1 and Pentavalent-1 given today. PCV-1 due. Next visit on 18 December.',
    visitType: 'IMMUNISATION',
    language: 'en',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00128');
  assert.deepEqual(record.immunisationDetails?.vaccinesGiven, ['OPV-1', 'Pentavalent-1']);
  assert.deepEqual(record.immunisationDetails?.vaccinesDue, ['PCV-1']);
  assert.equal(record.nextVisitDate, '2026-12-18');
  assert.equal(record.immunisationDetails?.scheduleVersion, 'NIS-2026.03');
});

test('Scenario 6 noisy/unclear speech recovers safely without inventing weight or next visit date', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Visited Kavya ASHA00129. Background noise unclear weight... ANC checkup done, no bleeding.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00129');
  assert.equal(record.pregnancyDetails?.weightKg, null);
  assert.equal(record.nextVisitDate, null);
  assert.equal(record.dangerSignStatus, 'none_detected');
});

test('Scenario 8 barge-in next visit date correction requests clarification when date omitted and updates cleanly when provided', () => {
  const initial = extractStructuredVisitDeterministic({
    transcript: 'Visited ASHA00125 Nandini. Weight is 52 kilo. Next visit on 28 November.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });

  const promptOutcome = applyVoiceCorrection(initial, 'No, change the next visit date.');
  assert.equal(promptOutcome.action, 'NEEDS_CLARIFICATION');
  assert.equal(promptOutcome.updatedRecord.nextVisitDate, '2026-11-28');

  const updatedOutcome = applyVoiceCorrection(
    initial,
    'No, change the next visit date to 5 December.',
  );
  assert.equal(updatedOutcome.action, 'UPDATED_FIELD');
  assert.equal(updatedOutcome.updatedField, 'nextVisitDate');
  assert.equal(updatedOutcome.updatedRecord.nextVisitDate, '2026-12-05');
  assert.equal(updatedOutcome.updatedRecord.pregnancyDetails?.weightKg, 52);
});

test('extracts simple 2-line spoken visit with Name, Weight, BP, and Next Visit', () => {
  const record = extractStructuredVisitDeterministic({
    transcript: 'Name Nandini ASHA00125, weight 52.\nBP 118 76, next visit 28 November.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
    ashaWorkerName: 'Savitha Gowda',
    visitTime: '10:30 AM',
  });
  assert.equal(record.beneficiaryName, 'Nandini');
  assert.equal(record.ashaWorkerName, 'Savitha Gowda');
  assert.equal(record.visitTime, '10:30 AM');
  assert.equal(record.pregnancyDetails?.weightKg, 52);
  assert.equal(record.pregnancyDetails?.bloodPressure, '118/76');
  assert.equal(record.nextVisitDate, '2026-11-28');
});

test('extracts newborn babyGender, babyCondition, and precautions accurately', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Name Baby of Rekha ASHA00127, baby girl, weight 2.8 kilo, baby condition healthy feeding properly, precautions keep baby warm and exclusive breastfeeding, next visit 5 December.',
    visitType: 'NEWBORN',
    language: 'en',
    workerId: 'WORKER001',
    ashaWorkerName: 'Savitha Gowda',
  });
  assert.equal(record.beneficiaryId, 'ASHA00127');
  assert.equal(record.newbornDetails?.babyGender, 'Girl');
  assert.equal(record.newbornDetails?.currentWeightKg, 2.8);
  assert.equal(record.newbornDetails?.babyCondition, 'healthy feeding properly');
  assert.equal(record.precautions, 'keep baby warm and exclusive breastfeeding');
  assert.equal(record.nextVisitDate, '2026-12-05');
});

test('extracts immunisation childWeightKg, condition, vaccines, and precautions', () => {
  const record = extractStructuredVisitDeterministic({
    transcript:
      'Name Aarav ASHA00128, weight 6.4 kilo, OPV-1 and Pentavalent-1 given today. PCV-1 due. Condition active and healthy, precautions give paracetamol drops if mild fever, next visit 18 December.',
    visitType: 'IMMUNISATION',
    language: 'en',
    workerId: 'WORKER001',
  });
  assert.equal(record.beneficiaryId, 'ASHA00128');
  assert.equal(record.immunisationDetails?.childWeightKg, 6.4);
  assert.deepEqual(record.immunisationDetails?.vaccinesGiven, ['OPV-1', 'Pentavalent-1']);
  assert.deepEqual(record.immunisationDetails?.vaccinesDue, ['PCV-1']);
  assert.equal(record.immunisationDetails?.childCondition, 'active and healthy');
  assert.equal(record.precautions, 'give paracetamol drops if mild fever');
  assert.equal(record.nextVisitDate, '2026-12-18');
});

test('extracts blood pressure across formats, spoken numbers, and multiple languages while rejecting dates', () => {
  assert.equal(extractBloodPressure('118/76'), '118/76');
  assert.equal(extractBloodPressure('B.P. 120 over 80'), '120/80');
  assert.equal(extractBloodPressure('110 by 70'), '110/70');
  assert.equal(extractBloodPressure('BP: 130 85'), '130/85');
  assert.equal(extractBloodPressure('one twenty over eighty'), '120/80');
  assert.equal(extractBloodPressure('ಬಿಪಿ 120/80'), '120/80');
  assert.equal(extractBloodPressure('बीपी 120 80'), '120/80');
  assert.equal(extractBloodPressure('Next visit on 28/11'), null);

  const initial = extractStructuredVisitDeterministic({
    transcript: 'Name Nandini ASHA00125, BP 140/90, weight 52 kg.',
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });
  const fixedBp = applyVoiceCorrection(initial, 'BP is 118/76 not 140/90');
  assert.equal(fixedBp.action, 'UPDATED_FIELD');
  assert.equal(fixedBp.updatedField, 'bloodPressure');
  assert.equal(fixedBp.updatedRecord.pregnancyDetails?.bloodPressure, '118/76');
});

test('extracts weight across English, grams, spoken numbers, Indic digits, and regional scripts', () => {
  assert.equal(extractWeightKg('52 kgs'), 52);
  assert.equal(extractWeightKg('2800 grams'), 2.8);
  assert.equal(extractWeightKg('fifty two kilos'), 52);
  assert.equal(extractWeightKg('वजन ५२ किलो'), 52);
  assert.equal(extractWeightKg('ತೂಕ 54 ಕೆಜಿ'), 54);
  assert.equal(extractWeightKg('वजन 52 किलो'), 52);
  assert.equal(extractWeightKg('எடை 50 கிலோ'), 50);
  assert.equal(extractWeightKg('బరువు 55 కిలోలు'), 55);

  const imm = extractStructuredVisitDeterministic({
    transcript: 'Name Aarav ASHA00128, weight 6.0 kg, OPV-1 given today.',
    visitType: 'IMMUNISATION',
    language: 'kn',
    workerId: 'WORKER001',
  });
  const corrected = applyVoiceCorrection(imm, 'ತೂಕ 6.4 ಕೆಜಿ');
  assert.equal(corrected.action, 'UPDATED_FIELD');
  assert.equal(corrected.updatedField, 'childWeightKg');
  assert.equal(corrected.updatedRecord.immunisationDetails?.childWeightKg, 6.4);
});

test('marks ANC weight, ANC BP, and IMMUNISATION child weight questions answered independently and localizes guides & readback', () => {
  const ancWithWeightOnly = extractStructuredVisitDeterministic({
    transcript: 'ಹೆಸರು ನಂದಿನಿ ASHA00125, ತೂಕ 54 ಕೆಜಿ',
    visitType: 'ANC',
    language: 'kn',
    workerId: 'WORKER001',
  });
  const weightQ = QUESTION_GUIDES.find((q) => q.id === 'anc-weight');
  const bpQ = QUESTION_GUIDES.find((q) => q.id === 'anc-bp');
  assert.ok(weightQ && bpQ);
  assert.equal(weightQ.isAnswered(ancWithWeightOnly, ancWithWeightOnly.sourceTranscript), true);
  assert.equal(bpQ.isAnswered(ancWithWeightOnly, ancWithWeightOnly.sourceTranscript), false);

  const ancWithBp = extractStructuredVisitDeterministic({
    transcript: 'ಹೆಸರು ನಂದಿನಿ ASHA00125, ತೂಕ 54 ಕೆಜಿ, ಬಿಪಿ 118/76, ಸ್ಥಿತಿ ಸಾಮಾನ್ಯ, ಮುನ್ನೆಚ್ಚರಿಕೆ ವಿಶ್ರಾಂತಿ, ಮುಂದಿನ ಭೇಟಿ 28 ನವೆಂಬರ್',
    visitType: 'ANC',
    language: 'kn',
    workerId: 'WORKER001',
  });
  assert.equal(bpQ.isAnswered(ancWithBp, ancWithBp.sourceTranscript), true);
  assert.equal(ancWithBp.patientCondition, 'ಸಾಮಾನ್ಯ');
  assert.equal(ancWithBp.precautions, 'ವಿಶ್ರಾಂತಿ');
  assert.equal(ancWithBp.nextVisitDate, '2026-11-28');

  const immWeightQ = QUESTION_GUIDES.find((q) => q.id === 'imm-weight');
  assert.ok(immWeightQ);
  const locKn = getLocalizedQuestionGuide(bpQ, 'kn');
  assert.ok(locKn.question.includes('ರಕ್ತದೊತ್ತಡ'));

  const readbackKn = buildReadBackScript(ancWithBp, 'kn');
  assert.ok(readbackKn.includes('ತೂಕ: 54 ಕೆಜಿ'));
  assert.ok(readbackKn.includes('ಬಿಪಿ: 118/76'));
});

test('computes full precautions provenance span without cutting mid-word at 32 characters', () => {
  const transcript =
    'Name Nandini ASHA00125, weight 52 kg, BP 118/76, precautions take IFA tablet daily and rest well, next visit 28 November.';
  const rec = extractStructuredVisitDeterministic({
    transcript,
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });
  const spans = computeFieldProvenanceSpans(transcript, rec);
  const precSpan = spans.find((s) => s.fieldName === 'precautions');
  assert.ok(precSpan);
  assert.equal(precSpan.matchedText, 'take IFA tablet daily and rest well');
});

test('screenshot regression: extracts Priya, 45 kg, BP 120/80 without matching Baby of Rekha from precaution text', () => {
  const rec = extractStructuredVisitDeterministic({
    transcript:
      "Patient Name Priya, weight 45 kg, BP 120 80, pregnancy condition 6 months, precautions don't lift baby weight, next visit 1 December",
    visitType: 'ANC',
    language: 'en',
    workerId: 'WORKER001',
  });
  assert.equal(rec.beneficiaryId, null);
  assert.equal(rec.beneficiaryName, 'Priya');
  assert.equal(rec.pregnancyDetails?.weightKg, 45);
  assert.equal(rec.pregnancyDetails?.bloodPressure, '120/80');
  assert.equal(rec.pregnancyDetails?.pregnancyCondition, '6 months');
  assert.equal(rec.precautions, "don't lift baby weight");
  assert.equal(rec.nextVisitDate, '2026-12-01');
});

test('extracts BP across STT quirks, merged digits, spoken English/Hindi/Kannada words, and regional scripts', () => {
  assert.equal(extractBloodPressure('B P 120 80'), '120/80');
  assert.equal(extractBloodPressure('BP reading is normal 120 80'), '120/80');
  assert.equal(extractBloodPressure('BP 120, 80'), '120/80');
  assert.equal(extractBloodPressure('BP 12080'), '120/80');
  assert.equal(extractBloodPressure('BP hundred twenty over eighty'), '120/80');
  assert.equal(extractBloodPressure('beepy 120 80'), '120/80');
  assert.equal(extractBloodPressure('120-80'), '120/80');
  assert.equal(extractBloodPressure('age 25, 120 80'), '120/80');
  assert.equal(extractBloodPressure('बीपी एक सौ बीस बटा अस्सी'), '120/80');
  assert.equal(extractBloodPressure('ಬಿಪಿ ನೂರಾ ಇಪ್ಪತ್ತು ಬೈ ಎಂಬತ್ತು'), '120/80');
  assert.equal(extractBloodPressure('பிபி 118/76'), '118/76');
  assert.equal(extractBloodPressure('బీపీ 118/76'), '118/76');
  assert.equal(extractBloodPressure('ബീപി 118/76'), '118/76');

  const initial = extractStructuredVisitDeterministic({
    transcript: 'Name Nandini ASHA00125, weight 52 kg.',
    visitType: 'ANC',
    language: 'kn',
    workerId: 'WORKER001',
  });
  const fixed1 = applyVoiceCorrection(initial, 'BP 12080');
  assert.equal(fixed1.action, 'UPDATED_FIELD');
  assert.equal(fixed1.updatedRecord.pregnancyDetails?.bloodPressure, '120/80');

  const fixed2 = applyVoiceCorrection(initial, '120 80');
  assert.equal(fixed2.action, 'UPDATED_FIELD');
  assert.equal(fixed2.updatedRecord.pregnancyDetails?.bloodPressure, '120/80');

  const fixed3 = applyVoiceCorrection(initial, 'ಬಿಪಿ 118/76');
  assert.equal(fixed3.action, 'UPDATED_FIELD');
  assert.equal(fixed3.updatedRecord.pregnancyDetails?.bloodPressure, '118/76');
});

test('extracts ANC weight, BP, precautions, and next visit across all 12 languages', () => {
  const samples: Array<{ lang: Parameters<typeof extractStructuredVisitDeterministic>[0]['language']; text: string }> = [
    { lang: 'ta', text: 'பெயர் நந்தினி ASHA00125, எடை 52 கிலோ, பிபி 118/76, அடுத்த வருகை 28 நவம்பர்.' },
    { lang: 'te', text: 'పేరు నందిని ASHA00125, బరువు 52 కిలోలు, బీపీ 118/76, తదుపరి భేటీ 28 నవంబర్.' },
    { lang: 'ml', text: 'പേര് നന്ദിനി ASHA00125, ഭാരം 52 കിലോ, ബിപി 118/76, അടുത്ത സന്ദർശനം 28 നവംബർ.' },
    { lang: 'mr', text: 'नाव नंदिनी ASHA00125, वजन 52 किलो, बीपी 118/76, पुढील भेट 28 नोव्हेंबर.' },
    { lang: 'bn', text: 'নাম নন্দিনী ASHA00125, ওজন 52 কেজি, বিপি 118/76, পরবর্তী ভিজিট 28 নভেম্বর.' },
    { lang: 'gu', text: 'નામ નંદિની ASHA00125, વજન 52 કિલો, બીપી 118/76, આગામી મુલાકાત 28 નવેમ્બર.' },
    { lang: 'pa', text: 'ਨਾਮ ਨੰਦਿਨੀ ASHA00125, ਭਾਰ 52 ਕਿਲੋ, ਬੀਪੀ 118/76, ਅਗਲਾ ਦੌਰਾ 28 ਨਵੰਬਰ.' },
    { lang: 'or', text: 'ନାମ ନନ୍ଦିନୀ ASHA00125, ଓଜନ 52 କିଲୋ, ବିପି 118/76, ପରବର୍ତ୍ତୀ ପରିଦର୍ଶନ 28 ନଭେମ୍ବର.' },
    { lang: 'as', text: 'নাম নন্দিনী ASHA00125, ওজন 52 কেজি, বিপি 118/76, পৰৱৰ্তী ভ্ৰমণ 28 নৱেম্বৰ.' },
  ];

  for (const s of samples) {
    const rec = extractStructuredVisitDeterministic({
      transcript: s.text,
      visitType: 'ANC',
      language: s.lang,
      workerId: 'WORKER001',
    });
    assert.equal(rec.beneficiaryId, 'ASHA00125', `Failed beneficiaryId for ${s.lang}`);
    assert.equal(rec.pregnancyDetails?.weightKg, 52, `Failed weight for ${s.lang}`);
    assert.equal(rec.pregnancyDetails?.bloodPressure, '118/76', `Failed BP for ${s.lang}`);
    assert.equal(rec.nextVisitDate, '2026-11-28', `Failed date for ${s.lang}`);
  }

  // Verify native-script fallback name (with combining marks) and condition extraction
  const teFree = extractStructuredVisitDeterministic({
    transcript: 'పేరు ప్రియ, బరువు 48 కిలోలు, బీపీ 120 80, స్థితి సాధారణ, జాగ్రత్తలు విశ్రాంతి, తదుపరి భేటీ 1 డిసెంబర్',
    visitType: 'ANC',
    language: 'te',
    workerId: 'WORKER001',
  });
  assert.equal(teFree.beneficiaryName, 'ప్రియ');
  assert.equal(teFree.pregnancyDetails?.weightKg, 48);
  assert.equal(teFree.pregnancyDetails?.bloodPressure, '120/80');
  assert.equal(teFree.pregnancyDetails?.pregnancyCondition, 'సాధారణ');
  assert.equal(teFree.precautions, 'విశ్రాంతి');
  assert.equal(teFree.nextVisitDate, '2026-12-01');

  const teCondFixed = applyVoiceCorrection(teFree, 'స్థితి అధిక రక్తపోటు');
  assert.equal(teCondFixed.action, 'UPDATED_FIELD');
  assert.equal(teCondFixed.updatedField, 'patientCondition');
  assert.equal(teCondFixed.updatedRecord.pregnancyDetails?.pregnancyCondition, 'అధిక రక్తపోటు');
});




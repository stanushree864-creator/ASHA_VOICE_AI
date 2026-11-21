import type { LanguageCode } from './types';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  bcp47: string;
  scriptFamily: string;
  labels: {
    startHomeVisit: string;
    listening: string;
    processing: string;
    verifying: string;
    speaking: string;
    waitingConfirmation: string;
    confirmAndSave: string;
    correctByVoice: string;
    listenAgain: string;
    dangerAlertTitle: string;
    immediateReferral: string;
    yesSavePrompt: string;
  };
  emergencyAnnouncement: string;
  savePromptTemplate: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    bcp47: 'en-IN',
    scriptFamily: 'Latin',
    labels: {
      startHomeVisit: 'Start Home Visit',
      listening: 'Listening to visit notes...',
      processing: 'Processing speech & danger rules...',
      verifying: 'Verify structured record',
      speaking: 'Reading record aloud...',
      waitingConfirmation: 'Should I save this visit record?',
      confirmAndSave: 'Confirm & Save',
      correctByVoice: 'Correct by Voice',
      listenAgain: 'Listen Again',
      dangerAlertTitle: 'DANGER SIGN DETECTED',
      immediateReferral: 'IMMEDIATE REFERRAL TO PHC',
      yesSavePrompt: 'Say "Yes, save" or speak a correction.',
    },
    emergencyAnnouncement:
      'Attention. A danger sign has been reported. Please refer the beneficiary to the nearest Primary Health Centre immediately.',
    savePromptTemplate: 'Is this information correct? Should I save this visit record?',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    bcp47: 'kn-IN',
    scriptFamily: 'Kannada',
    labels: {
      startHomeVisit: 'ಮನೆ ಭೇಟಿ ಪ್ರಾರಂಭಿಸಿ',
      listening: 'ಭೇಟಿ ವಿವರಗಳನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
      processing: 'ಮಾಹಿತಿಯನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
      verifying: 'ದಾಖಲೆಯನ್ನು ಪರಿಶೀಲಿಸಿ',
      speaking: 'ದಾಖಲೆಯನ್ನು ಓದಿ ಹೇಳಲಾಗುತ್ತಿದೆ...',
      waitingConfirmation: 'ಈ ಭೇಟಿ ದಾಖಲೆಯನ್ನು ಉಳಿಸಬೇಕೇ?',
      confirmAndSave: 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಉಳಿಸಿ',
      correctByVoice: 'ಧ್ವನಿಯ ಮೂಲಕ ತಿದ್ದುಪಡಿ ಮಾಡಿ',
      listenAgain: 'ಮತ್ತೆ ಕೇಳಿ',
      dangerAlertTitle: 'ಅಪಾಯದ ಚಿಹ್ನೆ ಪತ್ತೆಯಾಗಿದೆ',
      immediateReferral: 'ತಕ್ಷಣ PHC ಗೆ ಕಳುಹಿಸಿ',
      yesSavePrompt: '"ಹೌದು, ಉಳಿಸಿ" ಎಂದು ಹೇಳಿ ಅಥವಾ ತಿದ್ದುಪಡಿ ತಿಳಿಸಿ.',
    },
    emergencyAnnouncement:
      'ಎಚ್ಚರಿಕೆ. ಅಪಾಯದ ಚಿಹ್ನೆ ಕಂಡುಬಂದಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಹತ್ತಿರದ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರಕ್ಕೆ ಕಳುಹಿಸಿ.',
    savePromptTemplate: 'ಈ ಮಾಹಿತಿ ಸರಿಯಾಗಿದೆಯೇ? ನಾನು ಈ ದಾಖಲೆಯನ್ನು ಉಳಿಸಲೇ?',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    bcp47: 'hi-IN',
    scriptFamily: 'Devanagari',
    labels: {
      startHomeVisit: 'गृह भेंट शुरू करें',
      listening: 'विवरण सुना जा रहा है...',
      processing: 'जानकारी और खतरे के संकेत जाँचे जा रहे हैं...',
      verifying: 'रिकॉर्ड सत्यापित करें',
      speaking: 'रिकॉर्ड पढ़कर सुनाया जा रहा है...',
      waitingConfirmation: 'क्या मैं यह विज़िट रिकॉर्ड सेव करूँ?',
      confirmAndSave: 'पुष्टि करें और सेव करें',
      correctByVoice: 'आवाज़ से सुधारें',
      listenAgain: 'दोबारा सुनें',
      dangerAlertTitle: 'खतरे का संकेत मिला',
      immediateReferral: 'तुरंत PHC रेफर करें',
      yesSavePrompt: '"हाँ, सेव करें" बोलें या सुधार बताएं।',
    },
    emergencyAnnouncement:
      'सावधान। खतरे का संकेत मिला है। कृपया लाभार्थी को तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र भेजें।',
    savePromptTemplate: 'क्या यह जानकारी सही है? क्या मैं यह रिकॉर्ड सेव कर दूँ?',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    bcp47: 'ta-IN',
    scriptFamily: 'Tamil',
    labels: {
      startHomeVisit: 'வீட்டு வருகையை தொடங்குங்கள்',
      listening: 'குரல் பதிவு கேட்கப்படுகிறது...',
      processing: 'தகவல் செயலாக்கப்படுகிறது...',
      verifying: 'பதிவை சரிபார்க்கவும்',
      speaking: 'பதிவு வாசிக்கப்படுகிறது...',
      waitingConfirmation: 'இந்த பதிவை சேமிக்கலாமா?',
      confirmAndSave: 'உறுதி செய்து சேமி',
      correctByVoice: 'குரல் மூலம் திருத்தவும்',
      listenAgain: 'மீண்டும் கேட்கவும்',
      dangerAlertTitle: 'அபாய அறிகுறி கண்டறியப்பட்டது',
      immediateReferral: 'உடனடியாக PHC-க்கு அனுப்பவும்',
      yesSavePrompt: '"ஆம், சேமி" என்று சொல்லவும் அல்லது திருத்தம் கூறவும்.',
    },
    emergencyAnnouncement:
      'கவனம். அபாய அறிகுறி பதிவாகியுள்ளது. உடனடியாக அருகிலுள்ள ஆரம்ப சுகாதார நிலையத்திற்கு அனுப்பவும்.',
    savePromptTemplate: 'இந்த தகவல் சரியானதா? இந்த பதிவை சேமிக்கலாமா?',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    bcp47: 'te-IN',
    scriptFamily: 'Telugu',
    labels: {
      startHomeVisit: 'ఇంటి సందర్శన ప్రారంభించండి',
      listening: 'వివరాలు వినబడుతున్నాయి...',
      processing: 'సమాచారం పరిశీలించబడుతోంది...',
      verifying: 'రికార్డును నిర్ధారించండి',
      speaking: 'రికార్డు చదివి వినిపించబడుతోంది...',
      waitingConfirmation: 'ఈ సందర్శన రికార్డును సేవ్ చేయమంటారా?',
      confirmAndSave: 'నిర్ధారించి సేవ్ చేయండి',
      correctByVoice: 'వాయిస్ ద్వారా సవరించండి',
      listenAgain: 'మళ్లీ వినండి',
      dangerAlertTitle: 'ప్రమాద సూచన గుర్తించబడింది',
      immediateReferral: 'తక్షణమే PHC కి పంపండి',
      yesSavePrompt: '"అవును, సేవ్ చేయండి" అని చెప్పండి లేదా మార్పు చెప్పండి.',
    },
    emergencyAnnouncement:
      'హెచ్చరిక. ప్రమాదకర లక్షణం గుర్తించబడింది. దయచేసి వెంటనే సమీప ప్రాథమిక ఆరోగ్య కేంద్రానికి పంపండి.',
    savePromptTemplate: 'ఈ సమాచారం సరైనదేనా? ఈ రికార్డును సేవ్ చేయమంటారా?',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    bcp47: 'ml-IN',
    scriptFamily: 'Malayalam',
    labels: {
      startHomeVisit: 'ഭവന സന്ദർശനം ആരംഭിക്കുക',
      listening: 'ശബ്ദ സന്ദേശം കേൾക്കുന്നു...',
      processing: 'വിവരങ്ങൾ പരിശോധിക്കുന്നു...',
      verifying: 'രേഖ പരിശോധിക്കുക',
      speaking: 'വിവരങ്ങൾ വായിച്ചു കേൾപ്പിക്കുന്നു...',
      waitingConfirmation: 'ഈ സന്ദർശന രേഖ സേവ് ചെയ്യട്ടെ?',
      confirmAndSave: 'ഉറപ്പാക്കി സേവ് ചെയ്യുക',
      correctByVoice: 'ശബ്ദത്തിലൂടെ തിരുത്തുക',
      listenAgain: 'വീണ്ടും കേൾക്കുക',
      dangerAlertTitle: 'അപായ സൂചന കണ്ടെത്തി',
      immediateReferral: 'ഉടൻ PHC-യിലേക്ക് റഫർ ചെയ്യുക',
      yesSavePrompt: '"അതെ, സേവ് ചെയ്യുക" എന്ന് പറയുക അല്ലെങ്കിൽ തിരുത്തുക.',
    },
    emergencyAnnouncement:
      'ശ്രദ്ധിക്കുക. അപായ സൂചന കണ്ടെത്തിയിരിക്കുന്നു. ദയവായി ഉടൻ അടുത്തുള്ള പ്രാഥമിക ആരോഗ്യ കേന്ദ്രത്തിലേക്ക് റഫർ ചെയ്യുക.',
    savePromptTemplate: 'ഈ വിവരങ്ങൾ ശരിയാണോ? ഈ രേഖ സേവ് ചെയ്യട്ടെ?',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    bcp47: 'mr-IN',
    scriptFamily: 'Devanagari',
    labels: {
      startHomeVisit: 'गृहभेट सुरू करा',
      listening: 'नोंदी ऐकल्या जात आहेत...',
      processing: 'माहिती तपासली जात आहे...',
      verifying: 'नोंद तपासा',
      speaking: 'नोंद वाचून दाखवली जात आहे...',
      waitingConfirmation: 'ही भेट नोंद सेव्ह करू का?',
      confirmAndSave: 'निश्चित करा आणि सेव्ह करा',
      correctByVoice: 'आवाजाने दुरुस्ती करा',
      listenAgain: 'पुन्हा ऐका',
      dangerAlertTitle: 'धोक्याचे लक्षण आढळले',
      immediateReferral: 'तात्काळ PHC कडे पाठवा',
      yesSavePrompt: '"हो, सेव्ह करा" म्हणा किंवा दुरुस्ती सांगा.',
    },
    emergencyAnnouncement:
      'सावधान. धोक्याचे लक्षण आढळले आहे. कृपया लाभार्थ्याला तात्काळ जवळच्या प्राथमिक आरोग्य केंद्रात पाठवा.',
    savePromptTemplate: 'ही माहिती बरोबर आहे का? ही नोंद सेव्ह करू का?',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    bcp47: 'bn-IN',
    scriptFamily: 'Bengali',
    labels: {
      startHomeVisit: 'গৃহ পরিদর্শন শুরু করুন',
      listening: 'কথা শোনা হচ্ছে...',
      processing: 'তথ্য বিশ্লেষণ করা হচ্ছে...',
      verifying: 'তথ্য যাচাই করুন',
      speaking: 'নথি পড়ে শোনানো হচ্ছে...',
      waitingConfirmation: 'আমি কি এই পরিদর্শন রেকর্ডটি সংরক্ষণ করব?',
      confirmAndSave: 'নিশ্চিত করুন ও সংরক্ষণ করুন',
      correctByVoice: 'ভয়েস দিয়ে সংশোধন করুন',
      listenAgain: 'আবার শুনুন',
      dangerAlertTitle: 'বিপদের লক্ষণ শনাক্ত হয়েছে',
      immediateReferral: 'অবিলম্বে PHC-তে রেফার করুন',
      yesSavePrompt: '"হ্যাঁ, সংরক্ষণ করুন" বলুন অথবা সংশোধন জানান।',
    },
    emergencyAnnouncement:
      'সতর্কতা। একটি বিপদের লক্ষণ রিপোর্ট করা হয়েছে। অনুগ্রহ করে অবিলম্বে নিকটস্থ প্রাথমিক স্বাস্থ্য কেন্দ্রে রেফার করুন।',
    savePromptTemplate: 'এই তথ্য কি সঠিক? আমি কি রেকর্ডটি সংরক্ষণ করব?',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    bcp47: 'gu-IN',
    scriptFamily: 'Gujarati',
    labels: {
      startHomeVisit: 'ગૃહ મુલાકાત શરૂ કરો',
      listening: 'અવાજ સાંભળી રહ્યા છીએ...',
      processing: 'માહિતી તપાસવામાં આવી રહી છે...',
      verifying: 'નોંધ ચકાસો',
      speaking: 'નોંધ વાંચીને સંભળાવવામાં આવી રહી છે...',
      waitingConfirmation: 'શું હું આ મુલાકાત નોંધ સાચવું?',
      confirmAndSave: 'પુષ્ટિ કરો અને સાચવો',
      correctByVoice: 'અવાજ દ્વારા સુધારો',
      listenAgain: 'ફરીથી સાંભળો',
      dangerAlertTitle: 'જોખમનું ચિહ્ન જણાયું છે',
      immediateReferral: 'તાત્કાલિક PHC ખાતે મોકલો',
      yesSavePrompt: '"હા, સાચવો" બોલો અથવા સુધારો જણાવો.',
    },
    emergencyAnnouncement:
      'સાવધાન. જોખમનું ચિહ્ન નોંધાયું છે. કૃપા કરીને લાભાર્થીને તાત્કાલિક નજીકના પ્રાથમિક આરોગ્ય કેન્દ્રમાં મોકલો.',
    savePromptTemplate: 'શું આ માહિતી સાચી છે? શું હું આ નોંધ સાચવું?',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    bcp47: 'pa-IN',
    scriptFamily: 'Gurmukhi',
    labels: {
      startHomeVisit: 'ਘਰ ਦਾ ਦੌਰਾ ਸ਼ੁਰੂ ਕਰੋ',
      listening: 'ਗੱਲ ਸੁਣੀ ਜਾ ਰਹੀ ਹੈ...',
      processing: 'ਜਾਣਕਾਰੀ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...',
      verifying: 'ਰਿਕਾਰਡ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
      speaking: 'ਰਿਕਾਰਡ ਪੜ੍ਹ ਕੇ ਸੁਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ...',
      waitingConfirmation: 'ਕੀ ਮੈਂ ਇਹ ਦੌਰਾ ਰਿਕਾਰਡ ਸੇਵ ਕਰਾਂ?',
      confirmAndSave: 'ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਸੇਵ ਕਰੋ',
      correctByVoice: 'ਆਵਾਜ਼ ਨਾਲ ਸੋਧੋ',
      listenAgain: 'ਦੁਬਾਰਾ ਸੁਣੋ',
      dangerAlertTitle: 'ਖ਼ਤਰੇ ਦਾ ਲੱਛਣ ਮਿਲਿਆ',
      immediateReferral: 'ਤੁਰੰਤ PHC ਭੇਜੋ',
      yesSavePrompt: '"ਹਾਂ, ਸੇਵ ਕਰੋ" ਬੋਲੋ ਜਾਂ ਸੋਧ ਦੱਸੋ।',
    },
    emergencyAnnouncement:
      'ਧਿਆਨ ਦਿਓ। ਖ਼ਤਰੇ ਦਾ ਲੱਛਣ ਦਰਜ ਹੋਇਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਨੇੜਲੇ ਪ੍ਰਾਇਮਰੀ ਹੈਲਥ ਸੈਂਟਰ ਭੇਜੋ।',
    savePromptTemplate: 'ਕੀ ਇਹ ਜਾਣਕਾਰੀ ਸਹੀ ਹੈ? ਕੀ ਮੈਂ ਰਿਕਾਰਡ ਸੇਵ ਕਰਾਂ?',
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    bcp47: 'or-IN',
    scriptFamily: 'Odia',
    labels: {
      startHomeVisit: 'ଗୃହ ପରିଦର୍ଶନ ଆରମ୍ଭ କରନ୍ତୁ',
      listening: 'କଥା ଶୁଣାଯାଉଛି...',
      processing: 'ତଥ୍ୟ ଯାଞ୍ଚ କରାଯାଉଛି...',
      verifying: 'ରେକର୍ଡ ଯାଞ୍ଚ କରନ୍ତୁ',
      speaking: 'ରେକର୍ଡ ପଢ଼ି ଶୁଣାଯାଉଛି...',
      waitingConfirmation: 'ମୁଁ ଏହି ପରିଦର୍ଶନ ରେକର୍ଡ ସେଭ୍ କରିବି କି?',
      confirmAndSave: 'ନିଶ୍ଚିତ କରନ୍ତୁ ଏବଂ ସେଭ୍ କରନ୍ତୁ',
      correctByVoice: 'ଭଏସ୍ ଦ୍ୱାରା ସଂଶୋଧନ କରନ୍ତୁ',
      listenAgain: 'ପୁଣି ଶୁଣନ୍ତୁ',
      dangerAlertTitle: 'ବିପଦ ସଙ୍କେତ ଚିହ୍ନଟ ହୋଇଛି',
      immediateReferral: 'ତୁରନ୍ତ PHC କୁ ପଠାନ୍ତୁ',
      yesSavePrompt: '"ହଁ, ସେଭ୍ କରନ୍ତୁ" କୁହନ୍ତୁ କିମ୍ବା ସଂଶୋଧନ ଜଣାନ୍ତୁ।',
    },
    emergencyAnnouncement:
      'ସାବଧାନ। ବିପଦ ସଙ୍କେତ ମିଳିଛି। ଦୟାକରି ତୁରନ୍ତ ନିକଟସ୍ଥ ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ରକୁ ପଠାନ୍ତୁ।',
    savePromptTemplate: 'ଏହି ତଥ୍ୟ ଠିକ୍ ଅଛି କି? ମୁଁ ରେକର୍ଡ ସେଭ୍ କରିବି କି?',
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    bcp47: 'as-IN',
    scriptFamily: 'Bengali-Assamese',
    labels: {
      startHomeVisit: 'ঘৰ ভ্ৰমণ আৰম্ভ কৰক',
      listening: 'কথা শুনা হৈছে...',
      processing: 'তথ্য পৰীক্ষা কৰা হৈছে...',
      verifying: 'নথি পৰীক্ষা কৰক',
      speaking: 'নথি পঢ়ি শুনোৱা হৈছে...',
      waitingConfirmation: 'মই এই ভ্ৰমণৰ তথ্য সংৰক্ষণ কৰোঁনে?',
      confirmAndSave: 'নিশ্চিত কৰি সংৰক্ষণ কৰক',
      correctByVoice: 'কণ্ঠস্বৰেৰে শুধৰাওক',
      listenAgain: 'আকৌ শুনক',
      dangerAlertTitle: 'বিপদৰ লক্ষণ ধৰা পৰিছে',
      immediateReferral: 'তৎক্ষণাৎ PHC-লৈ পঠিয়াওক',
      yesSavePrompt: '"হয়, সংৰক্ষণ কৰক" কওক বা শুধৰণি জনাওক।',
    },
    emergencyAnnouncement:
      'সাৱধান। বিপদৰ লক্ষণ পোৱা গৈছে। অনুগ্ৰহ কৰি তৎক্ষণাৎ ওচৰৰ প্ৰাথমিক স্বাস্থ্য কেন্দ্ৰলৈ প্ৰেৰণ কৰক।',
    savePromptTemplate: 'এই তথ্যবোৰ শুদ্ধনে? মই তথ্য সংৰক্ষণ কৰোঁনে?',
  },
];

export function getLanguageConfig(code: string | undefined): LanguageConfig {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}

export interface VocabularyEntry {
  canonical: string;
  category: 'ANC' | 'MEDICATION' | 'VACCINE' | 'FACILITY' | 'NEWBORN' | 'GENERAL';
  aliases: string[];
  preserveSpoken: boolean;
}

export const HEALTHCARE_VOCABULARY: VocabularyEntry[] = [
  {
    canonical: 'ANC Checkup',
    category: 'ANC',
    aliases: ['anc checkup', 'anc', 'antenatal checkup', 'garbhavati tapasane', 'garbhavati janch', 'pregnancy checkup', 'prasava purva'],
    preserveSpoken: false,
  },
  {
    canonical: 'TT / Td Injection',
    category: 'VACCINE',
    aliases: ['tt injection', 'td injection', 'tt', 'td', 'tetanus injection', 'tt shot', 'td dose', 'tt soot'],
    preserveSpoken: true,
  },
  {
    canonical: 'IFA Tablets',
    category: 'MEDICATION',
    aliases: ['ifa goli', 'ifa', 'iron tablets', 'folic acid', 'iron folic acid', 'kempu matre', 'loha goli', 'iron goli', 'ifa matre'],
    preserveSpoken: true,
  },
  {
    canonical: 'Birth Weight',
    category: 'NEWBORN',
    aliases: ['birth weight', 'janma bhara', 'janam wajan', 'baby weight', 'newborn weight'],
    preserveSpoken: false,
  },
  {
    canonical: 'Newborn Feeding',
    category: 'NEWBORN',
    aliases: ['newborn feeding', 'breastfeeding', 'haalu kudiyuvudu', 'doodh peena', 'paal kudikkuthu', 'feeding properly', 'suckling'],
    preserveSpoken: false,
  },
  {
    canonical: 'BCG Vaccine',
    category: 'VACCINE',
    aliases: ['bcg', 'bcg vaccine', 'bcg injection'],
    preserveSpoken: true,
  },
  {
    canonical: 'OPV (Oral Polio)',
    category: 'VACCINE',
    aliases: ['opv', 'polio', 'polio drops', 'opv-0', 'opv-1', 'opv-2', 'opv-3'],
    preserveSpoken: true,
  },
  {
    canonical: 'Pentavalent Vaccine',
    category: 'VACCINE',
    aliases: ['pentavalent', 'penta', 'penta-1', 'penta-2', 'penta-3', 'pentavalent-1'],
    preserveSpoken: true,
  },
  {
    canonical: 'PHC (Primary Health Centre)',
    category: 'FACILITY',
    aliases: ['phc', 'primary health centre', 'primary health center', 'prathamika arogya kendra', 'hospital', 'davakhana'],
    preserveSpoken: false,
  },
  {
    canonical: 'ANM',
    category: 'FACILITY',
    aliases: ['anm', 'auxiliary nurse midwife', 'health sister', 'nurse madam'],
    preserveSpoken: false,
  },
];

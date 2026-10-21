/**
 * Placeholder content: the API seeds its database from it and the app bundles it
 * as the offline fallback until it has fetched /content once.
 *
 * EVERYTHING HERE IS PLACEHOLDER — verify against official sources before
 * launch. No benefit amounts, helpline numbers or scheme URLs are included on
 * purpose; fill them only from verified official sources. Hindi copy also needs
 * review by a native speaker.
 */

import { type AppConfig, type EshramStep, type Scheme } from '../schemas';

export const SEED_AUTHORED_ON = '2026-10-15';

const PLACEHOLDER_PREFIX = { hi: 'प्लेसहोल्डर — ', en: 'PLACEHOLDER — ' };

const commonDocuments = {
  hi: [
    'ई-श्रम कार्ड / UAN नंबर',
    'बैंक खाते की जानकारी',
    'आधार (सिर्फ़ सरकारी दफ़्तर या वेबसाइट पर दिखाएँ)',
  ],
  en: [
    'e-Shram card / UAN number',
    'Bank account details',
    'Aadhaar (show only at the official office or website)',
  ],
};

const toBeConfirmed = {
  whoQualifies: {
    hi: 'ई-श्रम पर पंजीकृत कामगार जो योजना की शर्तें पूरी करते हैं। (पुष्टि होना बाकी)',
    en: 'Workers registered on e-Shram who meet the scheme conditions. (To be verified)',
  },
  whereToApply: {
    hi: 'पुष्टि होना बाकी — सरकारी वेबसाइट या नज़दीकी कॉमन सर्विस सेंटर (CSC)।',
    en: 'To be confirmed — the official website or your nearest Common Service Centre (CSC).',
  },
};

function placeholderName(hi: string, en: string) {
  return { hi: PLACEHOLDER_PREFIX.hi + hi, en: PLACEHOLDER_PREFIX.en + en };
}

export const SEED_SCHEMES: Scheme[] = [
  {
    id: 'placeholder-accident-cover',
    order: 1,
    name: placeholderName('दुर्घटना बीमा', 'Accident cover'),
    covers: {
      hi: 'काम के दौरान दुर्घटना में चोट या विकलांगता होने पर मदद। रकम और शर्तें सत्यापन के बाद जोड़ी जाएँगी।',
      en: 'Support if you are injured or disabled in an accident. Amounts and conditions will be added after verification.',
    },
  },
  {
    id: 'placeholder-life-cover',
    order: 2,
    name: placeholderName('जीवन बीमा', 'Life cover'),
    covers: {
      hi: 'कामगार की मृत्यु होने पर परिवार को सहायता। विवरण सत्यापन के बाद जोड़ा जाएगा।',
      en: "Support for the worker's family in case of death. Details will be added after verification.",
    },
  },
  {
    id: 'placeholder-health-cover',
    order: 3,
    name: placeholderName('स्वास्थ्य सहायता', 'Health cover'),
    covers: {
      hi: 'इलाज और अस्पताल के खर्च में मदद। विवरण सत्यापन के बाद जोड़ा जाएगा।',
      en: 'Help with treatment and hospital costs. Details will be added after verification.',
    },
  },
  {
    id: 'placeholder-maternity-support',
    order: 4,
    name: placeholderName('मातृत्व सहायता', 'Maternity support'),
    covers: {
      hi: 'गर्भावस्था और बच्चे के जन्म के समय सहायता। विवरण सत्यापन के बाद जोड़ा जाएगा।',
      en: 'Support during pregnancy and childbirth. Details will be added after verification.',
    },
  },
  {
    id: 'placeholder-old-age-support',
    order: 5,
    name: placeholderName('बुढ़ापे की सुरक्षा', 'Old-age support'),
    covers: {
      hi: 'बुढ़ापे में नियमित आय के लिए सहायता। विवरण सत्यापन के बाद जोड़ा जाएगा।',
      en: 'Support for a regular income in old age. Details will be added after verification.',
    },
  },
].map(scheme => ({
  ...scheme,
  whoQualifies: toBeConfirmed.whoQualifies,
  documents: commonDocuments,
  whereToApply: toBeConfirmed.whereToApply,
  helpline: null,
  url: null,
  lastVerified: SEED_AUTHORED_ON,
  placeholder: true,
}));

export const SEED_ESHRAM_STEPS: EshramStep[] = [
  {
    id: 'documents',
    illustration: 'documents',
    title: { hi: 'काग़ज़ तैयार रखें', en: 'Keep your documents ready' },
    body: {
      hi: 'आधार से जुड़ा मोबाइल फ़ोन और बैंक खाते की जानकारी पास रखें।',
      en: 'Keep your Aadhaar-linked mobile phone and bank account details with you.',
    },
  },
  {
    id: 'open-portal',
    illustration: 'browser',
    title: { hi: 'ई-श्रम वेबसाइट खोलें', en: 'Open the e-Shram website' },
    body: {
      hi: 'नीचे दिए बटन से ई-श्रम की सरकारी वेबसाइट खोलें और ख़ुद पंजीकरण (Register) चुनें।',
      en: 'Open the official e-Shram website with the button below and choose to register yourself.',
    },
  },
  {
    id: 'mobile-otp',
    illustration: 'phone-otp',
    title: { hi: 'मोबाइल नंबर डालें', en: 'Enter your mobile number' },
    body: {
      hi: 'आधार से जुड़ा मोबाइल नंबर डालें। फ़ोन पर आया OTP भरें।',
      en: 'Enter your Aadhaar-linked mobile number. Type in the OTP sent to your phone.',
    },
  },
  {
    id: 'aadhaar',
    illustration: 'id-card',
    title: { hi: 'आधार की पुष्टि करें', en: 'Confirm your Aadhaar' },
    body: {
      hi: 'आधार नंबर सिर्फ़ सरकारी वेबसाइट पर डालें, इस ऐप में कभी नहीं।',
      en: 'Enter your Aadhaar number only on the government website, never in this app.',
    },
  },
  {
    id: 'personal-details',
    illustration: 'form',
    title: { hi: 'अपनी जानकारी भरें', en: 'Fill in your details' },
    body: {
      hi: 'पता, पढ़ाई और काम की जानकारी भरें। अपने काम से मिलता-जुलता काम चुनें।',
      en: 'Fill in your address, education and work. Choose the work type that matches yours.',
    },
  },
  {
    id: 'bank-details',
    illustration: 'bank',
    title: { hi: 'बैंक की जानकारी जोड़ें', en: 'Add bank details' },
    body: {
      hi: 'खाता नंबर और IFSC ध्यान से भरें। जमा करने से पहले एक बार जाँच लें।',
      en: 'Enter your account number and IFSC carefully. Check once before submitting.',
    },
  },
  {
    id: 'download-card',
    illustration: 'card',
    title: { hi: 'अपना कार्ड डाउनलोड करें', en: 'Download your card' },
    body: {
      hi: 'पंजीकरण के बाद अपना ई-श्रम कार्ड डाउनलोड करें और UAN नंबर संभालकर रखें।',
      en: 'After registering, download your e-Shram card and keep your UAN number safe.',
    },
  },
  {
    id: 'mark-registered',
    illustration: 'check',
    title: { hi: 'ऐप में बताएँ', en: 'Tell the app' },
    body: {
      hi: 'वापस आकर "मैं पंजीकृत हूँ" चालू करें।',
      en: 'Come back and switch on "I\'m registered".',
    },
  },
].map((step, index) => ({
  ...step,
  order: index + 1,
  lastVerified: SEED_AUTHORED_ON,
  placeholder: true,
}));

export const SEED_APP_CONFIG: AppConfig = {
  minAppVersion: '0.1.0',
  singleThreshold: 90,
  multiThreshold: 120,
  fyStartMonth: 4,
};

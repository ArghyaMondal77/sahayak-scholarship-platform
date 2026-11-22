// West Bengal districts. `value` matches the district spelling used in
// src/data/partners.json (csc_centers[].district); en is the same as value.

export const WB_DISTRICTS = [
  { value: 'Alipurduar', en: 'Alipurduar', bn: 'আলিপুরদুয়ার', hi: 'अलीपुरद्वार' },
  { value: 'Bankura', en: 'Bankura', bn: 'বাঁকুড়া', hi: 'बांकुड़ा' },
  { value: 'Birbhum', en: 'Birbhum', bn: 'বীরভূম', hi: 'बीरभूम' },
  { value: 'Cooch Behar', en: 'Cooch Behar', bn: 'কোচবিহার', hi: 'कूचबिहार' },
  { value: 'Dakshin Dinajpur', en: 'Dakshin Dinajpur', bn: 'দক্ষিণ দিনাজপুর', hi: 'दक्षिण दिनाजपुर' },
  { value: 'Darjeeling', en: 'Darjeeling', bn: 'দার্জিলিং', hi: 'दार्जिलिंग' },
  { value: 'Hooghly', en: 'Hooghly', bn: 'হুগলি', hi: 'हुगली' },
  { value: 'Howrah', en: 'Howrah', bn: 'হাওড়া', hi: 'हावड़ा' },
  { value: 'Jalpaiguri', en: 'Jalpaiguri', bn: 'জলপাইগুড়ি', hi: 'जलपाईगुड़ी' },
  { value: 'Jhargram', en: 'Jhargram', bn: 'ঝাড়গ্রাম', hi: 'झाड़ग्राम' },
  { value: 'Kalimpong', en: 'Kalimpong', bn: 'কালিম্পং', hi: 'कालिम्पोंग' },
  { value: 'Kolkata', en: 'Kolkata', bn: 'কলকাতা', hi: 'कोलकाता' },
  { value: 'Malda', en: 'Malda', bn: 'মালদা', hi: 'मालदा' },
  { value: 'Murshidabad', en: 'Murshidabad', bn: 'মুর্শিদাবাদ', hi: 'मुर्शिदाबाद' },
  { value: 'Nadia', en: 'Nadia', bn: 'নদিয়া', hi: 'नदिया' },
  { value: 'North 24 Parganas', en: 'North 24 Parganas', bn: 'উত্তর ২৪ পরগনা', hi: 'उत्तर 24 परगना' },
  { value: 'Paschim Bardhaman', en: 'Paschim Bardhaman', bn: 'পশ্চিম বর্ধমান', hi: 'पश्चिम बर्धमान' },
  { value: 'Paschim Medinipur', en: 'Paschim Medinipur', bn: 'পশ্চিম মেদিনীপুর', hi: 'पश्चिम मेदिनीपुर' },
  { value: 'Purba Bardhaman', en: 'Purba Bardhaman', bn: 'পূর্ব বর্ধমান', hi: 'पूर्व बर्धमान' },
  { value: 'Purba Medinipur', en: 'Purba Medinipur', bn: 'পূর্ব মেদিনীপুর', hi: 'पूर्व मेदिनीपुर' },
  { value: 'Purulia', en: 'Purulia', bn: 'পুরুলিয়া', hi: 'पुरुलिया' },
  { value: 'South 24 Parganas', en: 'South 24 Parganas', bn: 'দক্ষিণ ২৪ পরগনা', hi: 'दक्षिण 24 परगना' },
  { value: 'Uttar Dinajpur', en: 'Uttar Dinajpur', bn: 'উত্তর দিনাজপুর', hi: 'उत्तर दिनाजपुर' },
];

// Returns the label for a district in the given language ('en' | 'bn' | 'hi').
// Unknown values are returned unchanged; empty values return ''.
export function districtLabel(value, lang) {
  if (!value) return '';
  const district = WB_DISTRICTS.find((d) => d.value === value);
  if (!district) return value;
  if (lang === 'bn') return district.bn;
  if (lang === 'hi') return district.hi;
  return district.en;
}

// Country dial codes and the parse/compose helpers behind PhoneInput.
//
// Why this exists: the phone number IS the guest's identity in this system.
// Guests never sign up or log in, so there is no username or email to key
// off — the same person books as "Dare Olalekan", "Dare Olalelan" and
// "D. Olalekan" across three stays. The backend therefore matches guests on
// a blind-index hash of the phone number, and production ended up with the
// same guest split across three profiles purely because staff typed
// 08148216795, +234 814 821 6795 and 8148216795 on different visits.
//
// The backend now folds all of those onto one canonical form (see
// common/utils/phone.util.ts). This file is the front half of that fix:
// collect the country code explicitly instead of hoping it was typed.

// One entry per dial code, never two — the select stores the dial code
// itself, so a second option carrying the same code would round-trip back
// to the first one and silently "change" the user's country. The shared
// NANP and Russia/Kazakhstan codes are therefore single combined entries.
const COUNTRIES = [
  ["Afghanistan", "93", "AF"], ["Albania", "355", "AL"], ["Algeria", "213", "DZ"],
  ["Andorra", "376", "AD"], ["Angola", "244", "AO"], ["Antigua and Barbuda", "1268", "AG"],
  ["Argentina", "54", "AR"], ["Armenia", "374", "AM"], ["Aruba", "297", "AW"],
  ["Australia", "61", "AU"], ["Austria", "43", "AT"], ["Azerbaijan", "994", "AZ"],
  ["Bahamas", "1242", "BS"], ["Bahrain", "973", "BH"], ["Bangladesh", "880", "BD"],
  ["Barbados", "1246", "BB"], ["Belarus", "375", "BY"], ["Belgium", "32", "BE"],
  ["Belize", "501", "BZ"], ["Benin", "229", "BJ"], ["Bermuda", "1441", "BM"],
  ["Bhutan", "975", "BT"], ["Bolivia", "591", "BO"], ["Bosnia and Herzegovina", "387", "BA"],
  ["Botswana", "267", "BW"], ["Brazil", "55", "BR"], ["Brunei", "673", "BN"],
  ["Bulgaria", "359", "BG"], ["Burkina Faso", "226", "BF"], ["Burundi", "257", "BI"],
  ["Cambodia", "855", "KH"], ["Cameroon", "237", "CM"], ["Cape Verde", "238", "CV"],
  ["Cayman Islands", "1345", "KY"], ["Central African Republic", "236", "CF"], ["Chad", "235", "TD"],
  ["Chile", "56", "CL"], ["China", "86", "CN"], ["Colombia", "57", "CO"],
  ["Comoros", "269", "KM"], ["Congo (Brazzaville)", "242", "CG"], ["Congo (Kinshasa)", "243", "CD"],
  ["Costa Rica", "506", "CR"], ["Cote d'Ivoire", "225", "CI"], ["Croatia", "385", "HR"],
  ["Cuba", "53", "CU"], ["Cyprus", "357", "CY"], ["Czechia", "420", "CZ"],
  ["Denmark", "45", "DK"], ["Djibouti", "253", "DJ"], ["Dominica", "1767", "DM"],
  ["Dominican Republic", "1809", "DO"], ["Ecuador", "593", "EC"], ["Egypt", "20", "EG"],
  ["El Salvador", "503", "SV"], ["Equatorial Guinea", "240", "GQ"], ["Eritrea", "291", "ER"],
  ["Estonia", "372", "EE"], ["Eswatini", "268", "SZ"], ["Ethiopia", "251", "ET"],
  ["Fiji", "679", "FJ"], ["Finland", "358", "FI"], ["France", "33", "FR"],
  ["Gabon", "241", "GA"], ["Gambia", "220", "GM"], ["Georgia", "995", "GE"],
  ["Germany", "49", "DD"], ["Ghana", "233", "GH"], ["Gibraltar", "350", "GI"],
  ["Greece", "30", "GR"], ["Grenada", "1473", "GD"], ["Guatemala", "502", "GT"],
  ["Guinea", "224", "GN"], ["Guinea-Bissau", "245", "GW"], ["Guyana", "592", "GY"],
  ["Haiti", "509", "HT"], ["Honduras", "504", "HN"], ["Hong Kong", "852", "HK"],
  ["Hungary", "36", "HU"], ["Iceland", "354", "IS"], ["India", "91", "IN"],
  ["Indonesia", "62", "ID"], ["Iran", "98", "IR"], ["Iraq", "964", "IQ"],
  ["Ireland", "353", "IE"], ["Israel", "972", "IL"], ["Italy", "39", "IT"],
  ["Jamaica", "1876", "JM"], ["Japan", "81", "JP"], ["Jordan", "962", "JO"],
  ["Kenya", "254", "KE"], ["Kuwait", "965", "KW"], ["Kyrgyzstan", "996", "KG"],
  ["Laos", "856", "LA"], ["Latvia", "371", "LV"], ["Lebanon", "961", "LB"],
  ["Lesotho", "266", "LS"], ["Liberia", "231", "LR"], ["Libya", "218", "LY"],
  ["Liechtenstein", "423", "LI"], ["Lithuania", "370", "LT"], ["Luxembourg", "352", "LU"],
  ["Macau", "853", "MO"], ["Madagascar", "261", "MG"], ["Malawi", "265", "MW"],
  ["Malaysia", "60", "MY"], ["Maldives", "960", "MV"], ["Mali", "223", "ML"],
  ["Malta", "356", "MT"], ["Mauritania", "222", "MR"], ["Mauritius", "230", "MU"],
  ["Mexico", "52", "MX"], ["Moldova", "373", "MD"], ["Monaco", "377", "MC"],
  ["Mongolia", "976", "MN"], ["Montenegro", "382", "ME"], ["Morocco", "212", "MA"],
  ["Mozambique", "258", "MZ"], ["Myanmar", "95", "MM"], ["Namibia", "264", "NA"],
  ["Nepal", "977", "NP"], ["Netherlands", "31", "NL"], ["New Zealand", "64", "NZ"],
  ["Nicaragua", "505", "NI"], ["Niger", "227", "NE"], ["Nigeria", "234", "NG"],
  ["North Korea", "850", "KP"], ["North Macedonia", "389", "MK"], ["Norway", "47", "NO"],
  ["Oman", "968", "OM"], ["Pakistan", "92", "PK"], ["Palestine", "970", "PS"],
  ["Panama", "507", "PA"], ["Papua New Guinea", "675", "PG"], ["Paraguay", "595", "PY"],
  ["Peru", "51", "PE"], ["Philippines", "63", "PH"], ["Poland", "48", "PL"],
  ["Portugal", "351", "PT"], ["Puerto Rico", "1787", "PR"], ["Qatar", "974", "QA"],
  ["Romania", "40", "RO"], ["Russia / Kazakhstan", "7", "RU/KZ"], ["Rwanda", "250", "RW"],
  ["Saint Kitts and Nevis", "1869", "KN"], ["Saint Lucia", "1758", "LC"], ["Saint Vincent and the Grenadines", "1784", "VC"],
  ["Samoa", "685", "WS"], ["San Marino", "378", "SM"], ["Sao Tome and Principe", "239", "ST"],
  ["Saudi Arabia", "966", "SA"], ["Senegal", "221", "SN"], ["Serbia", "381", "CS"],
  ["Seychelles", "248", "SC"], ["Sierra Leone", "232", "SL"], ["Singapore", "65", "SG"],
  ["Slovakia", "421", "SK"], ["Slovenia", "386", "SI"], ["Solomon Islands", "677", "SB"],
  ["Somalia", "252", "SO"], ["South Africa", "27", "ZA"], ["South Korea", "82", "KR"],
  ["South Sudan", "211", "SS"], ["Spain", "34", "ES"], ["Sri Lanka", "94", "LK"],
  ["Sudan", "249", "SD"], ["Suriname", "597", "SR"], ["Sweden", "46", "SE"],
  ["Switzerland", "41", "CH"], ["Syria", "963", "SY"], ["Taiwan", "886", "TW"],
  ["Tajikistan", "992", "TJ"], ["Tanzania", "255", "TZ"], ["Thailand", "66", "TH"],
  ["Timor-Leste", "670", "TL"], ["Togo", "228", "TG"], ["Tonga", "676", "TO"],
  ["Trinidad and Tobago", "1868", "TT"], ["Tunisia", "216", "TN"], ["Turkiye", "90", "TR"],
  ["Turkmenistan", "993", "TM"], ["Uganda", "256", "UG"], ["Ukraine", "380", "UA"],
  ["United Arab Emirates", "971", "AE"], ["United Kingdom", "44", "GB"], ["United States / Canada", "1", "US/CA"],
  ["Uruguay", "598", "UY"], ["Uzbekistan", "998", "UZ"], ["Vanuatu", "678", "NH"],
  ["Vatican City", "379", "VA"], ["Venezuela", "58", "VE"], ["Vietnam", "84", "VD"],
  ["Yemen", "967", "YD"], ["Zambia", "260", "ZM"], ["Zimbabwe", "263", "RH"],
];

export const NG_DIAL = "234";
export const DEFAULT_DIAL = NG_DIAL;
const NG_NSN_LENGTH = 10; // national significant number, e.g. 8148216795

// Nigeria first because it is the overwhelming majority of guests and the
// documented default; the rest stay alphabetical so the browser's built-in
// type-ahead on a <select> lands where the user expects.
export const COUNTRY_OPTIONS = [
  ...COUNTRIES.filter(([, dial]) => dial === NG_DIAL),
  ...COUNTRIES.filter(([, dial]) => dial !== NG_DIAL),
  // The picker is narrow, so an option reads "NG (+234)": a full country name
  // truncated to "Nigeria (+2..." told staff less than the code does (owner's
  // call, 2026-09-11). name stays on the option for anything that wants to
  // show the country in full.
].map(([name, dial, code]) => ({ name, dial, code, label: `${code} (+${dial})` }));

// Longest first, so "+1268" resolves to Antigua rather than the US.
const DIALS_BY_LENGTH = [...new Set(COUNTRIES.map(([, dial]) => dial))].sort(
  (a, b) => b.length - a.length,
);

const matchDial = (digits) => DIALS_BY_LENGTH.find((dial) => digits.startsWith(dial)) || null;

/**
 * Splits a stored phone number into the country code and the national part.
 *
 * It has to cope with everything already in the database, which predates any
 * country-code field: "08148216795", "+234 814 821 6795", "8148216795",
 * "+1 415 555 0132". The unprefixed cases follow the same rules the backend
 * uses to canonicalize (phone.util.ts), so what the form shows and what the
 * guest lookup matches on never disagree.
 */
export function parsePhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return { dial: DEFAULT_DIAL, national: "", matched: false };

  const explicit = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (!digits) return { dial: DEFAULT_DIAL, national: "", matched: false };

  if (explicit) {
    const dial = matchDial(digits);
    if (dial) return { dial, national: digits.slice(dial.length), matched: true };
    return { dial: DEFAULT_DIAL, national: digits, matched: false };
  }

  // No "+" to go on, so fall back to the same shape rules the backend
  // applies: a leading trunk 0, or a bare 10-digit number, is Nigerian.
  if (digits.startsWith("0") && digits.length === NG_NSN_LENGTH + 1) {
    return { dial: NG_DIAL, national: digits.slice(1), matched: true };
  }
  if (digits.startsWith(NG_DIAL) && digits.length === NG_DIAL.length + NG_NSN_LENGTH) {
    return { dial: NG_DIAL, national: digits.slice(NG_DIAL.length), matched: true };
  }
  if (digits.length === NG_NSN_LENGTH) return { dial: NG_DIAL, national: digits, matched: true };

  // Anything else is genuinely unidentified — production carries a few 2/3/9/
  // 12-digit entries. Deliberately NOT dial-code-matched: "12" would become
  // "+1 2", presenting junk as a confident US number, and an unprefixed
  // 447700900123 is only a guess. `matched: false` lets the display helpers
  // show it verbatim, which is also exactly what the backend does with it
  // (see phone.util.ts). The dial/national split is still filled in, so
  // PhoneInput can put it in a field for staff to correct.
  return { dial: DEFAULT_DIAL, national: digits, matched: false };
}

/**
 * Builds the value that actually gets stored and sent to the backend.
 * Returns "" for an empty national part so an optional phone field stays
 * genuinely empty instead of saving a bare "+234".
 */
export function composePhone(dial, national) {
  const digits = String(national ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return `+${dial}${digits}`;
}

/**
 * Display form for read-only spots: "+234 8148216795".
 *
 * The duplicate merge only recomputed the search hashes — it deliberately
 * left the stored phone strings exactly as staff typed them, so the database
 * still holds "8148216795", "0814 379 9227" and "+234 814 379 9227" side by
 * side. Normalizing at render is what makes those look like one format
 * without rewriting anyone's record.
 *
 * Falls back to the raw value rather than blanking it: a stored value that
 * doesn't parse is still the only contact detail on that record, and showing
 * nothing would be worse than showing it unformatted.
 */
export function formatPhone(value) {
  const { dial, national, matched } = parsePhone(value);
  return matched ? `+${dial} ${national}` : String(value ?? "");
}

/** Same number with no spaces, for `tel:` links and copy-to-clipboard. */
export function dialablePhone(value) {
  const { dial, national, matched } = parsePhone(value);
  return matched ? composePhone(dial, national) : String(value ?? "");
}

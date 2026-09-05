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
  ["Afghanistan", "93"], ["Albania", "355"], ["Algeria", "213"], ["Andorra", "376"],
  ["Angola", "244"], ["Antigua and Barbuda", "1268"], ["Argentina", "54"], ["Armenia", "374"],
  ["Aruba", "297"], ["Australia", "61"], ["Austria", "43"], ["Azerbaijan", "994"],
  ["Bahamas", "1242"], ["Bahrain", "973"], ["Bangladesh", "880"], ["Barbados", "1246"],
  ["Belarus", "375"], ["Belgium", "32"], ["Belize", "501"], ["Benin", "229"],
  ["Bermuda", "1441"], ["Bhutan", "975"], ["Bolivia", "591"], ["Bosnia and Herzegovina", "387"],
  ["Botswana", "267"], ["Brazil", "55"], ["Brunei", "673"], ["Bulgaria", "359"],
  ["Burkina Faso", "226"], ["Burundi", "257"], ["Cambodia", "855"], ["Cameroon", "237"],
  ["Cape Verde", "238"], ["Cayman Islands", "1345"], ["Central African Republic", "236"],
  ["Chad", "235"], ["Chile", "56"], ["China", "86"], ["Colombia", "57"], ["Comoros", "269"],
  ["Congo (Brazzaville)", "242"], ["Congo (Kinshasa)", "243"], ["Costa Rica", "506"],
  ["Cote d'Ivoire", "225"], ["Croatia", "385"], ["Cuba", "53"], ["Cyprus", "357"],
  ["Czechia", "420"], ["Denmark", "45"], ["Djibouti", "253"], ["Dominica", "1767"],
  ["Dominican Republic", "1809"], ["Ecuador", "593"], ["Egypt", "20"], ["El Salvador", "503"],
  ["Equatorial Guinea", "240"], ["Eritrea", "291"], ["Estonia", "372"], ["Eswatini", "268"],
  ["Ethiopia", "251"], ["Fiji", "679"], ["Finland", "358"], ["France", "33"],
  ["Gabon", "241"], ["Gambia", "220"], ["Georgia", "995"], ["Germany", "49"],
  ["Ghana", "233"], ["Gibraltar", "350"], ["Greece", "30"], ["Grenada", "1473"],
  ["Guatemala", "502"], ["Guinea", "224"], ["Guinea-Bissau", "245"], ["Guyana", "592"],
  ["Haiti", "509"], ["Honduras", "504"], ["Hong Kong", "852"], ["Hungary", "36"],
  ["Iceland", "354"], ["India", "91"], ["Indonesia", "62"], ["Iran", "98"], ["Iraq", "964"],
  ["Ireland", "353"], ["Israel", "972"], ["Italy", "39"], ["Jamaica", "1876"],
  ["Japan", "81"], ["Jordan", "962"], ["Kenya", "254"], ["Kuwait", "965"],
  ["Kyrgyzstan", "996"], ["Laos", "856"], ["Latvia", "371"], ["Lebanon", "961"],
  ["Lesotho", "266"], ["Liberia", "231"], ["Libya", "218"], ["Liechtenstein", "423"],
  ["Lithuania", "370"], ["Luxembourg", "352"], ["Macau", "853"], ["Madagascar", "261"],
  ["Malawi", "265"], ["Malaysia", "60"], ["Maldives", "960"], ["Mali", "223"],
  ["Malta", "356"], ["Mauritania", "222"], ["Mauritius", "230"], ["Mexico", "52"],
  ["Moldova", "373"], ["Monaco", "377"], ["Mongolia", "976"], ["Montenegro", "382"],
  ["Morocco", "212"], ["Mozambique", "258"], ["Myanmar", "95"], ["Namibia", "264"],
  ["Nepal", "977"], ["Netherlands", "31"], ["New Zealand", "64"], ["Nicaragua", "505"],
  ["Niger", "227"], ["Nigeria", "234"], ["North Korea", "850"], ["North Macedonia", "389"],
  ["Norway", "47"], ["Oman", "968"], ["Pakistan", "92"], ["Palestine", "970"],
  ["Panama", "507"], ["Papua New Guinea", "675"], ["Paraguay", "595"], ["Peru", "51"],
  ["Philippines", "63"], ["Poland", "48"], ["Portugal", "351"], ["Puerto Rico", "1787"],
  ["Qatar", "974"], ["Romania", "40"], ["Russia / Kazakhstan", "7"], ["Rwanda", "250"],
  ["Saint Kitts and Nevis", "1869"], ["Saint Lucia", "1758"],
  ["Saint Vincent and the Grenadines", "1784"], ["Samoa", "685"], ["San Marino", "378"],
  ["Sao Tome and Principe", "239"], ["Saudi Arabia", "966"], ["Senegal", "221"],
  ["Serbia", "381"], ["Seychelles", "248"], ["Sierra Leone", "232"], ["Singapore", "65"],
  ["Slovakia", "421"], ["Slovenia", "386"], ["Solomon Islands", "677"], ["Somalia", "252"],
  ["South Africa", "27"], ["South Korea", "82"], ["South Sudan", "211"], ["Spain", "34"],
  ["Sri Lanka", "94"], ["Sudan", "249"], ["Suriname", "597"], ["Sweden", "46"],
  ["Switzerland", "41"], ["Syria", "963"], ["Taiwan", "886"], ["Tajikistan", "992"],
  ["Tanzania", "255"], ["Thailand", "66"], ["Timor-Leste", "670"], ["Togo", "228"],
  ["Tonga", "676"], ["Trinidad and Tobago", "1868"], ["Tunisia", "216"], ["Turkiye", "90"],
  ["Turkmenistan", "993"], ["Uganda", "256"], ["Ukraine", "380"],
  ["United Arab Emirates", "971"], ["United Kingdom", "44"], ["United States / Canada", "1"],
  ["Uruguay", "598"], ["Uzbekistan", "998"], ["Vanuatu", "678"], ["Vatican City", "379"],
  ["Venezuela", "58"], ["Vietnam", "84"], ["Yemen", "967"], ["Zambia", "260"],
  ["Zimbabwe", "263"],
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
].map(([name, dial]) => ({ name, dial, label: `${name} (+${dial})` }));

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
  if (!raw) return { dial: DEFAULT_DIAL, national: "" };

  const explicit = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (!digits) return { dial: DEFAULT_DIAL, national: "" };

  if (explicit) {
    const dial = matchDial(digits);
    if (dial) return { dial, national: digits.slice(dial.length) };
    return { dial: DEFAULT_DIAL, national: digits };
  }

  // No "+" to go on, so fall back to the same shape rules the backend
  // applies: a leading trunk 0, or a bare 10-digit number, is Nigerian.
  if (digits.startsWith("0") && digits.length === NG_NSN_LENGTH + 1) {
    return { dial: NG_DIAL, national: digits.slice(1) };
  }
  if (digits.startsWith(NG_DIAL) && digits.length === NG_DIAL.length + NG_NSN_LENGTH) {
    return { dial: NG_DIAL, national: digits.slice(NG_DIAL.length) };
  }
  if (digits.length === NG_NSN_LENGTH) return { dial: NG_DIAL, national: digits };

  const dial = matchDial(digits);
  if (dial) return { dial, national: digits.slice(dial.length) };
  return { dial: DEFAULT_DIAL, national: digits };
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

/** Display helper for read-only spots — normalizes whatever is stored. */
export function formatPhone(value) {
  const { dial, national } = parsePhone(value);
  return national ? `+${dial} ${national}` : "";
}

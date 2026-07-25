// =============================================================================
// Bandeira a partir do nome do país (nationality vindo da API — football-data.org/
// SportAPI7 mandam o nome em inglês, não o código ISO).
// =============================================================================
// Emoji de bandeira = 2 "regional indicator symbols" Unicode correspondentes ao código
// ISO 3166-1 alpha-2 do país (ex: BR → 🇧🇷). Em vez de guardar o emoji pronto pra cada
// país (fácil de digitar errado, difícil de revisar), guarda só o código de 2 letras e
// computa o emoji — mais curto de manter e sem risco de emoji quebrado por engano.

function isoToFlagEmoji(iso2: string): string {
  return [...iso2.toUpperCase()].map(ch => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
}

/** Nome do país (como a API manda, em inglês) → código ISO 3166-1 alpha-2. Cobre as
 *  nacionalidades mais comuns em elencos de futebol europeu — sem entrada aqui, cai pra
 *  null (sem bandeira) em vez de quebrar ou mostrar uma bandeira errada. */
const COUNTRY_TO_ISO: Record<string, string> = {
  // Europa
  England: 'GB-ENG', Scotland: 'GB-SCT', Wales: 'GB-WLS', 'Northern Ireland': 'GB-NIR',
  'United Kingdom': 'GB', Ireland: 'IE', 'Republic of Ireland': 'IE',
  France: 'FR', Germany: 'DE', Spain: 'ES', Italy: 'IT', Portugal: 'PT',
  Netherlands: 'NL', Holland: 'NL', Belgium: 'BE', Luxembourg: 'LU',
  Switzerland: 'CH', Austria: 'AT', Denmark: 'DK', Sweden: 'SE', Norway: 'NO',
  Finland: 'FI', Iceland: 'IS', Greece: 'GR', Turkey: 'TR', Cyprus: 'CY', Malta: 'MT',
  Poland: 'PL', 'Czech Republic': 'CZ', Czechia: 'CZ', Slovakia: 'SK', Hungary: 'HU',
  Romania: 'RO', Bulgaria: 'BG', Slovenia: 'SI', Croatia: 'HR', Serbia: 'RS',
  'Bosnia and Herzegovina': 'BA', Bosnia: 'BA', Montenegro: 'ME', Kosovo: 'XK',
  'North Macedonia': 'MK', Macedonia: 'MK', Albania: 'AL', Ukraine: 'UA', Russia: 'RU',
  Belarus: 'BY', Moldova: 'MD', Georgia: 'GE', Armenia: 'AM', Azerbaijan: 'AZ',
  Estonia: 'EE', Latvia: 'LV', Lithuania: 'LT', Israel: 'IL',

  // América do Sul
  Brazil: 'BR', Argentina: 'AR', Uruguay: 'UY', Paraguay: 'PY', Chile: 'CL',
  Colombia: 'CO', Ecuador: 'EC', Peru: 'PE', Venezuela: 'VE', Bolivia: 'BO',

  // América do Norte / Central / Caribe
  'United States': 'US', USA: 'US', Canada: 'CA', Mexico: 'MX', 'Costa Rica': 'CR',
  Honduras: 'HN', Panama: 'PA', Jamaica: 'JM', Haiti: 'HT', 'Dominican Republic': 'DO',
  'Trinidad and Tobago': 'TT', Curaçao: 'CW', Curacao: 'CW', Guatemala: 'GT',

  // África
  Morocco: 'MA', Algeria: 'DZ', Tunisia: 'TN', Egypt: 'EG', Libya: 'LY',
  Nigeria: 'NG', Senegal: 'SN', Ghana: 'GH', 'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI',
  Cameroon: 'CM', Mali: 'ML', Guinea: 'GN', 'Guinea-Bissau': 'GW', 'Burkina Faso': 'BF',
  'DR Congo': 'CD', Congo: 'CG', Gabon: 'GA', Zambia: 'ZM', 'South Africa': 'ZA',
  'Cape Verde': 'CV', Angola: 'AO', Mozambique: 'MZ', Tanzania: 'TZ', Kenya: 'KE',
  Uganda: 'UG', Zimbabwe: 'ZW', Benin: 'BJ', Togo: 'TG', 'Sierra Leone': 'SL',
  Gambia: 'GM', Mauritania: 'MR', Equatorial: 'GQ', Namibia: 'NA', Comoros: 'KM',

  // Ásia / Oceania / Oriente Médio
  Japan: 'JP', 'South Korea': 'KR', 'Korea Republic': 'KR', China: 'CN',
  Australia: 'AU', 'New Zealand': 'NZ', 'Saudi Arabia': 'SA', Qatar: 'QA',
  'United Arab Emirates': 'AE', Iran: 'IR', Iraq: 'IQ', Jordan: 'JO', Lebanon: 'LB',
  India: 'IN', Indonesia: 'ID', Thailand: 'TH', Vietnam: 'VN', 'North Korea': 'KP',
  Uzbekistan: 'UZ', Kazakhstan: 'KZ', Syria: 'SY',
};

/** Bandeira do país (emoji) a partir do texto de nacionalidade da API, ou null se o país
 *  não estiver no mapa (sem inventar bandeira errada). */
export function countryFlagEmoji(nationality?: string | null): string | null {
  if (!nationality) return null;
  const iso = COUNTRY_TO_ISO[nationality.trim()];
  if (!iso) return null;
  // Subdivisões do Reino Unido (Inglaterra/Escócia/País de Gales) não têm bandeira de
  // regional-indicator própria no Unicode — usa a bandeira do Reino Unido como aproximação.
  if (iso.startsWith('GB-')) return isoToFlagEmoji('GB');
  return isoToFlagEmoji(iso);
}

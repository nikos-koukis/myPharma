/**
 * Hardcoded list of cities for curl-based scraping.
 * This list is used when SCRAPER_MODE=curl to avoid browser-based city discovery.
 *
 * To add a new city:
 * 1. Find the city URL on vrisko.gr (e.g., https://www.vrisko.gr/efimeries-farmakeion/patra/)
 * 2. Add an entry with name, slug (from URL), and prefecture
 */

export interface CityConfig {
  name: string;
  slug: string;
  prefecture: string;
}

// Organized by prefecture for easier maintenance
export const CITY_LIST: CityConfig[] = [

  // ΑΧΑΪΑΣ
  { name: 'Πάτρα', slug: 'patra', prefecture: 'ΑΧΑΪΑΣ' },
  { name: 'Ρίο', slug: 'rio', prefecture: 'ΑΧΑΪΑΣ' },
  { name: 'Αίγιο', slug: 'aigio', prefecture: 'ΑΧΑΪΑΣ' },

    // ΘΕΣΣΑΛΟΝΙΚΗΣ
  { name: 'Θεσσαλονίκη', slug: 'thessaloniki', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Καλαμαριά', slug: 'kalamaria', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Εύοσμος', slug: 'evosmos', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Σταυρούπολη', slug: 'stavroupoli', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Πυλαία', slug: 'pylaia', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Σύκιες', slug: 'sykies', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Νεάπολη', slug: 'neapoli-thessaloniki', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Πολίχνη', slug: 'polichni', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Τριανδρία', slug: 'triandria', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },
  { name: 'Θέρμη', slug: 'thermi', prefecture: 'ΘΕΣΣΑΛΟΝΙΚΗΣ' },

  // ΑΤΤΙΚΗΣ
  { name: 'Αθήνα', slug: 'athina', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Πειραιάς', slug: 'peiraias', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Γλυφάδα', slug: 'glyfada', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Μαρούσι', slug: 'marousi', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Κηφισιά', slug: 'kifisia', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Χαλάνδρι', slug: 'chalandri', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Νέα Σμύρνη', slug: 'nea-smyrni', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Καλλιθέα', slug: 'kallithea', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Παλαιό Φάληρο', slug: 'paleo-faliro', prefecture: 'ΑΤΤΙΚΗΣ' },
  { name: 'Ηλιούπολη', slug: 'ilioupoli', prefecture: 'ΑΤΤΙΚΗΣ' },

  // ΛΑΡΙΣΑΣ
  { name: 'Λάρισα', slug: 'larisa', prefecture: 'ΛΑΡΙΣΑΣ' },
  { name: 'Τύρναβος', slug: 'tyrnavos', prefecture: 'ΛΑΡΙΣΑΣ' },
  { name: 'Ελασσόνα', slug: 'elassona', prefecture: 'ΛΑΡΙΣΑΣ' },

  // ΗΡΑΚΛΕΙΟΥ
  { name: 'Ηράκλειο', slug: 'irakleio', prefecture: 'ΗΡΑΚΛΕΙΟΥ' },
  { name: 'Μοίρες', slug: 'moires', prefecture: 'ΗΡΑΚΛΕΙΟΥ' },

  // ΜΑΓΝΗΣΙΑΣ
  { name: 'Βόλος', slug: 'volos', prefecture: 'ΜΑΓΝΗΣΙΑΣ' },
  { name: 'Νέα Ιωνία Βόλου', slug: 'nea-ionia-volou', prefecture: 'ΜΑΓΝΗΣΙΑΣ' },

  // ΙΩΑΝΝΙΝΩΝ
  { name: 'Ιωάννινα', slug: 'ioannina', prefecture: 'ΙΩΑΝΝΙΝΩΝ' },

  // ΤΡΙΚΑΛΩΝ
  { name: 'Τρίκαλα', slug: 'trikala', prefecture: 'ΤΡΙΚΑΛΩΝ' },
  { name: 'Καλαμπάκα', slug: 'kalampaka', prefecture: 'ΤΡΙΚΑΛΩΝ' },

  // ΣΕΡΡΩΝ
  { name: 'Σέρρες', slug: 'serres', prefecture: 'ΣΕΡΡΩΝ' },

  // ΧΑΝΙΩΝ
  { name: 'Χανιά', slug: 'chania', prefecture: 'ΧΑΝΙΩΝ' },

  // ΕΒΡΟΥ
  { name: 'Αλεξανδρούπολη', slug: 'alexandroupoli', prefecture: 'ΕΒΡΟΥ' },
  { name: 'Ορεστιάδα', slug: 'orestiada', prefecture: 'ΕΒΡΟΥ' },

  // ΡΟΔΟΠΗΣ
  { name: 'Κομοτηνή', slug: 'komotini', prefecture: 'ΡΟΔΟΠΗΣ' },

  // ΞΑΝΘΗΣ
  { name: 'Ξάνθη', slug: 'xanthi', prefecture: 'ΞΑΝΘΗΣ' },

  // ΔΡΑΜΑΣ
  { name: 'Δράμα', slug: 'drama', prefecture: 'ΔΡΑΜΑΣ' },

  // ΚΑΒΑΛΑΣ
  { name: 'Καβάλα', slug: 'kavala', prefecture: 'ΚΑΒΑΛΑΣ' },

  // ΚΙΛΚΙΣ
  { name: 'Κιλκίς', slug: 'kilkis', prefecture: 'ΚΙΛΚΙΣ' },

  // ΠΕΛΛΑΣ
  { name: 'Έδεσσα', slug: 'edessa', prefecture: 'ΠΕΛΛΑΣ' },
  { name: 'Γιαννιτσά', slug: 'giannitsa', prefecture: 'ΠΕΛΛΑΣ' },

  // ΗΜΑΘΙΑΣ
  { name: 'Βέροια', slug: 'veroia', prefecture: 'ΗΜΑΘΙΑΣ' },
  { name: 'Νάουσα', slug: 'naousa', prefecture: 'ΗΜΑΘΙΑΣ' },

  // ΠΙΕΡΙΑΣ
  { name: 'Κατερίνη', slug: 'katerini', prefecture: 'ΠΙΕΡΙΑΣ' },

  // ΚΟΖΑΝΗΣ
  { name: 'Κοζάνη', slug: 'kozani', prefecture: 'ΚΟΖΑΝΗΣ' },
  { name: 'Πτολεμαΐδα', slug: 'ptolemaida', prefecture: 'ΚΟΖΑΝΗΣ' },

  // ΦΛΩΡΙΝΑΣ
  { name: 'Φλώρινα', slug: 'florina', prefecture: 'ΦΛΩΡΙΝΑΣ' },

  // ΚΑΣΤΟΡΙΑΣ
  { name: 'Καστοριά', slug: 'kastoria', prefecture: 'ΚΑΣΤΟΡΙΑΣ' },

  // ΓΡΕΒΕΝΩΝ
  { name: 'Γρεβενά', slug: 'grevena', prefecture: 'ΓΡΕΒΕΝΩΝ' },

  // ΑΡΤΑΣ
  { name: 'Άρτα', slug: 'arta', prefecture: 'ΑΡΤΑΣ' },

  // ΠΡΕΒΕΖΑΣ
  { name: 'Πρέβεζα', slug: 'preveza', prefecture: 'ΠΡΕΒΕΖΑΣ' },

  // ΘΕΣΠΡΩΤΙΑΣ
  { name: 'Ηγουμενίτσα', slug: 'igoumenitsa', prefecture: 'ΘΕΣΠΡΩΤΙΑΣ' },

  // ΚΕΡΚΥΡΑΣ
  { name: 'Κέρκυρα', slug: 'kerkyra', prefecture: 'ΚΕΡΚΥΡΑΣ' },

  // ΛΕΥΚΑΔΑΣ
  { name: 'Λευκάδα', slug: 'lefkada', prefecture: 'ΛΕΥΚΑΔΑΣ' },

  // ΚΕΦΑΛΛΗΝΙΑΣ
  { name: 'Αργοστόλι', slug: 'argostoli', prefecture: 'ΚΕΦΑΛΛΗΝΙΑΣ' },

  // ΖΑΚΥΝΘΟΥ
  { name: 'Ζάκυνθος', slug: 'zakynthos', prefecture: 'ΖΑΚΥΝΘΟΥ' },

  // ΑΙΤΩΛΟΑΚΑΡΝΑΝΙΑΣ
  { name: 'Αγρίνιο', slug: 'agrinio', prefecture: 'ΑΙΤΩΛΟΑΚΑΡΝΑΝΙΑΣ' },
  { name: 'Μεσολόγγι', slug: 'mesologgi', prefecture: 'ΑΙΤΩΛΟΑΚΑΡΝΑΝΙΑΣ' },

  // ΦΩΚΙΔΑΣ
  { name: 'Άμφισσα', slug: 'amfissa', prefecture: 'ΦΩΚΙΔΑΣ' },

  // ΦΘΙΩΤΙΔΑΣ
  { name: 'Λαμία', slug: 'lamia', prefecture: 'ΦΘΙΩΤΙΔΑΣ' },

  // ΕΥΒΟΙΑΣ
  { name: 'Χαλκίδα', slug: 'chalkida', prefecture: 'ΕΥΒΟΙΑΣ' },

  // ΒΟΙΩΤΙΑΣ
  { name: 'Λιβαδειά', slug: 'livadeia', prefecture: 'ΒΟΙΩΤΙΑΣ' },
  { name: 'Θήβα', slug: 'thiva', prefecture: 'ΒΟΙΩΤΙΑΣ' },

  // ΕΥΡΥΤΑΝΙΑΣ
  { name: 'Καρπενήσι', slug: 'karpenisi', prefecture: 'ΕΥΡΥΤΑΝΙΑΣ' },

  // ΚΑΡΔΙΤΣΑΣ
  { name: 'Καρδίτσα', slug: 'karditsa', prefecture: 'ΚΑΡΔΙΤΣΑΣ' },

  // ΚΟΡΙΝΘΙΑΣ
  { name: 'Κόρινθος', slug: 'korinthos', prefecture: 'ΚΟΡΙΝΘΙΑΣ' },
  { name: 'Λουτράκι', slug: 'loutraki', prefecture: 'ΚΟΡΙΝΘΙΑΣ' },

  // ΑΡΓΟΛΙΔΑΣ
  { name: 'Ναύπλιο', slug: 'nafplio', prefecture: 'ΑΡΓΟΛΙΔΑΣ' },
  { name: 'Άργος', slug: 'argos', prefecture: 'ΑΡΓΟΛΙΔΑΣ' },

  // ΑΡΚΑΔΙΑΣ
  { name: 'Τρίπολη', slug: 'tripoli', prefecture: 'ΑΡΚΑΔΙΑΣ' },

  // ΜΕΣΣΗΝΙΑΣ
  { name: 'Καλαμάτα', slug: 'kalamata', prefecture: 'ΜΕΣΣΗΝΙΑΣ' },

  // ΛΑΚΩΝΙΑΣ
  { name: 'Σπάρτη', slug: 'sparti', prefecture: 'ΛΑΚΩΝΙΑΣ' },

  // ΗΛΕΙΑΣ
  { name: 'Πύργος', slug: 'pyrgos', prefecture: 'ΗΛΕΙΑΣ' },
  { name: 'Αμαλιάδα', slug: 'amaliada', prefecture: 'ΗΛΕΙΑΣ' },

  // ΡΕΘΥΜΝΟΥ
  { name: 'Ρέθυμνο', slug: 'rethymno', prefecture: 'ΡΕΘΥΜΝΟΥ' },

  // ΛΑΣΙΘΙΟΥ
  { name: 'Άγιος Νικόλαος', slug: 'agios-nikolaos', prefecture: 'ΛΑΣΙΘΙΟΥ' },
  { name: 'Ιεράπετρα', slug: 'ierapetra', prefecture: 'ΛΑΣΙΘΙΟΥ' },

  // ΚΥΚΛΑΔΩΝ
  { name: 'Σύρος', slug: 'syros', prefecture: 'ΚΥΚΛΑΔΩΝ' },
  { name: 'Μύκονος', slug: 'mykonos', prefecture: 'ΚΥΚΛΑΔΩΝ' },
  { name: 'Σαντορίνη', slug: 'santorini', prefecture: 'ΚΥΚΛΑΔΩΝ' },
  { name: 'Νάξος', slug: 'naxos', prefecture: 'ΚΥΚΛΑΔΩΝ' },
  { name: 'Πάρος', slug: 'paros', prefecture: 'ΚΥΚΛΑΔΩΝ' },

  // ΔΩΔΕΚΑΝΗΣΟΥ
  { name: 'Ρόδος', slug: 'rodos', prefecture: 'ΔΩΔΕΚΑΝΗΣΟΥ' },
  { name: 'Κως', slug: 'kos', prefecture: 'ΔΩΔΕΚΑΝΗΣΟΥ' },
  { name: 'Κάλυμνος', slug: 'kalymnos', prefecture: 'ΔΩΔΕΚΑΝΗΣΟΥ' },

  // ΛΕΣΒΟΥ
  { name: 'Μυτιλήνη', slug: 'mytilini', prefecture: 'ΛΕΣΒΟΥ' },

  // ΧΙΟΥ
  { name: 'Χίος', slug: 'chios', prefecture: 'ΧΙΟΥ' },

  // ΣΑΜΟΥ
  { name: 'Σάμος', slug: 'samos', prefecture: 'ΣΑΜΟΥ' },

  // ΧΑΛΚΙΔΙΚΗΣ
  { name: 'Πολύγυρος', slug: 'polygyros', prefecture: 'ΧΑΛΚΙΔΙΚΗΣ' },
  { name: 'Κασσάνδρα', slug: 'kassandra', prefecture: 'ΧΑΛΚΙΔΙΚΗΣ' },
];

/**
 * Build full URL for a city
 */
export function getCityUrl(city: CityConfig): string {
  return `https://www.vrisko.gr/efimeries-farmakeion/${city.slug}/`;
}

/**
 * Filter cities by prefecture
 */
export function filterCitiesByPrefecture(prefecture: string): CityConfig[] {
  const q = prefecture.toLowerCase();
  return CITY_LIST.filter((c) => c.prefecture.toLowerCase().includes(q));
}

/**
 * Filter cities by name
 */
export function filterCitiesByName(name: string): CityConfig[] {
  const q = name.toLowerCase();
  return CITY_LIST.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
  );
}

/**
 * Get all unique prefectures
 */
export function getPrefectures(): string[] {
  return [...new Set(CITY_LIST.map((c) => c.prefecture))].sort((a, b) =>
    a.localeCompare(b, 'el')
  );
}

/**
 * Get filtered city list based on SCRAPE_PREFECTURES env var.
 *
 * Usage:
 *   SCRAPE_PREFECTURES=ΑΧΑΪΑΣ npm run scrape           # Single prefecture
 *   SCRAPE_PREFECTURES=ΑΧΑΪΑΣ,ΑΤΤΙΚΗΣ npm run scrape   # Multiple prefectures
 *   npm run scrape                                      # All cities (default)
 *
 * You can also use partial matches:
 *   SCRAPE_PREFECTURES=ΑΧΑ npm run scrape              # Matches ΑΧΑΪΑΣ
 */
export function getActiveCities(): CityConfig[] {
  const filter = process.env.SCRAPE_PREFECTURES?.trim();

  if (!filter) {
    return CITY_LIST;
  }

  const prefectures = filter.split(',').map(p => p.trim().toUpperCase());

  return CITY_LIST.filter(city =>
    prefectures.some(p => city.prefecture.toUpperCase().includes(p))
  );
}

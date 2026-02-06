import { useAppStore } from '../store';

export const translations = {
    el: {
        // Tabs
        map: 'Χάρτης',
        pharmacies: 'Φαρμακεία',
        settings: 'Ρυθμίσεις',

        // Map Screen
        search_placeholder: 'Αναζήτηση φαρμακείου...',
        all: 'Όλα',
        open: 'Ανοιχτά',
        closed: 'Κλειστά',
        searching: 'Αναζήτηση φαρμακείων στην περιοχή σας...',
        no_pharmacies: 'Δεν βρέθηκαν φαρμακεία',
        no_pharmacies_desc: 'Δοκιμάστε να αλλάξετε τα φίλτρα ή την ακτίνα αναζήτησης.',
        km: 'χλμ',
        m: 'μ',
        closest_on_duty: 'Κοντινότερο εφημερεύον',
        closest: 'Κοντινότερα',
        pharmacies_count: 'φαρμακεία',
        in_radius: 'σε',

        // Pharmacy Detail
        address: 'Διεύθυνση',
        phone: 'Τηλέφωνο',
        open_now: 'ΑΝΟΙΧΤΟ ΤΩΡΑ',
        closed_now: 'ΚΛΕΙΣΤΟ',
        closes_at: 'Κλείνει στις',
        walking_time: 'λεπτά (πεζή)',
        driving_time: 'λεπτά (αμάξι)',
        directions: 'Οδηγίες',
        call: 'Κλήση',
        share: 'Μοιραστείτε',

        // Settings
        appearance: 'ΕΜΦΑΝΙΣΗ',
        language: 'ΓΛΩΣΣΑ',
        information: 'ΠΛΗΡΟΦΟΡΙΕΣ',
        emergency_numbers: 'ΤΗΛΕΦΩΝΑ ΑΝΑΓΚΗΣ',
        rate_app: 'Βαθμολόγησε την εφαρμογή',
        share_app: 'Μοιράσου την εφαρμογή',
        contact_us: 'Επικοινωνία',
        copyright: '© 2026 PharmaGo',
        version: 'v',
        tagline: 'Βρες εφημερεύοντα φαρμακεία',
        my_location: 'Η ΠΕΡΙΟΧΗ ΣΟΥ',
        select_area: 'Επιλέξτε περιοχή',
        opening_soon: 'Ανοίγουν σύντομα',
        detecting_location: 'Εντοπισμός τοποθεσίας...',
        finding_area: 'Βρίσκουμε την περιοχή σας',
        no_on_duty: 'Δεν υπάρχουν εφημερεύοντα',
        change_date: 'Δοκιμάστε διαφορετική ημερομηνία',
        no_open_pharmacies: 'Κανένα ανοιχτό φαρμακείο',
        no_opening_soon: 'Κανένα φαρμακείο δεν ανοίγει σύντομα',
        no_results: 'Δεν βρέθηκαν αποτελέσματα',
        try_different_filter: 'Δοκιμάστε διαφορετικό φίλτρο',
        is_open: 'είναι ανοιχτά',
        are_opening_now: 'ανοίγουν τώρα',
        are_on_duty: 'εφημερεύουν',
        pharmacy_singular: 'φαρμακείο',
        pharmacies_plural: 'φαρμακεία',

        // Emergency Numbers
        ambulance: 'ΕΚΑΒ',
        police: 'Αστυνομία',
        fire_brigade: 'Πυροσβεστική',
        european_emergency: 'Ευρωπαϊκός Αριθμός Έκτακτης Ανάγκης',
    },
    en: {
        // Tabs
        map: 'Map',
        pharmacies: 'Pharmacies',
        settings: 'Settings',

        // Map Screen
        search_placeholder: 'Search pharmacy...',
        all: 'All',
        open: 'Open',
        closed: 'Closed',
        searching: 'Searching for pharmacies in your area...',
        no_pharmacies: 'No pharmacies found',
        no_pharmacies_desc: 'Try changing the filters or search radius.',
        km: 'km',
        m: 'm',
        closest_on_duty: 'Closest on duty',
        closest: 'Closest',
        pharmacies_count: 'pharmacies',
        in_radius: 'in',

        // Pharmacy Detail
        address: 'Address',
        phone: 'Phone',
        open_now: 'OPEN NOW',
        closed_now: 'CLOSED',
        closes_at: 'Closes at',
        walking_time: 'mins (walking)',
        driving_time: 'mins (driving)',
        directions: 'Directions',
        call: 'Call',
        share: 'Share',

        // Settings
        appearance: 'APPEARANCE',
        language: 'LANGUAGE',
        information: 'INFORMATION',
        emergency_numbers: 'EMERGENCY NUMBERS',
        rate_app: 'Rate the app',
        share_app: 'Share the app',
        contact_us: 'Contact us',
        copyright: '© 2026 PharmaGo',
        version: 'v',
        tagline: 'Find on-duty pharmacies',
        my_location: 'YOUR AREA',
        select_area: 'Select area',
        opening_soon: 'Opening soon',
        detecting_location: 'Detecting location...',
        finding_area: 'Finding your location',
        no_on_duty: 'No pharmacies on duty',
        change_date: 'Try a different date',
        no_open_pharmacies: 'No open pharmacies',
        no_opening_soon: 'No pharmacies opening soon',
        no_results: 'No results found',
        try_different_filter: 'Try a different filter',
        is_open: 'are open',
        are_opening_now: 'opening now',
        are_on_duty: 'on duty',
        pharmacy_singular: 'pharmacy',
        pharmacies_plural: 'pharmacies',

        // Emergency Numbers
        ambulance: 'Ambulance',
        police: 'Police',
        fire_brigade: 'Fire Brigade',
        european_emergency: 'European Emergency Number',
    },
};

export type TranslationKey = keyof typeof translations.el;

export const useTranslation = () => {
    const language = useAppStore((s) => s.language);
    const t = (key: TranslationKey) => translations[language][key] || key;
    return { t, language };
};

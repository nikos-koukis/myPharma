import { useAppStore } from '../store';

export const translations = {
    el: {
        // Tabs
        map: 'Χάρτης',
        pharmacies: 'Εφημερίες',
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
        send_feedback: 'Στείλε σχόλιο',
        contact_us: 'Επικοινωνία',
        copyright: '© 2026 PharmaGO',
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
        pharmacy_singular: 'φαρμακείο',
        pharmacies_plural: 'φαρμακεία',

        // Duty Status
        open_until: 'Ανοιχτό μέχρι',
        closes_in: 'Κλείνει σε',
        tomorrow_at: 'Αύριο στις',
        today_at: 'Σήμερα στις',
        does_not_duty_today: 'Δεν εφημερεύει σήμερα',

        // Feedback
        feedback_type: 'ΤΥΠΟΣ',
        feedback_message: 'ΜΗΝΥΜΑ',
        feedback_email: 'EMAIL (ΠΡΟΑΙΡΕΤΙΚΟ)',
        feedback_placeholder: 'Περιγράψτε το πρόβλημα ή την πρότασή σας...',
        feedback_email_placeholder: 'Για να λάβετε απάντηση...',
        feedback_submit: 'Αποστολή',
        feedback_success_title: 'Ευχαριστούμε!',
        feedback_success_msg: 'Το σχόλιό σας καταχωρήθηκε επιτυχώς.',
        feedback_error_title: 'Σφάλμα',
        feedback_error_msg: 'Δεν ήταν δυνατή η αποστολή. Παρακαλώ δοκιμάστε ξανά.',
        feedback_min_chars: 'Το μήνυμα πρέπει να έχει τουλάχιστον 10 χαρακτήρες.',
        bug: 'Πρόβλημα',
        feature: 'Πρόταση',
        pharmacy_error: 'Λάθος Φαρμακείου',
        general: 'Γενικά',

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
        send_feedback: 'Send feedback',
        contact_us: 'Contact us',
        copyright: '© 2026 PharmaGO',
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
        pharmacy_singular: 'pharmacy',
        pharmacies_plural: 'pharmacies',

        // Duty Status
        open_until: 'Open until',
        closes_in: 'Closes in',
        tomorrow_at: 'Tomorrow at',
        today_at: 'Today at',
        does_not_duty_today: 'Not on duty today',

        // Feedback
        feedback_type: 'TYPE',
        feedback_message: 'MESSAGE',
        feedback_email: 'EMAIL (OPTIONAL)',
        feedback_placeholder: 'Describe the issue or your suggestion...',
        feedback_email_placeholder: 'To receive a reply...',
        feedback_submit: 'Submit',
        feedback_success_title: 'Thank you!',
        feedback_success_msg: 'Your feedback has been submitted successfully.',
        feedback_error_title: 'Error',
        feedback_error_msg: 'Submission failed. Please try again.',
        feedback_min_chars: 'Message must be at least 10 characters long.',
        bug: 'Bug',
        feature: 'Suggestion',
        pharmacy_error: 'Pharmacy Error',
        general: 'General',

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

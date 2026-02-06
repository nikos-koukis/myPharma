export const translations = {
    el: {
        nav: {
            download: "Κατέβασε Δωρεάν",
        },
        hero: {
            badge: "Διαθέσιμο σε iOS & Android",
            title: "Βρες φαρμακεία",
            titleHighlight: "αμέσως",
            titleEnd: "στην Ελλάδα",
            desc: "Εφημερεύοντα φαρμακεία σε πραγματικό χρόνο με έξυπνη πλοήγηση, διαδραστικούς χάρτες και υποστήριξη έκτακτης ανάγκης. Δωρεάν για πάντα.",
            appStore: "App Store",
            playStore: "Google Play",
            stats: {
                pharmacies: "Φαρμακεία",
                downloads: "Λήψεις",
                rating: "Βαθμολογία",
            },
        },
        features: {
            tag: "Χαρακτηριστικά",
            title: "Όλα όσα χρειάζεσαι, τίποτα περισσότερο",
            desc: "Σχεδιασμένο για ταχύτητα και απλότητα όταν κάθε δευτερόλεπτο μετράει.",
            items: [
                {
                    icon: "📍",
                    title: "Έξυπνη Τοποθεσία",
                    desc: "Αναζήτηση με GPS που βρίσκει τα πιο κοντινά ανοιχτά φαρμακεία σε δευτερόλεπτα, οπουδήποτε στην Ελλάδα.",
                },
                {
                    icon: "🗺️",
                    title: "Ζωντανή Πλοήγηση",
                    desc: "Οδηγίες βήμα προς βήμα με χρόνους πεζοπορίας και οδήγησης για να φτάσεις γρήγορα.",
                },
                {
                    icon: "⚡",
                    title: "Δεδομένα σε Πραγματικό Χρόνο",
                    desc: "Πάντα ακριβή ωράρια λειτουργίας, τηλέφωνα και κατάσταση διαθεσιμότητας.",
                },
                {
                    icon: "🌍",
                    title: "Πολύγλωσσο",
                    desc: "Πλήρης υποστήριξη Ελληνικών και Αγγλικών—ιδανικό για ντόπιους και τουρίστες.",
                },
                {
                    icon: "🆘",
                    title: "Πρόσβαση Έκτακτης Ανάγκης",
                    desc: "Με ένα πάτημα πρόσβαση στις υπηρεσίες έκτακτης ανάγκης 166, 100, 199 και 112.",
                },
                {
                    icon: "🛡️",
                    title: "Προτεραιότητα στην Ιδιωτικότητα",
                    desc: "Καμία συλλογή δεδομένων. Η τοποθεσία σου δεν φεύγει ποτέ από τη συσκευή σου.",
                },
            ],
        },
        cta: {
            title: "Έτοιμος να βρεις το φαρμακείο σου;",
            desc: "Κατέβασε το PharmaGo τώρα και μη ψάχνεις ξανά για ανοιχτό φαρμακείο. Είναι δωρεάν, γρήγορο και σέβεται την ιδιωτικότητά σου.",
            ios: "Κατέβασε για iOS",
            android: "Κατέβασε για Android",
        },
        footer: {
            privacy: "Απόρρητο",
            terms: "Όροι",
            contact: "Επικοινωνία",
            copy: "Φτιαγμένο με ❤️ στην Ελλάδα.",
        },
    },
    en: {
        nav: {
            download: "Download Free",
        },
        hero: {
            badge: "Available on iOS & Android",
            title: "Find pharmacies",
            titleHighlight: "instantly",
            titleEnd: "in Greece",
            desc: "Real-time on-duty pharmacy finder with smart navigation, interactive maps, and emergency support. Free forever.",
            appStore: "App Store",
            playStore: "Google Play",
            stats: {
                pharmacies: "Pharmacies",
                downloads: "Downloads",
                rating: "Rating",
            },
        },
        features: {
            tag: "Features",
            title: "Everything you need, nothing you don't",
            desc: "Built for speed and simplicity when every second counts.",
            items: [
                {
                    icon: "📍",
                    title: "Smart Location",
                    desc: "GPS-powered search finds the closest open pharmacies in seconds, anywhere in Greece.",
                },
                {
                    icon: "🗺️",
                    title: "Live Navigation",
                    desc: "Turn-by-turn directions with walking and driving times to get you there fast.",
                },
                {
                    icon: "⚡",
                    title: "Real-time Data",
                    desc: "Always accurate opening hours, phone numbers, and availability status.",
                },
                {
                    icon: "🌍",
                    title: "Multi-language",
                    desc: "Full Greek and English support—perfect for locals and tourists alike.",
                },
                {
                    icon: "🆘",
                    title: "Emergency Access",
                    desc: "One-tap access to 166, 100, 199, and 112 emergency services.",
                },
                {
                    icon: "🛡️",
                    title: "Privacy First",
                    desc: "Zero data collection. Your location never leaves your device.",
                },
            ],
        },
        cta: {
            title: "Ready to find your pharmacy?",
            desc: "Download PharmaGo now and never struggle to find an open pharmacy again. It's free, fast, and respects your privacy.",
            ios: "Download for iOS",
            android: "Download for Android",
        },
        footer: {
            privacy: "Privacy",
            terms: "Terms",
            contact: "Contact",
            copy: "Made with ❤️ in Greece.",
        },
    },
};

export type Language = "el" | "en";
export type Translations = typeof translations.el;

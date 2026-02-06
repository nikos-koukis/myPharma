# myPharma Mobile

**myPharma** is a premium, cross-platform mobile application built with React Native and Expo, designed to help users find on-duty pharmacies in Greece instantly.

## Key Features

- **📍 Smart Nearby Search:** Automatically finds the closest open pharmacies based on your GPS location.
- **🗺️ Interactive Map:** High-performance map implementation with custom markers and smooth transitions.
- **🌍 Multi-language Support:** Full support for Greek and English (ideal for tourists).
- **🆘 Emergency Numbers:** Instant access to 166 (Ambulance), 100 (Police), 199 (Fire), and 112.
- **🌓 Adaptive Theme:** Seamless transition between light and dark modes (system-aware).
- **🛡️ Privacy First:** No personal data stored; location used only for real-time calculations.

## Tech Stack

- **Framework:** Expo SDK 54 + Expo Router
- **State Management:** React Query v5 (Server) + Zustand (Local)
- **Styling:** Premium UI with BlurView and LinearGradient
- **Maps:** react-native-maps with customized integration
- **Persistence:** AsyncStorage (Theme, Language, Location preferences)

## Setup & Development

### Prerequisites
- Install [Expo Go](https://expo.dev/expo-go) on your phone.
- Node.js installed on your machine.

### Installation
```bash
npm install
npx expo start
```

### API Configuration
The app connects to a backend API. In development, update the IP in `src/api/client.ts` to match your local machine's IP address.

## Project Structure

```
app/
├── (tabs)/                  # Bottom tab navigation (Maps, Settings)
└── pharmacy/[id].tsx        # Detailed pharmacy view
src/
├── i18n/                    # Translation system (EL/EN)
├── hooks/                   # Location, Pharmacies, and Status logic
├── store/                   # Global state (Zustand)
├── components/              # High-fidelity UI components
└── utils/                   # Directions, Calling, and Distance logic
```

## Privacy Policy
Please refer to the [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) file for details on how we handle data.

---

Built with ❤️ for the Greek community.

# 📚 LearnCache

A React Native mobile app that allows users to download educational websites for completely offline browsing.

## 🎯 Overview

LearnCache enables students and self-learners to download entire educational websites like W3Schools, MDN, GeeksforGeeks, and other static educational content for offline access. Perfect for areas with limited internet connectivity or for studying on the go without data concerns.

## ✨ Features

- **📥 Website Download**: Enter any educational website URL and download the entire site
- **💾 Offline Storage**: All content stored locally using device storage
- **🌐 Offline Browsing**: Browse downloaded sites using built-in WebView
- **📱 Saved Sites Management**: View, organize, and delete downloaded sites
- **📊 Progress Tracking**: Real-time download progress with detailed status
- **🔍 Smart Asset Handling**: Downloads HTML, CSS, JS, images, and other static resources

## 🛠️ Technical Stack

- **Framework**: React Native 0.80+
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **Storage**: react-native-fs + AsyncStorage
- **Web Browsing**: react-native-webview
- **Archive Support**: react-native-zip-archive

## 📱 Screens

1. **Home Screen**: URL input and download initiation
2. **Saved Sites**: List of all downloaded websites
3. **Site Viewer**: Offline web browsing interface

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- React Native development environment
- Android Studio (for Android development)
- Android device or emulator

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd LearnCache
```

2. Install dependencies:
```bash
npm install
```

3. For Android development:
```bash
cd android
./gradlew clean
cd ..
```

4. Run the app:
```bash
# Start Metro bundler
npx react-native start

# Run on Android (in another terminal)
npx react-native run-android
```

## 📖 Usage

1. **Download a Site**:
   - Open the app and navigate to the Home screen
   - Enter the URL of an educational website (e.g., https://www.w3schools.com)
   - Tap "Download Website" and wait for completion

2. **Browse Offline**:
   - Go to "Saved Sites" to see all downloaded websites
   - Tap on any site to open it in the offline browser
   - Navigate within the site using standard web browsing

3. **Manage Sites**:
   - Long press on any saved site to delete it
   - Pull down to refresh the sites list

## 🎯 Supported Websites

Works best with static educational websites such as:
- W3Schools
- MDN Web Docs  
- GeeksforGeeks
- Documentation sites
- Tutorial websites
- Reference materials

## ⚠️ Limitations

- Only supports static websites (no dynamic SPAs)
- No login or authentication support
- Limited JavaScript functionality in offline mode
- File size depends on website complexity

## 📂 Project Structure

```
src/
├── screens/          # Main app screens
├── components/       # Reusable UI components
├── services/         # Core business logic
├── types/           # TypeScript type definitions
└── utils/           # Helper functions
```

## 🔧 Configuration

The app includes configurable settings in `src/types/index.ts`:
- Maximum site size limits
- Download timeout settings
- User agent string

## 📄 License

This project is for educational purposes. Please respect website terms of service when downloading content.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue in the repository.

---

**Happy Learning!** 📚✨

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# LearnCache App - Copilot Instructions

This is a React Native app called **LearnCache** that allows users to download educational websites for offline browsing.

## Project Overview
- **Platform**: React Native (Android-first, iOS optional)
- **Purpose**: Download and browse educational websites like W3Schools and GeeksforGeeks completely offline
- **Target Users**: Students and self-learners wanting to read tutorials offline

## Core Features
1. **URL Input**: Simple input field for website URLs with download button
2. **Full Site Download**: Mirror entire sites using wget-like functionality
3. **Offline Storage**: Save content to app's internal storage using react-native-fs
4. **Offline Browsing**: Use react-native-webview to load saved content
5. **Saved Sites Dashboard**: List of downloaded sites with open/delete options

## Key Dependencies
- `react-native-fs`: File system operations and storage
- `react-native-webview`: Offline browsing capabilities
- `react-native-zip-archive`: Archive handling
- `@react-native-async-storage/async-storage`: Local data persistence
- `react-native-vector-icons`: UI icons

## Project Structure
- `/src/screens/`: UI screens (Home, SavedSites, SiteViewer)
- `/src/components/`: Reusable UI components
- `/src/services/`: Core services (DownloadService, StorageService)
- `/src/types/`: TypeScript type definitions
- `/src/utils/`: Utility functions

## Technical Notes
- Only supports static, public websites (no login support)
- No dynamic SPAs needed
- Android minimum API level 23+
- Uses TypeScript for type safety
- File storage path: `/offline_sites/<sitename>/`

## Coding Guidelines
- Use TypeScript for all components and services
- Follow React Native best practices
- Implement proper error handling for network operations
- Use functional components with hooks
- Keep UI simple and intuitive for students

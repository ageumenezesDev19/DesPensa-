# DesPensa 🧺

DesPensa is a robust **cross-platform desktop application** built with **Tauri**, React, TypeScript, and SCSS. It offers a modern, intuitive interface for personal inventory management and now features full theme support.

## ✨ Features

- **Inventory Management**: Add, remove, and monitor your items with ease.
- **Withdrawn History**: Track what has been consumed with daily and monthly summaries.
- **Blacklist**: Manage items you want to avoid in your inventory.
- **🌙 Dark Mode**: Full support for light and dark themes with smooth transitions and premium aesthetics.
- **Data Persistence**: Your data and theme preferences are saved locally (`localStorage`).
- **Multiple Profiles**: Support for different user profiles with backup and restoration.
- **Desktop Ready**: Powered by Tauri, providing a lightweight and secure native desktop experience.

## 🚀 Technologies

- **Tauri**: Framework for building tiny, blazing fast binaries for all major desktop platforms.
- **React**: Core UI library.
- **TypeScript**: Static typing for better safety and productivity.
- **Vite**: Extremely fast build tool.
- **SCSS**: Style preprocessor with an architecture based on CSS Custom Properties for dynamic theming.

## 🛠️ Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (required for Tauri)
- Node.js & npm

### Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run in development (Desktop mode)**:
    ```bash
    npm run tauri dev
    ```

3.  **Build production version**:
    ```bash
    npm run tauri build
    ```

## 🎨 Theme Infrastructure

The application uses a modern **CSS Custom Properties** (CSS Variables) system defined in `src/styles/_variables.scss`. The theme is controlled via the `data-theme` attribute on the application's root div.

### How to toggle themes
Click the **🌙 Dark Mode / ☀️ Light Mode** button in the application header. Your choice is automatically persisted in the browser/app.

---
*Made by Ageu M. Costa*

# Font Manager

A modern, fast, and cross-platform font management application built with **Tauri**, **React**, and **Rust**.

![License](https://img.shields.io/badge/license-AGPLv3-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

- **Fast & Lightweight**: Powered by Rust backend for high performance and low memory usage.
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux.
- **Font Preview**: Real-time preview of font families and their variants.
- **Easy Management**: Install and uninstall fonts with a single click.
- **Filter & Search**: Quickly find fonts by name or filter system fonts.
- **Dark Mode**: Built-in dark mode support for comfortable viewing.

## 📸 Screenshots

> *Add screenshots here showcasing the main interface, font preview, and dark mode.*

## 🚀 Installation

### Download Binaries

You can download the latest release from the [Releases](https://github.com/yourusername/font-manager/releases) page.

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [VS C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (for Windows)

#### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/font-manager.git
   cd font-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## 🛠️ Development

This project uses the following stack:

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Rust, Tauri
- **State Management**: React Hooks (useState, useMemo, useCallback)
- **Virtualization**: react-virtuoso for high-performance list rendering

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

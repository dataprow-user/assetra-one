# Assetra One

Assetra One is a premium personal finance and asset management application. It tracks your transactions, assets, liabilities, events, and budgeting all in a beautifully designed, dark-themed glassmorphic interface.

This repository is structured as a **Monorepo** using npm workspaces. This allows you to manage both the Web application and a future Mobile application from a single root directory.

## 📂 Repository Structure

```text
assetra-one/
├── package.json        <-- Root workspace configuration
├── README.md           <-- Documentation
└── apps/
    ├── web/            <-- The React (Vite) Web Application
    │   ├── src/
    │   ├── package.json
    │   └── ...
    └── mobile/         <-- (Future) React Native or Expo Mobile App
```

## 🚀 How to Run the Web Application

Because this project is set up as a monorepo workspace, you can run the web app directly from the root `assetra-one` directory.

### Prerequisites
- Make sure you have **Node.js** installed (v18 or higher recommended).

### 1. Install Dependencies
Open your terminal in the `assetra-one` folder and run:
```bash
npm install
```
*(This command will automatically install the dependencies for all apps inside the `apps/` folder).*

### 2. Start the Development Server
From the `assetra-one` root directory, run:
```bash
npm run dev:web
```
- The application will start locally (usually on `http://localhost:5173`).
- Any changes you make to the code in `apps/web/src` will hot-reload instantly.

---

## 📱 Future: Adding the Mobile App

When you are ready to build the mobile application (e.g., using Expo or React Native CLI), you can generate it inside the `apps/` directory.

For example, using Expo:
```bash
cd apps
npx create-expo-app mobile
```

Once the mobile app is generated:
1. It will live side-by-side with your web app at `apps/mobile`.
2. You can add scripts to the root `package.json` to manage it, for example:
   ```json
   "scripts": {
     "dev:web": "npm run dev --workspace=apps/web",
     "dev:mobile": "npm run start --workspace=apps/mobile"
   }
   ```
3. You can even create shared packages (like `packages/shared-types` or `packages/ui`) in the future that both web and mobile can import from!

## 🔐 Default Login Credentials
For local development, you can log in using:
- **Email:** `ravi@kumar.family`
- **Password:** `password123`

*(All data is currently persisted in your browser's Local Storage).*

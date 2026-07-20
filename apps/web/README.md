# Assetra One — Comprehensive Guide

Assetra One is a 100% private, client-side personal finance and asset management web application. It runs entirely in your browser, keeping your sensitive financial data strictly on your device until you choose to back it up to your personal Google Drive.

---

## 📖 User Guide

### 1. First Time Setup
When you launch Assetra One, you can optionally load "Sample Data" from the Settings page to see how the app looks with active transactions and accounts. 
To start tracking your own finances, navigate to **Settings** and update your "Household Name".

### 2. Dashboard & Tracking
- **Dashboard**: Gives you a bird's-eye view of your net worth, cash flow, top expenses, and upcoming insurance/liability dues.
- **Transactions**: Log income, expenses, and transfers. You can filter by type or search by description.
- **Accounts**: Manage bank accounts, credit cards, demat accounts, and cash wallets.
- **Assets & Liabilities**: Track physical/digital assets (Real Estate, Gold, Stocks) and your debts (Home Loans, EMIs).
- **Budgets & Events**: Set category limits (e.g., "Food" or "Travel") and track expenses for specific life events (e.g., "Wedding" or "Vacation").
- **Insurance**: Track life, health, and vehicle insurance policies and their next premium due dates.

### 3. Data Export
Your data never touches our servers. However, you can export it at any time from the **Settings** page:
1. **JSON**: Best for complete backups. You can use this file to "Import" your data back into Assetra if you switch devices.
2. **Excel (.xlsx)**: Generates a beautiful 7-sheet Excel file containing all your Accounts, Transactions, Assets, Liabilities, etc.
3. **CSV**: A simple, plain-text export of your Transactions.

### 4. Cloud Backup (Google Drive Integration)
To ensure you never lose your data, the app uses a **Cloud-First Architecture**:
1. **Google Drive Authentication**: You must sign in with your Google account. The app securely requests access *only* to files it creates itself.
2. **Real-Time Auto-Sync**: Anytime you add or change data (like a transaction), the app waits 5 seconds and silently uploads your changes to a secure folder named `AssetraBackups` in your Google Drive.
3. **Cross-Device Restore**: When you log in on a new device or browser, the app instantly detects your `Assetra-Backup.json` file in Google Drive and automatically restores your entire dashboard.
4. **Data Integrity**: Background syncing strictly enforces the **JSON** format to ensure perfect data restoration. You can still manually export your data to Excel or CSV at any time from the Settings page.

---

## 💻 Developer Guide

### Tech Stack
- **Framework**: React 18 (via Vite)
- **Styling**: Vanilla CSS (CSS Variables for theming, Dark Mode ready)
- **Icons**: `lucide-react`
- **Charting**: `recharts`
- **Spreadsheets**: `xlsx` (SheetJS for Excel/CSV parsing)
- **Routing**: Client-side single-page application structure.

### Folder Structure
```text
apps/web/
├── src/
│   ├── components/       # Reusable UI (Sidebar, Header, Modal)
│   ├── context/          # AppContext.jsx (Global State Management)
│   ├── pages/            # Individual Views (Dashboard, Settings, Transactions, etc.)
│   ├── utils/            # Core business logic
│   │   ├── backupSchedule.js # Manages interval checks and preferences
│   │   ├── exportData.js     # SheetJS logic for Blob and File generation
│   │   └── googleDriveSync.js# Google OAuth and Drive REST API logic
│   ├── App.jsx           # Main layout and CloudSyncManager logic
│   └── main.jsx          # React DOM entry
├── .env                  # Contains VITE_GOOGLE_CLIENT_ID
└── index.html            # Loads Google Identity Services script
```

### State Management & Auto-Sync
Assetra One uses standard React `useReducer` combined with `Context API` to manage a massive global state tree (Transactions, Accounts, Assets, Liabilities, etc.).
- **Persistence**: Every time `dispatch` is called, the reducer saves the entire state tree to `localStorage` under the key `a1_data`.
- **CloudSyncManager (`App.jsx`)**: A background component that listens to `state` changes. It debounces updates (5 seconds) and silently pushes a JSON blob to Google Drive via `uploadToDrive()`. On initial mount, it checks the cloud modification time and auto-pulls if the cloud is newer.

### Google Drive API Integration Architecture
The Cloud Sync feature was built using the **Google Identity Services (GSI)** library for modern OAuth 2.0 and the **Google Drive v3 REST API**.

1. **Setup**:
   - Create a project in Google Cloud Console and enable the **Google Drive API**.
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Set the Client ID in `.env` as `VITE_GOOGLE_CLIENT_ID`.
2. **Authentication (`connectGoogleDrive`)**:
   - Requests the `https://www.googleapis.com/auth/drive.file` scope. This ensures the app can **only** read/write files it explicitly created.
3. **Folder Management (`getOrCreateFolder`)**:
   - Uses the Drive API (`GET /drive/v3/files`) to search for `name='AssetraBackups'`. If not found, it `POST`s to create it.
4. **File Upload & Patching (`uploadToDrive`)**:
   - Searches for `Assetra-Backup.json` in the folder.
   - If it exists, uses `PATCH /upload/drive/v3/files/{id}?uploadType=multipart` to update the file natively.
   - Cache-busting headers (`Cache-Control: no-cache`) are strictly enforced to prevent stale data pulls.

### Deployment Guide (Hostinger & Subdomains)
Assetra One is a static Single Page Application (SPA), making it extremely easy to host.

1. **Build the Application**:
   - Run `npm run build` in the `apps/web` directory.
   - This generates an optimized `dist` folder.
2. **Deploy to Hostinger**:
   - Go to your Hostinger hPanel -> Domains -> Subdomains.
   - Create a subdomain (e.g., `app.assetraone.dataprow.com`).
   - Open File Manager, navigate to the subdomain folder, and upload the contents of the `dist` folder directly into it.
3. **Authorize the Production URL**:
   - **CRITICAL**: Google OAuth will block logins on your live site (`Error 400: origin_mismatch`) until you authorize the URL.
   - Go to Google Cloud Console -> APIs & Services -> Credentials.
   - Edit your OAuth 2.0 Client ID.
   - Under **Authorized JavaScript origins**, add your exact URL (e.g., `https://app.assetraone.dataprow.com`). Do **not** include a trailing slash. Wait 5-10 minutes for Google to update.

### Adding New Features
To add a new feature (e.g., "Subscriptions" tracker):
1. **State**: Add an empty array `subscriptions: []` to the initial state in `AppContext.jsx`.
2. **Reducers**: Add `ADD_SUB`, `UPDATE_SUB`, `DELETE_SUB` action handlers.
3. **UI**: Create `pages/Subscriptions.jsx` and `pages/Subscriptions.css` following the table/modal pattern used in `Transactions.jsx`.
4. **Export**: Update `exportData.js` to include the `subscriptions` array as an Excel sheet and ensure it is serialized in the JSON backup.
5. **Sidebar**: Add the navigation link in `components/Sidebar.jsx`.

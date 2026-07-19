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
To ensure you never lose your data, you can connect your Google Drive:
1. Go to **Settings** > **Google Drive Backup**.
2. Click **Connect Google Drive** and sign in securely with Google.
3. Choose a **Backup Format** (JSON is recommended for easy restoration).
4. Select a **Backup Schedule** (e.g., Daily, Weekly, Monthly).
5. **How it works**: The app will automatically create a secure folder named `AssetraBackups` in your Google Drive. Every time a backup is triggered (manually or automatically), the app will silently update the `Assetra-Backup` file inside that folder, utilizing Google Drive's built-in version history.

---

## 💻 Developer Guide

### Tech Stack
- **Framework**: React 18 (via Vite)
- **Styling**: Vanilla CSS (CSS Variables for theming, Dark Mode ready)
- **Icons**: `lucide-react`
- **Charting**: `recharts`
- **Spreadsheets**: `xlsx` (SheetJS for Excel/CSV parsing)
- **Routing**: Client-side single-page application structure (Conditional rendering via standard state).

### Folder Structure
```text
apps/web/
├── src/
│   ├── components/       # Reusable UI (Sidebar, Header, Modal)
│   ├── context/          # AppContext.jsx (Global State Management)
│   ├── pages/            # Individual Views (Dashboard, Settings, Transactions, etc.)
│   ├── utils/            # Core business logic
│   │   ├── backupSchedule.js # Manages interval checks and preferences in localStorage
│   │   ├── exportData.js     # SheetJS logic for Blob and File generation
│   │   └── googleDriveSync.js# Google OAuth and Drive REST API logic
│   ├── App.jsx           # Main layout and BackupBanner logic
│   └── main.jsx          # React DOM entry
├── .env                  # Contains VITE_GOOGLE_CLIENT_ID
└── index.html            # Loads Google Identity Services script
```

### State Management (`AppContext.jsx`)
Assetra One uses standard React `useReducer` combined with `Context API` to manage a massive global state tree (Transactions, Accounts, Assets, Liabilities, etc.).
- **Persistence**: Every time `dispatch` is called, the reducer saves the entire state tree to `localStorage` under the key `assetra_data`.
- **Initialization**: On boot, it reads from `localStorage`. If empty, it initializes an empty schema.

### Google Drive API Integration Architecture
The Cloud Sync feature was built using the **Google Identity Services (GSI)** library for modern OAuth 2.0 and the **Google Drive v3 REST API**.

1. **Setup**:
   - The developer must create a project in Google Cloud Console.
   - Enable the **Google Drive API**.
   - Create **OAuth 2.0 Client IDs** (Web application) and add `http://localhost:5173` to Authorized JavaScript origins.
   - Set the Client ID in `.env` as `VITE_GOOGLE_CLIENT_ID`.
2. **Authentication (`connectGoogleDrive`)**:
   - Uses `google.accounts.oauth2.initTokenClient` to request the `https://www.googleapis.com/auth/drive.file` scope.
   - This scope ensures the app can **only** read/write files it explicitly created.
3. **Folder Management (`getOrCreateFolder`)**:
   - Uses the Drive API (`GET /drive/v3/files`) to search for `name='AssetraBackups' and 'root' in parents`.
   - If not found, it `POST`s to create it as `application/vnd.google-apps.folder`.
4. **File Upload & Patching (`uploadToDrive`)**:
   - Generates a `Blob` based on the user's preferred format (JSON, XLSX).
   - Searches for an existing `Assetra-Backup.*` file in the `AssetraBackups` folder.
   - If it exists, uses `PATCH /upload/drive/v3/files/{id}` to update the file contents natively.
   - If it doesn't, uses `POST /upload/drive/v3/files` to create it.
   - Uses `FormData` for multipart binary uploads.

### Running the App Locally
1. Ensure you have Node.js installed.
2. In the root of `assetra-one`, run:
   ```bash
   npm install
   npm run dev:web
   ```
3. Open `http://localhost:5173`.
4. *Note on Google Auth*: Google OAuth requires the app to run on the authorized origins. Standard `localhost` works fine for development.

### Adding New Features
To add a new feature (e.g., "Subscriptions" tracker):
1. **State**: Add an empty array `subscriptions: []` to the initial state in `AppContext.jsx`.
2. **Reducers**: Add `ADD_SUB`, `UPDATE_SUB`, `DELETE_SUB` action handlers.
3. **UI**: Create `pages/Subscriptions.jsx` and `pages/Subscriptions.css` following the table/modal pattern used in `Transactions.jsx`.
4. **Export**: Update `exportData.js` to include the `subscriptions` array as an Excel sheet and ensure it is serialized in the JSON backup.
5. **Sidebar**: Add the navigation link in `components/Sidebar.jsx`.

# Assetra One — User Guide

Assetra One is your personal finance and asset command center: track accounts, transactions, assets, liabilities, budgets, insurance, and more — all in one private app.

Developer? See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) instead.

---

## Getting started

### Signing in

Open the app and tap **Sign in with Google**. There's no separate password to create — your Google account *is* your login. Signing in automatically creates your Assetra account.

You will **not** be asked to sign in again every time you open the app — your session is remembered. You'll only see the sign-in screen again if you explicitly sign out, or if the app hasn't been opened in over **30 days** (an automatic security sign-out).

### The welcome tour

The first time you sign in, a short guided tour walks you through the app's main areas. Tap **Next** to continue, or the **✕** to skip. You can replay it anytime from **Settings → Your Profile → Replay Welcome Guide**.

### Set up a quick PIN (recommended)

Signing in with Google every single time you open the app is unnecessary — set a 4-digit PIN instead:

1. Go to **Settings → App Lock → Set PIN**.
2. Enter a 4-digit PIN, then enter it again to confirm.

From then on, opening the app (or returning to it after using another app) shows a quick PIN screen instead of asking you to sign in with Google again.

**Forgot your PIN?** On the PIN screen, tap **Forgot PIN?** → confirm. This signs you out; sign back in with Google and set a new PIN from Settings. There's no other way to recover a forgotten PIN, since it's stored only on your device.

---

## Getting around the app

The bottom bar has four tabs:

| Tab | What it shows |
|---|---|
| **Dashboard** | Your financial overview — net worth, income vs. expenses, recent activity |
| **Transactions** | Every income/expense entry, with search and filters |
| **Accounts** | Your bank accounts, cards, cash, and wallets |
| **More** | Everything else: Assets, Liabilities, Budgets, Events, Insurance, Categories, Settings |

The floating **+** button (bottom-right, on most screens) is the fastest way to add a transaction from anywhere.

### Hiding sensitive amounts

Tap the **eye icon** (👁) at the top of most screens to instantly mask every amount on screen with `••••••` — handy if someone's looking over your shoulder. Amounts are **masked by default every time you sign in**; tap the eye again to reveal them for the rest of your session.

### Searching everything

Tap the **search icon** on the Dashboard to search across transactions, accounts, assets, liabilities, budgets, events, insurance policies, and categories all at once. Tap a result to jump straight to it.

---

## Feature walkthrough

### Dashboard
Your at-a-glance summary: **Net Worth**, cash **In Hand**, this month's **Income** and **Expense**, recent transactions, budget status, upcoming insurance dues, and an assets-vs-liabilities breakdown.

### Transactions
Every income and expense you've logged. Use the **search box** and the **All / Income / Expense** filter tabs to narrow the list, plus a group filter for expenses. Tap the pencil to edit or the trash icon to delete any entry.

**Adding a transaction:** tap **+**, choose Income or Expense, pick a category (its group fills in automatically), optionally a sub-category, enter the amount, pick which account it affects, optionally link it to an Event, and add a note. You'll see a live preview of your account's balance before and after.

### Accounts
Your bank accounts, cards, cash, and digital wallets, each showing its current balance. Add one with **+ Add** — give it a name, pick a type, enter a starting balance and currency.

### Assets
Things you own that have value — gold, mutual funds, stocks, fixed deposits, property, and more. Each entry shows what you paid, what it's worth now, and your gain or loss. Tap the **gear icon** to manage your own custom asset types and colors.

### Liabilities
Loans and debts — home loans, personal loans, credit card debt, and so on — with interest rate, EMI, tenure, and how much is still outstanding. Also supports custom liability types.

### Budgets
Set a planned spending amount per category per month (or year). Switch between a **Cards** view (browse by category) and a **Bulk Entry** view (fill in every category's budget for the month at once, grouped by group).

### Events
For a trip, wedding, or any occasion with its own budget — create an Event with a date range and optional budget, then link transactions to it (from the transaction form's "Link to Event" field) to track spending against that budget automatically.

### Insurance
Track your policies — name, type, premium, payment frequency, sum assured, and next due date. Policies due soon are flagged (yellow within 30 days, red within 7).

### Categories
Customize how your income and expenses are organized: add/rename/delete categories and sub-categories, and organize categories into groups (like "Needs," "Wants," "Investment"). Changing a category's group here doesn't affect past transactions.

### Settings
Everything else lives here:

- **App Lock** — set, change, or remove your PIN.
- **Household** — name your household (shown on the Dashboard greeting).
- **Your Profile** — your signed-in Google identity, sign out, view the Privacy Policy, or replay the welcome tour.
- **Export & Import** — export your data as JSON (full backup), Excel, or CSV; import a previously exported JSON backup (this **replaces** all current data, so use carefully).
- **Download Report** — generate a Monthly or Yearly Excel report summarizing income, expenses, and a category breakdown.
- **Google Drive Backup** — connect your Google Drive for automatic cloud backup (see below).
- **Family Members** — add people (not separate logins) to label whose account/asset/expense something belongs to. This is a single-user app; family members are just labels.
- **Danger Zone** — **Reset All Data** (wipes everything, after saving you a backup first) or **Load Sample Data** (loads a demo dataset to explore the app).

---

## Backing up your data

### Google Drive backup (recommended)

The first time you sign in, or from the Dashboard, you'll see a banner inviting you to **Connect Google Drive**. Once connected:

- **Auto Sync turns on automatically** — every change you make is saved to your Drive a few seconds after you make it, silently, with no button to press. You can confirm this is on in **Settings → Google Drive Backup**, which shows an **● Auto Sync: Enabled** badge.
- If you open the app on a different device signed into the same Drive, it automatically pulls down the newer data.
- You can also trigger an upload manually anytime with **Sync Now**.

The app only ever creates and manages its **own** backup files inside a folder called `AssetraBackups` in your Drive — it cannot see or touch any of your other Drive files.

### Manual export

**Settings → Export & Import → Export Data** lets you save a copy of your data as a JSON file (full backup, can be re-imported later), an Excel workbook, or a CSV of your transactions. Use your phone's share sheet to save it wherever you like (email, cloud storage, files app).

To restore from a JSON export, use **Import Backup** — you'll be asked to confirm, since it replaces everything currently in the app.

---

## Your privacy

Read the full policy anytime via **Settings → Your Profile → Privacy Policy**, or from the sign-in screen. In short:

- Your financial data lives **only on your device**, unless you explicitly connect Google Drive backup.
- If you connect Drive, the app can only access files it created itself — never your other files.
- Basic account creation/login events (your name and email) are logged for support and usage analytics — never sold or shared.
- You can permanently delete everything at any time via **Settings → Danger Zone → Reset All Data**.

---

## Frequently asked questions

**Why do I have to mask amounts every time I open the app?**
It's a deliberate privacy default — amounts always start hidden on a fresh sign-in, and you reveal them with the eye icon when you're ready.

**I set a PIN but forgot it. What now?**
On the PIN screen, tap **Forgot PIN?**, confirm, sign back in with Google, and set a new PIN from Settings.

**Does adding a "Family Member" let them log into the app?**
No — this app has one login (your Google account). Family members are just labels you can attach to transactions/assets/accounts so you know whose expense or asset something is.

**Google Drive sync stopped working / shows an error.**
Try **Settings → Google Drive Backup → Sync Now**. If it still fails after that, disconnect and reconnect Drive from the same screen.

**Can I use this without connecting Google Drive?**
Yes — Drive backup is entirely optional. Without it, your data stays only on this device, so make sure to export a backup periodically (Settings → Export & Import) in case you lose or replace your phone.

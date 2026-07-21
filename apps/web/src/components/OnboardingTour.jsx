import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, LayoutDashboard, Wallet, List, TrendingUp,
  PieChart, Shield, Tags, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import './OnboardingTour.css';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Assetra One 👋',
    desc: "Let's take a quick look around so you know exactly where everything lives. This takes less than a minute.",
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Your financial overview at a glance — net worth, income vs. expenses, and recent activity, all in one place.',
  },
  {
    icon: Wallet,
    title: 'Accounts — start here',
    desc: 'Add your bank accounts, credit cards, and cash first. Every transaction is linked to an account so its balance always stays accurate.',
  },
  {
    icon: List,
    title: 'Transactions',
    desc: 'Log income and expenses here. Balances update automatically on the account you select.',
  },
  {
    icon: TrendingUp,
    title: 'Assets & Liabilities',
    desc: 'Track investments like gold, mutual funds, and fixed deposits under Assets — and loans or debts under Liabilities.',
  },
  {
    icon: PieChart,
    title: 'Budgets & Events',
    desc: 'Set monthly budgets per category, or create an Event (like a trip) with its own one-time budget.',
  },
  {
    icon: Shield,
    title: 'Insurance',
    desc: "Keep your policy renewal dates here — Assetra reminds you when a due date is within 30 days.",
  },
  {
    icon: Tags,
    title: 'Categories',
    desc: 'Customize expense and income categories and groups to match how you actually spend and earn.',
  },
  {
    icon: SettingsIcon,
    title: 'Settings & Backup',
    desc: 'Manage your household name, export or import a backup, and connect Google Drive for automatic cloud sync — all here.',
  },
  {
    icon: Sparkles,
    title: "You're all set!",
    desc: 'Quick tip: add at least one Account before your first Transaction, so balances track correctly from day one.',
  },
];

export default function OnboardingTour({ onFinish }) {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon    = current.icon;

  return createPortal(
    <div className="tour-overlay">
      <div className="tour-box">
        <button className="tour-skip" onClick={onFinish} title="Skip guide"><X size={16}/></button>

        <div className="tour-icon"><Icon size={30}/></div>
        <h2 className="tour-title">{current.title}</h2>
        <p className="tour-desc">{current.desc}</p>

        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="tour-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isFirst}
            onClick={() => setStep(s => s - 1)}
          >
            <ChevronLeft size={16}/> Back
          </button>

          {isLast ? (
            <button type="button" className="btn btn-primary" onClick={onFinish}>
              Get Started
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

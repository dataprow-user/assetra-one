import React from 'react';
import { CreditCard, PieChart, Settings as SettingsIcon } from 'lucide-react';
import './Placeholders.css';

const PlaceholderTemplate = ({ icon: Icon, title, description }) => (
  <div className="placeholder-container">
    <div className="placeholder-card">
      <div className="icon-wrapper">
        <Icon size={48} className="placeholder-icon" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="notify-btn">Notify me when it's ready</button>
    </div>
  </div>
);

const Accounts = () => (
  <PlaceholderTemplate 
    icon={CreditCard} 
    title="Accounts Dashboard" 
    description="Track your Bank Accounts, Credit Cards, and Wallets in one place. We're putting the finishing touches on this view."
  />
);

const Budgets = () => (
  <PlaceholderTemplate 
    icon={PieChart} 
    title="Budget Management" 
    description="Set category limits, track spending, and get alerted before you cross your budget. Coming in the next update."
  />
);

const Settings = () => (
  <PlaceholderTemplate 
    icon={SettingsIcon} 
    title="Household Settings" 
    description="Manage your family members, permissions, and application preferences here. Launching soon."
  />
);

export default { Accounts, Budgets, Settings };

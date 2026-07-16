import React from 'react';
import { ArrowUpRight, ArrowDownRight, IndianRupee, Wallet } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="summary-cards">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Net Worth</span>
            <Wallet className="card-icon text-accent" size={24} />
          </div>
          <h3 className="card-value">₹12,40,000</h3>
          <p className="card-trend positive">
            <ArrowUpRight size={16} />
            <span>+2.4% this month</span>
          </p>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monthly Income</span>
            <ArrowDownRight className="card-icon text-success" size={24} />
          </div>
          <h3 className="card-value">₹90,000</h3>
          <p className="card-trend neutral">
            <span>Expected salary</span>
          </p>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monthly Expenses</span>
            <ArrowUpRight className="card-icon text-danger" size={24} />
          </div>
          <h3 className="card-value">₹35,000</h3>
          <p className="card-trend negative">
            <ArrowUpRight size={16} />
            <span>+5% vs last month</span>
          </p>
        </div>
      </div>
      
      <div className="dashboard-sections">
        <div className="section-box recent-transactions">
          <h3 className="section-title">Recent Transactions</h3>
          <p className="text-muted">Go to the Transactions tab to add, edit, or delete.</p>
          <div className="empty-state">No transactions this week.</div>
        </div>
        <div className="section-box upcoming-bills">
          <h3 className="section-title">Upcoming Bills</h3>
          <div className="bill-item">
            <div className="bill-info">
              <span className="bill-name">Home Loan EMI</span>
              <span className="bill-date">Due in 3 days</span>
            </div>
            <span className="bill-amount text-danger">-₹25,000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

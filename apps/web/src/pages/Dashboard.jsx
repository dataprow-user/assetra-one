import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Wallet, AlertTriangle, Clock, IndianRupee
} from 'lucide-react';
import { fmt, fmtSigned } from '../utils/format';
import './Dashboard.css';

function StatCard({ title, value, sub, subColor, icon: Icon, iconColor }) {
  return (
    <div className="stat-card section-box animate-in">
      <div className="stat-card-top">
        <span className="stat-label">{title}</span>
        <div className={`stat-icon`} style={{ background: iconColor + '22', color: iconColor }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className={`stat-sub`} style={{ color: subColor }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { state } = useApp();
  const { transactions, accounts, assets, liabilities, budgets, insurance } = state;

  // Computations
  const totalAssets = assets.reduce((s, a) => s + (a.quantity * a.currentPrice), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.outstanding, 0);
  const netWorth = totalAssets - totalLiabilities;
  const liquidCash = accounts.filter(a => ['bank', 'cash', 'wallet'].includes(a.type)).reduce((s, a) => s + a.balance, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTxns = transactions.filter(t => new Date(t.date) >= monthStart);
  const monthIncome = thisMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = thisMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const recentTxns = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const alertBudgets = budgets.filter(b => b.spent / b.amount >= b.alertPct / 100);

  const upcomingInsurance = insurance
    .map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.nextDue) - now) / 86400000) }))
    .filter(p => p.daysLeft >= 0 && p.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="dashboard animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'} 👋</div>
          <div className="page-subtitle">{state.household?.name} • {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Net Worth" value={fmtSigned(netWorth)} sub={netWorth >= 0 ? 'Positive net worth' : 'Negative net worth'} subColor={netWorth >= 0 ? 'var(--green)' : 'var(--red)'} icon={TrendingUp} iconColor="var(--accent-light)" />
        <StatCard title="In Hand" value={fmtSigned(liquidCash)} sub="Across all accounts" subColor={liquidCash >= 0 ? 'var(--text-2)' : 'var(--red)'} icon={Wallet} iconColor="var(--green)" />
        <StatCard title="This Month Income" value={fmt(monthIncome)} sub="↑ Earnings" subColor="var(--green)" icon={ArrowDownRight} iconColor="var(--green)" />
        <StatCard title="This Month Expense" value={fmt(monthExpense)} sub={`Savings: ${fmt(monthIncome - monthExpense)}`} subColor={monthIncome - monthExpense >= 0 ? 'var(--green)' : 'var(--red)'} icon={ArrowUpRight} iconColor="var(--red)" />
      </div>

      <div className="dashboard-grid">
        {/* Recent Transactions */}
        <div className="section-box">
          <div className="section-title">Recent Transactions</div>
          {recentTxns.length === 0 ? (
            <div className="empty-state"><p>No transactions yet</p></div>
          ) : (
            <div className="txn-list">
              {recentTxns.map(t => (
                <div key={t.id} className="txn-row">
                  <div className={`txn-dot ${t.type === 'income' ? 'green' : 'red'}`} />
                  <div className="txn-info">
                    <span className="txn-desc">{t.description}</span>
                    <span className="txn-meta">{t.category} • {t.date}</span>
                  </div>
                  <span className={t.type === 'income' ? 'amount-positive' : 'amount-negative'}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Alerts */}
        <div className="section-box">
          <div className="section-title">Budget Status</div>
          {budgets.length === 0 ? (
            <div className="empty-state"><p>No budgets set</p></div>
          ) : (
            <div className="budget-list">
              {budgets.map(b => {
                const pct = Math.min((b.spent / b.amount) * 100, 100);
                const color = pct >= 100 ? 'var(--red)' : pct >= b.alertPct ? 'var(--yellow)' : 'var(--green)';
                return (
                  <div key={b.id} className="budget-item">
                    <div className="budget-item-top">
                      <span className="budget-name">{b.name}</span>
                      <span style={{ color, fontSize: '0.85rem', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="budget-nums">
                      <span>{fmt(b.spent)} spent</span>
                      <span>{fmt(b.amount)} limit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Insurance/Bills */}
        <div className="section-box">
          <div className="section-title">Upcoming Due</div>
          {upcomingInsurance.length === 0 ? (
            <div className="empty-state"><p>No upcoming dues in 60 days</p></div>
          ) : (
            upcomingInsurance.map(p => (
              <div key={p.id} className="due-row">
                <div className="due-info">
                  <span className="due-name">{p.name}</span>
                  <span className={`badge ${p.daysLeft <= 7 ? 'badge-red' : 'badge-yellow'}`}>
                    {p.daysLeft === 0 ? 'Today' : `${p.daysLeft}d left`}
                  </span>
                </div>
                <span className="amount-negative">-{fmt(p.premium)}</span>
              </div>
            ))
          )}
        </div>

        {/* Assets & Liabilities Summary */}
        <div className="section-box">
          <div className="section-title">Assets vs Liabilities</div>
          <div className="av-grid">
            <div className="av-item">
              <span className="av-label">Total Assets</span>
              <span className="amount-positive av-value">{fmt(totalAssets)}</span>
            </div>
            <div className="av-item">
              <span className="av-label">Total Liabilities</span>
              <span className="amount-negative av-value">{fmt(totalLiabilities)}</span>
            </div>
          </div>
          <div className="progress-bar-wrap" style={{ marginTop: 16 }}>
            <div className="progress-bar" style={{ width: `${Math.min((totalLiabilities / totalAssets) * 100, 100)}%`, background: 'var(--red)' }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 6 }}>
            Liability ratio: {totalAssets ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

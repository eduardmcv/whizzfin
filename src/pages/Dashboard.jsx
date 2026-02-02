import { useState, useEffect } from 'react';
import db from '../db/database';

function Dashboard() {
  const [data, setData] = useState({
    settings: null,
    totalIncome: 0,
    totalFixed: 0,
    totalForecasts: 0,
    totalFreeExpenses: 0,
    weeklySpent: 0
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const [settings, incomes, fixedExpenses, forecasts, freeExpenses] = await Promise.all([
      db.settings.get(1),
      db.incomes.toArray(),
      db.fixedExpenses.toArray(),
      db.forecasts.toArray(),
      db.freeExpenses.toArray()
    ]);

    // Calculate totals
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalFixed = fixedExpenses.filter(e => e.active !== false).reduce((sum, e) => sum + e.amount, 0);
    const totalForecasts = forecasts
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0);
    
    // Free expenses this month
    const thisMonthFree = freeExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalFreeExpenses = thisMonthFree.reduce((sum, e) => sum + e.amount, 0);

    // Calculate weekly spent (simplified: last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklySpent = freeExpenses
      .filter(e => new Date(e.date) >= weekAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    setData({
      settings,
      totalIncome,
      totalFixed,
      totalForecasts,
      totalFreeExpenses,
      weeklySpent
    });
  };

  const weeklyBudget = data.settings?.weeklyBudget || 0;
  const weeklyRemaining = weeklyBudget - data.weeklySpent;
  const monthlyAvailable = data.totalIncome - data.totalFixed - data.totalForecasts - (data.settings?.monthlySavingsTarget || 0);

  return (
    <div>
      <h1>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Weekly Budget</h3>
          <p style={{ fontSize: '24px' }}>{weeklyRemaining.toFixed(2)}€ / {weeklyBudget}€</p>
          <p>Spent this week: {data.weeklySpent.toFixed(2)}€</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Monthly Income</h3>
          <p style={{ fontSize: '24px' }}>{data.totalIncome.toFixed(2)}€</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Fixed Expenses</h3>
          <p style={{ fontSize: '24px' }}>{data.totalFixed.toFixed(2)}€</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Pending Forecasts</h3>
          <p style={{ fontSize: '24px' }}>{data.totalForecasts.toFixed(2)}€</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Free Expenses (this month)</h3>
          <p style={{ fontSize: '24px' }}>{data.totalFreeExpenses.toFixed(2)}€</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Monthly Available</h3>
          <p style={{ fontSize: '24px' }}>{monthlyAvailable.toFixed(2)}€</p>
          <p>After fixed, forecasts & savings</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
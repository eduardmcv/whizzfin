import { useState, useEffect } from 'react';
import db from '../db/database';

function Incomes() {
  const [incomes, setIncomes] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    dayOfMonth: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allIncomes = await db.incomes.toArray();
    setIncomes(allIncomes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    await db.incomes.add({
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      createdAt: new Date().toISOString()
    });

    setForm({
      amount: '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      dayOfMonth: 1
    });
    loadData();
  };

  const deleteIncome = async (id) => {
    await db.incomes.delete(id);
    loadData();
  };

  return (
    <div>
      <h1>Incomes</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Title (e.g. Salary)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label>
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
          />
          Recurring monthly
        </label>
        {form.isRecurring ? (
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Day of month"
            value={form.dayOfMonth}
            onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
          />
        ) : (
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        )}
        <button type="submit">Add income</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Date/Day</th>
            <th>Title</th>
            <th>Amount</th>
            <th>Recurring</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incomes.map(inc => (
            <tr key={inc.id}>
              <td>{inc.isRecurring ? `Day ${inc.dayOfMonth}` : inc.date}</td>
              <td>{inc.title}</td>
              <td>{inc.amount}€</td>
              <td>{inc.isRecurring ? 'Yes' : 'No'}</td>
              <td><button onClick={() => deleteIncome(inc.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Incomes;
import { useState, useEffect } from 'react';
import db from '../db/database';

function FixedExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    dayOfMonth: 1,
    categoryId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allExpenses, allCategories] = await Promise.all([
      db.fixedExpenses.toArray(),
      db.categories.toArray()
    ]);
    setExpenses(allExpenses);
    setCategories(allCategories);
    if (allCategories.length > 0 && !form.categoryId) {
      setForm(f => ({ ...f, categoryId: allCategories[0].id }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    await db.fixedExpenses.add({
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      categoryId: Number(form.categoryId),
      active: true,
      createdAt: new Date().toISOString()
    });

    setForm({
      amount: '',
      title: '',
      description: '',
      dayOfMonth: 1,
      categoryId: categories[0]?.id || ''
    });
    loadData();
  };

  const deleteExpense = async (id) => {
    await db.fixedExpenses.delete(id);
    loadData();
  };

  const getCategoryName = (id) => {
    return categories.find(c => c.id === id)?.name || 'Unknown';
  };

  return (
    <div>
      <h1>Fixed Expenses</h1>

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
          placeholder="Title (e.g. Netflix)"
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
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Day of month"
          value={form.dayOfMonth}
          onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
        />
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button type="submit">Add fixed expense</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Title</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>Day {exp.dayOfMonth}</td>
              <td>{exp.title}</td>
              <td>{getCategoryName(exp.categoryId)}</td>
              <td>{exp.amount}€</td>
              <td><button onClick={() => deleteExpense(exp.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FixedExpenses;
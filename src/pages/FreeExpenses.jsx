import { useState, useEffect } from 'react';
import db from '../db/database';

function FreeExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allExpenses, allCategories] = await Promise.all([
      db.freeExpenses.toArray(),
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

    await db.freeExpenses.add({
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      createdAt: new Date().toISOString()
    });

    setForm({
      amount: '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: categories[0]?.id || ''
    });
    loadData();
  };

  const deleteExpense = async (id) => {
    await db.freeExpenses.delete(id);
    loadData();
  };

  const getCategoryName = (id) => {
    return categories.find(c => c.id === id)?.name || 'Unknown';
  };

  return (
    <div>
      <h1>Free Expenses</h1>

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
          placeholder="Title"
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
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button type="submit">Add expense</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.date}</td>
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

export default FreeExpenses;
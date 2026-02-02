import { useState, useEffect } from 'react';
import db from '../db/database';

function Forecasts() {
  const [forecasts, setForecasts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    deductFrom: 'monthly' // 'monthly' or 'weekly'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allForecasts, allCategories] = await Promise.all([
      db.forecasts.toArray(),
      db.categories.toArray()
    ]);
    setForecasts(allForecasts);
    setCategories(allCategories);
    if (allCategories.length > 0 && !form.categoryId) {
      setForm(f => ({ ...f, categoryId: allCategories[0].id }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;

    await db.forecasts.add({
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    setForm({
      amount: '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: categories[0]?.id || '',
      deductFrom: 'monthly'
    });
    loadData();
  };

  const deleteForecast = async (id) => {
    await db.forecasts.delete(id);
    loadData();
  };

  const markAsCompleted = async (id, forecast) => {
    await db.forecasts.update(id, { 
      ...forecast, 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    loadData();
  };

  const getCategoryName = (id) => {
    return categories.find(c => c.id === id)?.name || 'Unknown';
  };

  return (
    <div>
      <h1>Forecasts</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          step="0.01"
          placeholder="Estimated amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Title (e.g. Haircut)"
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
        <select
          value={form.deductFrom}
          onChange={(e) => setForm({ ...form, deductFrom: e.target.value })}
        >
          <option value="monthly">Deduct from monthly budget</option>
          <option value="weekly">Deduct from weekly budget</option>
        </select>
        <button type="submit">Add forecast</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Deduct from</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map(f => (
            <tr key={f.id}>
              <td>{f.date}</td>
              <td>{f.title}</td>
              <td>{getCategoryName(f.categoryId)}</td>
              <td>{f.amount}€</td>
              <td>{f.deductFrom}</td>
              <td>{f.status}</td>
              <td>
                {f.status === 'pending' && (
                  <button onClick={() => markAsCompleted(f.id, f)}>Mark done</button>
                )}
                <button onClick={() => deleteForecast(f.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Forecasts;
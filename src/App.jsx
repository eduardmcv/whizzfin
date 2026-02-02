import { useState, useEffect } from 'react';
import db from './db/database';
import Modal from './components/Modal';

function App() {
  // Data state
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [freeExpenses, setFreeExpenses] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [savings, setSavings] = useState([]);

  // UI state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modal, setModal] = useState({ type: null, data: null });
  const [selectedDay, setSelectedDay] = useState(null);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, [currentDate]);

  const loadAllData = async () => {
    const [set, cats, free, fixed, fore, inc, sav] = await Promise.all([
      db.settings.get(1),
      db.categories.toArray(),
      db.freeExpenses.toArray(),
      db.fixedExpenses.toArray(),
      db.forecasts.toArray(),
      db.incomes.toArray(),
      db.savings.toArray()
    ]);
    setSettings(set);
    setCategories(cats);
    setFreeExpenses(free);
    setFixedExpenses(fixed);
    setForecasts(fore);
    setIncomes(inc);
    setSavings(sav);
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const events = [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Fixed expenses
    fixedExpenses.filter(e => e.dayOfMonth === day && e.active !== false).forEach(e => {
      events.push({ type: 'fixed', ...e });
    });

    // Forecasts
    forecasts.filter(f => f.date === dateStr).forEach(f => {
      events.push({ type: 'forecast', ...f });
    });

    // Free expenses
    freeExpenses.filter(e => e.date === dateStr).forEach(e => {
      events.push({ type: 'free', ...e });
    });

    // Incomes
    incomes.filter(i => i.isRecurring ? i.dayOfMonth === day : i.date === dateStr).forEach(i => {
      events.push({ type: 'income', ...i });
    });

    // Savings
    savings.filter(s => s.month === month && s.year === year && s.day === day).forEach(s => {
      events.push({ type: 'savings', ...s });
    });

    return events;
  };

  // Calculate dashboard values
  const calculateDashboard = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalFixed = fixedExpenses.filter(e => e.active !== false).reduce((sum, e) => sum + e.amount, 0);
    const totalForecasts = forecasts.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
    
    const thisMonthFree = freeExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalFreeExpenses = thisMonthFree.reduce((sum, e) => sum + e.amount, 0);

    const thisMonthSavings = savings.filter(s => s.month === currentMonth && s.year === currentYear);
    const totalSavings = thisMonthSavings.reduce((sum, s) => sum + s.amount, 0);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklySpent = freeExpenses
      .filter(e => new Date(e.date) >= weekAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    const weeklyBudget = settings?.weeklyBudget || 0;
    const weeklyRemaining = weeklyBudget - weeklySpent;
    const monthlyAvailable = totalIncome - totalFixed - totalForecasts - totalSavings;

    return { totalIncome, totalFixed, totalForecasts, totalFreeExpenses, totalSavings, weeklySpent, weeklyBudget, weeklyRemaining, monthlyAvailable };
  };

  const dashboard = calculateDashboard();

  // Day click handler
  const handleDayClick = (day) => {
    setSelectedDay(day);
    setModal({ type: 'dayActions', data: { day } });
  };

  // Close modal and reload data
  const closeModal = () => {
    setModal({ type: null, data: null });
    setSelectedDay(null);
    loadAllData();
  };

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  const eventColors = {
    fixed: '#ff6b6b',
    forecast: '#feca57',
    free: '#54a0ff',
    income: '#5f27cd',
    savings: '#10ac84'
  };

  // Styles
  const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto' };
  const dashboardGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' };
  const cardStyle = { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' };
  const cellStyle = { border: '1px solid #ddd', minHeight: '80px', padding: '5px', verticalAlign: 'top', fontSize: '11px', cursor: 'pointer' };
  const eventStyle = (type) => ({ backgroundColor: eventColors[type], color: type === 'income' || type === 'savings' ? '#fff' : '#000', padding: '2px 4px', borderRadius: '3px', marginBottom: '2px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
  const actionButtonsStyle = { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' };
  const btnStyle = { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      <h1>Whizzfin</h1>

      {/* Dashboard Cards */}
      <div style={dashboardGrid}>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>Weekly Budget</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: dashboard.weeklyRemaining >= 0 ? '#10ac84' : '#ee5253' }}>
            {dashboard.weeklyRemaining.toFixed(2)}€
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>of {dashboard.weeklyBudget}€</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>Monthly Income</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboard.totalIncome.toFixed(2)}€</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>Fixed Expenses</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b' }}>{dashboard.totalFixed.toFixed(2)}€</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>Forecasts</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#feca57' }}>{dashboard.totalForecasts.toFixed(2)}€</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>Savings</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10ac84' }}>{dashboard.totalSavings.toFixed(2)}€</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>Available</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboard.monthlyAvailable.toFixed(2)}€</div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
        <button onClick={prevMonth}>&lt;</button>
        <h2 style={{ margin: 0 }}>{monthNames[month]} {year}</h2>
        <button onClick={nextMonth}>&gt;</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '10px', fontSize: '12px', flexWrap: 'wrap' }}>
        <span><span style={{ ...eventStyle('fixed'), display: 'inline-block' }}>■</span> Fixed</span>
        <span><span style={{ ...eventStyle('forecast'), display: 'inline-block' }}>■</span> Forecast</span>
        <span><span style={{ ...eventStyle('free'), display: 'inline-block' }}>■</span> Free</span>
        <span><span style={{ ...eventStyle('income'), display: 'inline-block' }}>■</span> Income</span>
        <span><span style={{ ...eventStyle('savings'), display: 'inline-block' }}>■</span> Savings</span>
      </div>

      {/* Calendar Grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <th key={d} style={{ padding: '8px', backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, wi) => (
            <tr key={wi}>
              {calendarDays.slice(wi * 7, (wi + 1) * 7).map((day, di) => (
                <td key={di} style={{ ...cellStyle, backgroundColor: day === selectedDay ? '#e3f2fd' : '#fff' }} onClick={() => day && handleDayClick(day)}>
                  {day && (
                    <>
                      <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{day}</div>
                      {getEventsForDay(day).slice(0, 3).map((e, i) => (
                        <div key={i} style={eventStyle(e.type)}>
                          {e.type === 'income' || e.type === 'savings' ? '+' : '-'}{e.amount}€
                        </div>
                      ))}
                      {getEventsForDay(day).length > 3 && <div style={{ fontSize: '10px', color: '#999' }}>+{getEventsForDay(day).length - 3} more</div>}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Action Buttons */}
      <div style={actionButtonsStyle}>
        <button style={{ ...btnStyle, backgroundColor: '#54a0ff', color: '#fff' }} onClick={() => setModal({ type: 'freeExpense' })}>+ Free Expense</button>
        <button style={{ ...btnStyle, backgroundColor: '#ff6b6b', color: '#fff' }} onClick={() => setModal({ type: 'fixedExpense' })}>+ Fixed Expense</button>
        <button style={{ ...btnStyle, backgroundColor: '#feca57' }} onClick={() => setModal({ type: 'forecast' })}>+ Forecast</button>
        <button style={{ ...btnStyle, backgroundColor: '#5f27cd', color: '#fff' }} onClick={() => setModal({ type: 'income' })}>+ Income</button>
        <button style={{ ...btnStyle, backgroundColor: '#10ac84', color: '#fff' }} onClick={() => setModal({ type: 'savings' })}>+ Savings</button>
        <button style={{ ...btnStyle, backgroundColor: '#576574', color: '#fff' }} onClick={() => setModal({ type: 'categories' })}>Categories</button>
        <button style={{ ...btnStyle, backgroundColor: '#222f3e', color: '#fff' }} onClick={() => setModal({ type: 'settings' })}>Settings</button>
      </div>

      {/* MODALS */}
      
      {/* Day Actions Modal */}
      <Modal isOpen={modal.type === 'dayActions'} onClose={closeModal} title={`${monthNames[month]} ${modal.data?.day}, ${year}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button style={{ ...btnStyle, backgroundColor: '#54a0ff', color: '#fff' }} onClick={() => setModal({ type: 'freeExpense', data: { day: modal.data?.day } })}>Add Free Expense</button>
          <button style={{ ...btnStyle, backgroundColor: '#feca57' }} onClick={() => setModal({ type: 'forecast', data: { day: modal.data?.day } })}>Add Forecast</button>
          <button style={{ ...btnStyle, backgroundColor: '#10ac84', color: '#fff' }} onClick={() => setModal({ type: 'savings', data: { day: modal.data?.day } })}>Add Savings</button>
          <hr />
          <h4>Events on this day:</h4>
          {modal.data?.day && getEventsForDay(modal.data.day).map((e, i) => (
            <div key={i} style={{ ...eventStyle(e.type), padding: '10px' }}>
              <strong>{e.title || e.type}</strong>: {e.type === 'income' || e.type === 'savings' ? '+' : '-'}{e.amount}€
            </div>
          ))}
          {modal.data?.day && getEventsForDay(modal.data.day).length === 0 && <p>No events</p>}
        </div>
      </Modal>

      {/* Free Expense Modal */}
      <Modal isOpen={modal.type === 'freeExpense'} onClose={closeModal} title="Add Free Expense">
        <FreeExpenseForm categories={categories} defaultDay={modal.data?.day} year={year} month={month} onSave={closeModal} />
      </Modal>

      {/* Fixed Expense Modal */}
      <Modal isOpen={modal.type === 'fixedExpense'} onClose={closeModal} title="Add Fixed Expense">
        <FixedExpenseForm categories={categories} onSave={closeModal} />
      </Modal>

      {/* Forecast Modal */}
      <Modal isOpen={modal.type === 'forecast'} onClose={closeModal} title="Add Forecast">
        <ForecastForm categories={categories} defaultDay={modal.data?.day} year={year} month={month} onSave={closeModal} />
      </Modal>

      {/* Income Modal */}
      <Modal isOpen={modal.type === 'income'} onClose={closeModal} title="Add Income">
        <IncomeForm onSave={closeModal} />
      </Modal>

      {/* Savings Modal */}
      <Modal isOpen={modal.type === 'savings'} onClose={closeModal} title="Add Savings">
        <SavingsForm defaultDay={modal.data?.day} year={year} month={month} onSave={closeModal} />
      </Modal>

      {/* Categories Modal */}
      <Modal isOpen={modal.type === 'categories'} onClose={closeModal} title="Manage Categories">
        <CategoriesForm categories={categories} onSave={closeModal} />
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={modal.type === 'settings'} onClose={closeModal} title="Settings">
        <SettingsForm settings={settings} onSave={closeModal} />
      </Modal>
    </div>
  );
}

// FORM COMPONENTS

function FreeExpenseForm({ categories, defaultDay, year, month, onSave }) {
  const defaultDate = defaultDay 
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(defaultDay).padStart(2, '0')}`
    : new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    date: defaultDate,
    categoryId: categories[0]?.id || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;
    await db.freeExpenses.add({
      ...form,
      amount: Number(form.amount),
      categoryId: Number(form.categoryId),
      createdAt: new Date().toISOString()
    });
    onSave();
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSubmit}>
      <input type="number" step="0.01" placeholder="Amount (€)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
      <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={inputStyle}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#54a0ff', color: '#fff', border: 'none', borderRadius: '5px' }}>Add Expense</button>
    </form>
  );
}

function FixedExpenseForm({ categories, onSave }) {
  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    dayOfMonth: 1,
    categoryId: categories[0]?.id || ''
  });

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
    onSave();
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSubmit}>
      <input type="number" step="0.01" placeholder="Amount (€)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Title (e.g. Netflix)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
      <input type="number" min="1" max="31" placeholder="Day of month" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} style={inputStyle} />
      <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={inputStyle}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '5px' }}>Add Fixed Expense</button>
    </form>
  );
}

function ForecastForm({ categories, defaultDay, year, month, onSave }) {
  const defaultDate = defaultDay
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(defaultDay).padStart(2, '0')}`
    : new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    date: defaultDate,
    categoryId: categories[0]?.id || '',
    deductFrom: 'monthly'
  });

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
    onSave();
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSubmit}>
      <input type="number" step="0.01" placeholder="Estimated amount (€)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Title (e.g. Haircut)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
      <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={inputStyle}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={form.deductFrom} onChange={(e) => setForm({ ...form, deductFrom: e.target.value })} style={inputStyle}>
        <option value="monthly">Deduct from monthly budget</option>
        <option value="weekly">Deduct from weekly budget</option>
      </select>
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#feca57', color: '#000', border: 'none', borderRadius: '5px' }}>Add Forecast</button>
    </form>
  );
}

function IncomeForm({ onSave }) {
  const [form, setForm] = useState({
    amount: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    dayOfMonth: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.title) return;
    await db.incomes.add({
      ...form,
      amount: Number(form.amount),
      dayOfMonth: Number(form.dayOfMonth),
      createdAt: new Date().toISOString()
    });
    onSave();
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSubmit}>
      <input type="number" step="0.01" placeholder="Amount (€)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Title (e.g. Salary)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
      <label style={{ display: 'block', marginBottom: '10px' }}>
        <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} /> Recurring monthly
      </label>
      {form.isRecurring ? (
        <input type="number" min="1" max="31" placeholder="Day of month" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} style={inputStyle} />
      ) : (
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
      )}
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#5f27cd', color: '#fff', border: 'none', borderRadius: '5px' }}>Add Income</button>
    </form>
  );
}

function SavingsForm({ defaultDay, year, month, onSave }) {
  const [form, setForm] = useState({
    amount: '',
    description: '',
    day: defaultDay || new Date().getDate()
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;
    await db.savings.add({
      amount: Number(form.amount),
      description: form.description,
      day: Number(form.day),
      month: month,
      year: year,
      createdAt: new Date().toISOString()
    });
    onSave();
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSubmit}>
      <input type="number" step="0.01" placeholder="Amount (€)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} required />
      <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
      <input type="number" min="1" max="31" placeholder="Day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} style={inputStyle} />
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#10ac84', color: '#fff', border: 'none', borderRadius: '5px' }}>Add Savings</button>
    </form>
  );
}

function CategoriesForm({ categories, onSave }) {
  const [newName, setNewName] = useState('');

  const addCategory = async () => {
    if (!newName.trim()) return;
    await db.categories.add({ name: newName });
    setNewName('');
    onSave();
  };

  const deleteCategory = async (id) => {
    await db.categories.delete(id);
    onSave();
  };

  const inputStyle = { padding: '8px', marginRight: '10px' };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <input type="text" placeholder="New category name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
        <button onClick={addCategory}>Add</button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {categories.map(c => (
          <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            {c.name}
            <button onClick={() => deleteCategory(c.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsForm({ settings, onSave }) {
  const [form, setForm] = useState({
    weeklyBudget: settings?.weeklyBudget || 0,
    weekStartDay: settings?.weekStartDay || 1,
    monthlySavingsTarget: settings?.monthlySavingsTarget || 0,
    overflowStrategy: settings?.overflowStrategy || 'next_week',
    surplusStrategy: settings?.surplusStrategy || 'savings'
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    await db.settings.put({ id: 1, ...form });
    onSave();
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSubmit}>
      <label>Weekly budget (€)</label>
      <input type="number" value={form.weeklyBudget} onChange={(e) => setForm({ ...form, weeklyBudget: Number(e.target.value) })} style={inputStyle} />
      
      <label>Week starts on</label>
      <select value={form.weekStartDay} onChange={(e) => setForm({ ...form, weekStartDay: Number(e.target.value) })} style={inputStyle}>
        {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
      </select>

      <label>Monthly savings target (€)</label>
      <input type="number" value={form.monthlySavingsTarget} onChange={(e) => setForm({ ...form, monthlySavingsTarget: Number(e.target.value) })} style={inputStyle} />

      <label>When you exceed weekly budget</label>
      <select value={form.overflowStrategy} onChange={(e) => setForm({ ...form, overflowStrategy: e.target.value })} style={inputStyle}>
        <option value="next_week">Deduct from next week</option>
        <option value="proportional">Deduct proportionally</option>
        <option value="next_month">Deduct from next month</option>
      </select>

      <label>When you have surplus</label>
      <select value={form.surplusStrategy} onChange={(e) => setForm({ ...form, surplusStrategy: e.target.value })} style={inputStyle}>
        <option value="savings">Add to savings</option>
        <option value="next_week">Add to next week</option>
        <option value="distribute">Distribute across weeks</option>
      </select>

      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#222f3e', color: '#fff', border: 'none', borderRadius: '5px', marginTop: '10px' }}>Save Settings</button>
    </form>
  );
}

export default App;
import { useState, useEffect } from 'react';
import db from '../db/database';

function Settings() {
  const [settings, setSettings] = useState({
    weeklyBudget: 0,
    weekStartDay: 1,
    monthlySavingsTarget: 0,
    savingsDay: 1,
    overflowStrategy: 'next_week',
    surplusStrategy: 'savings'
  });

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ];

  const overflowOptions = [
    { value: 'next_week', label: 'Deduct from next week' },
    { value: 'proportional', label: 'Deduct proportionally from remaining weeks' },
    { value: 'next_month', label: 'Deduct from next month' }
  ];

  const surplusOptions = [
    { value: 'savings', label: 'Add to savings' },
    { value: 'next_week', label: 'Add to next week budget' },
    { value: 'distribute', label: 'Distribute across remaining weeks' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const saved = await db.settings.get(1);
    if (saved) {
      setSettings(s => ({ ...s, ...saved }));
    }
  };

  const saveSettings = async () => {
    await db.settings.put({ id: 1, ...settings });
    alert('Settings saved!');
  };

  const handleChange = (field, value) => {
    setSettings(s => ({ ...s, [field]: value }));
  };

  return (
    <div>
      <h1>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
        <div>
          <label>Weekly budget (€)</label>
          <input
            type="number"
            value={settings.weeklyBudget}
            onChange={(e) => handleChange('weeklyBudget', Number(e.target.value))}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Week starts on</label>
          <select
            value={settings.weekStartDay}
            onChange={(e) => handleChange('weekStartDay', Number(e.target.value))}
            style={{ width: '100%', padding: '8px' }}
          >
            {dayNames.map((day, index) => (
              <option key={index} value={index}>{day}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Monthly savings target (€)</label>
          <input
            type="number"
            value={settings.monthlySavingsTarget}
            onChange={(e) => handleChange('monthlySavingsTarget', Number(e.target.value))}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Day of month for savings (1-31)</label>
          <input
            type="number"
            min="1"
            max="31"
            value={settings.savingsDay}
            onChange={(e) => handleChange('savingsDay', Number(e.target.value))}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>When you exceed weekly budget</label>
          <select
            value={settings.overflowStrategy}
            onChange={(e) => handleChange('overflowStrategy', e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            {overflowOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label>When you have surplus at end of week</label>
          <select
            value={settings.surplusStrategy}
            onChange={(e) => handleChange('surplusStrategy', e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            {surplusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={saveSettings}
          style={{ padding: '10px 20px', marginTop: '10px' }}
        >
          Save settings
        </button>
      </div>
    </div>
  );
}

export default Settings;
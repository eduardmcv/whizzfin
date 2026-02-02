import { useState, useEffect } from 'react';
import db from '../db/database';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    const [fixedExpenses, forecasts, incomes, cats] = await Promise.all([
      db.fixedExpenses.toArray(),
      db.forecasts.toArray(),
      db.incomes.toArray(),
      db.categories.toArray()
    ]);

    setCategories(cats);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const allEvents = [];

    // Add fixed expenses (by day of month)
    fixedExpenses.forEach(exp => {
      if (exp.active !== false) {
        allEvents.push({
          day: exp.dayOfMonth,
          type: 'fixed',
          title: exp.title,
          amount: exp.amount,
          categoryId: exp.categoryId
        });
      }
    });

    // Add forecasts (by specific date)
    forecasts.forEach(f => {
      const date = new Date(f.date);
      if (date.getMonth() === month && date.getFullYear() === year) {
        allEvents.push({
          day: date.getDate(),
          type: 'forecast',
          title: f.title,
          amount: f.amount,
          categoryId: f.categoryId,
          status: f.status
        });
      }
    });

    // Add incomes
    incomes.forEach(inc => {
      if (inc.isRecurring) {
        allEvents.push({
          day: inc.dayOfMonth,
          type: 'income',
          title: inc.title,
          amount: inc.amount
        });
      } else {
        const date = new Date(inc.date);
        if (date.getMonth() === month && date.getFullYear() === year) {
          allEvents.push({
            day: date.getDate(),
            type: 'income',
            title: inc.title,
            amount: inc.amount
          });
        }
      }
    });

    setEvents(allEvents);
  };

  const getCategoryName = (id) => {
    return categories.find(c => c.id === id)?.name || '';
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (day) => {
    return events.filter(e => e.day === day);
  };

  // Build calendar grid
  const calendarDays = [];
  
  // Empty cells before first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const eventColors = {
    fixed: '#ff6b6b',
    forecast: '#feca57',
    income: '#5f27cd'
  };

  const cellStyle = {
    border: '1px solid #ddd',
    minHeight: '100px',
    padding: '5px',
    verticalAlign: 'top',
    fontSize: '12px'
  };

  const eventStyle = (type) => ({
    backgroundColor: eventColors[type],
    color: type === 'income' ? '#fff' : '#000',
    padding: '2px 5px',
    borderRadius: '3px',
    marginBottom: '2px',
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  });

  return (
    <div>
      <h1>Calendar</h1>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
        <button onClick={prevMonth}>&lt; Prev</button>
        <h2 style={{ margin: 0 }}>{monthNames[month]} {year}</h2>
        <button onClick={nextMonth}>Next &gt;</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
        <span><span style={{ ...eventStyle('fixed'), display: 'inline-block' }}>■</span> Fixed expense</span>
        <span><span style={{ ...eventStyle('forecast'), display: 'inline-block' }}>■</span> Forecast</span>
        <span><span style={{ ...eventStyle('income'), display: 'inline-block' }}>■</span> Income</span>
      </div>

      {/* Calendar grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <th key={day} style={{ padding: '10px', backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
            <tr key={weekIndex}>
              {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                <td key={dayIndex} style={cellStyle}>
                  {day && (
                    <>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{day}</div>
                      {getEventsForDay(day).map((event, i) => (
                        <div key={i} style={eventStyle(event.type)} title={`${event.title}: ${event.amount}€`}>
                          {event.type === 'income' ? '+' : '-'}{event.amount}€ {event.title}
                        </div>
                      ))}
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Calendar;
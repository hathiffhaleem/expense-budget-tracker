import { createContext, useContext, useState } from 'react';

const DatePeriodContext = createContext(null);

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodDateRange(period) {
  if (period === 'all') return {};

  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end;

  if (period === 'day') {
    end = new Date(start);
  } else if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  }

  return { startDate: dateInputValue(start), endDate: dateInputValue(end) };
}

export function DatePeriodProvider({ children }) {
  const [period, setPeriod] = useState('all');
  return (
    <DatePeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </DatePeriodContext.Provider>
  );
}

export default function useDatePeriod() {
  const context = useContext(DatePeriodContext);
  if (!context) throw new Error('useDatePeriod must be used within DatePeriodProvider');
  return context;
}

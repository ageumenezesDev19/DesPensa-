import React, { useState, useMemo, useEffect, useCallback } from "react";
import "../styles/WithdrawnTable.scss";

export interface Retirado {
  Código: string;
  Descrição: string;
  "Quantidade Retirada": string;
  "Preço Venda": string;
  Data: string;
}

interface Props {
  produtos: Retirado[];
}

const WithdrawnTable: React.FC<Props> = ({ produtos }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<{ [month: string]: Set<string> }>({});

  const withdrawnByDay = useMemo(() => {
    const groups: { [key: string]: Retirado[] } = {};
    produtos.forEach((p) => {
      const date = new Date(p.Data.split(" ")[0]);
      const dateString = date.toISOString().split("T")[0];
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(p);
    });
    return groups;
  }, [produtos]);

  const handleDateChange = useCallback((days: number) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  }, []);

  const toggleMonth = useCallback((month: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  }, []);

  const toggleDay = useCallback((month: string, day: string) => {
    setExpandedDays(prev => {
      const monthDays = new Set(prev[month]);
      if (monthDays.has(day)) {
        monthDays.delete(day);
      } else {
        monthDays.add(day);
      }
      return { ...prev, [month]: monthDays };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleDateChange(-1);
      } else if (e.key === 'ArrowRight') {
        handleDateChange(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDateChange]);

  const selectedDateString = selectedDate.toISOString().split("T")[0];
  const productsForSelectedDay = withdrawnByDay[selectedDateString] || [];
  const totalForSelectedDay = productsForSelectedDay.reduce(
    (acc, p) => acc + Number(p["Preço Venda"]) * Number(p["Quantidade Retirada"]),
    0
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const withdrawnByMonth = useMemo(() => {
    const groups: { [key: string]: { [key: string]: Retirado[] } } = {};
    Object.keys(withdrawnByDay).forEach((dateString) => {
      const date = new Date(dateString);
      const month = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!groups[month]) {
        groups[month] = {};
      }
      groups[month][dateString] = withdrawnByDay[dateString];
    });
    return groups;
  }, [withdrawnByDay]);

  const sortedMonths = Object.keys(withdrawnByMonth).sort((a, b) => {
    const [monthA, yearA] = a.split(' de ');
    const [monthB, yearB] = b.split(' de ');
    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="withdrawn-table-container animated-fadein">
      <div className="date-navigator">
        <button onClick={() => handleDateChange(-1)}>{"< Dia Anterior"}</button>
        <h2>{formatDate(selectedDate)}</h2>
        <button onClick={() => handleDateChange(1)}>{"Próximo Dia >"}</button>
      </div>

      <div className="day-summary">
        <h3>Total do Dia: R$ {totalForSelectedDay.toFixed(2)}</h3>
      </div>

      {productsForSelectedDay.length > 0 ? (
        <div className="withdrawn-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Qtd.</th>
                <th>Preço</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {productsForSelectedDay.map((p, i) => (
                <tr key={i}>
                  <td>{p.Código}</td>
                  <td>{p.Descrição}</td>
                  <td>{p["Quantidade Retirada"]}</td>
                  <td>R$ {Number(p["Preço Venda"]).toFixed(2)}</td>
                  <td>{new Date(p.Data).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data">Nenhum produto retirado neste dia.</p>
      )}

      <div className="monthly-summary">
        <h2>Histórico de Retiradas</h2>
        {sortedMonths.map(month => {
          const monthlyTotal = Object.values(withdrawnByMonth[month]).flat().reduce((acc, p) => acc + (Number(p["Preço Venda"]) * Number(p["Quantidade Retirada"])), 0);

          return (
            <div key={month} className="month-section">
              <h3 onClick={() => toggleMonth(month)} className="month-header">
                <span>{month.charAt(0).toUpperCase() + month.slice(1)} - Total: R$ {monthlyTotal.toFixed(2)}</span>
                <span className={`toggle-icon ${expandedMonths.has(month) ? 'expanded' : ''}`}></span>
              </h3>
              {expandedMonths.has(month) && (
                <div className="month-content">
                  {Object.keys(withdrawnByMonth[month]).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateString => (
                    <div key={dateString} className="day-details">
                      <h4 onClick={() => toggleDay(month, dateString)} className="day-header">
                        {formatDate(new Date(dateString))} - Total: R$ {withdrawnByMonth[month][dateString].reduce((acc, p) => acc + (Number(p["Preço Venda"]) * Number(p["Quantidade Retirada"])), 0).toFixed(2)}
                        <span className={`toggle-icon ${expandedDays[month]?.has(dateString) ? 'expanded' : ''}`}></span>
                      </h4>
                      {expandedDays[month]?.has(dateString) && (
                        <ul>
                          {withdrawnByMonth[month][dateString].map((p, i) => (
                            <li key={i}>{p.Descrição} ({p["Quantidade Retirada"]}x) - R$ {Number(p["Preço Venda"]).toFixed(2)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        )}
      </div>
    </div>
  );
};

export default WithdrawnTable;

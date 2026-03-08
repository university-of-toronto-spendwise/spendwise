import React, {useState, useEffect} from "react"
import Navbar from "./Navbar";
 


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@300;400;500;600;700;800&display=swap');

  :root {
    --uoft-blue: #002A5C;
    --uoft-mid: #0047A0;
    --uoft-accent: #E8B53E;
    --off-white: #F4F7FB;
    --text-muted: #6B7A90;
    --border: #D0DBE8;
    --white: #FFFFFF;
    --danger: #C0392B;
    --success: #18A574;
  }

  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Source Sans 3', sans-serif; }

  .tx-page {
    min-height: 100vh;
    background: var(--off-white);
  }

  .left-box {
  position: fixed;
  left: 20px;
  top: 150px;
  width: 220px;
  background: white;
  border: 1.5px solid #D0DBE8;
  border-radius: 12px;
  padding: 12px;
  font-size: 0.9rem;
  color: #002A5C;
}

  .tx-body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .tx-header {
    margin-bottom: 1rem;
  }

  .tx-title {
    font-size: 1.9rem;
    font-weight: 800;
    color: var(--uoft-blue);
    margin: 0 0 0.25rem;
  }

  .tx-subtitle {
    color: var(--text-muted);
    margin: 0;
    font-size: 0.95rem;
  }

  .tx-summary {
    background: linear-gradient(130deg, var(--uoft-blue), var(--uoft-mid));
    color: white;
    border-radius: 16px;
    padding: 1rem 1.25rem;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 1rem 0 1rem;
  }

  .tx-summary-item p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.82rem;
  }

  .tx-summary-item h3 {
    margin: 0.2rem 0 0;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .tx-link-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 0.95rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.9rem;
    flex-wrap: wrap;
  }

  .tx-link-left h4 {
    margin: 0;
    color: var(--uoft-blue);
    font-size: 1rem;
    font-weight: 800;
  }

  .tx-link-left p {
    margin: 0.22rem 0 0;
    color: var(--text-muted);
    font-size: 0.88rem;
  }

  .tx-link-actions {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .tx-link-btn {
    border: 1.5px solid var(--border);
    background: #fff;
    color: var(--uoft-blue);
    height: 38px;
    border-radius: 10px;
    padding: 0 0.75rem;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }

  .tx-link-btn.primary {
    background: var(--uoft-blue);
    border-color: var(--uoft-blue);
    color: #fff;
  }

  .tx-bank-list {
    width: 100%;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    background: #F8FAFE;
    padding: 0.65rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.2rem;
  }

  .tx-bank-item {
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: #fff;
    color: var(--uoft-blue);
    height: 38px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0 0.65rem;
    text-align: left;
  }

  .tx-linked-list {
    width: 100%;
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }

  .tx-linked-pill {
    border-radius: 999px;
    border: 1.5px solid var(--border);
    background: #F7FAFF;
    color: var(--uoft-blue);
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.28rem 0.6rem;
  }

  .tx-controls {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 0.9rem;
    display: grid;
    grid-template-columns: 1.2fr repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
    margin-bottom: 1rem;
  }

  .tx-input,
  .tx-select {
    height: 40px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    padding: 0 0.75rem;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.9rem;
    color: var(--uoft-blue);
    background: white;
    outline: none;
  }

  .tx-input:focus,
  .tx-select:focus {
    border-color: var(--uoft-mid);
  }

  .tx-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }

  .tx-table {
    width: 100%;
    border-collapse: collapse;
  }

  .tx-table th,
  .tx-table td {
    text-align: left;
    padding: 0.82rem 1rem;
    border-bottom: 1px solid #E8EEF6;
    font-size: 0.92rem;
  }

  .tx-table th {
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #F8FAFE;
  }

  .tx-table td {
    color: var(--uoft-blue);
    font-weight: 600;
  }

  .tx-amount {
    font-weight: 800;
    white-space: nowrap;
  }

  .tx-amount.out { color: var(--danger); }
  .tx-amount.in { color: var(--success); }

  .tx-empty {
    padding: 1.4rem;
    color: var(--text-muted);
    text-align: center;
    font-size: 0.94rem;
  }

  @media (max-width: 900px) {
    .tx-controls {
      grid-template-columns: 1fr 1fr;
    }
    .tx-summary {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 620px) {
    .tx-body { padding: 1rem; }
    .tx-controls {
      grid-template-columns: 1fr;
    }
    .tx-bank-list {
      grid-template-columns: 1fr;
    }
    .tx-table th:nth-child(4),
    .tx-table td:nth-child(4),
    .tx-table th:nth-child(6),
    .tx-table td:nth-child(6) {
      display: none;
    }
  }
`;


export default function Transactions1() {

    const [transactions, setTransactions] = useState([]);
    const [monthly_saving_amount,  setMonthly_saving_amount] = useState(null);
    const [total_Expenses_Amountt,  setTotal_Expenses_Amount] = useState(null);
    const [monthly_saving_desc,  setMonthly_saving_desc] = useState(null);

    const today = new Date();

    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    const [loading, setLoading] = useState(false);



    // functions
    const fetchTranscactions = async () => {
        try {
        const response = await fetch(`http://localhost:8000/spending/monthly_transactions/?month=${month}&year=${year}`);
        const result = await response.json();
        setTransactions(result);
        } catch (error) {
        console.error(error);
        } finally {
        setLoading(false);
        }
    };

    const fetchMonthlySavingAmount = async () => {
        try {
        const response = await fetch(`http://localhost:8000/spending/monthly_saving_amount/?month=${month}&year=${year}`);
        const result = await response.json();
        setMonthly_saving_amount(result);
        } catch (error) {
        console.error(error);
        } finally {
        setLoading(false);
        }
    };
    
    const fetchTotalExpensesAmount = async () => {
        try {
        const response = await fetch(`http://localhost:8000/spending/total_expenses_amount/?month=${month}&year=${year}`);
        const result = await response.json();
        setTotal_Expenses_Amount(result);
        } catch (error) {
        console.error(error);
        } finally {
        setLoading(false);
        }
    };

    const fetchMonthlySavingDesc = async () => {
        try {
        const response = await fetch(`http://localhost:8000/spending/monthly_saving/?month=${month}&year=${year}`);
        const result = await response.json();
       setMonthly_saving_desc(result);
        } catch (error) {
        console.error(error);
        } finally {
        setLoading(false);
        }
    };

   const fetchAllData = async () => {

    if (!month || !year) {
      alert("Please enter month and year");
      return;
    }

    setLoading(true);

    await fetchTransactions();
    await fetchMonthlySavingAmount();
    await fetchTotalExpensesAmount();
    await fetchMonthlySavingDesc();

    setLoading(false);
  }

    const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
    };

    const formatMoney = (num) => {
    if (!num) return "0";
    return Number(num).toLocaleString();
  };


    return (
        <div className="tx-page">
          <style>{styles}</style>
          <Navbar />

    
          <main className="tx-body">
            <header className="tx-header">
              <h1 className="tx-title">Transactions</h1>
              <p className="tx-subtitle">Track every payment, transfer, and deposit in one place.</p>
            </header>

            <section className="tx-summary">
             <div className="tx-summary-item">
                <p>Total Monthly Expenses</p>
                <h3>${formatMoney(total_Expenses_Amountt)}</h3>
            </div>

            <div className="tx-summary-item">
                <p>Potential Saving</p>
                <h3>${formatMoney(monthly_saving_amount)}</h3>
            </div>
            </section>

            <section className="tx-spending">

                <div className="left-box">

                    <p><strong>Monthly Tips</strong></p>

                    {monthly_saving_desc && monthly_saving_desc.map((t) => (

                    <div key={t.name}>

                        <p>
                        You spent ${t.total} on {t.name}.
                        </p>

                        <p>
                        You could save about ${t.per_saving} this month by reducing this expense.
                        </p>

                    </div>

                    ))}

                </div>

            </section>
    
            <section className="tx-controls">
              <input
                className="tx-input"
                type = "number"
                placeholder="Month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />

               <input
                className="tx-input"
                type = "number"
                placeholder="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />

               <button className="tx-link-btn primary" onClick={fetchAllData}>
               Load Data
                </button>

              <select className="tx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select className="tx-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
              <select className="tx-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Newest">Newest first</option>
                <option value="Oldest">Oldest first</option>
                <option value="Highest">Highest amount</option>
                <option value="Lowest">Lowest amount</option>
              </select>
            </section>
    
            <section className="tx-card">
              {visible.length === 0 ? (
                <div className="tx-empty">No transactions match your filters.</div>
              ) : (
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDate(t.date)}</td>
                        <td>{t.name}</td>
                        <td>{t.category}</td>
                        <td className={`tx-amount ${t.amount >= 0 ? "in" : "out"}`}>
                          {t.amount >= 0 ? "+" : "-"}${formatMoney(Math.abs(t.amount))}
                        </td>
                        <td>{t.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </main>
        </div>
      );
    }
    
    // props are used for to take warning and u you can pass in header function and make the title for ir





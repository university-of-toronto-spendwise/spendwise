import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, beforeEach } from 'vitest';
import Home from '../Home';

vi.mock('../Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('react-plaid-link', () => ({
  usePlaidLink: () => ({
    open: vi.fn(),
    ready: true,
  }),
}));

const jsonResponse = (data, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

const makeHomeFetchMock = ({ totalExpenses = 200, previousExpenses = 100 } = {}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevDate = new Date(currentYear, now.getMonth() - 1, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  return vi.fn((url) => {
    const u = new URL(String(url), 'http://localhost');
    const path = u.pathname;

    if (path === '/api/plaid/link-token/') return jsonResponse({ link_token: 'test-link-token' });
    if (path === '/api/plaid/items/') return jsonResponse({ items: [] });

    if (path === '/api/plaid/bank-accounts/') {
      return jsonResponse({
        accounts: [
          { account_id: 'a1', official_name: 'Plaid Gold Standard Very Long Name 1', item__institution_name: 'Chase' },
          { account_id: 'a2', official_name: 'Plaid Gold Standard Very Long Name 2', item__institution_name: 'Chase' },
          { account_id: 'a3', official_name: 'Plaid Gold Standard Very Long Name 3', item__institution_name: 'Chase' },
          { account_id: 'a4', official_name: 'Plaid Gold Standard Very Long Name 4', item__institution_name: 'Chase' },
          { account_id: 'a5', official_name: 'Plaid Gold Standard Very Long Name 5', item__institution_name: 'Chase' },
          { account_id: 'a6', official_name: 'Plaid Gold Standard Very Long Name 6', item__institution_name: 'Chase' },
        ],
      });
    }

    if (path === '/api/spending/monthly_transactions/') {
      return jsonResponse([
        {
          merchant_name: 'Uber',
          name: 'Uber Ride',
          amount: '-12.40',
          date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-02`,
          category: 'transport',
          account_id: 'a1',
        },
      ]);
    }

    if (path === '/api/spending/monthly_saving_amount/') return jsonResponse({ total_saving: 20 });

    if (path === '/api/spending/monthly_saving/') {
      return jsonResponse([{ name: 'UBER', total: 120, per_saving: 20 }]);
    }

    if (path === '/api/spending/total_expenses_amount/') {
      const month = Number(u.searchParams.get('month'));
      const year = Number(u.searchParams.get('year'));
      if (month === currentMonth && year === currentYear) return jsonResponse({ total_expenses: totalExpenses });
      if (month === prevMonth && year === prevYear) return jsonResponse({ total_expenses: previousExpenses });
      return jsonResponse({ total_expenses: 0 });
    }

    return jsonResponse({});
  });
};

describe('Home dashboard', () => {
  beforeEach(() => {
    sessionStorage.setItem('userToken', 'test-token');
  });

  // Verifies we only render the "All" tab plus at most 5 bank tabs, and long names get truncated for readability.
  it('caps account tabs to 5 (+ All) and shortens long account names', async () => {
    global.fetch = makeHomeFetchMock();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const tabsContainer = await waitFor(() => {
      const el = document.querySelector('.bank-tabs');
      expect(el).toBeTruthy();
      return el;
    });
    const tabButtons = within(tabsContainer).getAllByRole('button');

    expect(tabButtons).toHaveLength(6);
    expect(tabButtons[0]).toHaveTextContent('All');
    expect(tabButtons.slice(1).some((btn) => btn.textContent.includes('...'))).toBe(true);
  });

  // Verifies the trend pill communicates an increase in spending when current period expenses are higher than previous period.
  it('shows meaningful trend text in monthly spending pill', async () => {
    global.fetch = makeHomeFetchMock({ totalExpenses: 240, previousExpenses: 120 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Up 100% vs last period/i)).toBeInTheDocument();
  });

  // Verifies the trend pill communicates a decrease in spending when current period expenses are lower than previous period.
  it('shows down trend text when spending is lower than previous period', async () => {
    global.fetch = makeHomeFetchMock({ totalExpenses: 90, previousExpenses: 180 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Down 50% vs last period/i)).toBeInTheDocument();
  });

  // Verifies the compact monthly details section renders the expected 4 mini metrics cards.
  it('renders compact monthly spending detail cards', async () => {
    global.fetch = makeHomeFetchMock();

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await screen.findByText(/Monthly Spending Details/i);
    const miniCards = document.querySelectorAll('.mini-grid .mini-card');
    expect(miniCards).toHaveLength(4);
  });
});

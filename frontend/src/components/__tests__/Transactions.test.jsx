import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, beforeEach } from 'vitest';
import Transactions from '../Transactions';

vi.mock('../Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

const jsonResponse = (data, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

const makeTransactionsFetchMock = ({
  accounts = [
    { account_id: 'acc_1', official_name: 'Plaid Gold Standard Checking', item__institution_name: 'Chase' },
  ],
  transactions = [
    {
      merchant_name: 'Whole Foods',
      name: 'Whole Foods',
      amount: '-45.20',
      date: '2026-02-15',
      category: ['Food and Drink', 'Groceries'],
      account_id: 'acc_1',
    },
  ],
} = {}) =>
  vi.fn((url) => {
    const u = new URL(String(url), 'http://localhost');
    const path = u.pathname;

    if (path === '/api/plaid/items/') return jsonResponse({ items: [] });
    if (path === '/api/plaid/bank-accounts/') return jsonResponse({ accounts });
    if (path === '/api/spending/monthly_transactions/') return jsonResponse(transactions);
    if (path === '/api/spending/monthly_saving_amount/') return jsonResponse({ total_saving: 20 });
    if (path === '/api/spending/total_expenses_amount/') return jsonResponse({ total_expenses: 45.2 });
    if (path === '/api/spending/monthly_saving/') return jsonResponse([{ name: 'Whole Foods', total: 45.2, per_saving: 10 }]);

    return jsonResponse({});
  });

describe('Transactions page', () => {
  beforeEach(() => {
    sessionStorage.setItem('userToken', 'test-token');
    global.fetch = makeTransactionsFetchMock();
  });

  // Verifies the Transactions page exposes the same range presets as Dashboard for consistent UX.
  it('shows new date range presets', async () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    expect(await screen.findByRole('option', { name: 'This Month' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Month' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3 Months' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Past Year' })).toBeInTheDocument();
  });

  // Verifies the redundant account selector was removed from the overview controls.
  it('does not render redundant account dropdown in overview controls', async () => {
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    await screen.findByText(/Overview/i);
    expect(screen.queryByRole('option', { name: /All Accounts/i })).not.toBeInTheDocument();
  });

  // Verifies category filtering updates row visibility (Food should keep restaurant rows and hide transport rows).
  it('filters transaction rows by selected category', async () => {
    global.fetch = makeTransactionsFetchMock({
      transactions: [
        {
          merchant_name: 'Tim Hortons',
          name: 'Tim Hortons',
          amount: '-6.50',
          date: '2026-02-15',
          category: 'restaurant',
          account_id: 'acc_1',
        },
        {
          merchant_name: 'Uber',
          name: 'Uber Ride',
          amount: '-18.20',
          date: '2026-02-16',
          category: 'transport',
          account_id: 'acc_1',
        },
      ],
    });

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    await screen.findByText('Tim Hortons');
    await screen.findByText('Uber');

    const selects = document.querySelectorAll('.tx-controls .tx-select');
    const categorySelect = selects[1];
    fireEvent.change(categorySelect, { target: { value: 'Food' } });

    await waitFor(() => {
      expect(screen.getByText('Tim Hortons')).toBeInTheDocument();
      expect(screen.queryByText('Uber')).not.toBeInTheDocument();
    });
  });

  // Verifies account tabs still enforce the "All + max 5" rule and shorten long names.
  it('caps account tabs to 5 plus All and shortens long labels', async () => {
    global.fetch = makeTransactionsFetchMock({
      accounts: [
        { account_id: 'a1', official_name: 'Very Long Account Name Alpha', item__institution_name: 'Chase' },
        { account_id: 'a2', official_name: 'Very Long Account Name Beta', item__institution_name: 'Chase' },
        { account_id: 'a3', official_name: 'Very Long Account Name Gamma', item__institution_name: 'Chase' },
        { account_id: 'a4', official_name: 'Very Long Account Name Delta', item__institution_name: 'Chase' },
        { account_id: 'a5', official_name: 'Very Long Account Name Epsilon', item__institution_name: 'Chase' },
        { account_id: 'a6', official_name: 'Very Long Account Name Zeta', item__institution_name: 'Chase' },
      ],
    });

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    const tabsContainer = await waitFor(() => {
      const el = document.querySelector('.tx-account-tabs');
      expect(el).toBeTruthy();
      return el;
    });

    const tabButtons = await waitFor(() => {
      const buttons = within(tabsContainer).getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
      return buttons;
    });
    expect(tabButtons).toHaveLength(6);
    expect(tabButtons[0]).toHaveTextContent('All');
    expect(tabButtons.slice(1).some((btn) => btn.textContent.includes('...'))).toBe(true);
  });
});

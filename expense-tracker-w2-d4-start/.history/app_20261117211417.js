const transactions = [
  {
    id: 1,
    note: 'Salary',
    category: 'Income',
    type: 'income',
    amountCents: 30000,
  },
  { id: 2, note: 'Lunch', category: 'Food', type: 'expense', amountCents: 450 },
  {
    id: 3,
    note: 'Bus',
    category: 'Transport',
    type: 'expense',
    amountCents: 150,
  },
  {
    id: 4,
    note: 'Notebook',
    category: 'Study',
    type: 'expense',
    amountCents: 300,
  },
];

function formatMoney(cents) {
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + (Math.abs(cents) / 100).toFixed(2);
}

function totalCents(list) {
  return list.reduce((sum, tx) => sum + tx.amountCents, 0);
}

function filterByCategory(list, category) {
  return list.filter((tx) => tx.category === category);
}

function filterByType(list, type) {
  return list.filter((tx) => tx.type === type);
}

function summarize(list) {
  const incomeCents = totalCents(filterByType(list, 'income'));
  const expensesCents = totalCents(filterByType(list, 'expense'));
  return {
    incomeCents: incomeCents,
    expensesCents: expensesCents,
    balanceCents: incomeCents - expensesCents,
  };
}

function addTransaction(list, tx) {
  return [...list, tx];
}

// Practice 2 — the AI's totalExpenses, reviewed and fixed:
// whole cents, no off-by-one loop, no duplicated work.
function totalExpenses(list) {
  return totalCents(filterByType(list, 'expense'));
}

const notes = transactions.map((tx) => tx.note);

console.log(formatMoney(transactions[1].amountCents));

// ----- Checks -----
function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(
    ok ? '✓' : '✗',
    name,
    ok ? '' : `(expected ${expected}, got ${actual})`,
  );
}

check('format 450', formatMoney(450), '$4.50');
check('total of all', totalCents(transactions), 30900);
check('Food count', filterByCategory(transactions, 'Food').length, 1);
check('expense count', filterByType(transactions, 'expense').length, 3);
check('balance', summarize(transactions).balanceCents, 29100);
check(
  'new length',
  addTransaction(transactions, {
    id: 5,
    note: 'Coffee',
    category: 'Food',
    type: 'expense',
    amountCents: 250,
  }).length,
  5,
);
check('notes', notes.join(','), 'Salary,Lunch,Bus,Notebook');
check('total expenses', totalExpenses(transactions), 900);

// Edge cases
check('total of empty list', totalCents([]), 0);
check('total expenses of empty list', totalExpenses([]), 0);
check('original list not changed', transactions.length, 4); // after addTransaction

const lists = document.querySelector('#list-container');
lists.innerHTML = transactions
  .map((ele) => {
    let isExpense = true;
    if (ele.type != 'expense') {
      isExpense = false;
    }
    return `
  <li class="mb-2 flex flex-col gap-1 border-2 border-black bg-white px-4 py-3 sm:flex-row sm:justify-between sm:gap-3">
    <span class="flex-1 font-semibold">${ele.note}</span>
    <span class="text-neutral-600">${ele.category}</span>
    <span class="font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}">${isExpense ? '-' : '+'}${formatMoney(ele.amountCents)}</span>
  </li>
`;
  })
  .join('');
const sum = 
const totalMoney = document.getElementById('total-money').innerText = ;
const incomeMoney = document.getElementById('income-money');
const expenseMoney = document.getElementById('expense-money');

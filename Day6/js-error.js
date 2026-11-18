function totalExpenses(list) {
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].type == 'expense') {
      total += list[i].amountCents / 100;
    }
  }
  return total;
}
const transaction = [
  {
    type: 'expense',
    amountCents: 1000,
    createdAt: '2020-11-02',
  },
  {
    type: 'expense',
    amountCents: 2000,
    createdAt: '2020-11-03',
  },
];
console.log(totalExpenses(test));

function filterByType(list, type) {
  return list.filter((tx) => (tx.type = type));
}

console.log(filterByType(transaction, 'expense'));

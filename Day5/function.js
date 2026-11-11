function converFatoC(fa) {
  return ((fa - 32) * 5) / 9;
}

function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  return sign + "$" + (Math.abs(cents) / 100).toFixed(2);
}

console.log(formatMoney(10));
console.log(0.1 + 0.2 === 0.3)
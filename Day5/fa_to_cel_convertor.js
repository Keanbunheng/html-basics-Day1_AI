function converFatoC(fa) {
  return ((fa - 32) * 5) / 9;
}

const args = process.argv.slice(2);

let fa = args[0];

let celsius = converFatoC(fa);

console.log(celsius);

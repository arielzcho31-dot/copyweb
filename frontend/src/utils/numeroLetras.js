const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirCentena(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let res = centenas[c];
  if (resto > 0) res += ' ' + convertirDecena(resto);
  return res.trim();
}

function convertirDecena(n) {
  if (n === 0) return '';
  if (n < 10) return unidades[n];
  if (n < 20) return especiales[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return decenas[d];
  if (d === 2) return 'VEINTI' + unidades[u];
  return decenas[d] + ' Y ' + unidades[u];
}

export function numeroLetras(n) {
  if (n === 0) return 'CERO';
  let entero = Math.floor(n);
  let decimal = Math.round((n - entero) * 100);

  const millon = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  let res = '';
  if (millon === 1) res += 'UN MILLÓN ';
  else if (millon > 1) res += convertirCentena(millon) + ' MILLONES ';
  if (miles === 1) res += 'MIL ';
  else if (miles > 1) res += convertirCentena(miles) + ' MIL ';
  res += convertirCentena(resto);

  res = res.trim();
  if (decimal > 0) {
    res += ' CON ' + decimal.toString().padStart(2, '0') + '/100';
  }
  return res;
}

export function texto(valor) {
  return String(valor ?? "").trim();
}

export function normalizar(valor) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizarReferencia(valor) {
  return texto(valor).replace(/\s+/g, "").toUpperCase();
}

export function numero(valor, padrao = 0) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;

  const bruto = texto(valor);
  if (!bruto) return padrao;

  const convertido = Number(
    bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto
  );

  return Number.isFinite(convertido) ? convertido : padrao;
}

export function inteiro(valor, padrao = 0) {
  return Math.max(0, Math.floor(numero(valor, padrao)));
}

export function arredondar4(valor) {
  return Math.round((numero(valor) + Number.EPSILON) * 10000) / 10000;
}

export function arredondar2(valor) {
  return Math.round((numero(valor) + Number.EPSILON) * 100) / 100;
}

export function slugSeguro(valor) {
  return normalizar(valor)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "sem-dado";
}

const ALIASES_PROCESSO = Object.freeze({
  BOJO: "ENCAPAR BOJO",
  ENCAPAR: "ENCAPAR BOJO",
  "ENCAPAR BOJOS": "ENCAPAR BOJO",
  ALCA: "ALÇA",
  ALCAS: "ALÇA",
  "ALÇAS": "ALÇA",
  CALCINHA: "CALCINHA COMPLETA",
  "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
  "MONTAR CALCINHA": "CALCINHA MONTAGEM",
  "CALCINHA PRONTA": "CALCINHA COMPLETA",
  "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
  "SUTIA COMPLETO": "SUTIÃ COMPLETO",
  CORTE: "LATERAL"
});

export function processoCanonico(valor) {
  const chave = normalizar(valor);
  return ALIASES_PROCESSO[chave] || texto(valor).toUpperCase();
}

export function normalizarCompetencia(valor) {
  const bruto = texto(valor);
  if (!bruto) return "";

  let ano = "";
  let mes = "";

  let match = bruto.match(/^(\d{4})[-\/]([01]?\d)$/);
  if (match) {
    ano = match[1];
    mes = match[2];
  } else {
    match = bruto.match(/^([01]?\d)[-\/](\d{4})$/);
    if (match) {
      mes = match[1];
      ano = match[2];
    }
  }

  const mesNumero = Number(mes);
  if (!/^\d{4}$/.test(ano) || mesNumero < 1 || mesNumero > 12) return "";

  return `${ano}-${String(mesNumero).padStart(2, "0")}`;
}

export function competenciaValida(valor) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(normalizarCompetencia(valor));
}

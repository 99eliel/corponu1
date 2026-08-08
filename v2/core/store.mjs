import {
  normalizar,
  normalizarReferencia,
  texto
} from "./normalizacao.mjs";

const DOMINIOS = Object.freeze([
  "produtos",
  "ordens",
  "faccoes",
  "celulas",
  "movimentacoes",
  "precos",
  "pagamentos",
  "usuarios"
]);

function validarDominio(dominio) {
  if (!DOMINIOS.includes(dominio)) {
    throw new Error(`Domínio de store inválido: ${dominio}`);
  }
}

function copiar(item) {
  return item && typeof item === "object" ? { ...item } : item;
}

export class CorpoNuStore {
  constructor() {
    this.mapas = Object.fromEntries(DOMINIOS.map(dominio => [dominio, new Map()]));
    this.assinantes = Object.fromEntries(DOMINIOS.map(dominio => [dominio, new Set()]));
    this.versoes = Object.fromEntries(DOMINIOS.map(dominio => [dominio, 0]));
  }

  mapa(dominio) {
    validarDominio(dominio);
    return this.mapas[dominio];
  }

  versao(dominio) {
    validarDominio(dominio);
    return this.versoes[dominio];
  }

  listar(dominio) {
    return [...this.mapa(dominio).values()].map(copiar);
  }

  obter(dominio, id) {
    const item = this.mapa(dominio).get(String(id));
    return item ? copiar(item) : null;
  }

  substituir(dominio, itens = []) {
    validarDominio(dominio);
    const proximo = new Map();

    for (const item of itens || []) {
      if (!item || item.id == null || texto(item.id) === "") continue;
      proximo.set(String(item.id), copiar(item));
    }

    this.mapas[dominio] = proximo;
    this.#notificar(dominio, "substituir");
    return this.listar(dominio);
  }

  mesclar(dominio, itens = []) {
    validarDominio(dominio);
    let alterados = 0;

    for (const item of itens || []) {
      if (!item || item.id == null || texto(item.id) === "") continue;
      const id = String(item.id);
      const anterior = this.mapas[dominio].get(id) || {};
      this.mapas[dominio].set(id, { ...anterior, ...copiar(item), id });
      alterados += 1;
    }

    if (alterados) this.#notificar(dominio, "mesclar");
    return this.listar(dominio);
  }

  substituirItem(dominio, item) {
    validarDominio(dominio);
    if (!item || item.id == null || texto(item.id) === "") {
      throw new Error(`Item sem id para ${dominio}.`);
    }

    const id = String(item.id);
    const proximo = { ...copiar(item), id };
    this.mapas[dominio].set(id, proximo);
    this.#notificar(dominio, "substituir_item", id);
    return copiar(proximo);
  }

  upsert(dominio, item) {
    validarDominio(dominio);
    if (!item || item.id == null || texto(item.id) === "") {
      throw new Error(`Item sem id para ${dominio}.`);
    }

    const id = String(item.id);
    const anterior = this.mapas[dominio].get(id) || {};
    const proximo = { ...anterior, ...copiar(item), id };
    this.mapas[dominio].set(id, proximo);
    this.#notificar(dominio, "upsert", id);
    return copiar(proximo);
  }

  remover(dominio, id) {
    validarDominio(dominio);
    const removido = this.mapas[dominio].delete(String(id));
    if (removido) this.#notificar(dominio, "remover", String(id));
    return removido;
  }

  limpar(dominio) {
    validarDominio(dominio);
    if (!this.mapas[dominio].size) return;
    this.mapas[dominio].clear();
    this.#notificar(dominio, "limpar");
  }

  assinar(dominio, callback) {
    validarDominio(dominio);
    if (typeof callback !== "function") throw new Error("Assinante inválido.");
    this.assinantes[dominio].add(callback);
    return () => this.assinantes[dominio].delete(callback);
  }

  buscarOrdemPorNumero(numeroOP) {
    const alvo = normalizar(numeroOP);
    if (!alvo) return null;

    for (const item of this.mapas.ordens.values()) {
      if (item?.excluida === true || normalizar(item?.status) === "EXCLUIDA") continue;
      const numeroItem = normalizar(
        item?.numeroOP || item?.numeroOPExterno || item?.op || item?.id
      );
      if (numeroItem === alvo) return copiar(item);
    }

    return null;
  }

  buscarProdutoPorReferencia(referencia, tipoPeca = "") {
    const alvo = normalizarReferencia(referencia);
    const tipo = normalizar(tipoPeca);
    if (!alvo) return null;

    for (const item of this.mapas.produtos.values()) {
      if (normalizarReferencia(item?.referencia) !== alvo) continue;
      if (tipo) {
        const tipoItem = normalizar(
          item?.tipoPeca || item?.tipoPecaPadrao || item?.tipoPecaLabel
        );
        if (!tipoItem.includes(tipo)) continue;
      }
      return copiar(item);
    }

    return null;
  }

  snapshot() {
    return Object.fromEntries(DOMINIOS.map(dominio => [dominio, this.listar(dominio)]));
  }

  #notificar(dominio, tipo, id = "") {
    this.versoes[dominio] += 1;
    const evento = Object.freeze({
      dominio,
      tipo,
      id,
      versao: this.versoes[dominio]
    });

    for (const callback of this.assinantes[dominio]) {
      callback(evento, this);
    }
  }
}

export function criarStoreCorpoNu() {
  return new CorpoNuStore();
}

import {
  normalizar,
  normalizarReferencia,
  numero,
  processoCanonico,
  texto
} from "../core/normalizacao.mjs";

function snapshotExiste(snapshot) {
  return Boolean(snapshot && typeof snapshot.exists === "function" && snapshot.exists());
}

function dadosSnapshot(snapshot) {
  if (!snapshotExiste(snapshot)) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

function documentoValido(item) {
  if (!item) return false;
  if (item.excluida === true || item.excluido === true) return false;
  const status = normalizar(item.status);
  return !["EXCLUIDA", "EXCLUIDO", "CANCELADA", "CANCELADO"].includes(status);
}

function valoresConsulta(valor) {
  const bruto = texto(valor);
  if (!bruto) return [];

  const valores = [bruto];
  const numerico = Number(bruto.replace(",", "."));
  if (Number.isFinite(numerico)) valores.push(numerico);

  return valores.filter((item, indice, lista) =>
    lista.findIndex(outro => typeof outro === typeof item && String(outro) === String(item)) === indice
  );
}

function exigirApi(fs, nomes) {
  nomes.forEach(nome => {
    if (typeof fs?.[nome] !== "function") {
      throw new Error(`Firestore API sem ${nome}().`);
    }
  });
}

function buscarOrdemNoCache(cache, numeroOP) {
  if (!cache) return null;
  const alvo = normalizar(numeroOP);

  if (typeof cache.buscarPorNumero === "function") {
    return cache.buscarPorNumero(numeroOP) || null;
  }

  const mapa = cache instanceof Map
    ? cache
    : cache.ordens instanceof Map
      ? cache.ordens
      : null;

  if (!(mapa instanceof Map)) return null;

  for (const item of mapa.values()) {
    const numeroItem = normalizar(item?.numeroOP || item?.numeroOPExterno || item?.op || item?.id);
    if (numeroItem === alvo && documentoValido(item)) return item;
  }

  return null;
}

async function consultarPrimeiroPorCampo({ fs, db, colecao, campo, valor, limite = 4 }) {
  const valores = valoresConsulta(valor);
  if (!valores.length) return null;

  const filtro = valores.length > 1
    ? fs.where(campo, "in", valores)
    : fs.where(campo, "==", valores[0]);

  const consulta = fs.query(
    fs.collection(db, colecao),
    filtro,
    fs.limit(limite)
  );

  const snapshot = await fs.getDocs(consulta);
  const candidatos = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(documentoValido);

  const alvo = normalizar(valor);
  return candidatos.find(item =>
    normalizar(item?.[campo] ?? item?.numeroOP ?? item?.numeroOPExterno ?? item?.op ?? item?.id) === alvo
  ) || candidatos[0] || null;
}

export function criarOrdensRepoFirestore({ db, fs, cache = null }) {
  exigirApi(fs, ["collection", "query", "where", "limit", "getDocs"]);

  return {
    async buscarPorNumero(numeroOP) {
      const cacheado = buscarOrdemNoCache(cache, numeroOP);
      if (cacheado) return cacheado;

      const principal = await consultarPrimeiroPorCampo({
        fs,
        db,
        colecao: "ordensProducao",
        campo: "numeroOP",
        valor: numeroOP
      });
      if (principal) return principal;

      for (const campo of ["numeroOPExterno", "op"]) {
        const legado = await consultarPrimeiroPorCampo({
          fs,
          db,
          colecao: "ordensProducao",
          campo,
          valor: numeroOP
        });
        if (legado) return legado;
      }

      return null;
    }
  };
}

function criarCacheComTTL(ttlMs) {
  const dados = new Map();

  return {
    obter(chave) {
      const item = dados.get(chave);
      if (!item || item.expiraEm <= Date.now()) {
        dados.delete(chave);
        return null;
      }
      return item.valor;
    },
    salvar(chave, valor) {
      dados.set(chave, {
        valor,
        expiraEm: Date.now() + ttlMs
      });
      return valor;
    },
    limpar() {
      dados.clear();
    }
  };
}

export function criarValoresRepoFirestore({
  db,
  fs,
  cachePrecosExterno = null,
  ttlMs = 120000
}) {
  exigirApi(fs, [
    "collection",
    "query",
    "where",
    "getDocs",
    "doc",
    "getDoc"
  ]);

  const cachePrecos = cachePrecosExterno || criarCacheComTTL(ttlMs);
  const cacheConfig = criarCacheComTTL(ttlMs);

  async function buscarPrecosReferencia(referencia) {
    const chave = normalizarReferencia(referencia);
    if (!chave) return [];

    const cacheado = cachePrecos.obter?.(chave);
    if (cacheado) return cacheado;

    const valores = valoresConsulta(referencia);
    const filtro = valores.length > 1
      ? fs.where("referencia", "in", valores)
      : fs.where("referencia", "==", valores[0]);

    const snapshot = await fs.getDocs(fs.query(
      fs.collection(db, "precosReferencia"),
      filtro
    ));

    const itens = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item.ativo !== false);

    cachePrecos.salvar?.(chave, itens);
    return itens;
  }

  function encontrarPreco(itens, processo) {
    const alvo = processoCanonico(processo);
    const candidatos = itens.filter(item =>
      processoCanonico(item.processo || item.servicoNome || item.nome) === alvo
    );

    return candidatos.find(item => numero(item.valor) > 0) || candidatos[0] || null;
  }

  return {
    async buscarValorUnitario(referencia, processo) {
      const itens = await buscarPrecosReferencia(referencia);
      return Math.max(0, numero(encontrarPreco(itens, processo)?.valor, 0));
    },

    async buscarValoresComponentes(referencia) {
      const itens = await buscarPrecosReferencia(referencia);
      return {
        lateral: Math.max(0, numero(encontrarPreco(itens, "LATERAL")?.valor, 0)),
        bojo: Math.max(0, numero(encontrarPreco(itens, "ENCAPAR BOJO")?.valor, 0))
      };
    },

    async buscarConfiguracaoSutiaCompleto() {
      const chave = "sutia-completo-pagamento";
      const cacheado = cacheConfig.obter(chave);
      if (cacheado) return cacheado;

      const snapshot = await fs.getDoc(fs.doc(db, "configuracoes", chave));
      const dados = snapshotExiste(snapshot) ? snapshot.data() : {};
      const config = {
        referenciaEspecial: texto(dados.referenciaEspecial || "912"),
        valorBaseGeral: Math.max(0, numero(dados.valorBaseGeral, 0)),
        valorBaseReferenciaEspecial: Math.max(0, numero(dados.valorBaseReferenciaEspecial, 0)),
        descontoFechoNaoFeito: Math.max(0, numero(dados.descontoFechoNaoFeito, 0)),
        descontoPontoLuzNaoFeito: Math.max(0, numero(dados.descontoPontoLuzNaoFeito, 0))
      };

      return cacheConfig.salvar(chave, config);
    },

    limparCache() {
      cachePrecos.limpar?.();
      cacheConfig.limpar();
    }
  };
}

export function criarPagamentosRepoFirestore({
  db,
  fs,
  colecao = "entregasPagamento"
}) {
  exigirApi(fs, ["doc", "runTransaction", "serverTimestamp"]);

  if (colecao !== "entregasPagamento") {
    throw new Error("A V2 financeira deve gravar somente em entregasPagamento.");
  }

  return {
    async salvarSeAusente(chave, documento) {
      const id = texto(chave);
      if (!id) return { ok: false, motivo: "CHAVE_FECHAMENTO_INVALIDA" };

      const referencia = fs.doc(db, colecao, id);

      return fs.runTransaction(db, async transacao => {
        const atual = await transacao.get(referencia);
        if (snapshotExiste(atual)) {
          return {
            ok: false,
            motivo: "LANCAMENTO_DUPLICADO",
            existente: dadosSnapshot(atual)
          };
        }

        const agoraCriacao = fs.serverTimestamp();
        const dados = {
          ...documento,
          id,
          criadoEm: agoraCriacao,
          atualizadoEm: agoraCriacao
        };

        transacao.set(referencia, dados, { merge: false });

        return {
          ok: true,
          documento: { ...documento, id }
        };
      });
    }
  };
}

export function criarRepositoriosFirestoreV2({
  db,
  fs,
  cacheOrdens = null,
  cachePrecos = null
}) {
  return {
    ordensRepo: criarOrdensRepoFirestore({ db, fs, cache: cacheOrdens }),
    valoresRepo: criarValoresRepoFirestore({ db, fs, cachePrecosExterno: cachePrecos }),
    pagamentosRepo: criarPagamentosRepoFirestore({ db, fs })
  };
}

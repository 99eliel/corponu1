import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import * as firestoreSdk from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyBhIpXK6bPYiqdmjpuwEOcL5s87alz4HjE",
  authDomain: "corponu-b4942.firebaseapp.com",
  projectId: "corponu-b4942",
  storageBucket: "corponu-b4942.firebasestorage.app",
  messagingSenderId: "953146528035",
  appId: "1:953146528035:web:6265bde138aca7ef123c96",
  measurementId: "G-3FVRT3CD6W"
});

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firestoreSdk.getFirestore(app);
await setPersistence(auth, browserSessionPersistence);

const loginRaiz = document.getElementById("firebaseFinanceiroLogin");
const formLogin = document.getElementById("firebaseFinanceiroForm");
const email = document.getElementById("firebaseFinanceiroEmail");
const senha = document.getElementById("firebaseFinanceiroSenha");
const botaoEntrar = document.getElementById("firebaseFinanceiroEntrar");
const statusLogin = document.getElementById("firebaseFinanceiroStatus");
const appRaiz = document.getElementById("firebaseFinanceiroApp");
const appConteudo = document.getElementById("firebaseFinanceiroConteudo");
const usuarioLabel = document.getElementById("firebaseFinanceiroUsuario");

let iniciando = null;
let appFechamento = null;

function informar(mensagem, erro = false) {
  statusLogin.textContent = mensagem || "";
  statusLogin.classList.toggle("erro", erro);
}

function comTimeout(promessa, ms, etapa) {
  let timer;
  const limite = new Promise((_, rejeitar) => {
    timer = window.setTimeout(() => rejeitar(new Error(`TEMPO_LIMITE: ${etapa}`)), ms);
  });
  return Promise.race([promessa, limite]).finally(() => window.clearTimeout(timer));
}

function texto(valor) {
  return String(valor ?? "").trim();
}

function perfilPodeFechar(perfil = {}) {
  if (perfil.ativo !== true) return false;
  if (String(perfil.tipo || "").trim().toLowerCase() === "admin") return true;
  const recursos = perfil?.permissoes?.recursos || {};
  return recursos.gerenciarValores === true || recursos.marcarPagamentos === true;
}

function caminho(ref) {
  return String(ref?.path || ref?._key?.path?.canonicalString?.() || "");
}

function colecaoRaiz(ref) {
  return caminho(ref).split("/").filter(Boolean)[0] || "";
}

function confirmarGravacao() {
  const resposta = window.prompt(
    "ATENÇÃO: este fechamento será gravado no Firebase REAL.\n\nSomente entregasPagamento será alterada.\nNenhuma movimentação/chegada será criada.\n\nDigite GRAVAR para confirmar:",
    ""
  );
  if (String(resposta || "").trim().toUpperCase() !== "GRAVAR") {
    throw new Error("GRAVACAO_REAL_CANCELADA_PELO_USUARIO");
  }
}

function validarDocumentoFinanceiro(ref, dados, opcoes = {}) {
  if (colecaoRaiz(ref) !== "entregasPagamento") {
    throw new Error(`FINANCEIRO_V2_COLECAO_BLOQUEADA: ${colecaoRaiz(ref) || "desconhecida"}`);
  }

  if (dados?.schemaVersion !== 2 || dados?.origem !== "fechamento_financeiro_v2") {
    throw new Error("FINANCEIRO_V2_DOCUMENTO_FORA_DO_CONTRATO");
  }

  if (dados.tipoDocumento === "lancamento_financeiro_v2") {
    if (opcoes?.merge !== false) throw new Error("FINANCEIRO_V2_LANCAMENTO_EXIGE_MERGE_FALSE");
    if (!texto(dados.numeroOP) || !texto(dados.processo) || !texto(dados.responsavel)) {
      throw new Error("FINANCEIRO_V2_LANCAMENTO_INCOMPLETO");
    }
    if (!(Number(dados.quantidade) > 0) || !(Number(dados.quantidadeOP) > 0)) {
      throw new Error("FINANCEIRO_V2_QUANTIDADE_INVALIDA");
    }
    if (!(Number(dados.valorUnitario) > 0) || !(Number(dados.total) > 0)) {
      throw new Error("FINANCEIRO_V2_VALOR_INVALIDO");
    }
    if (dados.statusPagamento !== "pendente" || !(Number(dados.parcela) > 0)) {
      throw new Error("FINANCEIRO_V2_STATUS_OU_PARCELA_INVALIDA");
    }
    return;
  }

  if (dados.tipoDocumento === "controle_processo_v2") {
    if (opcoes?.merge !== true) throw new Error("FINANCEIRO_V2_CONTROLE_EXIGE_MERGE_TRUE");
    if (!texto(dados.numeroOP) || !texto(dados.processo)) {
      throw new Error("FINANCEIRO_V2_CONTROLE_INCOMPLETO");
    }
    if (!(Number(dados.quantidadeOP) > 0) || Number(dados.quantidadeFechada) < 0 || Number(dados.quantidadeRestante) < 0) {
      throw new Error("FINANCEIRO_V2_SALDO_INVALIDO");
    }
    return;
  }

  throw new Error("FINANCEIRO_V2_TIPO_DOCUMENTO_BLOQUEADO");
}

function criarFirestoreControlado() {
  const bloqueada = () => {
    throw new Error("ESCRITA_FINANCEIRA_V2_BLOQUEADA_NESTA_ETAPA");
  };

  async function runTransactionControlada(database, executor, ...resto) {
    confirmarGravacao();
    let lancamentos = 0;
    let controles = 0;

    const resultado = await firestoreSdk.runTransaction(database, async transacaoReal => {
      const proxy = {
        get(ref) {
          if (colecaoRaiz(ref) !== "entregasPagamento") {
            throw new Error("FINANCEIRO_V2_TRANSACAO_SOMENTE_ENTREGAS_PAGAMENTO");
          }
          return transacaoReal.get(ref);
        },
        set(ref, dados, opcoes) {
          validarDocumentoFinanceiro(ref, dados, opcoes);
          if (dados.tipoDocumento === "lancamento_financeiro_v2") lancamentos += 1;
          if (dados.tipoDocumento === "controle_processo_v2") controles += 1;
          if (lancamentos > 1 || controles > 1) {
            throw new Error("FINANCEIRO_V2_TRANSACAO_COM_DOCUMENTOS_EXCEDENTES");
          }
          transacaoReal.set(ref, dados, opcoes);
          return proxy;
        },
        update: bloqueada,
        delete: bloqueada
      };

      const retorno = await executor(proxy);
      if (retorno?.ok === true && (lancamentos !== 1 || controles !== 1)) {
        throw new Error("FINANCEIRO_V2_TRANSACAO_INCOMPLETA");
      }
      return retorno;
    }, ...resto);

    return resultado;
  }

  return Object.freeze({
    collection: firestoreSdk.collection,
    query: firestoreSdk.query,
    where: firestoreSdk.where,
    orderBy: firestoreSdk.orderBy,
    documentId: firestoreSdk.documentId,
    limit: firestoreSdk.limit,
    startAfter: firestoreSdk.startAfter,
    doc: firestoreSdk.doc,
    getDoc: firestoreSdk.getDoc,
    getDocs: firestoreSdk.getDocs,
    serverTimestamp: firestoreSdk.serverTimestamp,
    deleteField: firestoreSdk.deleteField,
    setDoc: bloqueada,
    updateDoc: bloqueada,
    deleteDoc: bloqueada,
    writeBatch: bloqueada,
    runTransaction: runTransactionControlada
  });
}

async function montarFechamento(usuario) {
  if (iniciando) return iniciando;

  iniciando = (async () => {
    informar("Validando perfil…");
    const perfilSnap = await comTimeout(
      firestoreSdk.getDoc(firestoreSdk.doc(db, "usuarios", usuario.uid)),
      12000,
      "leitura do perfil"
    );
    if (!perfilSnap.exists()) throw new Error("Usuário autenticado sem perfil em usuarios.");
    const perfil = { id: perfilSnap.id, ...perfilSnap.data() };
    if (!perfilPodeFechar(perfil)) {
      throw new Error("Seu perfil não possui permissão financeira para esta validação.");
    }

    informar("Carregando motor financeiro V2…");
    const [storeSdk, faccoesSdk, reposSdk, serviceSdk, controllerSdk, pageSdk] = await comTimeout(
      Promise.all([
        import("../v2/core/store.mjs"),
        import("../v2/adapters/faccoes-repo.mjs"),
        import("../v2/adapters/firestore-repos.mjs"),
        import("../v2/core/financeiro-service.mjs"),
        import("../v2/core/fechamento-controller.mjs"),
        import("../v2/ui/fechamento-page.mjs")
      ]),
      15000,
      "carregamento dos módulos V2"
    );

    const fs = criarFirestoreControlado();
    const store = storeSdk.criarStoreCorpoNu();
    const faccoesRepo = faccoesSdk.criarFaccoesRepoFirestore({ db, fs, store });
    informar("Carregando responsáveis…");
    await comTimeout(faccoesRepo.garantirCarregadas(), 15000, "leitura de facções");

    const repositorios = reposSdk.criarRepositoriosFirestoreV2({
      db,
      fs,
      cacheOrdens: { buscarPorNumero: numeroOP => store.buscarOrdemPorNumero(numeroOP) },
      ttlPrecosMs: 120000,
      ttlSaldoMs: 30000
    });
    const service = new serviceSdk.FechamentoFinanceiroService(repositorios);
    const controller = new controllerSdk.FechamentoController({ store, financeiroService: service });

    appFechamento?.desmontar?.();
    appConteudo.innerHTML = "";
    appFechamento = pageSdk.montarTelaFechamento({
      container: appConteudo,
      controller,
      onSalvo: lancamento => {
        console.info("[V2 Financeiro] Lançamento controlado criado.", lancamento?.id || "");
      }
    });

    usuarioLabel.textContent = perfil.nome || usuario.email || usuario.uid;
    loginRaiz.style.display = "none";
    appRaiz.hidden = false;
    informar("");
  })();

  try {
    await iniciando;
  } catch (error) {
    loginRaiz.style.display = "grid";
    appRaiz.hidden = true;
    informar(String(error?.message || error), true);
    console.error("[V2 Financeiro] Falha ao iniciar.", error);
    throw error;
  } finally {
    iniciando = null;
  }
}

formLogin.addEventListener("submit", async event => {
  event.preventDefault();
  botaoEntrar.disabled = true;
  informar("Entrando…");
  try {
    const credencial = await comTimeout(
      signInWithEmailAndPassword(auth, email.value.trim(), senha.value),
      15000,
      "autenticação"
    );
    await montarFechamento(credencial.user);
  } catch (error) {
    informar(String(error?.message || "Não foi possível entrar."), true);
  } finally {
    senha.value = "";
    botaoEntrar.disabled = false;
  }
});

onAuthStateChanged(auth, usuario => {
  if (!usuario || !loginRaiz || loginRaiz.style.display === "none") return;
  montarFechamento(usuario).catch(() => {});
});

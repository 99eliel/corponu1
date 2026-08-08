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

const loginRaiz = document.getElementById("firebasePagamentosLogin");
const formLogin = document.getElementById("firebasePagamentosForm");
const email = document.getElementById("firebasePagamentosEmail");
const senha = document.getElementById("firebasePagamentosSenha");
const botaoEntrar = document.getElementById("firebasePagamentosEntrar");
const statusLogin = document.getElementById("firebasePagamentosStatus");
const appRaiz = document.getElementById("firebasePagamentosApp");
const appConteudo = document.getElementById("firebasePagamentosConteudo");
const usuarioLabel = document.getElementById("firebasePagamentosUsuario");

let iniciando = null;
let telaPagamentos = null;

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

function perfilPodeConsultar(perfil = {}) {
  if (perfil.ativo === false) return false;
  if (String(perfil.tipo || "").trim().toLowerCase() === "admin") return true;
  const recursos = perfil?.permissoes?.recursos || {};
  return recursos.gerenciarValores === true || recursos.marcarPagamentos === true;
}

function criarFirestoreSomenteLeitura() {
  const bloquearEscrita = () => {
    throw new Error("PAGAMENTOS_V2_SOMENTE_LEITURA");
  };

  return Object.freeze({
    collection: firestoreSdk.collection,
    query: firestoreSdk.query,
    where: firestoreSdk.where,
    orderBy: firestoreSdk.orderBy,
    limit: firestoreSdk.limit,
    startAfter: firestoreSdk.startAfter,
    doc: firestoreSdk.doc,
    getDoc: firestoreSdk.getDoc,
    getDocs: firestoreSdk.getDocs,
    serverTimestamp: firestoreSdk.serverTimestamp,
    writeBatch: bloquearEscrita,
    setDoc: bloquearEscrita,
    updateDoc: bloquearEscrita,
    deleteDoc: bloquearEscrita,
    runTransaction: bloquearEscrita
  });
}

async function montarPagamentos(usuario) {
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
    if (!perfilPodeConsultar(perfil)) throw new Error("Seu perfil não possui acesso financeiro para esta validação.");

    informar("Carregando Pagamentos V2…");
    const [storeSdk, faccoesSdk, repoSdk, controllerSdk, pageSdk] = await comTimeout(
      Promise.all([
        import("../v2/core/store.mjs"),
        import("../v2/adapters/faccoes-repo.mjs"),
        import("../v2/adapters/pagamentos-repo.mjs"),
        import("../v2/core/pagamentos-controller.mjs"),
        import("../v2/ui/pagamentos-page.mjs")
      ]),
      15000,
      "carregamento dos módulos V2"
    );

    const fs = criarFirestoreSomenteLeitura();
    const store = storeSdk.criarStoreCorpoNu();
    const faccoesRepo = faccoesSdk.criarFaccoesRepoFirestore({ db, fs, store });
    await comTimeout(faccoesRepo.garantirCarregadas(), 15000, "leitura de facções");

    const pagamentosRepo = repoSdk.criarPagamentosConsultaRepoFirestore({ db, fs });
    const controller = new controllerSdk.PagamentosController({ store, pagamentosRepo, faccoesRepo });

    telaPagamentos?.desmontar?.();
    appConteudo.innerHTML = "";
    telaPagamentos = pageSdk.montarTelaPagamentos({
      container: appConteudo,
      controller,
      store,
      obterUsuario: () => ({ uid: usuario.uid, nome: perfil.nome || usuario.email || "" }),
      confirmarQuitacao: () => false
    });

    const quitar = appConteudo.querySelector("[data-v2-quitar-filtrados]");
    if (quitar) {
      quitar.disabled = true;
      quitar.textContent = "Quitação bloqueada nesta etapa";
      quitar.title = "Este pacote é somente leitura.";
    }

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
    console.error("[V2 Pagamentos Leitura] Falha ao iniciar.", error);
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
    await montarPagamentos(credencial.user);
  } catch (error) {
    informar(String(error?.message || "Não foi possível entrar."), true);
  } finally {
    senha.value = "";
    botaoEntrar.disabled = false;
  }
});

onAuthStateChanged(auth, usuario => {
  if (!usuario || !loginRaiz || loginRaiz.style.display === "none") return;
  montarPagamentos(usuario).catch(() => {});
});

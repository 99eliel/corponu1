import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyBhIpXK6bPYiqdmjpuwEOcL5s87alz4HjE",
  authDomain: "corponu-b4942.firebaseapp.com",
  projectId: "corponu-b4942",
  storageBucket: "corponu-b4942.firebasestorage.app",
  messagingSenderId: "953146528035",
  appId: "1:953146528035:web:6265bde138aca7ef123c96",
  measurementId: "G-3FVRT3CD6W"
});

const parametros = new URLSearchParams(window.location.search);
if (parametros.get("v2firebase") !== "1") {
  parametros.set("v2firebase", "1");
  window.location.replace(`${window.location.pathname}?${parametros.toString()}`);
  throw new Error("REDIRECIONANDO_PARA_V2_READONLY");
}

if (parametros.has("v2write")) {
  parametros.delete("v2write");
  window.location.replace(`${window.location.pathname}?${parametros.toString()}`);
  throw new Error("V2WRITE_REMOVIDO_DO_AMBIENTE_READONLY");
}

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
getFirestore(app);
await setPersistence(auth, browserSessionPersistence);

const raiz = document.getElementById("firebaseReadonlyLogin");
const form = document.getElementById("firebaseReadonlyForm");
const email = document.getElementById("firebaseReadonlyEmail");
const senha = document.getElementById("firebaseReadonlySenha");
const botao = document.getElementById("firebaseReadonlyEntrar");
const status = document.getElementById("firebaseReadonlyStatus");
let bridgeCarregada = false;

function informar(mensagem, erro = false) {
  status.textContent = mensagem || "";
  status.classList.toggle("erro", erro);
}

async function carregarBridge() {
  if (bridgeCarregada) return;
  bridgeCarregada = true;
  informar("Login confirmado. Preparando diagnóstico somente leitura…");
  raiz.style.display = "none";
  await import("../corponu-v2-firebase-bridge.js");
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  botao.disabled = true;
  informar("Entrando…");
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), senha.value);
  } catch (error) {
    bridgeCarregada = false;
    informar("Não foi possível entrar. Confira e-mail e senha do Corpo Nu Flow.", true);
    console.error("[V2 Readonly] Falha de autenticação.", error);
  } finally {
    senha.value = "";
    botao.disabled = false;
  }
});

onAuthStateChanged(auth, usuario => {
  if (usuario) carregarBridge().catch(error => {
    raiz.style.display = "grid";
    bridgeCarregada = false;
    informar(String(error?.message || error), true);
  });
});

import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.mjs";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  writeBatch,
  getDocs,
  addDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhIpXK6bPYiqdmjpuwEOcL5s87alz4HjE",
  authDomain: "corponu-b4942.firebaseapp.com",
  projectId: "corponu-b4942",
  storageBucket: "corponu-b4942.firebasestorage.app",
  messagingSenderId: "953146528035",
  appId: "1:953146528035:web:6265bde138aca7ef123c96",
  measurementId: "G-3FVRT3CD6W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "SecondaryUserCreator");
const secondaryAuth = getAuth(secondaryApp);

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.mjs";

const state = {
  currentUser: null,
  perfil: null,
  produtos: [],
  ordens: [],
  manejos: [],
  fasesManejoExtras: [],
  faccoesManejoExtras: [],
  celusManejoExtras: [],
  usuarios: [],
  logs: [],
  pdfImportacaoPendente: [],
  relatorioAtual: "enfesto",
  unsubscribers: []
};

const pageInfo = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Resumo geral das ordens e referências cadastradas."
  },
  produtos: {
    title: "Produtos / Referências",
    subtitle: "Cadastre as referências e marque se usam alça, bojo e renda."
  },
  ordens: {
    title: "Ordens de Produção",
    subtitle: "Crie OPs informando referência, cor, quantidade e intervalo de necessidade."
  },
  manejo: {
    title: "Manejo",
    subtitle: "Controle fases, facção, produção e necessidade usando as OPs cadastradas."
  },
  processos: {
    title: "Processos",
    subtitle: "Visualização em tempo real das informações do manejo."
  },
  relatorios: {
    title: "Relatórios",
    subtitle: "Relatórios gerais, silk obrigatório e específicos por setor."
  },
  usuarios: {
    title: "Usuários",
    subtitle: "Gerencie logins comuns e admins."
  },
  logs: {
    title: "Logs / Auditoria",
    subtitle: "Acompanhe quem fez as ações importantes no sistema."
  },
  backup: {
    title: "Importar / Backup",
    subtitle: "Importe dados da planilha ou baixe backup atual."
  }
};

const reportInfo = {
  enfesto: {
    title: "Relatório de Enfesto",
    subtitle: "Processo geral: todas as ordens aparecem neste relatório.",
    tipo: "geral"
  },
  corte: {
    title: "Relatório de Corte",
    subtitle: "Processo geral: todas as ordens aparecem neste relatório.",
    tipo: "geral"
  },
  silk: {
    title: "Relatório de Silk",
    subtitle: "Processo obrigatório: todas as ordens aparecem neste relatório.",
    tipo: "geral"
  },
  separacao: {
    title: "Relatório de Separação",
    subtitle: "Processo geral: todas as ordens aparecem neste relatório.",
    tipo: "geral"
  },
  renda: {
    title: "Relatório de Renda",
    subtitle: "Relatório específico: mostra somente referências que possuem renda.",
    tipo: "especifico",
    campo: "possuiRenda",
    coluna: "Renda"
  },
  alca: {
    title: "Relatório de Alça",
    subtitle: "Relatório específico: mostra somente referências que possuem alça.",
    tipo: "especifico",
    campo: "possuiAlca",
    coluna: "Alça"
  },
  bojo: {
    title: "Relatório de Bojo",
    subtitle: "Relatório específico: mostra somente referências que possuem bojo.",
    tipo: "especifico",
    campo: "possuiBojo",
    coluna: "Bojo"
  },
  bipadas: {
    title: "Relatório de Peças Bipadas",
    subtitle: "Mostra somente OPs cujo processo de produção foi finalizado/bipado no Manejo.",
    tipo: "bipado",
    coluna: "Bipado"
  }
};


function carregarSugestoesFaccoesCelus() {
  try {
    const faccoes = JSON.parse(localStorage.getItem("faccoesManejoExtras") || "[]");
    state.faccoesManejoExtras = Array.isArray(faccoes) ? faccoes : [];
  } catch (error) {
    state.faccoesManejoExtras = [];
  }

  try {
    const celus = JSON.parse(localStorage.getItem("celusManejoExtras") || "[]");
    state.celusManejoExtras = Array.isArray(celus) ? celus : [];
  } catch (error) {
    state.celusManejoExtras = [];
  }
}



const SIDEBAR_STORAGE_KEY = "op_confeccao_sidebar_collapsed";

function sidebarEstaRecolhida() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function salvarEstadoSidebar(recolhida) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, recolhida ? "1" : "0");
  } catch (error) {
    console.warn("Não foi possível salvar o estado da sidebar.", error);
  }
}

function aplicarEstadoSidebar(recolhida) {
  const shell = document.getElementById("appShell");
  const btn = document.getElementById("btnToggleSidebar");
  if (!shell) return;

  shell.classList.toggle("sidebar-collapsed", !!recolhida);

  if (btn) {
    btn.textContent = recolhida ? "▶" : "◀";
    btn.setAttribute("aria-label", recolhida ? "Expandir menu" : "Recolher menu");
    btn.setAttribute("title", recolhida ? "Expandir menu" : "Recolher menu");
  }
}

function alternarSidebar() {
  const proximoEstado = !sidebarEstaRecolhida();
  salvarEstadoSidebar(proximoEstado);
  aplicarEstadoSidebar(proximoEstado);
}

function configurarSidebarRetratil() {
  const btn = document.getElementById("btnToggleSidebar");
  if (btn) {
    btn.addEventListener("click", alternarSidebar);
  }

  aplicarEstadoSidebar(sidebarEstaRecolhida());
}


document.addEventListener("DOMContentLoaded", () => {
  carregarSugestoesFaccoesCelus();
  carregarSugestoesExtrasManejo();
  configurarVisibilidadeSenhas();
  configurarSidebarRetratil();
  configurarAuth();
  configurarNavegacao();
  configurarProduto();
  configurarOrdem();
  configurarManejo();
  configurarProcessos();
  configurarRelatorios();
  configurarUsuarios();
  configurarLogs();
  configurarImportadorPDF();
  configurarBackup();
  preencherAnoAtual();
  preencherCamposPDFImportacao();
});


function configurarVisibilidadeSenhas() {
  document.querySelectorAll(".toggle-password").forEach(botao => {
    botao.addEventListener("click", () => {
      const targetId = botao.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      const mostrando = input.type === "text";
      input.type = mostrando ? "password" : "text";
      botao.textContent = mostrando ? "Mostrar" : "Ocultar";
    });
  });
}

function configurarAuth() {
  document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      console.error(error);
      toast("Erro ao entrar. Confira e-mail e senha.");
    }
  });

  document.getElementById("btnResetSenha").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
      toast("Digite seu e-mail primeiro.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast("E-mail de redefinição enviado.");
    } catch (error) {
      console.error(error);
      toast("Não foi possível enviar o e-mail de redefinição.");
    }
  });

  document.getElementById("btnLogout").addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async user => {
    limparListeners();

    if (!user) {
      state.currentUser = null;
      state.perfil = null;
      mostrarTelaLogin();
      return;
    }

    state.currentUser = user;

    try {
      const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));

      if (!perfilSnap.exists()) {
        await signOut(auth);
        toast("Login sem perfil no Firestore. Crie o documento em usuarios usando o UID deste usuário.");
        return;
      }

      const perfil = {
        uid: user.uid,
        ...perfilSnap.data()
      };

      if (!perfil.ativo) {
        await signOut(auth);
        toast("Usuário inativo. Fale com o administrador.");
        return;
      }

      state.perfil = perfil;
      mostrarSistema();
      iniciarListenersFirestore();
      registrarLog("login", "sistema", "Sistema", "Usuário entrou no sistema.");
    } catch (error) {
      console.error(error);
      await signOut(auth);
      toast("Erro de permissão. Confira as regras do Firestore e o perfil do usuário.");
    }
  });
}

function mostrarTelaLogin() {
  document.getElementById("authScreen").classList.remove("hidden");
  document.getElementById("appShell").classList.add("hidden");
}

function mostrarSistema() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");

  document.getElementById("userName").textContent = state.perfil.nome || state.currentUser.email;
  document.getElementById("userRole").textContent = ehAdmin() ? "Admin" : "Usuário comum";

  aplicarEstadoSidebar(sidebarEstaRecolhida());
  aplicarPermissoesTela();
  abrirPagina("dashboard");
}

function limparListeners() {
  state.unsubscribers.forEach(unsub => {
    try {
      unsub();
    } catch (error) {
      console.warn(error);
    }
  });

  state.unsubscribers = [];
}

function iniciarListenersFirestore() {
  const produtosQuery = query(collection(db, "produtos"), orderBy("referencia", "asc"));
  const ordensQuery = query(collection(db, "ordensProducao"), orderBy("criadoEm", "desc"));
  // Manejo agora fica salvo dentro da própria OP em ordensProducao.manejo

  state.unsubscribers.push(onSnapshot(produtosQuery, snapshot => {
    state.produtos = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderTudo();
  }, error => {
    console.error(error);
    toast("Erro ao carregar produtos. Verifique as permissões.");
  }));

  state.unsubscribers.push(onSnapshot(ordensQuery, snapshot => {
    state.ordens = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderTudo();
  }, error => {
    console.error(error);
    toast("Erro ao carregar ordens. Verifique as permissões.");
  }));



  if (ehAdmin()) {
    const usuariosQuery = query(collection(db, "usuarios"), orderBy("nome", "asc"));
    const logsQuery = query(collection(db, "logsAlteracoes"), orderBy("criadoEm", "desc"));

    state.unsubscribers.push(onSnapshot(usuariosQuery, snapshot => {
      state.usuarios = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }));
      renderUsuarios();
    }, error => {
      console.error(error);
      toast("Erro ao carregar usuários.");
    }));

    state.unsubscribers.push(onSnapshot(logsQuery, snapshot => {
      state.logs = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      renderLogs();
    }, error => {
      console.error(error);
      toast("Erro ao carregar logs.");
    }));
  }
}

function aplicarPermissoesTela() {
  const admin = ehAdmin();

  document.querySelectorAll(".admin-only, .admin-only-block, .admin-only-cell").forEach(el => {
    el.classList.toggle("hidden", !admin);
  });

  if (!admin) {
    const paginaAtiva = document.querySelector(".page.active")?.id;
    if (paginaAtiva === "usuarios" || paginaAtiva === "backup" || paginaAtiva === "logs") {
      abrirPagina("dashboard");
    }
  }
}

function ehAdmin() {
  return state.perfil?.tipo === "admin";
}

function configurarNavegacao() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if ((btn.dataset.page === "usuarios" || btn.dataset.page === "backup" || btn.dataset.page === "logs") && !ehAdmin()) {
        toast("Apenas admin acessa esta área.");
        return;
      }

      abrirPagina(btn.dataset.page);
    });
  });
}

function abrirPagina(page) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add("active");
  document.getElementById(page)?.classList.add("active");

  if (pageInfo[page]) {
    document.getElementById("pageTitle").textContent = pageInfo[page].title;
    document.getElementById("pageSubtitle").textContent = pageInfo[page].subtitle;
  }
}

function configurarProduto() {
  const form = document.getElementById("formProduto");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!ehAdmin()) {
      toast("Apenas admin pode salvar produtos.");
      return;
    }

    const produtoIdAtual = document.getElementById("produtoId").value;
    const referencia = normalizarReferencia(document.getElementById("produtoReferencia").value);
    const nome = document.getElementById("produtoNome").value.trim();

    if (!referencia || !nome) {
      toast("Preencha referência e nome do produto.");
      return;
    }

    const produto = {
      referencia,
      nome,
      possuiAlca: document.getElementById("produtoAlca").checked,
      possuiBojo: document.getElementById("produtoBojo").checked,
      possuiRenda: document.getElementById("produtoRenda").checked,
      observacoes: document.getElementById("produtoObs").value.trim(),
      cadastroPendente: false,
      statusCadastro: "conferido",
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    };

    if (!produtoIdAtual) {
      produto.criadoPor = state.currentUser.uid;
      produto.criadoEm = serverTimestamp();
    }

    try {
      const docId = produtoIdAtual || docIdSeguro(referencia);
      await setDoc(doc(db, "produtos", docId), produto, { merge: true });
      const ordensAtualizadas = await atualizarOrdensDaReferencia(produto);
      await registrarLog(
        produtoIdAtual ? "produto_atualizado" : "produto_criado",
        "produto",
        docId,
        `Referência ${referencia} - ${nome}. Ordens atualizadas: ${ordensAtualizadas}`
      );

      limparFormProduto();
      toast("Produto salvo no Firebase.");
      restaurarOrdemPendenteSePossivel({ id: docId, ...produto });
    } catch (error) {
      console.error(error);
      toast("Erro ao salvar produto.");
    }
  });

  document.getElementById("buscaProduto").addEventListener("input", renderProdutos);
  document.getElementById("btnCancelarProduto").addEventListener("click", limparFormProduto);
}

function limparFormProduto() {
  document.getElementById("produtoId").value = "";
  document.getElementById("produtoReferencia").value = "";
  document.getElementById("produtoNome").value = "";
  document.getElementById("produtoAlca").checked = false;
  document.getElementById("produtoBojo").checked = false;
  document.getElementById("produtoRenda").checked = false;
  document.getElementById("produtoObs").value = "";
}

function editarProduto(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode editar produtos.");
    return;
  }

  const produto = state.produtos.find(p => p.id === id);
  if (!produto) return;

  document.getElementById("produtoId").value = produto.id;
  document.getElementById("produtoReferencia").value = produto.referencia;
  document.getElementById("produtoNome").value = produto.nome;
  document.getElementById("produtoAlca").checked = Boolean(produto.possuiAlca);
  document.getElementById("produtoBojo").checked = Boolean(produto.possuiBojo);
  document.getElementById("produtoRenda").checked = Boolean(produto.possuiRenda);
  document.getElementById("produtoObs").value = produto.observacoes || "";

  abrirPagina("produtos");
}

async function excluirProduto(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode excluir produtos.");
    return;
  }

  const produto = state.produtos.find(p => p.id === id);
  if (!produto) return;

  const possuiOP = state.ordens.some(op => op.referencia === produto.referencia);
  const mensagem = possuiOP
    ? "Essa referência já possui ordens cadastradas. Excluir mesmo assim?"
    : "Deseja excluir este produto?";

  if (!confirm(mensagem)) return;

  try {
    await deleteDoc(doc(db, "produtos", id));
    await registrarLog("produto_excluido", "produto", id, `Referência ${produto.referencia} - ${produto.nome}`);
    toast("Produto excluído.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir produto.");
  }
}


function montarTextoNecessidade(inicio, fim) {
  if (!inicio || !fim) return "";
  return `${dataISOParaBR(inicio)} a ${dataISOParaBR(fim)}`;
}


function configurarOrdem() {
  const form = document.getElementById("formOrdem");

  document.getElementById("ordemReferencia").addEventListener("input", mostrarPreviewProduto);

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("ordemId").value;
    const referencia = normalizarReferencia(document.getElementById("ordemReferencia").value);
    const produto = state.produtos.find(p => p.referencia === referencia);

    if (!produto) {
      const cadastrarAgora = confirm(`A referência ${referencia || "(vazia)"} ainda não está cadastrada. Deseja cadastrar esse produto agora?`);

      if (cadastrarAgora) {
        if (!ehAdmin()) {
          toast("Apenas admin pode cadastrar nova referência.");
          return;
        }

        iniciarCadastroProdutoPelaOrdem(referencia);
      } else {
        toast("Cadastre a referência antes de salvar a OP.");
      }

      return;
    }

    const cor = normalizarCor(document.getElementById("ordemCor").value);
    const quantidade = Number(document.getElementById("ordemQuantidade").value);
    const necessidadeInicio = document.getElementById("ordemNecessidadeInicio").value;
    const necessidadeFim = document.getElementById("ordemNecessidadeFim").value;
    const necessidade = montarTextoNecessidade(necessidadeInicio, necessidadeFim);
    const semana = "";
    const mes = nomeMesPorDataISO(necessidadeInicio);
    const ano = anoPorDataISO(necessidadeInicio);

    if (!cor) {
      toast("Informe a cor da OP.");
      return;
    }

    if (!quantidade || quantidade <= 0) {
      toast("Informe uma quantidade válida.");
      return;
    }

    if (!necessidadeInicio || !necessidadeFim) {
      toast("Informe a data inicial e a data final da necessidade.");
      return;
    }

    if (necessidadeInicio > necessidadeFim) {
      toast("A data inicial não pode ser maior que a data final.");
      return;
    }

    try {
      if (id) {
        const opAntiga = state.ordens.find(op => op.id === id);
        const ordemAtualizada = montarDadosOrdem({
          numeroOP: opAntiga?.numeroOP || id,
          produto,
          referencia,
          cor,
          quantidade,
          semana,
          mes,
          ano,
          necessidadeInicio,
          necessidadeFim,
          necessidade,
          observacoes: document.getElementById("ordemObs").value.trim(),
          criada: false
        });

        await setDoc(doc(db, "ordensProducao", id), ordemAtualizada, { merge: true });
        await registrarLog("ordem_atualizada", "ordemProducao", id, `${ordemAtualizada.numeroOP} | Ref. ${referencia} | Cor ${cor} | Qtd. ${quantidade}`);
        toast("OP atualizada.");
      } else {
        const numeroOP = await gerarNumeroOPFirebase(ano);
        const ordemNova = montarDadosOrdem({
          numeroOP,
          produto,
          referencia,
          cor,
          quantidade,
          semana,
          mes,
          ano,
          necessidadeInicio,
          necessidadeFim,
          necessidade,
          observacoes: document.getElementById("ordemObs").value.trim(),
          criada: true
        });

        const ordemDocId = docIdSeguro(numeroOP);
        await setDoc(doc(db, "ordensProducao", ordemDocId), ordemNova);
        await registrarLog("ordem_criada", "ordemProducao", ordemDocId, `${numeroOP} | Ref. ${referencia} | Cor ${cor} | Qtd. ${quantidade}`);
        toast("OP cadastrada.");
      }

      limparFormOrdem();
    } catch (error) {
      console.error(error);
      toast("Erro ao salvar OP.");
    }
  });

  document.getElementById("buscaOrdem").addEventListener("input", renderOrdens);
  document.getElementById("btnCancelarOrdem").addEventListener("click", limparFormOrdem);
}

function montarDadosOrdem({ numeroOP, produto, referencia, cor, quantidade, semana, mes, ano, necessidadeInicio, necessidadeFim, necessidade, observacoes, criada }) {
  const dados = {
    numeroOP,
    referencia,
    cor,
    produtoNome: produto.nome,
    semana,
    mes,
    ano,
    necessidadeInicio,
    necessidadeFim,
    necessidade,
    quantidade,
    possuiAlca: Boolean(produto.possuiAlca),
    possuiBojo: Boolean(produto.possuiBojo),
    possuiRenda: Boolean(produto.possuiRenda),
    observacoes,
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  if (criada) {
    dados.status = "aberta";
    dados.criadoPor = state.currentUser.uid;
    dados.criadoEm = serverTimestamp();
  }

  return dados;
}

async function gerarNumeroOPFirebase(ano) {
  const configRef = doc(db, "configuracoes", "sistema");

  return await runTransaction(db, async transaction => {
    const snap = await transaction.get(configRef);
    const atual = snap.exists() ? Number(snap.data().ultimoNumeroOP || 0) : 0;
    const proximo = atual + 1;

    transaction.set(configRef, {
      ultimoNumeroOP: proximo,
      anoAtual: ano,
      nomeSistema: "Sistema OP Confecção",
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    return `OP-${ano}-${String(proximo).padStart(4, "0")}`;
  });
}

function mostrarPreviewProduto() {
  const referencia = normalizarReferencia(document.getElementById("ordemReferencia").value);
  const produto = state.produtos.find(p => p.referencia === referencia);
  const preview = document.getElementById("produtoPreview");

  if (!referencia) {
    preview.classList.add("hidden");
    preview.classList.remove("warning");
    preview.innerHTML = "";
    return;
  }

  if (!produto) {
    preview.classList.remove("hidden");
    preview.classList.add("warning");

    const botaoCadastro = ehAdmin()
      ? `<div class="preview-actions">
          <button type="button" class="btn btn-sm btn-primary" onclick="iniciarCadastroProdutoPelaOrdem('${encodeURIComponent(referencia)}')">
            Cadastrar essa referência
          </button>
        </div>`
      : `<br><strong>Peça para um admin cadastrar essa referência.</strong>`;

    preview.innerHTML = `
      <strong>Referência não cadastrada:</strong> ${escapeHtml(referencia)}<br>
      Para salvar essa OP, o produto precisa estar cadastrado.
      ${botaoCadastro}
    `;
    return;
  }

  preview.classList.remove("hidden");
  preview.classList.remove("warning");
  preview.innerHTML = `
    <strong>Produto encontrado:</strong><br>
    Referência: ${escapeHtml(produto.referencia)}<br>
    Produto: ${escapeHtml(produto.nome)}<br>
    Alça: ${produto.possuiAlca ? "Sim" : "Não"} |
    Bojo: ${produto.possuiBojo ? "Sim" : "Não"} |
    Renda: ${produto.possuiRenda ? "Sim" : "Não"}
  `;
}

function capturarOrdemPendente(referencia) {
  const necessidadeInicio = document.getElementById("ordemNecessidadeInicio")?.value || "";
  const necessidadeFim = document.getElementById("ordemNecessidadeFim")?.value || "";

  return {
    referencia: normalizarReferencia(referencia),
    cor: normalizarCor(document.getElementById("ordemCor").value),
    quantidade: document.getElementById("ordemQuantidade").value,
    necessidadeInicio,
    necessidadeFim,
    observacoes: document.getElementById("ordemObs").value
  };
}

function iniciarCadastroProdutoPelaOrdem(referenciaEncoded) {
  if (!ehAdmin()) {
    toast("Apenas admin pode cadastrar referência.");
    return;
  }

  const referencia = normalizarReferencia(decodeURIComponent(referenciaEncoded));
  if (!referencia) {
    toast("Digite a referência primeiro.");
    return;
  }

  sessionStorage.setItem("op_confeccao_ordem_pendente", JSON.stringify(capturarOrdemPendente(referencia)));

  limparFormProduto();
  abrirPagina("produtos");

  document.getElementById("produtoReferencia").value = referencia;
  document.getElementById("produtoNome").focus();

  toast("Cadastre essa referência. Depois o sistema volta para a OP.");
}

function restaurarOrdemPendenteSePossivel(produtoCadastrado) {
  const raw = sessionStorage.getItem("op_confeccao_ordem_pendente");
  if (!raw) return false;

  try {
    const pendente = JSON.parse(raw);

    if (normalizarReferencia(pendente.referencia) !== produtoCadastrado.referencia) {
      return false;
    }

    sessionStorage.removeItem("op_confeccao_ordem_pendente");
    abrirPagina("ordens");

    document.getElementById("ordemReferencia").value = produtoCadastrado.referencia;
    document.getElementById("ordemCor").value = pendente.cor || "";
    document.getElementById("ordemQuantidade").value = pendente.quantidade || "";
    document.getElementById("ordemNecessidadeInicio").value = pendente.necessidadeInicio || "";
    document.getElementById("ordemNecessidadeFim").value = pendente.necessidadeFim || "";
    document.getElementById("ordemObs").value = pendente.observacoes || "";

    mostrarPreviewProduto();

    toast("Produto cadastrado. Confira os dados e salve a OP.");
    return true;
  } catch (error) {
    sessionStorage.removeItem("op_confeccao_ordem_pendente");
    return false;
  }
}

function limparFormOrdem() {
  document.getElementById("ordemId").value = "";
  document.getElementById("ordemReferencia").value = "";
  document.getElementById("ordemCor").value = "";
  document.getElementById("ordemQuantidade").value = "";
  document.getElementById("ordemNecessidadeInicio").value = "";
  document.getElementById("ordemNecessidadeFim").value = "";
  document.getElementById("ordemObs").value = "";
  document.getElementById("produtoPreview").classList.add("hidden");
}

function editarOrdem(id) {
  const ordem = state.ordens.find(op => op.id === id);
  if (!ordem) return;

  document.getElementById("ordemId").value = ordem.id;
  document.getElementById("ordemReferencia").value = ordem.referencia;
  document.getElementById("ordemCor").value = ordem.cor || "";
  document.getElementById("ordemQuantidade").value = ordem.quantidade;
  document.getElementById("ordemNecessidadeInicio").value = ordem.necessidadeInicio || "";
  document.getElementById("ordemNecessidadeFim").value = ordem.necessidadeFim || "";
  document.getElementById("ordemObs").value = ordem.observacoes || "";

  mostrarPreviewProduto();
  abrirPagina("ordens");
}

async function excluirOrdem(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode excluir OP.");
    return;
  }

  if (!confirm("Deseja excluir esta ordem de produção?")) return;

  try {
    const ordem = state.ordens.find(op => op.id === id);
    await deleteDoc(doc(db, "ordensProducao", id));
    await registrarLog("ordem_excluida", "ordemProducao", id, `${ordem?.numeroOP || id} | Ref. ${ordem?.referencia || "-"} | Cor ${ordem?.cor || "-"}`);
    toast("OP excluída.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir OP.");
  }
}




function atualizarManejoComSoma() {
  renderManejoInline();
  setTimeout(renderResumoSomasManejoPeloDOM, 0);
}

function configurarManejo() {
  const busca = document.getElementById("buscaManejoLinha");
  if (busca) {
    busca.addEventListener("input", atualizarManejoComSoma);
  }

  [
    "filtroManejoStatus",
    "filtroManejoOP",
    "filtroManejoReferencia",
    "filtroManejoSilk",
    "filtroManejoDataTecido",
    "filtroManejoFase",
    "filtroManejoQuantidade",
    "filtroManejoCor",
    "filtroManejoData",
    "filtroManejoFaccao",
    "filtroManejoChegada",
    "filtroManejoFalta",
    "filtroManejoProducao",
    "filtroManejoCelu",
    "filtroManejoNecessidade"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", atualizarManejoComSoma);
  });

  const limpar = document.getElementById("btnLimparFiltrosManejo");
  if (limpar) {
    limpar.addEventListener("click", () => {
      limparFiltrosColunasManejo();
      atualizarManejoComSoma();
    });
  }

  const toggleSoma = document.getElementById("btnToggleSomaManejo");
  if (toggleSoma) {
    toggleSoma.addEventListener("click", () => {
      const painel = document.getElementById("painelSomaManejo");
      if (painel) painel.classList.toggle("hidden");
    });
  }

  const imprimir = document.getElementById("btnImprimirManejoFiltrado");
  if (imprimir) {
    imprimir.addEventListener("click", imprimirManejoFiltrado);
  }
}


function valorManejoParaImpressao(op, campo) {
  const valorTela = valorLinhaManejo(op, campo);
  if (valorTela !== "") return valorTela;

  const manejo = getManejoDaOrdem(op);
  return manejo?.[campo] ?? "";
}

function getLinhasManejoParaImpressao() {
  return filtrarOrdensManejoPorColunas().map(op => {
    const manejo = getManejoDaOrdem(op);

    return {
      numeroOP: op.numeroOP || "",
      referencia: op.referencia || "",
      silkNome: valorManejoParaImpressao(op, "silkNome") || getSilkNomeManejo(manejo),
      silkData: valorManejoParaImpressao(op, "silkData"),
      dataTecido: valorManejoParaImpressao(op, "dataTecido"),
      fase: valorManejoParaImpressao(op, "fase"),
      quantidade: numeroQuantidadeOP(op),
      cor: op.cor || "",
      data: valorManejoParaImpressao(op, "data"),
      faccao: valorManejoParaImpressao(op, "faccao"),
      chegada: valorManejoParaImpressao(op, "chegada"),
      falta: Number(valorManejoParaImpressao(op, "falta") || 0),
      producao: valorManejoParaImpressao(op, "producao"),
      celu: valorManejoParaImpressao(op, "celu"),
      necessidade: getNecessidadeDaOrdem(op),
      status: getStatusManejo(op) === "bipado" ? "Bipado" : getStatusManejo(op) === "organizada" ? "Organizada" : "Pendente"
    };
  });
}

function imprimirManejoFiltrado() {
  const linhas = getLinhasManejoParaImpressao();

  if (!linhas.length) {
    toast("Nenhum item filtrado para imprimir.");
    return;
  }

  const totalPecas = linhas.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
  const totalFalta = linhas.reduce((soma, item) => soma + Number(item.falta || 0), 0);
  const filtroAtivo = getFiltrosManejoAtivosTexto();
  const dataImpressao = new Date().toLocaleString("pt-BR");

  const linhasTabela = linhas.map(item => `
    <tr>
      <td>${escapeHtml(item.numeroOP)}</td>
      <td>${escapeHtml(item.referencia)}</td>
      <td>${escapeHtml(item.silkNome || "-")}</td>
      <td>${escapeHtml(formatarDataSimples(item.silkData))}</td>
      <td>${escapeHtml(formatarDataSimples(item.dataTecido))}</td>
      <td>${escapeHtml(item.fase || "-")}</td>
      <td class="num">${escapeHtml(item.quantidade)}</td>
      <td>${escapeHtml(item.cor || "-")}</td>
      <td>${escapeHtml(formatarDataSimples(item.data))}</td>
      <td>${escapeHtml(item.faccao || "-")}</td>
      <td>${escapeHtml(formatarDataSimples(item.chegada))}</td>
      <td class="num">${escapeHtml(item.falta || 0)}</td>
      <td>${escapeHtml(formatarDataSimples(item.producao))}</td>
      <td>${escapeHtml(item.celu || "-")}</td>
      <td>${escapeHtml(item.necessidade || "-")}</td>
      <td>${escapeHtml(item.status)}</td>
    </tr>
  `).join("");

  const htmlImpressao = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Impressão Manejo</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: #0f172a;
            margin: 18px;
            font-size: 11px;
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          h1 {
            margin: 0 0 4px;
            font-size: 20px;
          }
          .muted {
            color: #475569;
            font-size: 11px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 12px 0;
          }
          .summary div {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
          }
          .summary span {
            display: block;
            color: #475569;
            font-size: 10px;
          }
          .summary strong {
            display: block;
            font-size: 15px;
            margin-top: 3px;
          }
          .filter-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            margin-bottom: 12px;
            background: #f8fafc;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 4px;
            vertical-align: top;
          }
          th {
            background: #eef2ff;
            font-size: 10px;
            text-align: left;
          }
          td.num {
            text-align: right;
            font-weight: bold;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div>
            <h1>Manejo - Itens filtrados</h1>
            <div class="muted">Sistema OP Confecção</div>
          </div>
          <div class="muted">
            Impresso em:<br><strong>${escapeHtml(dataImpressao)}</strong>
          </div>
        </div>

        <div class="filter-box">
          <strong>${escapeHtml(filtroAtivo)}</strong>
        </div>

        <div class="summary">
          <div><span>OPs</span><strong>${linhas.length.toLocaleString("pt-BR")}</strong></div>
          <div><span>Total de peças</span><strong>${totalPecas.toLocaleString("pt-BR")}</strong></div>
          <div><span>Total em falta</span><strong>${totalFalta.toLocaleString("pt-BR")}</strong></div>
          <div><span>Status</span><strong>${escapeHtml(document.getElementById("somaManejoStatus")?.textContent || "-")}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>OP</th>
              <th>REF</th>
              <th>Silk nome</th>
              <th>Silk data</th>
              <th>Data tecido</th>
              <th>Fase</th>
              <th>QTI</th>
              <th>Cor</th>
              <th>Data</th>
              <th>Facção</th>
              <th>Chegada</th>
              <th>Falta</th>
              <th>Produção</th>
              <th>CELU</th>
              <th>Necessidade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${linhasTabela}</tbody>
        </table>

        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;

  const janela = window.open("", "_blank");
  if (!janela) {
    toast("O navegador bloqueou a impressão. Permita pop-ups para este site.");
    return;
  }

  janela.document.open();
  janela.document.write(htmlImpressao);
  janela.document.close();
}


function renderManejoInline() {
  const tbody = document.getElementById("listaManejoInline");
  if (!tbody) return;

  const ordens = filtrarOrdensManejoPorColunas();

  renderResumoSomasManejo(ordens);

  if (!ordens.length) {
    tbody.innerHTML = `<tr><td colspan="17" class="empty">Nenhuma ordem de produção encontrada para o manejo.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordens.map(op => {
    const manejo = getManejoDaOrdem(op);
    const rowId = idLinhaManejo(op);
    const rowClass = manejo ? "manejo-row-saved" : "manejo-row-pending";

    return `
      <tr class="${rowClass}" data-manejo-row="1" data-qti="${escapeHtml(numeroQuantidadeOP(op))}" data-falta="${escapeHtml(numeroFaltaManejo(op))}" data-status="${escapeHtml(getStatusManejo(op))}" data-fase="${escapeHtml(manejo?.fase || "Sem fase")}" data-cor="${escapeHtml(op.cor || "Sem cor")}">
        <td><input class="manejo-readonly" value="${escapeHtml(op.numeroOP || "")}" readonly /></td>
        <td><input class="manejo-readonly" value="${escapeHtml(op.referencia || "")}" readonly /></td>
        <td>
          <div class="silk-fields">
            <label class="mini-field">
              <span>Nome</span>
              <input id="${rowId}-silkNome" value="${escapeHtml(getSilkNomeManejo(manejo))}" list="manejoSilkNomesList" placeholder="Quem fez" />
            </label>
            <label class="mini-field">
              <span>Data</span>
              <input id="${rowId}-silkData" type="date" value="${escapeHtml(manejo?.silkData || "")}" title="Data do silk" />
            </label>
          </div>
        </td>
        <td><input id="${rowId}-dataTecido" type="date" value="${escapeHtml(manejo?.dataTecido || "")}" /></td>
        <td>
          <div class="fase-plus">
            <input id="${rowId}-fase" value="${escapeHtml(manejo?.fase || "")}" list="manejoFasesList" placeholder="Digite a fase" />
            <button class="btn-plus" type="button" onclick="adicionarFaseSugestao('${op.id}')" title="Adicionar fase às sugestões">+</button>
          </div>
        </td>
        <td><input class="manejo-readonly" type="number" value="${escapeHtml(op.quantidade ?? 0)}" readonly /></td>
        <td><input class="manejo-readonly" value="${escapeHtml(op.cor || "")}" readonly /></td>
        <td><input id="${rowId}-data" type="date" value="${escapeHtml(manejo?.data || "")}" /></td>
        <td>
          <div class="sugestao-plus">
            <input id="${rowId}-faccao" value="${escapeHtml(manejo?.faccao || "")}" list="manejoFaccaoList" placeholder="Facção" />
            <button class="btn-plus" type="button" onclick="adicionarFaccaoSugestao('${op.id}')" title="Adicionar facção às sugestões">+</button>
          </div>
        </td>
        <td><input id="${rowId}-chegada" type="date" value="${escapeHtml(manejo?.chegada || "")}" /></td>
        <td><input id="${rowId}-falta" type="number" min="0" step="1" value="${escapeHtml(manejo?.falta ?? "")}" /></td>
        <td><input id="${rowId}-producao" type="date" value="${escapeHtml(manejo?.producao || "")}" /></td>
        <td>
          <div class="sugestao-plus">
            <input id="${rowId}-celu" value="${escapeHtml(manejo?.celu || "")}" list="manejoCeluList" placeholder="CELU" />
            <button class="btn-plus" type="button" onclick="adicionarCeluSugestao('${op.id}')" title="Adicionar CELU às sugestões">+</button>
          </div>
        </td>
        <td><input class="manejo-readonly" value="${escapeHtml(getNecessidadeDaOrdem(op))}" readonly /></td>
        <td class="manejo-bipado-cell">
          <button class="btn btn-sm btn-bipado" onclick="biparManejoLinha('${op.id}')">
            ${getStatusManejo(op) === "bipado" ? "Bipado ✓" : "Bipar"}
          </button>
        </td>
        <td>${manejoStatusBadge(manejo, op)}</td>
        <td>
          <div class="manejo-actions">
            <button class="btn btn-sm btn-primary" onclick="salvarManejoLinha('${op.id}')">Salvar</button>
            ${manejo && ehAdmin() ? `<button class="btn btn-sm btn-danger" onclick="limparManejoLinha('${op.id}')">Limpar</button>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  renderResumoSomasManejoPeloDOM();
}


function valorSilkAntigoValido(valor) {
  const texto = limparTexto(valor).toUpperCase();
  if (!texto) return "";
  if (["SIM", "NÃO", "NAO", "PENDENTE"].includes(texto)) return "";
  return texto;
}

function getSilkNomeManejo(manejo) {
  if (!manejo) return "";

  const silkNome = valorSilkAntigoValido(manejo.silkNome);
  if (silkNome) return silkNome;

  return valorSilkAntigoValido(manejo.silk);
}

function getStatusManejo(op) {
  const manejo = getManejoDaOrdem(op);
  if (op?.bipado || op?.manejoStatus === "bipado" || manejo?.bipado || manejo?.status === "bipado") return "bipado";
  if (op?.manejoStatus) return op.manejoStatus;
  return manejo ? "organizada" : "pendente";
}

function getValorManejoParaFiltro(op, campo) {
  const manejo = getManejoDaOrdem(op);

  const mapa = {
    status: getStatusManejo(op),
    op: op.numeroOP || "",
    referencia: op.referencia || "",
    silk: getSilkNomeManejo(manejo),
    dataTecido: manejo?.dataTecido || "",
    fase: manejo?.fase || "",
    quantidade: op.quantidade ?? "",
    cor: op.cor || "",
    data: manejo?.data || "",
    faccao: manejo?.faccao || "",
    chegada: manejo?.chegada || "",
    falta: manejo?.falta ?? "",
    producao: manejo?.producao || "",
    celu: manejo?.celu || "",
    necessidade: getNecessidadeDaOrdem(op)
  };

  return String(mapa[campo] ?? "");
}

function filtrarOrdensManejoPorColunas() {
  const busca = normalizarTexto(document.getElementById("buscaManejoLinha")?.value || "");

  const filtros = {
    status: document.getElementById("filtroManejoStatus")?.value || "",
    op: document.getElementById("filtroManejoOP")?.value || "",
    referencia: document.getElementById("filtroManejoReferencia")?.value || "",
    silk: document.getElementById("filtroManejoSilk")?.value || "",
    dataTecido: document.getElementById("filtroManejoDataTecido")?.value || "",
    fase: document.getElementById("filtroManejoFase")?.value || "",
    quantidade: document.getElementById("filtroManejoQuantidade")?.value || "",
    cor: document.getElementById("filtroManejoCor")?.value || "",
    data: document.getElementById("filtroManejoData")?.value || "",
    faccao: document.getElementById("filtroManejoFaccao")?.value || "",
    chegada: document.getElementById("filtroManejoChegada")?.value || "",
    falta: document.getElementById("filtroManejoFalta")?.value || "",
    producao: document.getElementById("filtroManejoProducao")?.value || "",
    celu: document.getElementById("filtroManejoCelu")?.value || "",
    necessidade: document.getElementById("filtroManejoNecessidade")?.value || ""
  };

  return [...state.ordens].filter(op => {
    const manejo = getManejoDaOrdem(op);

    const textoGeral = normalizarTexto([
      op.numeroOP,
      op.numeroOPExterno,
      op.referencia,
      op.cor,
      op.produtoNome,
      op.quantidade,
      getNecessidadeDaOrdem(op),
      getSilkNomeManejo(manejo),
      manejo?.silkData,
      manejo?.dataTecido,
      manejo?.fase,
      manejo?.data,
      manejo?.faccao,
      manejo?.chegada,
      manejo?.falta,
      manejo?.producao,
      manejo?.celu
    ].join(" "));

    if (busca && !textoGeral.includes(busca)) return false;

    return Object.entries(filtros).every(([campo, valor]) => {
      if (!valor) return true;
      return getValorManejoParaFiltro(op, campo) === valor;
    });
  });
}

function limparFiltrosColunasManejo() {
  [
    "buscaManejoLinha",
    "filtroManejoStatus",
    "filtroManejoOP",
    "filtroManejoReferencia",
    "filtroManejoSilk",
    "filtroManejoDataTecido",
    "filtroManejoFase",
    "filtroManejoQuantidade",
    "filtroManejoCor",
    "filtroManejoData",
    "filtroManejoFaccao",
    "filtroManejoChegada",
    "filtroManejoFalta",
    "filtroManejoProducao",
    "filtroManejoCelu",
    "filtroManejoNecessidade"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function preencherSelectFiltroManejo(id, valores, labelTodos = "Todos") {
  const select = document.getElementById(id);
  if (!select) return;

  const atual = select.value;
  const limpos = [...new Set(valores.map(valor => String(valor ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  select.innerHTML = `<option value="">${labelTodos}</option>` + limpos.map(valor => {
    return `<option value="${escapeHtml(valor)}">${escapeHtml(valor)}</option>`;
  }).join("");

  if (limpos.includes(atual)) {
    select.value = atual;
  }
}

function renderFiltrosColunasManejo() {
  const ordens = [...state.ordens];

  preencherSelectFiltroManejo("filtroManejoOP", ordens.map(op => getValorManejoParaFiltro(op, "op")), "Todas");
  preencherSelectFiltroManejo("filtroManejoReferencia", ordens.map(op => getValorManejoParaFiltro(op, "referencia")), "Todas");
  preencherSelectFiltroManejo("filtroManejoSilk", ordens.map(op => getValorManejoParaFiltro(op, "silk")), "Todos");
  preencherSelectFiltroManejo("filtroManejoDataTecido", ordens.map(op => getValorManejoParaFiltro(op, "dataTecido")), "Todas");
  preencherSelectFiltroManejo("filtroManejoFase", [
    ...ordens.map(op => getValorManejoParaFiltro(op, "fase")),
    ...state.fasesManejoExtras
  ], "Todas");
  preencherSelectFiltroManejo("filtroManejoQuantidade", ordens.map(op => getValorManejoParaFiltro(op, "quantidade")), "Todas");
  preencherSelectFiltroManejo("filtroManejoCor", ordens.map(op => getValorManejoParaFiltro(op, "cor")), "Todas");
  preencherSelectFiltroManejo("filtroManejoData", ordens.map(op => getValorManejoParaFiltro(op, "data")), "Todas");
  preencherSelectFiltroManejo("filtroManejoFaccao", [
    ...ordens.map(op => getValorManejoParaFiltro(op, "faccao")),
    ...state.faccoesManejoExtras
  ], "Todas");
  preencherSelectFiltroManejo("filtroManejoChegada", ordens.map(op => getValorManejoParaFiltro(op, "chegada")), "Todas");
  preencherSelectFiltroManejo("filtroManejoFalta", ordens.map(op => getValorManejoParaFiltro(op, "falta")), "Todas");
  preencherSelectFiltroManejo("filtroManejoProducao", ordens.map(op => getValorManejoParaFiltro(op, "producao")), "Todas");
  preencherSelectFiltroManejo("filtroManejoCelu", [
    ...ordens.map(op => getValorManejoParaFiltro(op, "celu")),
    ...state.celusManejoExtras
  ], "Todos");
  preencherSelectFiltroManejo("filtroManejoNecessidade", ordens.map(op => getValorManejoParaFiltro(op, "necessidade")), "Todas");
}


function numeroQuantidadeOP(op) {
  const valor = Number(op?.quantidade || 0);
  return Number.isFinite(valor) ? valor : 0;
}

function numeroFaltaManejo(op) {
  const manejo = getManejoDaOrdem(op);
  const valor = Number(manejo?.falta || 0);
  return Number.isFinite(valor) ? valor : 0;
}

function formatarNumeroInteiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function agruparSomaManejo(ordens, obterNome) {
  const mapa = new Map();

  ordens.forEach(op => {
    const nome = String(obterNome(op) || "Sem informação").trim() || "Sem informação";
    const atual = mapa.get(nome) || { ops: 0, pecas: 0 };

    atual.ops += 1;
    atual.pecas += numeroQuantidadeOP(op);

    mapa.set(nome, atual);
  });

  return [...mapa.entries()]
    .map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => b.pecas - a.pecas || b.ops - a.ops || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
}

function renderTabelaSomaManejo(tbodyId, linhas) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!linhas.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Sem dados.</td></tr>`;
    return;
  }

  tbody.innerHTML = linhas.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.nome)}</strong></td>
      <td>${formatarNumeroInteiro(item.ops)}</td>
      <td>${formatarNumeroInteiro(item.pecas)}</td>
    </tr>
  `).join("");
}


function textoSelectSelecionado(id) {
  const select = document.getElementById(id);
  if (!select || !select.value) return "";

  const label = select.options[select.selectedIndex]?.textContent || select.value;
  return label.trim();
}

function getFiltrosManejoAtivosTexto() {
  const filtros = [
    ["Status", "filtroManejoStatus"],
    ["OP", "filtroManejoOP"],
    ["REF", "filtroManejoReferencia"],
    ["Silk", "filtroManejoSilk"],
    ["Data tecido", "filtroManejoDataTecido"],
    ["Fase", "filtroManejoFase"],
    ["QTI", "filtroManejoQuantidade"],
    ["Cor", "filtroManejoCor"],
    ["Data", "filtroManejoData"],
    ["Facção", "filtroManejoFaccao"],
    ["Chegada", "filtroManejoChegada"],
    ["Falta", "filtroManejoFalta"],
    ["Produção", "filtroManejoProducao"],
    ["CELU", "filtroManejoCelu"],
    ["Necessidade", "filtroManejoNecessidade"]
  ];

  const busca = document.getElementById("buscaManejoLinha")?.value?.trim();
  const ativos = filtros
    .map(([nome, id]) => {
      const valor = textoSelectSelecionado(id);
      return valor ? `${nome}: ${valor}` : "";
    })
    .filter(Boolean);

  if (busca) ativos.unshift(`Busca: ${busca}`);

  return ativos.length ? `Filtro: ${ativos.join(" + ")}` : "Filtro: todos os registros";
}


function renderResumoSomasManejo(ordens) {
  const totalOps = ordens.length;
  const totalPecas = ordens.reduce((soma, op) => soma + numeroQuantidadeOP(op), 0);
  const totalFalta = ordens.reduce((soma, op) => soma + numeroFaltaManejo(op), 0);
  const bipadas = ordens.filter(op => getStatusManejo(op) === "bipado").length;
  const organizadas = ordens.filter(op => getStatusManejo(op) === "organizada").length;
  const pendentes = ordens.filter(op => getStatusManejo(op) === "pendente").length;

  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  };

  setText("somaManejoOps", formatarNumeroInteiro(totalOps));
  setText("somaManejoPecas", formatarNumeroInteiro(totalPecas));
  setText("somaManejoFalta", formatarNumeroInteiro(totalFalta));
  setText("somaManejoStatus", `${formatarNumeroInteiro(bipadas)} bipadas | ${formatarNumeroInteiro(organizadas)} org. | ${formatarNumeroInteiro(pendentes)} pend.`);
  setText("somaManejoPecasCompacto", `${formatarNumeroInteiro(totalPecas)} peças`);
  setText("somaManejoFiltroAtivo", getFiltrosManejoAtivosTexto());
  setText(
    "somaManejoResumoCompacto",
    `${formatarNumeroInteiro(totalOps)} OPs | ${formatarNumeroInteiro(totalFalta)} falta | ${formatarNumeroInteiro(bipadas)} bipadas | ${formatarNumeroInteiro(organizadas)} org. | ${formatarNumeroInteiro(pendentes)} pend.`
  );

  renderTabelaSomaManejo("somaManejoFases", agruparSomaManejo(ordens, op => op.manejo?.fase || getManejoDaOrdem(op)?.fase || "Sem fase"));
  renderTabelaSomaManejo("somaManejoCores", agruparSomaManejo(ordens, op => op.cor || "Sem cor"));
}



function renderResumoSomasManejoPeloDOM() {
  const linhas = [...document.querySelectorAll("#listaManejoInline tr[data-manejo-row='1']")];

  if (!linhas.length) {
    renderResumoSomasManejo([]);
    return;
  }

  const ordensVisiveis = linhas.map(linha => {
    const qti = Number(linha.dataset.qti || 0);
    const falta = Number(linha.dataset.falta || 0);
    const status = linha.dataset.status || "pendente";
    const fase = linha.dataset.fase || "Sem fase";
    const cor = linha.dataset.cor || "Sem cor";

    return {
      quantidade: Number.isFinite(qti) ? qti : 0,
      cor,
      manejo: {
        falta: Number.isFinite(falta) ? falta : 0,
        fase
      },
      manejoStatus: status
    };
  });

  renderResumoSomasManejo(ordensVisiveis);
}


function getNecessidadeDaOrdem(op) {
  if (!op) return "";

  if (op.necessidade) return op.necessidade;
  if (op.previsaoEntrega) return op.previsaoEntrega;
  if (op.dataNecessidade) return op.dataNecessidade;
  if (op.dataEntrega) return op.dataEntrega;

  if (op.mes && op.ano && op.semana) {
    return `Semana ${op.semana} - ${op.mes}/${op.ano}`;
  }

  if (op.criadoEm && typeof op.criadoEm.toDate === "function") {
    return op.criadoEm.toDate().toLocaleDateString("pt-BR");
  }

  return "";
}

function getManejoDaOrdem(op) {
  if (!op) return null;

  if (op.manejo) {
    return {
      id: op.id,
      ...op.manejo
    };
  }

  return null;
}

function idLinhaManejo(op) {
  return `manejo-${docIdSeguro(op.id || op.numeroOP)}`;
}

function valorLinhaManejo(op, campo) {
  const el = document.getElementById(`${idLinhaManejo(op)}-${campo}`);
  return el ? el.value : "";
}

async function salvarManejoLinha(ordemId) {
  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const manejoExistente = getManejoDaOrdem(ordem);
  const fase = limparTexto(valorLinhaManejo(ordem, "fase")).toUpperCase();

  if (!fase) {
    toast("Informe a fase antes de salvar.");
    return;
  }

  const silkNome = limparTexto(valorLinhaManejo(ordem, "silkNome")).toUpperCase();
  const silkData = valorLinhaManejo(ordem, "silkData") || "";

  const manejo = {
    silk: silkNome,
    silkNome,
    silkData,
    dataTecido: valorLinhaManejo(ordem, "dataTecido") || "",
    fase,
    data: valorLinhaManejo(ordem, "data") || "",
    faccao: limparTexto(valorLinhaManejo(ordem, "faccao")).toUpperCase(),
    chegada: valorLinhaManejo(ordem, "chegada") || "",
    falta: Number(valorLinhaManejo(ordem, "falta") || 0),
    producao: valorLinhaManejo(ordem, "producao") || "",
    celu: limparTexto(valorLinhaManejo(ordem, "celu")),
    necessidade: getNecessidadeDaOrdem(ordem),
    coluna: "",
    status: "organizada",
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  if (!manejoExistente) {
    manejo.criadoPor = state.currentUser.uid;
    manejo.criadoEm = serverTimestamp();
  }

  try {
    await setDoc(doc(db, "ordensProducao", ordem.id), {
      manejo,
      manejoStatus: "organizada",
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog(
      manejoExistente ? "manejo_atualizado" : "manejo_criado",
      "ordemProducao",
      ordem.id,
      `OP ${ordem.numeroOP} | Ref. ${ordem.referencia} | Fase ${fase}`
    );

    toast("Manejo salvo. Você pode editar essa linha novamente quando precisar.");
  } catch (error) {
    console.error(error);

    if (error?.code === "permission-denied") {
      toast("Sem permissão para salvar manejo. Publique novamente as regras do firebase-rules.txt.");
    } else {
      toast(`Erro ao salvar manejo: ${error?.message || "verifique o console"}`);
    }
  }
}


async function biparManejoLinha(ordemId) {
  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const manejoExistente = getManejoDaOrdem(ordem) || {};
  const faseAtual = limparTexto(valorLinhaManejo(ordem, "fase")).toUpperCase() || manejoExistente.fase || "";

  if (!faseAtual) {
    const continuar = confirm("Essa OP ainda está sem fase preenchida. Deseja marcar como bipada mesmo assim?");
    if (!continuar) return;
  }

  const confirmar = confirm(`Marcar a OP ${ordem.numeroOP} como BIPADA/finalizada?`);
  if (!confirmar) return;

  const silkNome = limparTexto(valorLinhaManejo(ordem, "silkNome")).toUpperCase() || manejoExistente.silkNome || manejoExistente.silk || "";
  const silkData = valorLinhaManejo(ordem, "silkData") || manejoExistente.silkData || "";

  const manejo = {
    ...manejoExistente,
    silk: silkNome,
    silkNome,
    silkData,
    dataTecido: valorLinhaManejo(ordem, "dataTecido") || manejoExistente.dataTecido || "",
    fase: faseAtual,
    data: valorLinhaManejo(ordem, "data") || manejoExistente.data || "",
    faccao: limparTexto(valorLinhaManejo(ordem, "faccao")).toUpperCase() || manejoExistente.faccao || "",
    chegada: valorLinhaManejo(ordem, "chegada") || manejoExistente.chegada || "",
    falta: Number(valorLinhaManejo(ordem, "falta") || manejoExistente.falta || 0),
    producao: valorLinhaManejo(ordem, "producao") || manejoExistente.producao || "",
    celu: limparTexto(valorLinhaManejo(ordem, "celu")) || manejoExistente.celu || "",
    necessidade: getNecessidadeDaOrdem(ordem),
    coluna: "",
    status: "bipado",
    bipado: true,
    bipadoPor: state.currentUser.uid,
    bipadoEm: serverTimestamp(),
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  if (!manejoExistente?.criadoEm) {
    manejo.criadoPor = state.currentUser.uid;
    manejo.criadoEm = serverTimestamp();
  }

  try {
    await setDoc(doc(db, "ordensProducao", ordem.id), {
      manejo,
      manejoStatus: "bipado",
      bipado: true,
      bipadoPor: state.currentUser.uid,
      bipadoEm: serverTimestamp(),
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog("op_bipada", "ordemProducao", ordem.id, `OP ${ordem.numeroOP} | Ref. ${ordem.referencia} | Cor ${ordem.cor || "-"} | Fase ${faseAtual || "-"}`);
    toast("OP marcada como bipada/finalizada.");
  } catch (error) {
    console.error(error);
    toast("Erro ao marcar OP como bipada.");
  }
}


async function limparManejoLinha(ordemId) {
  if (!ehAdmin()) {
    toast("Apenas admin pode limpar manejo.");
    return;
  }

  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) return;

  const manejo = getManejoDaOrdem(ordem);
  if (!manejo) return;

  if (!confirm(`Limpar o manejo da OP ${ordem.numeroOP}?`)) return;

  try {
    await setDoc(doc(db, "ordensProducao", ordem.id), {
      manejo: null,
      manejoStatus: "pendente",
      bipado: false,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog("manejo_excluido", "ordemProducao", ordem.id, `OP ${ordem.numeroOP} | Fase ${manejo.fase || "-"}`);
    toast("Manejo limpo.");
  } catch (error) {
    console.error(error);
    toast("Erro ao limpar manejo.");
  }
}

function bipadoBadgeTexto(op) {
  return getStatusManejo(op) === "bipado" ? "Bipado ✓" : "Bipar";
}

function manejoStatusBadge(manejo, op = null) {
  const status = op ? getStatusManejo(op) : (manejo?.bipado || manejo?.status === "bipado" ? "bipado" : manejo ? "organizada" : "pendente");

  if (status === "bipado") {
    return `<span class="badge bipado">Bipado</span>`;
  }

  if (status === "organizada") {
    return `<span class="badge ok">Organizada</span>`;
  }

  return `<span class="badge pending">Pendente</span>`;
}



function carregarListaLocalManejo(chave) {
  try {
    const salvo = JSON.parse(localStorage.getItem(chave) || "[]");
    return Array.isArray(salvo)
      ? salvo.map(item => String(item || "").trim().toUpperCase()).filter(Boolean)
      : [];
  } catch (error) {
    return [];
  }
}

function salvarListaLocalManejo(chave, lista) {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
  } catch (error) {
    console.warn("Não foi possível salvar sugestões localmente.", error);
  }
}

function carregarSugestoesExtrasManejo() {
  state.fasesManejoExtras = carregarListaLocalManejo("fasesManejoExtras");
  state.faccoesManejoExtras = carregarListaLocalManejo("faccoesManejoExtras");
  state.celusManejoExtras = carregarListaLocalManejo("celusManejoExtras");
}

function adicionarSugestaoManejo(ordemId, campo, listaState, chaveStorage, nomeCampo) {
  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const valor = limparTexto(valorLinhaManejo(ordem, campo)).toUpperCase();

  if (!valor) {
    toast(`Digite ${nomeCampo} antes de adicionar.`);
    return;
  }

  if (!state[listaState].includes(valor)) {
    state[listaState].push(valor);
    state[listaState].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    salvarListaLocalManejo(chaveStorage, state[listaState]);
  }

  renderDatalistManejo();
  renderProcessos();
  renderFiltrosColunasManejo();
  toast(`${nomeCampo} "${valor}" adicionada às sugestões.`);
}

function adicionarFaseSugestao(ordemId) {
  adicionarSugestaoManejo(ordemId, "fase", "fasesManejoExtras", "fasesManejoExtras", "Fase");
}

function adicionarFaccaoSugestao(ordemId) {
  adicionarSugestaoManejo(ordemId, "faccao", "faccoesManejoExtras", "faccoesManejoExtras", "Facção");
}

function adicionarCeluSugestao(ordemId) {
  adicionarSugestaoManejo(ordemId, "celu", "celusManejoExtras", "celusManejoExtras", "CELU");
}

function renderDatalistManejo() {
  const fasesList = document.getElementById("manejoFasesList");
  const faccaoList = document.getElementById("manejoFaccaoList");
  const celuList = document.getElementById("manejoCeluList");
  const silkNomesList = document.getElementById("manejoSilkNomesList");

  if (fasesList) {
    const fases = new Set();

    state.fasesManejoExtras.forEach(fase => {
      if (fase) fases.add(String(fase).toUpperCase());
    });

    state.ordens.forEach(op => {
      if (op.manejo?.fase) fases.add(String(op.manejo.fase).toUpperCase());
    });

    fasesList.innerHTML = [...fases].sort().map(fase => `<option value="${escapeHtml(fase)}"></option>`).join("");
  }

  if (faccaoList) {
    const faccoes = new Set();

    state.faccoesManejoExtras.forEach(faccao => {
      if (faccao) faccoes.add(String(faccao).toUpperCase());
    });

    state.ordens.forEach(op => {
      if (op.manejo?.faccao) faccoes.add(String(op.manejo.faccao).toUpperCase());
    });

    faccaoList.innerHTML = [...faccoes].sort().map(faccao => `<option value="${escapeHtml(faccao)}"></option>`).join("");
  }

  if (celuList) {
    const celus = new Set();

    state.celusManejoExtras.forEach(celu => {
      if (celu) celus.add(String(celu).toUpperCase());
    });

    state.ordens.forEach(op => {
      if (op.manejo?.celu) celus.add(String(op.manejo.celu).toUpperCase());
    });

    celuList.innerHTML = [...celus].sort().map(celu => `<option value="${escapeHtml(celu)}"></option>`).join("");
  }

  if (silkNomesList) {
    const nomes = new Set();

    state.ordens.forEach(op => {
      const nome = getSilkNomeManejo(op.manejo);
      if (nome) nomes.add(nome);
    });

    silkNomesList.innerHTML = [...nomes].sort().map(nome => `<option value="${escapeHtml(nome)}"></option>`).join("");
  }
}

function renderManejos() {
  renderManejoInline();
}

function editarManejo(id) {
  abrirPagina("manejo");
  const busca = document.getElementById("buscaManejoLinha");
  const op = state.ordens.find(ordem => String(ordem.id) === String(id) || String(ordem.numeroOP) === String(id));

  if (busca && op) {
    busca.value = op.numeroOP || "";
    renderManejoInline();
  }
}

async function excluirManejo(id) {
  await limparManejoLinha(id);
}

function iniciarManejoParaOrdem(ordemId) {
  abrirPagina("manejo");
  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) return;

  const busca = document.getElementById("buscaManejoLinha");
  if (busca) {
    busca.value = ordem.numeroOP || "";
    renderManejoInline();
  }
}

function filtrarManejosPorOP(numeroOP) {
  abrirPagina("manejo");
  const busca = document.getElementById("buscaManejoLinha");
  if (busca) {
    busca.value = numeroOP;
    renderManejoInline();
  }
}

function formatarDataSimples(valor) {
  if (!valor) return "-";
  const partes = String(valor).split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return escapeHtml(valor);
}



function configurarProcessos() {
  const busca = document.getElementById("buscaProcessos");
  if (busca) {
    busca.addEventListener("input", renderProcessos);
  }

  [
    "processoFiltroStatus",
    "processoFiltroReferencia",
    "processoFiltroCor",
    "processoFiltroFase",
    "processoFiltroFaccao",
    "processoFiltroCelu",
    "processoFiltroNecessidade"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderProcessos);
  });

  const limpar = document.getElementById("btnLimparFiltrosProcessos");
  if (limpar) {
    limpar.addEventListener("click", () => {
      limparFiltrosProcessos();
      renderProcessos();
    });
  }

  const imprimir = document.getElementById("btnImprimirProcessosFiltrados");
  if (imprimir) {
    imprimir.addEventListener("click", imprimirProcessosFiltrados);
  }
}

function preencherSelectProcessos(id, valores, labelTodos = "Todos") {
  const select = document.getElementById(id);
  if (!select) return;

  const atual = select.value;
  const limpos = [...new Set(valores.map(valor => String(valor ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  select.innerHTML = `<option value="">${labelTodos}</option>` + limpos.map(valor => {
    return `<option value="${escapeHtml(valor)}">${escapeHtml(valor)}</option>`;
  }).join("");

  if (limpos.includes(atual)) select.value = atual;
}

function renderFiltrosProcessos() {
  const ordens = [...state.ordens];

  preencherSelectProcessos("processoFiltroReferencia", ordens.map(op => op.referencia), "Todas");
  preencherSelectProcessos("processoFiltroCor", ordens.map(op => op.cor), "Todas");
  preencherSelectProcessos("processoFiltroFase", [
    ...ordens.map(op => getManejoDaOrdem(op)?.fase || ""),
    ...(state.fasesManejoExtras || [])
  ], "Todas");
  preencherSelectProcessos("processoFiltroFaccao", [
    ...ordens.map(op => getManejoDaOrdem(op)?.faccao || ""),
    ...(state.faccoesManejoExtras || [])
  ], "Todas");
  preencherSelectProcessos("processoFiltroCelu", [
    ...ordens.map(op => getManejoDaOrdem(op)?.celu || ""),
    ...(state.celusManejoExtras || [])
  ], "Todos");
  preencherSelectProcessos("processoFiltroNecessidade", ordens.map(op => getNecessidadeDaOrdem(op)), "Todas");
}

function getFiltrosProcessos() {
  return {
    busca: normalizarTexto(document.getElementById("buscaProcessos")?.value || ""),
    status: document.getElementById("processoFiltroStatus")?.value || "",
    referencia: document.getElementById("processoFiltroReferencia")?.value || "",
    cor: document.getElementById("processoFiltroCor")?.value || "",
    fase: document.getElementById("processoFiltroFase")?.value || "",
    faccao: document.getElementById("processoFiltroFaccao")?.value || "",
    celu: document.getElementById("processoFiltroCelu")?.value || "",
    necessidade: document.getElementById("processoFiltroNecessidade")?.value || ""
  };
}

function filtrarOrdensProcessos() {
  const filtros = getFiltrosProcessos();

  return [...state.ordens].filter(op => {
    const manejo = getManejoDaOrdem(op);
    const status = getStatusManejo(op);
    const necessidade = getNecessidadeDaOrdem(op);

    const texto = normalizarTexto([
      op.numeroOP,
      op.numeroOPExterno,
      op.referencia,
      op.cor,
      op.produtoNome,
      op.quantidade,
      necessidade,
      manejo?.fase,
      manejo?.faccao,
      manejo?.celu,
      manejo?.silkNome,
      manejo?.silk,
      status
    ].join(" "));

    if (filtros.busca && !texto.includes(filtros.busca)) return false;
    if (filtros.status && status !== filtros.status) return false;
    if (filtros.referencia && String(op.referencia || "") !== filtros.referencia) return false;
    if (filtros.cor && String(op.cor || "") !== filtros.cor) return false;
    if (filtros.fase && String(manejo?.fase || "") !== filtros.fase) return false;
    if (filtros.faccao && String(manejo?.faccao || "") !== filtros.faccao) return false;
    if (filtros.celu && String(manejo?.celu || "") !== filtros.celu) return false;
    if (filtros.necessidade && String(necessidade || "") !== filtros.necessidade) return false;

    return true;
  });
}

function limparFiltrosProcessos() {
  [
    "buscaProcessos",
    "processoFiltroStatus",
    "processoFiltroReferencia",
    "processoFiltroCor",
    "processoFiltroFase",
    "processoFiltroFaccao",
    "processoFiltroCelu",
    "processoFiltroNecessidade"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function renderResumoProcessos(ordens) {
  const totalOps = ordens.length;
  const totalPecas = ordens.reduce((soma, op) => soma + numeroQuantidadeOP(op), 0);
  const totalFalta = ordens.reduce((soma, op) => soma + numeroFaltaManejo(op), 0);
  const bipadas = ordens.filter(op => getStatusManejo(op) === "bipado").length;
  const organizadas = ordens.filter(op => getStatusManejo(op) === "organizada").length;
  const pendentes = ordens.filter(op => getStatusManejo(op) === "pendente").length;

  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  };

  setText("processosTotalOps", totalOps.toLocaleString("pt-BR"));
  setText("processosTotalPecas", totalPecas.toLocaleString("pt-BR"));
  setText("processosTotalFalta", totalFalta.toLocaleString("pt-BR"));
  setText("processosOrganizadas", organizadas.toLocaleString("pt-BR"));
  setText("processosBipadas", bipadas.toLocaleString("pt-BR"));
  setText("processosPendentes", pendentes.toLocaleString("pt-BR"));
}


function getTextoFiltrosProcessosAtivos() {
  const filtros = [
    ["Status", "processoFiltroStatus"],
    ["Referência", "processoFiltroReferencia"],
    ["Cor", "processoFiltroCor"],
    ["Fase", "processoFiltroFase"],
    ["Facção", "processoFiltroFaccao"],
    ["CELU", "processoFiltroCelu"],
    ["Necessidade", "processoFiltroNecessidade"]
  ];

  const busca = document.getElementById("buscaProcessos")?.value?.trim();
  const ativos = filtros.map(([nome, id]) => {
    const el = document.getElementById(id);
    if (!el || !el.value) return "";
    const texto = el.options?.[el.selectedIndex]?.textContent || el.value;
    return `${nome}: ${texto}`;
  }).filter(Boolean);

  if (busca) ativos.unshift(`Busca: ${busca}`);

  return ativos.length ? `Filtro: ${ativos.join(" + ")}` : "Filtro: todos os processos";
}

function imprimirProcessosFiltrados() {
  const ordens = filtrarOrdensProcessos();

  if (!ordens.length) {
    toast("Nenhum processo filtrado para imprimir.");
    return;
  }

  const totalPecas = ordens.reduce((soma, op) => soma + numeroQuantidadeOP(op), 0);
  const totalFalta = ordens.reduce((soma, op) => soma + numeroFaltaManejo(op), 0);
  const filtroAtivo = getTextoFiltrosProcessosAtivos();
  const dataImpressao = new Date().toLocaleString("pt-BR");

  const linhasTabela = ordens.map(op => {
    const manejo = getManejoDaOrdem(op);
    return `
      <tr>
        <td>${escapeHtml(op.numeroOP || "-")}</td>
        <td>${escapeHtml(op.referencia || "-")}</td>
        <td>${escapeHtml(op.cor || "-")}</td>
        <td class="num">${escapeHtml(op.quantidade ?? 0)}</td>
        <td>${escapeHtml(getNecessidadeDaOrdem(op) || "-")}</td>
        <td>${escapeHtml(manejo?.fase || "-")}</td>
        <td>${escapeHtml(manejo?.faccao || "-")}</td>
        <td>${escapeHtml(formatarDataSimples(manejo?.chegada || ""))}</td>
        <td class="num">${escapeHtml(manejo?.falta ?? 0)}</td>
        <td>${escapeHtml(formatarDataSimples(manejo?.producao || ""))}</td>
        <td>${escapeHtml(manejo?.celu || "-")}</td>
        <td>${escapeHtml(getStatusManejo(op) === "bipado" ? "Bipado" : getStatusManejo(op) === "organizada" ? "Organizada" : "Pendente")}</td>
      </tr>
    `;
  }).join("");

  const htmlImpressao = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Impressão Processos</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 18px; font-size: 11px; }
          .print-header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          .muted { color: #475569; font-size: 11px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
          .summary div { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
          .summary span { display: block; color: #475569; font-size: 10px; }
          .summary strong { display: block; font-size: 15px; margin-top: 3px; }
          .filter-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; margin-bottom: 12px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 4px; vertical-align: top; }
          th { background: #eef2ff; font-size: 10px; text-align: left; }
          td.num { text-align: right; font-weight: bold; }
          tr:nth-child(even) td { background: #f8fafc; }
          @page { size: landscape; margin: 10mm; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div>
            <h1>Processos - Itens filtrados</h1>
            <div class="muted">Sistema OP Confecção</div>
          </div>
          <div class="muted">Impresso em:<br><strong>${escapeHtml(dataImpressao)}</strong></div>
        </div>

        <div class="filter-box"><strong>${escapeHtml(filtroAtivo)}</strong></div>

        <div class="summary">
          <div><span>OPs</span><strong>${ordens.length.toLocaleString("pt-BR")}</strong></div>
          <div><span>Total de peças</span><strong>${totalPecas.toLocaleString("pt-BR")}</strong></div>
          <div><span>Total em falta</span><strong>${totalFalta.toLocaleString("pt-BR")}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>OP</th>
              <th>REF</th>
              <th>Cor</th>
              <th>QTI</th>
              <th>Necessidade</th>
              <th>Fase</th>
              <th>Facção</th>
              <th>Chegada</th>
              <th>Falta</th>
              <th>Produção</th>
              <th>CELU</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${linhasTabela}</tbody>
        </table>

        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;

  const janela = window.open("", "_blank");
  if (!janela) {
    toast("O navegador bloqueou a impressão. Permita pop-ups para este site.");
    return;
  }

  janela.document.open();
  janela.document.write(htmlImpressao);
  janela.document.close();
}


function renderProcessos() {
  const tbody = document.getElementById("listaProcessos");
  if (!tbody) return;

  renderFiltrosProcessos();

  const ordens = filtrarOrdensProcessos();
  renderResumoProcessos(ordens);

  if (!ordens.length) {
    tbody.innerHTML = `<tr><td colspan="13" class="empty">Nenhum processo encontrado com os filtros selecionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordens.map(op => {
    const manejo = getManejoDaOrdem(op);
    const silkNome = getSilkNomeManejo(manejo);
    const silkTexto = silkNome || manejo?.silkData
      ? `${silkNome || "-"}${manejo?.silkData ? ` | ${formatarDataSimples(manejo.silkData)}` : ""}`
      : "-";

    return `
      <tr class="${getStatusManejo(op) === "bipado" ? "processo-bipado" : manejo ? "processo-organizado" : "processo-pendente"}">
        <td><strong>${escapeHtml(op.numeroOP || "-")}</strong></td>
        <td>${escapeHtml(op.referencia || "-")}</td>
        <td><strong>${escapeHtml(op.cor || "-")}</strong></td>
        <td class="num">${escapeHtml(op.quantidade ?? 0)}</td>
        <td>${escapeHtml(getNecessidadeDaOrdem(op) || "-")}</td>
        <td>${escapeHtml(manejo?.fase || "-")}</td>
        <td>${escapeHtml(manejo?.faccao || "-")}</td>
        <td>${escapeHtml(formatarDataSimples(manejo?.chegada || ""))}</td>
        <td class="num">${escapeHtml(manejo?.falta ?? 0)}</td>
        <td>${escapeHtml(formatarDataSimples(manejo?.producao || ""))}</td>
        <td>${escapeHtml(manejo?.celu || "-")}</td>
        <td>${escapeHtml(silkTexto)}</td>
        <td>${manejoStatusBadge(manejo, op)}</td>
      </tr>
    `;
  }).join("");
}


function configurarRelatorios() {
  document.querySelectorAll(".report-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".report-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.relatorioAtual = btn.dataset.relatorio;
      renderRelatorio();
    });
  });

  document.getElementById("btnAplicarFiltros").addEventListener("click", renderRelatorio);

  document.getElementById("btnLimparFiltros").addEventListener("click", () => {
    document.getElementById("filtroSemana").value = "";
    document.getElementById("filtroMes").value = "";
    document.getElementById("filtroAno").value = "";
    document.getElementById("filtroReferencia").value = "";
    document.getElementById("filtroCor").value = "";
    renderRelatorio();
  });

  document.getElementById("btnExportarCSV").addEventListener("click", exportarCSV);
  document.getElementById("btnImprimir").addEventListener("click", () => window.print());
}

function getOrdensRelatorio() {
  const info = reportInfo[state.relatorioAtual];
  let ordens = [...state.ordens];

  if (info.tipo === "especifico") {
    ordens = ordens.filter(op => Boolean(op[info.campo]));
  }

  if (info.tipo === "bipado") {
    ordens = ordens.filter(op => getStatusManejo(op) === "bipado");
  }

  const semana = document.getElementById("filtroSemana").value;
  const mes = document.getElementById("filtroMes").value;
  const ano = document.getElementById("filtroAno").value;
  const referencia = normalizarReferencia(document.getElementById("filtroReferencia").value);
  const cor = normalizarCor(document.getElementById("filtroCor").value);

  if (semana) ordens = ordens.filter(op => String(op.semana) === String(semana));
  if (mes) ordens = ordens.filter(op => op.mes === mes);
  if (ano) ordens = ordens.filter(op => String(op.ano) === String(ano));
  if (referencia) ordens = ordens.filter(op => String(op.referencia).includes(referencia));
  if (cor) ordens = ordens.filter(op => normalizarCor(op.cor).includes(cor));

  return ordens.sort((a, b) => {
    if (Number(a.ano) !== Number(b.ano)) return Number(a.ano) - Number(b.ano);
    if (a.mes !== b.mes) return ordemMes(a.mes) - ordemMes(b.mes);
    if (Number(a.semana) !== Number(b.semana)) return Number(a.semana) - Number(b.semana);
    return String(a.referencia).localeCompare(String(b.referencia));
  });
}

function ordemMes(mes) {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return meses.indexOf(mes) + 1;
}

function renderRelatorio() {
  const info = reportInfo[state.relatorioAtual];
  document.getElementById("tituloRelatorio").textContent = info.title;
  document.getElementById("subtituloRelatorio").textContent = info.subtitle;

  const thead = document.getElementById("cabecalhoRelatorio");
  const tbody = document.getElementById("corpoRelatorio");
  const ordens = getOrdensRelatorio();


  if (info.tipo === "bipado") {
    thead.innerHTML = `
      <tr>
        <th>OP</th>
        <th>Necessidade</th>
        <th>Referência</th>
        <th>Cor</th>
        <th>Produto</th>
        <th>Qtd.</th>
        <th>Fase</th>
        <th>Facção</th>
        <th>Produção</th>
        <th>CELU</th>
        <th>Status</th>
      </tr>
    `;

    if (!ordens.length) {
      tbody.innerHTML = `<tr><td colspan="11" class="empty">Nenhuma OP bipada encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = ordens.map(op => {
      const manejo = getManejoDaOrdem(op);
      return `
        <tr>
          <td><strong>${escapeHtml(op.numeroOP)}</strong></td>
          <td>${escapeHtml(getNecessidadeDaOrdem(op) || "-")}</td>
          <td>${escapeHtml(op.referencia)}</td>
          <td><strong>${escapeHtml(op.cor || "-")}</strong></td>
          <td>${escapeHtml(op.produtoNome || "-")}</td>
          <td>${escapeHtml(op.quantidade ?? 0)}</td>
          <td>${escapeHtml(manejo?.fase || "-")}</td>
          <td>${escapeHtml(manejo?.faccao || "-")}</td>
          <td>${escapeHtml(formatarDataSimples(manejo?.producao || ""))}</td>
          <td>${escapeHtml(manejo?.celu || "-")}</td>
          <td>${manejoStatusBadge(manejo, op)}</td>
        </tr>
      `;
    }).join("");

    return;
  }


  if (info.tipo === "bipado") {
    const linhas = [
      ["OP", "Necessidade", "Referência", "Cor", "Produto", "Quantidade", "Fase", "Facção", "Produção", "CELU", "Status"]
    ];

    ordens.forEach(op => {
      const manejo = getManejoDaOrdem(op);
      linhas.push([
        op.numeroOP,
        getNecessidadeDaOrdem(op) || "",
        op.referencia,
        op.cor || "",
        op.produtoNome || "",
        op.quantidade,
        manejo?.fase || "",
        manejo?.faccao || "",
        formatarDataSimples(manejo?.producao || ""),
        manejo?.celu || "",
        "Bipado"
      ]);
    });

    return linhas;
  }

  if (info.tipo === "geral") {
    thead.innerHTML = `
      <tr>
        <th>OP</th>
        <th>Necessidade</th>
        <th>Referência</th>
        <th>Cor</th>
        <th>Produto</th>
        <th>Qtd.</th>
        <th>Alça</th>
        <th>Bojo</th>
        <th>Renda</th>
        <th>Obs.</th>
      </tr>
    `;

    if (!ordens.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty">Nenhuma ordem encontrada para este relatório.</td></tr>`;
      return;
    }

    tbody.innerHTML = ordens.map(op => `
      <tr>
        <td><strong>${escapeHtml(op.numeroOP)}</strong></td>
        <td>${escapeHtml(getNecessidadeDaOrdem(op) || "-")}</td>
        <td>${escapeHtml(op.referencia)}</td>
        <td><strong>${escapeHtml(op.cor || "-")}</strong></td>
        <td>${escapeHtml(op.produtoNome)}</td>
        <td>${op.quantidade}</td>
        <td>${simNaoBadge(op.possuiAlca)}</td>
        <td>${simNaoBadge(op.possuiBojo)}</td>
        <td>${simNaoBadge(op.possuiRenda)}</td>
        <td>${escapeHtml(op.observacoes || "-")}</td>
      </tr>
    `).join("");

    return;
  }

  thead.innerHTML = `
    <tr>
      <th>OP</th>
      <th>Necessidade</th>
      <th>Referência</th>
      <th>Cor</th>
      <th>Quantidade</th>
      <th>${escapeHtml(info.coluna)}</th>
    </tr>
  `;

  if (!ordens.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhuma ordem encontrada para este relatório.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordens.map(op => `
    <tr>
      <td><strong>${escapeHtml(op.numeroOP)}</strong></td>
      <td>${escapeHtml(getNecessidadeDaOrdem(op) || "-")}</td>
      <td>${escapeHtml(op.referencia)}</td>
      <td><strong>${escapeHtml(op.cor || "-")}</strong></td>
      <td>${op.quantidade}</td>
      <td>${simNaoBadge(true)}</td>
    </tr>
  `).join("");
}

function configurarUsuarios() {
  document.getElementById("formUsuario").addEventListener("submit", async event => {
    event.preventDefault();

    if (!ehAdmin()) {
      toast("Apenas admin pode criar usuários.");
      return;
    }

    const nome = document.getElementById("usuarioNome").value.trim();
    const email = document.getElementById("usuarioEmail").value.trim();
    const senha = document.getElementById("usuarioSenha").value;
    const tipo = document.getElementById("usuarioTipo").value;

    if (!nome || !email || !senha || senha.length < 6) {
      toast("Preencha nome, e-mail e senha com pelo menos 6 caracteres.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);

      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nome,
        email,
        tipo,
        ativo: true,
        criadoPor: state.currentUser.uid,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

      await registrarLog("usuario_criado", "usuario", cred.user.uid, `${nome} | ${email} | ${tipo}`);
      await signOut(secondaryAuth);

      document.getElementById("formUsuario").reset();
      document.getElementById("usuarioTipo").value = "usuario";

      toast("Usuário criado com sucesso.");
    } catch (error) {
      console.error(error);
      toast("Erro ao criar usuário. Confira se o e-mail já existe.");
    }
  });
}

function renderUsuarios() {
  const tbody = document.getElementById("listaUsuarios");

  if (!state.usuarios.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.usuarios.map(usuario => `
    <tr>
      <td><strong>${escapeHtml(usuario.nome || "-")}</strong></td>
      <td>${escapeHtml(usuario.email || "-")}</td>
      <td>${usuario.tipo === "admin" ? "Admin" : "Usuário comum"}</td>
      <td>
        <span class="status-dot ${usuario.ativo ? "active" : "inactive"}">
          ${usuario.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm ${usuario.ativo ? "btn-warning" : "btn-success"}" onclick="alternarUsuario('${usuario.uid}', ${usuario.ativo ? "false" : "true"})">
          ${usuario.ativo ? "Desativar" : "Ativar"}
        </button>
      </td>
    </tr>
  `).join("");
}

async function alternarUsuario(uid, novoStatus) {
  if (!ehAdmin()) {
    toast("Apenas admin pode alterar usuários.");
    return;
  }

  if (uid === state.currentUser.uid && novoStatus === false) {
    toast("Você não pode desativar seu próprio usuário.");
    return;
  }

  try {
    await updateDoc(doc(db, "usuarios", uid), {
      ativo: novoStatus,
      atualizadoEm: serverTimestamp()
    });

    const usuario = state.usuarios.find(item => item.uid === uid);
    await registrarLog("usuario_status_alterado", "usuario", uid, `${usuario?.nome || uid} | status: ${novoStatus ? "ativo" : "inativo"}`);

    toast("Usuário atualizado.");
  } catch (error) {
    console.error(error);
    toast("Erro ao atualizar usuário.");
  }
}


function configurarLogs() {
  const busca = document.getElementById("buscaLog");
  if (busca) {
    busca.addEventListener("input", renderLogs);
  }

  const btn = document.getElementById("btnExportarLogs");
  if (btn) {
    btn.addEventListener("click", exportarLogsCSV);
  }
}

function renderLogs() {
  const tbody = document.getElementById("listaLogs");
  if (!tbody) return;

  if (!ehAdmin()) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Apenas admin pode visualizar logs.</td></tr>`;
    return;
  }

  const busca = normalizarTexto(document.getElementById("buscaLog")?.value || "");
  let logs = [...state.logs];

  if (busca) {
    logs = logs.filter(log => {
      const texto = normalizarTexto([
        log.usuarioNome,
        log.usuarioEmail,
        log.usuarioTipo,
        log.acao,
        log.tipoAlvo,
        log.alvoId,
        log.detalhes
      ].join(" "));
      return texto.includes(busca);
    });
  }

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum log encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.slice(0, 300).map(log => `
    <tr>
      <td>${escapeHtml(formatarDataHora(log.criadoEm))}</td>
      <td>
        <strong>${escapeHtml(log.usuarioNome || "-")}</strong><br>
        <small>${escapeHtml(log.usuarioEmail || "-")}</small>
      </td>
      <td><span class="log-action">${escapeHtml(labelAcaoLog(log.acao))}</span></td>
      <td>${escapeHtml(log.tipoAlvo || "-")}</td>
      <td>${escapeHtml(log.alvoId || "-")}</td>
      <td class="log-detail">${escapeHtml(log.detalhes || "-")}</td>
    </tr>
  `).join("");
}

function exportarLogsCSV() {
  if (!ehAdmin()) {
    toast("Apenas admin pode exportar logs.");
    return;
  }

  const logs = [...state.logs];

  if (!logs.length) {
    toast("Não há logs para exportar.");
    return;
  }

  const linhas = [
    ["Data/Hora", "Usuário", "E-mail", "Tipo usuário", "Ação", "Tipo alvo", "Item", "Detalhes"]
  ];

  logs.forEach(log => {
    linhas.push([
      formatarDataHora(log.criadoEm),
      log.usuarioNome || "",
      log.usuarioEmail || "",
      log.usuarioTipo || "",
      labelAcaoLog(log.acao),
      log.tipoAlvo || "",
      log.alvoId || "",
      log.detalhes || ""
    ]);
  });

  const csv = linhas
    .map(linha => linha.map(campo => `"${String(campo).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "logs-auditoria-op-confeccao.csv";
  link.click();

  URL.revokeObjectURL(url);
  registrarLog("logs_exportados", "auditoria", "logsAlteracoes", `${logs.length} logs exportados em CSV`);
}

async function registrarLog(acao, tipoAlvo, alvoId, detalhes = "") {
  if (!state.currentUser || !state.perfil) return;

  try {
    await addDoc(collection(db, "logsAlteracoes"), {
      acao,
      tipoAlvo,
      alvoId: String(alvoId || ""),
      detalhes: String(detalhes || ""),
      usuarioUid: state.currentUser.uid,
      usuarioNome: state.perfil.nome || "",
      usuarioEmail: state.perfil.email || state.currentUser.email || "",
      usuarioTipo: state.perfil.tipo || "",
      criadoEm: serverTimestamp()
    });
  } catch (error) {
    console.warn("Não foi possível registrar log:", error);
  }
}

function labelAcaoLog(acao) {
  const labels = {
    login: "Login",
    produto_criado: "Produto criado",
    produto_atualizado: "Produto atualizado",
    produto_excluido: "Produto excluído",
    ordem_criada: "OP criada",
    ordem_atualizada: "OP atualizada",
    ordem_excluida: "OP excluída",
    usuario_criado: "Usuário criado",
    usuario_status_alterado: "Status de usuário",
    backup_importado: "Backup importado",
    backup_exportado: "Backup exportado",
    relatorio_exportado: "Relatório exportado",
    logs_exportados: "Logs exportados",
    manejo_criado: "Manejo criado",
    manejo_atualizado: "Manejo atualizado",
    manejo_excluido: "Manejo excluído",
    pdf_importado: "PDF importado",
    ordens_zeradas: "Ordens zeradas"
  };

  return labels[acao] || acao || "-";
}

function formatarDataHora(valor) {
  if (!valor) return "-";
  const data = typeof valor.toDate === "function" ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}




function nomeMesPorDataISO(dataISO) {
  const match = String(dataISO || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return meses[Number(match[2]) - 1] || "";
}

function anoPorDataISO(dataISO) {
  const match = String(dataISO || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? Number(match[1]) : new Date().getFullYear();
}


function getConfiguracaoImportacaoPDF() {
  const tipoPeca = document.getElementById("pdfTipoPeca")?.value || "";
  const inicio = document.getElementById("pdfNecessidadeInicio")?.value || "";
  const fim = document.getElementById("pdfNecessidadeFim")?.value || "";

  if (!tipoPeca) {
    return { ok: false, mensagem: "Selecione se o PDF é de calcinha ou sutiã." };
  }

  if (!inicio || !fim) {
    return { ok: false, mensagem: "Informe a data inicial e a data final da necessidade." };
  }

  if (inicio > fim) {
    return { ok: false, mensagem: "A data inicial não pode ser maior que a data final." };
  }

  const necessidadeTexto = `${dataISOParaBR(inicio)} a ${dataISOParaBR(fim)}`;
  const tipoPecaLabel = tipoPeca === "sutia" ? "Sutiã" : "Calcinha";

  return {
    ok: true,
    tipoPeca,
    tipoPecaLabel,
    necessidadeInicio: inicio,
    necessidadeFim: fim,
    necessidadeTexto
  };
}


function configurarImportadorPDF() {
  const input = document.getElementById("inputImportarPDF");
  const confirmar = document.getElementById("btnConfirmarImportacaoPDF");
  const zerar = document.getElementById("btnZerarOrdens");

  if (input) {
    input.addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;

      if (!ehAdmin()) {
        toast("Apenas admin pode importar relatório PDF.");
        event.target.value = "";
        return;
      }

      const configPDF = getConfiguracaoImportacaoPDF();
      if (!configPDF.ok) {
        toast(configPDF.mensagem);
        event.target.value = "";
        return;
      }

      try {
        toast("Lendo PDF, aguarde...");
        const texto = await extrairTextoPDF(file);
        const registros = extrairOrdensDoRelatorioPDF(texto);

        state.pdfImportacaoPendente = registros;
        renderPreviewPDF(registros);

        if (registros.length) {
          toast(`${registros.length} ordens encontradas no PDF.`);
        } else {
          toast("Nenhuma ordem foi encontrada no PDF.");
        }
      } catch (error) {
        console.error(error);
        toast("Erro ao ler PDF. Verifique se o arquivo é um relatório válido.");
      }

      event.target.value = "";
    });
  }

  if (confirmar) {
    confirmar.addEventListener("click", importarPDFConfirmado);
  }

  if (zerar) {
    zerar.addEventListener("click", zerarOrdensProducao);
  }
}

function preencherCamposPDFImportacao() {
  // A importação por PDF agora usa o intervalo de necessidade no calendário.
  // Semana, mês e ano não são mais preenchidos manualmente nesta tela.
}

async function extrairTextoPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let textoFinal = "";

  for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
    const page = await pdf.getPage(pagina);
    const content = await page.getTextContent();

    const itens = content.items
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: Math.round(item.transform[5])
      }))
      .filter(item => String(item.str || "").trim());

    itens.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

    const linhas = [];
    let linhaAtual = [];
    let yAtual = null;

    for (const item of itens) {
      if (yAtual === null || Math.abs(item.y - yAtual) <= 2) {
        linhaAtual.push(item);
        yAtual = yAtual === null ? item.y : yAtual;
      } else {
        linhas.push(linhaAtual.sort((a, b) => a.x - b.x).map(i => i.str).join(" ").replace(/\s+/g, " ").trim());
        linhaAtual = [item];
        yAtual = item.y;
      }
    }

    if (linhaAtual.length) {
      linhas.push(linhaAtual.sort((a, b) => a.x - b.x).map(i => i.str).join(" ").replace(/\s+/g, " ").trim());
    }

    textoFinal += "\n" + linhas.join("\n") + "\n";
  }

  return textoFinal;
}

function extrairOrdensDoRelatorioPDF(texto) {
  const registros = [];
  const regex = /OP-Lote:\s*([^\n]+?)\s+Situação:[\s\S]*?Referência:\s*([^\n]+)\n[\s\S]*?COR\s*\/\s*TAMANHO[^\n]*\n([\s\S]*?)Planejado:\s*([\d.,]+)/g;
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const opLote = limparTexto(match[1]);
    const blocoCompleto = match[0] || "";
    const referenciaLinha = limparTexto(match[2]);
    const blocoCor = match[3] || "";
    const planejadoTexto = limparTexto(match[4]);

    const cadastro = extrairDataDoBloco(blocoCompleto, "Cadastro");
    const liberacao = extrairDataDoBloco(blocoCompleto, "Liberação");
    const previsaoEntrega = extrairDataDoBloco(blocoCompleto, "Previsão entrega");

    const refMatch = referenciaLinha.match(/^([^\s-]+)\s*-\s*(.+)$/);
    const referencia = normalizarReferencia(refMatch ? refMatch[1] : referenciaLinha);
    const produto = limparTexto(refMatch ? refMatch[2] : "");

    const corLinha = encontrarLinhaCor(blocoCor);
    const corMatch = corLinha.match(/^(\d{3,4})\s*-\s*(.+?)(?:\s+\d{1,4},\d{2}|\s+Planejado:|$)/);

    const corCodigo = corMatch ? limparTexto(corMatch[1]) : "";
    const cor = normalizarCor(corMatch ? corMatch[2] : corLinha);

    const partesOp = opLote.split("-").map(parte => parte.trim());
    const numeroOrdem = partesOp[0] || opLote;
    const lote = partesOp[1] || "";

    if (!numeroOrdem || !referencia || !cor || !planejadoTexto) continue;

    registros.push({
      numeroOP: numeroOrdem,
      opLote,
      lote,
      referencia,
      produto,
      corCodigo,
      cor,
      planejadoTexto,
      quantidade: numeroBrasileiroParaFloat(planejadoTexto),
      cadastro,
      liberacao,
      previsaoEntrega,
      necessidade: previsaoEntrega || cadastro || ""
    });
  }

  const unicos = new Map();

  for (const item of registros) {
    const chave = `${item.numeroOP}-${item.lote}-${item.referencia}-${item.cor}`;
    if (!unicos.has(chave)) {
      unicos.set(chave, item);
    }
  }

  return [...unicos.values()];
}

function dataBrasileiraParaISO(dataBR) {
  const match = String(dataBR || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function dataISOParaBR(dataISO) {
  const match = String(dataISO || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function extrairDataDoBloco(bloco, rotulo) {
  const regex = new RegExp(`${rotulo}:\\s*(\\d{2}\\/\\d{2}\\/\\d{4})`, "i");
  const match = String(bloco || "").match(regex);
  return match ? match[1] : "";
}

function encontrarLinhaCor(bloco) {
  const linhas = String(bloco || "").split(/\n/).map(limparTexto).filter(Boolean);
  return linhas.find(linha => /^\d{3,4}\s*-\s*/.test(linha)) || "";
}

function limparTexto(valor) {
  return String(valor || "").replace(/\s+/g, " ").trim();
}

function numeroBrasileiroParaFloat(valor) {
  const normalizado = String(valor || "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  return Number(normalizado || 0);
}

function renderPreviewPDF(registros) {
  const resumo = document.getElementById("pdfImportResumo");
  const wrap = document.getElementById("pdfPreviewWrap");
  const tbody = document.getElementById("pdfPreviewBody");
  const btnConfirmar = document.getElementById("btnConfirmarImportacaoPDF");

  if (!resumo || !wrap || !tbody || !btnConfirmar) return;

  if (!registros.length) {
    resumo.classList.remove("hidden");
    wrap.classList.add("hidden");
    btnConfirmar.disabled = true;
    resumo.innerHTML = "<strong>Nenhuma OP encontrada.</strong><br>Confira se o PDF está no formato correto.";
    tbody.innerHTML = "";
    return;
  }

  const referenciasExistentes = new Set(state.produtos.map(produto => normalizarReferencia(produto.referencia)));
  const refsNovas = [...new Set(registros.map(item => item.referencia).filter(ref => !referenciasExistentes.has(ref)))];

  resumo.classList.remove("hidden");
  wrap.classList.remove("hidden");
  btnConfirmar.disabled = false;

  const configPDF = getConfiguracaoImportacaoPDF();

  resumo.innerHTML = `
    <strong>Prévia do PDF:</strong><br>
    Ordens encontradas: ${registros.length}<br>
    Tipo: ${configPDF.ok ? configPDF.tipoPecaLabel : "Não informado"}<br>
    Necessidade: ${configPDF.ok ? configPDF.necessidadeTexto : "Não informada"}<br>
    Referências novas: ${refsNovas.length}${refsNovas.length ? ` (${refsNovas.slice(0, 12).join(", ")}${refsNovas.length > 12 ? "..." : ""})` : ""}
  `;

  tbody.innerHTML = registros.slice(0, 300).map(item => {
    const existe = referenciasExistentes.has(item.referencia);
    return `
      <tr>
        <td><strong>${escapeHtml(item.numeroOP)}</strong></td>
        <td>${escapeHtml(item.lote || "-")}</td>
        <td>${escapeHtml(item.referencia)}</td>
        <td>${escapeHtml(item.produto || "-")}</td>
        <td>${escapeHtml(item.cor)}</td>
        <td>${escapeHtml(item.planejadoTexto)}</td>
        <td>${escapeHtml(configPDF.ok ? configPDF.tipoPecaLabel : "-")}</td>
        <td>${escapeHtml(configPDF.ok ? configPDF.necessidadeTexto : "-")}</td>
        <td class="${existe ? "pdf-ok" : "pdf-missing"}">${existe ? "Cadastrada" : "Nova"}</td>
      </tr>
    `;
  }).join("");
}

async function importarPDFConfirmado() {
  if (!ehAdmin()) {
    toast("Apenas admin pode importar PDF.");
    return;
  }

  const registros = state.pdfImportacaoPendente || [];

  if (!registros.length) {
    toast("Nenhum PDF lido para importar.");
    return;
  }

  const criarProdutos = document.getElementById("pdfCriarProdutos").checked;
  const configPDF = getConfiguracaoImportacaoPDF();
  const semana = "";
  const mes = configPDF.ok ? nomeMesPorDataISO(configPDF.necessidadeInicio) : "";
  const ano = configPDF.ok ? anoPorDataISO(configPDF.necessidadeInicio) : new Date().getFullYear();

  if (!configPDF.ok) {
    toast(configPDF.mensagem);
    return;
  }

  const referenciasExistentes = new Set(state.produtos.map(produto => normalizarReferencia(produto.referencia)));
  const refsNovas = [...new Set(registros.map(item => item.referencia).filter(ref => !referenciasExistentes.has(ref)))];

  if (refsNovas.length && !criarProdutos) {
    toast("Existem referências novas. Marque a opção para cadastrar automaticamente ou cadastre antes.");
    return;
  }

  const confirmar = confirm(`Importar ${registros.length} ordens do PDF como ${configPDF.tipoPecaLabel}, com necessidade ${configPDF.necessidadeTexto}?`);
  if (!confirmar) return;

  try {
    let batch = writeBatch(db);
    let contador = 0;

    if (criarProdutos) {
      const mapaProdutosNovos = new Map();

      for (const item of registros) {
        if (!referenciasExistentes.has(item.referencia) && !mapaProdutosNovos.has(item.referencia)) {
          mapaProdutosNovos.set(item.referencia, item.produto || `Referência ${item.referencia}`);
        }
      }

      for (const [referencia, nome] of mapaProdutosNovos.entries()) {
        batch.set(doc(db, "produtos", docIdSeguro(referencia)), {
          referencia,
          nome,
          possuiAlca: false,
          possuiBojo: false,
          possuiRenda: false,
          cadastroPendente: true,
          statusCadastro: "pendente",
          pendencia: "Conferir se esta referência possui alça, bojo e renda/sutiã.",
          tipoPecaPadrao: configPDF.tipoPeca,
          tipoPecaPadraoLabel: configPDF.tipoPecaLabel,
          observacoes: `Cadastrado automaticamente pela importação de relatório externo PDF como ${configPDF.tipoPecaLabel}. Conferir alça, bojo e renda/sutiã.`,
          criadoPor: state.currentUser.uid,
          criadoEm: serverTimestamp(),
          atualizadoPor: state.currentUser.uid,
          atualizadoEm: serverTimestamp()
        }, { merge: true });

        contador++;
      }
    }

    for (const item of registros) {
      const produtoExistente = state.produtos.find(prod => normalizarReferencia(prod.referencia) === item.referencia);
      const referenciaPendente = !produtoExistente || Boolean(produtoExistente?.cadastroPendente) || produtoExistente?.statusCadastro === "pendente";

      const docId = docIdSeguro(`PDF-${item.numeroOP}-${item.lote || "SEMLOTE"}`);

      batch.set(doc(db, "ordensProducao", docId), {
        numeroOP: String(item.numeroOP),
        numeroOPExterno: String(item.numeroOP),
        loteExterno: String(item.lote || ""),
        opLoteExterno: item.opLote,
        referencia: item.referencia,
        cor: item.cor,
        corCodigo: item.corCodigo,
        produtoNome: produtoExistente?.nome || item.produto || `Referência ${item.referencia}`,
        semana,
        mes,
        ano,
        quantidade: item.quantidade,
        quantidadePlanejadaTexto: item.planejadoTexto,
        cadastroExterno: item.cadastro || "",
        liberacaoExterna: item.liberacao || "",
        previsaoEntrega: item.previsaoEntrega || "",
        tipoPeca: configPDF.tipoPeca,
        tipoPecaLabel: configPDF.tipoPecaLabel,
        necessidadeInicio: configPDF.necessidadeInicio,
        necessidadeFim: configPDF.necessidadeFim,
        necessidade: configPDF.necessidadeTexto,
        necessidadeOrigemPDF: item.necessidade || item.previsaoEntrega || "",
        possuiAlca: Boolean(produtoExistente?.possuiAlca),
        possuiBojo: Boolean(produtoExistente?.possuiBojo),
        possuiRenda: Boolean(produtoExistente?.possuiRenda),
        referenciaPendente,
        statusReferencia: referenciaPendente ? "pendente" : "conferida",
        pendencia: referenciaPendente ? "Referência nova cadastrada automaticamente. Conferir alça, bojo e renda/sutiã no cadastro do produto." : "",
        observacoes: `Importado do relatório externo PDF como ${configPDF.tipoPecaLabel}. Necessidade: ${configPDF.necessidadeTexto}. OP-Lote: ${item.opLote}.${referenciaPendente ? " Referência pendente de conferência." : ""}`,
        status: "aberta",
        origem: "pdf_externo",
        criadoPor: state.currentUser.uid,
        criadoEm: serverTimestamp(),
        atualizadoPor: state.currentUser.uid,
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      contador++;

      if (contador >= 430) {
        await batch.commit();
        batch = writeBatch(db);
        contador = 0;
      }
    }

    if (contador > 0) {
      await batch.commit();
    }

    await registrarLog("pdf_importado", "importacao", "relatorio-pdf", `${registros.length} ordens importadas do PDF como ${configPDF.tipoPecaLabel}. Necessidade: ${configPDF.necessidadeTexto}. Referências novas: ${refsNovas.length}.`);

    state.pdfImportacaoPendente = [];
    renderPreviewPDF([]);

    toast("PDF importado com sucesso.");
  } catch (error) {
    console.error(error);
    toast("Erro ao importar PDF para o Firestore.");
  }
}

async function zerarOrdensProducao() {
  if (!ehAdmin()) {
    toast("Apenas admin pode zerar ordens.");
    return;
  }

  if (!confirm("Tem certeza que deseja apagar TODAS as ordens de produção do Firestore?")) return;
  if (!confirm("Confirma novamente? Essa ação não apaga produtos, usuários nem logs, apenas ordens de produção.")) return;

  try {
    const snap = await getDocs(collection(db, "ordensProducao"));
    let batch = writeBatch(db);
    let contador = 0;
    let total = 0;

    for (const documento of snap.docs) {
      batch.delete(doc(db, "ordensProducao", documento.id));
      contador++;
      total++;

      if (contador >= 430) {
        await batch.commit();
        batch = writeBatch(db);
        contador = 0;
      }
    }

    if (contador > 0) {
      await batch.commit();
    }

    await setDoc(doc(db, "configuracoes", "sistema"), {
      ultimoNumeroOP: 0,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog("ordens_zeradas", "ordensProducao", "todas", `${total} ordens de produção foram removidas.`);

    toast(`${total} ordens de produção foram apagadas.`);
  } catch (error) {
    console.error(error);
    toast("Erro ao zerar ordens de produção.");
  }
}

function configurarBackup() {
  document.getElementById("inputImportarFirestore").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!ehAdmin()) {
      toast("Apenas admin pode importar dados.");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const backup = JSON.parse(reader.result);

        if (!Array.isArray(backup.produtos) || !Array.isArray(backup.ordens)) {
          throw new Error("Formato inválido.");
        }

        if (!confirm("Importar estes dados para o Firestore? Documentos com mesmo ID serão atualizados.")) return;

        await importarBackupFirestore(backup);
        await registrarLog("backup_importado", "importacao", "backup-json", `${backup.produtos.length} produtos e ${backup.ordens.length} ordens importados`);
        toast("Dados importados para o Firebase.");
      } catch (error) {
        console.error(error);
        toast("Erro ao importar backup.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  });

  document.getElementById("btnBaixarBackupAtual").addEventListener("click", baixarBackupAtual);
}

async function importarBackupFirestore(backup) {
  let batch = writeBatch(db);
  let contador = 0;

  for (const produto of backup.produtos) {
    const referencia = normalizarReferencia(produto.referencia);
    if (!referencia) continue;

    const produtoRef = doc(db, "produtos", docIdSeguro(referencia));

    batch.set(produtoRef, {
      referencia,
      nome: produto.nome || `Referência ${referencia}`,
      possuiAlca: Boolean(produto.possuiAlca),
      possuiBojo: Boolean(produto.possuiBojo),
      possuiRenda: Boolean(produto.possuiRenda),
      observacoes: produto.observacoes || "",
      importadoPor: state.currentUser.uid,
      importadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    contador++;
  }

  let maiorOP = 0;

  for (const op of backup.ordens) {
    const numeroOP = op.numeroOP || op.id || `OP-IMPORTADA-${Date.now()}-${contador}`;
    const match = String(numeroOP).match(/(\d+)$/);

    if (match) {
      maiorOP = Math.max(maiorOP, Number(match[1]));
    }

    const ordemRef = doc(db, "ordensProducao", docIdSeguro(numeroOP));

    batch.set(ordemRef, {
      numeroOP,
      referencia: normalizarReferencia(op.referencia),
      cor: normalizarCor(op.cor || extrairCorDeObservacao(op.observacoes)),
      produtoNome: op.produtoNome || `Referência ${op.referencia}`,
      semana: Number(op.semana || 1),
      mes: op.mes || "",
      ano: Number(op.ano || new Date().getFullYear()),
      quantidade: Number(op.quantidade || 0),
      possuiAlca: Boolean(op.possuiAlca),
      possuiBojo: Boolean(op.possuiBojo),
      possuiRenda: Boolean(op.possuiRenda),
      observacoes: op.observacoes || "",
      status: op.status || "aberta",
      importadoPor: state.currentUser.uid,
      importadoEm: serverTimestamp(),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    contador++;

    if (contador >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      contador = 0;
    }
  }

  if (contador > 0) {
    await batch.commit();
  }

  await setDoc(doc(db, "configuracoes", "sistema"), {
    ultimoNumeroOP: maiorOP,
    nomeSistema: "Sistema OP Confecção",
    atualizadoEm: serverTimestamp()
  }, { merge: true });
}

function baixarBackupAtual() {
  const backup = {
    produtos: state.produtos,
    ordens: state.ordens,
    usuarios: ehAdmin() ? state.usuarios.map(u => ({
      uid: u.uid,
      nome: u.nome,
      email: u.email,
      tipo: u.tipo,
      ativo: u.ativo
    })) : [],
    exportadoEm: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "backup-op-confeccao-firebase.json";
  link.click();

  URL.revokeObjectURL(url);
  registrarLog("backup_exportado", "exportacao", "backup-atual", `${state.produtos.length} produtos e ${state.ordens.length} ordens exportados`);
}

function renderTudo() {
  renderDashboard();
  renderProdutos();
  renderProdutosPendentes();
  renderOrdens();
  renderFiltrosColunasManejo();
  renderManejoInline();
  renderDatalistManejo();
  renderDatalistReferencias();
  renderDatalistCores();
  renderRelatorio();
  renderLogs();
  aplicarPermissoesTela();
}

function renderDashboard() {
  document.getElementById("totalProdutos").textContent = state.produtos.length;
  document.getElementById("totalOrdens").textContent = state.ordens.length;
  document.getElementById("totalRenda").textContent = state.ordens.filter(op => op.possuiRenda).length;
  document.getElementById("totalAlca").textContent = state.ordens.filter(op => op.possuiAlca).length;
  document.getElementById("totalBojo").textContent = state.ordens.filter(op => op.possuiBojo).length;
  const totalPendentesEl = document.getElementById("totalPendentes");
  if (totalPendentesEl) {
    totalPendentesEl.textContent = state.ordens.filter(op => op.referenciaPendente || op.statusReferencia === "pendente").length;
  }

  const ultimas = [...state.ordens].slice(0, 8);
  const tbody = document.getElementById("ultimasOrdens");

  if (!ultimas.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">Nenhuma ordem cadastrada ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = ultimas.map(op => `
    <tr>
      <td><strong>${escapeHtml(op.numeroOP)}</strong></td>
      <td>${escapeHtml(getNecessidadeDaOrdem(op) || "-")}</td>
      <td>${escapeHtml(op.referencia)}</td>
      <td><strong>${escapeHtml(op.cor || "-")}</strong></td>
      <td>${escapeHtml(op.produtoNome)}</td>
      <td>${op.quantidade}</td>
      <td>${simNaoBadge(op.possuiAlca)}</td>
      <td>${simNaoBadge(op.possuiBojo)}</td>
      <td>${simNaoBadge(op.possuiRenda)}</td>
      <td>${statusReferenciaBadge(op)}</td>
    </tr>
  `).join("");
}

function renderProdutos() {
  const busca = normalizarReferencia(document.getElementById("buscaProduto")?.value || "");
  let produtos = [...state.produtos];

  if (busca) {
    produtos = produtos.filter(p => String(p.referencia).includes(busca) || String(p.nome).toUpperCase().includes(busca));
  }

  produtos.sort((a, b) => String(a.referencia).localeCompare(String(b.referencia)));

  const tbody = document.getElementById("listaProdutos");

  if (!produtos.length) {
    tbody.innerHTML = `<tr><td colspan="${ehAdmin() ? 7 : 6}" class="empty">Nenhum produto cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = produtos.map(produto => `
    <tr>
      <td><strong>${escapeHtml(produto.referencia)}</strong></td>
      <td>${escapeHtml(produto.nome)}</td>
      <td>${simNaoBadge(produto.possuiAlca)}</td>
      <td>${simNaoBadge(produto.possuiBojo)}</td>
      <td>${simNaoBadge(produto.possuiRenda)}</td>
      <td>${statusProdutoBadge(produto)}</td>
      ${ehAdmin() ? `<td>
        <button class="btn btn-sm" onclick="editarProduto('${produto.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="excluirProduto('${produto.id}')">Excluir</button>
      </td>` : ""}
    </tr>
  `).join("");
}


function renderProdutosPendentes() {
  const tbody = document.getElementById("listaProdutosPendentes");
  const totalEl = document.getElementById("totalProdutosPendentes");

  if (!tbody || !totalEl) return;

  const pendentes = state.produtos
    .filter(produto => Boolean(produto.cadastroPendente) || produto.statusCadastro === "pendente")
    .sort((a, b) => String(a.referencia).localeCompare(String(b.referencia)));

  totalEl.textContent = `${pendentes.length} pendente${pendentes.length === 1 ? "" : "s"}`;

  if (!pendentes.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Nenhuma referência pendente no momento.</td></tr>`;
    return;
  }

  tbody.innerHTML = pendentes.map(produto => {
    const totalOps = state.ordens.filter(op => {
      return normalizarReferencia(op.referencia) === normalizarReferencia(produto.referencia)
        && (op.referenciaPendente || op.statusReferencia === "pendente");
    }).length;

    return `
      <tr>
        <td><strong>${escapeHtml(produto.referencia)}</strong></td>
        <td>${escapeHtml(produto.nome || "-")}</td>
        <td>${totalOps}</td>
        <td>${escapeHtml(produto.pendencia || "Conferir alça, bojo e renda/sutiã.")}</td>
        <td>
          ${ehAdmin() ? `<button class="btn btn-sm btn-primary" onclick="conferirReferenciaPendente('${produto.id}')">Conferir</button>` : ""}
          <button class="btn btn-sm" onclick="verOrdensDaReferencia('${escapeHtml(produto.referencia)}')">Ver OPs</button>
        </td>
      </tr>
    `;
  }).join("");
}

function conferirReferenciaPendente(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode conferir referências pendentes.");
    return;
  }

  editarProduto(id);
  toast("Marque alça, bojo e renda/sutiã. Ao salvar, as OPs dessa referência serão atualizadas.");
}

function verOrdensDaReferencia(referencia) {
  abrirPagina("ordens");
  const busca = document.getElementById("buscaOrdem");

  if (busca) {
    busca.value = normalizarReferencia(referencia);
    renderOrdens();
  }
}

function renderOrdens() {
  const busca = normalizarReferencia(document.getElementById("buscaOrdem")?.value || "");
  let ordens = [...state.ordens];

  if (busca) {
    ordens = ordens.filter(op => {
      return String(op.numeroOP).toUpperCase().includes(busca) ||
        String(op.referencia).includes(busca) ||
        String(op.cor || "").toUpperCase().includes(busca) ||
        normalizarTexto(getNecessidadeDaOrdem(op)).includes(normalizarTexto(busca)) ||
        String(op.produtoNome).toUpperCase().includes(busca);
    });
  }

  const tbody = document.getElementById("listaOrdens");

  if (!ordens.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty">Nenhuma ordem cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordens.map(op => `
    <tr>
      <td><strong>${escapeHtml(op.numeroOP)}</strong></td>
      <td>Semana ${op.semana}</td>
      <td>${escapeHtml(op.mes)}/${op.ano}</td>
      <td>${escapeHtml(op.referencia)}</td>
      <td><strong>${escapeHtml(op.cor || "-")}</strong></td>
      <td>${escapeHtml(op.produtoNome)}</td>
      <td>${op.quantidade}</td>
      <td>${simNaoBadge(op.possuiAlca)}</td>
      <td>${simNaoBadge(op.possuiBojo)}</td>
      <td>${simNaoBadge(op.possuiRenda)}</td>
      <td>${statusReferenciaBadge(op)}</td>
      <td>
        <button class="btn btn-sm" onclick="editarOrdem('${op.id}')">Editar</button>
        ${ehAdmin() ? `<button class="btn btn-sm btn-danger" onclick="excluirOrdem('${op.id}')">Excluir</button>` : ""}
      </td>
    </tr>
  `).join("");
}

function renderDatalistReferencias() {
  const datalist = document.getElementById("referenciasList");

  datalist.innerHTML = state.produtos.map(produto => {
    return `<option value="${escapeHtml(produto.referencia)}">${escapeHtml(produto.nome)}</option>`;
  }).join("");
}

function renderDatalistCores() {
  const datalist = document.getElementById("coresList");
  const cores = [...new Set(state.ordens.map(op => normalizarCor(op.cor)).filter(Boolean))].sort();

  datalist.innerHTML = cores.map(cor => `<option value="${escapeHtml(cor)}"></option>`).join("");
}

function getLinhasCSVRelatorio(ordens) {
  const info = reportInfo[state.relatorioAtual];

  if (info.tipo === "geral") {
    const linhas = [
      ["OP", "Necessidade", "Referência", "Cor", "Produto", "Quantidade", "Alça", "Bojo", "Renda", "Observações"]
    ];

    ordens.forEach(op => {
      linhas.push([
        op.numeroOP,
        getNecessidadeDaOrdem(op) || "",
        op.referencia,
        op.cor || "",
        op.produtoNome,
        op.quantidade,
        op.possuiAlca ? "Sim" : "Não",
        op.possuiBojo ? "Sim" : "Não",
        op.possuiRenda ? "Sim" : "Não",
        op.observacoes || ""
      ]);
    });

    return linhas;
  }

  const linhas = [
    ["OP", "Necessidade", "Referência", "Cor", "Quantidade", info.coluna]
  ];

  ordens.forEach(op => {
    linhas.push([
      op.numeroOP,
      getNecessidadeDaOrdem(op) || "",
      op.referencia,
      op.cor || "",
      op.quantidade,
      "Sim"
    ]);
  });

  return linhas;
}

function exportarCSV() {
  const ordens = getOrdensRelatorio();

  if (!ordens.length) {
    toast("Não há dados para exportar.");
    return;
  }

  const linhas = getLinhasCSVRelatorio(ordens);

  const csv = linhas
    .map(linha => linha.map(campo => `"${String(campo).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${reportInfo[state.relatorioAtual].title.replaceAll(" ", "_")}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  registrarLog("relatorio_exportado", "relatorio", state.relatorioAtual, `${reportInfo[state.relatorioAtual].title} exportado em CSV`);
}

function preencherAnoAtual() {
  // Campo Ano foi removido da tela de OP. O ano é calculado pela data inicial da necessidade.
}

function normalizarReferencia(valor) {
  return String(valor || "").trim().toUpperCase();
}

function normalizarCor(valor) {
  return String(valor || "").trim().toUpperCase();
}

function docIdSeguro(valor) {
  return String(valor || "")
    .trim()
    .replaceAll("/", "-")
    .replaceAll("\\", "-")
    .replaceAll("#", "-")
    .replaceAll("?", "-");
}

function extrairCorDeObservacao(texto) {
  const match = String(texto || "").match(/cor\s*:\s*([^|,\n\r;]+)/i);
  return match ? match[1].trim() : "";
}


function statusReferenciaBadge(op) {
  const pendente = Boolean(op?.referenciaPendente) || op?.statusReferencia === "pendente";

  if (pendente) {
    return `<span class="badge pending">Pendente</span>`;
  }

  return `<span class="badge ok">Conferida</span>`;
}

function statusProdutoBadge(produto) {
  const pendente = Boolean(produto?.cadastroPendente) || produto?.statusCadastro === "pendente";

  if (pendente) {
    return `<span class="badge pending">Pendente</span>`;
  }

  return `<span class="badge ok">Conferido</span>`;
}

async function atualizarOrdensDaReferencia(produto) {
  if (!produto?.referencia) return 0;

  const ordensQuery = query(
    collection(db, "ordensProducao"),
    where("referencia", "==", normalizarReferencia(produto.referencia))
  );

  const snap = await getDocs(ordensQuery);

  if (snap.empty) return 0;

  let batch = writeBatch(db);
  let contador = 0;
  let total = 0;

  snap.docs.forEach(documento => {
    batch.set(doc(db, "ordensProducao", documento.id), {
      produtoNome: produto.nome,
      possuiAlca: Boolean(produto.possuiAlca),
      possuiBojo: Boolean(produto.possuiBojo),
      possuiRenda: Boolean(produto.possuiRenda),
      referenciaPendente: false,
      statusReferencia: "conferida",
      pendencia: "",
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    contador++;
    total++;
  });

  if (contador > 0) {
    await batch.commit();
  }

  return total;
}

function simNaoBadge(valor) {
  return `<span class="badge ${valor ? "yes" : "no"}">${valor ? "Sim" : "Não"}</span>`;
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3500);
}

window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.editarOrdem = editarOrdem;
window.excluirOrdem = excluirOrdem;
window.alternarUsuario = alternarUsuario;
window.iniciarCadastroProdutoPelaOrdem = iniciarCadastroProdutoPelaOrdem;
window.conferirReferenciaPendente = conferirReferenciaPendente;
window.verOrdensDaReferencia = verOrdensDaReferencia;
window.editarManejo = editarManejo;
window.editarManejo = editarManejo;
window.excluirManejo = excluirManejo;
window.iniciarManejoParaOrdem = iniciarManejoParaOrdem;
window.filtrarManejosPorOP = filtrarManejosPorOP;
window.salvarManejoLinha = salvarManejoLinha;
window.limparManejoLinha = limparManejoLinha;
window.biparManejoLinha = biparManejoLinha;
window.adicionarFaseSugestao = adicionarFaseSugestao;
window.adicionarFaccaoSugestao = adicionarFaccaoSugestao;
window.adicionarCeluSugestao = adicionarCeluSugestao;
window.imprimirManejoFiltrado = imprimirManejoFiltrado;
window.imprimirProcessosFiltrados = imprimirProcessosFiltrados;

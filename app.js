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
  faccoes: [],
  celulas: [],
  movimentacoesProducao: [],
  manejos: [],
  fasesManejoExtras: [],
  faccoesManejoExtras: [],
  celusManejoExtras: [],
  precosReferencia: [],
  entregasPagamento: [],
  usuarios: [],
  logs: [],
  pdfImportacaoPendente: [],
  relatorioAtual: "enfesto",
  manejoSetorAtual: "bojo",
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
    subtitle: "Preparação interna da OP e encaminhamento para facção ou célula."
  },
  processos: {
    title: "Processos",
    subtitle: "Visualização em tempo real das informações do manejo."
  },
  faccoes: {
    title: "Facções",
    subtitle: "Cadastre facções externas, dados de pagamento e contato."
  },
  celulas: {
    title: "Células",
    subtitle: "Cadastre as células internas da produção."
  },
  rastreamento: {
    title: "Rastreamento",
    subtitle: "Veja onde cada peça/OP está no fluxo de produção."
  },
  pagamentos: {
    title: "Pagamentos",
    subtitle: "Use a tabela de preços e as movimentações de facção para fechar pagamentos."
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
  configurarFaccoes();
  configurarCelulas();
  configurarRastreamento();
  configurarModalMovimentacao();
  configurarModalChegadaMovimentacao();
  configurarPagamentos();
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


  const faccoesQuery = query(collection(db, "faccoes"), orderBy("nome", "asc"));

  state.unsubscribers.push(onSnapshot(faccoesQuery, snapshot => {
    state.faccoes = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderFaccoes();
    renderFaccoesMovimentacoes();
    renderDatalistManejo();
    renderPagamentos();
  }, error => {
    console.error(error);
    toast("Erro ao carregar facções. Verifique as permissões.");
  }));



  const celulasQuery = query(collection(db, "celulas"), orderBy("nome", "asc"));

  state.unsubscribers.push(onSnapshot(celulasQuery, snapshot => {
    state.celulas = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderCelulas();
    renderCelulasMovimentacoes();
    renderRastreamento();
  }, error => {
    console.error(error);
    toast("Erro ao carregar células. Verifique as permissões.");
  }));

  const movimentacoesQuery = query(collection(db, "movimentacoesProducao"), orderBy("criadoEm", "desc"));

  state.unsubscribers.push(onSnapshot(movimentacoesQuery, snapshot => {
    state.movimentacoesProducao = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderRastreamento();
    renderFaccoesMovimentacoes();
    renderCelulasMovimentacoes();
    renderPagamentos();
  }, error => {
    console.error(error);
    toast("Erro ao carregar movimentações. Verifique as permissões.");
  }));


  const precosReferenciaQuery = query(collection(db, "precosReferencia"), orderBy("referencia", "asc"));

  state.unsubscribers.push(onSnapshot(precosReferenciaQuery, snapshot => {
    state.precosReferencia = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderPrecosReferencia();
    renderManejoInline();
    renderPagamentos();
  }, error => {
    console.error(error);
    toast("Erro ao carregar tabela de preços. Verifique as permissões.");
  }));

  const entregasPagamentoQuery = query(collection(db, "entregasPagamento"), orderBy("dataEntrega", "desc"));

  state.unsubscribers.push(onSnapshot(entregasPagamentoQuery, snapshot => {
    state.entregasPagamento = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderPagamentos();
  }, error => {
    console.error(error);
    toast("Erro ao carregar entregas de pagamento. Verifique as permissões.");
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
  renderFaccoes();
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
    if (paginaAtiva === "usuarios" || paginaAtiva === "backup" || paginaAtiva === "logs" || paginaAtiva === "faccoes" || paginaAtiva === "pagamentos") {
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
      if ((btn.dataset.page === "usuarios" || btn.dataset.page === "backup" || btn.dataset.page === "logs" || btn.dataset.page === "faccoes" || btn.dataset.page === "pagamentos" || btn.dataset.page === "celulas") && !ehAdmin()) {
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





const manejoSetoresInfo = {
  bojo: {
    label: "Bojo",
    campo: "possuiBojo",
    descricao: "Mostrando OPs de referências com bojo. Este é o manejo atual do sistema."
  },
  alca: {
    label: "Alça",
    campo: "possuiAlca",
    descricao: "Mostrando OPs de referências com alça."
  },
  renda: {
    label: "Renda",
    campo: "possuiRenda",
    descricao: "Mostrando OPs de referências com renda."
  }
};

function getManejoSetorAtual() {
  return state.manejoSetorAtual || "bojo";
}

function getInfoManejoSetor(setor = getManejoSetorAtual()) {
  return manejoSetoresInfo[setor] || manejoSetoresInfo.bojo;
}

function ordemPertenceAoSetorManejo(op, setor = getManejoSetorAtual()) {
  const info = getInfoManejoSetor(setor);
  return Boolean(op?.[info.campo]);
}

function getOrdensDoSetorManejo(setor = getManejoSetorAtual()) {
  return [...state.ordens].filter(op => ordemPertenceAoSetorManejo(op, setor));
}

function atualizarBotoesManejoSetor() {
  const setorAtual = getManejoSetorAtual();

  document.querySelectorAll(".manejo-setor-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.setor === setorAtual);
  });

  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  };

  setText("contadorManejoBojo", getOrdensDoSetorManejo("bojo").length);
  setText("contadorManejoAlca", getOrdensDoSetorManejo("alca").length);
  setText("contadorManejoRenda", getOrdensDoSetorManejo("renda").length);

  const info = document.getElementById("manejoSetorInfo");
  if (info) info.textContent = getInfoManejoSetor(setorAtual).descricao;
}

function selecionarManejoSetor(setor) {
  if (!manejoSetoresInfo[setor]) return;

  state.manejoSetorAtual = setor;
  limparFiltrosColunasManejo();
  atualizarBotoesManejoSetor();
  renderFiltrosColunasManejo();
  atualizarManejoComSoma();
}

function montarPatchManejoSetor(setor, manejo, status, extras = {}) {
  if (setor === "bojo") {
    return {
      manejo,
      manejoStatus: status,
      ...extras
    };
  }

  return {
    manejosSetores: {
      [setor]: manejo
    },
    manejoStatusSetores: {
      [setor]: status
    },
    bipadoSetores: {
      [setor]: status === "bipado"
    },
    ...extras
  };
}


function atualizarManejoComSoma() {
  renderManejoInline();
  setTimeout(renderResumoSomasManejoPeloDOM, 0);
}

function configurarManejo() {
  document.querySelectorAll(".manejo-setor-btn").forEach(btn => {
    btn.addEventListener("click", () => selecionarManejoSetor(btn.dataset.setor));
  });

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
    ["input", "change"].forEach(evento => {
      el.addEventListener(evento, atualizarManejoComSoma);
    });
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
  const setor = getManejoSetorAtual();
  const valorTela = valorLinhaManejo(op, campo);
  if (valorTela !== "") return valorTela;

  const manejo = getManejoDaOrdem(op, setor);
  return manejo?.[campo] ?? "";
}

function getLinhasManejoParaImpressao() {
  return filtrarOrdensManejoPorColunas().map(op => {
    const setor = getManejoSetorAtual();
    const manejo = getManejoDaOrdem(op, setor);

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
      status: getStatusManejo(op, setor) === "bipado" ? "Bipado" : getStatusManejo(op, setor) === "organizada" ? "Organizada" : "Pendente"
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



function getPrecosReferenciaAtivos() {
  return [...state.precosReferencia]
    .filter(preco => preco && preco.ativo !== false)
    .sort((a, b) => {
      const refCompare = String(a.referencia || "").localeCompare(String(b.referencia || ""), "pt-BR", { numeric: true });
      if (refCompare !== 0) return refCompare;
      return String(a.processo || "").localeCompare(String(b.processo || ""), "pt-BR", { numeric: true });
    });
}

function getPrecosReferenciaPorOPSetor(op, setor) {
  const referencia = normalizarReferencia(op?.referencia || "");

  return getPrecosReferenciaAtivos().filter(preco => {
    return normalizarReferencia(preco.referencia || "") === referencia && preco.setor === setor;
  });
}

function optionsPrecosReferenciaManejo(op, setor, selecionado = "") {
  const precos = getPrecosReferenciaPorOPSetor(op, setor);

  if (!precos.length) {
    return `<option value="">Preço não cadastrado</option>`;
  }

  return `<option value="">Processo / preço</option>` + precos.map(preco => {
    const selected = preco.id === selecionado ? " selected" : "";
    return `<option value="${escapeHtml(preco.id)}"${selected}>${escapeHtml(preco.processo)} - ${escapeHtml(formatarMoedaBR(preco.valor))}</option>`;
  }).join("");
}

function getDataHojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function totalEntreguePagamento(opId, precoReferenciaId) {
  return state.entregasPagamento
    .filter(entrega => entrega.opId === opId && (entrega.precoReferenciaId === precoReferenciaId || entrega.servicoId === precoReferenciaId))
    .reduce((soma, entrega) => soma + Number(entrega.quantidade || 0), 0);
}

async function registrarEntregaManejo(ordemId) {
  if (!ehAdmin()) {
    toast("Apenas admin pode registrar entregas para pagamento.");
    return;
  }

  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const setor = getManejoSetorAtual();
  const rowId = idLinhaManejo(ordem);
  const precoId = document.getElementById(`${rowId}-precoReferencia`)?.value || "";
  const dataEntrega = document.getElementById(`${rowId}-dataEntregaPagamento`)?.value || "";
  const quantidade = Number(document.getElementById(`${rowId}-qtdEntregaPagamento`)?.value || 0);
  const preco = getPrecoReferencia(precoId);

  if (!preco) {
    toast("Selecione um preço cadastrado para essa referência/processo.");
    return;
  }

  if (preco.setor !== setor) {
    toast(`Esse preço pertence ao setor ${getLabelSetorPagamento(preco.setor)}. Troque o manejo ou selecione outro preço.`);
    return;
  }

  if (normalizarReferencia(preco.referencia || "") !== normalizarReferencia(ordem.referencia || "")) {
    toast("Esse preço não pertence à referência desta OP.");
    return;
  }

  const faccao = limparTexto(valorLinhaManejo(ordem, "faccao") || getManejoDaOrdem(ordem, setor)?.faccao || "").toUpperCase();

  if (!faccao) {
    toast("Informe a facção na linha antes de registrar a entrega.");
    return;
  }

  if (!dataEntrega || quantidade <= 0) {
    toast("Informe data da entrega e quantidade entregue.");
    return;
  }

  if (quantidade > numeroQuantidadeOP(ordem)) {
    const continuar = confirm("A quantidade entregue é maior que a quantidade da OP. Deseja continuar mesmo assim?");
    if (!continuar) return;
  }

  const valorUnitario = Number(preco.valor || 0);
  const total = quantidade * valorUnitario;

  const dadosEntrega = {
    origem: "manejo",
    opId: ordem.id,
    numeroOP: ordem.numeroOP || "",
    referencia: ordem.referencia || "",
    cor: ordem.cor || "",
    produtoNome: ordem.produtoNome || "",
    faccao,
    precoReferenciaId: preco.id,
    processo: preco.processo,
    servicoId: preco.id,
    servicoNome: preco.processo,
    setor: preco.setor,
    setorLabel: getLabelSetorPagamento(preco.setor),
    dataEntrega,
    quantidade,
    valorUnitario,
    total,
    statusPagamento: "pendente",
    observacoes: `Registrado pelo Manejo ${getInfoManejoSetor(setor).label}`,
    criadoPor: state.currentUser.uid,
    criadoEm: serverTimestamp(),
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "entregasPagamento"), dadosEntrega);

    const totalEntregue = totalEntreguePagamento(ordem.id, preco.id) + quantidade;
    const faltaCalculada = Math.max(numeroQuantidadeOP(ordem) - totalEntregue, 0);
    const faltaInput = document.getElementById(`${rowId}-falta`);
    if (faltaInput) faltaInput.value = faltaCalculada;

    const manejoExistente = getManejoDaOrdem(ordem, setor) || {};
    const silkNome = limparTexto(valorLinhaManejo(ordem, "silkNome")).toUpperCase() || manejoExistente.silkNome || manejoExistente.silk || "";
    const silkData = valorLinhaManejo(ordem, "silkData") || manejoExistente.silkData || "";
    const fase = limparTexto(valorLinhaManejo(ordem, "fase")).toUpperCase() || manejoExistente.fase || "ENTREGA";

    const manejo = {
      ...manejoExistente,
      silk: silkNome,
      silkNome,
      silkData,
      setor,
      setorLabel: getInfoManejoSetor(setor).label,
      dataTecido: valorLinhaManejo(ordem, "dataTecido") || manejoExistente.dataTecido || "",
      fase,
      data: valorLinhaManejo(ordem, "data") || manejoExistente.data || "",
      faccao,
      chegada: valorLinhaManejo(ordem, "chegada") || manejoExistente.chegada || dataEntrega,
      falta: faltaCalculada,
      producao: valorLinhaManejo(ordem, "producao") || manejoExistente.producao || dataEntrega,
      celu: limparTexto(valorLinhaManejo(ordem, "celu")) || manejoExistente.celu || "",
      necessidade: getNecessidadeDaOrdem(ordem),
      ultimoPrecoReferenciaId: preco.id,
      ultimoProcessoPagamento: preco.processo,
      ultimaEntregaPagamento: dataEntrega,
      ultimaQuantidadeEntregue: quantidade,
      totalEntreguePagamento: totalEntregue,
      status: faltaCalculada <= 0 ? "bipado" : "organizada",
      bipado: faltaCalculada <= 0,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    };

    if (!manejoExistente?.criadoEm) {
      manejo.criadoPor = state.currentUser.uid;
      manejo.criadoEm = serverTimestamp();
    }

    const statusManejo = faltaCalculada <= 0 ? "bipado" : "organizada";
    const patch = montarPatchManejoSetor(setor, manejo, statusManejo, {
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    });

    await setDoc(doc(db, "ordensProducao", ordem.id), patch, { merge: true });
    await sincronizarPagamentoPeloManejo(ordem, setor, manejo);

    await registrarLog(
      "entrega_manejo_pagamento",
      "entregaPagamento",
      ordem.id,
      `OP ${ordem.numeroOP} | Ref. ${ordem.referencia} | ${faccao} | ${preco.processo} | ${quantidade} peças | Falta ${faltaCalculada} | ${formatarMoedaBR(total)}`
    );

    document.getElementById(`${rowId}-qtdEntregaPagamento`).value = "";
    toast(`Entrega registrada. Falta atual: ${faltaCalculada} peça(s).`);
  } catch (error) {
    console.error(error);
    toast("Erro ao registrar entrega pelo manejo.");
  }
}


function renderManejoInline() {
  const tbody = document.getElementById("listaManejoInline");
  if (!tbody) return;

  atualizarBotoesManejoSetor();

  const setor = getManejoSetorAtual();
  const ordens = filtrarOrdensManejoPorColunas();

  renderResumoSomasManejo(ordens);

  if (!ordens.length) {
    tbody.innerHTML = `<tr><td colspan="13" class="empty">Nenhuma ordem de produção encontrada para o manejo.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordens.map(op => {
    const manejo = getManejoDaOrdem(op, setor);
    const rowId = idLinhaManejo(op);
    const rowClass = manejo ? "manejo-row-saved" : "manejo-row-pending";
    const status = getStatusManejo(op, setor);
    const movimentosAbertos = getMovimentacoesDaOrdem(op.id)
      .filter(mov => mov.status !== "finalizado" && mov.status !== "retornou").length;

    return `
      <tr class="${rowClass}" data-manejo-row="1" data-qti="${escapeHtml(numeroQuantidadeOP(op))}" data-falta="0" data-status="${escapeHtml(status)}" data-fase="${escapeHtml(manejo?.fase || "Sem fase")}" data-cor="${escapeHtml(op.cor || "Sem cor")}">
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
        <td><input id="${rowId}-producao" type="date" value="${escapeHtml(manejo?.producao || "")}" /></td>
        <td><input class="manejo-readonly" value="${escapeHtml(getNecessidadeDaOrdem(op))}" readonly /></td>
        <td class="manejo-bipado-cell">
          <button class="btn btn-sm btn-bipado" onclick="biparManejoLinha('${op.id}')">
            ${status === "bipado" ? "Bipado ✓" : "Bipar"}
          </button>
        </td>
        <td>
          ${manejoStatusBadge(manejo, op, setor)}
          ${movimentosAbertos ? `<small class="mov-aberto">${movimentosAbertos} mov.</small>` : ""}
        </td>
        <td>
          <div class="manejo-actions manejo-actions-fluxo">
            <button class="btn btn-sm btn-primary" onclick="salvarManejoLinha('${op.id}')">Salvar</button>
            <button class="btn btn-sm btn-success" onclick="mandarParaFaccao('${op.id}')">Mandar facção</button>
            <button class="btn btn-sm" onclick="mandarParaCelula('${op.id}')">Mandar célula</button>
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

function getStatusManejo(op, setor = "bojo") {
  const manejo = getManejoDaOrdem(op, setor);

  if (setor === "bojo") {
    if (op?.bipado || op?.manejoStatus === "bipado" || manejo?.bipado || manejo?.status === "bipado") return "bipado";
    if (op?.manejoStatus) return op.manejoStatus;
    return manejo ? "organizada" : "pendente";
  }

  const statusSetor = op?.manejoStatusSetores?.[setor];

  if (op?.bipadoSetores?.[setor] || statusSetor === "bipado" || manejo?.bipado || manejo?.status === "bipado") return "bipado";
  if (statusSetor) return statusSetor;

  return manejo ? "organizada" : "pendente";
}

function getValorManejoParaFiltro(op, campo, setor = getManejoSetorAtual()) {
  const manejo = getManejoDaOrdem(op, setor);

  const mapa = {
    status: getStatusManejo(op, setor),
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
  const setor = getManejoSetorAtual();
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

  return getOrdensDoSetorManejo(setor).filter(op => {
    const manejo = getManejoDaOrdem(op, setor);

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

      const valorFiltro = normalizarTexto(valor);
      const valorItem = normalizarTexto(getValorManejoParaFiltro(op, campo, setor));

      if (campo === "status") {
        return getValorManejoParaFiltro(op, campo, setor) === valor;
      }

      return valorItem.includes(valorFiltro);
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
  const campo = document.getElementById(id);
  if (!campo) return;

  const atual = campo.value;
  const limpos = [...new Set(valores.map(valor => String(valor ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  const datalist = document.getElementById(`${id}List`);

  if (datalist) {
    datalist.innerHTML = limpos.map(valor => {
      return `<option value="${escapeHtml(valor)}"></option>`;
    }).join("");

    campo.value = atual;
    return;
  }

  campo.innerHTML = `<option value="">${labelTodos}</option>` + limpos.map(valor => {
    return `<option value="${escapeHtml(valor)}">${escapeHtml(valor)}</option>`;
  }).join("");

  if (limpos.includes(atual)) {
    campo.value = atual;
  }
}

function renderFiltrosColunasManejo() {
  const setor = getManejoSetorAtual();
  const ordens = getOrdensDoSetorManejo(setor);

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

function numeroFaltaManejo(op, setor = "bojo") {
  const manejo = getManejoDaOrdem(op, setor);
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
  const campo = document.getElementById(id);
  if (!campo || !campo.value) return "";

  if (campo.tagName === "SELECT") {
    const label = campo.options[campo.selectedIndex]?.textContent || campo.value;
    return label.trim();
  }

  return String(campo.value || "").trim();
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
  const setor = getManejoSetorAtual();
  const totalOps = ordens.length;
  const totalPecas = ordens.reduce((soma, op) => soma + numeroQuantidadeOP(op), 0);
  const totalFalta = ordens.reduce((soma, op) => soma + numeroFaltaManejo(op, setor), 0);
  const bipadas = ordens.filter(op => getStatusManejo(op, setor) === "bipado").length;
  const organizadas = ordens.filter(op => getStatusManejo(op, setor) === "organizada").length;
  const pendentes = ordens.filter(op => getStatusManejo(op, setor) === "pendente").length;

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

function getManejoDaOrdem(op, setor = "bojo") {
  if (!op) return null;

  if (setor === "bojo") {
    if (op.manejo) {
      return {
        id: op.id,
        setor,
        ...op.manejo
      };
    }

    return null;
  }

  const manejoSetor = op.manejosSetores?.[setor];

  if (manejoSetor) {
    return {
      id: op.id,
      setor,
      ...manejoSetor
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


function getPrecosReferenciaDoManejo(op, setor) {
  const referencia = normalizarReferencia(op?.referencia || "");

  return getPrecosReferenciaAtivos().filter(preco => {
    return normalizarReferencia(preco.referencia || "") === referencia && preco.setor === setor;
  });
}

function idPagamentoManejo(op, setor, preco) {
  return docIdSeguro(`manejo-${op.id}-${setor}-${preco.id}`);
}

async function sincronizarPagamentoPeloManejo(op, setor, manejo) {
  if (!op || !manejo) {
    return {
      ok: false,
      total: 0,
      motivo: "OP ou manejo não encontrado."
    };
  }

  const faccao = limparTexto(manejo.faccao || "").toUpperCase();
  const dataEntrega = manejo.chegada || "";

  if (!faccao || !dataEntrega) {
    return {
      ok: false,
      total: 0,
      motivo: "Para gerar pagamento, preencha Facção e Chegada no Manejo."
    };
  }

  const precos = getPrecosReferenciaDoManejo(op, setor);
  if (!precos.length) {
    return {
      ok: false,
      total: 0,
      motivo: `Não há preço cadastrado para a referência ${op.referencia || "-"} no setor ${getInfoManejoSetor(setor).label}.`
    };
  }

  const falta = Math.max(0, Number(manejo.falta || 0));
  const quantidadePagar = Math.max(numeroQuantidadeOP(op) - falta, 0);
  let totalGeral = 0;
  let gerados = 0;

  for (const preco of precos) {
    const pagamentoId = idPagamentoManejo(op, setor, preco);
    const pagamentoRef = doc(db, "entregasPagamento", pagamentoId);
    const atualSnap = await getDoc(pagamentoRef);
    const dadosAtuais = atualSnap.exists() ? atualSnap.data() : {};
    const statusAtual = dadosAtuais.statusPagamento || "pendente";

    const valorUnitario = Number(preco.valor || 0);
    const total = quantidadePagar * valorUnitario;
    totalGeral += total;
    gerados += 1;

    await setDoc(pagamentoRef, {
      origem: "manejo",
      opId: op.id,
      numeroOP: op.numeroOP || "",
      referencia: op.referencia || "",
      cor: op.cor || "",
      produtoNome: op.produtoNome || "",
      faccao,
      precoReferenciaId: preco.id,
      processo: preco.processo,
      servicoId: preco.id,
      servicoNome: preco.processo,
      setor: preco.setor,
      setorLabel: getLabelSetorPagamento(preco.setor),
      dataEntrega,
      quantidade: quantidadePagar,
      falta,
      valorUnitario,
      total,
      statusPagamento: statusAtual,
      observacoes: `Gerado automaticamente pelo Manejo ${getInfoManejoSetor(setor).label}`,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp(),
      criadoPor: dadosAtuais.criadoPor || state.currentUser.uid,
      criadoEm: dadosAtuais.criadoEm || serverTimestamp()
    }, { merge: true });
  }

  return {
    ok: true,
    total: gerados,
    valor: totalGeral,
    quantidade: quantidadePagar,
    falta,
    motivo: `${gerados} pagamento(s) gerado(s)/atualizado(s).`
  };
}

async function salvarManejoLinha(ordemId) {
  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const setor = getManejoSetorAtual();
  const infoSetor = getInfoManejoSetor(setor);
  const manejoExistente = getManejoDaOrdem(ordem, setor);
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
    setor,
    setorLabel: infoSetor.label,
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
    const patch = montarPatchManejoSetor(setor, manejo, "organizada", {
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    });

    await setDoc(doc(db, "ordensProducao", ordem.id), patch, { merge: true });

    await registrarLog(
      manejoExistente ? "manejo_atualizado" : "manejo_criado",
      "ordemProducao",
      ordem.id,
      `OP ${ordem.numeroOP} | Setor ${infoSetor.label} | Ref. ${ordem.referencia} | Fase ${fase}`
    );

    toast(`Manejo ${infoSetor.label} salvo.`);
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

  const setor = getManejoSetorAtual();
  const infoSetor = getInfoManejoSetor(setor);
  const manejoExistente = getManejoDaOrdem(ordem, setor) || {};
  const faseAtual = limparTexto(valorLinhaManejo(ordem, "fase")).toUpperCase() || manejoExistente.fase || "";

  if (!faseAtual) {
    const continuar = confirm("Essa OP ainda está sem fase preenchida. Deseja marcar como bipada mesmo assim?");
    if (!continuar) return;
  }

  const confirmar = confirm(`Marcar a OP ${ordem.numeroOP} como BIPADA/finalizada no manejo ${infoSetor.label}?`);
  if (!confirmar) return;

  const silkNome = limparTexto(valorLinhaManejo(ordem, "silkNome")).toUpperCase() || manejoExistente.silkNome || manejoExistente.silk || "";
  const silkData = valorLinhaManejo(ordem, "silkData") || manejoExistente.silkData || "";

  const manejo = {
    ...manejoExistente,
    silk: silkNome,
    silkNome,
    silkData,
    setor,
    setorLabel: infoSetor.label,
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
    const extras = setor === "bojo"
      ? {
          bipado: true,
          bipadoPor: state.currentUser.uid,
          bipadoEm: serverTimestamp()
        }
      : {};

    const patch = montarPatchManejoSetor(setor, manejo, "bipado", {
      ...extras,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    });

    await setDoc(doc(db, "ordensProducao", ordem.id), patch, { merge: true });

    await registrarLog("op_bipada", "ordemProducao", ordem.id, `OP ${ordem.numeroOP} | Setor ${infoSetor.label} | Ref. ${ordem.referencia} | Cor ${ordem.cor || "-"} | Fase ${faseAtual || "-"}`);
    toast(`OP marcada como bipada/finalizada no manejo ${infoSetor.label}.`);
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

  const setor = getManejoSetorAtual();
  const infoSetor = getInfoManejoSetor(setor);
  const manejo = getManejoDaOrdem(ordem, setor);
  if (!manejo) return;

  if (!confirm(`Limpar o manejo ${infoSetor.label} da OP ${ordem.numeroOP}?`)) return;

  try {
    let patch;

    if (setor === "bojo") {
      patch = {
        manejo: null,
        manejoStatus: "pendente",
        bipado: false,
        atualizadoPor: state.currentUser.uid,
        atualizadoEm: serverTimestamp()
      };
    } else {
      patch = {
        manejosSetores: {
          [setor]: null
        },
        manejoStatusSetores: {
          [setor]: "pendente"
        },
        bipadoSetores: {
          [setor]: false
        },
        atualizadoPor: state.currentUser.uid,
        atualizadoEm: serverTimestamp()
      };
    }

    await setDoc(doc(db, "ordensProducao", ordem.id), patch, { merge: true });

    await registrarLog("manejo_excluido", "ordemProducao", ordem.id, `OP ${ordem.numeroOP} | Setor ${infoSetor.label} | Fase ${manejo.fase || "-"}`);
    toast(`Manejo ${infoSetor.label} limpo.`);
  } catch (error) {
    console.error(error);
    toast("Erro ao limpar manejo.");
  }
}

function manejoStatusBadge(manejo, op = null, setor = "bojo") {
  const status = op ? getStatusManejo(op, setor) : (manejo?.bipado || manejo?.status === "bipado" ? "bipado" : manejo ? "organizada" : "pendente");

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


function getTodosManejosDaOrdem(op) {
  const lista = [];

  if (op?.manejo) lista.push(op.manejo);

  Object.values(op?.manejosSetores || {}).forEach(manejo => {
    if (manejo) lista.push(manejo);
  });

  return lista;
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
      getTodosManejosDaOrdem(op).forEach(manejo => {
        if (manejo?.fase) fases.add(String(manejo.fase).toUpperCase());
      });
    });

    fasesList.innerHTML = [...fases].sort().map(fase => `<option value="${escapeHtml(fase)}"></option>`).join("");
  }

  if (faccaoList) {
    const faccoes = new Set();

    state.faccoes.forEach(faccao => {
      if (faccao?.ativo === false) return;
      if (faccao?.nome) faccoes.add(String(faccao.nome).toUpperCase());
    });

    state.faccoesManejoExtras.forEach(faccao => {
      if (faccao) faccoes.add(String(faccao).toUpperCase());
    });

    state.ordens.forEach(op => {
      getTodosManejosDaOrdem(op).forEach(manejo => {
        if (manejo?.faccao) faccoes.add(String(manejo.faccao).toUpperCase());
      });
    });

    faccaoList.innerHTML = [...faccoes].sort().map(faccao => `<option value="${escapeHtml(faccao)}"></option>`).join("");
  }

  if (celuList) {
    const celus = new Set();

    state.celusManejoExtras.forEach(celu => {
      if (celu) celus.add(String(celu).toUpperCase());
    });

    state.ordens.forEach(op => {
      getTodosManejosDaOrdem(op).forEach(manejo => {
        if (manejo?.celu) celus.add(String(manejo.celu).toUpperCase());
      });
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



function configurarFaccoes() {
  const form = document.getElementById("formFaccao");
  if (form) {
    form.addEventListener("submit", salvarFaccao);
  }

  const busca = document.getElementById("buscaFaccao");
  if (busca) {
    busca.addEventListener("input", renderFaccoes);
  }

  const buscaMovimentacoes = document.getElementById("buscaFaccaoMovimentacoes");
  if (buscaMovimentacoes) {
    buscaMovimentacoes.addEventListener("input", renderFaccoesMovimentacoes);
  }

  const toggleGerenciar = document.getElementById("btnToggleGerenciarFaccoes");
  if (toggleGerenciar) {
    toggleGerenciar.addEventListener("click", () => {
      const painel = document.getElementById("painelGerenciarFaccoes");
      if (!painel) return;

      const abrindo = painel.classList.contains("hidden");
      painel.classList.toggle("hidden");
      toggleGerenciar.textContent = abrindo ? "Ocultar gerenciamento" : "Gerenciar facções";
    });
  }

  const abrirCadastro = document.getElementById("btnAbrirCadastroFaccao");
  if (abrirCadastro) {
    abrirCadastro.addEventListener("click", () => {
      const painel = document.getElementById("painelGerenciarFaccoes");
      const formFaccao = document.getElementById("formFaccao");

      if (painel) painel.classList.remove("hidden");

      if (formFaccao) {
        formFaccao.classList.remove("hidden");
        document.getElementById("faccaoNome")?.focus();
      }
    });
  }

  const cancelar = document.getElementById("btnCancelarFaccao");
  if (cancelar) {
    cancelar.addEventListener("click", limparFormFaccao);
  }
}

function limparFormFaccao() {
  const form = document.getElementById("formFaccao");
  if (form) {
    form.reset();
    form.classList.add("hidden");
  }

  const id = document.getElementById("faccaoId");
  if (id) id.value = "";
}

async function salvarFaccao(event) {
  event.preventDefault();

  if (!ehAdmin()) {
    toast("Apenas admin pode salvar facções.");
    return;
  }

  const idAtual = document.getElementById("faccaoId").value;
  const nome = limparTexto(document.getElementById("faccaoNome").value).toUpperCase();
  const cidade = limparTexto(document.getElementById("faccaoCidade").value).toUpperCase();
  const chavePix = document.getElementById("faccaoPix").value.trim();
  const celular = document.getElementById("faccaoCelular").value.trim();
  const observacoes = document.getElementById("faccaoObs").value.trim();

  if (!nome || !cidade) {
    toast("Informe nome da facção e cidade.");
    return;
  }

  const dados = {
    nome,
    cidade,
    chavePix,
    celular,
    observacoes,
    ativo: true,
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  if (!idAtual) {
    dados.criadoPor = state.currentUser.uid;
    dados.criadoEm = serverTimestamp();
  }

  try {
    const docId = idAtual || docIdSeguro(nome);
    await setDoc(doc(db, "faccoes", docId), dados, { merge: true });

    await registrarLog(
      idAtual ? "faccao_atualizada" : "faccao_criada",
      "faccao",
      docId,
      `${nome} | ${cidade} | ${celular || "sem celular"}`
    );

    limparFormFaccao();
    toast("Facção salva com sucesso.");
  } catch (error) {
    console.error(error);
    toast("Erro ao salvar facção.");
  }
}

function renderFaccoes() {
  const tbody = document.getElementById("listaFaccoes");
  if (!tbody) return;

  const busca = normalizarTexto(document.getElementById("buscaFaccao")?.value || "");
  let faccoes = [...state.faccoes];

  if (busca) {
    faccoes = faccoes.filter(faccao => {
      const texto = normalizarTexto([
        faccao.nome,
        faccao.cidade,
        faccao.chavePix,
        faccao.celular,
        faccao.observacoes
      ].join(" "));
      return texto.includes(busca);
    });
  }

  if (!faccoes.length) {
    tbody.innerHTML = `<tr><td colspan="${ehAdmin() ? 6 : 5}" class="empty">Nenhuma facção cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = faccoes.map(faccao => `
    <tr>
      <td><strong>${escapeHtml(faccao.nome || "-")}</strong></td>
      <td>${escapeHtml(faccao.cidade || "-")}</td>
      <td>${escapeHtml(faccao.chavePix || "-")}</td>
      <td>${escapeHtml(faccao.celular || "-")}</td>
      <td>
        <span class="status-dot ${faccao.ativo !== false ? "active" : "inactive"}">
          ${faccao.ativo !== false ? "Ativa" : "Inativa"}
        </span>
      </td>
      ${ehAdmin() ? `<td class="admin-only-cell">
        <button class="btn btn-sm" onclick="editarFaccao('${faccao.id}')">Editar</button>
        <button class="btn btn-sm ${faccao.ativo !== false ? "btn-warning" : "btn-success"}" onclick="alternarFaccao('${faccao.id}')">
          ${faccao.ativo !== false ? "Inativar" : "Ativar"}
        </button>
        <button class="btn btn-sm btn-danger" onclick="excluirFaccao('${faccao.id}')">Excluir</button>
      </td>` : ""}
    </tr>
  `).join("");
}


function renderFaccoesMovimentacoes() {
  const tbody = document.getElementById("listaFaccoesMovimentacoes");
  if (!tbody) return;

  const busca = normalizarTexto(document.getElementById("buscaFaccaoMovimentacoes")?.value || "");
  let movimentos = state.movimentacoesProducao.filter(mov => mov.tipoDestino === "faccao");

  if (busca) {
    movimentos = movimentos.filter(mov => {
      const texto = normalizarTexto([
        mov.numeroOP,
        mov.referencia,
        mov.cor,
        mov.destino,
        mov.processo,
        mov.status
      ].join(" "));
      return texto.includes(busca);
    });
  }

  const emFaccoes = movimentos.filter(mov => mov.status === "em_andamento" || !mov.status);
  const pecasEnviadas = movimentos.reduce((soma, mov) => soma + Number(mov.quantidadeEnviada || 0), 0);
  const pecasRecebidas = movimentos.reduce((soma, mov) => soma + Number(mov.quantidadeRecebida || 0), 0);
  const descontoDefeito = movimentos.reduce((soma, mov) => soma + Number(mov.descontoDefeito ?? mov.defeito ?? 0), 0);

  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(valor || 0).toLocaleString("pt-BR");
  };

  setText("faccoesTotalCadastradas", state.faccoes.length);
  setText("faccoesOpsEmAndamento", emFaccoes.length);
  setText("faccoesPecasEnviadas", pecasEnviadas);
  setText("faccoesPecasRecebidas", pecasRecebidas);
  const descontoDefeitoEl = document.getElementById("faccoesPecasDefeito");
  if (descontoDefeitoEl) descontoDefeitoEl.textContent = formatarMoedaBR(descontoDefeito);

  if (!movimentos.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty">Nenhuma OP enviada para facção ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = movimentos.map(mov => `
    <tr class="${mov.status === "em_andamento" || !mov.status ? "mov-em-faccao" : ""}">
      <td><strong>${escapeHtml(mov.numeroOP || "-")}</strong></td>
      <td><strong>${escapeHtml(mov.referencia || "-")}</strong></td>
      <td>${escapeHtml(mov.cor || "-")}</td>
      <td><strong>${escapeHtml(mov.destino || "-")}</strong></td>
      <td>${escapeHtml(mov.processo || "-")}</td>
      <td><strong>${escapeHtml(Number(mov.quantidadeEnviada || 0).toLocaleString("pt-BR"))}</strong></td>
      <td>${escapeHtml(dataISOParaBR(mov.dataEnvio) || mov.dataEnvio || "-")}</td>
      <td>${escapeHtml(dataISOParaBR(mov.dataChegada) || mov.dataChegada || "-")}</td>
      <td>${escapeHtml(Number(mov.falta || 0).toLocaleString("pt-BR"))}</td>
      <td>${escapeHtml(formatarMoedaBR(mov.descontoDefeito ?? mov.defeito ?? 0))}</td>
      <td>
        <span class="badge ${classeStatusMovimento(mov.status)}">
          ${escapeHtml(labelStatusMovimento(mov.status))}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('${mov.id}')">Chegada</button>
        <button class="btn btn-sm" onclick="finalizarMovimentacao('${mov.id}')">Finalizar</button>
        ${ehAdmin() ? `<button class="btn btn-sm btn-danger" onclick="excluirMovimentacao('${mov.id}')">Excluir</button>` : ""}
      </td>
    </tr>
  `).join("");
}


function editarFaccao(id) {
  const faccao = state.faccoes.find(item => item.id === id);
  if (!faccao) return;

  abrirPagina("faccoes");
  document.getElementById("painelGerenciarFaccoes")?.classList.remove("hidden");
  const toggleGerenciar = document.getElementById("btnToggleGerenciarFaccoes");
  if (toggleGerenciar) toggleGerenciar.textContent = "Ocultar gerenciamento";
  document.getElementById("formFaccao")?.classList.remove("hidden");

  document.getElementById("faccaoId").value = faccao.id;
  document.getElementById("faccaoNome").value = faccao.nome || "";
  document.getElementById("faccaoCidade").value = faccao.cidade || "";
  document.getElementById("faccaoPix").value = faccao.chavePix || "";
  document.getElementById("faccaoCelular").value = faccao.celular || "";
  document.getElementById("faccaoObs").value = faccao.observacoes || "";
}

async function alternarFaccao(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode alterar facções.");
    return;
  }

  const faccao = state.faccoes.find(item => item.id === id);
  if (!faccao) return;

  const ativo = faccao.ativo === false;

  try {
    await setDoc(doc(db, "faccoes", id), {
      ativo,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog(ativo ? "faccao_ativada" : "faccao_inativada", "faccao", id, `${faccao.nome || id}`);
    toast(ativo ? "Facção ativada." : "Facção inativada.");
  } catch (error) {
    console.error(error);
    toast("Erro ao alterar status da facção.");
  }
}

async function excluirFaccao(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode excluir facções.");
    return;
  }

  const faccao = state.faccoes.find(item => item.id === id);
  if (!confirm(`Excluir a facção ${faccao?.nome || id}?`)) return;

  try {
    await deleteDoc(doc(db, "faccoes", id));
    await registrarLog("faccao_excluida", "faccao", id, `${faccao?.nome || id}`);
    toast("Facção excluída.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir facção.");
  }
}






function configurarCelulas() {
  const form = document.getElementById("formCelula");
  if (form) {
    form.addEventListener("submit", salvarCelula);
  }

  const busca = document.getElementById("buscaCelula");
  if (busca) {
    busca.addEventListener("input", renderCelulas);
  }

  const buscaMovimentacoes = document.getElementById("buscaCelulaMovimentacoes");
  if (buscaMovimentacoes) {
    buscaMovimentacoes.addEventListener("input", renderCelulasMovimentacoes);
  }

  const toggleGerenciar = document.getElementById("btnToggleGerenciarCelulas");
  if (toggleGerenciar) {
    toggleGerenciar.addEventListener("click", () => {
      const painel = document.getElementById("painelGerenciarCelulas");
      if (!painel) return;

      const abrindo = painel.classList.contains("hidden");
      painel.classList.toggle("hidden");
      toggleGerenciar.textContent = abrindo ? "Ocultar gerenciamento" : "Gerenciar células";
    });
  }

  const abrirCadastro = document.getElementById("btnAbrirCadastroCelula");
  if (abrirCadastro) {
    abrirCadastro.addEventListener("click", () => {
      const painel = document.getElementById("painelGerenciarCelulas");
      const formCelula = document.getElementById("formCelula");

      if (painel) painel.classList.remove("hidden");

      if (formCelula) {
        formCelula.classList.remove("hidden");
        document.getElementById("celulaNome")?.focus();
      }
    });
  }

  const cancelar = document.getElementById("btnCancelarCelula");
  if (cancelar) {
    cancelar.addEventListener("click", limparFormCelula);
  }
}

function limparFormCelula() {
  const form = document.getElementById("formCelula");
  if (form) {
    form.reset();
    form.classList.add("hidden");
  }

  const id = document.getElementById("celulaId");
  if (id) id.value = "";
}

async function salvarCelula(event) {
  event.preventDefault();

  if (!ehAdmin()) {
    toast("Apenas admin pode salvar células.");
    return;
  }

  const idAtual = document.getElementById("celulaId").value;
  const nome = limparTexto(document.getElementById("celulaNome").value).toUpperCase();

  if (!nome) {
    toast("Informe o nome da célula.");
    return;
  }

  const dados = {
    nome,
    ativo: true,
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  if (!idAtual) {
    dados.criadoPor = state.currentUser.uid;
    dados.criadoEm = serverTimestamp();
  }

  try {
    const docId = idAtual || docIdSeguro(nome);
    await setDoc(doc(db, "celulas", docId), dados, { merge: true });

    await registrarLog(idAtual ? "celula_atualizada" : "celula_criada", "celula", docId, nome);
    limparFormCelula();
    toast("Célula salva.");
  } catch (error) {
    console.error(error);
    toast("Erro ao salvar célula.");
  }
}

function renderCelulas() {
  const tbody = document.getElementById("listaCelulas");
  if (!tbody) return;

  const busca = normalizarTexto(document.getElementById("buscaCelula")?.value || "");
  let celulas = [...state.celulas];

  if (busca) {
    celulas = celulas.filter(celula => normalizarTexto(celula.nome || "").includes(busca));
  }

  if (!celulas.length) {
    tbody.innerHTML = `<tr><td colspan="${ehAdmin() ? 3 : 2}" class="empty">Nenhuma célula cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = celulas.map(celula => `
    <tr>
      <td><strong>${escapeHtml(celula.nome || "-")}</strong></td>
      <td>
        <span class="status-dot ${celula.ativo !== false ? "active" : "inactive"}">
          ${celula.ativo !== false ? "Ativa" : "Inativa"}
        </span>
      </td>
      ${ehAdmin() ? `
        <td>
          <button class="btn btn-sm" onclick="editarCelula('${celula.id}')">Editar</button>
          <button class="btn btn-sm ${celula.ativo !== false ? "btn-warning" : "btn-success"}" onclick="alternarCelula('${celula.id}')">
            ${celula.ativo !== false ? "Inativar" : "Ativar"}
          </button>
          <button class="btn btn-sm btn-danger" onclick="excluirCelula('${celula.id}')">Excluir</button>
        </td>
      ` : ""}
    </tr>
  `).join("");
}


function renderCelulasMovimentacoes() {
  const tbody = document.getElementById("listaCelulasMovimentacoes");
  if (!tbody) return;

  const busca = normalizarTexto(document.getElementById("buscaCelulaMovimentacoes")?.value || "");
  let movimentos = state.movimentacoesProducao.filter(mov => mov.tipoDestino === "celula");

  if (busca) {
    movimentos = movimentos.filter(mov => {
      const texto = normalizarTexto([
        mov.numeroOP,
        mov.referencia,
        mov.cor,
        mov.destino,
        mov.processo,
        mov.status
      ].join(" "));
      return texto.includes(busca);
    });
  }

  const emCelulas = movimentos.filter(mov => mov.status === "em_andamento" || !mov.status);
  const pecasEnviadas = movimentos.reduce((soma, mov) => soma + Number(mov.quantidadeEnviada || 0), 0);
  const pecasRecebidas = movimentos.reduce((soma, mov) => soma + Number(mov.quantidadeRecebida || 0), 0);

  const setText = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(valor || 0).toLocaleString("pt-BR");
  };

  setText("celulasTotalCadastradas", state.celulas.length);
  setText("celulasOpsEmAndamento", emCelulas.length);
  setText("celulasPecasEnviadas", pecasEnviadas);
  setText("celulasPecasRecebidas", pecasRecebidas);

  if (!movimentos.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty">Nenhuma OP enviada para célula ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = movimentos.map(mov => `
    <tr class="${mov.status === "em_andamento" || !mov.status ? "mov-em-celula" : ""}">
      <td><strong>${escapeHtml(mov.numeroOP || "-")}</strong></td>
      <td><strong>${escapeHtml(mov.referencia || "-")}</strong></td>
      <td>${escapeHtml(mov.cor || "-")}</td>
      <td><strong>${escapeHtml(mov.destino || "-")}</strong></td>
      <td>${escapeHtml(mov.processo || "-")}</td>
      <td><strong>${escapeHtml(Number(mov.quantidadeEnviada || 0).toLocaleString("pt-BR"))}</strong></td>
      <td>${escapeHtml(dataISOParaBR(mov.dataEnvio) || mov.dataEnvio || "-")}</td>
      <td>${escapeHtml(dataISOParaBR(mov.dataChegada) || mov.dataChegada || "-")}</td>
      <td>${escapeHtml(Number(mov.falta || 0).toLocaleString("pt-BR"))}</td>
      <td>
        <span class="badge ${classeStatusMovimento(mov.status)}">
          ${escapeHtml(labelStatusMovimento(mov.status))}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-success" onclick="registrarChegadaMovimentacao('${mov.id}')">Chegada</button>
        <button class="btn btn-sm" onclick="finalizarMovimentacao('${mov.id}')">Finalizar</button>
        ${ehAdmin() ? `<button class="btn btn-sm btn-danger" onclick="excluirMovimentacao('${mov.id}')">Excluir</button>` : ""}
      </td>
    </tr>
  `).join("");
}


function editarCelula(id) {
  const celula = state.celulas.find(item => item.id === id);
  if (!celula) return;

  abrirPagina("celulas");
  document.getElementById("painelGerenciarCelulas")?.classList.remove("hidden");
  const toggleGerenciar = document.getElementById("btnToggleGerenciarCelulas");
  if (toggleGerenciar) toggleGerenciar.textContent = "Ocultar gerenciamento";
  document.getElementById("formCelula")?.classList.remove("hidden");

  document.getElementById("celulaId").value = celula.id;
  document.getElementById("celulaNome").value = celula.nome || "";
}

async function alternarCelula(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode alterar células.");
    return;
  }

  const celula = state.celulas.find(item => item.id === id);
  if (!celula) return;

  const ativo = celula.ativo === false;

  try {
    await setDoc(doc(db, "celulas", id), {
      ativo,
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await registrarLog(ativo ? "celula_ativada" : "celula_inativada", "celula", id, celula.nome || id);
    toast(ativo ? "Célula ativada." : "Célula inativada.");
  } catch (error) {
    console.error(error);
    toast("Erro ao alterar célula.");
  }
}

async function excluirCelula(id) {
  if (!ehAdmin()) {
    toast("Apenas admin pode excluir células.");
    return;
  }

  const celula = state.celulas.find(item => item.id === id);
  if (!confirm(`Excluir a célula ${celula?.nome || id}?`)) return;

  try {
    await deleteDoc(doc(db, "celulas", id));
    await registrarLog("celula_excluida", "celula", id, celula?.nome || id);
    toast("Célula excluída.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir célula.");
  }
}

function configurarRastreamento() {
  const busca = document.getElementById("buscaRastreamento");
  if (busca) {
    busca.addEventListener("input", renderRastreamento);
  }
}

function getMovimentacoesDaOrdem(opId) {
  return state.movimentacoesProducao.filter(mov => mov.opId === opId);
}

function getDestinoMovimento(tipo, nome) {
  const lista = tipo === "faccao" ? state.faccoes : state.celulas;
  const texto = limparTexto(nome).toUpperCase();
  return lista.find(item => limparTexto(item.nome || "").toUpperCase() === texto) || null;
}

function labelTipoMovimento(tipo) {
  return tipo === "celula" ? "Célula" : "Facção";
}

function labelStatusMovimento(status) {
  const mapa = {
    em_andamento: "Em andamento",
    retornou: "Retornou",
    finalizado: "Finalizado"
  };

  return mapa[status] || status || "Em andamento";
}

function classeStatusMovimento(status) {
  if (status === "finalizado") return "ok";
  if (status === "retornou") return "bipado";
  return "pending";
}

let movimentacaoModalContexto = null;

function configurarModalMovimentacao() {
  const form = document.getElementById("formMovimentacaoProducao");
  if (form) {
    form.addEventListener("submit", confirmarMovimentacaoProducao);
  }

  const fechar = document.getElementById("btnFecharModalMovimentacao");
  if (fechar) {
    fechar.addEventListener("click", fecharModalMovimentacao);
  }

  const cancelar = document.getElementById("btnCancelarModalMovimentacao");
  if (cancelar) {
    cancelar.addEventListener("click", fecharModalMovimentacao);
  }

  const modal = document.getElementById("modalMovimentacao");
  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) fecharModalMovimentacao();
    });
  }

  const processoSelect = document.getElementById("movimentacaoProcessoSelect");
  if (processoSelect) {
    processoSelect.addEventListener("change", () => {
      const processoInput = document.getElementById("movimentacaoProcesso");
      if (processoInput && processoSelect.value) {
        processoInput.value = processoSelect.value;
      }
    });
  }
}

function getProcessosSugeridosMovimentacao(op, setor, tipoDestino) {
  const referencia = normalizarReferencia(op?.referencia || "");
  const processosTabela = getPrecosReferenciaAtivos()
    .filter(preco => normalizarReferencia(preco.referencia || "") === referencia && preco.setor === setor)
    .map(preco => preco.processo);

  const processosHistorico = state.movimentacoesProducao
    .filter(mov => normalizarReferencia(mov.referencia || "") === referencia && mov.setor === setor)
    .map(mov => mov.processo);

  const padrao = tipoDestino === "faccao" ? getInfoManejoSetor(setor).label.toUpperCase() : "MONTAGEM";

  return [...new Set([
    padrao,
    ...processosTabela,
    ...processosHistorico
  ].map(item => limparTexto(item).toUpperCase()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

function abrirModalMovimentacao(ordemId, tipoDestino) {
  const ordem = state.ordens.find(op => op.id === ordemId);
  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const setor = getManejoSetorAtual();
  const label = labelTipoMovimento(tipoDestino);
  const destinos = tipoDestino === "faccao"
    ? state.faccoes.filter(item => item.ativo !== false)
    : state.celulas.filter(item => item.ativo !== false);

  if (!destinos.length) {
    toast(`Cadastre pelo menos uma ${label.toLowerCase()} antes de enviar a OP.`);
    abrirPagina(tipoDestino === "faccao" ? "faccoes" : "celulas");

    if (tipoDestino === "faccao") {
      document.getElementById("painelGerenciarFaccoes")?.classList.remove("hidden");
      const toggle = document.getElementById("btnToggleGerenciarFaccoes");
      if (toggle) toggle.textContent = "Ocultar gerenciamento";
    } else {
      document.getElementById("painelGerenciarCelulas")?.classList.remove("hidden");
      const toggle = document.getElementById("btnToggleGerenciarCelulas");
      if (toggle) toggle.textContent = "Ocultar gerenciamento";
    }

    return;
  }

  movimentacaoModalContexto = {
    ordemId,
    tipoDestino,
    setor
  };

  const titulo = document.getElementById("modalMovimentacaoTitulo");
  const resumo = document.getElementById("modalMovimentacaoResumo");
  const info = document.getElementById("movimentacaoOpInfo");
  const destinoSelect = document.getElementById("movimentacaoDestino");
  const processoSelect = document.getElementById("movimentacaoProcessoSelect");
  const processoInput = document.getElementById("movimentacaoProcesso");
  const quantidadeInput = document.getElementById("movimentacaoQuantidade");
  const dataInput = document.getElementById("movimentacaoDataEnvio");
  const ordemInput = document.getElementById("movimentacaoOrdemId");
  const tipoInput = document.getElementById("movimentacaoTipoDestino");

  if (titulo) titulo.textContent = `Mandar para ${label}`;
  if (resumo) resumo.textContent = `Escolha uma ${label.toLowerCase()} já cadastrada e confirme os dados do envio.`;
  if (info) {
    info.innerHTML = `
      <strong>OP ${escapeHtml(ordem.numeroOP || "-")}</strong>
      <span>Ref. ${escapeHtml(ordem.referencia || "-")} | Cor ${escapeHtml(ordem.cor || "-")} | QTI ${escapeHtml(numeroQuantidadeOP(ordem))}</span>
    `;
  }

  if (ordemInput) ordemInput.value = ordemId;
  if (tipoInput) tipoInput.value = tipoDestino;

  if (destinoSelect) {
    destinoSelect.innerHTML = `<option value="">Selecione ${escapeHtml(label.toLowerCase())}</option>` + destinos.map(destino => {
      return `<option value="${escapeHtml(destino.nome || "")}">${escapeHtml(destino.nome || "")}</option>`;
    }).join("");
    destinoSelect.value = "";
  }

  const grupoProcesso = document.getElementById("grupoMovimentacaoProcesso");
  const exigeProcesso = tipoDestino === "faccao";

  if (grupoProcesso) {
    grupoProcesso.classList.toggle("hidden", !exigeProcesso);
  }

  if (processoInput) {
    processoInput.required = exigeProcesso;
  }

  const processos = getProcessosSugeridosMovimentacao(ordem, setor, tipoDestino);

  if (processoSelect) {
    processoSelect.innerHTML = `<option value="">Selecione ou digite abaixo</option>` + processos.map(processo => {
      return `<option value="${escapeHtml(processo)}">${escapeHtml(processo)}</option>`;
    }).join("");
    processoSelect.value = exigeProcesso ? (processos[0] || "") : "";
  }

  if (processoInput) processoInput.value = exigeProcesso ? (processos[0] || "") : "CÉLULA INTERNA";
  if (quantidadeInput) quantidadeInput.value = numeroQuantidadeOP(ordem);
  if (dataInput) dataInput.value = getDataHojeISO();

  document.getElementById("modalMovimentacao")?.classList.remove("hidden");
  destinoSelect?.focus();
}

function fecharModalMovimentacao() {
  document.getElementById("modalMovimentacao")?.classList.add("hidden");
  document.getElementById("formMovimentacaoProducao")?.reset();
  movimentacaoModalContexto = null;
}

async function confirmarMovimentacaoProducao(event) {
  event.preventDefault();

  const ordemId = document.getElementById("movimentacaoOrdemId")?.value || movimentacaoModalContexto?.ordemId || "";
  const tipoDestino = document.getElementById("movimentacaoTipoDestino")?.value || movimentacaoModalContexto?.tipoDestino || "";
  const setor = movimentacaoModalContexto?.setor || getManejoSetorAtual();
  const ordem = state.ordens.find(op => op.id === ordemId);

  if (!ordem) {
    toast("OP não encontrada.");
    return;
  }

  const label = labelTipoMovimento(tipoDestino);
  const destino = limparTexto(document.getElementById("movimentacaoDestino")?.value || "").toUpperCase();
  const processoDigitado = limparTexto(document.getElementById("movimentacaoProcesso")?.value || "").toUpperCase();
  const processo = tipoDestino === "celula" ? "CÉLULA INTERNA" : processoDigitado;
  const quantidadeEnviada = Number(document.getElementById("movimentacaoQuantidade")?.value || 0);
  const dataEnvio = document.getElementById("movimentacaoDataEnvio")?.value || "";

  if (!destino) {
    toast(`Selecione a ${label.toLowerCase()}.`);
    return;
  }

  if (tipoDestino === "faccao" && !processo) {
    toast("Informe o processo/etapa.");
    return;
  }

  if (!quantidadeEnviada || quantidadeEnviada <= 0) {
    toast("Informe uma quantidade válida.");
    return;
  }

  if (!dataEnvio) {
    toast("Informe a data de envio.");
    return;
  }

  if (quantidadeEnviada > numeroQuantidadeOP(ordem)) {
    const continuar = confirm("A quantidade enviada é maior que a QTI da OP. Deseja continuar mesmo assim?");
    if (!continuar) return;
  }

  const infoSetor = getInfoManejoSetor(setor);
  const destinoCadastrado = getDestinoMovimento(tipoDestino, destino);

  const dados = {
    origem: "manejo",
    opId: ordem.id,
    numeroOP: ordem.numeroOP || "",
    referencia: ordem.referencia || "",
    cor: ordem.cor || "",
    produtoNome: ordem.produtoNome || "",
    tipoDestino,
    tipoDestinoLabel: label,
    destino,
    destinoId: destinoCadastrado?.id || "",
    processo,
    setor,
    setorLabel: infoSetor.label,
    quantidadeEnviada,
    dataEnvio,
    dataChegada: "",
    falta: 0,
    quantidadeRecebida: 0,
    status: "em_andamento",
    criadoPor: state.currentUser.uid,
    criadoEm: serverTimestamp(),
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp()
  };

  try {
    const ref = await addDoc(collection(db, "movimentacoesProducao"), dados);
    await registrarLog("movimentacao_criada", "movimentacaoProducao", ref.id, `OP ${dados.numeroOP} | ${label} ${destino} | ${processo} | ${quantidadeEnviada} peças`);
    fecharModalMovimentacao();
    toast(`OP enviada para ${label}: ${destino}.`);
  } catch (error) {
    console.error(error);
    toast("Erro ao criar movimentação.");
  }
}


function mandarParaFaccao(ordemId) {
  abrirModalMovimentacao(ordemId, "faccao");
}

function mandarParaCelula(ordemId) {
  abrirModalMovimentacao(ordemId, "celula");
}

function getPrecoReferenciaPorMovimento(mov) {
  return getPrecosReferenciaAtivos().find(preco => {
    return normalizarReferencia(preco.referencia || "") === normalizarReferencia(mov.referencia || "") &&
      preco.setor === mov.setor &&
      normalizarTexto(preco.processo || "") === normalizarTexto(mov.processo || "");
  }) || null;
}

async function gerarPagamentoPorMovimentacao(mov) {
  if (!mov || mov.tipoDestino !== "faccao" || !mov.dataChegada) {
    return { ok: false, motivo: "Pagamento só é gerado para facção com data de chegada." };
  }

  const preco = getPrecoReferenciaPorMovimento(mov);

  if (!preco) {
    return {
      ok: false,
      motivo: `Preço não cadastrado para Ref. ${mov.referencia} + ${mov.processo} + ${getLabelSetorPagamento(mov.setor)}.`
    };
  }

  const quantidade = Math.max(Number(mov.quantidadeEnviada || 0) - Number(mov.falta || 0), 0);
  const valorUnitario = Number(preco.valor || 0);
  const subtotal = quantidade * valorUnitario;
  const descontoDefeito = Number(mov.descontoDefeito ?? mov.defeito ?? 0);
  const total = Math.max(subtotal - descontoDefeito, 0);
  const pagamentoId = docIdSeguro(`mov-${mov.id}-${preco.id}`);

  await setDoc(doc(db, "entregasPagamento", pagamentoId), {
    origem: "movimentacao",
    movimentacaoId: mov.id,
    opId: mov.opId,
    numeroOP: mov.numeroOP || "",
    referencia: mov.referencia || "",
    cor: mov.cor || "",
    produtoNome: mov.produtoNome || "",
    faccao: mov.destino || "",
    precoReferenciaId: preco.id,
    processo: preco.processo,
    servicoId: preco.id,
    servicoNome: preco.processo,
    setor: preco.setor,
    setorLabel: getLabelSetorPagamento(preco.setor),
    dataEntrega: mov.dataChegada,
    quantidade,
    falta: Number(mov.falta || 0),
    descontoDefeito,
    subtotal,
    valorUnitario,
    total,
    statusPagamento: "pendente",
    observacoes: "Gerado pela chegada da movimentação de facção, descontando falta e valor de defeito",
    atualizadoPor: state.currentUser.uid,
    atualizadoEm: serverTimestamp(),
    criadoPor: state.currentUser.uid,
    criadoEm: serverTimestamp()
  }, { merge: true });

  return { ok: true, quantidade, total };
}

let chegadaModalMovimentacaoId = "";

function configurarModalChegadaMovimentacao() {
  const form = document.getElementById("formChegadaMovimentacao");
  if (form) {
    form.addEventListener("submit", confirmarChegadaMovimentacao);
  }

  const fechar = document.getElementById("btnFecharModalChegada");
  if (fechar) {
    fechar.addEventListener("click", fecharModalChegadaMovimentacao);
  }

  const cancelar = document.getElementById("btnCancelarModalChegada");
  if (cancelar) {
    cancelar.addEventListener("click", fecharModalChegadaMovimentacao);
  }

  const modal = document.getElementById("modalChegadaMovimentacao");
  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) fecharModalChegadaMovimentacao();
    });
  }
}

function registrarChegadaMovimentacao(id) {
  const mov = state.movimentacoesProducao.find(item => item.id === id);
  if (!mov) return;

  chegadaModalMovimentacaoId = id;

  const modal = document.getElementById("modalChegadaMovimentacao");
  const titulo = document.getElementById("modalChegadaTitulo");
  const resumo = document.getElementById("modalChegadaResumo");
  const info = document.getElementById("chegadaMovimentacaoInfo");
  const idInput = document.getElementById("chegadaMovimentacaoId");
  const dataInput = document.getElementById("chegadaData");
  const faltaInput = document.getElementById("chegadaFalta");
  const defeitoInput = document.getElementById("chegadaDefeito");
  const grupoDefeito = document.getElementById("grupoChegadaDefeito");
  const mostraDefeito = mov.tipoDestino === "faccao";

  if (grupoDefeito) grupoDefeito.classList.toggle("hidden", !mostraDefeito);

  if (titulo) titulo.textContent = `Registrar chegada - ${escapeHtml(mov.tipoDestinoLabel || labelTipoMovimento(mov.tipoDestino))}`;
  if (resumo) resumo.textContent = "Informe a data em que voltou e a quantidade em falta, se houver.";

  if (info) {
    info.innerHTML = `
      <strong>OP ${escapeHtml(mov.numeroOP || "-")} | Ref. ${escapeHtml(mov.referencia || "-")}</strong>
      <span>${escapeHtml(mov.destino || "-")} | ${escapeHtml(mov.processo || "-")} | Enviado: ${escapeHtml(Number(mov.quantidadeEnviada || 0).toLocaleString("pt-BR"))} peças</span>
    `;
  }

  if (idInput) idInput.value = id;
  if (dataInput) dataInput.value = mov.dataChegada || getDataHojeISO();
  if (faltaInput) faltaInput.value = Number(mov.falta || 0);
  if (defeitoInput) defeitoInput.value = mostraDefeito ? Number(mov.descontoDefeito ?? mov.defeito ?? 0) : 0;

  modal?.classList.remove("hidden");
  dataInput?.focus();
}

function fecharModalChegadaMovimentacao() {
  document.getElementById("modalChegadaMovimentacao")?.classList.add("hidden");
  document.getElementById("formChegadaMovimentacao")?.reset();
  chegadaModalMovimentacaoId = "";
}

async function confirmarChegadaMovimentacao(event) {
  event.preventDefault();

  const id = document.getElementById("chegadaMovimentacaoId")?.value || chegadaModalMovimentacaoId;
  const mov = state.movimentacoesProducao.find(item => item.id === id);

  if (!mov) {
    toast("Movimentação não encontrada.");
    return;
  }

  const dataChegada = document.getElementById("chegadaData")?.value || "";
  const falta = Math.max(0, Number(document.getElementById("chegadaFalta")?.value || 0));
  const descontoDefeito = mov.tipoDestino === "faccao" ? Math.max(0, Number(document.getElementById("chegadaDefeito")?.value || 0)) : 0;
  const quantidadeRecebida = Math.max(Number(mov.quantidadeEnviada || 0) - falta, 0);

  if (!dataChegada) {
    toast("Informe a data de chegada/retorno.");
    return;
  }

  if (falta > Number(mov.quantidadeEnviada || 0)) {
    toast("A falta não pode ser maior que a quantidade enviada.");
    return;
  }

  try {
    await setDoc(doc(db, "movimentacoesProducao", id), {
      dataChegada,
      falta,
      descontoDefeito,
      defeito: descontoDefeito,
      quantidadeRecebida,
      status: "retornou",
      atualizadoPor: state.currentUser.uid,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    const movAtualizada = { ...mov, dataChegada, falta, descontoDefeito, defeito: descontoDefeito, quantidadeRecebida, status: "retornou" };
    const pagamento = await gerarPagamentoPorMovimentacao(movAtualizada);

    await registrarLog("movimentacao_retorno", "movimentacaoProducao", id, `OP ${mov.numeroOP} | ${mov.destino} | voltou ${quantidadeRecebida} peças | falta ${falta} | desconto defeito ${formatarMoedaBR(descontoDefeito)}`);

    fecharModalChegadaMovimentacao();

    if (mov.tipoDestino === "faccao") {
      toast(pagamento.ok
        ? `Chegada registrada e pagamento gerado: ${formatarMoedaBR(pagamento.total)}.`
        : `Chegada registrada. ${pagamento.motivo}`);
    } else {
      toast("Chegada da célula registrada.");
    }
  } catch (error) {
    console.error(error);
    toast("Erro ao registrar chegada.");
  }
}



/*
 * CorpoNu — Pagamentos seguros + relatórios PIX + processos agrupados
 * Versão: 2026-07-29-pagamentos-processos-agrupados-2
 *
 * O filtro Processo da aba Pagamentos trabalha pelo nome do processo,
 * reunindo todas as referências e valores daquele serviço.
 *
 * Instalação: este arquivo é carregado automaticamente pelo sw.js desta atualização.
 */
(() => {
  "use strict";

  const VERSION = "2026-07-29-pagamentos-processos-agrupados-2";
  const FIREBASE_VERSION = "10.12.5";
  const DATASET_KEY = "corponuPagamentosSeguro";
  const ID_BOTAO_RELATORIO = "btnRelatorioPagamentoSimplificado";
  const ID_MODAL = "modalConfirmacaoFortePagamentos";
  const ID_STYLE = "styleCorpoNuPagamentosSeguro";
  const PROCESSO_PREFIXO = "PROCESSO::";
  const ORDEM_PROCESSOS = Object.freeze([
    "ENCAPAR BOJO",
    "ALÇA",
    "CALCINHA MONTAGEM",
    "CALCINHA COMPLETA",
    "SUTIÃ MONTAGEM",
    "SUTIÃ COMPLETO"
  ]);

  if (document.documentElement.dataset[DATASET_KEY] === VERSION) return;
  document.documentElement.dataset[DATASET_KEY] = VERSION;

  let contextoFirebasePromise = null;
  let botaoPagamentoAguardandoConfirmacao = null;
  let cacheTelaPagamentos = { expiraEm: 0, pagamentos: [], faccoes: [] };
  let processoSelecionadoAgrupado = "";
  let observerSelectProcesso = null;
  let preenchendoSelectProcesso = false;
  let timerRenderProcesso = null;
  let fechamentoAgrupadoEmAndamento = false;
  let preparandoFiltroPromise = null;

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function processoCanonico(valor) {
    const original = String(valor || "").trim();
    const normalizado = normalizarNome(original);
    const aliases = {
      "BOJO": "ENCAPAR BOJO",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM",
      "CALCINHA": "CALCINHA COMPLETA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    if (aliases[normalizado]) return aliases[normalizado];

    const oficial = ORDEM_PROCESSOS.find(item => normalizarNome(item) === normalizado);
    return oficial || original.toUpperCase();
  }

  function processoDoPagamento(item) {
    return processoCanonico(
      item?.processo ||
      item?.servicoNome ||
      item?.processoMovimentacao ||
      ""
    );
  }

  function valorOpcaoProcesso(processo) {
    const canonico = processoCanonico(processo);
    return canonico ? `${PROCESSO_PREFIXO}${encodeURIComponent(canonico)}` : "";
  }

  function processoDaOpcao(valor) {
    const texto = String(valor || "");
    if (!texto.startsWith(PROCESSO_PREFIXO)) return "";
    try {
      return processoCanonico(decodeURIComponent(texto.slice(PROCESSO_PREFIXO.length)));
    } catch (error) {
      return processoCanonico(texto.slice(PROCESSO_PREFIXO.length));
    }
  }

  function ordenarProcessos(lista) {
    const prioridade = new Map(ORDEM_PROCESSOS.map((item, indice) => [normalizarNome(item), indice]));
    return [...lista].sort((a, b) => {
      const pa = prioridade.has(normalizarNome(a)) ? prioridade.get(normalizarNome(a)) : 999;
      const pb = prioridade.has(normalizarNome(b)) ? prioridade.get(normalizarNome(b)) : 999;
      if (pa !== pb) return pa - pb;
      return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
    });
  }

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formatarDataBR(valor) {
    const texto = String(valor || "").trim();
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : (texto || "-");
  }

  function avisar(mensagem) {
    if (typeof window.mostrarAvisoFormulario === "function") {
      window.mostrarAvisoFormulario(mensagem);
      return;
    }
    window.alert(mensagem);
  }

  function processoValorTotalManual(valor) {
    const processo = normalizarNome(valor);
    return processo === "SUTIA MONTAGEM" || processo === "SUTIA COMPLETO";
  }

  function pagamentoAguardandoValorManual(item) {
    if (!processoValorTotalManual(item?.processo || item?.servicoNome || item?.processoMovimentacao)) {
      return false;
    }
    const statusSalvo = String(item?.statusPagamento || "pendente").toLowerCase();
    if (statusSalvo === "pago") return false;
    return item?.valorTotalDefinidoManualmente !== true;
  }

  function statusPagamento(item) {
    if (pagamentoAguardandoValorManual(item)) return "sem_valor";
    if (item?.valorPendente === true || String(item?.statusPagamento || "") === "sem_valor") {
      return "sem_valor";
    }
    return String(item?.statusPagamento || "pendente").toLowerCase();
  }

  function pagamentoAtivo(item) {
    const status = statusPagamento(item);
    return !item?.excluido && !["cancelado", "excluido"].includes(status);
  }

  function obterFiltros() {
    const valorProcesso = String(document.getElementById("pagamentoFiltroPreco")?.value || "");
    const processo = processoDaOpcao(valorProcesso);
    return {
      inicio: String(document.getElementById("pagamentoDataInicio")?.value || ""),
      fim: String(document.getElementById("pagamentoDataFim")?.value || ""),
      faccao: String(document.getElementById("pagamentoFiltroFaccao")?.value || ""),
      referencia: String(document.getElementById("pagamentoFiltroReferencia")?.value || ""),
      processo,
      precoId: processo ? "" : valorProcesso,
      status: String(document.getElementById("pagamentoFiltroStatus")?.value || "pendente")
    };
  }

  function filtrarPagamentos(pagamentos, filtros = obterFiltros()) {
    return (pagamentos || []).filter(item => {
      if (!pagamentoAtivo(item)) return false;

      const data = String(item?.dataEntrega || "");
      if (filtros.inicio && data < filtros.inicio) return false;
      if (filtros.fim && data > filtros.fim) return false;
      if (filtros.faccao && String(item?.faccao || "") !== filtros.faccao) return false;

      if (
        filtros.referencia &&
        normalizarNome(item?.referencia) !== normalizarNome(filtros.referencia)
      ) return false;

      if (
        filtros.processo &&
        normalizarNome(processoDoPagamento(item)) !== normalizarNome(filtros.processo)
      ) return false;

      if (
        filtros.precoId &&
        String(item?.precoReferenciaId || item?.servicoId || "") !== filtros.precoId
      ) return false;

      const status = statusPagamento(item);
      if (filtros.status === "sem_valor" && status !== "sem_valor") return false;
      if (filtros.status === "pendente" && status !== "pendente") return false;
      if (filtros.status === "pago" && status !== "pago") return false;

      return true;
    });
  }

  function textoOpcaoSelecionada(id, fallback = "Todos") {
    const select = document.getElementById(id);
    if (!select) return fallback;
    const option = select.options?.[select.selectedIndex];
    return String(option?.textContent || fallback).trim();
  }

  function textoFiltros(filtros = obterFiltros()) {
    const periodo = filtros.inicio || filtros.fim
      ? `${formatarDataBR(filtros.inicio) || "-"} até ${formatarDataBR(filtros.fim) || "-"}`
      : "Todo o período";

    return [
      `Período: ${periodo}`,
      `Facção: ${textoOpcaoSelecionada("pagamentoFiltroFaccao", "Todas")}`,
      `Referência: ${textoOpcaoSelecionada("pagamentoFiltroReferencia", "Todas")}`,
      `Processo: ${textoOpcaoSelecionada("pagamentoFiltroPreco", "Todos")}`,
      `Pagamento: ${textoOpcaoSelecionada("pagamentoFiltroStatus", "Todos")}`
    ].join(" | ");
  }

  function pontuarCadastroFaccao(faccao) {
    let pontos = 0;
    if (faccao?.ativo !== false) pontos += 15;
    if (!faccao?.cadastroPendente) pontos += 12;
    if (faccao?.chavePix || faccao?.pix || faccao?.dadosPagamento?.pix) pontos += 10;
    if (faccao?.titularPix || faccao?.titular) pontos += 5;
    return pontos;
  }

  function localizarCadastroFaccao(nome, faccoes) {
    const chave = normalizarNome(nome);
    const candidatas = (faccoes || [])
      .filter(item => {
        const atual = normalizarNome(item?.nome);
        if (!atual || !chave) return false;
        if (atual === chave) return true;
        if (atual.includes(chave) || chave.includes(atual)) {
          return Math.abs(atual.length - chave.length) <= 18;
        }
        return false;
      })
      .sort((a, b) => pontuarCadastroFaccao(b) - pontuarCadastroFaccao(a));

    const faccao = candidatas[0] || {};
    const observacoes = String(faccao?.observacoes || "");
    const titularObservacao = observacoes.match(/Titular\s*PIX\s*:\s*([^|;\n]+)/i)?.[1]?.trim() || "";
    return {
      nome: String(faccao?.nome || nome || "SEM FACÇÃO").trim(),
      chavePix: String(
        faccao?.chavePix ||
        faccao?.pix ||
        faccao?.dadosPagamento?.pix ||
        ""
      ).trim(),
      titularPix: String(
        faccao?.titularPix ||
        faccao?.titular ||
        faccao?.nomeTitularPix ||
        faccao?.dadosPagamento?.titular ||
        titularObservacao ||
        ""
      ).trim(),
      cidade: String(faccao?.cidade || "").trim(),
      celular: String(faccao?.celular || faccao?.telefone || faccao?.whatsapp || "").trim(),
      observacoes
    };
  }

  function agruparPorFaccao(pagamentos) {
    const mapa = new Map();

    for (const item of pagamentos || []) {
      const nome = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
      const chave = normalizarNome(nome) || "SEM FACCAO";
      if (!mapa.has(chave)) {
        mapa.set(chave, { nome, valor: 0 });
      }
      mapa.get(chave).valor += Number(item?.total || 0);
    }

    return [...mapa.values()].sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" })
    );
  }

  async function aguardarUsuario(auth, authMod) {
    if (auth.currentUser) return auth.currentUser;

    return new Promise((resolve, reject) => {
      let cancelamento = null;
      const timeout = window.setTimeout(() => {
        cancelamento?.();
        reject(new Error("Usuário ainda não autenticado."));
      }, 10000);

      cancelamento = authMod.onAuthStateChanged(
        auth,
        usuario => {
          if (!usuario) return;
          window.clearTimeout(timeout);
          cancelamento?.();
          resolve(usuario);
        },
        erro => {
          window.clearTimeout(timeout);
          cancelamento?.();
          reject(erro);
        }
      );
    });
  }

  async function obterContextoFirebase() {
    if (!contextoFirebasePromise) {
      contextoFirebasePromise = (async () => {
        const [appMod, firestore, authMod] = await Promise.all([
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)
        ]);

        const app = appMod.getApps()[0];
        if (!app) throw new Error("O Firebase do sistema ainda não foi inicializado.");

        const auth = authMod.getAuth(app);
        const db = firestore.getFirestore(app);
        const usuario = await aguardarUsuario(auth, authMod);

        return { firestore, auth, db, usuario };
      })().catch(erro => {
        contextoFirebasePromise = null;
        throw erro;
      });
    }

    return contextoFirebasePromise;
  }

  async function carregarDadosRelatorio() {
    const contexto = await obterContextoFirebase();
    const { firestore, auth, db } = contexto;
    const usuario = auth.currentUser || contexto.usuario;
    if (!usuario) throw new Error("Usuário ainda não autenticado.");

    const perfilSnap = await firestore.getDoc(
      firestore.doc(db, "usuarios", usuario.uid)
    );
    const perfil = perfilSnap.exists() ? perfilSnap.data() : {};
    const ehAdminAtivo = perfil?.tipo === "admin" && perfil?.ativo === true;
    const podeOrganizarFinanceiro = Boolean(
      perfil?.ativo === true && (
        ehAdminAtivo ||
        perfil?.permissoes?.recursos?.gerenciarValores === true ||
        perfil?.permissoes?.recursos?.marcarPagamentos === true
      )
    );

    const pagamentosRef = firestore.collection(db, "entregasPagamento");
    const consultaPagamentos = podeOrganizarFinanceiro
      ? pagamentosRef
      : firestore.query(pagamentosRef, firestore.where("criadoPor", "==", usuario.uid));

    const [pagamentosSnap, faccoesSnap] = await Promise.all([
      firestore.getDocs(consultaPagamentos),
      firestore.getDocs(firestore.collection(db, "faccoes"))
    ]);

    return {
      pagamentos: pagamentosSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      faccoes: faccoesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      usuario,
      perfil,
      ehAdminAtivo,
      podeOrganizarFinanceiro,
      contexto
    };
  }

  async function carregarDadosTelaPagamentos(forcarServidor = false) {
    const agora = Date.now();
    if (!forcarServidor && cacheTelaPagamentos.expiraEm > agora && cacheTelaPagamentos.pagamentos.length) {
      return cacheTelaPagamentos;
    }

    const contexto = await obterContextoFirebase();
    const { firestore, db } = contexto;
    const pagamentosRef = firestore.collection(db, "entregasPagamento");
    const faccoesRef = firestore.collection(db, "faccoes");

    let pagamentosSnap = null;
    let faccoesSnap = null;

    if (!forcarServidor && typeof firestore.getDocsFromCache === "function") {
      try {
        pagamentosSnap = await firestore.getDocsFromCache(pagamentosRef);
        faccoesSnap = await firestore.getDocsFromCache(faccoesRef);
      } catch (error) {
        pagamentosSnap = null;
        faccoesSnap = null;
      }
    }

    if (!pagamentosSnap || !pagamentosSnap.docs?.length) {
      if (!forcarServidor) {
        await new Promise(resolve => window.setTimeout(resolve, 450));
        if (typeof firestore.getDocsFromCache === "function") {
          try {
            pagamentosSnap = await firestore.getDocsFromCache(pagamentosRef);
            faccoesSnap = faccoesSnap || await firestore.getDocsFromCache(faccoesRef);
          } catch (error) {
            pagamentosSnap = null;
          }
        }
      }
    }

    if (!pagamentosSnap || !pagamentosSnap.docs?.length) {
      pagamentosSnap = await firestore.getDocs(pagamentosRef);
    }
    if (!faccoesSnap) {
      try {
        faccoesSnap = typeof firestore.getDocsFromCache === "function"
          ? await firestore.getDocsFromCache(faccoesRef)
          : null;
      } catch (error) {
        faccoesSnap = null;
      }
    }
    if (!faccoesSnap) faccoesSnap = await firestore.getDocs(faccoesRef);

    cacheTelaPagamentos = {
      expiraEm: Date.now() + 12 * 1000,
      pagamentos: pagamentosSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      faccoes: faccoesSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    };
    return cacheTelaPagamentos;
  }

  function abrirJanelaRelatorio(html) {
    const janela = window.open("", "_blank");
    if (!janela) {
      avisar("O navegador bloqueou a impressão. Permita pop-ups para este site e tente novamente.");
      return false;
    }

    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    return true;
  }


  function processosDisponiveisDosPagamentos(pagamentos) {
    const mapa = new Map();
    for (const item of pagamentos || []) {
      if (!pagamentoAtivo(item)) continue;
      const processo = processoDoPagamento(item);
      const chave = normalizarNome(processo);
      if (chave && !mapa.has(chave)) mapa.set(chave, processo);
    }
    return ordenarProcessos(mapa.values());
  }

  function selectProcessoEstaAgrupado(select) {
    if (!select) return false;
    const opcoes = [...select.options];
    return opcoes.length > 0 && opcoes.every(option =>
      !option.value || String(option.value).startsWith(PROCESSO_PREFIXO)
    );
  }

  function preencherFiltroProcessosAgrupados(pagamentos, manterProcesso = processoSelecionadoAgrupado) {
    const select = document.getElementById("pagamentoFiltroPreco");
    if (!select || preenchendoSelectProcesso) return false;

    const processos = processosDisponiveisDosPagamentos(pagamentos);
    const processoAtual = processoCanonico(
      processoDaOpcao(select.value) ||
      manterProcesso ||
      ""
    );

    const assinaturaNova = processos.map(normalizarNome).join("|");
    const assinaturaAtual = String(select.dataset.assinaturaProcessosAgrupados || "");
    const valorDesejado = valorOpcaoProcesso(processoAtual);

    if (
      selectProcessoEstaAgrupado(select) &&
      assinaturaAtual === assinaturaNova &&
      (!valorDesejado || [...select.options].some(option => option.value === valorDesejado))
    ) {
      if (valorDesejado) select.value = valorDesejado;
      processoSelecionadoAgrupado = processoDaOpcao(select.value);
      return true;
    }

    preenchendoSelectProcesso = true;
    try {
      select.innerHTML = '<option value="">Todos</option>' + processos
        .map(processo => `<option value="${escapeHtml(valorOpcaoProcesso(processo))}">${escapeHtml(processo)}</option>`)
        .join("");
      select.dataset.modoProcessoAgrupado = VERSION;
      select.dataset.assinaturaProcessosAgrupados = assinaturaNova;
      select.title = "Selecione o serviço para reunir todas as referências e valores dele.";

      if (valorDesejado && [...select.options].some(option => option.value === valorDesejado)) {
        select.value = valorDesejado;
      } else {
        select.value = "";
      }
      processoSelecionadoAgrupado = processoDaOpcao(select.value);
    } finally {
      preenchendoSelectProcesso = false;
    }
    return true;
  }

  function agruparResumoTela(pagamentos) {
    const mapa = new Map();
    for (const item of pagamentos || []) {
      const processo = processoDoPagamento(item) || "-";
      const faccao = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
      const referencia = String(item?.referencia || "-").trim() || "-";
      const valorUnitario = Number(item?.valorUnitario || 0);
      const chave = [
        normalizarNome(faccao),
        normalizarNome(referencia),
        normalizarNome(processo),
        valorUnitario.toFixed(6)
      ].join("|");

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          faccao,
          referencia,
          processo,
          entregas: 0,
          quantidade: 0,
          valorUnitario,
          total: 0
        });
      }
      const grupo = mapa.get(chave);
      grupo.entregas += 1;
      grupo.quantidade += Number(item?.quantidade || 0);
      grupo.total += statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0);
    }

    return [...mapa.values()].sort((a, b) => {
      const nome = a.faccao.localeCompare(b.faccao, "pt-BR", { numeric: true, sensitivity: "base" });
      if (nome) return nome;
      const ref = a.referencia.localeCompare(b.referencia, "pt-BR", { numeric: true, sensitivity: "base" });
      if (ref) return ref;
      return a.processo.localeCompare(b.processo, "pt-BR", { sensitivity: "base" });
    });
  }

  function chaveDuplicidadePagamento(item) {
    if (item?.movimentacaoId) {
      return [
        "MOV",
        String(item.movimentacaoId),
        String(item.precoReferenciaId || item.servicoId || ""),
        normalizarNome(processoDoPagamento(item))
      ].join("|");
    }
    return [
      "MANUAL",
      normalizarNome(item?.numeroOP),
      normalizarNome(item?.referencia),
      normalizarNome(item?.faccao),
      normalizarNome(processoDoPagamento(item)),
      String(item?.dataEntrega || ""),
      Number(item?.quantidade || 0)
    ].join("|");
  }

  function detectarDuplicidades(pagamentos) {
    const mapa = new Map();
    for (const item of pagamentos || []) {
      if (!pagamentoAtivo(item)) continue;
      const chave = chaveDuplicidadePagamento(item);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(item);
    }
    return [...mapa.values()].filter(itens => itens.length > 1);
  }

  function setTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
  }

  function renderConferenciaProcesso(pagamentos, faccoes) {
    const semValor = pagamentos.filter(item => statusPagamento(item) === "sem_valor");
    const duplicidades = detectarDuplicidades(pagamentos);
    const nomes = [...new Set(pagamentos.map(item => String(item?.faccao || "SEM FACÇÃO")))];
    const semPix = nomes.filter(nome => !localizarCadastroFaccao(nome, faccoes).chavePix);
    const total = pagamentos.reduce((soma, item) =>
      soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0
    );

    setTexto("confPagamentoItens", pagamentos.length.toLocaleString("pt-BR"));
    setTexto("confPagamentoTotal", formatarMoeda(total));
    setTexto("confPagamentoSemValor", semValor.length.toLocaleString("pt-BR"));
    setTexto("confPagamentoSemPix", semPix.length.toLocaleString("pt-BR"));
    setTexto("confPagamentoDuplicados", duplicidades.length.toLocaleString("pt-BR"));

    const alertas = [];
    if (semValor.length) alertas.push(`${semValor.length} pagamento(s) do processo selecionado aguardam definição de valor.`);
    if (semPix.length) alertas.push(`Sem PIX cadastrado: ${semPix.slice(0, 8).join(", ")}${semPix.length > 8 ? "..." : ""}.`);
    if (duplicidades.length) alertas.push(`${duplicidades.length} possível(is) duplicidade(s) foram identificadas no filtro atual.`);

    const caixa = document.getElementById("alertasConferenciaPagamentoFinal");
    if (caixa) {
      caixa.innerHTML = alertas.length
        ? `<div class="pagamento-final-aviso"><strong>Atenção:</strong><br>${alertas.map(item => `• ${escapeHtml(item)}`).join("<br>")}</div>`
        : `<div class="pagamento-final-ok"><strong>Conferência concluída:</strong> o processo selecionado possui valor, não há duplicidade aparente e as facções exibidas possuem PIX cadastrado.</div>`;
    }
  }

  function renderTelaPagamentosProcesso(pagamentos, faccoes) {
    const grupos = agruparResumoTela(pagamentos);
    const totalFaccoes = new Set(grupos.map(item => normalizarNome(item.faccao))).size;
    const totalEntregas = pagamentos.length;
    const totalPecas = pagamentos.reduce((soma, item) => soma + Number(item?.quantidade || 0), 0);
    const totalValor = pagamentos.reduce((soma, item) =>
      soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0
    );

    setTexto("pagamentoTotalFaccoes", totalFaccoes.toLocaleString("pt-BR"));
    setTexto("pagamentoTotalEntregas", totalEntregas.toLocaleString("pt-BR"));
    setTexto("pagamentoTotalRecebidas", totalPecas.toLocaleString("pt-BR"));
    setTexto("pagamentoTotalValor", formatarMoeda(totalValor));

    const tbodyResumo = document.getElementById("listaPagamento");
    if (tbodyResumo) {
      tbodyResumo.innerHTML = grupos.length
        ? grupos.map(grupo => `
            <tr>
              <td><strong>${escapeHtml(grupo.faccao)}</strong></td>
              <td><strong>${escapeHtml(grupo.referencia)}</strong></td>
              <td><strong>${escapeHtml(grupo.processo)}</strong></td>
              <td>${grupo.entregas.toLocaleString("pt-BR")}</td>
              <td><strong>${grupo.quantidade.toLocaleString("pt-BR")}</strong></td>
              <td>${escapeHtml(formatarMoeda(grupo.valorUnitario))}</td>
              <td><strong>${escapeHtml(formatarMoeda(grupo.total))}</strong></td>
            </tr>
          `).join("")
        : '<tr><td colspan="7" class="empty">Nenhum pagamento encontrado para o processo e os demais filtros selecionados.</td></tr>';
    }

    const tbodyEntregas = document.getElementById("listaEntregasPagamento");
    if (tbodyEntregas) {
      const ordenados = [...pagamentos].sort((a, b) => {
        const data = String(b?.dataEntrega || "").localeCompare(String(a?.dataEntrega || ""));
        if (data) return data;
        return String(a?.numeroOP || "").localeCompare(String(b?.numeroOP || ""), "pt-BR", { numeric: true });
      });

      tbodyEntregas.innerHTML = ordenados.length
        ? ordenados.map(item => {
            const status = statusPagamento(item);
            const pago = status === "pago";
            const semValor = status === "sem_valor";
            const labelStatus = pago ? "Pago" : (semValor ? "Aguardando valor" : "Pendente");
            const classeStatus = pago ? "ok" : "pending";
            const textoAcao = pago ? "Reabrir" : (semValor ? "Informar valor" : "Pagar");
            const classeAcao = pago ? "btn-warning" : (semValor ? "btn-warning" : "btn-success");
            return `
              <tr>
                <td>${escapeHtml(formatarDataBR(item?.dataEntrega))}</td>
                <td><strong>${escapeHtml(item?.numeroOP || "-")}</strong></td>
                <td><strong>${escapeHtml(item?.referencia || "-")}</strong></td>
                <td>${escapeHtml(item?.faccao || "-")}</td>
                <td>${escapeHtml(processoDoPagamento(item) || "-")}</td>
                <td><strong>${Number(item?.quantidade || 0).toLocaleString("pt-BR")}</strong></td>
                <td><strong>${semValor ? "A definir" : escapeHtml(formatarMoeda(item?.total))}</strong></td>
                <td><span class="badge ${classeStatus}${semValor ? " badge-pagamento-sem-valor" : ""}">${labelStatus}</span></td>
                <td>
                  <button class="btn btn-sm ${classeAcao}" onclick="alternarStatusEntregaPagamento('${escapeHtml(item.id)}')">${textoAcao}</button>
                  <button class="btn btn-sm btn-danger" onclick="excluirEntregaPagamento('${escapeHtml(item.id)}')">Excluir</button>
                </td>
              </tr>
            `;
          }).join("")
        : '<tr><td colspan="9" class="empty">Nenhuma entrega registrada para o processo e os demais filtros selecionados.</td></tr>';
    }

    renderConferenciaProcesso(pagamentos, faccoes);
  }

  async function renderizarProcessoAgrupado({ forcarServidor = false } = {}) {
    window.clearTimeout(timerRenderProcesso);
    const filtrosAtuais = obterFiltros();
    processoSelecionadoAgrupado = filtrosAtuais.processo || processoSelecionadoAgrupado;

    try {
      const dados = await carregarDadosTelaPagamentos(forcarServidor);
      preencherFiltroProcessosAgrupados(dados.pagamentos, processoSelecionadoAgrupado);

      const filtros = obterFiltros();
      processoSelecionadoAgrupado = filtros.processo;
      if (!filtros.processo) return;

      const filtrados = filtrarPagamentos(dados.pagamentos, filtros);
      renderTelaPagamentosProcesso(filtrados, dados.faccoes);
    } catch (error) {
      console.error("Não foi possível aplicar o filtro agrupado de processos.", error);
      const caixa = document.getElementById("alertasConferenciaPagamentoFinal");
      if (caixa) {
        caixa.innerHTML = '<div class="pagamento-final-aviso">Não foi possível atualizar o filtro agrupado. Verifique a conexão e clique em Atualizar.</div>';
      }
    }
  }

  function agendarRenderProcesso(opcoes = {}) {
    window.clearTimeout(timerRenderProcesso);
    timerRenderProcesso = window.setTimeout(() => renderizarProcessoAgrupado(opcoes), 180);
  }

  async function prepararFiltroProcessosAgrupados() {
    if (preparandoFiltroPromise) return preparandoFiltroPromise;
    preparandoFiltroPromise = (async () => {
      try {
        const dados = await carregarDadosTelaPagamentos(false);
        preencherFiltroProcessosAgrupados(dados.pagamentos, processoSelecionadoAgrupado);
        instalarObserverFiltroProcessos();
        if (processoSelecionadoAgrupado) agendarRenderProcesso();
      } catch (error) {
        console.warn("Filtro agrupado aguardando dados da tela Pagamentos.", error);
      }
    })().finally(() => {
      preparandoFiltroPromise = null;
    });
    return preparandoFiltroPromise;
  }

  function instalarObserverFiltroProcessos() {
    const select = document.getElementById("pagamentoFiltroPreco");
    if (!select) return;
    if (observerSelectProcesso) observerSelectProcesso.disconnect();

    observerSelectProcesso = new MutationObserver(() => {
      if (preenchendoSelectProcesso || selectProcessoEstaAgrupado(select)) return;
      window.setTimeout(async () => {
        try {
          const dados = await carregarDadosTelaPagamentos(false);
          preencherFiltroProcessosAgrupados(dados.pagamentos, processoSelecionadoAgrupado);
          if (processoSelecionadoAgrupado) agendarRenderProcesso();
        } catch (error) {
          console.warn("Não foi possível restaurar o filtro agrupado.", error);
        }
      }, 0);
    });
    observerSelectProcesso.observe(select, { childList: true });
  }

  async function atualizarConferenciaAgrupadaServidor() {
    cacheTelaPagamentos.expiraEm = 0;
    await renderizarProcessoAgrupado({ forcarServidor: true });
  }

  async function fecharPagamentosDoProcessoAgrupado() {
    if (fechamentoAgrupadoEmAndamento) return;
    fechamentoAgrupadoEmAndamento = true;

    const botao = document.getElementById("btnMarcarPagamentosFiltrados");
    const textoOriginal = botao?.textContent || "Confirmar pagamentos filtrados";
    try {
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Confirmando pagamentos...";
      }

      const dados = await carregarDadosRelatorio();
      if (!dados.ehAdminAtivo) {
        avisar("Apenas administrador ativo pode fechar pagamentos.");
        return;
      }

      const filtrados = filtrarPagamentos(dados.pagamentos, obterFiltros())
        .filter(item => statusPagamento(item) !== "pago");

      if (!filtrados.length) {
        avisar("Nenhum pagamento pendente foi encontrado para o processo e os demais filtros selecionados.");
        return;
      }

      const semValor = filtrados.filter(item => statusPagamento(item) === "sem_valor");
      if (semValor.length) {
        avisar(`Fechamento bloqueado: ${semValor.length} pagamento(s) do processo selecionado ainda aguardam definição de valor.`);
        return;
      }

      const duplicidades = detectarDuplicidades(filtrados);
      if (duplicidades.length) {
        avisar(`Fechamento bloqueado: foram encontradas ${duplicidades.length} possível(is) duplicidade(s) no filtro atual.`);
        return;
      }

      if (filtrados.length > 450) {
        avisar("O filtro possui mais de 450 lançamentos. Reduza o período ou selecione uma facção para fechar com segurança.");
        return;
      }

      const { firestore, db } = dados.contexto;
      const batch = firestore.writeBatch(db);
      for (const item of filtrados) {
        batch.set(
          firestore.doc(db, "entregasPagamento", item.id),
          {
            statusPagamento: "pago",
            pagoEm: firestore.serverTimestamp(),
            pagoPor: dados.usuario.uid,
            atualizadoPor: dados.usuario.uid,
            atualizadoEm: firestore.serverTimestamp()
          },
          { merge: true }
        );
      }
      await batch.commit();

      const total = filtrados.reduce((soma, item) => soma + Number(item?.total || 0), 0);
      try {
        await firestore.addDoc(
          firestore.collection(db, "logsAlteracoes"),
          {
            acao: "pagamentos_processo_agrupado_fechados",
            tipoAlvo: "entregaPagamento",
            alvoId: "lote",
            detalhes: `${filtrados.length} pagamentos | ${formatarMoeda(total)} | ${textoFiltros()}`,
            usuarioUid: dados.usuario.uid,
            usuarioNome: dados.perfil?.nome || "",
            usuarioEmail: dados.perfil?.email || dados.usuario.email || "",
            usuarioTipo: dados.perfil?.tipo || "admin",
            criadoEm: firestore.serverTimestamp(),
            versao: VERSION
          }
        );
      } catch (errorLog) {
        console.warn("Pagamentos fechados, mas o log adicional não foi criado.", errorLog);
      }

      cacheTelaPagamentos.expiraEm = 0;
      avisar(`${filtrados.length} pagamento(s) do processo ${obterFiltros().processo} marcados como pagos. Total: ${formatarMoeda(total)}.`);
      if (typeof window.atualizarDadosServidorAgora === "function") {
        window.atualizarDadosServidorAgora();
      }
      window.setTimeout(() => atualizarConferenciaAgrupadaServidor(), 900);
    } catch (error) {
      console.error("Erro ao fechar pagamentos do processo agrupado.", error);
      avisar("Não foi possível fechar os pagamentos. Nenhuma nova tentativa deve ser feita antes de conferir a conexão.");
    } finally {
      fechamentoAgrupadoEmAndamento = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  async function gerarRelatorioCompletoDoProcesso() {
    const botao = document.getElementById("btnImprimirPagamento");
    const textoOriginal = botao?.textContent || "Relatório completo com PIX";
    try {
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Gerando relatório...";
      }

      const dados = await carregarDadosRelatorio();
      const pagamentos = filtrarPagamentos(dados.pagamentos, obterFiltros());
      if (!pagamentos.length) {
        avisar("Não há pagamentos para os filtros selecionados.");
        return;
      }

      const grupos = new Map();
      for (const item of pagamentos) {
        const nome = String(item?.faccao || "SEM FACÇÃO").trim() || "SEM FACÇÃO";
        const chave = normalizarNome(nome);
        if (!grupos.has(chave)) grupos.set(chave, { nome, itens: [] });
        grupos.get(chave).itens.push(item);
      }

      const secoes = [...grupos.values()]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
        .map(grupo => {
          const cadastro = localizarCadastroFaccao(grupo.nome, dados.faccoes);
          const total = grupo.itens.reduce((soma, item) =>
            soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0
          );
          const linhas = [...grupo.itens]
            .sort((a, b) => String(a?.dataEntrega || "").localeCompare(String(b?.dataEntrega || "")))
            .map(item => `
              <tr>
                <td>${escapeHtml(formatarDataBR(item?.dataEntrega))}</td>
                <td>${escapeHtml(item?.numeroOP || "-")}</td>
                <td>${escapeHtml(item?.referencia || "-")}</td>
                <td>${escapeHtml(processoDoPagamento(item) || "-")}</td>
                <td class="numero">${Number(item?.quantidade || 0).toLocaleString("pt-BR")}</td>
                <td class="numero">${escapeHtml(statusPagamento(item) === "sem_valor" ? "A definir" : formatarMoeda(item?.valorUnitario))}</td>
                <td class="numero">${escapeHtml(formatarMoeda(item?.descontoDefeito || 0))}</td>
                <td class="numero"><strong>${escapeHtml(statusPagamento(item) === "sem_valor" ? "A definir" : formatarMoeda(item?.total))}</strong></td>
              </tr>
            `).join("");

          return `
            <section class="faccao">
              <div class="faccao-cabecalho">
                <div>
                  <h2>${escapeHtml(cadastro.nome)}</h2>
                  <p><strong>PIX:</strong> ${escapeHtml(cadastro.chavePix || "NÃO CADASTRADO")}</p>
                  ${cadastro.titularPix ? `<p><strong>Titular:</strong> ${escapeHtml(cadastro.titularPix)}</p>` : ""}
                </div>
                <div class="contato">
                  ${cadastro.cidade ? `<p><strong>Cidade:</strong> ${escapeHtml(cadastro.cidade)}</p>` : ""}
                  ${cadastro.celular ? `<p><strong>Telefone:</strong> ${escapeHtml(cadastro.celular)}</p>` : ""}
                  <p><strong>Total:</strong> ${escapeHtml(formatarMoeda(total))}</p>
                </div>
              </div>
              <table>
                <thead><tr><th>Data</th><th>OP</th><th>Ref.</th><th>Processo</th><th>Qtd.</th><th>Valor unit.</th><th>Desconto</th><th>Total</th></tr></thead>
                <tbody>${linhas}</tbody>
                <tfoot><tr><td colspan="7">TOTAL DE ${escapeHtml(cadastro.nome)}</td><td class="numero">${escapeHtml(formatarMoeda(total))}</td></tr></tfoot>
              </table>
            </section>
          `;
        }).join("");

      const totalGeral = pagamentos.reduce((soma, item) =>
        soma + (statusPagamento(item) === "sem_valor" ? 0 : Number(item?.total || 0)), 0
      );

      abrirJanelaRelatorio(`
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Relatório completo de pagamentos</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 20px; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
              header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #111827; padding-bottom: 12px; }
              h1 { margin: 0; font-size: 23px; }
              header p { margin: 5px 0 0; color: #475569; font-size: 11px; }
              .geral { text-align: right; }
              .filtros { margin: 12px 0 16px; padding: 9px 11px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; font-size: 10px; }
              .faccao { margin: 0 0 22px; page-break-inside: avoid; }
              .faccao-cabecalho { display: flex; justify-content: space-between; gap: 20px; padding: 10px 12px; border: 1px solid #94a3b8; border-bottom: 0; background: #eef2ff; }
              .faccao-cabecalho h2 { margin: 0 0 5px; font-size: 17px; }
              .faccao-cabecalho p { margin: 2px 0; font-size: 10px; }
              .contato { text-align: right; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #94a3b8; padding: 6px 7px; font-size: 9px; }
              th { background: #e2e8f0; text-align: left; }
              .numero { text-align: right; white-space: nowrap; }
              tfoot td { font-weight: bold; background: #f8fafc; }
              @page { size: A4 landscape; margin: 9mm; }
              @media print {
                body { margin: 0; }
                thead { display: table-header-group; }
                .faccao { page-break-inside: auto; }
                tr { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <header>
              <div>
                <h1>Relatório completo de pagamentos</h1>
                <p>Pagamentos agrupados por facção e filtrados pelo serviço realizado.</p>
              </div>
              <div class="geral">
                <p><strong>Emitido em:</strong> ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p>
                <p><strong>Total geral:</strong> ${escapeHtml(formatarMoeda(totalGeral))}</p>
              </div>
            </header>
            <div class="filtros"><strong>Filtros utilizados:</strong> ${escapeHtml(textoFiltros())}</div>
            ${secoes}
            <script>
              window.addEventListener("load", function () {
                window.setTimeout(function () { window.print(); }, 250);
              });
            <\/script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Erro ao gerar relatório completo do processo.", error);
      avisar("Não foi possível gerar o relatório completo. Verifique a conexão e tente novamente.");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  async function gerarRelatorioSimplificado() {
    const botao = document.getElementById(ID_BOTAO_RELATORIO);
    const textoOriginal = botao?.textContent || "Relatório simplificado";

    try {
      if (botao) {
        botao.disabled = true;
        botao.textContent = "Gerando relatório...";
      }

      const filtros = obterFiltros();
      const dados = await carregarDadosRelatorio();
      const pagamentos = filtrarPagamentos(dados.pagamentos, filtros);

      if (!pagamentos.length) {
        avisar("Não há pagamentos para os filtros selecionados.");
        return;
      }

      const grupos = agruparPorFaccao(pagamentos).map(grupo => {
        const cadastro = localizarCadastroFaccao(grupo.nome, dados.faccoes);
        return {
          nome: cadastro.nome || grupo.nome,
          chavePix: cadastro.chavePix,
          valor: grupo.valor
        };
      });

      const totalGeral = grupos.reduce((soma, grupo) => soma + Number(grupo.valor || 0), 0);
      const semPix = grupos.filter(grupo => !grupo.chavePix).length;
      const impressoEm = new Date().toLocaleString("pt-BR");

      const linhas = grupos.map(grupo => `
        <tr>
          <td>${escapeHtml(grupo.nome)}</td>
          <td class="pix ${grupo.chavePix ? "" : "sem-pix"}">${escapeHtml(grupo.chavePix || "NÃO CADASTRADO")}</td>
          <td class="valor">${escapeHtml(formatarMoeda(grupo.valor))}</td>
        </tr>
      `).join("");

      const html = `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Relatório simplificado de pagamentos</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 22px; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
              .cabecalho { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 12px; border-bottom: 3px solid #111827; }
              h1 { margin: 0; font-size: 23px; }
              .subtitulo { margin: 5px 0 0; color: #475569; font-size: 12px; }
              .emissao { text-align: right; color: #475569; font-size: 11px; white-space: nowrap; }
              .filtros { margin: 13px 0; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; font-size: 11px; line-height: 1.45; }
              .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 14px; }
              .resumo div { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
              .resumo span { display: block; color: #64748b; font-size: 9px; font-weight: bold; text-transform: uppercase; }
              .resumo strong { display: block; margin-top: 4px; font-size: 17px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #94a3b8; padding: 9px 10px; vertical-align: middle; }
              th { background: #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; }
              td { font-size: 12px; }
              th:nth-child(1), td:nth-child(1) { width: 35%; }
              th:nth-child(2), td:nth-child(2) { width: 43%; }
              th:nth-child(3), td:nth-child(3) { width: 22%; }
              .pix { word-break: break-all; }
              .sem-pix { color: #b91c1c; font-weight: bold; background: #fef2f2; }
              .valor { text-align: right; font-weight: bold; white-space: nowrap; }
              tfoot td { background: #f8fafc; font-size: 14px; font-weight: bold; }
              .rodape { margin-top: 16px; color: #64748b; font-size: 9px; text-align: center; }
              @page { size: A4 portrait; margin: 12mm; }
              @media print {
                body { margin: 0; }
                .nao-imprimir { display: none !important; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <header class="cabecalho">
              <div>
                <h1>Relatório simplificado de pagamentos</h1>
                <p class="subtitulo">Nome, chave PIX e valor total por facção.</p>
              </div>
              <div class="emissao"><strong>Emitido em:</strong><br>${escapeHtml(impressoEm)}</div>
            </header>

            <div class="filtros"><strong>Filtros utilizados:</strong> ${escapeHtml(textoFiltros(filtros))}</div>

            <section class="resumo">
              <div><span>Facções / responsáveis</span><strong>${grupos.length.toLocaleString("pt-BR")}</strong></div>
              <div><span>Sem PIX cadastrado</span><strong>${semPix.toLocaleString("pt-BR")}</strong></div>
              <div><span>Total</span><strong>${escapeHtml(formatarMoeda(totalGeral))}</strong></div>
            </section>

            <table>
              <thead>
                <tr><th>Nome</th><th>PIX</th><th>Valor</th></tr>
              </thead>
              <tbody>${linhas}</tbody>
              <tfoot>
                <tr><td colspan="2">TOTAL GERAL</td><td class="valor">${escapeHtml(formatarMoeda(totalGeral))}</td></tr>
              </tfoot>
            </table>

            <div class="rodape">Sistema CorpoNu • Relatório simplificado para pagamento</div>
            <script>
              window.addEventListener("load", function () {
                window.setTimeout(function () { window.print(); }, 250);
              });
            <\/script>
          </body>
        </html>
      `;

      abrirJanelaRelatorio(html);
    } catch (erro) {
      console.error("Erro ao gerar relatório simplificado de pagamentos.", erro);
      if (String(erro?.code || "").includes("permission-denied")) {
        avisar("Seu usuário não possui permissão para gerar este relatório.");
      } else {
        avisar(erro?.message || "Não foi possível gerar o relatório simplificado. Verifique a conexão e tente novamente.");
      }
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
      }
    }
  }

  function injetarEstilos() {
    if (document.getElementById(ID_STYLE)) return;

    const style = document.createElement("style");
    style.id = ID_STYLE;
    style.textContent = `
      #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais {
        align-items: center;
      }

      #pagamentos.pagamentos-ui-segura #btnRelatorioPagamentoSimplificado {
        background: #ffffff;
        border: 1px solid #64748b;
        color: #0f172a;
        white-space: nowrap;
      }

      #pagamentos.pagamentos-ui-segura #btnRelatorioPagamentoSimplificado:hover {
        background: #f8fafc;
      }

      #pagamentos.pagamentos-ui-segura #btnMarcarPagamentosFiltrados {
        margin-left: 0;
        order: 99;
      }

      .corponu-pagamento-modal {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(15, 23, 42, .68);
        backdrop-filter: blur(3px);
      }

      .corponu-pagamento-modal.hidden {
        display: none !important;
      }

      .corponu-pagamento-modal-card {
        width: min(620px, 100%);
        max-height: calc(100vh - 36px);
        overflow-y: auto;
        border: 1px solid #fecaca;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(15, 23, 42, .34);
      }

      .corponu-pagamento-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 20px 14px;
        border-bottom: 1px solid #e2e8f0;
      }

      .corponu-pagamento-modal-header h3 {
        margin: 0;
        color: #991b1b;
        font-size: 21px;
      }

      .corponu-pagamento-modal-header p {
        margin: 6px 0 0;
        color: #475569;
        font-size: 13px;
        line-height: 1.45;
      }

      .corponu-pagamento-modal-fechar {
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #ffffff;
        color: #334155;
        font-size: 23px;
        line-height: 1;
        cursor: pointer;
      }

      .corponu-pagamento-modal-body {
        padding: 18px 20px 20px;
      }

      .corponu-pagamento-resumo-confirmacao {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }

      .corponu-pagamento-resumo-confirmacao div {
        padding: 12px;
        border: 1px solid #cbd5e1;
        border-radius: 11px;
        background: #f8fafc;
      }

      .corponu-pagamento-resumo-confirmacao span {
        display: block;
        color: #64748b;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .corponu-pagamento-resumo-confirmacao strong {
        display: block;
        margin-top: 5px;
        color: #0f172a;
        font-size: 20px;
      }

      .corponu-pagamento-filtros-confirmacao {
        margin: 0 0 12px;
        padding: 10px 11px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #f8fafc;
        color: #334155;
        font-size: 12px;
        line-height: 1.5;
      }

      .corponu-pagamento-alerta-confirmacao {
        margin-bottom: 14px;
        padding: 11px 12px;
        border: 1px solid #fca5a5;
        border-radius: 10px;
        background: #fef2f2;
        color: #991b1b;
        font-size: 12px;
        line-height: 1.5;
      }

      .corponu-pagamento-check-confirmacao {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 0 0 14px;
        color: #0f172a;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.45;
        cursor: pointer;
      }

      .corponu-pagamento-check-confirmacao input {
        width: 18px;
        height: 18px;
        margin-top: 1px;
        accent-color: #15803d;
      }

      .corponu-pagamento-digitacao-confirmacao {
        display: block;
        color: #334155;
        font-size: 12px;
        font-weight: 800;
      }

      .corponu-pagamento-digitacao-confirmacao input {
        width: 100%;
        min-height: 44px;
        margin-top: 6px;
        padding: 10px 12px;
        border: 1px solid #94a3b8;
        border-radius: 10px;
        font: inherit;
        text-transform: uppercase;
      }

      .corponu-pagamento-modal-acoes {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }

      .corponu-pagamento-confirmar-final {
        background: #15803d !important;
        border-color: #15803d !important;
        color: #ffffff !important;
      }

      .corponu-pagamento-confirmar-final:disabled {
        opacity: .48;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais {
          display: grid;
          grid-template-columns: 1fr;
        }

        #pagamentos.pagamentos-ui-segura .pagamento-acoes-principais .btn {
          width: 100%;
        }

        #pagamentos.pagamentos-ui-segura #btnLimparFiltrosPagamento {
          margin-right: 0;
        }
      }

      @media (max-width: 520px) {
        .corponu-pagamento-resumo-confirmacao {
          grid-template-columns: 1fr;
        }

        .corponu-pagamento-modal-acoes {
          flex-direction: column-reverse;
        }

        .corponu-pagamento-modal-acoes .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function injetarModalConfirmacao() {
    if (document.getElementById(ID_MODAL)) return;

    const modal = document.createElement("div");
    modal.id = ID_MODAL;
    modal.className = "corponu-pagamento-modal hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "tituloConfirmacaoFortePagamentos");
    modal.innerHTML = `
      <div class="corponu-pagamento-modal-card">
        <div class="corponu-pagamento-modal-header">
          <div>
            <h3 id="tituloConfirmacaoFortePagamentos">Confirmar pagamentos filtrados?</h3>
            <p>Esta função altera todos os lançamentos que atendem aos filtros atuais.</p>
          </div>
          <button class="corponu-pagamento-modal-fechar" id="btnFecharConfirmacaoFortePagamentos" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="corponu-pagamento-modal-body">
          <div class="corponu-pagamento-resumo-confirmacao">
            <div><span>Lançamentos filtrados</span><strong id="confirmacaoForteQuantidade">0</strong></div>
            <div><span>Total filtrado</span><strong id="confirmacaoForteTotal">R$ 0,00</strong></div>
          </div>

          <div class="corponu-pagamento-filtros-confirmacao" id="confirmacaoForteFiltros"></div>

          <div class="corponu-pagamento-alerta-confirmacao">
            <strong>Atenção:</strong> depois da confirmação, todos os pagamentos pendentes encontrados pelo filtro serão marcados como pagos e a operação ficará registrada na auditoria. A validação final ainda bloqueará lançamentos sem valor ou possíveis duplicidades.
          </div>

          <label class="corponu-pagamento-check-confirmacao">
            <input id="checkConfirmacaoFortePagamentos" type="checkbox" />
            <span>Conferi o período, a facção, o processo, os dados PIX e os valores exibidos.</span>
          </label>

          <label class="corponu-pagamento-digitacao-confirmacao">
            Para liberar o pagamento, digite <strong>PAGAR</strong>:
            <input id="textoConfirmacaoFortePagamentos" type="text" autocomplete="off" spellcheck="false" placeholder="Digite PAGAR" />
          </label>

          <div class="corponu-pagamento-modal-acoes">
            <button class="btn" id="btnCancelarConfirmacaoFortePagamentos" type="button">Cancelar</button>
            <button class="btn corponu-pagamento-confirmar-final" id="btnExecutarConfirmacaoFortePagamentos" type="button" disabled>Sim, confirmar pagamentos</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const checkbox = document.getElementById("checkConfirmacaoFortePagamentos");
    const texto = document.getElementById("textoConfirmacaoFortePagamentos");
    const confirmar = document.getElementById("btnExecutarConfirmacaoFortePagamentos");

    const atualizarLiberacao = () => {
      confirmar.disabled = !(checkbox.checked && normalizarNome(texto.value) === "PAGAR");
    };

    checkbox.addEventListener("change", atualizarLiberacao);
    texto.addEventListener("input", atualizarLiberacao);
    document.getElementById("btnFecharConfirmacaoFortePagamentos").addEventListener("click", fecharModalConfirmacao);
    document.getElementById("btnCancelarConfirmacaoFortePagamentos").addEventListener("click", fecharModalConfirmacao);
    confirmar.addEventListener("click", executarPagamentoAposConfirmacaoForte);

    modal.addEventListener("click", event => {
      if (event.target === modal) fecharModalConfirmacao();
    });
  }

  function lerResumoDaTela() {
    const quantidade = String(
      document.getElementById("confPagamentoItens")?.textContent ||
      document.getElementById("pagamentoTotalEntregas")?.textContent ||
      "0"
    ).trim();

    const total = String(
      document.getElementById("confPagamentoTotal")?.textContent ||
      document.getElementById("pagamentoTotalValor")?.textContent ||
      "R$ 0,00"
    ).trim();

    return { quantidade, total };
  }

  function abrirModalConfirmacao(botao) {
    injetarModalConfirmacao();
    botaoPagamentoAguardandoConfirmacao = botao;

    const modal = document.getElementById(ID_MODAL);
    const checkbox = document.getElementById("checkConfirmacaoFortePagamentos");
    const texto = document.getElementById("textoConfirmacaoFortePagamentos");
    const confirmar = document.getElementById("btnExecutarConfirmacaoFortePagamentos");
    const resumo = lerResumoDaTela();

    document.getElementById("confirmacaoForteQuantidade").textContent = resumo.quantidade;
    document.getElementById("confirmacaoForteTotal").textContent = resumo.total;
    document.getElementById("confirmacaoForteFiltros").innerHTML = `<strong>Filtros atuais:</strong><br>${escapeHtml(textoFiltros())}`;

    checkbox.checked = false;
    texto.value = "";
    confirmar.disabled = true;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => texto.focus(), 80);
  }

  function fecharModalConfirmacao() {
    document.getElementById(ID_MODAL)?.classList.add("hidden");
    document.body.style.overflow = "";
    botaoPagamentoAguardandoConfirmacao = null;
  }

  function instalarLiberacaoDoConfirmNativo() {
    const confirmarOriginal = window.confirm;
    let restaurado = false;

    const restaurar = () => {
      if (restaurado) return;
      restaurado = true;
      if (window.confirm === confirmarProtegido) {
        window.confirm = confirmarOriginal;
      }
    };

    const confirmarProtegido = function (mensagem) {
      const texto = String(mensagem || "");
      if (/Marcar\s+\d+\s+pagamento\(s\)\s+como\s+pagos\?/i.test(texto) && /auditoria/i.test(texto)) {
        restaurar();
        return true;
      }
      return confirmarOriginal.apply(window, arguments);
    };

    window.confirm = confirmarProtegido;
    window.setTimeout(restaurar, 30000);
  }

  function executarPagamentoAposConfirmacaoForte() {
    const checkbox = document.getElementById("checkConfirmacaoFortePagamentos");
    const texto = document.getElementById("textoConfirmacaoFortePagamentos");
    const botao = botaoPagamentoAguardandoConfirmacao;

    if (!botao || !checkbox?.checked || normalizarNome(texto?.value) !== "PAGAR") return;

    document.getElementById(ID_MODAL)?.classList.add("hidden");
    document.body.style.overflow = "";
    botaoPagamentoAguardandoConfirmacao = null;

    if (obterFiltros().processo) {
      fecharPagamentosDoProcessoAgrupado();
      return;
    }

    instalarLiberacaoDoConfirmNativo();
    botao.dataset.confirmacaoForteLiberada = VERSION;
    botao.click();
  }

  function interceptarConfirmacaoPagamento(event) {
    const botao = event.target?.closest?.("#btnMarcarPagamentosFiltrados");
    if (!botao) return;

    if (botao.dataset.confirmacaoForteLiberada === VERSION) {
      delete botao.dataset.confirmacaoForteLiberada;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    abrirModalConfirmacao(botao);
  }


  function interceptarRelatorioCompletoAgrupado(event) {
    const botao = event.target?.closest?.("#btnImprimirPagamento");
    if (!botao || !obterFiltros().processo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    gerarRelatorioCompletoDoProcesso();
  }

  function interceptarConferenciaAgrupada(event) {
    const botao = event.target?.closest?.("#btnAtualizarConferenciaPagamentoFinal");
    if (!botao || !obterFiltros().processo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    atualizarConferenciaAgrupadaServidor();
  }

  function garantirBotaoRelatorioSimplificado() {
    const pagina = document.getElementById("pagamentos");
    const filtros = pagina?.querySelector(".pagamento-filtros-entregas");
    if (!pagina || !filtros) return false;

    let acoes = filtros.querySelector(".pagamento-acoes-principais");
    if (!acoes) {
      acoes = document.createElement("div");
      acoes.className = "pagamento-acoes-principais";
      filtros.appendChild(acoes);
    }

    let botaoSimplificado = document.getElementById(ID_BOTAO_RELATORIO);
    if (!botaoSimplificado) {
      botaoSimplificado = document.createElement("button");
      botaoSimplificado.id = ID_BOTAO_RELATORIO;
      botaoSimplificado.type = "button";
      botaoSimplificado.className = "btn";
      botaoSimplificado.textContent = "Relatório simplificado";
      botaoSimplificado.title = "Imprimir somente nome, PIX e valor";
      botaoSimplificado.addEventListener("click", gerarRelatorioSimplificado);
    }

    const btnLimpar = document.getElementById("btnLimparFiltrosPagamento");
    const btnCompleto = document.getElementById("btnImprimirPagamento");
    const btnConfirmar = document.getElementById("btnMarcarPagamentosFiltrados");

    if (btnLimpar) acoes.appendChild(btnLimpar);
    acoes.appendChild(botaoSimplificado);
    if (btnCompleto) acoes.appendChild(btnCompleto);
    if (btnConfirmar) acoes.appendChild(btnConfirmar);

    if (btnCompleto) btnCompleto.textContent = "Relatório completo com PIX";
    if (btnConfirmar) {
      btnConfirmar.textContent = "Confirmar pagamentos filtrados";
      btnConfirmar.title = "Marca todos os pagamentos encontrados pelos filtros atuais como pagos";
    }

    return true;
  }

  function organizarInterface() {
    injetarEstilos();
    injetarModalConfirmacao();
    garantirBotaoRelatorioSimplificado();
    prepararFiltroProcessosAgrupados();
  }

  function iniciar() {
    organizarInterface();

    // Os listeners no window/captura executam antes das rotinas antigas instaladas no document.
    window.addEventListener("click", interceptarConfirmacaoPagamento, true);
    window.addEventListener("click", interceptarRelatorioCompletoAgrupado, true);
    window.addEventListener("click", interceptarConferenciaAgrupada, true);

    document.addEventListener("change", event => {
      if (!event.target?.closest?.("#pagamentos")) return;
      const filtrosPagamento = [
        "pagamentoDataInicio",
        "pagamentoDataFim",
        "pagamentoFiltroFaccao",
        "pagamentoFiltroReferencia",
        "pagamentoFiltroPreco",
        "pagamentoFiltroStatus"
      ];
      if (!filtrosPagamento.includes(event.target.id)) return;

      if (event.target.id === "pagamentoFiltroPreco") {
        processoSelecionadoAgrupado = processoDaOpcao(event.target.value);
      }
      if (processoSelecionadoAgrupado) agendarRenderProcesso();
    }, true);

    document.addEventListener("click", event => {
      const navegacao = event.target?.closest?.('.nav-btn[data-page="pagamentos"]');
      if (navegacao) {
        window.setTimeout(organizarInterface, 120);
        window.setTimeout(organizarInterface, 500);
      }

      if (event.target?.closest?.("#btnLimparFiltrosPagamento")) {
        processoSelecionadoAgrupado = "";
        window.setTimeout(async () => {
          try {
            const dados = await carregarDadosTelaPagamentos(false);
            preencherFiltroProcessosAgrupados(dados.pagamentos, "");
          } catch (error) {
            console.warn(error);
          }
        }, 120);
      }

      if (
        event.target?.closest?.("#btnAtualizarServidor") ||
        event.target?.closest?.("#listaEntregasPagamento button")
      ) {
        cacheTelaPagamentos.expiraEm = 0;
        if (processoSelecionadoAgrupado) {
          window.setTimeout(() => renderizarProcessoAgrupado({ forcarServidor: false }), 900);
          window.setTimeout(() => renderizarProcessoAgrupado({ forcarServidor: false }), 1700);
        }
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !document.getElementById(ID_MODAL)?.classList.contains("hidden")) {
        fecharModalConfirmacao();
      }
    });

    // Tentativas curtas cobrem a montagem assíncrona da tela sem manter observadores permanentes.
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      organizarInterface();
      const interfacePronta = garantirBotaoRelatorioSimplificado();
      if ((tentativas >= 20 && interfacePronta) || tentativas >= 40) {
        window.clearInterval(intervalo);
      }
    }, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();

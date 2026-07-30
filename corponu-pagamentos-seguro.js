/*
 * CorpoNu — Pagamentos seguros + relatório PIX simplificado
 * Versão: 2026-07-29-pagamentos-seguros-relatorio-simplificado-1
 *
 * Instalação: carregar este arquivo no fim do index.html, imediatamente antes de </body>.
 */
(() => {
  "use strict";

  const VERSION = "2026-07-29-pagamentos-seguros-relatorio-simplificado-1";
  const FIREBASE_VERSION = "10.12.5";
  const DATASET_KEY = "corponuPagamentosSeguro";
  const ID_BOTAO_RELATORIO = "btnRelatorioPagamentoSimplificado";
  const ID_MODAL = "modalConfirmacaoFortePagamentos";
  const ID_STYLE = "styleCorpoNuPagamentosSeguro";

  if (document.documentElement.dataset[DATASET_KEY] === VERSION) return;
  document.documentElement.dataset[DATASET_KEY] = VERSION;

  let contextoFirebasePromise = null;
  let botaoPagamentoAguardandoConfirmacao = null;

  function normalizarNome(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
    return {
      inicio: String(document.getElementById("pagamentoDataInicio")?.value || ""),
      fim: String(document.getElementById("pagamentoDataFim")?.value || ""),
      faccao: String(document.getElementById("pagamentoFiltroFaccao")?.value || ""),
      referencia: String(document.getElementById("pagamentoFiltroReferencia")?.value || ""),
      precoId: String(document.getElementById("pagamentoFiltroPreco")?.value || ""),
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
    return {
      nome: String(faccao?.nome || nome || "SEM FACÇÃO").trim(),
      chavePix: String(
        faccao?.chavePix ||
        faccao?.pix ||
        faccao?.dadosPagamento?.pix ||
        ""
      ).trim()
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
      faccoes: faccoesSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    };
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
  }

  function iniciar() {
    organizarInterface();

    // O listener no window/captura executa antes da confirmação simples instalada no document.
    window.addEventListener("click", interceptarConfirmacaoPagamento, true);

    document.addEventListener("click", event => {
      const navegacao = event.target?.closest?.('.nav-btn[data-page="pagamentos"]');
      if (navegacao) {
        window.setTimeout(organizarInterface, 120);
        window.setTimeout(organizarInterface, 500);
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

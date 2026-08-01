(() => {
  "use strict";

  const VERSION = "2026-08-01-conferencia-financeira-visivel-66";
  const FB = "10.12.5";
  const ID = "sf66AuditoriaFinanceira";
  const STYLE_ID = "sf66AuditoriaStyle";
  let ctxPromise = null;
  let perfil = null;
  let carregandoPerfil = false;

  if (window.__CORPONU_AUDITORIA_FINANCEIRA__ === VERSION) return;
  window.__CORPONU_AUDITORIA_FINANCEIRA__ = VERSION;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const pagamentoAtivo = pagamento => pagamento?.excluido !== true && ![
    "CANCELADO", "CANCELADA", "ESTORNADO", "ESTORNADA", "EXCLUIDO", "EXCLUIDA"
  ].includes(normalizar(pagamento?.statusPagamento || pagamento?.status));
  const pagamentoPago = pagamento => normalizar(pagamento?.statusPagamento || pagamento?.status) === "PAGO";

  async function contexto() {
    if (ctxPromise) return ctxPromise;
    ctxPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, auth, fs]) => {
      if (!app.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const firebaseApp = app.getApp();
      return { auth: auth.getAuth(firebaseApp), db: fs.getFirestore(firebaseApp), fs };
    }).catch(error => {
      ctxPromise = null;
      throw error;
    });
    return ctxPromise;
  }

  async function carregarPerfil() {
    if (carregandoPerfil) return perfil;
    carregandoPerfil = true;
    try {
      const { auth, db, fs } = await contexto();
      for (let tentativa = 0; tentativa < 30 && !auth.currentUser; tentativa += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 200));
      }
      if (!auth.currentUser) return null;
      const perfilSnap = await fs.getDoc(fs.doc(db, "usuarios", auth.currentUser.uid));
      perfil = perfilSnap.exists() ? perfilSnap.data() : null;
      return perfil;
    } finally {
      carregandoPerfil = false;
    }
  }

  function podeAcessar() {
    if (!perfil || perfil.ativo === false) return false;
    if (normalizar(perfil.tipo) === "ADMIN") return true;
    const recursos = perfil.permissoes?.recursos || {};
    return recursos.gerenciarValores === true || recursos.marcarPagamentos === true;
  }

  function aplicarEstilo() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ID}{margin:14px 0;padding:16px;border:1px solid #93c5fd;border-radius:14px;background:#eff6ff;box-shadow:0 8px 22px rgba(37,99,235,.06)}
      #${ID} .sf66-cabecalho{display:flex;justify-content:space-between;gap:14px;align-items:center}
      #${ID} h3{margin:0;color:#1e3a8a;font-size:16px}
      #${ID} p{margin:5px 0 0;color:#475569;font-size:12px;line-height:1.45}
      #${ID} .sf66-resultado{margin-top:12px;padding:11px 12px;border:1px solid #dbeafe;border-radius:10px;background:#fff;color:#334155;font-weight:800;line-height:1.5}
      #${ID} table{width:100%;margin-top:10px;border-collapse:collapse;background:#fff}
      #${ID} th,#${ID} td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:11px;vertical-align:top}
      @media(max-width:680px){#${ID} .sf66-cabecalho{align-items:flex-start;flex-direction:column}#${ID} .sf66-cabecalho .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function localizarPaginaPagamentos() {
    return document.getElementById("pagamentos") ||
      [...document.querySelectorAll("section.page, .page")].find(elemento =>
        normalizar(elemento.querySelector("h2,h3")?.textContent).includes("PAGAMENTO")
      ) || null;
  }

  function localizarPainelConferencia(pagina) {
    if (!pagina) return null;
    const titulos = [...pagina.querySelectorAll("h2,h3,h4,strong")];
    const titulo = titulos.find(elemento => {
      const valor = normalizar(elemento.textContent);
      return valor.includes("CONFERENCIA ANTES DO PAGAMENTO") ||
        valor.includes("CONFERENCIA ANTES DO PAGAMENTO");
    });
    return titulo?.closest(".panel") || titulo?.parentElement?.parentElement || null;
  }

  function localizarPainelResumo(pagina) {
    if (!pagina) return null;
    const titulo = [...pagina.querySelectorAll("h2,h3,h4,strong")].find(elemento =>
      normalizar(elemento.textContent).includes("RESUMO POR FACCOES E PROCESSO") ||
      normalizar(elemento.textContent).includes("RESUMO POR FACCAO E PROCESSO")
    );
    return titulo?.closest(".panel") || titulo?.parentElement?.parentElement || null;
  }

  function inserir() {
    if (document.getElementById(ID) || !podeAcessar()) return Boolean(document.getElementById(ID));
    const pagina = localizarPaginaPagamentos();
    if (!pagina) return false;

    aplicarEstilo();
    const painel = document.createElement("section");
    painel.id = ID;
    painel.innerHTML = `
      <div class="sf66-cabecalho">
        <div>
          <h3>Conferência de integridade financeira</h3>
          <p>Verifica pagamentos duplicados, chegadas sem pagamento e pagamentos sem origem. A análise é somente de leitura e não altera nenhum registro.</p>
        </div>
        <button class="btn btn-primary" id="sf66Analisar" type="button">Analisar agora</button>
      </div>
      <div class="sf66-resultado" id="sf66Resultado">A análise será executada somente quando você clicar em “Analisar agora”.</div>
      <div id="sf66Tabela"></div>
    `;

    const conferenciaAtual = localizarPainelConferencia(pagina);
    const resumo = localizarPainelResumo(pagina);
    if (conferenciaAtual?.parentNode) conferenciaAtual.insertAdjacentElement("afterend", painel);
    else if (resumo?.parentNode) resumo.insertAdjacentElement("beforebegin", painel);
    else pagina.appendChild(painel);

    document.getElementById("sf66Analisar")?.addEventListener("click", analisar);
    return true;
  }

  async function analisar() {
    const botao = document.getElementById("sf66Analisar");
    const resultado = document.getElementById("sf66Resultado");
    const tabela = document.getElementById("sf66Tabela");
    if (!botao || !resultado || !tabela) return;

    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Analisando...";
    resultado.textContent = "Lendo movimentações e pagamentos. Nenhum dado será modificado.";
    tabela.innerHTML = "";

    try {
      const { db, fs } = await contexto();
      const [movimentacoesSnap, pagamentosSnap] = await Promise.all([
        fs.getDocs(fs.collection(db, "movimentacoesProducao")),
        fs.getDocs(fs.collection(db, "entregasPagamento"))
      ]);

      const movimentacoes = movimentacoesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const pagamentos = pagamentosSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const movimentacoesPorId = new Map(movimentacoes.map(item => [item.id, item]));
      const pagamentosPorMovimentacao = new Map();

      pagamentos.filter(pagamentoAtivo).forEach(pagamento => {
        if (!pagamento.movimentacaoId) return;
        const grupo = pagamentosPorMovimentacao.get(pagamento.movimentacaoId) || [];
        grupo.push(pagamento);
        pagamentosPorMovimentacao.set(pagamento.movimentacaoId, grupo);
      });

      const problemas = [];
      pagamentosPorMovimentacao.forEach((grupo, movimentacaoId) => {
        if (grupo.length <= 1) return;
        const movimento = movimentacoesPorId.get(movimentacaoId) || {};
        problemas.push({
          tipo: grupo.some(pagamentoPago) ? "Pago com duplicata ativa" : "Pagamentos duplicados",
          op: movimento.numeroOP || grupo[0]?.numeroOP || "-",
          processo: movimento.processo || grupo[0]?.processo || "-",
          origem: movimentacaoId,
          detalhe: grupo.map(item => item.id).join(", ")
        });
      });

      movimentacoes
        .filter(item => normalizar(item.tipoDestino) === "FACCAO" && texto(item.dataChegada))
        .filter(item => !["CANCELADO", "EXCLUIDO"].includes(normalizar(item.status)))
        .filter(item => !(pagamentosPorMovimentacao.get(item.id) || []).length)
        .forEach(item => problemas.push({
          tipo: "Chegada sem pagamento",
          op: item.numeroOP || "-",
          processo: item.processo || "-",
          origem: item.id,
          detalhe: item.destino || "-"
        }));

      pagamentos
        .filter(pagamentoAtivo)
        .filter(item => item.movimentacaoId && !movimentacoesPorId.has(item.movimentacaoId))
        .forEach(item => problemas.push({
          tipo: "Pagamento sem movimentação",
          op: item.numeroOP || "-",
          processo: item.processo || item.servicoNome || "-",
          origem: item.id,
          detalhe: item.movimentacaoId
        }));

      pagamentos
        .filter(pagamentoAtivo)
        .filter(item => normalizar(item.statusPagamento).includes("SEM VALOR") ||
          normalizar(item.statusPagamento).includes("AGUARDANDO VALOR") || item.valorPendente === true)
        .forEach(item => problemas.push({
          tipo: "Aguardando valor",
          op: item.numeroOP || "-",
          processo: item.processo || item.servicoNome || "-",
          origem: item.id,
          detalhe: item.avisoPagamento || "Valor pendente"
        }));

      const duplicidades = problemas.filter(item => item.tipo.toLowerCase().includes("duplic")).length;
      const semPagamento = problemas.filter(item => item.tipo === "Chegada sem pagamento").length;
      const semMovimentacao = problemas.filter(item => item.tipo === "Pagamento sem movimentação").length;
      const aguardandoValor = problemas.filter(item => item.tipo === "Aguardando valor").length;

      resultado.textContent = problemas.length
        ? `${problemas.length} ponto(s): ${duplicidades} duplicidade(s), ${semPagamento} chegada(s) sem pagamento, ${semMovimentacao} pagamento(s) sem movimentação e ${aguardandoValor} aguardando valor.`
        : "Nenhum conflito financeiro foi encontrado.";

      tabela.innerHTML = problemas.length ? `
        <div style="overflow:auto">
          <table>
            <thead><tr><th>Situação</th><th>OP</th><th>Processo</th><th>Origem</th><th>Detalhe</th></tr></thead>
            <tbody>${problemas.slice(0, 150).map(item => `
              <tr>
                <td><strong>${escapar(item.tipo)}</strong></td>
                <td>${escapar(item.op)}</td>
                <td>${escapar(item.processo)}</td>
                <td>${escapar(item.origem)}</td>
                <td>${escapar(item.detalhe)}</td>
              </tr>`).join("")}</tbody>
          </table>
        </div>
        ${problemas.length > 150 ? `<small>Mostrando 150 de ${problemas.length} resultados.</small>` : ""}
      ` : "";
    } catch (error) {
      console.error("Erro na conferência financeira.", error);
      resultado.textContent = "Não foi possível concluir a análise. Verifique as permissões e tente novamente.";
      tabela.innerHTML = "";
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }

  async function tentarPreparar() {
    if (!perfil) await carregarPerfil().catch(() => null);
    if (!podeAcessar()) return false;
    return inserir();
  }

  function iniciar() {
    let tentativas = 0;
    const intervalo = window.setInterval(async () => {
      tentativas += 1;
      const pronto = await tentarPreparar().catch(() => false);
      if (pronto || tentativas >= 80) window.clearInterval(intervalo);
    }, 350);
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo?.closest('[data-page="pagamentos"]')) return;
    [120, 500, 1200].forEach(atraso => window.setTimeout(() => tentarPreparar().catch(() => false), atraso));
  }, true);

  window.addEventListener("focus", () => tentarPreparar().catch(() => false));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
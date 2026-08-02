(() => {
  "use strict";

  const VERSION = "2026-08-02-verificacao-sutia-completo-segura-89";
  const FIREBASE_VERSION = "10.12.5";
  const BOTAO_ID = "btnVerificacaoSutiaCompleto89";
  const PAINEL_ID = "painelVerificacaoSutiaCompleto89";
  const LISTA_ID = "listaVerificacaoSutiaCompleto89";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const PROCESSO_LATERAL = "LATERAL";
  const PROCESSO_BOJO = "ENCAPAR BOJO";

  if (window.__CORPONU_VERIFICACAO_SUTIA_COMPLETO__ === VERSION) return;
  window.__CORPONU_VERIFICACAO_SUTIA_COMPLETO__ = VERSION;

  let firebasePromise = null;
  let analisando = false;
  const casos = new Map();

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const numero = (valor, padrao = 0) => {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
    const bruto = texto(valor);
    if (!bruto) return padrao;
    const convertido = Number(bruto.includes(",")
      ? bruto.replace(/\./g, "").replace(",", ".")
      : bruto);
    return Number.isFinite(convertido) ? convertido : padrao;
  };

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function processoCanonico(valor) {
    const chave = normalizar(valor);
    if (chave === "SUTIA COMPLETO") return PROCESSO_COMPLETO;
    if (chave === "LATERAL" || chave === "CORTE") return PROCESSO_LATERAL;
    if (["ENCAPAR BOJO", "ENCAPAR BOJOS", "BOJO"].includes(chave)) return PROCESSO_BOJO;
    return texto(valor).toUpperCase();
  }

  function dataBR(valor) {
    const iso = texto(valor).slice(0, 10);
    const partes = iso.split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : (iso || "-");
  }

  function statusPago(item) {
    return ["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(
      normalizar(item?.statusPagamento || item?.status || "")
    );
  }

  function pagamentoAtivo(item) {
    const status = normalizar(item?.statusPagamento || item?.status || "");
    return item?.excluido !== true && item?.cancelado !== true && ![
      "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"
    ].includes(status);
  }

  function movimentoChegou(item) {
    return Boolean(texto(item?.dataChegada)) || [
      "RETORNOU", "FINALIZADO", "FINALIZADA", "ENCAMINHADO", "ENCAMINHADA"
    ].includes(normalizar(item?.status));
  }

  function quantidadeRecebida(item) {
    const recebida = numero(item?.quantidadeRecebida, NaN);
    if (Number.isFinite(recebida) && recebida >= 0) return recebida;
    return Math.max(numero(item?.quantidadeEnviada) - numero(item?.falta), 0);
  }

  function avisar(mensagem, erro = false) {
    const toast = document.getElementById("toast");
    if (!toast) {
      window.alert(mensagem);
      return;
    }
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__corponuVerificacaoSutia89Toast);
    window.__corponuVerificacaoSutia89Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 6000);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModulo, fs]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não foi inicializado.");
      return { fs, db: fs.getFirestore(appModulo.getApp()) };
    }).catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  function instalarEstilo() {
    if (document.getElementById("styleVerificacaoSutiaCompleto89")) return;
    const style = document.createElement("style");
    style.id = "styleVerificacaoSutiaCompleto89";
    style.textContent = `
      #${PAINEL_ID}{margin:16px 0;border:1px solid #cbd5e1;border-radius:16px;background:#fff;overflow:hidden}
      #${PAINEL_ID}.hidden{display:none!important}
      #${PAINEL_ID} .vs89-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
      #${PAINEL_ID} .vs89-head h3{margin:0 0 4px;color:#0f172a}
      #${PAINEL_ID} .vs89-head p{margin:0;color:#64748b;font-size:12px;line-height:1.45}
      #${PAINEL_ID} .vs89-safe{display:inline-flex;margin-top:7px;padding:4px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:10px;font-weight:900}
      #${PAINEL_ID} .vs89-cards{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;padding:14px 16px}
      #${PAINEL_ID} .vs89-card{padding:11px 12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
      #${PAINEL_ID} .vs89-card span{display:block;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase}
      #${PAINEL_ID} .vs89-card strong{display:block;margin-top:4px;color:#0f172a;font-size:22px}
      #${PAINEL_ID} .vs89-tools{display:flex;flex-wrap:wrap;gap:10px;padding:0 16px 14px}
      #${PAINEL_ID} .vs89-tools label{min-width:190px;margin:0}
      #${PAINEL_ID} .vs89-badge{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap}
      #${PAINEL_ID} .vs89-badge.ok{background:#dcfce7;color:#166534}
      #${PAINEL_ID} .vs89-badge.pendente{background:#fef3c7;color:#92400e}
      #${PAINEL_ID} .vs89-badge.pago{background:#fee2e2;color:#991b1b}
      #${PAINEL_ID} .vs89-detail{display:block;margin-top:3px;color:#64748b;font-size:10px;line-height:1.35}
      #${PAINEL_ID} .vs89-historico{min-width:260px;white-space:normal;line-height:1.4}
      #${PAINEL_ID} .vs89-vazio{text-align:center;padding:22px;color:#64748b}
      #${PAINEL_ID} .vs89-acao{white-space:nowrap}
      @media(max-width:900px){#${PAINEL_ID} .vs89-cards{grid-template-columns:repeat(2,minmax(140px,1fr))}}
      @media(max-width:620px){#${PAINEL_ID} .vs89-head{flex-direction:column}#${PAINEL_ID} .vs89-cards{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function criarInterface() {
    const pagina = document.getElementById("pagamentos");
    if (!pagina) return false;

    const cabecalho = pagina.querySelector(".pagamentos-relatorio-panel > .panel-header:first-child");
    let actions = cabecalho?.querySelector(".actions");
    if (cabecalho && !actions) {
      actions = document.createElement("div");
      actions.className = "actions";
      cabecalho.appendChild(actions);
    }

    if (actions && !document.getElementById(BOTAO_ID)) {
      const botao = document.createElement("button");
      botao.id = BOTAO_ID;
      botao.className = "btn";
      botao.type = "button";
      botao.textContent = "Verificar Sutiã Completo";
      actions.appendChild(botao);
      botao.addEventListener("click", () => {
        const painel = document.getElementById(PAINEL_ID);
        painel?.classList.toggle("hidden");
        if (painel && !painel.classList.contains("hidden")) {
          painel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    if (!document.getElementById(PAINEL_ID)) {
      const painel = document.createElement("section");
      painel.id = PAINEL_ID;
      painel.className = "hidden";
      painel.innerHTML = `
        <div class="vs89-head">
          <div>
            <h3>Verificação de componentes do Sutiã Completo</h3>
            <p>Lista pagamentos antigos que não possuem confirmação de lateral e bojo. O histórico de cada OP só é consultado quando você clicar em “Verificar histórico”.</p>
            <span class="vs89-safe">Somente leitura — nenhum valor será alterado</span>
          </div>
          <div class="actions">
            <button class="btn btn-primary" id="btnExecutarVerificacaoSutia89" type="button">Carregar pagamentos</button>
            <button class="btn" id="btnFecharVerificacaoSutia89" type="button">Fechar</button>
          </div>
        </div>
        <div class="vs89-cards">
          <div class="vs89-card"><span>Total encontrado</span><strong id="vs89Total">0</strong></div>
          <div class="vs89-card"><span>Já confirmados</span><strong id="vs89Confirmados">0</strong></div>
          <div class="vs89-card"><span>Pendentes sem informação</span><strong id="vs89Pendentes">0</strong></div>
          <div class="vs89-card"><span>Pagos sem informação</span><strong id="vs89Pagos">0</strong></div>
        </div>
        <div class="vs89-tools">
          <label>Situação
            <select id="vs89Filtro">
              <option value="">Todas</option>
              <option value="confirmado">Já confirmado</option>
              <option value="pendente_sem_informacao">Pendente sem informação</option>
              <option value="pago_sem_informacao">Pago sem informação</option>
            </select>
          </label>
          <label>Buscar
            <input id="vs89Busca" type="text" placeholder="OP, referência ou facção" />
          </label>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Situação</th><th>OP</th><th>Ref.</th><th>Facção</th><th>Chegada</th><th>Lateral</th><th>Bojo</th><th>Histórico</th><th>Ação</th></tr>
            </thead>
            <tbody id="${LISTA_ID}"><tr><td colspan="9" class="vs89-vazio">Clique em “Carregar pagamentos”.</td></tr></tbody>
          </table>
        </div>`;

      const ancora = pagina.querySelector(".pagamento-cards");
      if (ancora) ancora.insertAdjacentElement("afterend", painel);
      else pagina.querySelector(".pagamentos-relatorio-panel")?.appendChild(painel);

      painel.querySelector("#btnExecutarVerificacaoSutia89")?.addEventListener("click", carregarPagamentos);
      painel.querySelector("#btnFecharVerificacaoSutia89")?.addEventListener("click", () => painel.classList.add("hidden"));
      painel.querySelector("#vs89Filtro")?.addEventListener("change", renderizar);
      painel.querySelector("#vs89Busca")?.addEventListener("input", renderizar);
      painel.querySelector(`#${LISTA_ID}`)?.addEventListener("click", event => {
        const botao = event.target instanceof Element
          ? event.target.closest("[data-verificar-historico]")
          : null;
        if (botao) verificarHistorico(botao.dataset.verificarHistorico, botao);
      });
    }

    return true;
  }

  function extrairConferencia(pagamento, movimentacao) {
    const memoria = pagamento?.memoriaCalculoSutiaCompleto || {};
    const conferencia = movimentacao?.sutiaCompletoConferencia || {};

    const lateral = typeof memoria.lateralPronta === "boolean"
      ? memoria.lateralPronta
      : (typeof conferencia.lateralPronta === "boolean" ? conferencia.lateralPronta : null);
    const bojo = typeof memoria.bojoPronto === "boolean"
      ? memoria.bojoPronto
      : (typeof conferencia.bojoPronto === "boolean" ? conferencia.bojoPronto : null);

    return { lateral, bojo, completo: typeof lateral === "boolean" && typeof bojo === "boolean" };
  }

  async function consultarPagamentos() {
    const { db, fs } = await firebase();
    const encontrados = new Map();
    const campos = ["processo", "servicoNome", "processoMovimentacao"];
    const valores = ["SUTIÃ COMPLETO", "SUTIA COMPLETO"];

    for (const campo of campos) {
      for (const valor of valores) {
        try {
          const snap = await fs.getDocs(fs.query(
            fs.collection(db, "entregasPagamento"),
            fs.where(campo, "==", valor),
            fs.limit(500)
          ));
          snap.docs.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (error) {
          console.warn(`Consulta de pagamentos por ${campo} indisponível.`, error);
        }
      }
    }

    return [...encontrados.values()].filter(item =>
      pagamentoAtivo(item) && processoCanonico(item.processo || item.servicoNome || item.processoMovimentacao) === PROCESSO_COMPLETO
    );
  }

  function dividirEmBlocos(itens, tamanho = 30) {
    const blocos = [];
    for (let i = 0; i < itens.length; i += tamanho) blocos.push(itens.slice(i, i + tamanho));
    return blocos;
  }

  async function carregarMovimentacoesPorId(ids) {
    const unicos = [...new Set(ids.filter(Boolean))];
    const mapa = new Map();
    if (!unicos.length) return mapa;

    const { db, fs } = await firebase();
    for (const bloco of dividirEmBlocos(unicos)) {
      try {
        const snap = await fs.getDocs(fs.query(
          fs.collection(db, "movimentacoesProducao"),
          fs.where(fs.documentId(), "in", bloco)
        ));
        snap.docs.forEach(item => mapa.set(item.id, { id: item.id, ...item.data() }));
      } catch (error) {
        console.warn("Movimentações dos pagamentos não carregadas em lote.", error);
        for (const id of bloco) {
          try {
            const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
            if (snap.exists()) mapa.set(snap.id, { id: snap.id, ...snap.data() });
          } catch (_) {}
        }
      }
    }
    return mapa;
  }

  async function carregarPagamentos() {
    if (analisando) return;
    analisando = true;
    const botao = document.getElementById("btnExecutarVerificacaoSutia89");
    const tbody = document.getElementById(LISTA_ID);

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Carregando...";
    }
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="vs89-vazio">Lendo pagamentos do Sutiã Completo...</td></tr>';

    try {
      const pagamentos = await consultarPagamentos();
      const movimentos = await carregarMovimentacoesPorId(pagamentos.map(item => item.movimentacaoId));
      casos.clear();

      pagamentos.forEach(pagamento => {
        const movimento = movimentos.get(pagamento.movimentacaoId) || null;
        const conferencia = extrairConferencia(pagamento, movimento);
        const classificacao = conferencia.completo
          ? "confirmado"
          : (statusPago(pagamento) ? "pago_sem_informacao" : "pendente_sem_informacao");

        casos.set(pagamento.id, {
          pagamento,
          movimento,
          conferencia,
          classificacao,
          historico: null,
          carregandoHistorico: false
        });
      });

      atualizarCards();
      renderizar();
      avisar(`${casos.size} pagamento(s) de Sutiã Completo verificado(s).`);
    } catch (error) {
      console.error("Falha na verificação do Sutiã Completo.", error);
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="vs89-vazio">Não foi possível carregar a verificação. Nenhum dado foi alterado.</td></tr>';
      avisar("Não foi possível carregar a verificação. Nenhum dado foi alterado.", true);
    } finally {
      analisando = false;
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Atualizar verificação";
      }
    }
  }

  function atualizarCards() {
    const itens = [...casos.values()];
    const definir = (id, valor) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = String(valor);
    };
    definir("vs89Total", itens.length);
    definir("vs89Confirmados", itens.filter(item => item.classificacao === "confirmado").length);
    definir("vs89Pendentes", itens.filter(item => item.classificacao === "pendente_sem_informacao").length);
    definir("vs89Pagos", itens.filter(item => item.classificacao === "pago_sem_informacao").length);
  }

  function rotuloClassificacao(valor) {
    if (valor === "confirmado") return "Já confirmado";
    if (valor === "pago_sem_informacao") return "Pago sem informação";
    return "Pendente sem informação";
  }

  function classeClassificacao(valor) {
    if (valor === "confirmado") return "ok";
    if (valor === "pago_sem_informacao") return "pago";
    return "pendente";
  }

  function rotuloBooleano(valor) {
    if (valor === true) return "Sim, já estava pronta";
    if (valor === false) return "Não, foi feita no completo";
    return "Sem informação";
  }

  function resumoHistorico(historico) {
    if (!historico) return "Ainda não consultado";
    if (historico.erro) return "Não foi possível consultar";
    return `Lateral: ${historico.lateral.resumo} • Bojo: ${historico.bojo.resumo}`;
  }

  function renderizar() {
    const tbody = document.getElementById(LISTA_ID);
    if (!tbody) return;
    const filtro = texto(document.getElementById("vs89Filtro")?.value);
    const busca = normalizar(document.getElementById("vs89Busca")?.value);

    const itens = [...casos.values()].filter(item => {
      if (filtro && item.classificacao !== filtro) return false;
      if (!busca) return true;
      const p = item.pagamento;
      return normalizar(`${p.numeroOP || p.op || ""} ${p.referencia || ""} ${p.faccao || p.destino || ""}`).includes(busca);
    });

    if (!itens.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="vs89-vazio">Nenhum pagamento encontrado neste filtro.</td></tr>';
      return;
    }

    tbody.innerHTML = itens.map(item => {
      const p = item.pagamento;
      const data = p.dataChegada || p.dataEntrega || item.movimento?.dataChegada || "";
      const numeroOP = p.numeroOP || p.op || item.movimento?.numeroOP || "-";
      const referencia = p.referencia || item.movimento?.referencia || "-";
      const faccao = p.faccao || p.destino || item.movimento?.destino || "-";
      return `
        <tr>
          <td><span class="vs89-badge ${classeClassificacao(item.classificacao)}">${escapar(rotuloClassificacao(item.classificacao))}</span></td>
          <td><strong>${escapar(numeroOP)}</strong></td>
          <td>${escapar(referencia)}</td>
          <td>${escapar(faccao)}</td>
          <td>${escapar(dataBR(data))}</td>
          <td>${escapar(rotuloBooleano(item.conferencia.lateral))}</td>
          <td>${escapar(rotuloBooleano(item.conferencia.bojo))}</td>
          <td class="vs89-historico">${escapar(resumoHistorico(item.historico))}</td>
          <td class="vs89-acao">${item.classificacao === "confirmado" ? "—" : `<button class="btn" type="button" data-verificar-historico="${escapar(p.id)}" ${item.carregandoHistorico ? "disabled" : ""}>${item.carregandoHistorico ? "Verificando..." : "Verificar histórico"}</button>`}</td>
        </tr>`;
    }).join("");
  }

  async function consultarMovimentacoesDaOP(caso) {
    const { db, fs } = await firebase();
    const p = caso.pagamento;
    const mov = caso.movimento;
    const opId = texto(p.opId || mov?.opId);
    const numeroOP = texto(p.numeroOP || p.op || mov?.numeroOP);
    const encontrados = new Map();

    if (opId) {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "movimentacoesProducao"),
        fs.where("opId", "==", opId)
      ));
      snap.docs.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
    }

    if (!encontrados.size && numeroOP) {
      const variantes = [numeroOP];
      const numerico = Number(numeroOP);
      if (Number.isFinite(numerico)) variantes.push(numerico);
      for (const valor of variantes) {
        try {
          const snap = await fs.getDocs(fs.query(
            fs.collection(db, "movimentacoesProducao"),
            fs.where("numeroOP", "==", valor)
          ));
          snap.docs.forEach(item => encontrados.set(item.id, { id: item.id, ...item.data() }));
        } catch (_) {}
      }
    }

    return [...encontrados.values()];
  }

  function timestampData(valor) {
    const data = texto(valor).slice(0, 10);
    if (!data) return null;
    const tempo = new Date(`${data}T12:00:00`).getTime();
    return Number.isFinite(tempo) ? tempo : null;
  }

  function analisarComponente(movimentacoes, processo, limiteData, quantidadeAlvo) {
    const evidencias = movimentacoes.filter(item => {
      if (!movimentoChegou(item) || processoCanonico(item.processo || item.servicoNome) !== processo) return false;
      const chegada = timestampData(item.dataChegada);
      return limiteData === null || chegada === null || chegada <= limiteData;
    });

    const quantidade = evidencias.reduce((soma, item) => soma + quantidadeRecebida(item), 0);
    const responsaveis = [...new Set(evidencias.map(item => texto(item.destino || item.faccao)).filter(Boolean))];
    let resumo = "sem evidência anterior";
    if (quantidade > 0 && quantidadeAlvo > 0 && quantidade < quantidadeAlvo) {
      resumo = `${quantidade} de ${quantidadeAlvo} peças`;
    } else if (quantidade > 0) {
      resumo = `${quantidade} peça(s) encontrada(s)`;
    }
    if (responsaveis.length) resumo += ` — ${responsaveis.join(", ")}`;
    return { quantidade, quantidadeAlvo, responsaveis, resumo };
  }

  async function verificarHistorico(id, botao) {
    const caso = casos.get(id);
    if (!caso || caso.carregandoHistorico) return;
    caso.carregandoHistorico = true;
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Verificando...";
    }

    try {
      const movimentacoes = await consultarMovimentacoesDaOP(caso);
      const movimentoCompleto = caso.movimento || movimentacoes.find(item =>
        processoCanonico(item.processo || item.servicoNome) === PROCESSO_COMPLETO
      );
      const limiteData = timestampData(movimentoCompleto?.dataEnvio || caso.pagamento?.dataEnvio);
      const quantidadeAlvo = Math.max(
        numero(caso.pagamento?.quantidadeRecebida),
        numero(caso.pagamento?.quantidade),
        quantidadeRecebida(movimentoCompleto),
        0
      );

      caso.historico = {
        lateral: analisarComponente(movimentacoes, PROCESSO_LATERAL, limiteData, quantidadeAlvo),
        bojo: analisarComponente(movimentacoes, PROCESSO_BOJO, limiteData, quantidadeAlvo)
      };
    } catch (error) {
      console.error("Não foi possível verificar o histórico da OP.", error);
      caso.historico = { erro: true };
      avisar("Não foi possível consultar o histórico desta OP. Nenhum dado foi alterado.", true);
    } finally {
      caso.carregandoHistorico = false;
      renderizar();
    }
  }

  function iniciar() {
    instalarEstilo();
    criarInterface();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();

(() => {
  "use strict";

  const VERSION = "2026-08-08-auditoria-pagamentos-160";
  const FIREBASE_VERSION = "10.12.5";
  const BTN_ID = "btnAuditarPagamentos160";
  const MODAL_ID = "modalAuditoriaPagamentos160";
  const STYLE_ID = "styleAuditoriaPagamentos160";
  const CACHE_MS = 5 * 60 * 1000;

  if (window.__CORPONU_AUDITORIA_PAGAMENTOS_160__ === VERSION) return;
  window.__CORPONU_AUDITORIA_PAGAMENTOS_160__ = VERSION;

  let contextoPromise = null;
  let usuarioAtual = null;
  let perfilAtual = null;
  let executando = false;
  let cache = { expiraEm: 0, resultado: null };

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const numero = valor => {
    const n = Number(valor || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const inteiro = valor => Math.max(0, Math.floor(numero(valor)));

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const moeda = valor => numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  function statusCanonico(item) {
    if (item?.excluido === true || item?.cancelado === true) return "excluido";
    const status = normalizar(item?.statusPagamento || item?.status || "PENDENTE");
    if (["PAGO", "PAGA", "QUITADO", "QUITADA"].includes(status)) return "pago";
    if (["SEM VALOR", "SEM_VALOR"].includes(status) || item?.valorPendente === true) return "sem_valor";
    if (["EXCLUIDO", "EXCLUIDA", "CANCELADO", "CANCELADA", "ESTORNADO", "ESTORNADA"].includes(status)) return "excluido";
    return "pendente";
  }

  function processo(item) {
    const original = texto(item?.processo || item?.servicoNome || item?.processoMovimentacao || "");
    const chave = normalizar(original);
    const aliases = {
      BOJO: "ENCAPAR BOJO",
      ENCAPAR: "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      ALCA: "ALÇA",
      ALCAS: "ALÇA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM",
      "MONTAR CALCINHA": "CALCINHA MONTAGEM",
      CALCINHA: "CALCINHA COMPLETA",
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "SUTIA COMPLETO": "SUTIÃ COMPLETO"
    };
    return aliases[chave] || original.toUpperCase();
  }

  function op(item) {
    return texto(item?.numeroOP || item?.numeroOPExterno || item?.op || item?.numeroOrdem || item?.opId || "");
  }

  function faccao(item) {
    return texto(item?.faccao || item?.responsavel || item?.destino || "").toUpperCase();
  }

  function referencia(item) {
    return texto(item?.referencia || item?.ref || "").toUpperCase();
  }

  function quantidade(item) {
    return inteiro(item?.quantidade ?? item?.quantidadeRecebida ?? item?.quantidadeEnviada ?? 0);
  }

  function total(item) {
    return numero(item?.total ?? item?.subtotal ?? item?.valorTotal ?? 0);
  }

  function dataItem(item) {
    return texto(item?.dataEntrega || item?.dataChegada || item?.competencia || "");
  }

  function ehControle(item) {
    const tipo = normalizar(item?.tipoDocumento || item?.tipoRegistro || item?.origem || "");
    return tipo === "CONTROLE PROCESSO V2" || tipo.includes("CONTROLE PROCESSO");
  }

  function origem(item) {
    if (ehControle(item)) return "Controle interno V2";
    if (normalizar(item?.tipoDocumento) === "LANCAMENTO FINANCEIRO V2") return "Fechamento financeiro V2";
    if (item?.pagamentoComplementarRestante === true || normalizar(item?.origem).includes("RESTANTE")) return "Complemento / restante";
    if (item?.pagamentoReenvio === true || texto(item?.movimentacaoOrigemId)) return "Reenvio";
    if (item?.pagamentoManualFinanceiro === true || item?.origemManualPagamentos === true || normalizar(item?.origem).includes("MANUAL")) return "Manual";
    if (texto(item?.movimentacaoId) || normalizar(item?.origem) === "MOVIMENTACAO") return "Movimentação / chegada";
    if (normalizar(item?.origem).includes("MANEJO")) return "Manejo legado";
    return texto(item?.origem || item?.tipoDocumento || "Sem origem identificada") || "Sem origem identificada";
  }

  function versaoItem(item) {
    return texto(
      item?.versaoGeracao ||
      item?.versaoRegistro ||
      item?.versaoPagamento ||
      item?.versao ||
      item?.version ||
      "Sem versão"
    );
  }

  function chaveDuplicidade(item) {
    return [
      normalizar(op(item)),
      normalizar(referencia(item)),
      normalizar(faccao(item)),
      normalizar(processo(item)),
      quantidade(item),
      total(item).toFixed(2)
    ].join("|");
  }

  function chavePossivelDuplicidade(item) {
    return [
      normalizar(op(item)),
      normalizar(faccao(item)),
      normalizar(processo(item)),
      quantidade(item)
    ].join("|");
  }

  function contarPor(lista, extrator) {
    const mapa = new Map();
    lista.forEach(item => {
      const chave = texto(extrator(item)) || "Não informado";
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    });
    return [...mapa.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function gruposPor(lista, extrator) {
    const mapa = new Map();
    lista.forEach(item => {
      const chave = extrator(item);
      if (!chave || chave.replaceAll("|", "") === "") return;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(item);
    });
    return [...mapa.values()].filter(grupo => grupo.length > 1);
  }

  function analisarDocumentos(documentos) {
    const todos = documentos.map(doc => ({ id: doc.id, ...doc.data() }));
    const controles = todos.filter(ehControle);
    const pagamentos = todos.filter(item => !ehControle(item));
    const ativos = pagamentos.filter(item => statusCanonico(item) !== "excluido");

    const status = {
      pago: pagamentos.filter(item => statusCanonico(item) === "pago").length,
      pendente: pagamentos.filter(item => statusCanonico(item) === "pendente").length,
      semValor: pagamentos.filter(item => statusCanonico(item) === "sem_valor").length,
      excluido: pagamentos.filter(item => statusCanonico(item) === "excluido").length
    };

    const inconsistencias = ativos.flatMap(item => {
      const problemas = [];
      if (!op(item)) problemas.push("Sem OP");
      if (!faccao(item)) problemas.push("Sem facção/responsável");
      if (!processo(item)) problemas.push("Sem processo");
      if (quantidade(item) <= 0) problemas.push("Quantidade zerada/ausente");
      if (statusCanonico(item) !== "sem_valor" && total(item) <= 0) problemas.push("Total zerado fora de 'sem valor'");
      if (!dataItem(item)) problemas.push("Sem data/competência");
      if (!problemas.length) return [];
      return [{ item, problemas }];
    });

    const duplicidadesFortes = gruposPor(ativos, chaveDuplicidade);
    const possiveisDuplicidades = gruposPor(ativos, chavePossivelDuplicidade)
      .filter(grupo => !duplicidadesFortes.some(forte => forte.some(a => grupo.some(b => a.id === b.id))));

    return {
      geradoEm: new Date().toISOString(),
      totalDocumentos: todos.length,
      controles: controles.length,
      pagamentos: pagamentos.length,
      ativos: ativos.length,
      status,
      valorAtivo: ativos.reduce((soma, item) => soma + (statusCanonico(item) === "sem_valor" ? 0 : total(item)), 0),
      origens: contarPor(pagamentos, origem),
      processos: contarPor(pagamentos, processo),
      versoes: contarPor(pagamentos, versaoItem),
      duplicidadesFortes,
      possiveisDuplicidades,
      inconsistencias
    };
  }

  async function contextoFirebase() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appMod.getApp();
      return { auth: authMod.getAuth(app), authMod, db: fs.getFirestore(app), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function carregarPerfil(user) {
    if (!user) return null;
    const { db, fs } = await contextoFirebase();
    const snap = await fs.getDoc(fs.doc(db, "usuarios", user.uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  function ehAdmin() {
    return perfilAtual?.ativo !== false && perfilAtual?.tipo === "admin";
  }

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:100000;background:#0f172ab8;display:grid;place-items:center;padding:18px}
      #${MODAL_ID}.hidden{display:none!important}
      #${MODAL_ID} .audit-card{width:min(1180px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px #02061766}
      #${MODAL_ID} .audit-head{position:sticky;top:0;z-index:2;background:#fff;padding:18px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
      #${MODAL_ID} .audit-head h3{margin:0 0 5px;font-size:20px} #${MODAL_ID} .audit-head p{margin:0;color:#64748b;font-size:12px;line-height:1.45}
      #${MODAL_ID} .audit-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      #${MODAL_ID} .audit-body{padding:18px 20px 24px;display:grid;gap:18px}
      #${MODAL_ID} .audit-note{padding:12px 14px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:12px;font-size:12px;font-weight:750;line-height:1.5}
      #${MODAL_ID} .audit-grid{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px}
      #${MODAL_ID} .audit-kpi{padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc} #${MODAL_ID} .audit-kpi span{display:block;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase} #${MODAL_ID} .audit-kpi strong{display:block;margin-top:5px;font-size:19px;color:#0f172a}
      #${MODAL_ID} .audit-section{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden} #${MODAL_ID} .audit-section>header{padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0} #${MODAL_ID} .audit-section h4{margin:0;font-size:13px} #${MODAL_ID} .audit-section p{margin:4px 0 0;color:#64748b;font-size:10px}
      #${MODAL_ID} .audit-table{overflow:auto;max-height:320px} #${MODAL_ID} table{width:100%;border-collapse:collapse;font-size:11px} #${MODAL_ID} th,#${MODAL_ID} td{padding:8px 10px;border-bottom:1px solid #eef2f7;text-align:left;white-space:nowrap} #${MODAL_ID} th{position:sticky;top:0;background:#fff;font-size:9px;text-transform:uppercase;color:#64748b}
      #${MODAL_ID} .audit-loading{padding:30px;text-align:center;font-weight:850;color:#334155}
      #${BTN_ID}{white-space:nowrap}
      @media(max-width:900px){#${MODAL_ID} .audit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#${MODAL_ID} .audit-head{flex-direction:column}#${MODAL_ID} .audit-actions{width:100%;justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function garantirModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "hidden";
    modal.innerHTML = `
      <div class="audit-card" role="dialog" aria-modal="true" aria-labelledby="auditPagTitulo160">
        <div class="audit-head">
          <div><h3 id="auditPagTitulo160">Auditoria dos pagamentos existentes</h3><p>Diagnóstico somente leitura. Nenhum pagamento é criado, alterado, pago, reaberto ou excluído.</p></div>
          <div class="audit-actions"><button class="btn" type="button" data-audit-copiar>Copiar diagnóstico</button><button class="btn" type="button" data-audit-recarregar>Auditar novamente</button><button class="btn btn-danger" type="button" data-audit-fechar>Fechar</button></div>
        </div>
        <div class="audit-body" data-audit-conteudo><div class="audit-loading">Clique em “Auditar pagamentos” para iniciar.</div></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => { if (event.target === modal) modal.classList.add("hidden"); });
    modal.querySelector("[data-audit-fechar]")?.addEventListener("click", () => modal.classList.add("hidden"));
    modal.querySelector("[data-audit-recarregar]")?.addEventListener("click", () => executarAuditoria(true));
    modal.querySelector("[data-audit-copiar]")?.addEventListener("click", copiarDiagnostico);
    return modal;
  }

  function linhasResumo(itens, limite = 20) {
    return itens.slice(0, limite).map(item => `<tr><td>${escapar(item.nome)}</td><td><strong>${item.total.toLocaleString("pt-BR")}</strong></td></tr>`).join("") || '<tr><td colspan="2">Nenhum.</td></tr>';
  }

  function linhasDuplicidade(grupos, limite = 20) {
    return grupos.slice(0, limite).map(grupo => {
      const base = grupo[0];
      const datas = grupo.map(item => `${dataItem(item) || "sem data"} (${statusCanonico(item)})`).join(" • ");
      const origens = [...new Set(grupo.map(origem))].join(" / ");
      return `<tr><td><strong>${escapar(op(base) || "-")}</strong></td><td>${escapar(faccao(base) || "-")}</td><td>${escapar(processo(base) || "-")}</td><td>${quantidade(base).toLocaleString("pt-BR")}</td><td>${escapar(moeda(total(base)))}</td><td>${grupo.length}</td><td>${escapar(datas)}</td><td>${escapar(origens)}</td></tr>`;
    }).join("") || '<tr><td colspan="8">Nenhum grupo encontrado.</td></tr>';
  }

  function linhasInconsistencia(inconsistencias, limite = 30) {
    return inconsistencias.slice(0, limite).map(({ item, problemas }) => `<tr><td><strong>${escapar(op(item) || "-")}</strong></td><td>${escapar(faccao(item) || "-")}</td><td>${escapar(processo(item) || "-")}</td><td>${escapar(statusCanonico(item))}</td><td>${escapar(moeda(total(item)))}</td><td>${escapar(problemas.join("; "))}</td><td>${escapar(origem(item))}</td></tr>`).join("") || '<tr><td colspan="7">Nenhuma inconsistência básica encontrada.</td></tr>';
  }

  function renderizarResultado(resultado) {
    const conteudo = garantirModal().querySelector("[data-audit-conteudo]");
    if (!conteudo) return;
    const s = resultado.status;
    conteudo.innerHTML = `
      <div class="audit-note"><strong>Somente leitura:</strong> esta auditoria apenas leu <strong>${resultado.totalDocumentos.toLocaleString("pt-BR")}</strong> documento(s) da coleção de pagamentos. Nada foi modificado no Firebase. Os grupos de duplicidade são apenas alertas para conferência; reenvios e complementos podem ser legítimos.</div>
      <div class="audit-grid">
        <div class="audit-kpi"><span>Documentos</span><strong>${resultado.totalDocumentos.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Pagamentos</span><strong>${resultado.pagamentos.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Pagos</span><strong>${s.pago.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Pendentes</span><strong>${s.pendente.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Sem valor</span><strong>${s.semValor.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Excluídos/cancelados</span><strong>${s.excluido.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Controles V2</span><strong>${resultado.controles.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Ativos</span><strong>${resultado.ativos.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Valor ativo</span><strong>${escapar(moeda(resultado.valorAtivo))}</strong></div>
        <div class="audit-kpi"><span>Duplicidades fortes</span><strong>${resultado.duplicidadesFortes.length.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Possíveis duplicidades</span><strong>${resultado.possiveisDuplicidades.length.toLocaleString("pt-BR")}</strong></div>
        <div class="audit-kpi"><span>Inconsistências</span><strong>${resultado.inconsistencias.length.toLocaleString("pt-BR")}</strong></div>
      </div>
      <section class="audit-section"><header><h4>Origens / formatos encontrados</h4><p>Ajuda a separar pagamentos antigos, movimentações novas, reenvios e fechamento V2.</p></header><div class="audit-table"><table><thead><tr><th>Origem</th><th>Qtd.</th></tr></thead><tbody>${linhasResumo(resultado.origens, 30)}</tbody></table></div></section>
      <section class="audit-section"><header><h4>Versões gravadas nos pagamentos</h4><p>Mostra quantos registros não possuem versão e quantos já vieram de módulos mais novos.</p></header><div class="audit-table"><table><thead><tr><th>Versão</th><th>Qtd.</th></tr></thead><tbody>${linhasResumo(resultado.versoes, 30)}</tbody></table></div></section>
      <section class="audit-section"><header><h4>Duplicidades fortes</h4><p>Mesma OP + referência + facção + processo + quantidade + total. Não exclui nada automaticamente.</p></header><div class="audit-table"><table><thead><tr><th>OP</th><th>Facção</th><th>Processo</th><th>Qtd.</th><th>Total</th><th>Linhas</th><th>Datas/status</th><th>Origens</th></tr></thead><tbody>${linhasDuplicidade(resultado.duplicidadesFortes)}</tbody></table></div></section>
      <section class="audit-section"><header><h4>Possíveis duplicidades / reenvios</h4><p>Mesma OP + facção + processo + quantidade, mas com outras diferenças. Precisam de conferência antes de qualquer ação.</p></header><div class="audit-table"><table><thead><tr><th>OP</th><th>Facção</th><th>Processo</th><th>Qtd.</th><th>Total base</th><th>Linhas</th><th>Datas/status</th><th>Origens</th></tr></thead><tbody>${linhasDuplicidade(resultado.possiveisDuplicidades)}</tbody></table></div></section>
      <section class="audit-section"><header><h4>Registros com campos suspeitos</h4><p>Ausência de OP, facção, processo, quantidade, data ou total coerente.</p></header><div class="audit-table"><table><thead><tr><th>OP</th><th>Facção</th><th>Processo</th><th>Status</th><th>Total</th><th>Problemas</th><th>Origem</th></tr></thead><tbody>${linhasInconsistencia(resultado.inconsistencias)}</tbody></table></div></section>`;
  }

  function resumoTexto(resultado) {
    if (!resultado) return "Auditoria ainda não executada.";
    const s = resultado.status;
    const topOrigens = resultado.origens.slice(0, 15).map(x => `- ${x.nome}: ${x.total}`).join("\n");
    const topVersoes = resultado.versoes.slice(0, 15).map(x => `- ${x.nome}: ${x.total}`).join("\n");
    const dups = resultado.duplicidadesFortes.slice(0, 15).map(grupo => {
      const base = grupo[0];
      return `- OP ${op(base) || "-"} | ${faccao(base) || "-"} | ${processo(base) || "-"} | Qtd ${quantidade(base)} | ${moeda(total(base))} | ${grupo.length} linhas`;
    }).join("\n") || "- Nenhuma";
    const inc = resultado.inconsistencias.slice(0, 20).map(({ item, problemas }) => `- OP ${op(item) || "-"} | ${faccao(item) || "-"} | ${processo(item) || "-"}: ${problemas.join(", ")}`).join("\n") || "- Nenhuma";
    return `CORPO NU FLOW — AUDITORIA DE PAGAMENTOS 160\nSomente leitura; nenhum dado foi alterado.\n\nDocumentos lidos: ${resultado.totalDocumentos}\nPagamentos: ${resultado.pagamentos}\nControles V2: ${resultado.controles}\nAtivos: ${resultado.ativos}\nPagos: ${s.pago}\nPendentes: ${s.pendente}\nSem valor: ${s.semValor}\nExcluídos/cancelados: ${s.excluido}\nValor ativo: ${moeda(resultado.valorAtivo)}\nDuplicidades fortes: ${resultado.duplicidadesFortes.length}\nPossíveis duplicidades/reenvios: ${resultado.possiveisDuplicidades.length}\nInconsistências: ${resultado.inconsistencias.length}\n\nORIGENS\n${topOrigens}\n\nVERSÕES\n${topVersoes}\n\nDUPLICIDADES FORTES — AMOSTRA\n${dups}\n\nINCONSISTÊNCIAS — AMOSTRA\n${inc}`;
  }

  async function copiarDiagnostico() {
    const textoResumo = resumoTexto(cache.resultado);
    try {
      await navigator.clipboard.writeText(textoResumo);
      const botao = garantirModal().querySelector("[data-audit-copiar]");
      if (botao) {
        const anterior = botao.textContent;
        botao.textContent = "Copiado ✓";
        setTimeout(() => { botao.textContent = anterior; }, 1800);
      }
    } catch (error) {
      window.prompt("Copie o diagnóstico abaixo:", textoResumo);
    }
  }

  async function executarAuditoria(forcar = false) {
    if (executando || !ehAdmin()) return;
    const modal = garantirModal();
    modal.classList.remove("hidden");
    const conteudo = modal.querySelector("[data-audit-conteudo]");

    if (!forcar && cache.resultado && cache.expiraEm > Date.now()) {
      renderizarResultado(cache.resultado);
      return;
    }

    executando = true;
    if (conteudo) conteudo.innerHTML = '<div class="audit-loading">Lendo os pagamentos existentes em modo somente leitura…</div>';
    const botao = document.getElementById(BTN_ID);
    const anterior = botao?.textContent || "Auditar pagamentos";
    if (botao) { botao.disabled = true; botao.textContent = "Auditando…"; }

    try {
      const { db, fs } = await contextoFirebase();
      const snapshot = await fs.getDocs(fs.collection(db, "entregasPagamento"));
      const resultado = analisarDocumentos(snapshot.docs);
      cache = { resultado, expiraEm: Date.now() + CACHE_MS };
      renderizarResultado(resultado);
    } catch (error) {
      console.error("[Auditoria pagamentos 160] Falha na leitura.", error);
      if (conteudo) conteudo.innerHTML = `<div class="audit-note" style="border-color:#fecaca;background:#fef2f2;color:#991b1b">Não foi possível ler os pagamentos. Nada foi alterado. Erro: ${escapar(error?.message || error)}</div>`;
    } finally {
      executando = false;
      if (botao) { botao.disabled = false; botao.textContent = anterior; }
    }
  }

  function garantirBotao() {
    const cabecalho = document.querySelector("#pagamentos .pagamentos-relatorio-panel > .panel-header:first-child .actions");
    if (!cabecalho || !ehAdmin()) return false;
    if (document.getElementById(BTN_ID)) return true;
    const botao = document.createElement("button");
    botao.id = BTN_ID;
    botao.type = "button";
    botao.className = "btn";
    botao.textContent = "Auditar pagamentos";
    botao.title = "Lê os pagamentos existentes sem modificar nenhum dado.";
    botao.addEventListener("click", () => executarAuditoria(false));
    cabecalho.prepend(botao);
    return true;
  }

  async function configurarUsuario(user) {
    usuarioAtual = user || null;
    perfilAtual = usuarioAtual ? await carregarPerfil(usuarioAtual).catch(() => null) : null;
    if (!ehAdmin()) {
      document.getElementById(BTN_ID)?.remove();
      return;
    }
    garantirBotao();
  }

  async function iniciar() {
    injetarEstilos();
    garantirModal();
    try {
      const { auth, authMod } = await contextoFirebase();
      authMod.onAuthStateChanged(auth, user => configurarUsuario(user));
      let tentativas = 0;
      const timer = setInterval(() => {
        tentativas += 1;
        if ((ehAdmin() && garantirBotao()) || tentativas > 40) clearInterval(timer);
      }, 250);
    } catch (error) {
      console.error("[Auditoria pagamentos 160] Não foi possível iniciar.", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
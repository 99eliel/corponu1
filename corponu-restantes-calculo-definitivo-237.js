(() => {
  "use strict";

  const VERSION = "2026-08-25-restantes-origem-calculo-238";
  const FB = "10.12.5";
  const FORM_ID = "formReceberRestantePagamento";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const FLAG = "__CORPONU_RESTANTES_ORIGEM_CALCULO_238__";
  const root = typeof window !== "undefined" ? window : globalThis;

  const txt = v => String(v ?? "").trim();
  const norm = v => txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const num = (v, d = 0) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : d;
    const s = txt(v);
    if (!s) return d;
    const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
    return Number.isFinite(n) ? n : d;
  };
  const int = v => Math.max(0, Math.floor(num(v)));
  const round4 = v => Math.round((num(v) + Number.EPSILON) * 10000) / 10000;
  const round2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;

  function refKey(v) {
    const s = txt(v).replace(/\s+/g, "").toUpperCase();
    if (!s) return "";
    if (/^\d+$/.test(s)) return String(Number(s));
    return s.replace(/[^A-Z0-9]/g, "");
  }

  function procKey(v) {
    const k = norm(v);
    const m = {
      "SUTIA COMPLETO": PROCESSO_COMPLETO,
      "SUTIA MONTAGEM": "SUTIÃ MONTAGEM",
      "ENCAPAR": "ENCAPAR BOJO",
      "ENCAPAR BOJO": "ENCAPAR BOJO",
      "ENCAPAR BOJOS": "ENCAPAR BOJO",
      "BOJO": "ENCAPAR BOJO",
      "ALCA": "ALÇA",
      "ALCAS": "ALÇA",
      "CALCINHA": "CALCINHA COMPLETA",
      "MONTAGEM CALCINHA": "CALCINHA MONTAGEM"
    };
    return m[k] || txt(v).toUpperCase();
  }

  const procOf = x => procKey(x?.processo || x?.servicoNome || x?.processoMovimentacao || "");
  const facOf = x => norm(x?.faccao || x?.destino || "");

  function unitFrom(x) {
    if (!x) return 0;
    const mem = x.memoriaCalculoSutiaCompleto || {};
    const conf = x.sutiaCompletoConferencia || {};
    for (const v of [x.valorUnitarioCalculadoSutiaCompleto, conf.valorUnitarioCalculado, mem.valorUnitarioFinal, x.valorUnitario]) {
      const n = num(v);
      if (n > 0) return round4(n);
    }
    const q = int(x.quantidade || x.quantidadeRecebida || x.quantidadeEnviada);
    const sub = num(x.subtotal ?? x.subtotalCalculadoSutiaCompleto);
    if (q > 0 && sub > 0) return round4(sub / q);
    const total = num(x.total ?? x.valorTotal ?? x.totalCalculadoSutiaCompleto);
    const desc = num(x.descontoDefeito ?? x.defeito);
    return q > 0 && total > 0 ? round4((total + desc) / q) : 0;
  }

  function immutable(x) {
    const s = norm(x?.statusPagamento || x?.status || "");
    return x?.pago === true || x?.excluido === true || x?.cancelado === true || ["PAGO", "PAGA", "QUITADO", "QUITADA", "CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA", "ESTORNADO", "ESTORNADA"].includes(s);
  }

  function isRest(x) {
    return x?.pagamentoComplementarRestante === true || x?.origemRestantePagamento === true || x?.origemRestanteFaccao === true || norm(x?.origem) === "RESTANTE FACCAO";
  }

  function isPendingRest(x) {
    return x && x.origemRestanteFaccao === true && x.excluido !== true && !x.dataChegada && int(x.quantidadeEnviada || x.quantidadeRestantePendente || x.falta) > 0 && ["RESTANTE PENDENTE", "PENDENTE"].includes(norm(x.status || x.restanteStatus || "restante_pendente"));
  }

  function findPrice(mov, prices) {
    const r = refKey(mov?.referencia);
    const p = procOf(mov);
    if (!r || !p || p === PROCESSO_COMPLETO) return null;
    const list = (prices || []).filter(x => x && x.ativo !== false && num(x.valor) > 0 && refKey(x.referencia) === r && procKey(x.processo || x.servicoNome) === p);
    if (!list.length) return null;
    const setor = norm(mov?.setor);
    return list.find(x => norm(x.setor) === setor) || list[0];
  }

  function chooseBase(mov, pays) {
    const p = procOf(mov), f = facOf(mov), rootId = txt(mov?.movimentacaoRaizId || mov?.movimentacaoOrigemId);
    return (pays || []).filter(x => x && x.excluido !== true && procOf(x) === p).map(x => {
      const unit = unitFrom(x);
      if (!(unit > 0)) return null;
      let score = 0;
      if (rootId && txt(x.movimentacaoId) === rootId) score += 100;
      if (f && facOf(x) === f) score += 40;
      if (!isRest(x)) score += 15;
      if (x.calculoSutiaCompletoVersao || x.memoriaCalculoSutiaCompleto) score += 20;
      return { pay: x, unit, score, time: num(x.atualizadoEm?.seconds ?? x.criadoEm?.seconds) };
    }).filter(Boolean).sort((a, b) => b.score - a.score || b.time - a.time)[0] || null;
  }

  root.__CORPONU_RESTANTES_238_TEST_API__ = Object.freeze({ refKey, procKey, unitFrom, findPrice, chooseBase });
  if (typeof document === "undefined") return;
  if (root[FLAG] === VERSION) return;
  root[FLAG] = VERSION;

  let fbPromise = null;
  let pricesPromise = null;
  let selectedId = "";
  let saving = false;
  let repairStarted = false;

  async function fb() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appMod, authMod, fs]) => {
      const app = appMod.getApps()[0];
      if (!app) throw new Error("Firebase ainda não inicializado.");
      return { fs, db: fs.getFirestore(app), auth: authMod.getAuth(app), authMod };
    }).catch(e => { fbPromise = null; throw e; });
    return fbPromise;
  }

  async function prices(force = false) {
    if (force) pricesPromise = null;
    if (!pricesPromise) pricesPromise = fb().then(async c => {
      const s = await c.fs.getDocs(c.fs.collection(c.db, "precosReferencia"));
      return s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.ativo !== false);
    });
    return pricesPromise;
  }

  async function getDocData(col, id) {
    if (!id) return null;
    const c = await fb();
    const s = await c.fs.getDoc(c.fs.doc(c.db, col, String(id)));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  }

  async function relatedPays(mov) {
    const c = await fb(), map = new Map(), qs = [];
    const rootId = txt(mov?.movimentacaoRaizId || mov?.movimentacaoOrigemId);
    if (rootId) qs.push(c.fs.query(c.fs.collection(c.db, "entregasPagamento"), c.fs.where("movimentacaoId", "==", rootId)));
    if (mov?.opId) qs.push(c.fs.query(c.fs.collection(c.db, "entregasPagamento"), c.fs.where("opId", "==", mov.opId)));
    const op = txt(mov?.numeroOP);
    if (op) {
      qs.push(c.fs.query(c.fs.collection(c.db, "entregasPagamento"), c.fs.where("numeroOP", "==", op)));
      const n = Number(op);
      if (Number.isFinite(n)) qs.push(c.fs.query(c.fs.collection(c.db, "entregasPagamento"), c.fs.where("numeroOP", "==", n)));
    }
    (await Promise.allSettled(qs.map(q => c.fs.getDocs(q)))).forEach(r => {
      if (r.status === "fulfilled") r.value.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
    });
    return [...map.values()];
  }

  async function resolvePrice(mov) {
    const rootId = txt(mov?.movimentacaoRaizId || mov?.movimentacaoOrigemId);
    const rootMov = rootId && rootId !== mov.id ? await getDocData("movimentacoesProducao", rootId) : null;
    for (const source of [mov, rootMov]) {
      const u = unitFrom(source);
      if (u > 0) return { unit: u, source: procOf(mov) === PROCESSO_COMPLETO ? "memoria_calculo_sutia_completo" : "valor_movimentacao_original", price: null, base: null };
    }

    const pays = await relatedPays(mov);
    const base = chooseBase(mov, pays);
    if (procOf(mov) === PROCESSO_COMPLETO && base?.unit > 0) {
      return { unit: base.unit, source: "valor_unitario_entrega_original", price: null, base: base.pay };
    }

    const price = findPrice(mov, await prices());
    if (price) return { unit: round4(num(price.valor)), source: "preco_referencia_processo", price, base: base?.pay || null };
    if (base?.unit > 0) return { unit: base.unit, source: "valor_unitario_entrega_original", price: null, base: base.pay };
    return { unit: 0, source: "sem_base_calculo", price: null, base: null };
  }

  function sector(proc) {
    const p = norm(proc);
    if (p.includes("CALCINHA")) return "calcinha";
    if (p.includes("BOJO")) return "bojo";
    if (p.includes("LATERAL")) return "lateral";
    if (p.includes("ALCA")) return "alca";
    return "sutia";
  }

  function sectorLabel(s) {
    return ({ sutia: "Sutiã", calcinha: "Calcinha", bojo: "Bojo", lateral: "Lateral", alca: "Alça" })[s] || "Produção";
  }

  function today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function slug(v) {
    return norm(v).replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "SEM-DADO";
  }

  function restDoc({ mov, id, qty, seq, user, fs, date }) {
    const p = procOf(mov) || mov.processo || "", s = mov.setor || sector(p);
    return {
      id, origem: "restante_faccao", origemRestanteFaccao: true, origemManualPagamentos: false,
      tipoDestino: "faccao", tipoDestinoLabel: "Facção",
      movimentacaoOrigemId: mov.movimentacaoOrigemId || mov.id || "",
      movimentacaoRaizId: mov.movimentacaoRaizId || mov.movimentacaoOrigemId || mov.id || "",
      restanteSequencia: Math.max(1, Number(seq) || 1), restantePendente: true, restanteStatus: "pendente",
      opId: mov.opId || "", numeroOP: mov.numeroOP || "", referencia: mov.referencia || "", cor: mov.cor || "", produtoNome: mov.produtoNome || "",
      setor: s, setorLabel: mov.setorLabel || sectorLabel(s), destino: mov.destino || "", destinoId: mov.destinoId || "", processo: p, processoMovimentacao: p,
      quantidadeEnviada: int(qty), quantidadeRecebida: 0, quantidadeRestantePendente: int(qty), falta: int(qty), dataEnvio: mov.dataEnvio || "",
      dataGeracaoRestante: date || mov.dataChegada || today(), dataChegada: "", descontoDefeito: 0, defeito: 0, status: "restante_pendente",
      observacoes: `Restante automático de ${int(qty)} peça(s) da OP ${mov.numeroOP || "-"}.`, criadoPor: user.uid, criadoEm: fs.serverTimestamp(), atualizadoPor: user.uid, atualizadoEm: fs.serverTimestamp(), versaoRestanteFaccao: VERSION
    };
  }

  function payDoc({ mov, id, qty, resolved, user, fs, obs }) {
    const q = int(qty), u = round4(resolved.unit), ok = u > 0, sub = round2(q * u), desc = num(mov.descontoDefeito ?? mov.defeito), total = round2(Math.max(sub - desc, 0));
    const p = procOf(mov) || mov.processo || "", s = resolved.price?.setor || mov.setor || sector(p), base = resolved.base;
    return {
      id, origem: "movimentacao", origemRestantePagamento: true, origemManualPagamentos: false, pagamentoManualFinanceiro: false, pagamentoComplementarRestante: true,
      movimentacaoId: mov.id, movimentacaoOrigemId: mov.movimentacaoOrigemId || "", movimentacaoRaizId: mov.movimentacaoRaizId || mov.movimentacaoOrigemId || "", pagamentoReenvio: true,
      opId: mov.opId || "", numeroOP: mov.numeroOP || "", referencia: mov.referencia || "", cor: mov.cor || "", produtoNome: mov.produtoNome || "", faccao: mov.destino || "",
      precoReferenciaId: resolved.price?.id || base?.precoReferenciaId || "", processo: p, processoMovimentacao: p, servicoId: resolved.price?.id || base?.servicoId || "", servicoNome: p,
      setor: s, setorLabel: sectorLabel(s), dataEntrega: mov.dataChegada || today(), quantidade: q, falta: int(mov.falta), descontoDefeito: desc,
      subtotal: ok ? sub : 0, valorUnitario: ok ? u : 0, total: ok ? total : 0,
      statusPagamento: ok ? "pendente" : "sem_valor", valorPendente: !ok, valorManualFinanceiroPendente: false, valorManualFinanceiro: false,
      valorTotalDefinidoManualmente: false, valorTotalManual: 0, formaValorPagamento: ok ? resolved.source : "sem_base_calculo_restante",
      motivoValorPendente: ok ? "" : "sem_base_calculo_restante", avisoPagamento: ok ? "" : `Não foi encontrada base automática para Ref. ${mov.referencia || "-"} + ${p || "-"}.`,
      pagamentoBaseRestanteId: base?.id || "", observacoes: obs || (ok ? `Restante calculado automaticamente (${resolved.source}).` : "Pagamento complementar sem base automática de cálculo."),
      criadoPor: user.uid, criadoEm: fs.serverTimestamp(), atualizadoPor: user.uid, atualizadoEm: fs.serverTimestamp(), versaoGeracao: VERSION, versaoRegistro: VERSION
    };
  }

  function toast(msg, err = false) {
    const t = document.getElementById("toast");
    if (!t) return console[err ? "error" : "info"](`[CorpoNu 238] ${msg}`);
    const old = t.style.background;
    t.textContent = msg; t.classList.remove("hidden"); if (err) t.style.background = "#991b1b";
    clearTimeout(root.__rest238Toast);
    root.__rest238Toast = setTimeout(() => { t.classList.add("hidden"); t.style.background = old; }, 5500);
  }

  async function save(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (saving) return;
    const restId = selectedId;
    if (!restId) return toast("Não consegui identificar o restante. Feche e abra novamente pela lista.", true);
    const qty = int(document.getElementById("restPagQuantidadeRecebida")?.value);
    const date = txt(document.getElementById("restPagDataChegada")?.value);
    const obs = txt(document.getElementById("restPagObservacoes")?.value);
    const confirmed = document.getElementById("restPagConfirmacao")?.checked === true;
    const max = int(document.getElementById("restPagQuantidadeRecebida")?.max || 0);
    if (!qty || !date || !confirmed) return toast("Preencha e confira os campos obrigatórios.", true);
    if (max > 0 && qty > max) return toast("A quantidade recebida é maior que o saldo pendente.", true);

    const button = document.getElementById("btnSalvarRestantePagamento"), old = button?.textContent || "Salvar chegada complementar";
    saving = true; if (button) { button.disabled = true; button.textContent = "Calculando e salvando..."; }
    try {
      const c = await fb(), user = c.auth.currentUser;
      if (!user) throw new Error("SEM_USUARIO");
      const restRef = c.fs.doc(c.db, "movimentacoesProducao", restId), preview = await c.fs.getDoc(restRef);
      if (!preview.exists()) throw new Error("INEXISTENTE");
      const previewMov = { id: preview.id, ...preview.data() }, resolved = await resolvePrice(previewMov);

      const result = await c.fs.runTransaction(c.db, async tx => {
        const payId = `${restId}-pagamento`.slice(0, 190), payRef = c.fs.doc(c.db, "entregasPagamento", payId);
        const rootId = previewMov.movimentacaoRaizId || previewMov.movimentacaoOrigemId || "", rootRef = rootId ? c.fs.doc(c.db, "movimentacoesProducao", rootId) : null;
        const reads = [tx.get(restRef), tx.get(payRef)]; if (rootRef) reads.push(tx.get(rootRef));
        const ss = await Promise.all(reads), rs = ss[0], ps = ss[1], rootSnap = rootRef ? ss[2] : null;
        if (!rs.exists()) throw new Error("INEXISTENTE");
        const mov = { id: rs.id, ...rs.data() };
        if (!isPendingRest(mov)) throw new Error("CONCLUIDO");
        if (ps.exists() && ps.data()?.excluido !== true) throw new Error("DUPLICADO");
        const pending = int(mov.quantidadeEnviada || mov.quantidadeRestantePendente || mov.falta);
        if (qty > pending) throw new Error("QUANTIDADE");
        const balance = pending - qty, nextSeq = Math.max(1, Number(mov.restanteSequencia) || 1) + 1;
        const rootActual = mov.movimentacaoRaizId || mov.movimentacaoOrigemId || mov.id, nextId = balance > 0 ? `${slug(rootActual)}-restante-${nextSeq}`.slice(0, 190) : "";

        tx.set(restRef, { dataChegada: date, quantidadeRecebida: qty, falta: balance, quantidadeRestantePendente: balance, restantePendente: false, restanteStatus: balance > 0 ? "entrega_parcial" : "concluido", status: balance > 0 ? "retornou_parcial" : "retornou", chegadaComplementar: true, observacaoChegada: obs, proximoRestanteMovimentacaoId: nextId, atualizadoPor: user.uid, atualizadoEm: c.fs.serverTimestamp(), versaoRestanteFaccao: VERSION }, { merge: true });
        if (balance > 0) tx.set(c.fs.doc(c.db, "movimentacoesProducao", nextId), restDoc({ mov: { ...mov, id: mov.id, movimentacaoRaizId: rootActual }, id: nextId, qty: balance, seq: nextSeq, user, fs: c.fs, date }), { merge: false });
        if (rootRef && rootSnap?.exists()) tx.set(rootRef, { temRestantePendente: balance > 0, quantidadeRestantePendente: balance, restanteStatus: balance > 0 ? "pendente" : "concluido", restanteMovimentacaoAtualId: nextId, restanteAtualizadoPor: user.uid, restanteAtualizadoEm: c.fs.serverTimestamp(), versaoRestanteFaccao: VERSION }, { merge: true });

        const payMov = { ...mov, id: mov.id, dataChegada: date, quantidadeRecebida: qty, falta: balance, observacoes: obs };
        tx.set(payRef, payDoc({ mov: payMov, id: payId, qty, resolved, user, fs: c.fs, obs }), { merge: false });
        const logRef = c.fs.doc(c.fs.collection(c.db, "logsAlteracoes"));
        tx.set(logRef, { acao: "chegada_complementar_restante_calculo_238", entidade: "movimentacaoProducao", entidadeId: mov.id, detalhes: `OP ${mov.numeroOP || "-"} | ${mov.destino || "-"} | ${procOf(mov) || "-"} | recebido ${qty} | saldo ${balance} | ${resolved.unit > 0 ? `${resolved.source} ${round2(qty * resolved.unit)}` : "sem base automática"}`, usuarioId: user.uid, usuarioEmail: user.email || "", criadoEm: c.fs.serverTimestamp(), versao: VERSION });
        return { balance, ok: resolved.unit > 0, total: round2(qty * resolved.unit) };
      });

      document.getElementById("modalReceberRestantePagamento")?.classList.add("hidden"); selectedId = "";
      result.ok ? toast(result.balance > 0 ? `Chegada salva e pagamento automático de ${result.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} gerado. Ainda restam ${result.balance.toLocaleString("pt-BR")} peça(s).` : `Chegada salva e pagamento automático de ${result.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} gerado.`) : toast("Chegada salva, mas esta OP não possui preço nem pagamento anterior utilizável.", true);
      setTimeout(() => document.getElementById("btnAtualizarRestantesPagamento")?.click(), 80);
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 350);
    } catch (e) {
      console.error("[CorpoNu 238] Erro ao receber restante.", e);
      const m = { SEM_USUARIO: "Sua sessão ainda não está pronta.", INEXISTENTE: "O restante não existe mais.", CONCLUIDO: "Esse restante já foi recebido ou concluído.", DUPLICADO: "Já existe pagamento para esta entrega complementar.", QUANTIDADE: "A quantidade informada é maior que o saldo atual." };
      toast(m[e?.message] || "Não foi possível salvar. Nenhuma alteração foi gravada.", true);
    } finally { saving = false; if (button) { button.disabled = false; button.textContent = old; } }
  }

  async function repair() {
    if (repairStarted) return; repairStarted = true;
    try {
      const c = await fb();
      if (!c.auth.currentUser) {
        repairStarted = false;
        const off = c.authMod.onAuthStateChanged(c.auth, u => { if (!u) return; off(); setTimeout(repair, 600); });
        return;
      }
      const s = await c.fs.getDocs(c.fs.query(c.fs.collection(c.db, "entregasPagamento"), c.fs.where("pagamentoComplementarRestante", "==", true)));
      const targets = s.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })).filter(x => !immutable(x) && x.valorPendente === true && num(x.total) <= 0).slice(0, 150);
      let fixed = 0;
      for (const p of targets) {
        const mov = await getDocData("movimentacoesProducao", p.movimentacaoId).catch(() => null); if (!mov) continue;
        const r = await resolvePrice(mov).catch(() => null); if (!(r?.unit > 0)) continue;
        const q = int(p.quantidade || mov.quantidadeRecebida); if (!q) continue;
        const u = round4(r.unit), sub = round2(q * u), total = round2(Math.max(sub - num(p.descontoDefeito), 0));
        await c.fs.setDoc(p.ref, { valorUnitario: u, subtotal: sub, total, statusPagamento: "pendente", valorPendente: false, valorManualFinanceiroPendente: false, pagamentoManualFinanceiro: false, valorTotalDefinidoManualmente: false, formaValorPagamento: r.source, motivoValorPendente: "", avisoPagamento: "", pagamentoBaseRestanteId: r.base?.id || "", corrigidoRestante238: true, corrigidoEm: c.fs.serverTimestamp(), atualizadoPor: c.auth.currentUser.uid, atualizadoEm: c.fs.serverTimestamp(), versaoRegistro: VERSION }, { merge: true });
        fixed++;
      }
      if (fixed) { console.info(`[CorpoNu 238] ${fixed} pagamento(s) de restante recalculado(s).`); setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 250); }
    } catch (e) { console.warn("[CorpoNu 238] Reparo pontual não executado agora.", e); }
  }

  window.addEventListener("click", e => {
    const b = e.target?.closest?.("[data-receber-restante-pagamento]");
    if (b) selectedId = txt(b.dataset.receberRestantePagamento);
  }, true);
  window.addEventListener("submit", e => { if (e.target?.id === FORM_ID) save(e); }, true);
  setTimeout(repair, 1200);
  console.info(`[CorpoNu] Restantes calculados na origem ativo: ${VERSION}`);
})();

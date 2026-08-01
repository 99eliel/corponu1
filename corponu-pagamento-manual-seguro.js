(() => {
  "use strict";

  const VERSION = "2026-08-01-seguranca-financeira-65";
  const FB = "10.12.5";
  const CONFIG = "sutia-completo-pagamento";
  const CONFIG_LEGADA = "sutia-completo-financeiro";
  const BLOCO = "sf65ManualSutia";
  const FECHO = "sf65ManualFecho";
  const PONTO = "sf65ManualPonto";
  const RESUMO = "sf65ManualResumo";
  let ctxPromise = null;
  let configCache = null;
  let calculo = null;
  let chaveCalculo = "";
  let sequencia = 0;
  const ops = new Map();
  const precos = new Map();

  if (window.__CORPONU_PAGAMENTO_MANUAL_SEGURO__ === VERSION) return;
  window.__CORPONU_PAGAMENTO_MANUAL_SEGURO__ = VERSION;

  const txt = v => String(v ?? "").trim();
  const norm = v => txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const slug = v => norm(v).replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 52) || "SEM-DADO";
  const num = (v, p = 0) => { if (typeof v === "number") return Number.isFinite(v) ? v : p; const s = txt(v); if (!s) return p; const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : p; };
  const int = v => Math.max(0, Math.floor(num(v)));
  const a4 = v => Math.round((num(v) + Number.EPSILON) * 10000) / 10000;
  const a2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;
  const m4 = v => `R$ ${num(v).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  const m2 = v => num(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const definido = v => ["sim", "nao"].includes(txt(v).toLowerCase());
  const completo = () => norm(document.getElementById("pagManualProcesso")?.value) === "SUTIA COMPLETO";

  function aviso(m, erro = false) {
    const t = document.getElementById("toast");
    if (!t) return alert(m);
    t.textContent = m; t.classList.remove("hidden"); t.style.background = erro ? "#991b1b" : "";
    clearTimeout(window.__sf65ManualToast); window.__sf65ManualToast = setTimeout(() => { t.classList.add("hidden"); t.style.background = ""; }, 6000);
  }

  async function ctx() {
    if (ctxPromise) return ctxPromise;
    ctxPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, auth, fs]) => { const a = app.getApp(); return { auth: auth.getAuth(a), db: fs.getFirestore(a), fs }; }).catch(e => { ctxPromise = null; throw e; });
    return ctxPromise;
  }

  async function user() { const { auth } = await ctx(); for (let i = 0; i < 40 && !auth.currentUser; i++) await new Promise(r => setTimeout(r, 150)); return auth.currentUser; }

  async function config() {
    if (configCache) return configCache;
    const { db, fs } = await ctx();
    const [c, l] = await Promise.all([fs.getDoc(fs.doc(db, "configuracoes", CONFIG)), fs.getDoc(fs.doc(db, "configuracoes", CONFIG_LEGADA))]);
    const d = c.exists() ? c.data() : l.exists() ? l.data() : {};
    configCache = {
      base: num(d.valorBaseGeral ?? d.valorGeral ?? 5.5, 5.5),
      refEspecial: txt(d.referenciaEspecial || "912") || "912",
      baseEspecial: num(d.valorBaseReferenciaEspecial ?? d.valorReferenciaEspecial ?? 6.5, 6.5),
      fecho: num(d.descontoFechoNaoFeito ?? 0.25, 0.25),
      ponto: num(d.descontoPontoLuzNaoFeito ?? 0.15, 0.15)
    };
    return configCache;
  }

  async function sincronizarLegado() {
    const { db, fs } = await ctx(); const u = await user(); if (!u) return;
    const p = await fs.getDoc(fs.doc(db, "usuarios", u.uid));
    if (!p.exists() || norm(p.data().tipo) !== "ADMIN") return;
    configCache = null; const c = await config();
    await fs.setDoc(fs.doc(db, "configuracoes", CONFIG_LEGADA), {
      valorGeral: a4(c.base), valorBaseGeral: a4(c.base), referenciaEspecial: c.refEspecial,
      valorReferenciaEspecial: a4(c.baseEspecial), valorBaseReferenciaEspecial: a4(c.baseEspecial),
      descontoFechoNaoFeito: a4(c.fecho), descontoPontoLuzNaoFeito: a4(c.ponto),
      origemConfiguracao: CONFIG, segurancaFinanceiraVersao: VERSION, atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp()
    }, { merge: true });
  }

  async function op(numero) {
    const k = txt(numero); const c = ops.get(k); if (c && Date.now() - c.t < 30000) return c.v;
    const { db, fs } = await ctx();
    const qs = [fs.query(fs.collection(db, "ordensProducao"), fs.where("numeroOP", "==", k), fs.limit(2))];
    const n = Number(k); if (Number.isFinite(n)) qs.push(fs.query(fs.collection(db, "ordensProducao"), fs.where("numeroOP", "==", n), fs.limit(2)));
    qs.push(fs.query(fs.collection(db, "ordensProducao"), fs.where("numeroOPExterno", "==", k), fs.limit(2)));
    for (const q of qs) { try { const s = await fs.getDocs(q); if (!s.empty) { const v = { id: s.docs[0].id, ...s.docs[0].data() }; ops.set(k, { t: Date.now(), v }); return v; } } catch (_) {} }
    return null;
  }

  async function valores(ref) {
    const k = txt(ref); const c = precos.get(k); if (c && Date.now() - c.t < 30000) return c.v;
    const { db, fs } = await ctx(); let itens = [];
    const n = Number(k); const buscas = Number.isFinite(n) && String(n) !== k ? [k, n] : [k];
    try { const q = buscas.length > 1 ? fs.query(fs.collection(db, "precosReferencia"), fs.where("referencia", "in", buscas)) : fs.query(fs.collection(db, "precosReferencia"), fs.where("referencia", "==", buscas[0])); const s = await fs.getDocs(q); itens = s.docs.map(x => ({ id: x.id, ...x.data() })); }
    catch (_) { const s = await fs.getDocs(fs.collection(db, "precosReferencia")); itens = s.docs.map(x => ({ id: x.id, ...x.data() })).filter(x => txt(x.referencia) === k || num(x.referencia, NaN) === n); }
    itens = itens.filter(x => x.ativo !== false);
    const pega = p => { const x = itens.find(i => norm(i.processo || i.servicoNome) === norm(p)); return x ? num(x.valor ?? x.valorUnitario ?? x.preco) : null; };
    const v = { lateral: pega("LATERAL"), bojo: pega("ENCAPAR BOJO") }; precos.set(k, { t: Date.now(), v }); return v;
  }

  function estilo() {
    if (document.getElementById("sf65ManualStyle")) return;
    const s = document.createElement("style"); s.id = "sf65ManualStyle"; s.textContent = `
      #modalPagamentoManualFinanceiro #componentesSutiaPagamentoManual{display:none!important}
      #modalPagamentoManualFinanceiro .sf65-oculto{display:none!important}
      #${BLOCO}{grid-column:1/-1;padding:13px;border:1px solid #c4b5fd;border-radius:14px;background:#faf5ff}
      #${BLOCO}.hidden{display:none!important} #${BLOCO} .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
      #${BLOCO} label{margin:0;padding:10px;border:1px solid #ddd6fe;border-radius:10px;background:#fff;font-weight:900;font-size:12px}
      #${BLOCO} select{width:100%;min-height:42px;margin-top:6px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;font-weight:800}
      #${RESUMO}{margin-top:10px;padding:10px;border-radius:10px;background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:800;line-height:1.5}
      #${RESUMO}.ok{background:#f0fdf4;color:#166534;border:1px solid #86efac} #${RESUMO}.erro{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}
      @media(max-width:620px){#${BLOCO} .grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function bloco() {
    const f = document.getElementById("formPagamentoManualFinanceiro"); if (!f) return null;
    let b = document.getElementById(BLOCO); if (b) return b;
    b = document.createElement("section"); b.id = BLOCO; b.className = "hidden"; b.innerHTML = `
      <strong style="display:block;color:#4c1d95">Conferência do Sutiã Completo</strong>
      <small style="display:block;margin-top:3px;color:#64748b">Fecho e ponto de luz só descontam quando não vieram prontos.</small>
      <div class="grid"><label>Fecho veio pronto?<select id="${FECHO}"><option value="">Selecione</option><option value="sim">Sim, veio pronto</option><option value="nao">Não veio pronto</option></select></label>
      <label>Ponto de luz veio pronto?<select id="${PONTO}"><option value="">Selecione</option><option value="sim">Sim, veio pronto</option><option value="nao">Não veio pronto</option></select></label></div>
      <div id="${RESUMO}">Defina lateral e bojo para iniciar o cálculo.</div>`;
    const c = document.getElementById("pagManualComponentesOP"); if (c) c.insertAdjacentElement("afterend", b); else f.appendChild(b); return b;
  }

  function mostrarValor(sim) { const i = document.getElementById("pagManualValorTotal"); const w = i?.closest("label") || i?.parentElement; if (w) w.classList.toggle("sf65-oculto", !sim); }
  function chave() { return ["pagManualNumeroOP","pagManualProcesso","pagManualFaccao","pagManualQuantidadeRecebida","pagManualLateral","pagManualBojo",FECHO,PONTO].map(id => txt(document.getElementById(id)?.value)).join("|"); }
  function resumo(m, c = "") { const r = document.getElementById(RESUMO); if (r) { r.className = c; r.textContent = m; } }

  async function calcular() {
    bloco(); const seq = ++sequencia; calculo = null; chaveCalculo = ""; const b = document.getElementById(BLOCO);
    if (!completo()) { b?.classList.add("hidden"); mostrarValor(true); return; }
    b?.classList.remove("hidden");
    const lat = txt(document.getElementById("pagManualLateral")?.value).toLowerCase(); const boj = txt(document.getElementById("pagManualBojo")?.value).toLowerCase();
    if (!definido(lat) || !definido(boj)) { mostrarValor(true); return resumo("Lateral e/ou bojo não foram informados. O campo de valor manual permanece disponível."); }
    mostrarValor(false);
    const f = txt(document.getElementById(FECHO)?.value).toLowerCase(); const p = txt(document.getElementById(PONTO)?.value).toLowerCase();
    if (!definido(f) || !definido(p)) return resumo("Informe se o fecho e o ponto de luz vieram prontos.");
    const numero = txt(document.getElementById("pagManualNumeroOP")?.value); const qtd = int(document.getElementById("pagManualQuantidadeRecebida")?.value);
    if (!numero || !qtd) return resumo("Aguarde a OP e a quantidade recebida serem preenchidas.");
    try {
      const o = await op(numero); if (seq !== sequencia) return; const ref = txt(o?.referencia || o?.ref); if (!ref) return resumo("Referência da OP não encontrada.", "erro");
      const [c, v] = await Promise.all([config(), valores(ref)]); if (seq !== sequencia) return;
      const faltas = []; if (lat === "sim" && v.lateral === null) faltas.push(`LATERAL da referência ${ref}`); if (boj === "sim" && v.bojo === null) faltas.push(`ENCAPAR BOJO da referência ${ref}`);
      if (faltas.length) return resumo(`Falta cadastrar ${faltas.join(" e ")} na aba Processos.`, "erro");
      const base = ref === c.refEspecial ? c.baseEspecial : c.base; const dl = lat === "sim" ? num(v.lateral) : 0; const db = boj === "sim" ? num(v.bojo) : 0; const df = f === "nao" ? c.fecho : 0; const dp = p === "nao" ? c.ponto : 0;
      const unit = a4(Math.max(0, base - dl - db - df - dp)); const total = a2(unit * qtd);
      calculo = { referencia: ref, referenciaEspecialAplicada: ref === c.refEspecial, valorBaseUnitario: a4(base), lateralPronta: lat === "sim", descontoLateralUnitario: a4(dl), bojoPronto: boj === "sim", descontoBojoUnitario: a4(db), fechoVeioPronto: f === "sim", descontoFechoUnitario: a4(df), pontoLuzVeioPronto: p === "sim", descontoPontoLuzUnitario: a4(dp), quantidade: qtd, valorUnitarioFinal: unit, total };
      chaveCalculo = chave(); const i = document.getElementById("pagManualValorTotal"); if (i) i.value = total.toFixed(2);
      resumo(`${m4(base)} − lateral ${m4(dl)} − bojo ${m4(db)} − fecho ${m4(df)} − ponto de luz ${m4(dp)} = ${m4(unit)} por peça. Total: ${m2(total)}.`, "ok");
    } catch (e) { console.error(e); if (seq === sequencia) resumo("Não foi possível carregar os valores agora.", "erro"); }
  }

  function ids() {
    const opn = txt(document.getElementById("pagManualNumeroOP")?.value); const pr = txt(document.getElementById("pagManualProcesso")?.value); const fa = txt(document.getElementById("pagManualFaccao")?.value); const dt = txt(document.getElementById("pagManualDataChegada")?.value);
    const base = `manual-pag-${slug(opn)}-${slug(pr)}-${slug(fa)}-${dt}`.slice(0, 180);
    return { mov: base, pag: `${base}-pagamento`.slice(0, 190), opn, pr, fa, dt, lat: txt(document.getElementById("pagManualLateral")?.value).toLowerCase(), boj: txt(document.getElementById("pagManualBojo")?.value).toLowerCase(), f: txt(document.getElementById(FECHO)?.value).toLowerCase(), p: txt(document.getElementById(PONTO)?.value).toLowerCase(), calc: calculo ? { ...calculo } : null };
  }

  async function patch(d) {
    const { db, fs } = await ctx(); const u = await user(); if (!u) return;
    const pr = fs.doc(db, "entregasPagamento", d.pag); const mr = fs.doc(db, "movimentacoesProducao", d.mov);
    for (const espera of [600,1400,2800,5000,8000]) {
      await new Promise(r => setTimeout(r, espera)); const [ps, ms] = await Promise.all([fs.getDoc(pr), fs.getDoc(mr)]); if (!ps.exists() || !ms.exists()) continue;
      const st = norm(ps.data().statusPagamento); if (st !== "PAGO") await fs.setDoc(pr, {
        chaveUnicaPagamento: `manual:${d.pag}`, origemPagamento: "lancamento_manual_pagamentos", origemId: d.mov,
        lateralProntaInformada: d.lat === "sim", bojoProntoInformado: d.boj === "sim", fechoVeioPronto: d.f === "sim", pontoLuzVeioPronto: d.p === "sim",
        calculoSutiaCompleto: d.calc ? { ...d.calc, origem: "lancamento_manual_pagamentos", versao: VERSION } : null,
        valorUnitario: d.calc?.valorUnitarioFinal ?? ps.data().valorUnitario, subtotal: d.calc?.total ?? ps.data().subtotal, total: d.calc?.total ?? ps.data().total,
        origemCalculo: d.calc ? "automatico_sutia_completo_config_unificada" : ps.data().origemCalculo || "manual",
        segurancaFinanceiraVersao: VERSION, atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp()
      }, { merge: true });
      await fs.setDoc(mr, { pagamentoId: d.pag, pagamentoGerado: true, pagamentoGeradoEm: fs.serverTimestamp(), chaveUnicaPagamento: `manual:${d.pag}`, integridadeFinanceiraPendente: false, segurancaFinanceiraVersao: VERSION, atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp() }, { merge: true });
      return;
    }
  }

  document.addEventListener("submit", e => {
    const f = e.target; if (!(f instanceof HTMLFormElement)) return;
    if (f.id === "configSutiaCompleto51") { configCache = null; setTimeout(() => sincronizarLegado().catch(console.warn), 1200); return; }
    if (f.id !== "formPagamentoManualFinanceiro" || f.dataset.sf65ManualLiberado === "1") { if (f.dataset.sf65ManualLiberado === "1") delete f.dataset.sf65ManualLiberado; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    (async () => {
      bloco(); const d = ids();
      if (completo()) {
        if (!definido(d.f) || !definido(d.p)) return aviso("Informe se o fecho e o ponto de luz vieram prontos.", true);
        if (definido(d.lat) && definido(d.boj)) { if (!calculo || chaveCalculo !== chave()) await calcular(); if (!calculo || chaveCalculo !== chave()) return aviso("Conclua o cálculo automático antes de salvar.", true); d.calc = { ...calculo }; const i = document.getElementById("pagManualValorTotal"); if (i) i.value = a2(calculo.total).toFixed(2); }
      }
      f.dataset.sf65ManualLiberado = "1"; f.requestSubmit(); patch(d).catch(console.error);
    })().catch(x => { console.error(x); aviso("Não foi possível validar o pagamento manual.", true); });
  }, true);

  document.addEventListener("change", e => { if (["pagManualProcesso","pagManualLateral","pagManualBojo","pagManualQuantidadeRecebida",FECHO,PONTO].includes(e.target?.id)) setTimeout(calcular, 0); }, true);
  document.addEventListener("input", e => { if (["pagManualNumeroOP","pagManualQuantidadeRecebida"].includes(e.target?.id)) { clearTimeout(window.__sf65ManualCalc); window.__sf65ManualCalc = setTimeout(calcular, 180); } }, true);
  document.addEventListener("click", e => { if (e.target instanceof Element && e.target.closest("#btnPagamentoManualFinanceiro")) { calculo = null; chaveCalculo = ""; [80,250,600].forEach(t => setTimeout(() => { estilo(); bloco(); calcular(); }, t)); } }, true);

  function iniciar() { estilo(); sincronizarLegado().catch(() => {}); let n = 0; const i = setInterval(() => { n++; bloco(); if (document.getElementById("formPagamentoManualFinanceiro") || n > 40) clearInterval(i); }, 300); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true }); else iniciar();
})();
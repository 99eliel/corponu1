(() => {
  "use strict";
  const VERSION = "2026-08-06-aviso-chegada-admin-130";
  const FB = "10.12.5";
  if (window.__CORPONU_AVISO_CHEGADA_ADMIN__ === VERSION) return;
  window.__CORPONU_AVISO_CHEGADA_ADMIN__ = VERSION;

  const s = { f: null, db: null, auth: null, user: null, perfil: null, avisos: new Map(), faccoes: [], originalChegada: null, timer: 0, observer: null, reenvio: null, salvando: false };
  const PROCESSOS = ["ENCAPAR BOJO", "ALÇA", "LATERAL", "CALCINHA MONTAGEM", "CALCINHA COMPLETA", "SUTIÃ MONTAGEM", "SUTIÃ COMPLETO"];
  const PADRAO = {
    "ENCAPAR BOJO": ["DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA", "DAIANY", "NAGILA", "DELMA", "GIRLAINE"],
    "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],
    "CALCINHA MONTAGEM": ["ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"],
    "CALCINHA COMPLETA": ["LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA", "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ", "MARILIA", "DARLLEN", "RONEIDIA"],
    "SUTIÃ MONTAGEM": ["LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"],
    "SUTIÃ COMPLETO": ["DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"]
  };

  const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  const html = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const admin = () => norm(s.perfil?.tipo) === "ADMIN";
  const hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const dataBR = v => { if (!v) return ""; if (v?.toDate) return v.toDate().toLocaleString("pt-BR"); if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v).split("-").reverse().join("/"); const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("pt-BR"); };
  const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

  function toast(msg, tipo = "info") {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = msg; principal.classList.remove("hidden");
      clearTimeout(window.__avisoChegadaToast130); window.__avisoChegadaToast130 = setTimeout(() => principal.classList.add("hidden"), 6000); return;
    }
    let el = document.getElementById("avisoChegadaToast130");
    if (!el) { el = document.createElement("div"); el.id = "avisoChegadaToast130"; el.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:100080;max-width:420px;padding:13px 15px;border-radius:13px;color:#fff;font:800 13px/1.45 Arial;box-shadow:0 18px 42px #0f172a44"; document.body.appendChild(el); }
    el.style.background = tipo === "erro" ? "#991b1b" : tipo === "ok" ? "#166534" : "#0f172a"; el.textContent = msg;
    clearTimeout(el._t); el._t = setTimeout(() => el.remove(), 6000);
  }

  async function firebase() {
    if (s.f) return s.f;
    const [a, u, f] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]);
    const app = a.getApps()[0] || a.getApp(); s.auth = u.getAuth(app); s.db = f.getFirestore(app); s.f = { ...a, ...u, ...f }; return s.f;
  }

  async function perfil() {
    s.user = s.auth.currentUser; if (!s.user) return;
    const snap = await s.f.getDoc(s.f.doc(s.db, "usuarios", s.user.uid));
    s.perfil = snap.exists() ? snap.data() : {}; document.body.dataset.chegadaPerfil130 = admin() ? "admin" : "usuario";
  }

  async function avisos() {
    try {
      const snap = await s.f.getDocs(s.f.query(s.f.collection(s.db, "movimentacoesProducao"), s.f.where("chegadaInformada", "==", true)));
      s.avisos = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }])); aplicar();
    } catch (e) { console.warn("[Aviso chegada] Falha ao carregar avisos.", e); }
  }

  async function movimento(id) {
    if (s.avisos.has(String(id))) return s.avisos.get(String(id));
    const snap = await s.f.getDoc(s.f.doc(s.db, "movimentacoesProducao", String(id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async function log(acao, id, detalhes) {
    try {
      await s.f.addDoc(s.f.collection(s.db, "logsAlteracoes"), { acao, tipoAlvo: "movimentacaoProducao", alvoId: String(id), detalhes, usuarioUid: s.user.uid, usuarioNome: s.perfil?.nome || "", usuarioEmail: s.perfil?.email || s.user.email || "", usuarioTipo: s.perfil?.tipo || "", criadoEm: s.f.serverTimestamp() });
    } catch (e) { console.warn("Log não salvo.", e); }
  }

  async function avisar(id) {
    const m = await movimento(id);
    if (!m) return toast("Movimentação não encontrada.", "erro");
    if (m.dataChegada) return toast("Essa chegada já foi confirmada pelo administrador.", "erro");
    if (m.chegadaInformada) return toast("Essa chegada já foi avisada.");
    if (["FINALIZADO", "CANCELADO", "CANCELADA", "EXCLUIDO"].includes(norm(m.status))) return toast("Essa movimentação não aceita aviso de chegada.", "erro");
    if (!confirm(`Avisar que a OP ${m.numeroOP || "-"} voltou de ${m.destino || "facção"}? Nenhum pagamento será gerado.`)) return;
    const dados = { chegadaInformada: true, chegadaInformadaStatus: "aguardando_confirmacao_admin", chegadaInformadaData: hoje(), chegadaInformadaEm: s.f.serverTimestamp(), chegadaInformadaPor: s.user.uid, chegadaInformadaPorNome: s.perfil?.nome || s.user.email || "Usuário", chegadaInformadaPorEmail: s.perfil?.email || s.user.email || "", statusOperacional: "chegada_informada", atualizadoPor: s.user.uid, atualizadoEm: s.f.serverTimestamp(), versaoAvisoChegada: VERSION };
    await s.f.setDoc(s.f.doc(s.db, "movimentacoesProducao", String(id)), dados, { merge: true });
    s.avisos.set(String(id), { ...m, ...dados, id: String(id), chegadaInformadaEm: new Date() });
    await log("chegada_faccao_informada", id, `OP ${m.numeroOP || "-"} | ${m.destino || "-"} | ${m.processo || "-"} | sem pagamento`);
    toast("Chegada avisada. A OP já pode ser reenviada, mas o pagamento só será gerado quando o administrador confirmar.", "ok"); aplicar();
  }

  function idOnclick(btn) { return String(btn?.getAttribute("onclick") || "").match(/registrarChegadaMovimentacao\(\s*['\"]([^'\"]+)/)?.[1] || ""; }
  function badge(cel, m) {
    if (!cel || !m) return;
    let b = cel.querySelector(`[data-aviso-chegada-badge="${CSS.escape(m.id)}"]`);
    if (!b) { b = document.createElement("span"); b.dataset.avisoChegadaBadge = m.id; b.style.cssText = "display:inline-flex;margin:3px 4px 3px 0;padding:5px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:900;white-space:normal"; cel.prepend(b); }
    setText(b, `Chegada avisada por ${m.chegadaInformadaPorNome || "usuário"}${m.chegadaInformadaEm || m.chegadaInformadaData ? ` • ${dataBR(m.chegadaInformadaEm || m.chegadaInformadaData)}` : ""}`);
    if (m.reenviadoOperacionalmente || m.reenvioCriadoId) {
      let r = cel.querySelector(`[data-aviso-reenvio-badge="${CSS.escape(m.id)}"]`);
      if (!r) { r = document.createElement("span"); r.dataset.avisoReenvioBadge = m.id; r.style.cssText = "display:inline-flex;margin:3px;padding:5px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900"; cel.appendChild(r); }
      setText(r, "Reenvio já criado"); cel.querySelector(`[data-reenviar-aviso="${CSS.escape(m.id)}"]`)?.remove();
    } else if (!cel.querySelector(`[data-reenviar-aviso="${CSS.escape(m.id)}"]`)) {
      const bt = document.createElement("button"); bt.type = "button"; bt.className = "btn btn-sm"; bt.dataset.reenviarAviso = m.id; bt.textContent = "Reenviar facção"; cel.appendChild(bt);
    }
  }

  function aplicarAgora() {
    document.querySelectorAll('[onclick*="registrarChegadaMovimentacao"], [data-avisar-chegada]').forEach(bt => {
      const id = bt.dataset.avisarChegada || idOnclick(bt); if (!id) return; const m = s.avisos.get(id); const cel = bt.closest("td") || bt.parentElement;
      if (admin()) { setText(bt, "Confirmar chegada"); bt.title = "Confirma oficialmente e gera pagamento"; }
      else { bt.removeAttribute("onclick"); bt.dataset.avisarChegada = id; setText(bt, m ? "Aviso enviado" : "Avisar que chegou"); bt.disabled = !!m; bt.title = "Somente controle operacional, sem pagamento"; }
      if (m) badge(cel, m);
    });
    document.querySelectorAll("[data-chegada-corte]").forEach(bt => {
      const id = String(bt.dataset.chegadaCorte || ""); const m = s.avisos.get(id); const cel = bt.closest("td") || bt.parentElement;
      setText(bt, admin() ? "Confirmar chegada" : (m ? "Aviso enviado" : "Avisar que chegou")); if (!admin()) bt.disabled = !!m; if (m) badge(cel, m);
    });
    const manual = document.getElementById("btnAbrirChegadaManualFaccao"); if (manual) manual.style.display = admin() ? "" : "none";
    const topo = document.getElementById("btnCorteRegistrarChegada"); if (topo) { topo.style.display = admin() ? "" : "none"; if (admin()) setText(topo, "Confirmar chegada"); }
    envolverChegada();
  }
  function aplicar() { clearTimeout(s.timer); s.timer = setTimeout(aplicarAgora, 40); }

  function envolverChegada() {
    const atual = window.registrarChegadaMovimentacao; if (typeof atual !== "function" || atual.__aviso130) return;
    if (!s.originalChegada) s.originalChegada = atual;
    const w = id => { if (!admin()) return avisar(id); const m = s.avisos.get(String(id)); const r = atual(id); if (m) setTimeout(() => { const i = document.getElementById("chegadaData"); if (i && !i.value) i.value = m.chegadaInformadaData || hoje(); }, 60); return r; };
    w.__aviso130 = true; window.registrarChegadaMovimentacao = w;
  }

  async function confirmarAdmin(id) {
    if (!id || !admin()) return;
    const ref = s.f.doc(s.db, "movimentacoesProducao", String(id));
    for (let n = 0; n < 12; n++) {
      await new Promise(r => setTimeout(r, 500)); const snap = await s.f.getDoc(ref); if (!snap.exists()) return; const m = snap.data(); if (!m.dataChegada) continue;
      await s.f.setDoc(ref, { chegadaInformada: false, chegadaInformadaStatus: "confirmada_admin", confirmacaoChegadaFinanceira: true, chegadaConfirmadaPor: s.user.uid, chegadaConfirmadaPorNome: s.perfil?.nome || s.user.email || "Administrador", chegadaConfirmadaEm: s.f.serverTimestamp(), statusOperacional: m.reenviadoOperacionalmente ? "chegada_confirmada_reenviada" : "chegada_confirmada", ...(m.reenviadoOperacionalmente ? { status: "encaminhado", encaminhado: true } : {}), atualizadoPor: s.user.uid, atualizadoEm: s.f.serverTimestamp(), versaoAvisoChegada: VERSION }, { merge: true });
      s.avisos.delete(String(id)); await log("chegada_faccao_confirmada_admin", id, `OP ${m.numeroOP || "-"} | pagamento autorizado`); aplicar(); return;
    }
  }

  function processosFaccao(f) { return [f?.processosPermitidos, f?.processos, f?.servicos, f?.tiposProcesso, f?.processo, f?.tipoProcesso].flatMap(v => Array.isArray(v) ? v : v ? [v] : []).map(norm); }
  async function carregarFaccoes() {
    if (s.faccoes.length) return; const snap = await s.f.getDocs(s.f.collection(s.db, "faccoes"));
    s.faccoes = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.ativo !== false && !f.duplicadaDe && f.statusImportacao !== "duplicada_consolidada");
  }
  function faccoesDoProcesso(p) {
    let lista = s.faccoes.filter(f => processosFaccao(f).includes(norm(p)));
    if (!lista.length) { const chave = Object.keys(PADRAO).find(k => norm(k) === norm(p)); const nomes = new Set((PADRAO[chave] || []).map(norm)); lista = s.faccoes.filter(f => nomes.has(norm(f.nome || f.razaoSocial || f.id))); }
    return (lista.length ? lista : s.faccoes).sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  }

  function modalReenvio() {
    let m = document.getElementById("modalReenvioAviso130"); if (m) return m;
    const st = document.createElement("style"); st.textContent = "#modalReenvioAviso130{position:fixed;inset:0;z-index:100090;display:none;align-items:center;justify-content:center;padding:18px;background:#0f172a99}#modalReenvioAviso130.show{display:flex}.reenvio130{width:min(620px,100%);background:#fff;border-radius:18px;padding:20px;box-shadow:0 25px 70px #0f172a55}.grid130{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid130 label{display:grid;gap:6px;font-weight:800}.grid130 input,.grid130 select{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:8px}.acoes130{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:650px){.grid130{grid-template-columns:1fr}}"; document.head.appendChild(st);
    m = document.createElement("div"); m.id = "modalReenvioAviso130"; m.innerHTML = `<div class="reenvio130"><h3 style="margin-top:0">Reenviar para facção</h3><p id="resumoReenvio130" class="muted"></p><div class="notice small"><strong>Pagamento isolado:</strong> este reenvio só gerará pagamento quando o administrador confirmar a chegada dele.</div><form id="formReenvioAviso130"><div class="grid130"><label>Processo<select id="processoReenvio130" required></select></label><label>Facção<select id="faccaoReenvio130" required></select></label><label>Quantidade<input id="quantidadeReenvio130" type="number" min="1" step="1" required></label><label>Data da saída<input id="dataReenvio130" type="date" required></label></div><div class="acoes130"><button type="button" class="btn" data-fechar-reenvio130>Cancelar</button><button type="submit" class="btn btn-primary">Criar reenvio</button></div></form></div>`; document.body.appendChild(m);
    m.addEventListener("pointerdown", e => { if (e.target === m) fecharReenvio(); }); m.querySelector("[data-fechar-reenvio130]").addEventListener("click", fecharReenvio); document.getElementById("processoReenvio130").addEventListener("change", preencherFaccoes); document.getElementById("formReenvioAviso130").addEventListener("submit", salvarReenvio); return m;
  }
  function preencherFaccoes() {
    const p = document.getElementById("processoReenvio130")?.value || ""; const sel = document.getElementById("faccaoReenvio130"); if (!sel) return;
    sel.innerHTML = `<option value="">Selecione</option>${faccoesDoProcesso(p).map(f => { const n = String(f.nome || f.razaoSocial || f.id).trim().toUpperCase(); return `<option value="${html(n)}" data-id="${html(f.id)}">${html(n)}</option>`; }).join("")}`;
  }
  async function abrirReenvio(id) {
    const mov = await movimento(id); if (!mov?.chegadaInformada || mov.dataChegada) return toast("O reenvio antecipado exige o aviso de chegada.", "erro");
    if (mov.reenviadoOperacionalmente || mov.reenvioCriadoId) return toast("Este retorno já originou um reenvio.", "erro");
    await carregarFaccoes(); s.reenvio = mov; const m = modalReenvio();
    document.getElementById("processoReenvio130").innerHTML = `<option value="">Selecione</option>${PROCESSOS.map(p => `<option value="${html(p)}">${html(p)}</option>`).join("")}`; preencherFaccoes();
    const q = Math.max(Number(mov.quantidadeRecebida || 0), Number(mov.quantidadeEnviada || 0), 1); const qi = document.getElementById("quantidadeReenvio130"); qi.value = q; qi.max = q; document.getElementById("dataReenvio130").value = hoje(); setText(document.getElementById("resumoReenvio130"), `OP ${mov.numeroOP || "-"} • Ref. ${mov.referencia || "-"} • chegada avisada`); m.classList.add("show");
  }
  function fecharReenvio() { document.getElementById("modalReenvioAviso130")?.classList.remove("show"); s.reenvio = null; s.salvando = false; }
  async function salvarReenvio(e) {
    e.preventDefault(); if (s.salvando || !s.reenvio) return; const o = s.reenvio; const p = String(document.getElementById("processoReenvio130").value || "").trim().toUpperCase(); const fs = document.getElementById("faccaoReenvio130"); const f = String(fs.value || "").trim().toUpperCase(); const fid = fs.selectedOptions[0]?.dataset?.id || ""; const q = Number(document.getElementById("quantidadeReenvio130").value || 0); const d = document.getElementById("dataReenvio130").value; const max = Math.max(Number(o.quantidadeRecebida || 0), Number(o.quantidadeEnviada || 0), 0);
    if (!p || !f || !d || q <= 0 || (max && q > max)) return toast("Informe processo, facção, data e quantidade válida.", "erro"); if (!confirm(`Criar reenvio da OP ${o.numeroOP || "-"} para ${f}, processo ${p}, com ${q.toLocaleString("pt-BR")} peças?`)) return; s.salvando = true;
    try {
      const novo = { origem: "movimentacao_aviso_chegada", movimentacaoOrigemId: o.id, pagamentoReenvio: true, reenvio: true, opId: o.opId || "", numeroOP: o.numeroOP || "", referencia: o.referencia || "", cor: o.cor || "", produtoNome: o.produtoNome || "", tipoPeca: o.tipoPeca || "", tipoPecaLabel: o.tipoPecaLabel || "", tipoDestino: "faccao", tipoDestinoLabel: "Facção", destino: f, destinoId: fid, processo: p, setor: o.setor || "", setorLabel: o.setorLabel || "", linhaCalcinha: o.linhaCalcinha || "", linhaCalcinhaLabel: o.linhaCalcinhaLabel || "", quantidadeEnviada: q, dataEnvio: d, dataChegada: "", falta: 0, quantidadeRecebida: 0, status: "em_andamento", statusOperacional: "em_faccao", criadoPor: s.user.uid, criadoEm: s.f.serverTimestamp(), atualizadoPor: s.user.uid, atualizadoEm: s.f.serverTimestamp(), versaoAvisoChegada: VERSION };
      const nr = await s.f.addDoc(s.f.collection(s.db, "movimentacoesProducao"), novo); await s.f.setDoc(s.f.doc(s.db, "movimentacoesProducao", o.id), { reenviadoOperacionalmente: true, reenvioCriadoId: nr.id, reenvioCriadoEm: s.f.serverTimestamp(), reenvioCriadoPor: s.user.uid, encaminhadoParaDestinoOperacional: f, encaminhadoParaProcessoOperacional: p, statusOperacional: "chegada_informada_reenviada", atualizadoPor: s.user.uid, atualizadoEm: s.f.serverTimestamp(), versaoAvisoChegada: VERSION }, { merge: true });
      s.avisos.set(o.id, { ...o, reenviadoOperacionalmente: true, reenvioCriadoId: nr.id }); await log("movimentacao_reenvio_criado_antes_confirmacao", nr.id, `OP ${o.numeroOP || "-"} | origem ${o.id} | ${p} | ${f}`); fecharReenvio(); toast("Reenvio criado. Ele terá outro pagamento quando a chegada dele for confirmada pelo administrador.", "ok"); aplicar();
    } catch (err) { console.error(err); s.salvando = false; toast("Não foi possível criar o reenvio.", "erro"); }
  }

  function eventos() {
    document.addEventListener("click", e => {
      const t = e.target instanceof Element ? e.target : null; if (!t) return;
      const a = t.closest("[data-avisar-chegada]"); if (a) { e.preventDefault(); e.stopImmediatePropagation(); avisar(a.dataset.avisarChegada); return; }
      const r = t.closest("[data-reenviar-aviso]"); if (r) { e.preventDefault(); e.stopImmediatePropagation(); abrirReenvio(r.dataset.reenviarAviso); return; }
      const c = t.closest("[data-chegada-corte]"); if (c && !admin()) { e.preventDefault(); e.stopImmediatePropagation(); avisar(c.dataset.chegadaCorte); return; }
      if (c && admin()) { const m = s.avisos.get(String(c.dataset.chegadaCorte)); if (m) setTimeout(() => { const i = document.getElementById("chegadaCorteData"); if (i && !i.value) i.value = m.chegadaInformadaData || hoje(); }, 60); }
    }, true);
    document.addEventListener("submit", e => {
      const id = e.target?.id || ""; if (!["formChegadaMovimentacao", "formChegadaCorte", "formChegadaManualFaccao"].includes(id)) return;
      if (!admin()) { e.preventDefault(); e.stopImmediatePropagation(); toast("Somente o administrador pode confirmar chegada e gerar pagamento.", "erro"); return; }
      const mid = id === "formChegadaCorte" ? document.getElementById("chegadaCorteMovId")?.value : document.getElementById("chegadaMovimentacaoId")?.value; if (mid) confirmarAdmin(mid);
    }, true);
  }

  async function iniciar() {
    try {
      await firebase(); s.f.onAuthStateChanged(s.auth, async u => { s.user = u; if (!u) return; await perfil(); await avisos(); envolverChegada(); aplicar(); }); eventos();
      s.observer = new MutationObserver(aplicar); s.observer.observe(document.body, { childList: true, subtree: true }); setInterval(() => { envolverChegada(); if (document.visibilityState === "visible" && document.querySelector("#faccoes.page.active")) avisos(); }, 45000);
    } catch (e) { console.error("[Aviso chegada] Falha ao iniciar.", e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true }); else iniciar();
})();

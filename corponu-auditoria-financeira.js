(() => {
  "use strict";
  const VERSION = "2026-08-01-seguranca-financeira-65";
  const FB = "10.12.5";
  const ID = "sf65AuditoriaFinanceira";
  let ctxPromise = null;
  let perfil = null;
  if (window.__CORPONU_AUDITORIA_FINANCEIRA__ === VERSION) return;
  window.__CORPONU_AUDITORIA_FINANCEIRA__ = VERSION;

  const t = v => String(v ?? "").trim();
  const n = v => t(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const ativo = p => p?.excluido !== true && !["CANCELADO","CANCELADA","ESTORNADO","ESTORNADA","EXCLUIDO","EXCLUIDA"].includes(n(p?.statusPagamento || p?.status));
  const pago = p => n(p?.statusPagamento || p?.status) === "PAGO";

  async function ctx() {
    if (ctxPromise) return ctxPromise;
    ctxPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, auth, fs]) => { const a = app.getApp(); return { auth: auth.getAuth(a), db: fs.getFirestore(a), fs }; }).catch(e => { ctxPromise = null; throw e; });
    return ctxPromise;
  }

  async function carregarPerfil() {
    const { auth, db, fs } = await ctx();
    for (let i = 0; i < 40 && !auth.currentUser; i++) await new Promise(r => setTimeout(r, 150));
    if (!auth.currentUser) return null;
    const s = await fs.getDoc(fs.doc(db, "usuarios", auth.currentUser.uid));
    perfil = s.exists() ? s.data() : null;
    return perfil;
  }

  function pode() {
    if (!perfil || perfil.ativo === false) return false;
    if (n(perfil.tipo) === "ADMIN") return true;
    const r = perfil.permissoes?.recursos || {};
    return r.gerenciarValores === true || r.marcarPagamentos === true;
  }

  function estilo() {
    if (document.getElementById("sf65AuditoriaStyle")) return;
    const s = document.createElement("style"); s.id = "sf65AuditoriaStyle"; s.textContent = `
      #${ID}{margin:0 0 16px;padding:14px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff}
      #${ID} .cab{display:flex;justify-content:space-between;gap:12px;align-items:center} #${ID} h3{margin:0;color:#1e3a8a} #${ID} p{margin:4px 0 0;color:#475569;font-size:12px}
      #${ID} .res{margin-top:11px;padding:10px;border-radius:10px;background:#fff;color:#334155;font-weight:800;line-height:1.5}
      #${ID} table{width:100%;margin-top:10px;border-collapse:collapse;background:#fff} #${ID} th,#${ID} td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:11px}
      @media(max-width:680px){#${ID} .cab{align-items:flex-start;flex-direction:column}}`;
    document.head.appendChild(s);
  }

  function inserir() {
    const pag = document.getElementById("pagamentos");
    if (!pag || document.getElementById(ID) || !pode()) return false;
    estilo(); const p = document.createElement("section"); p.id = ID; p.innerHTML = `
      <div class="cab"><div><h3>Conferência de integridade financeira</h3><p>Verifica duplicidades, chegadas sem pagamento e pagamentos sem origem. A análise não altera nem exclui dados.</p></div><button class="btn btn-primary" id="sf65Analisar" type="button">Analisar agora</button></div>
      <div class="res" id="sf65Resultado">A análise é executada somente quando solicitada.</div><div id="sf65Tabela"></div>`;
    pag.prepend(p); document.getElementById("sf65Analisar")?.addEventListener("click", analisar); return true;
  }

  async function analisar() {
    const b = document.getElementById("sf65Analisar"), r = document.getElementById("sf65Resultado"), box = document.getElementById("sf65Tabela");
    if (!b || !r || !box) return; const original = b.textContent; b.disabled = true; b.textContent = "Analisando..."; r.textContent = "Lendo movimentações e pagamentos. Nenhum dado será modificado.";
    try {
      const { db, fs } = await ctx();
      const [ms, ps] = await Promise.all([fs.getDocs(fs.collection(db, "movimentacoesProducao")), fs.getDocs(fs.collection(db, "entregasPagamento"))]);
      const movs = ms.docs.map(x => ({ id: x.id, ...x.data() })); const pags = ps.docs.map(x => ({ id: x.id, ...x.data() }));
      const movMap = new Map(movs.map(x => [x.id, x])); const porMov = new Map();
      pags.filter(ativo).forEach(x => { if (!x.movimentacaoId) return; const a = porMov.get(x.movimentacaoId) || []; a.push(x); porMov.set(x.movimentacaoId, a); });
      const problemas = [];
      porMov.forEach((a, id) => { if (a.length > 1) { const m = movMap.get(id) || {}; problemas.push({ tipo: a.some(pago) ? "Pago com duplicata ativa" : "Pagamentos duplicados", op: m.numeroOP || a[0]?.numeroOP || "-", proc: m.processo || a[0]?.processo || "-", origem: id, detalhe: a.map(x => x.id).join(", ") }); } });
      movs.filter(x => n(x.tipoDestino) === "FACCAO" && t(x.dataChegada) && !["CANCELADO","EXCLUIDO"].includes(n(x.status))).filter(x => !(porMov.get(x.id) || []).length).forEach(x => problemas.push({ tipo: "Chegada sem pagamento", op: x.numeroOP || "-", proc: x.processo || "-", origem: x.id, detalhe: x.destino || "-" }));
      pags.filter(ativo).filter(x => x.movimentacaoId && !movMap.has(x.movimentacaoId)).forEach(x => problemas.push({ tipo: "Pagamento sem movimentação", op: x.numeroOP || "-", proc: x.processo || x.servicoNome || "-", origem: x.id, detalhe: x.movimentacaoId }));
      pags.filter(ativo).filter(x => n(x.statusPagamento).includes("SEM VALOR") || n(x.statusPagamento).includes("AGUARDANDO VALOR") || x.valorPendente === true).forEach(x => problemas.push({ tipo: "Aguardando valor", op: x.numeroOP || "-", proc: x.processo || x.servicoNome || "-", origem: x.id, detalhe: x.avisoPagamento || "Valor pendente" }));
      const d = problemas.filter(x => x.tipo.toLowerCase().includes("duplic")).length, s = problemas.filter(x => x.tipo === "Chegada sem pagamento").length, o = problemas.filter(x => x.tipo === "Pagamento sem movimentação").length, v = problemas.filter(x => x.tipo === "Aguardando valor").length;
      r.textContent = problemas.length ? `${problemas.length} ponto(s): ${d} duplicidade(s), ${s} chegada(s) sem pagamento, ${o} pagamento(s) sem movimentação e ${v} aguardando valor.` : "Nenhum conflito financeiro foi encontrado.";
      box.innerHTML = problemas.length ? `<div style="overflow:auto"><table><thead><tr><th>Situação</th><th>OP</th><th>Processo</th><th>Origem</th><th>Detalhe</th></tr></thead><tbody>${problemas.slice(0,150).map(x => `<tr><td><strong>${esc(x.tipo)}</strong></td><td>${esc(x.op)}</td><td>${esc(x.proc)}</td><td>${esc(x.origem)}</td><td>${esc(x.detalhe)}</td></tr>`).join("")}</tbody></table></div>${problemas.length > 150 ? `<small>Mostrando 150 de ${problemas.length} resultados.</small>` : ""}` : "";
    } catch (e) { console.error(e); r.textContent = "Não foi possível concluir a análise. Verifique as permissões."; box.innerHTML = ""; }
    finally { b.disabled = false; b.textContent = original; }
  }

  async function iniciar() { await carregarPerfil().catch(() => null); let i = 0; const tmr = setInterval(() => { i++; if (inserir() || i > 40) clearInterval(tmr); }, 300); }
  document.addEventListener("click", e => { if (e.target instanceof Element && e.target.closest('[data-page="pagamentos"]')) setTimeout(inserir, 150); }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true }); else iniciar();
})();
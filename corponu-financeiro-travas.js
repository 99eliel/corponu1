(() => {
  "use strict";

  const VERSION = "2026-08-01-seguranca-financeira-65";
  const FB = "10.12.5";
  const TTL = 120000;
  const emCurso = new Set();
  let ctxPromise = null;

  if (window.__CORPONU_FINANCEIRO_TRAVAS__ === VERSION) return;
  window.__CORPONU_FINANCEIRO_TRAVAS__ = VERSION;

  const txt = v => String(v ?? "").trim();
  const norm = v => txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const slug = v => norm(v).replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "SEM-DADO";
  const inteiro = v => Math.max(0, Math.floor(Number(v || 0)));
  const ativo = p => p?.excluido !== true && !["CANCELADO", "CANCELADA", "ESTORNADO", "ESTORNADA", "EXCLUIDO", "EXCLUIDA"].includes(norm(p?.statusPagamento || p?.status));
  const pago = p => norm(p?.statusPagamento || p?.status) === "PAGO";
  const ms = v => typeof v?.toMillis === "function" ? v.toMillis() : typeof v?.toDate === "function" ? v.toDate().getTime() : Number.isNaN(new Date(v).getTime()) ? 0 : new Date(v).getTime();

  function aviso(m, erro = false) {
    const t = document.getElementById("toast");
    if (!t) return alert(m);
    t.textContent = m;
    t.classList.remove("hidden");
    t.style.background = erro ? "#991b1b" : "";
    clearTimeout(window.__sf65LockToast);
    window.__sf65LockToast = setTimeout(() => { t.classList.add("hidden"); t.style.background = ""; }, 6500);
  }

  async function ctx() {
    if (ctxPromise) return ctxPromise;
    ctxPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, auth, fs]) => {
      if (!app.getApps().length) throw new Error("Firebase não inicializado");
      const a = app.getApp();
      return { auth: auth.getAuth(a), db: fs.getFirestore(a), fs };
    }).catch(e => { ctxPromise = null; throw e; });
    return ctxPromise;
  }

  async function usuario() {
    const { auth } = await ctx();
    for (let i = 0; i < 40 && !auth.currentUser; i++) await new Promise(r => setTimeout(r, 150));
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    return auth.currentUser;
  }

  function idTrava(chave) {
    let h = 2166136261;
    for (const c of chave) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return `financeiro-${slug(chave)}-${(h >>> 0).toString(36)}`.slice(0, 190);
  }

  async function travar(chave, dados) {
    const { db, fs } = await ctx();
    const u = await usuario();
    const ref = fs.doc(db, "travasOperacionais", idTrava(chave));
    const agora = Date.now();
    await fs.runTransaction(db, async tx => {
      const s = await tx.get(ref);
      const a = s.exists() ? s.data() : null;
      const idade = a ? agora - Number(a.atualizadoEmMs || a.iniciadoEmMs || 0) : Infinity;
      const st = norm(a?.status);
      if (st === "CONCLUIDO") throw new Error("CONCLUIDO");
      if (st === "CONFLITO") throw new Error("CONFLITO");
      if (st === "PROCESSANDO" && idade < TTL) throw new Error("PROCESSANDO");
      if (a?.criadoPor && a.criadoPor !== u.uid) throw new Error("OUTRO_USUARIO");
      tx.set(ref, {
        chave, tipo: dados.tipo, status: "processando",
        movimentacaoId: dados.movimentacaoId || a?.movimentacaoId || "",
        numeroOP: dados.numeroOP || a?.numeroOP || "",
        processo: dados.processo || a?.processo || "",
        faccao: dados.faccao || a?.faccao || "",
        pagamentoId: a?.pagamentoId || "",
        iniciadoEmMs: agora, atualizadoEmMs: agora,
        criadoPor: a?.criadoPor || u.uid, atualizadoPor: u.uid,
        criadoEm: a?.criadoEm || fs.serverTimestamp(), atualizadoEm: fs.serverTimestamp(), versao: VERSION
      }, { merge: true });
    });
    return ref;
  }

  async function finalizar(ref, status, dados = {}) {
    const { fs } = await ctx();
    const u = await usuario();
    await fs.setDoc(ref, {
      status, movimentacaoId: dados.movimentacaoId || "", pagamentoId: dados.pagamentoId || "",
      quantidadePagamentosAtivos: Number(dados.quantidade || 0), observacao: dados.observacao || "",
      atualizadoEmMs: Date.now(), atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp(),
      concluidoEm: status === "concluido" ? fs.serverTimestamp() : null, versao: VERSION
    }, { merge: true });
  }

  async function pagamentos(movId) {
    const { db, fs } = await ctx();
    const s = await fs.getDocs(fs.query(fs.collection(db, "entregasPagamento"), fs.where("movimentacaoId", "==", movId)));
    return s.docs.map(d => ({ id: d.id, ...d.data() })).filter(ativo);
  }

  async function vincular(movId, pag, trava, origem) {
    const { db, fs } = await ctx();
    const u = await usuario();
    const mr = fs.doc(db, "movimentacoesProducao", movId);
    const pr = fs.doc(db, "entregasPagamento", pag.id);
    await fs.runTransaction(db, async tx => {
      const [msn, psn] = await Promise.all([tx.get(mr), tx.get(pr)]);
      if (!msn.exists() || !psn.exists()) throw new Error("Documento financeiro não encontrado");
      tx.set(mr, {
        pagamentoId: pag.id, pagamentoGerado: true, pagamentoGeradoEm: fs.serverTimestamp(),
        chaveUnicaPagamento: `movimento:${movId}`, integridadeFinanceiraPendente: false,
        segurancaFinanceiraVersao: VERSION, atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp()
      }, { merge: true });
      if (!pago(psn.data())) tx.set(pr, {
        chaveUnicaPagamento: `movimento:${movId}`, origemPagamento: origem, origemId: movId,
        segurancaFinanceiraVersao: VERSION, atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp()
      }, { merge: true });
    });
    await finalizar(trava, "concluido", { movimentacaoId: movId, pagamentoId: pag.id, quantidade: 1 });
  }

  function bloquear(form) {
    const b = form.querySelector('button[type="submit"]');
    if (!b) return () => {};
    const t = b.textContent; b.disabled = true; b.textContent = "Salvando com segurança...";
    return () => { b.disabled = false; b.textContent = t; };
  }

  function liberar(form) {
    form.dataset.sf65Liberado = "1";
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }

  async function monitorarNormal(movId, trava, fim) {
    for (const espera of [700, 1500, 3000, 5500, 8500]) {
      await new Promise(r => setTimeout(r, espera));
      const ps = await pagamentos(movId);
      if (ps.length > 1) { await finalizar(trava, "conflito", { movimentacaoId: movId, quantidade: ps.length, observacao: "Mais de um pagamento ativo." }); aviso("Conflito financeiro detectado. Use a Conferência de integridade.", true); return fim(); }
      if (ps.length === 1) { await vincular(movId, ps[0], trava, "chegada_normal"); return fim(); }
    }
    const { db, fs } = await ctx();
    const u = await usuario();
    const r = fs.doc(db, "movimentacoesProducao", movId);
    const s = await fs.getDoc(r);
    if (s.exists() && txt(s.data().dataChegada)) {
      await fs.setDoc(r, { integridadeFinanceiraPendente: true, motivoIntegridadeFinanceira: "chegada_sem_pagamento", segurancaFinanceiraVersao: VERSION, atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp() }, { merge: true });
      await finalizar(trava, "falha_pagamento", { movimentacaoId: movId, observacao: "Chegada sem pagamento localizado." });
      aviso("A chegada foi salva sem pagamento localizado e ficou bloqueada para conferência, sem criar outro pagamento.", true);
    } else await finalizar(trava, "falha_operacao", { movimentacaoId: movId });
    fim();
  }

  async function chegadaNormal(form) {
    const id = txt(document.getElementById("chegadaMovimentacaoId")?.value);
    if (!id || emCurso.has(`n:${id}`)) return aviso("Esta chegada já está sendo processada.");
    const { db, fs } = await ctx();
    const mr = fs.doc(db, "movimentacoesProducao", id);
    const msnap = await fs.getDoc(mr);
    if (!msnap.exists()) return aviso("Movimentação não encontrada.", true);
    const mov = { id, ...msnap.data() };
    if (norm(mov.tipoDestino) !== "FACCAO") return liberar(form);
    const ps = await pagamentos(id);
    if (ps.some(pago)) return aviso("Esta movimentação já possui pagamento pago e está congelada.", true);
    if (ps.length > 1) return aviso("Existem pagamentos duplicados nesta movimentação. Faça a conferência antes.", true);
    if (txt(mov.dataChegada) && ps.length === 1) return aviso("Esta chegada já foi registrada e já possui pagamento. Nenhum novo pagamento foi criado.");
    let tr;
    try { tr = await travar(`movimento:${id}`, { tipo: "chegada_normal", movimentacaoId: id, numeroOP: mov.numeroOP, processo: mov.processo, faccao: mov.destino }); }
    catch (e) { return aviso({ CONCLUIDO: "Esta chegada já foi concluída.", PROCESSANDO: "Esta chegada já está sendo processada em outra aba ou por outro usuário.", CONFLITO: "Esta movimentação está bloqueada por conflito financeiro.", OUTRO_USUARIO: "Existe uma trava antiga criada por outro usuário; faça a conferência financeira." }[e.message] || "Não foi possível reservar esta chegada.", true); }
    emCurso.add(`n:${id}`); const restaurar = bloquear(form); liberar(form);
    monitorarNormal(id, tr, () => { emCurso.delete(`n:${id}`); restaurar(); }).catch(async e => { console.error(e); emCurso.delete(`n:${id}`); restaurar(); await finalizar(tr, "falha_monitoramento", { movimentacaoId: id, observacao: e.message }).catch(() => {}); });
  }

  function dadosManual() {
    const op = txt(document.getElementById("chegadaManualOP")?.value);
    const processo = norm(document.getElementById("chegadaManualProcesso")?.value);
    const faccao = norm(document.getElementById("chegadaManualFaccao")?.value);
    const data = txt(document.getElementById("chegadaManualDataChegada")?.value);
    const qtd = inteiro(document.getElementById("chegadaManualQuantidade")?.value);
    return { op, processo, faccao, data, qtd, chave: `chegada-manual:${op}:${processo}:${faccao}:${data}:${qtd}` };
  }

  async function acharManual(d, inicio = 0) {
    const { db, fs } = await ctx();
    const s = await fs.getDocs(fs.query(fs.collection(db, "movimentacoesProducao"), fs.where("numeroOP", "==", d.op)));
    return s.docs.map(x => ({ id: x.id, ...x.data() }))
      .filter(x => x.origem === "chegada_manual_faccao" && norm(x.processo) === d.processo && norm(x.destino) === d.faccao && txt(x.dataChegada) === d.data && inteiro(x.quantidadeRecebida || x.quantidadeEnviada) === d.qtd)
      .filter(x => !inicio || !ms(x.criadoEm || x.atualizadoEm) || ms(x.criadoEm || x.atualizadoEm) >= inicio - 15000)
      .sort((a, b) => ms(b.criadoEm || b.atualizadoEm) - ms(a.criadoEm || a.atualizadoEm))[0] || null;
  }

  async function monitorarManual(d, inicio, trava, fim) {
    let mov = null;
    for (const espera of [800, 1800, 3500, 6000, 9000]) {
      await new Promise(r => setTimeout(r, espera)); mov = await acharManual(d, inicio); if (!mov) continue;
      const ps = await pagamentos(mov.id);
      if (ps.length > 1) { await finalizar(trava, "conflito", { movimentacaoId: mov.id, quantidade: ps.length }); aviso("Conflito no lançamento manual. Use a Conferência de integridade.", true); return fim(); }
      if (ps.length === 1) { await vincular(mov.id, ps[0], trava, "chegada_manual_faccao"); return fim(); }
    }
    if (mov) {
      const { db, fs } = await ctx(); const u = await usuario();
      await fs.setDoc(fs.doc(db, "movimentacoesProducao", mov.id), { integridadeFinanceiraPendente: true, motivoIntegridadeFinanceira: "chegada_manual_sem_pagamento", atualizadoPor: u.uid, atualizadoEm: fs.serverTimestamp(), segurancaFinanceiraVersao: VERSION }, { merge: true });
      await finalizar(trava, "falha_pagamento", { movimentacaoId: mov.id });
      aviso("A chegada manual foi salva sem pagamento e ficou bloqueada para conferência.", true);
    } else await finalizar(trava, "falha_operacao");
    fim();
  }

  async function chegadaManual(form) {
    const d = dadosManual(); if (!d.op || !d.processo || !d.faccao || !d.data || !d.qtd) return liberar(form);
    if (emCurso.has(d.chave)) return aviso("Este lançamento manual já está sendo salvo.");
    const existe = await acharManual(d);
    if (existe) { const ps = await pagamentos(existe.id); return aviso(ps.length ? "Já existe uma chegada manual igual com pagamento." : "Já existe uma chegada manual igual sem pagamento. Use a conferência; não crie outra.", true); }
    let tr;
    try { tr = await travar(d.chave, { tipo: "chegada_manual_faccao", numeroOP: d.op, processo: d.processo, faccao: d.faccao }); }
    catch (e) { return aviso({ CONCLUIDO: "Já existe uma chegada manual com estes dados.", PROCESSANDO: "Uma chegada manual igual já está sendo processada.", CONFLITO: "Este lançamento está bloqueado por conflito.", OUTRO_USUARIO: "Existe uma trava antiga criada por outro usuário; faça a conferência." }[e.message] || "Não foi possível reservar este lançamento.", true); }
    const inicio = Date.now(); emCurso.add(d.chave); const restaurar = bloquear(form); liberar(form);
    monitorarManual(d, inicio, tr, () => { emCurso.delete(d.chave); restaurar(); }).catch(async e => { console.error(e); emCurso.delete(d.chave); restaurar(); await finalizar(tr, "falha_monitoramento", { observacao: e.message }).catch(() => {}); });
  }

  document.addEventListener("submit", e => {
    const f = e.target; if (!(f instanceof HTMLFormElement)) return;
    if (f.dataset.sf65Liberado === "1") { delete f.dataset.sf65Liberado; return; }
    if (f.id === "formChegadaMovimentacao") { e.preventDefault(); e.stopImmediatePropagation(); chegadaNormal(f).catch(x => { console.error(x); aviso("A chegada não foi liberada por segurança.", true); }); }
    if (f.id === "formChegadaManualFaccao") { e.preventDefault(); e.stopImmediatePropagation(); chegadaManual(f).catch(x => { console.error(x); aviso("A chegada manual não foi liberada por segurança.", true); }); }
  }, true);
})();
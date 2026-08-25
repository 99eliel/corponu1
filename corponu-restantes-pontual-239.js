(() => {
  "use strict";
  const VERSION = "2026-08-25-restantes-pontual-239";
  const FB = "10.12.5";
  const FORM = "formReceberRestantePagamento";
  const PROCESSO_COMPLETO = "SUTIÃ COMPLETO";
  const GUARD = "__CORPONU_RESTANTES_PONTUAL_239__";
  if (window[GUARD] === VERSION) return;
  window[GUARD] = VERSION;

  let selecionado = "";
  let salvando = false;
  let fbPromise = null;
  let precosPromise = null;

  const txt = v => String(v ?? "").trim();
  const num = (v, p = 0) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : p;
    const s = txt(v);
    if (!s) return p;
    const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
    return Number.isFinite(n) ? n : p;
  };
  const int = v => Math.max(0, Math.floor(num(v)));
  const r4 = v => Math.round((num(v) + Number.EPSILON) * 10000) / 10000;
  const r2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;
  const norm = v => txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const refCanon = v => {
    const s = txt(v).replace(/\s+/g, "").toUpperCase();
    if (!s) return "";
    return /^\d+$/.test(s) ? String(Number(s)) : s.replace(/[^A-Z0-9]/g, "");
  };
  const procCanon = v => ({
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
  }[norm(v)] || txt(v).toUpperCase());
  const setor = p => {
    const n = norm(p);
    if (n.includes("CALCINHA")) return "calcinha";
    if (n.includes("BOJO")) return "bojo";
    if (n.includes("LATERAL")) return "lateral";
    if (n.includes("ALCA")) return "alca";
    return "sutia";
  };
  const labelSetor = s => ({sutia:"Sutiã",calcinha:"Calcinha",bojo:"Bojo",lateral:"Lateral",alca:"Alça"}[String(s||"").toLowerCase()] || "Produção");
  const hoje = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const slug = v => norm(v).replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "SEM-DADO";
  const moeda = v => num(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function aviso(m, erro = false) {
    const el = document.getElementById("toast");
    if (!el) return console[erro ? "error" : "info"](`[CorpoNu 239] ${m}`);
    const anterior = el.style.background;
    el.textContent = m; el.classList.remove("hidden");
    if (erro) el.style.background = "#991b1b";
    clearTimeout(window.__rest239Toast);
    window.__rest239Toast = setTimeout(() => {
      el.classList.add("hidden"); el.style.background = anterior;
    }, 5000);
  }

  async function fb() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([a,u,fs]) => {
      if (!a.getApps().length) throw new Error("Firebase ainda não inicializado");
      const app = a.getApp();
      return { fs, db: fs.getFirestore(app), auth: u.getAuth(app) };
    }).catch(e => { fbPromise = null; throw e; });
    return fbPromise;
  }

  async function precosAtivos(db, fs) {
    if (!precosPromise) {
      precosPromise = fs.getDocs(fs.collection(db, "precosReferencia")).then(s =>
        s.docs.map(d => ({id:d.id,...d.data()})).filter(x => x.ativo !== false)
      ).catch(e => { precosPromise = null; throw e; });
    }
    return precosPromise;
  }

  function acharPreco(mov, precos) {
    const ref = refCanon(mov?.referencia);
    const proc = procCanon(mov?.processo || mov?.processoMovimentacao);
    if (!ref || !proc || proc === PROCESSO_COMPLETO) return null;
    const lista = (precos || []).filter(p =>
      p.ativo !== false && num(p.valor) > 0 &&
      refCanon(p.referencia) === ref &&
      procCanon(p.processo || p.servicoNome) === proc
    );
    if (!lista.length) return null;
    const s = norm(mov?.setor);
    return lista.find(p => norm(p.setor) === s) || lista[0];
  }

  function unitFonte(x) {
    if (!x) return 0;
    for (const v of [
      x.valorUnitario,
      x.valorUnitarioCalculadoSutiaCompleto,
      x.sutiaCompletoConferencia?.valorUnitarioCalculado,
      x.memoriaCalculoSutiaCompleto?.valorUnitarioFinal
    ]) if (num(v) > 0) return r4(v);
    const q = num(x.quantidade || x.quantidadeRecebida);
    if (q > 0) for (const t of [x.totalCalculadoSutiaCompleto, x.subtotal, x.total, x.valorTotal]) {
      if (num(t) > 0) return r4(num(t) / q);
    }
    return 0;
  }

  const cancelado = x => x?.excluido === true || x?.cancelado === true ||
    ["CANCELADO","CANCELADA","EXCLUIDO","EXCLUIDA","ESTORNADO","ESTORNADA"].includes(norm(x?.statusPagamento));
  const complementar = x => x?.pagamentoComplementarRestante === true || x?.origemRestantePagamento === true || norm(x?.origem) === "RESTANTE FACCAO";

  function escolherFonte(lista, mov) {
    const proc = procCanon(mov?.processo || mov?.processoMovimentacao);
    const fac = norm(mov?.destino || mov?.faccao);
    return (lista || []).filter(x => !cancelado(x) && !complementar(x) &&
      procCanon(x.processo || x.servicoNome || x.processoMovimentacao) === proc
    ).map(x => ({
      x, u: unitFonte(x),
      fac: !fac || !norm(x.faccao || x.destino) || norm(x.faccao || x.destino) === fac,
      oficial: !!(x.calculoSutiaCompletoVersao || x.memoriaCalculoSutiaCompleto)
    })).filter(x => x.u > 0).sort((a,b) =>
      Number(b.fac)-Number(a.fac) || Number(b.oficial)-Number(a.oficial)
    )[0] || null;
  }

  async function docData(db, fs, col, id) {
    if (!id) return null;
    const s = await fs.getDoc(fs.doc(db, col, String(id)));
    return s.exists() ? {id:s.id,...s.data()} : null;
  }

  async function fonteHistorica(mov, db, fs) {
    const proc = procCanon(mov?.processo || mov?.processoMovimentacao);
    const raizId = txt(mov?.movimentacaoRaizId || mov?.movimentacaoOrigemId);

    if (raizId) {
      const raiz = await docData(db, fs, "movimentacoesProducao", raizId).catch(() => null);
      const uRaiz = unitFonte(raiz);
      if (uRaiz > 0) return {
        tipo: proc === PROCESSO_COMPLETO ? "calculo_sutia_completo_movimentacao_original" : "valor_movimentacao_original",
        valorUnitario: uRaiz, fonteMovimentacaoId: raizId, fonteMovimentacao: raiz
      };
      try {
        const s = await fs.getDocs(fs.query(
          fs.collection(db,"entregasPagamento"), fs.where("movimentacaoId","==",raizId), fs.limit(12)
        ));
        const f = escolherFonte(s.docs.map(d => ({id:d.id,...d.data()})), mov);
        if (f) return {
          tipo: proc === PROCESSO_COMPLETO ? "calculo_sutia_completo_pagamento_original" : "valor_pagamento_original",
          valorUnitario:f.u, fontePagamentoId:f.x.id, fontePagamento:f.x, fonteMovimentacaoId:raizId, fonteMovimentacao:raiz
        };
      } catch (_) {}
    }

    if (mov?.opId) {
      try {
        const s = await fs.getDocs(fs.query(
          fs.collection(db,"entregasPagamento"), fs.where("opId","==",mov.opId), fs.limit(24)
        ));
        const f = escolherFonte(s.docs.map(d => ({id:d.id,...d.data()})), mov);
        if (f) return {
          tipo: proc === PROCESSO_COMPLETO ? "calculo_sutia_completo_pagamento_op" : "valor_pagamento_op",
          valorUnitario:f.u, fontePagamentoId:f.x.id, fontePagamento:f.x
        };
      } catch (_) {}
    }

    const op = txt(mov?.numeroOP);
    if (op) {
      const vals = [op];
      if (Number.isFinite(Number(op))) vals.push(Number(op));
      for (const v of [...new Set(vals)]) {
        try {
          const s = await fs.getDocs(fs.query(
            fs.collection(db,"entregasPagamento"), fs.where("numeroOP","==",v), fs.limit(24)
          ));
          const f = escolherFonte(s.docs.map(d => ({id:d.id,...d.data()})), mov);
          if (f) return {
            tipo: proc === PROCESSO_COMPLETO ? "calculo_sutia_completo_pagamento_op" : "valor_pagamento_op",
            valorUnitario:f.u, fontePagamentoId:f.x.id, fontePagamento:f.x
          };
        } catch (_) {}
      }
    }
    return null;
  }

  async function resolverValor(mov, db, fs) {
    const proc = procCanon(mov?.processo || mov?.processoMovimentacao);
    if (proc !== PROCESSO_COMPLETO) {
      const p = acharPreco(mov, await precosAtivos(db, fs));
      if (p) return { tipo:"preco_referencia_processo", valorUnitario:r4(p.valor), preco:p };
    }
    return await fonteHistorica(mov, db, fs);
  }

  function pendente(x) {
    return x && x.origemRestanteFaccao === true && x.excluido !== true && !x.dataChegada &&
      int(x.quantidadeEnviada || x.quantidadeRestantePendente || x.falta) > 0 &&
      ["RESTANTE_PENDENTE","PENDENTE"].includes(norm(x.status || x.restanteStatus || "restante_pendente"));
  }

  function camposSutia(x) {
    const out = {};
    for (const k of ["sutiaCompletoConferencia","fechoVeioPronto","pontoLuzVeioPronto","lateralProntaSutiaCompleto","bojoProntoSutiaCompleto"]) {
      if (x?.[k] !== undefined) out[k] = x[k];
    }
    return out;
  }

  function novoRestante({mov,id,q,seq,user,fs,data}) {
    const proc = procCanon(mov.processo || mov.processoMovimentacao);
    const s = mov.setor || setor(proc);
    return {
      id, origem:"restante_faccao", origemRestanteFaccao:true, origemManualPagamentos:false,
      tipoDestino:"faccao", tipoDestinoLabel:"Facção",
      movimentacaoOrigemId:mov.movimentacaoOrigemId || mov.id || "",
      movimentacaoRaizId:mov.movimentacaoRaizId || mov.movimentacaoOrigemId || mov.id || "",
      restanteSequencia:Math.max(1,Number(seq)||1), restantePendente:true, restanteStatus:"pendente",
      opId:mov.opId||"", numeroOP:mov.numeroOP||"", referencia:mov.referencia||"", cor:mov.cor||"",
      produtoNome:mov.produtoNome||"", setor:s, setorLabel:mov.setorLabel||labelSetor(s),
      destino:mov.destino||"", destinoId:mov.destinoId||"", processo:proc, processoMovimentacao:proc,
      quantidadeEnviada:q, quantidadeRecebida:0, quantidadeRestantePendente:q, falta:q,
      dataEnvio:mov.dataEnvio||"", dataGeracaoRestante:data||mov.dataChegada||hoje(), dataChegada:"",
      descontoDefeito:0, defeito:0, status:"restante_pendente", ...camposSutia(mov),
      observacoes:`Restante automático de ${q} peça(s) da OP ${mov.numeroOP||"-"}.`,
      criadoPor:user.uid, criadoEm:fs.serverTimestamp(), atualizadoPor:user.uid, atualizadoEm:fs.serverTimestamp(),
      versaoRestanteFaccao:VERSION
    };
  }

  function herdarCalculo(fonte, q, total, unit) {
    const x = fonte?.fontePagamento || fonte?.fonteMovimentacao;
    if (!x) return {};
    const out = {};
    for (const k of ["valorBaseSutiaCompleto","descontoSutiaCompletoLateral","descontoSutiaCompletoBojo",
      "descontoSutiaCompletoFecho","descontoSutiaCompletoPontoLuz","lateralPronta","lateralDescontada",
      "bojoPronto","bojoDescontado","fechoPronto","pontoLuzPronto","calculoSutiaCompletoVersao"]) {
      if (x[k] !== undefined) out[k] = x[k];
    }
    if (x.memoriaCalculoSutiaCompleto) out.memoriaCalculoSutiaCompleto = {
      ...x.memoriaCalculoSutiaCompleto, quantidade:q, valorUnitarioFinal:unit, totalFinal:total,
      origemRestante:true, versaoRestante:VERSION
    };
    return out;
  }

  function pagamento({mov,id,q,fonte,user,fs,obs}) {
    const proc = procCanon(mov.processo || mov.processoMovimentacao);
    const s = fonte?.preco?.setor || mov.setor || setor(proc);
    const unit = r4(fonte?.valorUnitario);
    const ok = unit > 0;
    const defeito = Math.max(0,num(mov.descontoDefeito ?? mov.defeito));
    const sub = ok ? r2(q*unit) : 0;
    const total = ok ? r2(Math.max(sub-defeito,0)) : 0;
    return {
      id, origem:"movimentacao", origemRestantePagamento:true, origemManualPagamentos:false,
      pagamentoManualFinanceiro:false, pagamentoComplementarRestante:true,
      movimentacaoId:mov.id, movimentacaoOrigemId:mov.movimentacaoOrigemId||"",
      movimentacaoRaizId:mov.movimentacaoRaizId||mov.movimentacaoOrigemId||"", pagamentoReenvio:true,
      opId:mov.opId||"", numeroOP:mov.numeroOP||"", referencia:mov.referencia||"", cor:mov.cor||"",
      produtoNome:mov.produtoNome||"", faccao:mov.destino||"",
      precoReferenciaId:fonte?.preco?.id || fonte?.fontePagamento?.precoReferenciaId || "",
      processo:proc, processoMovimentacao:proc,
      servicoId:fonte?.preco?.id || fonte?.fontePagamento?.servicoId || "", servicoNome:proc,
      setor:s, setorLabel:labelSetor(s), dataEntrega:mov.dataChegada||hoje(),
      quantidade:q, falta:int(mov.falta), descontoDefeito:defeito,
      valorUnitario:ok?unit:0, subtotal:sub, total,
      statusPagamento:ok?"pendente":"sem_valor", valorPendente:!ok,
      valorManualFinanceiroPendente:false, valorManualFinanceiro:false,
      valorTotalDefinidoManualmente:false, valorTotalManual:0,
      formaValorPagamento:ok?(fonte?.tipo||"calculo_automatico_restante"):"base_automatica_ausente",
      motivoValorPendente:ok?"":"base_automatica_restante_ausente",
      avisoPagamento:ok?"":`Não foi encontrada base automática para Ref. ${mov.referencia||"-"} + ${proc||"-"}.`,
      fontePagamentoRestanteId:fonte?.fontePagamentoId||"",
      fonteMovimentacaoRestanteId:fonte?.fonteMovimentacaoId||"",
      ...herdarCalculo(fonte,q,total,unit),
      observacoes:obs || (ok ? `Gerado automaticamente. Base: ${fonte?.tipo||"automática"}.` :
        "Aguardando porque não existe preço nem entrega original com valor calculado."),
      criadoPor:user.uid, criadoEm:fs.serverTimestamp(), atualizadoPor:user.uid, atualizadoEm:fs.serverTimestamp(),
      versaoGeracao:VERSION, versaoRegistro:VERSION
    };
  }

  function prepararModal() {
    const m = document.getElementById("modalReceberRestantePagamento");
    if (!m || m.classList.contains("hidden")) return;
    const v = document.getElementById("restPagValorTotal");
    if (v) { v.value=""; v.disabled=true; v.closest("label")?.classList.add("corponu-239-valor-manual-restante"); }
    const p = m.querySelector(".modal-header p");
    if (p) p.textContent = "O pagamento será calculado somente para este restante, sem varrer a aba.";
    preview();
  }

  function preview() {
    const el = document.getElementById("previewRestantePagamento");
    const inp = document.getElementById("restPagQuantidadeRecebida");
    if (!el || !inp) return;
    const max=int(inp.max||inp.value), q=int(inp.value), saldo=Math.max(max-q,0);
    el.innerHTML=`Recebidas agora: <strong>${q.toLocaleString("pt-BR")}</strong> peça(s).<br>`+
      (saldo?`Novo saldo restante: <strong>${saldo.toLocaleString("pt-BR")}</strong> peça(s).`:"O restante será concluído.")+
      `<br>Pagamento: <strong>cálculo pontual</strong>.`;
  }

  async function salvar(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (salvando) return;
    const id = selecionado;
    const q = int(document.getElementById("restPagQuantidadeRecebida")?.value);
    const data = document.getElementById("restPagDataChegada")?.value || "";
    const obs = document.getElementById("restPagObservacoes")?.value.trim() || "";
    const conf = document.getElementById("restPagConfirmacao")?.checked === true;
    const max = int(document.getElementById("restPagQuantidadeRecebida")?.max);
    if (!id) return aviso("Não consegui identificar o restante selecionado.",true);
    if (!q || !data || !conf) return aviso("Preencha e confira os campos obrigatórios.",true);
    if (max && q>max) return aviso("A quantidade recebida é maior que o saldo pendente.",true);

    const btn=document.getElementById("btnSalvarRestantePagamento"), old=btn?.textContent||"Salvar chegada complementar";
    salvando=true; if(btn){btn.disabled=true;btn.textContent="Calculando e salvando...";}
    try {
      const {auth,db,fs}=await fb(), user=auth.currentUser;
      if(!user) throw new Error("SEM_USUARIO");
      const ref=fs.doc(db,"movimentacoesProducao",id), snap=await fs.getDoc(ref);
      if(!snap.exists()) throw new Error("INEXISTENTE");
      const prev={id:snap.id,...snap.data()}, fonte=await resolverValor(prev,db,fs);

      const result=await fs.runTransaction(db,async tx=>{
        const pagId=`${id}-pagamento`.slice(0,190), pagRef=fs.doc(db,"entregasPagamento",pagId);
        const raizId=txt(prev.movimentacaoRaizId||prev.movimentacaoOrigemId);
        const raizRef=raizId?fs.doc(db,"movimentacoesProducao",raizId):null;
        const reads=[tx.get(ref),tx.get(pagRef)]; if(raizRef) reads.push(tx.get(raizRef));
        const rs=await Promise.all(reads), r=rs[0], p=rs[1], raiz=raizRef?rs[2]:null;
        if(!r.exists()) throw new Error("INEXISTENTE");
        const atual={id:r.id,...r.data()};
        if(!pendente(atual)) throw new Error("CONCLUIDO");
        if(p.exists() && p.data()?.excluido!==true) throw new Error("DUPLICADO");
        const qtd=int(atual.quantidadeEnviada||atual.quantidadeRestantePendente||atual.falta);
        if(q>qtd) throw new Error("QUANTIDADE");
        const saldo=qtd-q, seq=Math.max(1,Number(atual.restanteSequencia)||1)+1;
        const raizAtual=atual.movimentacaoRaizId||atual.movimentacaoOrigemId||atual.id;
        const prox=saldo?`${slug(raizAtual)}-restante-${seq}`.slice(0,190):"";
        const patch={dataChegada:data,quantidadeRecebida:q,falta:saldo,quantidadeRestantePendente:saldo,
          restantePendente:false,restanteStatus:saldo?"entrega_parcial":"concluido",status:saldo?"retornou_parcial":"retornou",
          chegadaComplementar:true,observacaoChegada:obs,proximoRestanteMovimentacaoId:prox,
          atualizadoPor:user.uid,atualizadoEm:fs.serverTimestamp(),versaoRestanteFaccao:VERSION};
        tx.set(ref,patch,{merge:true});
        if(saldo) tx.set(fs.doc(db,"movimentacoesProducao",prox),novoRestante({
          mov:{...atual,...patch,id:atual.id,movimentacaoRaizId:raizAtual,dataChegada:"",quantidadeRecebida:0,
            falta:saldo,quantidadeRestantePendente:saldo,restantePendente:true,restanteStatus:"pendente",status:"restante_pendente"},
          id:prox,q:saldo,seq,user,fs,data
        }),{merge:false});
        if(raizRef && raiz?.exists()) tx.set(raizRef,{temRestantePendente:!!saldo,quantidadeRestantePendente:saldo,
          restanteStatus:saldo?"pendente":"concluido",restanteMovimentacaoAtualId:prox,restanteAtualizadoPor:user.uid,
          restanteAtualizadoEm:fs.serverTimestamp(),versaoRestanteFaccao:VERSION},{merge:true});
        const movPag={...atual,...patch,id:atual.id,dataChegada:data,quantidadeRecebida:q,falta:saldo};
        const pag=pagamento({mov:movPag,id:pagId,q,fonte,user,fs,obs});
        tx.set(pagRef,pag,{merge:false});
        const log=fs.doc(fs.collection(db,"logsAlteracoes"));
        tx.set(log,{acao:"chegada_complementar_restante_pontual",entidade:"movimentacaoProducao",entidadeId:atual.id,
          detalhes:`OP ${atual.numeroOP||"-"} | ${procCanon(atual.processo||"-")} | recebido ${q} | saldo ${saldo} | ${fonte?.valorUnitario>0?`valor ${moeda(pag.total)} via ${fonte.tipo}`:"sem base automática"}`,
          usuarioId:user.uid,usuarioEmail:user.email||"",criadoEm:fs.serverTimestamp(),versao:VERSION});
        return {saldo,ok:num(fonte?.valorUnitario)>0,total:num(pag.total)};
      });

      document.getElementById("modalReceberRestantePagamento")?.classList.add("hidden");
      selecionado="";
      aviso(result.ok ? `Chegada salva e pagamento de ${moeda(result.total)} calculado automaticamente.` :
        "Chegada salva, mas não encontrei preço nem entrega original com valor calculado.", !result.ok);
      setTimeout(()=>document.getElementById("btnAtualizarRestantesPagamento")?.click(),100);
    } catch(e) {
      console.error("[CorpoNu 239] Erro ao receber restante.",e);
      const m={SEM_USUARIO:"Sua sessão ainda não está pronta.",INEXISTENTE:"O restante não existe mais.",
        CONCLUIDO:"Esse restante já foi recebido ou concluído.",DUPLICADO:"Já existe pagamento para esta entrega.",
        QUANTIDADE:"A quantidade informada é maior que o saldo atual."};
      aviso(m[e?.message]||"Não foi possível salvar. Nenhuma alteração foi gravada.",true);
    } finally {
      salvando=false; if(btn){btn.disabled=false;btn.textContent=old;}
    }
  }

  function iniciar() {
    document.addEventListener("click",e=>{
      const b=e.target?.closest?.("[data-receber-restante-pagamento]");
      if(!b) return; selecionado=txt(b.dataset.receberRestantePagamento); setTimeout(prepararModal,0); setTimeout(prepararModal,80);
    },true);
    document.addEventListener("submit",e=>{ if(e.target?.id===FORM) salvar(e); },true);
    document.addEventListener("input",e=>{ if(e.target?.id==="restPagQuantidadeRecebida") setTimeout(preview,0); },true);
    console.info(`[CorpoNu] Restantes pontual ativo: ${VERSION}`);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
  else iniciar();

  window.CorpoNuRestantes239=Object.freeze({versao:VERSION,refCanon,procCanon,unitFonte,acharPreco});
})();
(() => {
  "use strict";

  if (window.__CORPONU_V2_FIREBASE_BRIDGE__) return;
  window.__CORPONU_V2_FIREBASE_BRIDGE__ = true;

  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("v2firebase") !== "1") return;

  const modoEscrita = String(parametros.get("v2write") || "").trim().toLowerCase();
  const escritaCompleta = modoEscrita === "1";
  const escritaOrdensManejo = modoEscrita === "ordens-manejo";
  const escritaLiberada = escritaCompleta || escritaOrdensManejo;
  const COLECOES_ORDENS_MANEJO = new Set(["ordensProducao", "movimentacoesProducao"]);
  const FIREBASE_VERSION = "10.12.5";
  const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

  const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function esperar(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  async function esperarAppFirebase(appSdk, tentativas = 120) {
    for (let i = 0; i < tentativas; i += 1) {
      const apps = appSdk.getApps();
      if (apps.length) return apps[0];
      await esperar(100);
    }
    throw new Error("O Firebase principal do Corpo Nu não foi inicializado a tempo.");
  }

  function criarApiFirestore(firestoreSdk) {
    const totais = { getDoc: 0, getDocs: 0, documentos: 0 };

    const bloqueada = () => {
      throw new Error("ESCRITA_V2_BLOQUEADA_NESTA_ETAPA");
    };

    const caminhoRef = ref => String(ref?.path || ref?._key?.path?.canonicalString?.() || "");
    const colecaoRaiz = ref => caminhoRef(ref).split("/").filter(Boolean)[0] || "";

    function exigirColecaoPermitida(ref) {
      if (escritaCompleta) return;
      const colecao = colecaoRaiz(ref);
      if (!escritaOrdensManejo || !COLECOES_ORDENS_MANEJO.has(colecao)) {
        throw new Error(`ESCRITA_V2_BLOQUEADA_NESTA_ETAPA: ${colecao || "coleção desconhecida"}`);
      }
    }

    function confirmarGravacao(descricao) {
      if (escritaCompleta) return;
      if (!escritaOrdensManejo) return bloqueada();
      const resposta = window.prompt(
        `ATENÇÃO: esta ação vai gravar no Firebase REAL.\n\n${descricao}\n\nDigite GRAVAR para confirmar:`,
        ""
      );
      if (String(resposta || "").trim().toUpperCase() !== "GRAVAR") {
        throw new Error("GRAVACAO_REAL_CANCELADA_PELO_USUARIO");
      }
    }

    async function getDocMetricado(ref) {
      const snapshot = await firestoreSdk.getDoc(ref);
      totais.getDoc += 1;
      if (snapshot?.exists?.()) totais.documentos += 1;
      return snapshot;
    }

    async function getDocsMetricado(ref) {
      const snapshot = await firestoreSdk.getDocs(ref);
      totais.getDocs += 1;
      totais.documentos += Number(snapshot?.size ?? snapshot?.docs?.length ?? 0) || 0;
      return snapshot;
    }

    const snapshotMetricas = () => ({ ...totais });

    async function medir(_etapa, acao) {
      const antes = snapshotMetricas();
      try {
        const resultado = await acao();
        const depois = snapshotMetricas();
        return {
          resultado,
          leituras: {
            getDoc: depois.getDoc - antes.getDoc,
            getDocs: depois.getDocs - antes.getDocs,
            documentos: depois.documentos - antes.documentos
          }
        };
      } catch (error) {
        const depois = snapshotMetricas();
        error.leituras = {
          getDoc: depois.getDoc - antes.getDoc,
          getDocs: depois.getDocs - antes.getDocs,
          documentos: depois.documentos - antes.documentos
        };
        throw error;
      }
    }

    async function setDocControlado(ref, dados, opcoes) {
      exigirColecaoPermitida(ref);
      confirmarGravacao(`Destino: ${caminhoRef(ref)}`);
      return firestoreSdk.setDoc(ref, dados, opcoes);
    }

    function writeBatchControlado(db) {
      if (escritaCompleta) return firestoreSdk.writeBatch(db);
      if (!escritaOrdensManejo) return bloqueada();
      const real = firestoreSdk.writeBatch(db);
      const destinos = [];
      const proxy = {
        set(ref, dados, opcoes) {
          exigirColecaoPermitida(ref);
          destinos.push(caminhoRef(ref));
          real.set(ref, dados, opcoes);
          return proxy;
        },
        update(ref, ...args) {
          exigirColecaoPermitida(ref);
          destinos.push(caminhoRef(ref));
          real.update(ref, ...args);
          return proxy;
        },
        delete(ref) {
          exigirColecaoPermitida(ref);
          destinos.push(caminhoRef(ref));
          real.delete(ref);
          return proxy;
        },
        async commit() {
          confirmarGravacao(`Operação em lote:\n${[...new Set(destinos)].join("\n")}`);
          return real.commit();
        }
      };
      return proxy;
    }

    return {
      fs: {
        collection: firestoreSdk.collection,
        query: firestoreSdk.query,
        where: firestoreSdk.where,
        orderBy: firestoreSdk.orderBy,
        documentId: firestoreSdk.documentId,
        limit: firestoreSdk.limit,
        startAfter: firestoreSdk.startAfter,
        doc: firestoreSdk.doc,
        getDoc: getDocMetricado,
        getDocs: getDocsMetricado,
        serverTimestamp: firestoreSdk.serverTimestamp,
        deleteField: firestoreSdk.deleteField,
        setDoc: escritaCompleta ? firestoreSdk.setDoc : (escritaOrdensManejo ? setDocControlado : bloqueada),
        updateDoc: escritaCompleta ? firestoreSdk.updateDoc : bloqueada,
        deleteDoc: escritaCompleta ? firestoreSdk.deleteDoc : bloqueada,
        writeBatch: escritaCompleta ? firestoreSdk.writeBatch : (escritaOrdensManejo ? writeBatchControlado : bloqueada),
        runTransaction: escritaCompleta ? firestoreSdk.runTransaction : bloqueada
      },
      medir,
      totais: snapshotMetricas
    };
  }

  function usuarioParaV2(usuario, perfil) {
    return {
      uid: usuario?.uid || "",
      email: usuario?.email || "",
      nome: perfil?.nome || usuario?.displayName || usuario?.email || "",
      tipo: perfil?.tipo || "",
      ativo: perfil?.ativo === true,
      permissoes: perfil?.permissoes || {}
    };
  }

  function criarShell({ usuario, perfil }) {
    const antigo = document.getElementById("corponuV2FirebaseLab");
    if (antigo) antigo.remove();

    const raiz = document.createElement("div");
    raiz.id = "corponuV2FirebaseLab";
    raiz.innerHTML = `
      <style>
        #corponuV2FirebaseLab{position:fixed;inset:0;z-index:2147483000;background:#f5f7fb;color:#172033;overflow:auto;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        #corponuV2FirebaseLab *{box-sizing:border-box}.v2fb-topo{position:sticky;top:0;z-index:4;background:#fff;border-bottom:1px solid #dfe4ec;padding:14px 18px}.v2fb-linha{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.v2fb-titulo{margin:0;font-size:20px}.v2fb-sub{margin:4px 0 0;color:#64748b;font-size:13px}.v2fb-badge{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:800;background:${escritaLiberada ? "#fee2e2;color:#991b1b" : "#dcfce7;color:#166534"}}.v2fb-tabs,.v2fb-acoes{display:flex;gap:8px;flex-wrap:wrap}.v2fb-tabs{margin-top:12px}.v2fb-tabs button,.v2fb-acoes button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 12px;cursor:pointer;font-weight:700}.v2fb-tabs button.ativo{background:#172033;color:#fff;border-color:#172033}.v2fb-corpo{max-width:1500px;margin:0 auto;padding:18px}.v2fb-aviso{padding:11px 13px;border-radius:10px;margin-bottom:14px;background:${escritaLiberada ? "#fff1f2;color:#9f1239;border:1px solid #fecdd3" : "#ecfdf5;color:#166534;border:1px solid #bbf7d0"};font-size:13px;font-weight:700}.v2fb-loading{padding:38px;text-align:center;color:#64748b}.v2fb-erro{padding:16px;border-radius:10px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;white-space:pre-wrap}.v2fb-diag-resumo{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin:0 0 14px}.v2fb-diag-num,.v2fb-diag-card{background:#fff;border:1px solid #dfe4ec;border-radius:12px;padding:12px}.v2fb-diag-num strong{display:block;font-size:22px}.v2fb-diag-num span,.v2fb-diag-card small{font-size:12px;color:#64748b}.v2fb-diag-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.v2fb-diag-card[data-nivel="ok"]{border-left:5px solid #16a34a}.v2fb-diag-card[data-nivel="aviso"]{border-left:5px solid #d97706}.v2fb-diag-card[data-nivel="erro"]{border-left:5px solid #dc2626}.v2fb-diag-card h4{margin:0 0 7px}.v2fb-diag-card p{margin:0 0 8px;color:#475569}.v2fb-diag-final{padding:12px 14px;border-radius:10px;margin-bottom:12px;font-weight:800}.v2fb-diag-final.ok{background:#dcfce7;color:#166534}.v2fb-diag-final.erro{background:#fee2e2;color:#991b1b}@media(max-width:900px){.v2fb-diag-resumo{grid-template-columns:repeat(2,minmax(120px,1fr))}}
      </style>
      <header class="v2fb-topo">
        <div class="v2fb-linha">
          <div><h2 class="v2fb-titulo">Corpo Nu Flow V2 · Firebase real</h2><p class="v2fb-sub">${escapar(perfil?.nome || usuario?.email || usuario?.uid || "Usuário")}</p></div>
          <div class="v2fb-acoes">
            <span class="v2fb-badge">${escritaCompleta ? "ESCRITA REAL LIBERADA" : escritaOrdensManejo ? "ESCRITA CONTROLADA · ORDENS + MANEJO" : "SOMENTE LEITURA"}</span>
            <button type="button" data-v2fb-mais-ops>Carregar mais OPs</button>
            <button type="button" data-v2fb-fechar>Fechar V2</button>
          </div>
        </div>
        <nav class="v2fb-tabs">
          <button type="button" data-v2fb-modulo="diagnostico">Diagnóstico</button>
          <button type="button" data-v2fb-modulo="ordens">Ordens</button>
          <button type="button" data-v2fb-modulo="manejo">Manejo</button>
          <button type="button" data-v2fb-modulo="faccoes">Facções</button>
          <button type="button" data-v2fb-modulo="fechamento">Fechamento</button>
          <button type="button" data-v2fb-modulo="pagamentos">Pagamentos</button>
        </nav>
      </header>
      <main class="v2fb-corpo">
        <div class="v2fb-aviso" data-v2fb-aviso>${escritaCompleta ? "ATENÇÃO: escrita real completa liberada." : escritaOrdensManejo ? "ESCRITA CONTROLADA: somente Ordens e Manejo podem gravar. Cada commit exige digitar GRAVAR. Facções, Chegada e Financeiro continuam bloqueados." : "Modo seguro: consultas usam o Firestore real e toda escrita está bloqueada."}</div>
        <div id="corponuV2FirebaseConteudo"><div class="v2fb-loading">Preparando V2…</div></div>
      </main>`;
    document.body.appendChild(raiz);
    return raiz;
  }

  function ehBotaoDeEscrita(botao) {
    if (!botao) return false;
    if (String(botao.type || "").toLowerCase() === "submit") return true;
    return /^(salvar|enviar|confirmar envio|confirmar chegada|informar chegada|reenviar|quitar|confirmar pagamentos|marcar.*pago)/i.test(String(botao.textContent || "").trim());
  }

  function instalarBloqueioInterface(conteudo, aviso, podeEscreverModulo) {
    if (escritaCompleta) return;
    const mensagem = () => escritaOrdensManejo
      ? "Escrita controlada: somente Ordens e Manejo podem gravar nesta etapa."
      : "Modo somente leitura: esta gravação está bloqueada.";

    conteudo.addEventListener("submit", event => {
      if (podeEscreverModulo()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      aviso.textContent = mensagem();
    }, true);

    conteudo.addEventListener("click", event => {
      const botao = event.target.closest?.("button");
      if (!ehBotaoDeEscrita(botao) || podeEscreverModulo()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      aviso.textContent = mensagem();
    }, true);
  }

  function renderizarDiagnostico(conteudo, diagnostico, totalMetricas, perfilLido = 1) {
    const resumo = diagnostico.resumo || {};
    const totalDocumentos = Number(resumo.documentosLidos || 0) + perfilLido;
    const totalChamadas = Number(resumo.chamadas || 0) + perfilLido;
    const cards = (diagnostico.etapas || []).map(etapa => `
      <article class="v2fb-diag-card" data-nivel="${escapar(etapa.nivel)}">
        <h4>${etapa.nivel === "ok" ? "✅" : etapa.nivel === "aviso" ? "⚠️" : "❌"} ${escapar(etapa.titulo)}</h4>
        <p>${escapar(etapa.mensagem)}</p>
        <small>${etapa.leituras.documentos} documentos · ${etapa.leituras.getDoc} getDoc · ${etapa.leituras.getDocs} getDocs</small>
        ${etapa.detalhes?.length ? `<ul>${etapa.detalhes.map(item => `<li>${escapar(item)}</li>`).join("")}</ul>` : ""}
      </article>`).join("");

    conteudo.innerHTML = `
      <div class="v2fb-diag-final ${diagnostico.ok ? "ok" : "erro"}">${diagnostico.ok ? "✅ Leitura real concluída sem erro crítico." : "❌ Há incompatibilidade crítica. Não avançar com escrita."}</div>
      <div class="v2fb-diag-resumo">
        <div class="v2fb-diag-num"><strong>${Number(resumo.ok || 0)}</strong><span>etapas OK</span></div>
        <div class="v2fb-diag-num"><strong>${Number(resumo.aviso || 0)}</strong><span>avisos</span></div>
        <div class="v2fb-diag-num"><strong>${Number(resumo.erro || 0)}</strong><span>erros críticos</span></div>
        <div class="v2fb-diag-num"><strong>${totalDocumentos}</strong><span>documentos lidos*</span></div>
        <div class="v2fb-diag-num"><strong>${totalChamadas}</strong><span>chamadas de leitura*</span></div>
      </div>
      <div class="v2fb-diag-grid">${cards}</div>
      <p class="v2fb-sub" style="margin-top:12px">* Inclui 1 leitura do perfil autenticado. Total acumulado da sessão: ${Number(totalMetricas.documentos || 0) + perfilLido} documentos.</p>`;
  }

  async function iniciar() {
    try {
      const [appSdk, authSdk, firestoreSdk, integracao, diagnosticoSdk] = await Promise.all([
        import(`${FIREBASE_BASE}/firebase-app.js`),
        import(`${FIREBASE_BASE}/firebase-auth.js`),
        import(`${FIREBASE_BASE}/firebase-firestore.js`),
        import("./v2/bootstrap/corpo-nu-flow-firebase.mjs"),
        import("./v2/diagnostico/firebase-readonly.mjs")
      ]);

      const app = await esperarAppFirebase(appSdk);
      const auth = authSdk.getAuth(app);
      const db = firestoreSdk.getFirestore(app);
      const usuario = await new Promise(resolve => {
        if (auth.currentUser) return resolve(auth.currentUser);
        const parar = authSdk.onAuthStateChanged(auth, atual => {
          if (!atual) return;
          parar();
          resolve(atual);
        });
      });

      const perfilSnap = await firestoreSdk.getDoc(firestoreSdk.doc(db, "usuarios", usuario.uid));
      if (!perfilSnap.exists()) throw new Error("Usuário autenticado sem perfil em usuarios.");
      const perfil = { id: perfilSnap.id, ...perfilSnap.data() };
      if (perfil.ativo !== true) throw new Error("O perfil do usuário está inativo.");

      const firestore = criarApiFirestore(firestoreSdk);
      const usuarioV2 = usuarioParaV2(usuario, perfil);
      const flow = integracao.criarCorpoNuFlowFirebaseV2({
        db,
        fs: firestore.fs,
        tamanhoPaginaOrdens: escritaLiberada ? 150 : 40,
        tamanhoPaginaFaccoes: escritaLiberada ? 80 : 30,
        obterUsuario: () => usuarioV2,
        obterPerfil: () => perfil
      });

      const shell = criarShell({ usuario, perfil });
      const conteudo = shell.querySelector("#corponuV2FirebaseConteudo");
      const aviso = shell.querySelector("[data-v2fb-aviso]");
      const botoesModulo = [...shell.querySelectorAll("[data-v2fb-modulo]")];
      const botaoMais = shell.querySelector("[data-v2fb-mais-ops]");
      let moduloAtual = "";
      let ultimoDiagnostico = null;

      instalarBloqueioInterface(
        conteudo,
        aviso,
        () => escritaCompleta || (escritaOrdensManejo && ["ordens", "manejo"].includes(moduloAtual))
      );

      async function montarDiagnostico() {
        moduloAtual = "diagnostico";
        flow.desmontar();
        botaoMais.hidden = true;
        conteudo.innerHTML = '<div class="v2fb-loading">Lendo uma amostra controlada do Firebase real…</div>';
        ultimoDiagnostico = await diagnosticoSdk.executarDiagnosticoFirebaseSomenteLeitura({
          contexto: flow.contexto,
          medir: firestore.medir,
          limiteOrdens: 40,
          limitePrecos: 20,
          limitePagamentos: 20
        });
        renderizarDiagnostico(conteudo, ultimoDiagnostico, firestore.totais());
      }

      async function montar(modulo) {
        botoesModulo.forEach(botao => botao.classList.toggle("ativo", botao.dataset.v2fbModulo === modulo));
        if (modulo === "diagnostico") {
          try { await montarDiagnostico(); }
          catch (error) { conteudo.innerHTML = `<div class="v2fb-erro">${escapar(error?.message || error)}</div>`; }
          return;
        }

        moduloAtual = modulo;
        botaoMais.hidden = !["ordens", "manejo"].includes(modulo);
        flow.desmontar();
        conteudo.innerHTML = '<div class="v2fb-loading">Carregando módulo…</div>';
        try {
          if (modulo === "ordens") await flow.montarOrdens(conteudo, { confirmarConversao: mensagem => window.confirm(mensagem) });
          else if (modulo === "manejo") await flow.montarManejo(conteudo);
          else if (modulo === "faccoes") await flow.montarFaccoes(conteudo, { confirmarAviso: mensagem => window.confirm(mensagem) });
          else if (modulo === "fechamento") await flow.montarFechamento(conteudo);
          else if (modulo === "pagamentos") await flow.montarPagamentos(conteudo, { confirmarQuitacao: mensagem => window.confirm(mensagem) });
        } catch (error) {
          console.error("[V2 Firebase] Falha ao montar módulo.", error);
          conteudo.innerHTML = `<div class="v2fb-erro">${escapar(error?.message || error)}</div>`;
        }
      }

      botoesModulo.forEach(botao => botao.addEventListener("click", () => montar(botao.dataset.v2fbModulo)));
      botaoMais.addEventListener("click", async () => {
        botaoMais.disabled = true;
        try {
          const itens = await flow.contexto.carregarMaisOrdens();
          botaoMais.textContent = itens.length ? `+ ${itens.length} OPs carregadas` : "Todas as OPs carregadas";
          if (itens.length && moduloAtual) await montar(moduloAtual);
        } catch (error) {
          window.alert(`Não foi possível carregar mais OPs: ${String(error?.message || error)}`);
        } finally {
          botaoMais.disabled = false;
        }
      });

      shell.querySelector("[data-v2fb-fechar]").addEventListener("click", () => {
        flow.desmontar();
        shell.remove();
      });

      await montar("diagnostico");
      window.__CORPONU_FLOW_V2_FIREBASE__ = flow;
      window.__CORPONU_FLOW_V2_DIAGNOSTICO__ = () => ultimoDiagnostico;
    } catch (error) {
      console.error("[V2 Firebase] Não foi possível iniciar a ponte.", error);
      const shell = criarShell({ usuario: null, perfil: null });
      shell.querySelector("#corponuV2FirebaseConteudo").innerHTML = `<div class="v2fb-erro">${escapar(error?.message || error)}</div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();

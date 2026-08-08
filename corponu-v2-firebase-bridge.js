(() => {
  "use strict";

  if (window.__CORPONU_V2_FIREBASE_BRIDGE__) return;
  window.__CORPONU_V2_FIREBASE_BRIDGE__ = true;

  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("v2firebase") !== "1") return;

  const escritaLiberada = parametros.get("v2write") === "1";
  const FIREBASE_VERSION = "10.12.5";
  const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

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
    const somenteLeitura = () => {
      throw new Error("HOMOLOGACAO_V2_SOMENTE_LEITURA: use &v2write=1 somente quando quiser gravar de propósito.");
    };

    return {
      collection: firestoreSdk.collection,
      query: firestoreSdk.query,
      where: firestoreSdk.where,
      orderBy: firestoreSdk.orderBy,
      documentId: firestoreSdk.documentId,
      limit: firestoreSdk.limit,
      startAfter: firestoreSdk.startAfter,
      doc: firestoreSdk.doc,
      getDoc: firestoreSdk.getDoc,
      getDocs: firestoreSdk.getDocs,
      serverTimestamp: firestoreSdk.serverTimestamp,
      deleteField: firestoreSdk.deleteField,
      setDoc: escritaLiberada ? firestoreSdk.setDoc : somenteLeitura,
      updateDoc: escritaLiberada ? firestoreSdk.updateDoc : somenteLeitura,
      deleteDoc: escritaLiberada ? firestoreSdk.deleteDoc : somenteLeitura,
      writeBatch: escritaLiberada ? firestoreSdk.writeBatch : somenteLeitura,
      runTransaction: escritaLiberada ? firestoreSdk.runTransaction : somenteLeitura
    };
  }

  function instalarEstilo() {
    if (document.getElementById("corponuV2FirebaseBridgeStyle")) return;
    const style = document.createElement("style");
    style.id = "corponuV2FirebaseBridgeStyle";
    style.textContent = `
      #corponuV2FirebaseLab{position:fixed;inset:0;z-index:2147483000;background:#f5f7fb;color:#172033;overflow:auto;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #corponuV2FirebaseLab *{box-sizing:border-box}
      .v2fb-topo{position:sticky;top:0;z-index:4;background:#fff;border-bottom:1px solid #dfe4ec;padding:14px 18px;box-shadow:0 3px 14px rgba(15,23,42,.08)}
      .v2fb-linha{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
      .v2fb-titulo{margin:0;font-size:20px}.v2fb-sub{margin:4px 0 0;color:#5b6575;font-size:13px}
      .v2fb-badge{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:800;background:${escritaLiberada ? "#fee2e2;color:#991b1b" : "#dcfce7;color:#166534"}}
      .v2fb-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v2fb-tabs button,.v2fb-acoes button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 12px;cursor:pointer;font-weight:700}
      .v2fb-tabs button.ativo{background:#172033;color:#fff;border-color:#172033}.v2fb-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .v2fb-corpo{max-width:1500px;margin:0 auto;padding:18px}.v2fb-aviso{padding:11px 13px;border-radius:10px;margin-bottom:14px;background:${escritaLiberada ? "#fff1f2;color:#9f1239;border:1px solid #fecdd3" : "#ecfdf5;color:#166534;border:1px solid #bbf7d0"};font-size:13px;font-weight:700}
      .v2fb-loading{padding:38px;text-align:center;color:#64748b}.v2fb-erro{padding:16px;border-radius:10px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;white-space:pre-wrap}
      #corponuV2FirebaseConteudo .hidden{display:none!important}
      @media(max-width:700px){.v2fb-corpo{padding:10px}.v2fb-topo{padding:10px}.v2fb-tabs button{flex:1 1 calc(50% - 8px)}}
    `;
    document.head.appendChild(style);
  }

  function criarShell({ usuario, perfil }) {
    instalarEstilo();
    document.getElementById("corponuV2FirebaseLab")?.remove();

    const raiz = document.createElement("div");
    raiz.id = "corponuV2FirebaseLab";
    raiz.innerHTML = `
      <header class="v2fb-topo">
        <div class="v2fb-linha">
          <div>
            <h2 class="v2fb-titulo">Corpo Nu Flow V2 · Firebase real</h2>
            <p class="v2fb-sub">${String(perfil?.nome || usuario?.email || usuario?.uid || "Usuário")}</p>
          </div>
          <div class="v2fb-acoes">
            <span class="v2fb-badge">${escritaLiberada ? "ESCRITA REAL LIBERADA" : "SOMENTE LEITURA"}</span>
            <button type="button" data-v2fb-mais-ops>Carregar mais OPs</button>
            <button type="button" data-v2fb-fechar>Fechar V2</button>
          </div>
        </div>
        <nav class="v2fb-tabs" aria-label="Módulos V2 Firebase">
          <button type="button" data-v2fb-modulo="ordens">Ordens</button>
          <button type="button" data-v2fb-modulo="manejo">Manejo</button>
          <button type="button" data-v2fb-modulo="faccoes">Facções</button>
          <button type="button" data-v2fb-modulo="fechamento">Fechamento</button>
          <button type="button" data-v2fb-modulo="pagamentos">Pagamentos</button>
        </nav>
      </header>
      <main class="v2fb-corpo">
        <div class="v2fb-aviso">
          ${escritaLiberada
            ? "ATENÇÃO: este modo grava no Firestore real. Use somente em validação intencional."
            : "Modo seguro: consultas usam o Firestore real, mas qualquer tentativa de gravação é bloqueada no navegador."}
        </div>
        <div id="corponuV2FirebaseConteudo"><div class="v2fb-loading">Preparando V2…</div></div>
      </main>
    `;
    document.body.appendChild(raiz);
    return raiz;
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

  async function iniciar() {
    try {
      const [appSdk, authSdk, firestoreSdk, integracao] = await Promise.all([
        import(`${FIREBASE_BASE}/firebase-app.js`),
        import(`${FIREBASE_BASE}/firebase-auth.js`),
        import(`${FIREBASE_BASE}/firebase-firestore.js`),
        import("./v2/bootstrap/corpo-nu-flow-firebase.mjs")
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

      const usuarioV2 = usuarioParaV2(usuario, perfil);
      const fs = criarApiFirestore(firestoreSdk);
      const flow = integracao.criarCorpoNuFlowFirebaseV2({
        db,
        fs,
        tamanhoPaginaOrdens: 150,
        tamanhoPaginaFaccoes: 80,
        obterUsuario: () => usuarioV2,
        obterPerfil: () => perfil
      });

      const shell = criarShell({ usuario, perfil });
      const conteudo = shell.querySelector("#corponuV2FirebaseConteudo");
      const botoesModulo = [...shell.querySelectorAll("[data-v2fb-modulo]")];
      const botaoMais = shell.querySelector("[data-v2fb-mais-ops]");
      let moduloAtual = "";

      async function montar(modulo) {
        moduloAtual = modulo;
        botoesModulo.forEach(botao => botao.classList.toggle("ativo", botao.dataset.v2fbModulo === modulo));
        botaoMais.hidden = !["ordens", "manejo"].includes(modulo);
        flow.desmontar();
        conteudo.innerHTML = '<div class="v2fb-loading">Carregando módulo…</div>';

        try {
          if (modulo === "ordens") {
            await flow.montarOrdens(conteudo, {
              confirmarConversao: mensagem => window.confirm(mensagem)
            });
          } else if (modulo === "manejo") {
            await flow.montarManejo(conteudo);
          } else if (modulo === "faccoes") {
            await flow.montarFaccoes(conteudo, {
              confirmarAviso: mensagem => window.confirm(mensagem)
            });
          } else if (modulo === "fechamento") {
            await flow.montarFechamento(conteudo);
          } else if (modulo === "pagamentos") {
            await flow.montarPagamentos(conteudo, {
              confirmarQuitacao: mensagem => window.confirm(mensagem)
            });
          }
        } catch (error) {
          console.error("[V2 Firebase] Falha ao montar módulo.", error);
          conteudo.innerHTML = `<div class="v2fb-erro">${String(error?.message || error)}</div>`;
        }
      }

      botoesModulo.forEach(botao => {
        botao.addEventListener("click", () => montar(botao.dataset.v2fbModulo));
      });

      botaoMais.addEventListener("click", async () => {
        botaoMais.disabled = true;
        const anterior = botaoMais.textContent;
        botaoMais.textContent = "Carregando…";
        try {
          const itens = await flow.contexto.carregarMaisOrdens();
          botaoMais.textContent = itens.length ? `+ ${itens.length} OPs carregadas` : "Todas as OPs carregadas";
          if (itens.length && moduloAtual) await montar(moduloAtual);
        } catch (error) {
          console.error("[V2 Firebase] Falha ao carregar mais OPs.", error);
          window.alert(`Não foi possível carregar mais OPs: ${String(error?.message || error)}`);
        } finally {
          window.setTimeout(() => {
            botaoMais.disabled = false;
            if (!flow.contexto.ordensConsultaRepo.acabou()) botaoMais.textContent = anterior;
          }, 900);
        }
      });

      shell.querySelector("[data-v2fb-fechar]").addEventListener("click", () => {
        flow.desmontar();
        shell.remove();
      });

      await montar("ordens");
      window.__CORPONU_FLOW_V2_FIREBASE__ = flow;
    } catch (error) {
      console.error("[V2 Firebase] Não foi possível iniciar a ponte.", error);
      instalarEstilo();
      const shell = criarShell({ usuario: null, perfil: null });
      shell.querySelector("#corponuV2FirebaseConteudo").innerHTML = `<div class="v2fb-erro">${String(error?.message || error)}</div>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();

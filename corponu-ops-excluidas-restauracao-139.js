(() => {
  "use strict";

  const VERSION = "2026-08-06-ops-excluidas-restauracao-139";
  const FIREBASE_VERSION = "10.12.5";

  if (window.__CORPONU_OPS_EXCLUIDAS_RESTAURACAO_139__ === VERSION) return;
  window.__CORPONU_OPS_EXCLUIDAS_RESTAURACAO_139__ = VERSION;

  let firebasePromise = null;
  let perfilAtual = null;
  let ordensExcluidas = [];
  let carregando = false;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const escapeHtml = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function formatarDataHora(valor) {
    if (!valor) return "-";
    try {
      const data = typeof valor.toDate === "function" ? valor.toDate() : new Date(valor);
      if (Number.isNaN(data.getTime())) return "-";
      return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch (_) {
      return "-";
    }
  }

  function tipoPecaLabel(ordem) {
    const texto = normalizar([
      ordem?.tipoPeca,
      ordem?.tipoPecaPadrao,
      ordem?.tipoPecaLabel,
      ordem?.setor,
      ordem?.setorLabel,
      ordem?.processoPlanejado,
      ordem?.processo
    ].join(" "));
    return texto.includes("CALCINHA") ? "Calcinha" : "Sutiã";
  }

  function toast(mensagem, tipo = "info") {
    let el = document.getElementById("corponuOpsExcluidasToast139");
    if (!el) {
      el = document.createElement("div");
      el.id = "corponuOpsExcluidasToast139";
      Object.assign(el.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "100300",
        maxWidth: "470px",
        padding: "13px 16px",
        borderRadius: "12px",
        color: "#fff",
        font: "800 13px/1.45 Arial, sans-serif",
        boxShadow: "0 16px 40px rgba(0,0,0,.25)",
        opacity: "0",
        transform: "translateY(14px)",
        transition: ".2s ease",
        pointerEvents: "none"
      });
      document.body.appendChild(el);
    }
    el.style.background = tipo === "error" ? "#991b1b" : tipo === "success" ? "#166534" : "#173c69";
    el.textContent = mensagem;
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(14px)";
    }, 5200);
  }

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
    ]).then(([appModule, authModule, firestoreModule]) => {
      const apps = appModule.getApps();
      const app = apps.find(item => item.name === "[DEFAULT]") || apps[0] || appModule.getApp();
      return {
        ...firestoreModule,
        auth: authModule.getAuth(app),
        onAuthStateChanged: authModule.onAuthStateChanged,
        db: firestoreModule.getFirestore(app)
      };
    });
    return firebasePromise;
  }

  async function carregarPerfil(usuario) {
    if (!usuario) {
      perfilAtual = null;
      return null;
    }
    const fb = await firebase();
    try {
      const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", usuario.uid));
      perfilAtual = snap.exists() ? { uid: usuario.uid, ...snap.data() } : null;
    } catch (erro) {
      console.warn("[OPs excluídas 139] Não foi possível carregar o perfil.", erro);
      perfilAtual = null;
    }
    return perfilAtual;
  }

  function ehAdmin() {
    return perfilAtual?.tipo === "admin";
  }

  function injetarEstilos() {
    if (document.getElementById("corponuOpsExcluidasStyle139")) return;
    const style = document.createElement("style");
    style.id = "corponuOpsExcluidasStyle139";
    style.textContent = `
      #corponuOpsExcluidas139{margin-top:16px;border:1px solid #d8b4b4;background:linear-gradient(145deg,#fff,#fff8f8)}
      #corponuOpsExcluidas139 .corponu-lixeira-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #corponuOpsExcluidas139 .corponu-lixeira-head h3{margin:0 0 4px}
      #corponuOpsExcluidas139 .corponu-lixeira-head p{margin:0;color:#64748b}
      #corponuOpsExcluidas139 .corponu-lixeira-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0}
      #corponuOpsExcluidas139 .corponu-lixeira-tools input{min-width:260px;min-height:40px;border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;background:#fff}
      #corponuOpsExcluidas139 .corponu-lixeira-count{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 8px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:900;font-size:12px}
      #corponuOpsExcluidas139 table{width:100%}
      #corponuOpsExcluidas139 .corponu-restaurar-op{white-space:nowrap}
      #corponuOpsExcluidas139 .corponu-lixeira-note{margin-top:10px;font-size:12px;color:#64748b}
      #corponuOpsExcluidas139 .corponu-tipo-calcinha{color:#6d28d9;font-weight:900}
      #corponuOpsExcluidas139 .corponu-tipo-sutia{color:#1d4ed8;font-weight:900}
    `;
    document.head.appendChild(style);
  }

  function montarPainel() {
    if (!ehAdmin()) {
      document.getElementById("corponuOpsExcluidas139")?.remove();
      return;
    }
    if (document.getElementById("corponuOpsExcluidas139")) return;

    const pagina = document.getElementById("ordens");
    if (!pagina) return;

    injetarEstilos();
    const painel = document.createElement("div");
    painel.id = "corponuOpsExcluidas139";
    painel.className = "panel admin-only-block";
    painel.innerHTML = `
      <div class="corponu-lixeira-head">
        <div>
          <h3>OPs excluídas / Lixeira <span id="corponuOpsExcluidasCount139" class="corponu-lixeira-count">?</span></h3>
          <p>Restaure uma OP excluída sem recriar o documento e sem perder o histórico de quem excluiu.</p>
        </div>
        <button id="corponuCarregarOpsExcluidas139" class="btn btn-sm" type="button">Ver OPs excluídas</button>
      </div>
      <div id="corponuOpsExcluidasConteudo139" class="hidden">
        <div class="corponu-lixeira-tools">
          <input id="corponuBuscaOpsExcluidas139" type="text" placeholder="Buscar OP, referência, cor ou produto..." autocomplete="off" />
          <button id="corponuRecarregarOpsExcluidas139" class="btn btn-sm" type="button">Atualizar lixeira</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>OP</th><th>REF</th><th>Cor</th><th>Qtd.</th><th>Tipo</th><th>Excluída em</th><th>Ação</th>
              </tr>
            </thead>
            <tbody id="corponuListaOpsExcluidas139">
              <tr><td colspan="7" class="empty">Clique em “Ver OPs excluídas”.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="corponu-lixeira-note">A restauração mantém os campos <strong>excluidaPor</strong> e <strong>excluidaEm</strong> para auditoria e adiciona os dados de restauração.</div>
      </div>
    `;
    pagina.appendChild(painel);

    document.getElementById("corponuCarregarOpsExcluidas139")?.addEventListener("click", async () => {
      document.getElementById("corponuOpsExcluidasConteudo139")?.classList.remove("hidden");
      await carregarExcluidas(true);
    });
    document.getElementById("corponuRecarregarOpsExcluidas139")?.addEventListener("click", () => carregarExcluidas(true));
    document.getElementById("corponuBuscaOpsExcluidas139")?.addEventListener("input", renderizarExcluidas);
  }

  async function carregarExcluidas(forcar = false) {
    if (!ehAdmin() || carregando) return;
    if (ordensExcluidas.length && !forcar) {
      renderizarExcluidas();
      return;
    }

    carregando = true;
    const tbody = document.getElementById("corponuListaOpsExcluidas139");
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty">Carregando OPs excluídas...</td></tr>`;

    try {
      const fb = await firebase();
      const consulta = fb.query(
        fb.collection(fb.db, "ordensProducao"),
        fb.where("excluida", "==", true)
      );
      const snap = await fb.getDocs(consulta);
      ordensExcluidas = snap.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const ta = a.excluidaEm?.seconds || 0;
          const tb = b.excluidaEm?.seconds || 0;
          if (tb !== ta) return tb - ta;
          return String(a.numeroOP || a.id).localeCompare(String(b.numeroOP || b.id), "pt-BR", { numeric: true });
        });
      renderizarExcluidas();
    } catch (erro) {
      console.error("[OPs excluídas 139] Falha ao carregar lixeira.", erro);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty">Não foi possível carregar as OPs excluídas.</td></tr>`;
      toast("Não foi possível carregar a lixeira de OPs. Confira a permissão do administrador.", "error");
    } finally {
      carregando = false;
    }
  }

  function renderizarExcluidas() {
    const tbody = document.getElementById("corponuListaOpsExcluidas139");
    const contador = document.getElementById("corponuOpsExcluidasCount139");
    if (!tbody) return;

    if (contador) contador.textContent = String(ordensExcluidas.length);
    const busca = normalizar(document.getElementById("corponuBuscaOpsExcluidas139")?.value || "");
    const lista = ordensExcluidas.filter(ordem => {
      if (!busca) return true;
      return normalizar([
        ordem.numeroOP,
        ordem.numeroOPExterno,
        ordem.referencia,
        ordem.cor,
        ordem.produtoNome,
        tipoPecaLabel(ordem)
      ].join(" ")).includes(busca);
    });

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">${ordensExcluidas.length ? "Nenhuma OP excluída encontrada com essa busca." : "Nenhuma OP excluída no momento."}</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(ordem => {
      const tipo = tipoPecaLabel(ordem);
      const classeTipo = tipo === "Calcinha" ? "corponu-tipo-calcinha" : "corponu-tipo-sutia";
      return `
        <tr>
          <td><strong>${escapeHtml(ordem.numeroOP || ordem.numeroOPExterno || ordem.id)}</strong></td>
          <td><strong>${escapeHtml(ordem.referencia || "-")}</strong></td>
          <td>${escapeHtml(ordem.cor || "-")}</td>
          <td><strong>${Number(ordem.quantidade || 0).toLocaleString("pt-BR")}</strong></td>
          <td><span class="${classeTipo}">${escapeHtml(tipo)}</span></td>
          <td>${escapeHtml(formatarDataHora(ordem.excluidaEm))}</td>
          <td><button class="btn btn-sm btn-success corponu-restaurar-op" type="button" data-restaurar-op-id="${escapeHtml(ordem.id)}">Restaurar</button></td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("[data-restaurar-op-id]").forEach(botao => {
      botao.addEventListener("click", () => restaurarOP(botao.dataset.restaurarOpId, botao));
    });
  }

  function calcularEstadoRestaurado(ordem) {
    const local = normalizar(`${ordem?.localAtualMigracao || ""} ${ordem?.statusMigracaoLigia || ""} ${ordem?.relatorioMigracao || ""}`);
    const finalizada = local.includes("FINALIZADO") || local.includes("BIPADO") || local.includes("RELATORIO CELULAS");
    const cancelada = local.includes("CANCEL");

    const statusAnterior = String(ordem?.statusAntesExclusao || "").trim();
    const status = statusAnterior || (finalizada ? "finalizado" : cancelada ? "cancelada" : "aberta");

    let ocultarDoManejo;
    if (typeof ordem?.ocultarDoManejoAntesExclusao === "boolean") {
      ocultarDoManejo = ordem.ocultarDoManejoAntesExclusao;
    } else {
      ocultarDoManejo = finalizada || cancelada;
    }

    return { status, ocultarDoManejo };
  }

  async function registrarLogRestauracao(ordem, usuario) {
    try {
      const fb = await firebase();
      await fb.addDoc(fb.collection(fb.db, "logsAlteracoes"), {
        acao: "ordem_restaurada",
        tipoAlvo: "ordemProducao",
        alvoId: String(ordem.id || ""),
        detalhes: `OP ${ordem.numeroOP || ordem.numeroOPExterno || ordem.id} | Ref. ${ordem.referencia || "-"} | restaurada da lixeira`,
        usuarioUid: usuario?.uid || "",
        usuarioNome: perfilAtual?.nome || "",
        usuarioEmail: perfilAtual?.email || usuario?.email || "",
        usuarioTipo: perfilAtual?.tipo || "admin",
        criadoEm: fb.serverTimestamp()
      });
    } catch (erro) {
      console.warn("[OPs excluídas 139] Restauração concluída, mas o log não foi gravado.", erro);
    }
  }

  async function restaurarOP(id, botao) {
    if (!ehAdmin()) {
      toast("Apenas administradores podem restaurar OPs.", "error");
      return;
    }
    const ordem = ordensExcluidas.find(item => String(item.id) === String(id));
    if (!ordem) {
      toast("OP excluída não encontrada. Atualize a lixeira.", "error");
      return;
    }

    const numero = ordem.numeroOP || ordem.numeroOPExterno || ordem.id;
    const tipo = tipoPecaLabel(ordem);
    const confirmar = window.confirm(
      `Restaurar a OP ${numero}?\n\nReferência: ${ordem.referencia || "-"}\nTipo: ${tipo}\n\nO mesmo documento será reativado. O histórico da exclusão será preservado.`
    );
    if (!confirmar) return;

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Restaurando...";
    }

    try {
      const fb = await firebase();
      const usuario = fb.auth.currentUser;
      if (!usuario) throw new Error("Sessão expirada.");
      const perfil = await carregarPerfil(usuario);
      if (perfil?.tipo !== "admin") throw new Error("Apenas administradores podem restaurar OPs.");

      const { status, ocultarDoManejo } = calcularEstadoRestaurado(ordem);
      await fb.setDoc(fb.doc(fb.db, "ordensProducao", ordem.id), {
        excluida: false,
        status,
        ocultarDoManejo,
        exclusaoRestaurada: true,
        restauradaPor: usuario.uid,
        restauradaEm: fb.serverTimestamp(),
        restauradaVersao: VERSION,
        atualizadoPor: usuario.uid,
        atualizadoEm: fb.serverTimestamp()
      }, { merge: true });

      await registrarLogRestauracao(ordem, usuario);
      ordensExcluidas = ordensExcluidas.filter(item => item.id !== ordem.id);
      renderizarExcluidas();

      toast(`OP ${numero} restaurada com sucesso em ${tipo}.`, "success");
      setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 250);
      setTimeout(() => {
        if (tipo === "Calcinha") {
          document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]')?.click();
        }
        const busca = document.getElementById("buscaOrdem");
        if (busca) {
          busca.value = String(numero);
          busca.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, 800);
    } catch (erro) {
      console.error("[OPs excluídas 139] Falha ao restaurar OP.", erro);
      toast(erro?.message || "Não foi possível restaurar a OP.", "error");
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Restaurar";
      }
    }
  }

  async function iniciar() {
    try {
      const fb = await firebase();
      fb.onAuthStateChanged(fb.auth, async usuario => {
        ordensExcluidas = [];
        await carregarPerfil(usuario);
        if (!usuario || !ehAdmin()) {
          document.getElementById("corponuOpsExcluidas139")?.remove();
          return;
        }
        montarPainel();
      });

      // A página pode ser montada antes/depois do listener de autenticação.
      const observer = new MutationObserver(() => {
        if (ehAdmin() && document.getElementById("ordens") && !document.getElementById("corponuOpsExcluidas139")) {
          montarPainel();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (erro) {
      console.error("[OPs excluídas 139] Não foi possível iniciar a lixeira.", erro);
    }
  }

  iniciar();
})();

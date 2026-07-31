(() => {
  "use strict";

  const VERSION = "2026-07-31-revisao-responsaveis-50";
  const FB = "10.12.5";

  if (window.__CORPONU_REVISAO_RESPONSAVEIS__ === VERSION) return;
  window.__CORPONU_REVISAO_RESPONSAVEIS__ = VERSION;

  let contextoPromise = null;
  let opCarregada = null;
  let carregando = false;
  let ultimoNumero = "";

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();

  function toast(mensagem) {
    const principal = document.getElementById("toast");
    if (principal) {
      principal.textContent = mensagem;
      principal.classList.remove("hidden");
      window.clearTimeout(window.__revRespToast50);
      window.__revRespToast50 = window.setTimeout(() => principal.classList.add("hidden"), 6000);
      return;
    }
    window.alert(mensagem);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([appModulo, authModulo, fs]) => {
      if (!appModulo.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const app = appModulo.getApp();
      return {
        auth: authModulo.getAuth(app),
        db: fs.getFirestore(app),
        fs
      };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  function injetarEstilos() {
    if (document.getElementById("styleRevisaoResponsaveis50")) return;
    const style = document.createElement("style");
    style.id = "styleRevisaoResponsaveis50";
    style.textContent = `
      #revisaoComponentes .rev-opcao.rev-com-responsavel-50{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start}
      #revisaoComponentes .rev-responsavel-50{grid-column:1/-1;margin-top:10px;padding-top:11px;border-top:1px solid #e2e8f0}
      #revisaoComponentes .rev-responsavel-50 label{display:block;margin:0;color:#334155;font-size:12px;font-weight:900}
      #revisaoComponentes .rev-responsavel-50 input{width:100%;min-height:42px;margin-top:6px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:700 13px/1.3 inherit;box-sizing:border-box}
      #revisaoComponentes .rev-responsavel-50 input:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12)}
      #revisaoComponentes .rev-responsavel-50.desabilitado{opacity:.55}
      #revisaoComponentes .rev-responsavel-50 small{display:block;margin-top:5px;color:#64748b;font-size:10px;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function criarCampo(tipo) {
    const checkbox = document.getElementById(tipo === "lateral" ? "revLateral" : "revBojo");
    const card = checkbox?.closest(".rev-opcao");
    if (!checkbox || !card) return null;

    const id = tipo === "lateral" ? "revLateralQuemFez" : "revBojoQuemFez";
    let input = document.getElementById(id);
    if (input) return input;

    card.classList.add("rev-com-responsavel-50");
    const bloco = document.createElement("div");
    bloco.className = "rev-responsavel-50 desabilitado";
    bloco.dataset.responsavelComponente = tipo;
    const titulo = tipo === "lateral" ? "Quem fez a lateral?" : "Quem fez o bojo?";
    bloco.innerHTML = `
      <label for="${id}">${titulo}</label>
      <input id="${id}" type="text" maxlength="120" autocomplete="off" placeholder="Digite o nome da pessoa ou equipe">
      <small>Esta informação ficará registrada junto à OP.</small>
    `;
    card.appendChild(bloco);
    input = bloco.querySelector("input");
    return input;
  }

  function sincronizarCampo(tipo) {
    const checkbox = document.getElementById(tipo === "lateral" ? "revLateral" : "revBojo");
    const input = document.getElementById(tipo === "lateral" ? "revLateralQuemFez" : "revBojoQuemFez");
    const bloco = input?.closest(".rev-responsavel-50");
    if (!checkbox || !input || !bloco) return;

    const ativo = checkbox.checked;
    input.disabled = !ativo;
    input.required = ativo;
    bloco.classList.toggle("desabilitado", !ativo);
    input.setAttribute("aria-required", ativo ? "true" : "false");
  }

  function garantirCampos() {
    injetarEstilos();
    const lateral = criarCampo("lateral");
    const bojo = criarCampo("bojo");
    if (!lateral || !bojo) return false;
    sincronizarCampo("lateral");
    sincronizarCampo("bojo");
    return true;
  }

  function dadosResponsaveis(op) {
    const revisao = op?.revisaoComponentesConfeccao || {};
    return {
      lateral: texto(
        revisao.lateralFeitaPorNome ||
        revisao.lateralResponsavel ||
        revisao.quemFezLateral ||
        op?.lateralFeitaPorNome ||
        op?.revisaoLateralFeitaPor
      ),
      bojo: texto(
        revisao.bojoFeitoPorNome ||
        revisao.bojoResponsavel ||
        revisao.quemFezBojo ||
        op?.bojoEncapadoPorNome ||
        op?.revisaoBojoFeitoPor
      )
    };
  }

  function millis(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
  }

  async function buscarOpAtual() {
    if (carregando) return;
    if (!garantirCampos()) return;
    const numero = texto(document.getElementById("revNumeroOP")?.value);
    const api = window.CorpoNuRevisaoComponentes;
    if (!numero || typeof api?.buscarOP !== "function") return;

    carregando = true;
    try {
      const op = await api.buscarOP(numero);
      if (!op) return;
      ultimoNumero = numero;
      const revisao = op.revisaoComponentesConfeccao || {};
      opCarregada = {
        id: op.id,
        numero,
        atualizadoEm: millis(revisao.atualizadoEm || revisao.criadoEm)
      };
      const responsaveis = dadosResponsaveis(op);
      const lateral = document.getElementById("revLateralQuemFez");
      const bojo = document.getElementById("revBojoQuemFez");
      if (lateral) lateral.value = responsaveis.lateral;
      if (bojo) bojo.value = responsaveis.bojo;
      sincronizarCampo("lateral");
      sincronizarCampo("bojo");
    } catch (error) {
      console.warn("Não foi possível carregar os responsáveis da revisão.", error);
    } finally {
      carregando = false;
    }
  }

  function limparResponsaveis() {
    opCarregada = null;
    ultimoNumero = "";
    const lateral = document.getElementById("revLateralQuemFez");
    const bojo = document.getElementById("revBojoQuemFez");
    if (lateral) lateral.value = "";
    if (bojo) bojo.value = "";
    sincronizarCampo("lateral");
    sincronizarCampo("bojo");
  }

  function validarFormulario() {
    const lateralMarcada = document.getElementById("revLateral")?.checked === true;
    const bojoMarcado = document.getElementById("revBojo")?.checked === true;
    const lateralQuem = texto(document.getElementById("revLateralQuemFez")?.value);
    const bojoQuem = texto(document.getElementById("revBojoQuemFez")?.value);

    if (lateralMarcada && !lateralQuem) {
      document.getElementById("revLateralQuemFez")?.focus();
      toast("Informe quem fez a lateral.");
      return null;
    }
    if (bojoMarcado && !bojoQuem) {
      document.getElementById("revBojoQuemFez")?.focus();
      toast("Informe quem fez o bojo.");
      return null;
    }

    return {
      numero: texto(document.getElementById("revNumeroOP")?.value),
      lateralMarcada,
      bojoMarcado,
      lateralQuem: lateralMarcada ? lateralQuem : "",
      bojoQuem: bojoMarcado ? bojoQuem : "",
      revisaoAnteriorEm: opCarregada?.atualizadoEm || 0,
      iniciadoEm: Date.now()
    };
  }

  async function registrarLog(ctx, usuario, opId, numero, dados) {
    try {
      await ctx.fs.addDoc(ctx.fs.collection(ctx.db, "logsAlteracoes"), {
        acao: "responsaveis_revisao_lateral_bojo_atualizados",
        entidade: "ordemProducao",
        entidadeId: opId,
        tipoAlvo: "ordemProducao",
        alvoId: opId,
        detalhes: `OP ${numero} | lateral: ${dados.lateralQuem || "não marcada"} | bojo: ${dados.bojoQuem || "não marcado"}`,
        usuarioId: usuario.uid,
        usuarioUid: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoPor: usuario.uid,
        criadoEm: ctx.fs.serverTimestamp(),
        versao: VERSION
      });
    } catch (error) {
      console.warn("Responsáveis salvos, mas o log complementar não foi criado.", error);
    }
  }

  async function salvarQuandoRevisaoConcluir(dados) {
    if (!dados?.numero) return;
    const api = window.CorpoNuRevisaoComponentes;
    if (typeof api?.buscarOP !== "function") return;

    for (let tentativa = 0; tentativa < 18; tentativa += 1) {
      await new Promise(resolve => setTimeout(resolve, tentativa === 0 ? 650 : 350));
      try {
        const op = await api.buscarOP(dados.numero);
        if (!op?.id) continue;
        const revisao = op.revisaoComponentesConfeccao || {};
        const estadoConfere = revisao.ativa === true &&
          revisao.lateralFeita === dados.lateralMarcada &&
          revisao.bojoFeito === dados.bojoMarcado;
        const atualizadoEm = millis(revisao.atualizadoEm || revisao.criadoEm);
        const atualizacaoDaAcao = atualizadoEm >= dados.iniciadoEm - 1500;
        if (!estadoConfere || !atualizacaoDaAcao) continue;

        const ctx = await contexto();
        const usuario = ctx.auth.currentUser;
        if (!usuario) return;
        const agora = ctx.fs.serverTimestamp();
        const opRef = ctx.fs.doc(ctx.db, "ordensProducao", op.id);
        await ctx.fs.updateDoc(opRef, {
          "revisaoComponentesConfeccao.lateralFeitaPorNome": dados.lateralQuem,
          "revisaoComponentesConfeccao.bojoFeitoPorNome": dados.bojoQuem,
          "revisaoComponentesConfeccao.lateralResponsavel": dados.lateralQuem,
          "revisaoComponentesConfeccao.bojoResponsavel": dados.bojoQuem,
          "revisaoComponentesConfeccao.responsaveisAtualizadosPor": usuario.uid,
          "revisaoComponentesConfeccao.responsaveisAtualizadosEm": agora,
          "revisaoComponentesConfeccao.responsaveisVersao": VERSION,
          revisaoLateralFeitaPor: dados.lateralQuem,
          revisaoBojoFeitoPor: dados.bojoQuem,
          revisaoResponsaveisAtualizadosPor: usuario.uid,
          revisaoResponsaveisAtualizadosEm: agora
        });
        await registrarLog(ctx, usuario, op.id, dados.numero, dados);
        opCarregada = {
          id: op.id,
          numero: dados.numero,
          atualizadoEm: Date.now()
        };
        return;
      } catch (error) {
        if (tentativa >= 17) console.error("Não foi possível registrar quem fez lateral e bojo.", error);
      }
    }
  }

  function instalarEventos() {
    const form = document.getElementById("formRevisaoComponentes");
    if (form && form.dataset.responsaveis50 !== "1") {
      form.dataset.responsaveis50 = "1";
      form.addEventListener("submit", event => {
        const dados = validarFormulario();
        if (!dados) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        salvarQuandoRevisaoConcluir(dados);
      }, true);
    }

    const lateral = document.getElementById("revLateral");
    if (lateral && lateral.dataset.responsavel50 !== "1") {
      lateral.dataset.responsavel50 = "1";
      lateral.addEventListener("change", () => sincronizarCampo("lateral"));
    }

    const bojo = document.getElementById("revBojo");
    if (bojo && bojo.dataset.responsavel50 !== "1") {
      bojo.dataset.responsavel50 = "1";
      bojo.addEventListener("change", () => sincronizarCampo("bojo"));
    }
  }

  function preparar() {
    if (!garantirCampos()) return;
    instalarEventos();
  }

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;

    if (alvo.closest("#btnBuscarRevOP")) {
      [250, 650, 1200].forEach(atraso => window.setTimeout(buscarOpAtual, atraso));
    }
    if (alvo.closest("[data-editar-rev]")) {
      [120, 350, 700].forEach(atraso => window.setTimeout(buscarOpAtual, atraso));
    }
    if (alvo.closest("#btnLimparRev")) {
      window.setTimeout(limparResponsaveis, 0);
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (event.target?.id === "revNumeroOP" && event.key === "Enter") {
      [250, 650, 1200].forEach(atraso => window.setTimeout(buscarOpAtual, atraso));
    }
  }, true);

  document.addEventListener("input", event => {
    if (event.target?.id !== "revNumeroOP") return;
    const atual = texto(event.target.value);
    if (ultimoNumero && normalizar(atual) !== normalizar(ultimoNumero)) limparResponsaveis();
  }, true);

  let tentativas = 0;
  const intervalo = window.setInterval(() => {
    tentativas += 1;
    preparar();
    if (tentativas >= 50) window.clearInterval(intervalo);
  }, 250);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preparar, { once: true });
  } else {
    preparar();
  }
})();

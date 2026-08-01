(() => {
  "use strict";

  const VERSION = "2026-08-01-fluxo-saida-unico-70";
  const FB = "10.12.5";
  const FORM_SAIDA = "s3form";
  const MODAL_CHEGADA = "modalChegadaMovimentacao";
  const CLASSE_CARD_ANTIGO = "sf70-reconfirmacao-oculta";
  const salvando = new Set();
  let contextoPromise = null;
  let observerChegada = null;

  if (window.__CORPONU_FLUXO_FACCAO_UNICO__ === VERSION) return;
  window.__CORPONU_FLUXO_FACCAO_UNICO__ = VERSION;

  const texto = valor => String(valor ?? "").trim();
  const normalizar = valor => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const numero = valor => {
    const n = Number(valor || 0);
    return Number.isFinite(n) ? n : 0;
  };
  const inteiro = valor => Math.max(0, Math.floor(numero(valor)));
  const slug = valor => normalizar(valor)
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 70) || "item";

  function hash(valor) {
    let h = 2166136261;
    for (const caractere of valor) {
      h ^= caractere.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function avisar(mensagem, erro = false) {
    const toast = document.getElementById("toast");
    if (!toast) return window.alert(mensagem);
    toast.textContent = mensagem;
    toast.classList.remove("hidden");
    toast.style.background = erro ? "#991b1b" : "#166534";
    window.clearTimeout(window.__sf70Toast);
    window.__sf70Toast = window.setTimeout(() => {
      toast.classList.add("hidden");
      toast.style.background = "";
    }, 7000);
  }

  async function contexto() {
    if (contextoPromise) return contextoPromise;
    contextoPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]).then(([app, auth, fs]) => {
      if (!app.getApps().length) throw new Error("Firebase ainda não inicializado.");
      const firebaseApp = app.getApp();
      return { auth: auth.getAuth(firebaseApp), db: fs.getFirestore(firebaseApp), fs };
    }).catch(error => {
      contextoPromise = null;
      throw error;
    });
    return contextoPromise;
  }

  async function usuarioAtual() {
    const { auth } = await contexto();
    for (let tentativa = 0; tentativa < 40 && !auth.currentUser; tentativa += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    return auth.currentUser;
  }

  async function buscarOP(valor) {
    const chave = texto(valor);
    if (!chave) return null;
    const { db, fs } = await contexto();

    try {
      const direto = await fs.getDoc(fs.doc(db, "ordensProducao", chave));
      if (direto.exists()) return { id: direto.id, ...direto.data() };
    } catch (_) {}

    const valores = [chave];
    const numerico = Number(chave);
    if (Number.isFinite(numerico)) valores.push(numerico);

    for (const campo of ["numeroOP", "numeroOPExterno", "op"]) {
      for (const atual of valores) {
        try {
          const snap = await fs.getDocs(fs.query(
            fs.collection(db, "ordensProducao"),
            fs.where(campo, "==", atual),
            fs.limit(1)
          ));
          if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (_) {}
      }
    }
    return null;
  }

  function quantidadeOP(op) {
    return Math.max(0, numero(op?.quantidade ?? op?.quantidadeTotal ?? op?.qtd ?? op?.qti));
  }

  function areaAtual() {
    const titulo = normalizar(document.getElementById("s3titulo")?.textContent);
    if (titulo.includes("CALCINHA")) return "calcinha";
    if (titulo.includes("CORTE")) return "corte";
    return "sutia";
  }

  function dadosSaida() {
    return {
      numeroOPDigitado: texto(document.getElementById("s3op")?.value),
      processo: normalizar(document.getElementById("s3processo")?.value),
      faccao: normalizar(document.getElementById("s3faccao")?.value),
      dataEnvio: texto(document.getElementById("s3data")?.value),
      area: areaAtual()
    };
  }

  function chaveNegocio(op, dados, quantidade) {
    return [
      "saida-faccao",
      op.id,
      dados.area,
      dados.processo,
      dados.faccao,
      quantidade,
      dados.dataEnvio
    ].join("|");
  }

  function idMovimentacao(op, dados, quantidade) {
    const chave = chaveNegocio(op, dados, quantidade);
    return `saida-unica-${slug(op.id)}-${hash(chave)}`.slice(0, 190);
  }

  function ativa(item) {
    if (!item || item.excluido === true || item.cancelado === true) return false;
    return !["CANCELADO", "CANCELADA", "EXCLUIDO", "EXCLUIDA"].includes(normalizar(item.status));
  }

  function mesmaSaida(item, op, dados, quantidade) {
    if (!ativa(item)) return false;
    const areaItem = normalizar(item.area || item.setor);
    const areaDados = normalizar(dados.area);
    return texto(item.opId) === texto(op.id) &&
      normalizar(item.processo) === dados.processo &&
      normalizar(item.destino) === dados.faccao &&
      inteiro(item.quantidadeEnviada) === inteiro(quantidade) &&
      texto(item.dataEnvio) === dados.dataEnvio &&
      (!areaItem || areaItem === areaDados || (dados.area !== "corte" && normalizar(item.tipoDestino) === "FACCAO"));
  }

  async function procurarSaidaAnterior(op, dados, quantidade) {
    const { db, fs } = await contexto();
    const snap = await fs.getDocs(fs.query(
      fs.collection(db, "movimentacoesProducao"),
      fs.where("opId", "==", op.id)
    ));
    return snap.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .find(item => mesmaSaida(item, op, dados, quantidade)) || null;
  }

  async function buscarFaccaoId(nome) {
    const { db, fs } = await contexto();
    try {
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, "faccoes"),
        fs.where("nome", "==", nome),
        fs.limit(1)
      ));
      if (!snap.empty) return snap.docs[0].id;
    } catch (_) {}
    return "";
  }

  function bloquearBotao(form) {
    const botao = form.querySelector('button[type="submit"]');
    if (!botao) return () => {};
    const original = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Salvando uma única vez...";
    return () => {
      botao.disabled = false;
      botao.textContent = original;
    };
  }

  async function salvarSaidaUnica(form) {
    const dados = dadosSaida();
    if (!dados.numeroOPDigitado || !dados.processo || !dados.faccao || !dados.dataEnvio) {
      avisar("Preencha OP, processo, facção e data.", true);
      return;
    }

    const op = await buscarOP(dados.numeroOPDigitado);
    if (!op) {
      avisar("OP não encontrada.", true);
      return;
    }

    const quantidade = quantidadeOP(op);
    if (!quantidade) {
      avisar("A OP não possui quantidade válida.", true);
      return;
    }

    const chave = chaveNegocio(op, dados, quantidade);
    if (salvando.has(chave)) {
      avisar("Esta saída já está sendo salva. Aguarde.", true);
      return;
    }

    salvando.add(chave);
    form.dataset.sf70Salvando = chave;
    const restaurar = bloquearBotao(form);

    try {
      const anterior = await procurarSaidaAnterior(op, dados, quantidade);
      if (anterior) {
        avisar(`Esta saída já existe no registro ${anterior.id}. Nenhuma duplicata foi criada.`, true);
        return;
      }

      const { auth, db, fs } = await contexto();
      const usuario = await usuarioAtual();
      const movimentoId = idMovimentacao(op, dados, quantidade);
      const movimentoRef = fs.doc(db, "movimentacoesProducao", movimentoId);
      const faccaoId = await buscarFaccaoId(dados.faccao);
      const corte = dados.area === "corte";
      const areaLabel = dados.area === "calcinha" ? "Calcinha" : corte ? "Corte" : "Sutiã";
      const numeroOP = op.numeroOP || op.numeroOPExterno || op.op || dados.numeroOPDigitado;

      await fs.runTransaction(db, async transaction => {
        const existente = await transaction.get(movimentoRef);
        if (existente.exists() && ativa(existente.data())) {
          throw new Error("JA_EXISTE");
        }

        transaction.set(movimentoRef, {
          origem: corte ? "corte" : "faccoes_registro_saida",
          area: dados.area,
          areaLabel,
          movimentacaoCorte: corte,
          opId: op.id,
          numeroOP,
          referencia: op.referencia || "",
          cor: op.cor || "",
          produtoNome: op.produtoNome || op.nomeProduto || "",
          tipoDestino: corte ? "faccao_corte" : "faccao",
          tipoDestinoLabel: corte ? "Facção • Corte" : "Facção",
          destino: dados.faccao,
          destinoId: faccaoId,
          processo: dados.processo,
          processoLivre: true,
          setor: dados.area,
          setorLabel: areaLabel,
          quantidadeEnviada: quantidade,
          quantidadeRecebida: 0,
          dataEnvio: dados.dataEnvio,
          dataChegada: "",
          falta: 0,
          descontoDefeito: 0,
          defeito: 0,
          status: "em_andamento",
          chaveUnicaSaida: chave,
          origemIdempotencia: "fluxo_faccao_unico",
          segurancaSaidaVersao: VERSION,
          criadoPor: usuario.uid,
          criadoEm: fs.serverTimestamp(),
          atualizadoPor: usuario.uid,
          atualizadoEm: fs.serverTimestamp(),
          versaoSaidaAbas: VERSION
        }, { merge: false });
      });

      document.getElementById("modalSaida3")?.classList.add("hidden");
      form.reset();
      avisar("Saída registrada uma única vez.");

      if (corte) document.getElementById("btnCorteAtualizar")?.click();
      else document.getElementById("btnAtualizarServidor")?.click();
    } catch (error) {
      if (error?.message === "JA_EXISTE") {
        avisar("Esta mesma saída já foi criada. Nenhuma nova movimentação foi adicionada.", true);
      } else if (error?.code === "permission-denied") {
        avisar("O Firebase bloqueou a gravação. Publique as regras atuais antes de continuar.", true);
      } else {
        console.error("Erro ao salvar saída determinística.", error);
        avisar("Não foi possível salvar a saída. Nenhum segundo registro foi criado.", true);
      }
    } finally {
      salvando.delete(chave);
      delete form.dataset.sf70Salvando;
      restaurar();
    }
  }

  function localizarCardReconfirmacao(modal) {
    if (!modal) return null;
    const titulo = [...modal.querySelectorAll("h1,h2,h3,h4,h5,strong,b,div,span")]
      .filter(elemento => normalizar(elemento.textContent).includes("CONFERENCIA OBRIGATORIA ANTES DE GERAR O PAGAMENTO"))
      .sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
    if (!titulo) return null;

    let atual = titulo;
    for (let nivel = 0; atual && atual !== modal && nivel < 7; nivel += 1, atual = atual.parentElement) {
      const conteudo = normalizar(atual.textContent);
      if (conteudo.includes("O QUE FOI FEITO PROCESSO") && conteudo.includes("QUEM FEZ FACCAO")) return atual;
    }
    return titulo.parentElement;
  }

  function selecionarOpcao(select, valor) {
    if (!(select instanceof HTMLSelectElement)) return;
    const alvo = normalizar(valor);
    let opcao = [...select.options].find(item => normalizar(item.value || item.textContent) === alvo);
    if (!opcao && valor) {
      opcao = document.createElement("option");
      opcao.value = valor;
      opcao.textContent = valor;
      select.appendChild(opcao);
    }
    if (opcao) select.value = opcao.value;
    select.required = false;
    select.removeAttribute("required");
  }

  async function ocultarReconfirmacaoChegada() {
    const modal = document.getElementById(MODAL_CHEGADA);
    if (!modal || modal.classList.contains("hidden")) return false;
    const card = localizarCardReconfirmacao(modal);
    if (!card) return false;

    const id = texto(document.getElementById("chegadaMovimentacaoId")?.value);
    if (id) {
      try {
        const { db, fs } = await contexto();
        const snap = await fs.getDoc(fs.doc(db, "movimentacoesProducao", id));
        if (snap.exists()) {
          const mov = snap.data();
          const selects = [...card.querySelectorAll("select")];
          selecionarOpcao(selects[0], mov.processo || "");
          selecionarOpcao(selects[1], mov.destino || "");
        }
      } catch (error) {
        console.warn("Não foi possível preencher a reconfirmação antiga.", error);
      }
    }

    card.classList.add(CLASSE_CARD_ANTIGO);
    card.setAttribute("aria-hidden", "true");
    card.querySelectorAll("input,select,textarea,button").forEach(campo => {
      campo.required = false;
      campo.removeAttribute("required");
      campo.tabIndex = -1;
    });

    const resumo = document.getElementById("modalChegadaResumo");
    if (resumo) resumo.textContent = "Informe a data, a falta e o desconto por defeito. O processo e a facção já vêm da saída registrada.";
    return true;
  }

  function instalarEstilo() {
    if (document.getElementById("styleFluxoFaccaoUnico70")) return;
    const style = document.createElement("style");
    style.id = "styleFluxoFaccaoUnico70";
    style.textContent = `#${MODAL_CHEGADA} .${CLASSE_CARD_ANTIGO}{display:none!important}`;
    document.head.appendChild(style);
  }

  function observarChegada() {
    const modal = document.getElementById(MODAL_CHEGADA);
    if (!modal || modal.dataset.sf70Observado === "1") return;
    modal.dataset.sf70Observado = "1";
    observerChegada?.disconnect();
    observerChegada = new MutationObserver(() => {
      if (!modal.classList.contains("hidden")) {
        [0, 80, 250, 600].forEach(atraso => window.setTimeout(ocultarReconfirmacaoChegada, atraso));
      }
    });
    observerChegada.observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_SAIDA) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (form.dataset.sf70Salvando) {
      avisar("Esta saída já está sendo salva. Aguarde.", true);
      return;
    }

    salvarSaidaUnica(form).catch(error => {
      console.error(error);
      avisar("Não foi possível salvar a saída.", true);
    });
  }, true);

  document.addEventListener("submit", event => {
    if (event.target?.id !== "formChegadaMovimentacao") return;
    ocultarReconfirmacaoChegada();
  }, true);

  document.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    if (!alvo) return;
    if (alvo.closest("[data-chegada], [data-registrar-chegada], button[onclick*='registrarChegadaMovimentacao']")) {
      [40, 120, 300, 700].forEach(atraso => window.setTimeout(ocultarReconfirmacaoChegada, atraso));
    }
  }, true);

  function iniciar() {
    instalarEstilo();
    let tentativas = 0;
    const intervalo = window.setInterval(() => {
      tentativas += 1;
      observarChegada();
      ocultarReconfirmacaoChegada();
      if (tentativas >= 40) window.clearInterval(intervalo);
    }, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();

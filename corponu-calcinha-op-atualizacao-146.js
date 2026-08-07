(() => {
  "use strict";

  const VERSION = "2026-08-07-calcinha-op-atualizacao-146";

  if (window.__CORPONU_CALCINHA_OP_ATUALIZACAO_146__ === VERSION) return;
  window.__CORPONU_CALCINHA_OP_ATUALIZACAO_146__ = VERSION;

  const normalizar = valor => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  function ehCalcinha(dados) {
    const tipo = normalizar([
      dados?.tipoPeca,
      dados?.tipoPecaPadrao,
      dados?.tipoPecaLabel,
      dados?.setor,
      dados?.setorLabel,
      dados?.processoPlanejado,
      dados?.processo
    ].join(" "));

    return tipo.includes("CALCINHA");
  }

  function formularioCalcinhaAtivo() {
    const aba = document.querySelector('.corponu-dual-tabs[data-page="ordens"] .corponu-dual-tab.active');
    const titulo = normalizar(document.querySelector("#formOrdem .panel-header h3")?.textContent || "");
    return document.body.dataset.corponuFormType === "calcinha"
      || aba?.dataset?.type === "calcinha"
      || titulo.includes("CALCINHA");
  }

  async function buscarOrdemSalva(numeroOP) {
    const dual = window.corponuDualMode;
    const estado = dual?.state;
    const fs = estado?.firebase;
    const db = estado?.db;

    if (!fs || !db) return null;

    const consulta = fs.query(
      fs.collection(db, "ordensProducao"),
      fs.where("numeroOP", "==", numeroOP)
    );

    const snapshot = await fs.getDocs(consulta);
    const ordens = snapshot.docs
      .map(documento => ({ id: documento.id, ...documento.data() }))
      .filter(item => item.excluida !== true);

    return ordens.find(ehCalcinha) || ordens[0] || null;
  }

  function garantirLinhaVisivel(numeroOP) {
    if (document.body.dataset.corponuFormType !== "calcinha") return;

    const alvo = normalizar(numeroOP);
    if (!alvo) return;

    const linha = [...document.querySelectorAll("#listaOrdens tr")].find(row => {
      const primeiraCelula = row.cells?.[0]?.textContent || "";
      return normalizar(primeiraCelula) === alvo;
    });

    linha?.classList.remove("corponu-dual-hidden");
  }

  async function sincronizarOrdemCalcinha(numeroOP) {
    try {
      const ordem = await buscarOrdemSalva(numeroOP);
      if (!ordem || !ehCalcinha(ordem)) return;

      const dual = window.corponuDualMode;
      const mapaOrdens = dual?.state?.maps?.ordens;
      if (mapaOrdens instanceof Map) {
        mapaOrdens.set(String(ordem.id), ordem);
      }

      // O fluxo 137 já solicita a renovação da lista principal logo depois do
      // salvamento. Com o mapa Dual sincronizado antes disso, a nova linha não
      // é mais classificada provisoriamente como Sutiã e escondida pela aba.
      [120, 360, 760].forEach(atraso => {
        window.setTimeout(() => {
          const mapa = window.corponuDualMode?.state?.maps?.ordens;
          if (mapa instanceof Map) mapa.set(String(ordem.id), ordem);

          const abaCalcinha = document.querySelector('.corponu-dual-tabs[data-page="ordens"] [data-type="calcinha"]');
          if (document.body.dataset.corponuFormType === "calcinha") {
            abaCalcinha?.click();
            garantirLinhaVisivel(numeroOP);
          }
        }, atraso);
      });
    } catch (error) {
      console.warn("[Calcinha 146] A OP foi salva, mas a sincronização visual imediata falhou.", error);
    }
  }

  function instalarInterceptacaoSalvamento() {
    const adicionarOriginal = window.addEventListener;
    let capturado = false;

    window.addEventListener = function corponuAddEventListener146(tipo, listener, opcoes) {
      const ehSalvamentoCalcinha = !capturado
        && tipo === "submit"
        && typeof listener === "function"
        && listener.name === "salvarOrdemCalcinha";

      if (!ehSalvamentoCalcinha) {
        return adicionarOriginal.call(this, tipo, listener, opcoes);
      }

      capturado = true;
      window.addEventListener = adicionarOriginal;

      const listenerProtegido = async function corponuSalvarCalcinhaComAtualizacao146(evento) {
        const numeroOP = normalizar(document.getElementById("ordemNumero")?.value || "");
        const eraCalcinha = formularioCalcinhaAtivo();

        const resultado = await listener.call(this, evento);

        // O reparo 137 limpa o formulário apenas quando o salvamento conclui.
        const formularioFoiLimpo = !String(document.getElementById("ordemNumero")?.value || "").trim();
        if (eraCalcinha && numeroOP && formularioFoiLimpo) {
          await sincronizarOrdemCalcinha(numeroOP);
        }

        return resultado;
      };

      return adicionarOriginal.call(this, tipo, listenerProtegido, opcoes);
    };
  }

  instalarInterceptacaoSalvamento();
})();

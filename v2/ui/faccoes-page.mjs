import { normalizar, texto } from "../core/normalizacao.mjs";
import { templateFaccoesV2 } from "./faccoes-template.mjs";
import {
  definirStatusFaccoes,
  ehAdminPerfil,
  htmlCamposComponentesFaltantes,
  htmlLinhaFaccao,
  preencherSelectFaccoes,
  respostasComponentesDoForm
} from "./faccoes-ui-utils.mjs";

const ERROS = Object.freeze({
  MOVIMENTACAO_NAO_ENCONTRADA: "Movimentação não encontrada.",
  CHEGADA_NAO_PODE_SER_INFORMADA: "Esta chegada não pode mais ser informada.",
  MOVIMENTACAO_NAO_ACEITA_CHEGADA: "Esta movimentação não aceita confirmação de chegada.",
  CHEGADA_JA_CONFIRMADA: "Esta chegada já foi confirmada.",
  DATA_CHEGADA_NAO_INFORMADA: "Informe a data de chegada.",
  FALTA_DEFEITO_MAIOR_QUE_ENVIADO: "Falta + defeito não pode ultrapassar a quantidade enviada.",
  LATERAL_NAO_INFORMADO: "Informe se a Lateral foi feita.",
  BOJO_NAO_INFORMADO: "Informe se o Bojo foi feito.",
  FECHO_NAO_INFORMADO: "Informe se o Fecho foi feito.",
  PONTOLUZ_NAO_INFORMADO: "Informe se o Ponto de luz foi feito.",
  LATERAL_SEM_RESPONSAVEL: "Informe quem fez a Lateral.",
  BOJO_SEM_RESPONSAVEL: "Informe quem fez o Bojo.",
  REENVIO_ANTES_DA_CHEGADA: "O reenvio só pode ser feito depois da chegada informada ou confirmada.",
  REENVIO_JA_CRIADO: "Esta movimentação já possui reenvio.",
  REENVIO_ORIGEM_NAO_FACCAO: "Somente movimentações de Facção podem ser reenviadas por aqui.",
  PROCESSO_NAO_PERMITIDO: "Escolha um processo permitido.",
  DESTINO_NAO_INFORMADO: "Escolha a facção.",
  QUANTIDADE_INVALIDA: "Informe uma quantidade válida.",
  QUANTIDADE_MAIOR_QUE_DISPONIVEL: "A quantidade é maior que a quantidade disponível para reenvio.",
  DATA_ENVIO_NAO_INFORMADA: "Informe a data de envio."
});

function mensagemErros(erros = []) {
  return [...new Set(erros || [])].map(erro => ERROS[erro] || erro).join(" ");
}

function hojeISO() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function filtrosDoContainer(container) {
  return Object.fromEntries(
    [...container.querySelectorAll("[name]")].map(campo => [campo.name, campo.value])
  );
}

function unicos(itens, campo) {
  return [...new Set(itens.map(item => texto(item[campo])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

function preencherFiltro(select, itens, placeholder) {
  const atual = select.value;
  preencherSelectFaccoes(select, itens, { placeholder, valor: atual });
  select.disabled = false;
}

export function montarTelaFaccoes({
  container,
  controller,
  store,
  obterPerfil = () => ({}),
  obterUsuario = () => null,
  confirmarAviso = null
}) {
  if (!(container instanceof HTMLElement)) throw new Error("Container inválido para Facções V2.");
  if (!controller) throw new Error("Controller de Facções V2 não configurado.");
  if (!store) throw new Error("Store V2 não configurado para Facções.");

  container.innerHTML = templateFaccoesV2();
  const abort = new AbortController();
  const { signal } = abort;
  const refs = {
    filtros: container.querySelector("[data-v2-faccoes-filtros]"),
    limpar: container.querySelector("[data-v2-faccoes-limpar]"),
    lista: container.querySelector("[data-v2-faccoes-lista]"),
    status: container.querySelector("[data-v2-faccoes-status]"),
    mais: container.querySelector("[data-v2-faccoes-mais]"),
    chegadaModal: container.querySelector("[data-v2-chegada-modal]"),
    chegadaForm: container.querySelector("[data-v2-chegada-form]"),
    chegadaResumo: container.querySelector("[data-v2-chegada-resumo]"),
    chegadaComponentes: container.querySelector("[data-v2-chegada-componentes]"),
    chegadaCampos: container.querySelector("[data-v2-chegada-componentes-campos]"),
    chegadaStatus: container.querySelector("[data-v2-chegada-status]"),
    reenvioModal: container.querySelector("[data-v2-reenvio-modal]"),
    reenvioForm: container.querySelector("[data-v2-reenvio-form]"),
    reenvioResumo: container.querySelector("[data-v2-reenvio-resumo]"),
    reenvioStatus: container.querySelector("[data-v2-reenvio-status]")
  };
  const chegada = {
    id: refs.chegadaForm.querySelector('[name="movimentacaoId"]'),
    data: refs.chegadaForm.querySelector('[name="dataChegada"]'),
    falta: refs.chegadaForm.querySelector('[name="falta"]'),
    defeito: refs.chegadaForm.querySelector('[name="defeito"]'),
    submit: refs.chegadaForm.querySelector('button[type="submit"]')
  };
  const reenvio = {
    id: refs.reenvioForm.querySelector('[name="movimentacaoId"]'),
    processo: refs.reenvioForm.querySelector('[name="processo"]'),
    destino: refs.reenvioForm.querySelector('[name="destino"]'),
    quantidade: refs.reenvioForm.querySelector('[name="quantidade"]'),
    data: refs.reenvioForm.querySelector('[name="dataEnvio"]'),
    submit: refs.reenvioForm.querySelector('button[type="submit"]')
  };

  function perfilAtual() {
    return obterPerfil?.() || {};
  }

  function atualizarFiltros() {
    const movimentos = controller.listar();
    preencherFiltro(refs.filtros.querySelector('[name="processo"]'), unicos(movimentos, "processo"), "Todos");
    preencherFiltro(refs.filtros.querySelector('[name="destino"]'), unicos(movimentos, "destino"), "Todas");
  }

  function render() {
    atualizarFiltros();
    const admin = ehAdminPerfil(perfilAtual());
    const itens = controller.listar(filtrosDoContainer(refs.filtros));
    refs.lista.innerHTML = itens.length
      ? itens.map(item => htmlLinhaFaccao(item, controller, { admin })).join("")
      : '<tr><td colspan="12">Nenhuma movimentação de Facção encontrada.</td></tr>';
    refs.mais.hidden = controller.acabou();
  }

  async function informarChegada(id) {
    const mov = controller.obter(id);
    if (!mov) return;
    const pergunta = `Informar que a OP ${mov.numeroOP || "-"} voltou de ${mov.destino || "facção"}? Nenhum pagamento será gerado.`;
    const confirmado = typeof confirmarAviso === "function"
      ? await confirmarAviso(pergunta, mov)
      : window.confirm(pergunta);
    if (!confirmado) return;

    try {
      const resultado = await controller.informarChegada({
        id,
        usuario: obterUsuario?.() || {},
        dataHoje: hojeISO()
      });
      if (!resultado.ok) {
        definirStatusFaccoes(refs.status, mensagemErros(resultado.erros), "erro");
        return;
      }
      definirStatusFaccoes(refs.status, `Chegada da OP ${resultado.movimentacao?.numeroOP || ""} informada.`, "ok");
      render();
    } catch (error) {
      console.error("[V2] Falha ao informar chegada.", error);
      definirStatusFaccoes(refs.status, "Não foi possível informar a chegada.", "erro");
    }
  }

  function configurarResponsaveisComponentes() {
    refs.chegadaCampos.querySelectorAll("select[name]").forEach(select => {
      select.addEventListener("change", () => {
        const nome = select.name;
        const wrapper = refs.chegadaCampos.querySelector(`[data-v2-responsavel-wrapper="${CSS.escape(nome)}"]`);
        if (!wrapper) return;
        const input = wrapper.querySelector("input");
        const mostrar = select.value === "sim";
        wrapper.classList.toggle("hidden", !mostrar);
        input.required = mostrar;
        if (!mostrar) input.value = "";
      }, { signal });
    });
  }

  function abrirConfirmacao(id) {
    const preparado = controller.prepararConfirmacao(id);
    if (!preparado.ok) {
      definirStatusFaccoes(refs.status, mensagemErros(preparado.erros), "erro");
      return;
    }

    const mov = preparado.movimentacao;
    chegada.id.value = id;
    chegada.data.value = hojeISO();
    chegada.falta.value = String(Math.max(0, Number(mov.falta || 0)));
    chegada.defeito.value = String(Math.max(0, Number(mov.defeito || 0)));
    refs.chegadaResumo.textContent = `OP ${mov.numeroOP || "-"} • ${mov.processo || "-"} • ${mov.destino || "-"} • ${Number(mov.quantidadeEnviada || 0).toLocaleString("pt-BR")} peças`;
    refs.chegadaCampos.innerHTML = htmlCamposComponentesFaltantes(preparado.faltantes);
    refs.chegadaComponentes.classList.toggle("hidden", preparado.faltantes.length === 0);
    configurarResponsaveisComponentes();
    definirStatusFaccoes(refs.chegadaStatus, "");
    refs.chegadaModal.classList.remove("hidden");
  }

  function fecharConfirmacao() {
    refs.chegadaModal.classList.add("hidden");
    refs.chegadaForm.reset();
    refs.chegadaCampos.innerHTML = "";
    definirStatusFaccoes(refs.chegadaStatus, "");
  }

  function carregarDestinosReenvio() {
    const itens = controller.listarDestinosReenvio(reenvio.processo.value);
    preencherSelectFaccoes(reenvio.destino, itens, {
      placeholder: itens.length ? "Selecione" : "Nenhuma facção habilitada"
    });
  }

  function abrirReenvio(id) {
    const mov = controller.obter(id);
    if (!mov) return;
    reenvio.id.value = id;
    reenvio.quantidade.value = Number(mov.quantidadeRecebida || mov.quantidadeEnviada || 0) || "";
    reenvio.data.value = hojeISO();
    refs.reenvioResumo.textContent = `OP ${mov.numeroOP || "-"} • origem ${mov.destino || "-"}`;
    preencherSelectFaccoes(reenvio.processo, controller.processosReenvio(mov), {
      placeholder: "Selecione o processo",
      valor: mov.processo || ""
    });
    carregarDestinosReenvio();
    definirStatusFaccoes(refs.reenvioStatus, "");
    refs.reenvioModal.classList.remove("hidden");
  }

  function fecharReenvio() {
    refs.reenvioModal.classList.add("hidden");
    refs.reenvioForm.reset();
    definirStatusFaccoes(refs.reenvioStatus, "");
  }

  refs.filtros.addEventListener("input", render, { signal });
  refs.filtros.addEventListener("change", render, { signal });
  refs.limpar.addEventListener("click", () => {
    refs.filtros.querySelectorAll("input,select").forEach(campo => { campo.value = ""; });
    render();
  }, { signal });

  refs.lista.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    const informar = alvo?.closest("[data-v2-informar-chegada]");
    const confirmar = alvo?.closest("[data-v2-confirmar-chegada]");
    const reenviar = alvo?.closest("[data-v2-reenviar-faccao]");
    if (informar) informarChegada(informar.dataset.v2InformarChegada);
    else if (confirmar) abrirConfirmacao(confirmar.dataset.v2ConfirmarChegada);
    else if (reenviar) abrirReenvio(reenviar.dataset.v2ReenviarFaccao);
  }, { signal });

  refs.mais.addEventListener("click", async () => {
    refs.mais.disabled = true;
    const anterior = refs.mais.textContent;
    refs.mais.textContent = "Carregando...";
    try {
      await controller.carregarMais();
      render();
    } catch (error) {
      console.error("[V2] Falha ao carregar mais movimentações.", error);
      definirStatusFaccoes(refs.status, "Não foi possível carregar mais movimentações.", "erro");
    } finally {
      refs.mais.disabled = false;
      refs.mais.textContent = anterior;
    }
  }, { signal });

  refs.chegadaForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!refs.chegadaForm.reportValidity()) return;
    chegada.submit.disabled = true;
    const anterior = chegada.submit.textContent;
    chegada.submit.textContent = "Confirmando...";

    try {
      const resultado = await controller.confirmarChegada({
        id: chegada.id.value,
        dataChegada: chegada.data.value,
        falta: Number(chegada.falta.value || 0),
        defeito: Number(chegada.defeito.value || 0),
        respostasComponentes: respostasComponentesDoForm(refs.chegadaForm),
        usuario: obterUsuario?.() || {}
      });
      if (!resultado.ok) {
        definirStatusFaccoes(refs.chegadaStatus, mensagemErros(resultado.erros), "erro");
        return;
      }
      definirStatusFaccoes(refs.status, `Chegada da OP ${resultado.movimentacao?.numeroOP || ""} confirmada operacionalmente.`, "ok");
      fecharConfirmacao();
      render();
    } catch (error) {
      console.error("[V2] Falha ao confirmar chegada.", error);
      definirStatusFaccoes(refs.chegadaStatus, "Não foi possível confirmar a chegada.", "erro");
    } finally {
      chegada.submit.disabled = false;
      chegada.submit.textContent = anterior;
    }
  }, { signal });

  reenvio.processo.addEventListener("change", carregarDestinosReenvio, { signal });
  refs.reenvioForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!refs.reenvioForm.reportValidity()) return;
    reenvio.submit.disabled = true;
    const anterior = reenvio.submit.textContent;
    reenvio.submit.textContent = "Reenviando...";

    try {
      const option = reenvio.destino.selectedOptions?.[0];
      const resultado = await controller.reenviar({
        id: reenvio.id.value,
        processo: reenvio.processo.value,
        destino: reenvio.destino.value,
        destinoId: option?.dataset?.id || "",
        quantidade: Number(reenvio.quantidade.value || 0),
        dataEnvio: reenvio.data.value,
        usuario: obterUsuario?.() || {}
      });
      if (!resultado.ok) {
        definirStatusFaccoes(refs.reenvioStatus, mensagemErros(resultado.erros), "erro");
        return;
      }
      definirStatusFaccoes(refs.status, `Reenvio da OP ${resultado.novaMovimentacao?.numeroOP || ""} criado.`, "ok");
      fecharReenvio();
      render();
    } catch (error) {
      console.error("[V2] Falha ao reenviar movimentação.", error);
      definirStatusFaccoes(refs.reenvioStatus, "Não foi possível criar o reenvio.", "erro");
    } finally {
      reenvio.submit.disabled = false;
      reenvio.submit.textContent = anterior;
    }
  }, { signal });

  for (const seletor of ["[data-v2-chegada-fechar]", "[data-v2-chegada-cancelar]"]) {
    container.querySelector(seletor).addEventListener("click", fecharConfirmacao, { signal });
  }
  for (const seletor of ["[data-v2-reenvio-fechar]", "[data-v2-reenvio-cancelar]"]) {
    container.querySelector(seletor).addEventListener("click", fecharReenvio, { signal });
  }

  const pararMovimentos = store.assinar("movimentacoes", render);
  const pararFaccoes = store.assinar("faccoes", render);
  render();

  return {
    render,
    desmontar() {
      abort.abort();
      pararMovimentos();
      pararFaccoes();
      container.innerHTML = "";
    }
  };
}

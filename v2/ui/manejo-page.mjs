import { DESTINO_FACCAO } from "../core/manejo-regras.mjs";
import { processoCanonico, texto } from "../core/normalizacao.mjs";
import { templateManejoV2 } from "./manejo-template.mjs";
import {
  definirStatusManejo,
  entradaManejoDaLinha,
  filtrosDoContainer,
  htmlLinhaManejo,
  preencherSelect
} from "./manejo-ui-utils.mjs";

const ERROS = Object.freeze({
  OP_NAO_ENCONTRADA: "OP não encontrada.",
  OP_NAO_PERTENCE_AO_SETOR: "Esta OP não pertence a este Manejo.",
  FASE_NAO_INFORMADA: "Informe a Fase Bojo da OP.",
  SILK_NAO_INFORMADO: "Informe o Silk ou a Data Silk antes do envio.",
  DATA_TECIDO_NAO_INFORMADA: "Informe a Data Tecido antes do envio.",
  TIPO_DESTINO_INVALIDO: "O Manejo envia somente para Facção.",
  DESTINO_NAO_INFORMADO: "Escolha a facção.",
  PROCESSO_NAO_PERMITIDO: "Escolha um processo permitido para este Manejo.",
  QUANTIDADE_INVALIDA: "Informe uma quantidade válida.",
  QUANTIDADE_MAIOR_QUE_DISPONIVEL: "A quantidade é maior que a quantidade disponível.",
  DATA_ENVIO_NAO_INFORMADA: "Informe a data de envio."
});

function mensagemErros(erros = []) {
  return [...new Set(erros || [])].map(erro => ERROS[erro] || erro).join(" ");
}

function hojeISO() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function opcaoFiltros(select, itens, rotuloTodos) {
  const atual = select.value;
  preencherSelect(select, itens, { placeholder: rotuloTodos, valor: atual });
  select.disabled = false;
}

export function montarTelaManejo({
  container,
  controller,
  store,
  obterUsuario = () => null
}) {
  if (!(container instanceof HTMLElement)) throw new Error("Container inválido para Manejo V2.");
  if (!controller) throw new Error("Controller de Manejo V2 não configurado.");
  if (!store) throw new Error("Store V2 não configurado para Manejo.");

  container.innerHTML = templateManejoV2();
  const abort = new AbortController();
  const { signal } = abort;
  const refs = {
    tabs: [...container.querySelectorAll("[data-v2-manejo-setor]")],
    filtros: container.querySelector("[data-v2-manejo-filtros]"),
    limparFiltros: container.querySelector("[data-v2-limpar-filtros]"),
    lista: container.querySelector("[data-v2-manejo-lista]"),
    status: container.querySelector("[data-v2-manejo-status]"),
    modal: container.querySelector("[data-v2-movimentacao-modal]"),
    movForm: container.querySelector("[data-v2-movimentacao-form]"),
    movTitulo: container.querySelector("[data-v2-movimentacao-titulo]"),
    movResumo: container.querySelector("[data-v2-movimentacao-resumo]"),
    movStatus: container.querySelector("[data-v2-movimentacao-status]")
  };
  const mov = {
    ordemId: refs.movForm.querySelector('[name="ordemId"]'),
    processo: refs.movForm.querySelector('[name="processo"]'),
    destino: refs.movForm.querySelector('[name="destino"]'),
    quantidade: refs.movForm.querySelector('[name="quantidade"]'),
    dataEnvio: refs.movForm.querySelector('[name="dataEnvio"]'),
    submit: refs.movForm.querySelector('button[type="submit"]')
  };
  let setor = "sutia";
  let contextoMovimento = null;

  function filtros() {
    return filtrosDoContainer(refs.filtros);
  }

  function atualizarOpcoesFiltros() {
    const opcoes = controller.opcoesFiltros(setor);
    opcaoFiltros(refs.filtros.querySelector('[name="status"]'), opcoes.status, "Todos");
    opcaoFiltros(refs.filtros.querySelector('[name="referencia"]'), opcoes.referencia, "Todas");
    opcaoFiltros(refs.filtros.querySelector('[name="cor"]'), opcoes.cor, "Todas");
    opcaoFiltros(refs.filtros.querySelector('[name="faseBojo"]'), opcoes.faseBojo, "Todas");
    opcaoFiltros(refs.filtros.querySelector('[name="faseLateral"]'), opcoes.faseLateral, "Todas");
    opcaoFiltros(refs.filtros.querySelector('[name="necessidade"]'), opcoes.necessidade, "Todas");
  }

  function render() {
    atualizarOpcoesFiltros();
    const ordens = controller.listar(setor, filtros());
    refs.lista.innerHTML = ordens.length
      ? ordens.map(ordem => htmlLinhaManejo(ordem, setor)).join("")
      : '<tr><td colspan="12">Nenhuma OP encontrada com os filtros atuais.</td></tr>';
  }

  function aplicarSetor(novoSetor) {
    setor = novoSetor === "calcinha" ? "calcinha" : "sutia";
    refs.tabs.forEach(botao => {
      const ativo = botao.dataset.v2ManejoSetor === setor;
      botao.classList.toggle("btn-primary", ativo);
      botao.setAttribute("aria-selected", ativo ? "true" : "false");
    });
    refs.filtros.querySelectorAll("input,select").forEach(campo => { campo.value = ""; });
    definirStatusManejo(refs.status, "");
    render();
  }

  function linhaDaOrdem(id) {
    return refs.lista.querySelector(`[data-v2-manejo-row="${CSS.escape(String(id))}"]`);
  }

  async function salvarLinha(id) {
    const linha = linhaDaOrdem(id);
    if (!linha) return;
    const botao = linha.querySelector(`[data-v2-salvar-manejo="${CSS.escape(String(id))}"]`);
    const anterior = botao?.textContent || "Salvar";
    if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }

    try {
      const resultado = await controller.salvar({
        ordemId: id,
        setor,
        entrada: entradaManejoDaLinha(linha),
        usuario: obterUsuario()
      });
      if (!resultado.ok) {
        definirStatusManejo(refs.status, mensagemErros(resultado.erros), "erro");
        return;
      }
      definirStatusManejo(refs.status, `Manejo da OP ${resultado.ordem.numeroOP || ""} salvo.`, "ok");
      render();
    } catch (error) {
      console.error("[V2] Falha ao salvar Manejo.", error);
      definirStatusManejo(refs.status, "Não foi possível salvar o Manejo.", "erro");
    } finally {
      if (botao?.isConnected) { botao.disabled = false; botao.textContent = anterior; }
    }
  }

  function fecharModal() {
    contextoMovimento = null;
    refs.modal.classList.add("hidden");
    refs.movForm.reset();
    definirStatusManejo(refs.movStatus, "");
  }

  function carregarDestinos() {
    const itens = controller.listarDestinos({
      tipoDestino: DESTINO_FACCAO,
      processo: mov.processo.value
    });
    preencherSelect(mov.destino, itens, {
      placeholder: itens.length ? "Selecione a facção" : "Nenhuma facção habilitada",
      valor: contextoMovimento?.destinoPlanejado || ""
    });
  }

  function abrirModal(id) {
    const ordem = controller.obterOrdem(id);
    const linha = linhaDaOrdem(id);
    if (!ordem || !linha) return;

    contextoMovimento = {
      ordem,
      entradaManejo: entradaManejoDaLinha(linha),
      destinoPlanejado: texto(ordem.faccaoPlanejada)
    };
    mov.ordemId.value = id;
    mov.quantidade.value = Number(ordem.quantidade || 0) || "";
    mov.quantidade.max = String(Math.max(1, Number(ordem.quantidade || 0)));
    mov.dataEnvio.value = hojeISO();
    refs.movTitulo.textContent = "Enviar para Facção";
    refs.movResumo.textContent = `OP ${ordem.numeroOP || "-"} • Ref. ${ordem.referencia || "-"} • ${Number(ordem.quantidade || 0).toLocaleString("pt-BR")} peças`;

    preencherSelect(mov.processo, controller.processosFaccoes(setor), {
      placeholder: "Selecione o processo",
      valor: setor === "calcinha" ? processoCanonico(ordem.processoPlanejado) : ""
    });
    carregarDestinos();

    refs.modal.classList.remove("hidden");
    definirStatusManejo(refs.movStatus, "");
  }

  refs.tabs.forEach(botao => {
    botao.addEventListener("click", () => aplicarSetor(botao.dataset.v2ManejoSetor), { signal });
  });
  refs.filtros.addEventListener("input", render, { signal });
  refs.filtros.addEventListener("change", render, { signal });
  refs.limparFiltros.addEventListener("click", () => {
    refs.filtros.querySelectorAll("input,select").forEach(campo => { campo.value = ""; });
    render();
  }, { signal });

  refs.lista.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target : null;
    const salvar = alvo?.closest("[data-v2-salvar-manejo]");
    const faccao = alvo?.closest("[data-v2-enviar-faccao]");
    if (salvar) salvarLinha(salvar.dataset.v2SalvarManejo);
    else if (faccao) abrirModal(faccao.dataset.v2EnviarFaccao);
  }, { signal });

  mov.processo.addEventListener("change", carregarDestinos, { signal });
  container.querySelector("[data-v2-fechar-movimentacao]").addEventListener("click", fecharModal, { signal });
  container.querySelector("[data-v2-cancelar-movimentacao]").addEventListener("click", fecharModal, { signal });

  refs.movForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!contextoMovimento || !refs.movForm.reportValidity()) return;
    const option = mov.destino.selectedOptions?.[0];
    mov.submit.disabled = true;
    const anterior = mov.submit.textContent;
    mov.submit.textContent = "Enviando...";

    try {
      const resultado = await controller.movimentar({
        ordemId: mov.ordemId.value,
        setor,
        entradaManejo: contextoMovimento.entradaManejo,
        tipoDestino: DESTINO_FACCAO,
        destino: mov.destino.value,
        destinoId: option?.dataset?.id || "",
        processo: mov.processo.value,
        quantidade: Number(mov.quantidade.value || 0),
        quantidadeMaxima: Number(contextoMovimento.ordem.quantidade || 0),
        dataEnvio: mov.dataEnvio.value,
        usuario: obterUsuario()
      });

      if (!resultado.ok) {
        definirStatusManejo(refs.movStatus, mensagemErros(resultado.erros), "erro");
        return;
      }

      definirStatusManejo(
        refs.status,
        `OP ${resultado.movimentacao.numeroOP} enviada para ${resultado.movimentacao.destino}.`,
        "ok"
      );
      fecharModal();
      render();
    } catch (error) {
      console.error("[V2] Falha ao movimentar OP.", error);
      definirStatusManejo(refs.movStatus, "Não foi possível registrar o envio.", "erro");
    } finally {
      if (mov.submit.isConnected) { mov.submit.disabled = false; mov.submit.textContent = anterior; }
    }
  }, { signal });

  const pararOrdens = store.assinar("ordens", render);
  aplicarSetor("sutia");

  return {
    render,
    desmontar() {
      abort.abort();
      pararOrdens();
      container.innerHTML = "";
    }
  };
}

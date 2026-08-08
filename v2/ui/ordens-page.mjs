import { TIPO_CALCINHA, TIPO_SUTIA, tipoPecaDoDocumento } from "../core/ordens-regras.mjs";
import { normalizar } from "../core/normalizacao.mjs";
import { templateOrdensV2 } from "./ordens-template.mjs";
import {
  definirStatusOrdens,
  entradaOrdemDoForm,
  htmlListaOrdens,
  mensagemErrosOrdens,
  preencherFaccoesSelect,
  protegerNumeroContraWheel
} from "./ordens-ui-utils.mjs";

export function montarTelaOrdens({
  container,
  controller,
  store,
  obterUsuario = () => null,
  confirmarConversao = null
}) {
  if (!(container instanceof HTMLElement)) throw new Error("Container inválido para Ordens V2.");
  if (!controller) throw new Error("Controller de Ordens V2 não configurado.");
  if (!store) throw new Error("Store V2 não configurado para a tela de Ordens.");

  container.innerHTML = templateOrdensV2();
  const abort = new AbortController();
  const { signal } = abort;
  const form = container.querySelector("[data-v2-ordem-form]");
  const refs = {
    tipo: form.querySelector('[name="tipoPeca"]'),
    currentId: form.querySelector('[name="currentId"]'),
    numeroOP: form.querySelector('[name="numeroOP"]'),
    referencia: form.querySelector('[name="referencia"]'),
    cor: form.querySelector('[name="cor"]'),
    quantidade: form.querySelector('[name="quantidade"]'),
    necessidadeTexto: form.querySelector('[name="necessidadeTexto"]'),
    necessidadeInicio: form.querySelector('[name="necessidadeInicio"]'),
    necessidadeFim: form.querySelector('[name="necessidadeFim"]'),
    processo: form.querySelector('[name="processoPlanejado"]'),
    faccao: form.querySelector('[name="faccaoPlanejada"]'),
    observacoes: form.querySelector('[name="observacoes"]'),
    calcinha: form.querySelector("[data-v2-calcinha-campos]"),
    titulo: form.querySelector("[data-v2-ordem-titulo]"),
    descricao: form.querySelector("[data-v2-ordem-descricao]"),
    status: form.querySelector("[data-v2-ordem-status]"),
    submit: form.querySelector('button[type="submit"]'),
    lista: container.querySelector("[data-v2-ordens-lista]"),
    busca: container.querySelector("[data-v2-ordens-busca]"),
    tabs: [...container.querySelectorAll("[data-v2-tipo]")]
  };
  let resetInterno = false;

  protegerNumeroContraWheel(refs.quantidade, signal);

  function aplicarTipo(tipo, { limparExclusivos = true } = {}) {
    const calcinha = tipo === TIPO_CALCINHA;
    refs.tipo.value = calcinha ? TIPO_CALCINHA : TIPO_SUTIA;
    refs.calcinha.classList.toggle("hidden", !calcinha);
    refs.titulo.textContent = calcinha ? "Adicionar OP de Calcinha" : "Adicionar OP de Sutiã";
    refs.descricao.textContent = calcinha
      ? "Informe OP, referência, cor e quantidade. Necessidade, serviço e facção são opcionais."
      : "Informe OP, referência, cor e quantidade. Necessidade é opcional.";

    refs.tabs.forEach(botao => {
      const ativo = botao.dataset.v2Tipo === refs.tipo.value;
      botao.classList.toggle("btn-primary", ativo);
      botao.setAttribute("aria-selected", ativo ? "true" : "false");
    });

    [refs.necessidadeInicio, refs.necessidadeFim, refs.processo, refs.faccao]
      .forEach(campo => { campo.disabled = !calcinha; });
    if (calcinha) refs.faccao.disabled = !refs.processo.value;

    if (!calcinha && limparExclusivos) {
      refs.necessidadeInicio.value = "";
      refs.necessidadeFim.value = "";
      refs.processo.value = "";
      preencherFaccoesSelect(refs.faccao, [], "");
    }
  }

  function atualizarFaccoes(valorAtual = "") {
    if (refs.tipo.value !== TIPO_CALCINHA || !refs.processo.value) {
      preencherFaccoesSelect(refs.faccao, [], valorAtual);
      return;
    }
    preencherFaccoesSelect(
      refs.faccao,
      controller.listarFaccoes(refs.processo.value),
      valorAtual
    );
  }

  function limparFormulario({ manterTipo = true, limparStatus = true } = {}) {
    const tipo = manterTipo ? refs.tipo.value : TIPO_SUTIA;
    resetInterno = true;
    try {
      form.reset();
    } finally {
      resetInterno = false;
    }
    refs.currentId.value = "";
    refs.numeroOP.readOnly = false;
    aplicarTipo(tipo || TIPO_SUTIA, { limparExclusivos: true });
    if (limparStatus) definirStatusOrdens(refs.status, "", "normal");
  }

  function preencherEdicao(ordem) {
    if (!ordem) return;
    const tipo = tipoPecaDoDocumento(ordem);
    aplicarTipo(tipo, { limparExclusivos: false });
    refs.currentId.value = ordem.id || "";
    refs.numeroOP.value = ordem.numeroOP || ordem.numeroOPExterno || ordem.op || "";
    refs.numeroOP.readOnly = true;
    refs.referencia.value = ordem.referencia || "";
    refs.cor.value = ordem.cor || "";
    refs.quantidade.value = Number(ordem.quantidade || 0) || "";
    refs.necessidadeTexto.value = ordem.necessidadeTexto || ordem.necessidade || "";
    refs.observacoes.value = ordem.observacoes || "";

    if (tipo === TIPO_CALCINHA) {
      refs.necessidadeInicio.value = ordem.necessidadeInicio || "";
      refs.necessidadeFim.value = ordem.necessidadeFim || "";
      refs.processo.value = ordem.processoPlanejado || "";
      atualizarFaccoes(ordem.faccaoPlanejada || "");
    }

    definirStatusOrdens(refs.status, `Editando OP ${refs.numeroOP.value}.`, "normal");
    form.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function renderLista() {
    const termo = normalizar(refs.busca.value);
    const itens = controller.listar(refs.tipo.value).filter(item => {
      if (!termo) return true;
      return normalizar([
        item.numeroOP,
        item.numeroOPExterno,
        item.referencia,
        item.cor,
        item.necessidadeTexto,
        item.necessidade
      ].join(" ")).includes(termo);
    });
    refs.lista.innerHTML = htmlListaOrdens(itens);
  }

  refs.tabs.forEach(botao => {
    botao.addEventListener("click", () => {
      limparFormulario({ manterTipo: false });
      aplicarTipo(botao.dataset.v2Tipo === TIPO_CALCINHA ? TIPO_CALCINHA : TIPO_SUTIA);
      renderLista();
    }, { signal });
  });

  refs.processo.addEventListener("change", () => atualizarFaccoes(), { signal });
  refs.busca.addEventListener("input", renderLista, { signal });
  refs.lista.addEventListener("click", event => {
    const botao = event.target instanceof Element
      ? event.target.closest("[data-v2-editar-ordem]")
      : null;
    if (botao) preencherEdicao(controller.selecionarParaEdicao(botao.dataset.v2EditarOrdem));
  }, { signal });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const entrada = entradaOrdemDoForm(form);
    refs.submit.disabled = true;
    const textoAnterior = refs.submit.textContent;
    refs.submit.textContent = "Salvando...";

    try {
      const resultado = await controller.salvar({
        entrada,
        currentId: refs.currentId.value,
        usuario: obterUsuario(),
        confirmarConversao: async (conflito, dados) => {
          if (typeof confirmarConversao === "function") {
            return Boolean(await confirmarConversao(conflito, dados));
          }
          return window.confirm(
            `A OP ${dados.numeroOP} já existe classificada como Sutiã.\n\n` +
            "Deseja corrigir o mesmo registro para Calcinha? Nenhuma OP nova será criada."
          );
        }
      });

      if (resultado.canceladoPeloUsuario) {
        definirStatusOrdens(refs.status, "Conversão cancelada. Nenhum dado foi alterado.");
      } else if (!resultado.ok) {
        definirStatusOrdens(refs.status, mensagemErrosOrdens(resultado.erros), "erro");
      } else {
        const opSalva = resultado.salvo?.numeroOP || resultado.dados?.numeroOP || entrada.numeroOP;
        limparFormulario({ manterTipo: true, limparStatus: false });
        definirStatusOrdens(refs.status, `OP ${opSalva} salva com sucesso.`, "ok");
        renderLista();
      }
    } catch (error) {
      console.error("[V2] Falha ao salvar OP.", error);
      definirStatusOrdens(refs.status, "Não foi possível salvar a OP.", "erro");
    } finally {
      refs.submit.disabled = false;
      refs.submit.textContent = textoAnterior;
    }
  }, { signal });

  form.addEventListener("reset", event => {
    if (resetInterno) return;
    event.preventDefault();
    limparFormulario({ manterTipo: true });
    renderLista();
  }, { signal });

  const pararOrdens = store.assinar("ordens", renderLista);
  const pararFaccoes = store.assinar("faccoes", () => {
    if (refs.tipo.value === TIPO_CALCINHA && refs.processo.value) {
      atualizarFaccoes(refs.faccao.value);
    }
  });

  aplicarTipo(TIPO_SUTIA);
  renderLista();

  return {
    render: renderLista,
    editar: id => preencherEdicao(controller.selecionarParaEdicao(id)),
    desmontar() {
      abort.abort();
      pararOrdens();
      pararFaccoes();
      container.innerHTML = "";
    }
  };
}

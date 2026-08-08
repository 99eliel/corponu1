import { TIPO_CALCINHA, TIPO_SUTIA, tipoPecaDoDocumento } from "../core/ordens-regras.mjs";
import { normalizar, texto } from "../core/normalizacao.mjs";
import { templateOrdensV2 } from "./ordens-template.mjs";

const ERROS = Object.freeze({
  TIPO_PECA_INVALIDO: "Escolha Sutiã ou Calcinha.",
  OP_NAO_INFORMADA: "Informe o número da OP.",
  REFERENCIA_NAO_INFORMADA: "Informe a referência.",
  COR_NAO_INFORMADA: "Informe a cor.",
  QUANTIDADE_INVALIDA: "Informe uma quantidade válida.",
  NECESSIDADE_DATAS_INVALIDAS: "A data inicial da necessidade não pode ser maior que a final.",
  PROCESSO_CALCINHA_INVALIDO: "Escolha um serviço válido de Calcinha.",
  FACCAO_SEM_PROCESSO: "Escolha o serviço antes da facção.",
  PRODUTO_CALCINHA_NAO_ENCONTRADO: "Cadastre esta referência em Produtos → Calcinha antes de salvar a OP.",
  PRODUTO_SUTIA_NAO_ENCONTRADO: "Cadastre esta referência em Produtos → Sutiã antes de salvar a OP.",
  OP_DUPLICADA: "Esta OP já existe no sistema.",
  OP_CONFLITO_TIPO: "Esta OP já existe classificada como outro tipo de peça.",
  OP_CONFLITO_MULTIPLO: "Esta OP possui registros conflitantes e precisa ser conferida antes de continuar.",
  ORDEM_EDICAO_NAO_ENCONTRADA: "A OP que estava sendo editada não foi encontrada."
});

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mensagemErros(erros = []) {
  return [...new Set(erros || [])]
    .map(erro => ERROS[erro] || erro)
    .join(" ") || "Não foi possível salvar a OP.";
}

function status(elemento, mensagem, tipo = "normal") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.status = tipo;
}

function protegerWheel(input, signal) {
  input?.addEventListener("wheel", () => {
    if (document.activeElement === input) input.blur();
  }, { passive: true, signal });
}

function tipoLabel(tipo) {
  return tipo === TIPO_CALCINHA ? "Calcinha" : "Sutiã";
}

function preencherFaccoes(select, lista, valorAtual = "") {
  const atual = texto(valorAtual);
  select.innerHTML = '<option value="">Definir somente no envio</option>';

  lista.forEach(item => {
    const nome = texto(item.nome || item.razaoSocial || item.id);
    if (!nome) return;
    const option = document.createElement("option");
    option.value = nome;
    option.textContent = nome;
    select.appendChild(option);
  });

  select.disabled = lista.length === 0;
  if (atual && [...select.options].some(option => normalizar(option.value) === normalizar(atual))) {
    const encontrada = [...select.options].find(option => normalizar(option.value) === normalizar(atual));
    select.value = encontrada.value;
  }
}

function entradaDoForm(form) {
  const dados = new FormData(form);
  return {
    tipoPeca: texto(dados.get("tipoPeca")),
    numeroOP: texto(dados.get("numeroOP")),
    referencia: texto(dados.get("referencia")),
    cor: texto(dados.get("cor")),
    quantidade: Number(dados.get("quantidade") || 0),
    necessidadeTexto: texto(dados.get("necessidadeTexto")),
    necessidadeInicio: texto(dados.get("necessidadeInicio")),
    necessidadeFim: texto(dados.get("necessidadeFim")),
    processoPlanejado: texto(dados.get("processoPlanejado")),
    faccaoPlanejada: texto(dados.get("faccaoPlanejada")),
    observacoes: texto(dados.get("observacoes"))
  };
}

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
  const tipoInput = form.querySelector('[name="tipoPeca"]');
  const currentId = form.querySelector('[name="currentId"]');
  const numeroOP = form.querySelector('[name="numeroOP"]');
  const referencia = form.querySelector('[name="referencia"]');
  const cor = form.querySelector('[name="cor"]');
  const quantidade = form.querySelector('[name="quantidade"]');
  const necessidadeTexto = form.querySelector('[name="necessidadeTexto"]');
  const necessidadeInicio = form.querySelector('[name="necessidadeInicio"]');
  const necessidadeFim = form.querySelector('[name="necessidadeFim"]');
  const processo = form.querySelector('[name="processoPlanejado"]');
  const faccao = form.querySelector('[name="faccaoPlanejada"]');
  const observacoes = form.querySelector('[name="observacoes"]');
  const camposCalcinha = form.querySelector("[data-v2-calcinha-campos]");
  const titulo = form.querySelector("[data-v2-ordem-titulo]");
  const descricao = form.querySelector("[data-v2-ordem-descricao]");
  const statusEl = form.querySelector("[data-v2-ordem-status]");
  const submit = form.querySelector('button[type="submit"]');
  const lista = container.querySelector("[data-v2-ordens-lista]");
  const busca = container.querySelector("[data-v2-ordens-busca]");
  const tabs = [...container.querySelectorAll("[data-v2-tipo]")];

  protegerWheel(quantidade, signal);

  function aplicarTipo(tipo, { limparExclusivos = true } = {}) {
    const calcinha = tipo === TIPO_CALCINHA;
    tipoInput.value = calcinha ? TIPO_CALCINHA : TIPO_SUTIA;
    camposCalcinha.classList.toggle("hidden", !calcinha);
    titulo.textContent = calcinha ? "Adicionar OP de Calcinha" : "Adicionar OP de Sutiã";
    descricao.textContent = calcinha
      ? "Informe OP, referência, cor e quantidade. Necessidade, serviço e facção são opcionais."
      : "Informe OP, referência, cor e quantidade. Necessidade é opcional.";

    tabs.forEach(botao => {
      const ativo = botao.dataset.v2Tipo === tipoInput.value;
      botao.classList.toggle("btn-primary", ativo);
      botao.setAttribute("aria-selected", ativo ? "true" : "false");
    });

    for (const campo of [necessidadeInicio, necessidadeFim, processo, faccao]) {
      campo.disabled = !calcinha;
    }

    if (!calcinha && limparExclusivos) {
      necessidadeInicio.value = "";
      necessidadeFim.value = "";
      processo.value = "";
      faccao.innerHTML = '<option value="">Definir somente no envio</option>';
      faccao.value = "";
      faccao.disabled = true;
    }
  }

  function atualizarFaccoes(valorAtual = "") {
    if (tipoInput.value !== TIPO_CALCINHA || !processo.value) {
      preencherFaccoes(faccao, [], "");
      return;
    }
    preencherFaccoes(faccao, controller.listarFaccoes(processo.value), valorAtual);
  }

  function limparFormulario({ manterTipo = true } = {}) {
    const tipo = manterTipo ? tipoInput.value : TIPO_SUTIA;
    form.reset();
    currentId.value = "";
    numeroOP.readOnly = false;
    aplicarTipo(tipo || TIPO_SUTIA, { limparExclusivos: true });
    status(statusEl, "", "normal");
  }

  function preencherEdicao(ordem) {
    if (!ordem) return;
    const tipo = tipoPecaDoDocumento(ordem);
    aplicarTipo(tipo, { limparExclusivos: false });
    currentId.value = ordem.id || "";
    numeroOP.value = ordem.numeroOP || ordem.numeroOPExterno || ordem.op || "";
    numeroOP.readOnly = true;
    referencia.value = ordem.referencia || "";
    cor.value = ordem.cor || "";
    quantidade.value = Number(ordem.quantidade || 0) || "";
    necessidadeTexto.value = ordem.necessidadeTexto || ordem.necessidade || "";
    observacoes.value = ordem.observacoes || "";

    if (tipo === TIPO_CALCINHA) {
      necessidadeInicio.value = ordem.necessidadeInicio || "";
      necessidadeFim.value = ordem.necessidadeFim || "";
      processo.value = ordem.processoPlanejado || "";
      atualizarFaccoes(ordem.faccaoPlanejada || "");
    }

    status(statusEl, `Editando OP ${numeroOP.value}.`, "normal");
    form.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function renderLista() {
    const termo = normalizar(busca.value);
    const itens = controller.listar(tipoInput.value).filter(item => {
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

    lista.innerHTML = itens.length ? itens.map(item => `
      <tr data-v2-ordem-id="${escapar(item.id)}">
        <td>${escapar(item.numeroOP || item.numeroOPExterno || item.op || "-")}</td>
        <td>${escapar(tipoLabel(tipoPecaDoDocumento(item)))}</td>
        <td>${escapar(item.referencia || "-")}</td>
        <td>${escapar(item.cor || "-")}</td>
        <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
        <td>${escapar(item.necessidadeTexto || item.necessidade || "-")}</td>
        <td><button class="btn btn-sm" type="button" data-v2-editar-ordem="${escapar(item.id)}">Editar</button></td>
      </tr>
    `).join("") : '<tr><td colspan="7">Nenhuma OP carregada neste tipo.</td></tr>';
  }

  tabs.forEach(botao => {
    botao.addEventListener("click", () => {
      limparFormulario({ manterTipo: false });
      aplicarTipo(botao.dataset.v2Tipo === TIPO_CALCINHA ? TIPO_CALCINHA : TIPO_SUTIA);
      renderLista();
    }, { signal });
  });

  processo.addEventListener("change", () => atualizarFaccoes(), { signal });
  busca.addEventListener("input", renderLista, { signal });

  lista.addEventListener("click", event => {
    const alvo = event.target instanceof Element ? event.target.closest("[data-v2-editar-ordem]") : null;
    if (!alvo) return;
    preencherEdicao(controller.selecionarParaEdicao(alvo.dataset.v2EditarOrdem));
  }, { signal });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submit.disabled = true;
    const anteriorTexto = submit.textContent;
    submit.textContent = "Salvando...";

    try {
      const resultado = await controller.salvar({
        entrada: entradaDoForm(form),
        currentId: currentId.value,
        usuario: obterUsuario(),
        confirmarConversao: async (conflito, entrada) => {
          if (typeof confirmarConversao === "function") {
            return Boolean(await confirmarConversao(conflito, entrada));
          }
          return window.confirm(
            `A OP ${entrada.numeroOP} já existe classificada como Sutiã.\n\n` +
            "Deseja corrigir o mesmo registro para Calcinha? Nenhuma OP nova será criada."
          );
        }
      });

      if (resultado.canceladoPeloUsuario) {
        status(statusEl, "Conversão cancelada. Nenhum dado foi alterado.", "normal");
        return;
      }

      if (!resultado.ok) {
        status(statusEl, mensagemErros(resultado.erros), "erro");
        return;
      }

      const opSalva = resultado.salvo?.numeroOP || resultado.dados?.numeroOP || entradaDoForm(form).numeroOP;
      status(statusEl, `OP ${opSalva} salva com sucesso.`, "ok");
      limparFormulario({ manterTipo: true });
      renderLista();
    } catch (error) {
      console.error("[V2] Falha ao salvar OP.", error);
      status(statusEl, "Não foi possível salvar a OP.", "erro");
    } finally {
      submit.disabled = false;
      submit.textContent = anteriorTexto;
    }
  }, { signal });

  form.addEventListener("reset", event => {
    event.preventDefault();
    limparFormulario({ manterTipo: true });
    renderLista();
  }, { signal });

  const pararOrdens = store.assinar("ordens", renderLista);
  const pararFaccoes = store.assinar("faccoes", () => {
    if (tipoInput.value === TIPO_CALCINHA && processo.value) atualizarFaccoes(faccao.value);
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

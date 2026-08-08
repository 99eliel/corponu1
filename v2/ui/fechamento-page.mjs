import { PROCESSO_SUTIA_COMPLETO } from "../core/financeiro-regras.mjs";
import { processoCanonico, texto } from "../core/normalizacao.mjs";
import { templateFechamentoPagamento } from "./fechamento-template.mjs";

const MENSAGENS_ERRO = Object.freeze({
  OP_NAO_INFORMADA: "Informe o número da OP.",
  OP_NAO_ENCONTRADA: "OP não encontrada.",
  PROCESSO_INVALIDO: "Escolha um serviço válido.",
  RESPONSAVEL_NAO_INFORMADO: "Escolha quem fez o serviço.",
  COMPETENCIA_INVALIDA: "Informe a competência mensal.",
  QUANTIDADE_INVALIDA: "Informe uma quantidade válida.",
  QUANTIDADE_MAIOR_QUE_OP: "A quantidade informada é maior que a quantidade da OP.",
  LATERAL_NAO_INFORMADA: "Informe se a Lateral já foi feita.",
  BOJO_NAO_INFORMADO: "Informe se o Bojo já foi feito.",
  FECHO_NAO_INFORMADO: "Informe se o Fecho foi feito.",
  PONTO_LUZ_NAO_INFORMADO: "Informe se o Ponto de Luz foi feito.",
  VALOR_LATERAL_NAO_CADASTRADO: "A Lateral precisa de valor cadastrado para esta referência.",
  VALOR_BOJO_NAO_CADASTRADO: "O Bojo precisa de valor cadastrado para esta referência.",
  VALOR_UNITARIO_NAO_CADASTRADO: "Não existe valor cadastrado para este serviço e referência.",
  VALOR_BASE_NAO_CONFIGURADO: "O valor-base do Sutiã Completo não está configurado.",
  VALOR_REFERENCIA_ESPECIAL_NAO_CONFIGURADO: "O valor da referência especial não está configurado.",
  LANCAMENTO_DUPLICADO: "Este lançamento já existe. Para retrabalho legítimo, use outra ocorrência."
});

function competenciaAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function mensagemErros(erros = []) {
  const lista = [...new Set(erros || [])];
  if (!lista.length) return "Não foi possível concluir a operação.";
  return lista.map(erro => MENSAGENS_ERRO[erro] || erro).join(" ");
}

function setStatus(elemento, mensagem, tipo = "normal") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.status = tipo;
}

function renderResumo(elemento, op) {
  if (!elemento) return;
  if (!op) {
    elemento.textContent = "";
    elemento.classList.add("hidden");
    return;
  }

  const partes = [
    `OP ${texto(op.numeroOP || op.numeroOPExterno || op.op || op.id)}`,
    `Ref. ${texto(op.referencia) || "-"}`,
    `Cor ${texto(op.cor) || "-"}`,
    `Qtd. ${Number(op.quantidade || 0).toLocaleString("pt-BR")}`,
    texto(op.tipoPeca || op.tipoPecaPadrao || op.tipoPecaLabel || op.setor) || "-"
  ];

  elemento.textContent = partes.join(" • ");
  elemento.classList.remove("hidden");
}

function preencherResponsaveis(select, lista) {
  select.innerHTML = "";

  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = lista.length ? "Selecione" : "Nenhum responsável cadastrado para este serviço";
  select.appendChild(inicial);

  lista.forEach(item => {
    const option = document.createElement("option");
    option.value = texto(item.nome || item.razaoSocial || item.id);
    option.textContent = option.value;
    select.appendChild(option);
  });

  select.disabled = lista.length === 0;
}

function configurarComponentes(fieldset, processo) {
  const completo = processoCanonico(processo) === PROCESSO_SUTIA_COMPLETO;
  fieldset.classList.toggle("hidden", !completo);

  fieldset.querySelectorAll("select").forEach(select => {
    select.disabled = !completo;
    select.required = completo;
    if (!completo) select.value = "";
  });
}

function lerEntrada(form) {
  const dados = new FormData(form);
  const processo = texto(dados.get("processo"));
  const completo = processoCanonico(processo) === PROCESSO_SUTIA_COMPLETO;

  return {
    numeroOP: texto(dados.get("numeroOP")),
    processo,
    responsavel: texto(dados.get("responsavel")),
    competencia: texto(dados.get("competencia")),
    quantidade: Number(dados.get("quantidade") || 0),
    ocorrencia: Number(dados.get("ocorrencia") || 1),
    componentes: completo ? {
      lateral: texto(dados.get("lateral")) || null,
      bojo: texto(dados.get("bojo")) || null,
      fecho: texto(dados.get("fecho")) || null,
      pontoLuz: texto(dados.get("pontoLuz")) || null
    } : {},
    observacoes: texto(dados.get("observacoes"))
  };
}

function protegerNumeroContraWheel(input, signal) {
  input?.addEventListener("wheel", () => {
    if (document.activeElement === input) input.blur();
  }, { passive: true, signal });
}

export function montarTelaFechamento({
  container,
  controller,
  competenciaPadrao = competenciaAtual(),
  onSalvo = null
}) {
  if (!(container instanceof HTMLElement)) {
    throw new Error("Container inválido para Fechamento de Pagamentos V2.");
  }
  if (!controller) throw new Error("Controller de fechamento não configurado.");

  container.innerHTML = templateFechamentoPagamento({ competenciaPadrao });

  const abort = new AbortController();
  const { signal } = abort;
  const form = container.querySelector("[data-v2-fechamento-form]");
  const busca = container.querySelector("[data-v2-buscar-op]");
  const conferir = container.querySelector("[data-v2-conferir-valor]");
  const resumo = container.querySelector("[data-v2-resumo-op]");
  const preview = container.querySelector("[data-v2-preview]");
  const opInput = form.querySelector('[name="numeroOP"]');
  const processo = form.querySelector('[name="processo"]');
  const responsavel = form.querySelector('[name="responsavel"]');
  const quantidade = form.querySelector('[name="quantidade"]');
  const ocorrencia = form.querySelector('[name="ocorrencia"]');
  const componentes = form.querySelector("[data-v2-componentes]");
  const competencia = form.querySelector('[name="competencia"]');
  const submit = form.querySelector('button[type="submit"]');

  configurarComponentes(componentes, "");
  protegerNumeroContraWheel(quantidade, signal);
  protegerNumeroContraWheel(ocorrencia, signal);

  async function buscarOP() {
    const numeroOP = texto(opInput.value);
    if (!numeroOP) {
      controller.limparOP();
      renderResumo(resumo, null);
      setStatus(preview, MENSAGENS_ERRO.OP_NAO_INFORMADA, "erro");
      opInput.focus();
      return null;
    }

    busca.disabled = true;
    const textoAnterior = busca.textContent;
    busca.textContent = "Buscando...";

    try {
      const resultado = await controller.buscarOP(numeroOP);
      if (!resultado.ok) {
        renderResumo(resumo, null);
        setStatus(preview, mensagemErros(resultado.erros), "erro");
        return null;
      }

      renderResumo(resumo, resultado.op);
      quantidade.value = Number(resultado.op.quantidade || 0) || "";
      setStatus(preview, "OP localizada. Escolha o serviço e quem fez para conferir o valor.", "ok");
      return resultado.op;
    } catch (error) {
      console.error("[V2] Falha ao buscar OP no fechamento.", error);
      setStatus(preview, "Não foi possível buscar a OP.", "erro");
      return null;
    } finally {
      busca.disabled = false;
      busca.textContent = textoAnterior;
    }
  }

  processo.addEventListener("change", () => {
    const lista = controller.listarResponsaveis(processo.value);
    preencherResponsaveis(responsavel, lista);
    configurarComponentes(componentes, processo.value);
    setStatus(preview, lista.length
      ? "Responsáveis carregados. Confira os dados antes de adicionar ao fechamento."
      : "Nenhum responsável habilitado para este serviço.",
    lista.length ? "normal" : "erro");
  }, { signal });

  busca.addEventListener("click", buscarOP, { signal });

  opInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    buscarOP();
  }, { signal });

  conferir.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    conferir.disabled = true;
    const anterior = conferir.textContent;
    conferir.textContent = "Conferindo...";

    try {
      const resultado = await controller.preparar(lerEntrada(form));
      if (!resultado.ok) {
        setStatus(preview, mensagemErros(resultado.erros), "erro");
        return;
      }

      setStatus(
        preview,
        `Valor unitário: ${moeda(resultado.calculo.valorUnitario)} • Total: ${moeda(resultado.calculo.total)}`,
        "ok"
      );
    } catch (error) {
      console.error("[V2] Falha ao conferir fechamento.", error);
      setStatus(preview, "Não foi possível conferir o valor.", "erro");
    } finally {
      conferir.disabled = false;
      conferir.textContent = anterior;
    }
  }, { signal });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submit.disabled = true;
    const anterior = submit.textContent;
    submit.textContent = "Salvando...";

    try {
      const resultado = await controller.salvar(lerEntrada(form));
      if (!resultado.ok) {
        setStatus(preview, mensagemErros(resultado.erros), "erro");
        return;
      }

      setStatus(
        preview,
        `Lançamento adicionado: ${moeda(resultado.salvo.total)} • competência ${resultado.salvo.competencia}.`,
        "ok"
      );
      onSalvo?.(resultado.salvo, resultado);
    } catch (error) {
      console.error("[V2] Falha ao salvar fechamento.", error);
      setStatus(preview, "Não foi possível adicionar o lançamento.", "erro");
    } finally {
      submit.disabled = false;
      submit.textContent = anterior;
    }
  }, { signal });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      controller.limparOP();
      renderResumo(resumo, null);
      preencherResponsaveis(responsavel, []);
      configurarComponentes(componentes, "");
      competencia.value = competenciaPadrao;
      setStatus(preview, "Busque uma OP para iniciar o fechamento.", "normal");
    }, 0);
  }, { signal });

  return {
    desmontar() {
      abort.abort();
      controller.limparOP();
      container.innerHTML = "";
    },
    buscarOP
  };
}

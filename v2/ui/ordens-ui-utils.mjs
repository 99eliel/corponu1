import { TIPO_CALCINHA, tipoPecaDoDocumento } from "../core/ordens-regras.mjs";
import { normalizar, texto } from "../core/normalizacao.mjs";

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

export function mensagemErrosOrdens(erros = []) {
  return [...new Set(erros || [])]
    .map(erro => ERROS[erro] || erro)
    .join(" ") || "Não foi possível salvar a OP.";
}

export function definirStatusOrdens(elemento, mensagem, tipo = "normal") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.status = tipo;
}

export function protegerNumeroContraWheel(input, signal) {
  input?.addEventListener("wheel", () => {
    if (document.activeElement === input) input.blur();
  }, { passive: true, signal });
}

export function preencherFaccoesSelect(select, lista, valorAtual = "") {
  const atual = texto(valorAtual);
  select.innerHTML = '<option value="">Definir somente no envio</option>';

  for (const item of lista || []) {
    const nome = texto(item.nome || item.razaoSocial || item.id);
    if (!nome) continue;
    const option = document.createElement("option");
    option.value = nome;
    option.textContent = nome;
    select.appendChild(option);
  }

  let encontrada = atual
    ? [...select.options].find(option => normalizar(option.value) === normalizar(atual))
    : null;

  if (atual && !encontrada) {
    encontrada = document.createElement("option");
    encontrada.value = atual;
    encontrada.textContent = `${atual} (valor atual)`;
    encontrada.dataset.legadoAtual = "1";
    select.appendChild(encontrada);
  }

  select.disabled = (lista || []).length === 0 && !encontrada;
  if (encontrada) select.value = encontrada.value;
}

export function entradaOrdemDoForm(form) {
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

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tipoLabel(item) {
  return tipoPecaDoDocumento(item) === TIPO_CALCINHA ? "Calcinha" : "Sutiã";
}

export function htmlListaOrdens(itens = []) {
  if (!itens.length) {
    return '<tr><td colspan="7">Nenhuma OP carregada neste tipo.</td></tr>';
  }

  return itens.map(item => `
    <tr data-v2-ordem-id="${escapar(item.id)}">
      <td>${escapar(item.numeroOP || item.numeroOPExterno || item.op || "-")}</td>
      <td>${escapar(tipoLabel(item))}</td>
      <td>${escapar(item.referencia || "-")}</td>
      <td>${escapar(item.cor || "-")}</td>
      <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
      <td>${escapar(item.necessidadeTexto || item.necessidade || "-")}</td>
      <td><button class="btn btn-sm" type="button" data-v2-editar-ordem="${escapar(item.id)}">Editar</button></td>
    </tr>
  `).join("");
}

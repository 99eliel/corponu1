import { getManejoDaOrdemV2 } from "../core/manejo-regras.mjs";
import { normalizar, texto } from "../core/normalizacao.mjs";

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attr(valor) {
  return escapar(valor).replaceAll("`", "&#096;");
}

export function definirStatusManejo(elemento, mensagem, tipo = "normal") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.status = tipo;
}

export function manejoVisualDaOrdem(ordem, setor) {
  const manejo = getManejoDaOrdemV2(ordem, setor) || {};
  const calcinha = setor === "calcinha";
  return {
    necessidade: texto(ordem.necessidadeTexto ?? ordem.necessidade ?? manejo.necessidade),
    silkNome: texto(manejo.silkNome || manejo.silk),
    silkData: texto(manejo.silkData),
    tecidoNome: texto(manejo.tecidoNome || manejo.tecido),
    dataTecido: texto(manejo.dataTecido),
    faseBojo: texto(manejo.faseBojo ?? manejo.fase),
    faseLateral: texto(manejo.faseLateral),
    faccao: texto(manejo.faccao || (calcinha ? ordem.faccaoPlanejada : "")),
    chegada: texto(manejo.chegada),
    falta: Number(manejo.falta || 0),
    celu: texto(manejo.celu),
    observacoes: texto(manejo.observacoes)
  };
}

export function htmlLinhaManejo(ordem, setor) {
  const m = manejoVisualDaOrdem(ordem, setor);
  const id = attr(ordem.id);
  return `
    <tr data-v2-manejo-row="${id}">
      <td><strong>${escapar(ordem.numeroOP || ordem.numeroOPExterno || ordem.op || "-")}</strong></td>
      <td>${escapar(ordem.referencia || "-")}</td>
      <td>${escapar(ordem.cor || "-")}</td>
      <td>${Number(ordem.quantidade || 0).toLocaleString("pt-BR")}</td>
      <td><input data-campo="necessidade" value="${attr(m.necessidade)}" /></td>
      <td><input data-campo="silkNome" value="${attr(m.silkNome)}" /></td>
      <td><input data-campo="silkData" type="date" value="${attr(m.silkData)}" /></td>
      <td><input data-campo="tecidoNome" value="${attr(m.tecidoNome)}" /></td>
      <td><input data-campo="dataTecido" type="date" value="${attr(m.dataTecido)}" /></td>
      <td><input data-campo="faseBojo" list="v2ManejoFasesSugestoes" value="${attr(m.faseBojo)}" placeholder="Digite ou escolha" /></td>
      <td><input data-campo="faseLateral" list="v2ManejoFasesSugestoes" value="${attr(m.faseLateral)}" placeholder="Digite ou escolha" /></td>
      <td><input data-campo="faccao" value="${attr(m.faccao)}" /></td>
      <td><input data-campo="chegada" type="date" value="${attr(m.chegada)}" /></td>
      <td><input data-campo="falta" type="number" min="0" step="1" value="${Math.max(0, Number(m.falta || 0))}" /></td>
      <td><input data-campo="celu" value="${attr(m.celu)}" /></td>
      <td class="v2-manejo__acoes-row">
        <button class="btn btn-sm" type="button" data-v2-salvar-manejo="${id}">Salvar</button>
        <button class="btn btn-sm" type="button" data-v2-enviar-faccao="${id}">Enviar facção</button>
        <button class="btn btn-sm" type="button" data-v2-enviar-celula="${id}">Enviar célula</button>
      </td>
    </tr>
  `;
}

export function entradaManejoDaLinha(linha) {
  const valor = campo => texto(linha.querySelector(`[data-campo="${campo}"]`)?.value);
  const faseBojo = valor("faseBojo");
  return {
    necessidade: valor("necessidade"),
    silkNome: valor("silkNome"),
    silkData: valor("silkData"),
    tecidoNome: valor("tecidoNome"),
    dataTecido: valor("dataTecido"),
    // Alias fase mantido durante a transição para leitores antigos da V2.
    fase: faseBojo,
    faseBojo,
    faseLateral: valor("faseLateral"),
    faccao: valor("faccao"),
    chegada: valor("chegada"),
    falta: Number(valor("falta") || 0),
    celu: valor("celu"),
    observacoes: ""
  };
}

export function preencherSelect(elemento, itens, { placeholder = "Selecione", valor = "" } = {}) {
  elemento.innerHTML = "";
  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = placeholder;
  elemento.appendChild(inicial);

  for (const item of itens || []) {
    const valorItem = typeof item === "string" ? item : texto(item.nome || item.razaoSocial || item.id);
    if (!valorItem) continue;
    const option = document.createElement("option");
    option.value = valorItem;
    option.textContent = valorItem;
    option.dataset.id = typeof item === "object" ? texto(item.id) : "";
    elemento.appendChild(option);
  }

  const alvo = normalizar(valor);
  const encontrada = alvo
    ? [...elemento.options].find(option => normalizar(option.value) === alvo)
    : null;
  if (encontrada) elemento.value = encontrada.value;
  elemento.disabled = (itens || []).length === 0;
}

export function filtrosDoContainer(container) {
  return Object.fromEntries(
    [...container.querySelectorAll("[name]")].map(campo => [campo.name, campo.value])
  );
}

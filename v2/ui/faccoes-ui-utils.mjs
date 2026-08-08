import { quantidadeDisponivelReenvio } from "../core/faccoes-operacional-regras.mjs";
import { normalizar, texto } from "../core/normalizacao.mjs";

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dataLegivel(valor) {
  const textoData = texto(valor);
  const match = textoData.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (textoData || "-");
}

export function ehAdminPerfil(perfil = {}) {
  return normalizar(perfil.tipo) === "ADMIN";
}

export function definirStatusFaccoes(elemento, mensagem, tipo = "normal") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.status = tipo;
}

export function podeReenviarMovimentacao(mov = {}) {
  const chegou = mov.chegadaInformada === true || Boolean(texto(mov.dataChegada));
  const jaReenviou = mov.reenviadoOperacionalmente === true || Boolean(texto(mov.reenvioCriadoId));
  return chegou && !jaReenviou && quantidadeDisponivelReenvio(mov) > 0;
}

export function htmlLinhaFaccao(mov, controller, { admin = false } = {}) {
  const status = controller.statusChegada(mov);
  const acao = controller.acaoChegada(mov, { admin });
  const reenvio = podeReenviarMovimentacao(mov);
  const id = escapar(mov.id);

  const botaoChegada = acao.tipo === "informar"
    ? `<button class="btn btn-sm" type="button" data-v2-informar-chegada="${id}">Informar chegada</button>`
    : acao.tipo === "confirmar"
      ? `<button class="btn btn-sm" type="button" data-v2-confirmar-chegada="${id}">Confirmar chegada</button>`
      : `<button class="btn btn-sm" type="button" disabled>${escapar(acao.rotulo)}</button>`;

  const botaoReenvio = reenvio
    ? `<button class="btn btn-sm" type="button" data-v2-reenviar-faccao="${id}">Reenviar</button>`
    : "";

  return `
    <tr data-v2-faccao-row="${id}">
      <td><strong>${escapar(mov.numeroOP || "-")}</strong></td>
      <td>${escapar(mov.referencia || "-")}</td>
      <td>${escapar(mov.cor || "-")}</td>
      <td>${escapar(mov.processo || "-")}</td>
      <td>${escapar(mov.destino || "-")}</td>
      <td>${Number(mov.quantidadeEnviada || 0).toLocaleString("pt-BR")}</td>
      <td>${escapar(dataLegivel(mov.dataEnvio))}</td>
      <td data-v2-status-chegada="${id}">${escapar(status.rotulo)}</td>
      <td>${Number(mov.quantidadeRecebida || 0).toLocaleString("pt-BR")}</td>
      <td>${Number(mov.falta || 0).toLocaleString("pt-BR")}</td>
      <td>${Number(mov.defeito || 0).toLocaleString("pt-BR")}</td>
      <td class="v2-faccoes__acoes-row">${botaoChegada}${botaoReenvio}</td>
    </tr>
  `;
}

const ROTULOS_COMPONENTES = Object.freeze({
  lateral: "Lateral já foi feita?",
  bojo: "Bojo já foi feito?",
  fecho: "Fecho foi feito?",
  pontoLuz: "Ponto de luz foi feito?"
});

export function htmlCamposComponentesFaltantes(faltantes = []) {
  return (faltantes || []).map(nome => {
    const responsavel = ["lateral", "bojo"].includes(nome)
      ? `
        <label class="hidden" data-v2-responsavel-wrapper="${escapar(nome)}">
          Quem fez ${escapar(nome === "lateral" ? "a Lateral" : "o Bojo")}?
          <input type="text" name="${escapar(nome)}Responsavel" autocomplete="off" />
        </label>
      `
      : "";

    return `
      <div class="v2-chegada__componente" data-v2-componente="${escapar(nome)}">
        <label>
          ${escapar(ROTULOS_COMPONENTES[nome] || nome)}
          <select name="${escapar(nome)}" required>
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
        ${responsavel}
      </div>
    `;
  }).join("");
}

export function respostasComponentesDoForm(form) {
  const dados = new FormData(form);
  const respostas = {};
  for (const nome of ["lateral", "bojo", "fecho", "pontoLuz"]) {
    if (!form.elements.namedItem(nome)) continue;
    respostas[nome] = texto(dados.get(nome));
    const responsavel = texto(dados.get(`${nome}Responsavel`));
    if (responsavel) respostas[`${nome}Responsavel`] = responsavel;
  }
  return respostas;
}

export function preencherSelectFaccoes(select, itens, { placeholder = "Selecione", valor = "" } = {}) {
  select.innerHTML = "";
  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = placeholder;
  select.appendChild(inicial);

  for (const item of itens || []) {
    const nome = typeof item === "string" ? item : texto(item.nome || item.razaoSocial || item.id);
    if (!nome) continue;
    const option = document.createElement("option");
    option.value = nome;
    option.textContent = nome;
    option.dataset.id = typeof item === "object" ? texto(item.id) : "";
    select.appendChild(option);
  }

  const alvo = normalizar(valor);
  const encontrada = alvo
    ? [...select.options].find(option => normalizar(option.value) === alvo)
    : null;
  if (encontrada) select.value = encontrada.value;
  select.disabled = (itens || []).length === 0;
}

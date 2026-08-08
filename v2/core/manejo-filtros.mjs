import { getManejoDaOrdemV2, setorManejoCanonico } from "./manejo-regras.mjs";
import { normalizar, texto } from "./normalizacao.mjs";

function n(valor) {
  return normalizar(valor);
}

function numero(valor) {
  const convertido = Number(valor || 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

export function statusManejoDaOrdem(ordem, setor) {
  const chave = setorManejoCanonico(setor);
  const manejo = getManejoDaOrdemV2(ordem, chave);
  return texto(
    ordem?.manejoStatusSetores?.[chave] ||
    manejo?.status ||
    "pendente"
  ).toLowerCase();
}

export function valoresFiltroManejo(ordem, setor) {
  const manejo = getManejoDaOrdemV2(ordem, setor) || {};
  return {
    op: texto(ordem?.numeroOP || ordem?.numeroOPExterno || ordem?.op),
    referencia: texto(ordem?.referencia),
    cor: texto(ordem?.cor),
    quantidade: numero(ordem?.quantidade),
    necessidade: texto(ordem?.necessidadeTexto ?? ordem?.necessidade ?? manejo?.necessidade),
    status: statusManejoDaOrdem(ordem, setor),
    silk: texto(manejo?.silkNome || manejo?.silk),
    silkData: texto(manejo?.silkData),
    tecido: texto(manejo?.tecidoNome || manejo?.tecido),
    dataTecido: texto(manejo?.dataTecido),
    fase: texto(manejo?.fase),
    faccao: texto(manejo?.faccao),
    chegada: texto(manejo?.chegada),
    falta: numero(manejo?.falta),
    celu: texto(manejo?.celu),
    observacoes: texto(manejo?.observacoes)
  };
}

function igualSeAtivo(valor, filtro) {
  const alvo = n(filtro);
  return !alvo || n(valor) === alvo;
}

function contemSeAtivo(valor, filtro) {
  const alvo = n(filtro);
  return !alvo || n(valor).includes(alvo);
}

function numeroSeAtivo(valor, filtro) {
  if (filtro === "" || filtro === null || filtro === undefined) return true;
  const alvo = Number(filtro);
  return Number.isFinite(alvo) && Number(valor) === alvo;
}

export function ordemPassaFiltrosManejo(ordem, setor, filtros = {}) {
  const v = valoresFiltroManejo(ordem, setor);
  const busca = n(filtros.busca);

  if (busca) {
    const textoBusca = n([
      v.op,
      v.referencia,
      v.cor,
      v.quantidade,
      v.necessidade,
      v.status,
      v.silk,
      v.silkData,
      v.tecido,
      v.dataTecido,
      v.fase,
      v.faccao,
      v.chegada,
      v.falta,
      v.celu,
      v.observacoes
    ].join(" "));
    if (!textoBusca.includes(busca)) return false;
  }

  if (!igualSeAtivo(v.status, filtros.status)) return false;
  if (!contemSeAtivo(v.op, filtros.op)) return false;
  if (!igualSeAtivo(v.referencia, filtros.referencia)) return false;
  if (!igualSeAtivo(v.cor, filtros.cor)) return false;
  if (!numeroSeAtivo(v.quantidade, filtros.quantidade)) return false;
  if (!contemSeAtivo(v.necessidade, filtros.necessidade)) return false;
  if (!igualSeAtivo(v.silk, filtros.silk)) return false;
  if (!igualSeAtivo(v.silkData, filtros.silkData)) return false;
  if (!igualSeAtivo(v.tecido, filtros.tecido)) return false;
  if (!igualSeAtivo(v.dataTecido, filtros.dataTecido)) return false;
  if (!igualSeAtivo(v.fase, filtros.fase)) return false;
  if (!igualSeAtivo(v.faccao, filtros.faccao)) return false;
  if (!igualSeAtivo(v.chegada, filtros.chegada)) return false;
  if (!numeroSeAtivo(v.falta, filtros.falta)) return false;
  if (!igualSeAtivo(v.celu, filtros.celu)) return false;

  return true;
}

export function filtrarOrdensManejo(ordens = [], setor, filtros = {}) {
  return (ordens || []).filter(ordem => ordemPassaFiltrosManejo(ordem, setor, filtros));
}

export function opcoesFiltrosManejo(ordens = [], setor) {
  const registros = (ordens || []).map(ordem => valoresFiltroManejo(ordem, setor));
  const unicos = campo => [...new Set(registros.map(item => texto(item[campo])).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  return {
    status: unicos("status"),
    referencia: unicos("referencia"),
    cor: unicos("cor"),
    necessidade: unicos("necessidade"),
    silk: unicos("silk"),
    dataTecido: unicos("dataTecido"),
    fase: unicos("fase"),
    faccao: unicos("faccao"),
    chegada: unicos("chegada"),
    celu: unicos("celu")
  };
}

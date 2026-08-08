import {
  DESTINO_FACCAO,
  processoPermitidoNoManejo,
  setorManejoCanonico
} from "./manejo-regras.mjs";
import { inteiro, normalizar, processoCanonico, texto } from "./normalizacao.mjs";

const STATUS_BLOQUEADOS = new Set([
  "FINALIZADO",
  "FINALIZADA",
  "CANCELADO",
  "CANCELADA",
  "EXCLUIDO",
  "EXCLUIDA"
]);

export function movimentacaoFaccaoAtiva(mov = {}) {
  const tipo = normalizar(mov.tipoDestino || mov.tipo);
  if (tipo !== "FACCAO") return false;
  if (mov.excluida === true || mov.excluido === true) return false;
  return !STATUS_BLOQUEADOS.has(normalizar(mov.status));
}

export function podeInformarChegada(mov = {}) {
  if (!movimentacaoFaccaoAtiva(mov)) return false;
  if (texto(mov.dataChegada)) return false;
  if (mov.chegadaInformada === true) return false;
  return true;
}

export function criarPatchAvisoChegada({ movimentacao, usuario = {}, dataHoje = "" } = {}) {
  if (!movimentacao?.id) return { ok: false, erros: ["MOVIMENTACAO_NAO_ENCONTRADA"], patch: null };
  if (!podeInformarChegada(movimentacao)) {
    return { ok: false, erros: ["CHEGADA_NAO_PODE_SER_INFORMADA"], patch: null };
  }

  const nome = texto(usuario.nome || usuario.email || "Usuário");
  return {
    ok: true,
    erros: [],
    patch: {
      chegadaInformada: true,
      chegadaInformadaStatus: "aguardando_confirmacao_admin",
      chegadaInformadaData: texto(dataHoje),
      chegadaInformadaPor: texto(usuario.uid),
      chegadaInformadaPorNome: nome,
      chegadaInformadaPorEmail: texto(usuario.email),
      statusOperacional: "chegada_informada"
    }
  };
}

export function validarConfirmacaoChegada({
  movimentacao,
  dataChegada,
  falta = 0,
  defeito = 0
} = {}) {
  const erros = [];
  if (!movimentacao?.id) erros.push("MOVIMENTACAO_NAO_ENCONTRADA");
  if (movimentacao?.id && !movimentacaoFaccaoAtiva(movimentacao)) erros.push("MOVIMENTACAO_NAO_ACEITA_CHEGADA");
  if (texto(movimentacao?.dataChegada)) erros.push("CHEGADA_JA_CONFIRMADA");
  if (!texto(dataChegada)) erros.push("DATA_CHEGADA_NAO_INFORMADA");

  const enviada = inteiro(movimentacao?.quantidadeEnviada || movimentacao?.quantidade);
  const qtdFalta = inteiro(falta);
  const qtdDefeito = inteiro(defeito);
  if (qtdFalta + qtdDefeito > enviada) erros.push("FALTA_DEFEITO_MAIOR_QUE_ENVIADO");

  return {
    ok: erros.length === 0,
    erros: [...new Set(erros)],
    dados: {
      quantidadeEnviada: enviada,
      falta: qtdFalta,
      defeito: qtdDefeito,
      quantidadeRecebida: Math.max(enviada - qtdFalta - qtdDefeito, 0),
      dataChegada: texto(dataChegada)
    }
  };
}

function componenteEntrada(valor) {
  if (valor === true || normalizar(valor) === "SIM") return { informado: true, pronto: true };
  if (valor === false || normalizar(valor) === "NAO") return { informado: true, pronto: false };
  return null;
}

export function componentesOperacionaisPatch(componentes = {}) {
  const patch = {};
  for (const nome of ["lateral", "bojo", "fecho", "pontoLuz"]) {
    const item = componenteEntrada(componentes[nome]);
    if (!item) continue;
    patch[nome] = {
      ...item,
      origem: "chegada_operacional_v2",
      responsavel: texto(componentes[`${nome}Responsavel`])
    };
  }
  return patch;
}

export function criarPatchConfirmacaoChegada({
  movimentacao,
  dataChegada,
  falta = 0,
  defeito = 0,
  usuario = {},
  componentes = {}
} = {}) {
  const validacao = validarConfirmacaoChegada({ movimentacao, dataChegada, falta, defeito });
  if (!validacao.ok) return { ...validacao, patch: null };

  const componentesPatch = componentesOperacionaisPatch(componentes);
  const patch = {
    dataChegada: validacao.dados.dataChegada,
    falta: validacao.dados.falta,
    defeito: validacao.dados.defeito,
    quantidadeRecebida: validacao.dados.quantidadeRecebida,
    status: "retornou",
    chegadaInformada: false,
    chegadaInformadaStatus: "confirmada_admin",
    confirmacaoChegadaOperacional: true,
    chegadaConfirmadaPor: texto(usuario.uid),
    chegadaConfirmadaPorNome: texto(usuario.nome || usuario.email || "Administrador"),
    statusOperacional: movimentacao.reenviadoOperacionalmente
      ? "chegada_confirmada_reenviada"
      : "chegada_confirmada"
  };

  if (Object.keys(componentesPatch).length) {
    patch.componentesConsolidados = componentesPatch;
  }

  return { ok: true, erros: [], dados: validacao.dados, patch };
}

export function quantidadeDisponivelReenvio(mov = {}) {
  const recebida = inteiro(mov.quantidadeRecebida);
  if (texto(mov.dataChegada)) return recebida;
  return Math.max(
    inteiro(mov.quantidadeEnviada || mov.quantidade) - inteiro(mov.falta) - inteiro(mov.defeito),
    0
  );
}

export function validarReenvioOperacional({
  movimentacao,
  processo,
  destino,
  quantidade,
  dataEnvio
} = {}) {
  const erros = [];
  if (!movimentacao?.id) erros.push("MOVIMENTACAO_NAO_ENCONTRADA");
  if (movimentacao?.id && normalizar(movimentacao.tipoDestino) !== "FACCAO") erros.push("REENVIO_ORIGEM_NAO_FACCAO");
  if (!movimentacao?.chegadaInformada && !texto(movimentacao?.dataChegada)) erros.push("REENVIO_ANTES_DA_CHEGADA");
  if (movimentacao?.reenviadoOperacionalmente || texto(movimentacao?.reenvioCriadoId)) erros.push("REENVIO_JA_CRIADO");

  const setor = setorManejoCanonico(movimentacao?.setor || movimentacao?.setorLabel || movimentacao?.tipoPeca);
  const processoFinal = processoCanonico(processo);
  if (!processoPermitidoNoManejo(processoFinal, setor, DESTINO_FACCAO)) erros.push("PROCESSO_NAO_PERMITIDO");
  if (!texto(destino)) erros.push("DESTINO_NAO_INFORMADO");
  if (!texto(dataEnvio)) erros.push("DATA_ENVIO_NAO_INFORMADA");

  const disponivel = quantidadeDisponivelReenvio(movimentacao);
  const qtd = inteiro(quantidade);
  if (qtd <= 0) erros.push("QUANTIDADE_INVALIDA");
  if (qtd > disponivel) erros.push("QUANTIDADE_MAIOR_QUE_DISPONIVEL");

  return {
    ok: erros.length === 0,
    erros: [...new Set(erros)],
    dados: {
      setor,
      processo: processoFinal,
      destino: texto(destino).toUpperCase(),
      quantidade: qtd,
      quantidadeDisponivel: disponivel,
      dataEnvio: texto(dataEnvio)
    }
  };
}

export function criarDadosReenvioOperacional({
  movimentacao,
  processo,
  destino,
  destinoId = "",
  quantidade,
  dataEnvio
} = {}) {
  const validacao = validarReenvioOperacional({ movimentacao, processo, destino, quantidade, dataEnvio });
  if (!validacao.ok) return { ...validacao, dadosMovimentacao: null, patchOrigem: null };
  const d = validacao.dados;

  return {
    ok: true,
    erros: [],
    dados: d,
    dadosMovimentacao: {
      origem: "movimentacao",
      movimentacaoOrigemId: movimentacao.id,
      opId: texto(movimentacao.opId),
      numeroOP: texto(movimentacao.numeroOP),
      referencia: texto(movimentacao.referencia),
      cor: texto(movimentacao.cor),
      produtoNome: texto(movimentacao.produtoNome),
      tipoDestino: "faccao",
      tipoDestinoLabel: "Facção",
      destino: d.destino,
      destinoId: texto(destinoId),
      processo: d.processo,
      setor: d.setor,
      setorLabel: d.setor === "calcinha" ? "Calcinha" : "Sutiã",
      quantidadeEnviada: d.quantidade,
      dataEnvio: d.dataEnvio,
      dataChegada: "",
      falta: 0,
      defeito: 0,
      quantidadeRecebida: 0,
      status: "em_andamento",
      reenvio: true,
      reenvioOperacional: true
    },
    patchOrigem: {
      reenviadoOperacionalmente: true,
      statusOperacional: "reenviado_apos_aviso_chegada",
      status: "encaminhado",
      encaminhado: true
    }
  };
}

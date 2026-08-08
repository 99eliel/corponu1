import test from "node:test";
import assert from "node:assert/strict";

import { normalizarOPLegada } from "../core/op-normalizador.mjs";
import { contratoOPV2Valido } from "../core/op-contrato.mjs";
import {
  componentesFaltantesOperacionais,
  estadoComponentesOperacionais
} from "../core/componentes-operacionais.mjs";

function op912Realista() {
  return {
    id: "57399",
    numeroOP: "57399",
    referencia: "912",
    cor: "BLUSH",
    quantidade: 252,
    status: "aberta",
    produtoNome: "Referência 912",
    ano: 2026,
    possuiAlca: false,
    possuiBojo: true,
    possuiRenda: false,
    necessidade: "SEM NECESSIDADE",
    necessidadeTexto: "SEM NECESSIDADE",
    manejosSetores: {
      sutia: {
        setor: "sutia",
        setorLabel: "Sutiã",
        status: "organizada",
        fase: "BIPADOS",
        silk: "",
        silkData: "",
        tecido: "",
        dataTecido: "",
        faccao: "",
        chegada: "",
        falta: 0,
        celu: ""
      }
    }
  };
}

test("normaliza OP 912 realista: fase antiga vira Fase Bojo e Fase Lateral nasce vazia", () => {
  const op = normalizarOPLegada(op912Realista());

  assert.equal(op.numeroOP, "57399");
  assert.equal(op.referencia, "912");
  assert.equal(op.tipoPeca, "sutia");
  assert.equal(op.quantidade, 252);
  assert.equal(op.manejo.faseBojo, "BIPADOS");
  assert.equal(op.manejo.faseLateral, "");
  assert.equal("faccao" in op.manejo, false);
  assert.equal("chegada" in op.manejo, false);
  assert.equal("falta" in op.manejo, false);
  assert.equal("celu" in op.manejo, false);
  assert.equal("possuiAlca" in op, false);
  assert.equal("possuiBojo" in op, false);
  assert.equal("possuiRenda" in op, false);
  assert.equal(contratoOPV2Valido(op).ok, true);
});

test("normaliza Calcinha legada preservando linha e fase antiga sem criar Fase Lateral", () => {
  const op = normalizarOPLegada({
    id: "calc-hist-0014",
    numeroOP: "29054",
    referencia: "2003",
    cor: "SATIN",
    quantidade: 120,
    tipoPeca: "calcinha",
    status: "aberta",
    linhaCalcinha: "cotton_line",
    processoPlanejado: "",
    faccaoPlanejada: "",
    planejamentoCalcinhaPendente: true,
    necessidadeTexto: "URGENTE",
    manejosSetores: {
      calcinha: {
        setor: "calcinha",
        status: "organizada",
        fase: "PROD. COTTON",
        silk: "",
        dataTecido: ""
      }
    }
  });

  assert.equal(op.tipoPeca, "calcinha");
  assert.equal(op.manejo.faseBojo, "PROD. COTTON");
  assert.equal(op.manejo.faseLateral, "");
  assert.deepEqual(op.planejamentoCalcinha, {
    linha: "cotton_line",
    processo: "",
    faccao: "",
    pendente: true
  });
});

test("preserva componentesConsolidados reais com quantidade, status, origem e responsável", () => {
  const op = normalizarOPLegada({
    id: "57899",
    numeroOP: "57899",
    referencia: "414",
    cor: "PRETO",
    quantidade: 480,
    tipoPeca: "sutia",
    componentesConsolidados: {
      bojo: {
        responsavel: "",
        quantidadePronta: 0,
        quantidadeTotal: 480,
        status: "nao_pronto",
        informado: true,
        origem: "Revisão manual",
        origemLabel: "Revisão manual",
        pronto: false
      },
      lateral: {
        responsavel: "LIVIA",
        quantidadePronta: 480,
        quantidadeTotal: 480,
        status: "pronto",
        informado: true,
        origem: "Revisão manual",
        origemLabel: "Revisão manual",
        pronto: true
      }
    }
  });

  assert.equal(op.componentes.bojo.informado, true);
  assert.equal(op.componentes.bojo.pronto, false);
  assert.equal(op.componentes.bojo.quantidadePronta, 0);
  assert.equal(op.componentes.bojo.quantidadeTotal, 480);
  assert.equal(op.componentes.lateral.pronto, true);
  assert.equal(op.componentes.lateral.responsavel, "LIVIA");
  assert.equal(op.componentes.lateral.quantidadePronta, 480);
  assert.equal(op.componentes.lateral.origem, "Revisão manual");
});

test("reconhece revisão manual antiga achatada de Lateral e Bojo", () => {
  const estado = estadoComponentesOperacionais({
    ordem: {
      referencia: "5229",
      quantidade: 300,
      revisaoComponentesConfeccao: {
        ativa: true,
        lateralFeita: true,
        lateralResponsavel: "NAGILA",
        lateralFeitaPorNome: "NAGILA",
        bojoFeito: false,
        bojoResponsavel: ""
      }
    }
  });

  assert.equal(estado.lateral.informado, true);
  assert.equal(estado.lateral.pronto, true);
  assert.equal(estado.lateral.responsavel, "NAGILA");
  assert.equal(estado.lateral.quantidadePronta, 300);
  assert.equal(estado.bojo.informado, true);
  assert.equal(estado.bojo.pronto, false);
  assert.equal(estado.bojo.quantidadePronta, 0);
});

test("revisão antiga cancelada/inativa não vale como estado atual", () => {
  const estado = estadoComponentesOperacionais({
    ordem: {
      referencia: "411",
      quantidade: 200,
      revisaoComponentesConfeccao: {
        ativa: false,
        lateralFeita: false,
        lateralResponsavel: "MOCINHA",
        bojoFeito: false
      }
    }
  });

  assert.equal(estado.lateral.informado, false);
  assert.equal(estado.bojo.informado, false);
});

test("referência especial 912 não exige perguntas de componentes", () => {
  const faltantes = componentesFaltantesOperacionais({ ordem: op912Realista() });
  assert.deepEqual(faltantes, []);
});

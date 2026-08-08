import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { executarDiagnosticoFirebaseSomenteLeitura } from "../diagnostico/firebase-readonly.mjs";
import { criarStoreCorpoNu } from "../core/store.mjs";

function doc(id, dados) {
  return { id, data: () => ({ ...dados }) };
}

function criarContexto({ configInvalida = false } = {}) {
  const store = criarStoreCorpoNu();
  const ordem = {
    id: "op-70001",
    numeroOP: "70001",
    referencia: "414",
    cor: "PRETO",
    quantidade: 500,
    tipoPeca: "sutia",
    status: "aberta"
  };

  const fs = {
    collection(_db, nome) { return { nome }; },
    query(ref, ...restricoes) { return { ref, restricoes }; },
    limit(valor) { return { tipo: "limit", valor }; },
    async getDocs() {
      return {
        docs: [
          doc("p1", { referencia: "414", processo: "SUTIÃ MONTAGEM", valor: 1.2, ativo: true }),
          doc("p2", { referencia: "TODAS", processo: "ALÇA", valor: 0.2, ativo: true })
        ]
      };
    }
  };

  return {
    db: { fake: true },
    fs,
    store,
    async carregarPrimeiraPaginaOrdens() {
      store.mesclar("ordens", [ordem]);
      return [ordem];
    },
    async garantirFaccoes() {
      store.mesclar("faccoes", [{ id: "f1", nome: "LIVIA", ativo: true }]);
      return store.listar("faccoes");
    },
    movimentacoesFaccoesRepo: {
      async carregarPrimeiraPagina() {
        return {
          itens: [{ id: "m1", numeroOP: "70001", processo: "SUTIÃ MONTAGEM" }],
          lidos: 1,
          acabou: true,
          totalNoStore: 1
        };
      }
    },
    repositoriosFinanceiro: {
      valoresRepo: {
        async buscarConfiguracaoSutiaCompleto() {
          return configInvalida
            ? { referenciaEspecial: "999", valorBaseGeral: 0, valorBaseReferenciaEspecial: 0 }
            : { referenciaEspecial: "912", valorBaseGeral: 5.5, valorBaseReferenciaEspecial: 6.5 };
        },
        async buscarValorUnitario(referencia, processo) {
          return referencia === "TODAS" && processo === "ALÇA" ? 0.2 : 0;
        }
      },
      pagamentosRepo: {
        async obterSaldoProcesso() {
          return { quantidadeFechada: 200, quantidadeRestante: 300 };
        }
      }
    },
    pagamentosConsultaRepo: {
      async carregarPrimeiraPagina() {
        return [{ id: "pag-1", numeroOP: "70001", total: 240, statusPagamento: "pendente" }];
      }
    }
  };
}

async function medir(_id, acao) {
  return {
    resultado: await acao(),
    leituras: { getDoc: 0, getDocs: 1, documentos: 1 }
  };
}

test("diagnóstico read-only percorre todas as áreas críticas e não encontra erro no cenário compatível", async () => {
  const resultado = await executarDiagnosticoFirebaseSomenteLeitura({
    contexto: criarContexto(),
    medir
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.etapas.length, 7);
  assert.deepEqual(resultado.etapas.map(item => item.id), [
    "ordens",
    "faccoes",
    "movimentacoes",
    "config-sutia",
    "precos",
    "pagamentos",
    "saldo-fechamento"
  ]);
  assert.equal(resultado.resumo.erro, 0);
  assert.equal(resultado.resumo.documentosLidos, 7);
  assert.match(resultado.etapas.find(item => item.id === "ordens").mensagem, /1 OPs avaliadas/);
  assert.match(resultado.etapas.find(item => item.id === "movimentacoes").mensagem, /1 movimentações de Facção reconhecidas/);
});

test("diagnóstico reaproveita OPs já carregadas no store sem pedir a primeira página novamente", async () => {
  const contexto = criarContexto();
  contexto.store.mesclar("ordens", [{
    id: "op-cache",
    numeroOP: "71000",
    referencia: "414",
    cor: "AZUL",
    quantidade: 100,
    tipoPeca: "sutia",
    status: "aberta"
  }]);

  let chamadasOrdens = 0;
  contexto.carregarPrimeiraPaginaOrdens = async () => {
    chamadasOrdens += 1;
    return [];
  };

  const resultado = await executarDiagnosticoFirebaseSomenteLeitura({ contexto, medir });
  const etapa = resultado.etapas.find(item => item.id === "ordens");

  assert.equal(chamadasOrdens, 0);
  assert.match(etapa.mensagem, /1 OPs avaliadas/);
  assert.doesNotMatch(etapa.mensagem, /0 OPs/);
});

test("diagnóstico entende o objeto paginado de movimentações e nunca exibe undefined", async () => {
  const contexto = criarContexto();
  contexto.movimentacoesFaccoesRepo.carregarPrimeiraPagina = async () => ({
    itens: [],
    lidos: 30,
    acabou: true,
    totalNoStore: 0
  });

  const resultado = await executarDiagnosticoFirebaseSomenteLeitura({ contexto, medir });
  const etapa = resultado.etapas.find(item => item.id === "movimentacoes");

  assert.equal(etapa.nivel, "aviso");
  assert.match(etapa.mensagem, /30 documentos operacionais examinados/);
  assert.match(etapa.mensagem, /0 movimentações de Facção reconhecidas/);
  assert.doesNotMatch(etapa.mensagem, /undefined/);
  assert.ok(etapa.detalhes.some(item => item.includes("formato legado")));
});

test("configuração incompatível do Sutiã Completo bloqueia liberação de escrita", async () => {
  const resultado = await executarDiagnosticoFirebaseSomenteLeitura({
    contexto: criarContexto({ configInvalida: true }),
    medir
  });

  assert.equal(resultado.ok, false);
  const etapa = resultado.etapas.find(item => item.id === "config-sutia");
  assert.equal(etapa.nivel, "erro");
  assert.ok(etapa.detalhes.some(item => item.includes("912")));
  assert.ok(etapa.detalhes.some(item => item.includes("valorBaseGeral")));
});

test("diagnóstico real é estritamente de leitura", async () => {
  const fonte = await readFile(new URL("../diagnostico/firebase-readonly.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(fonte, /setDoc\s*\(/);
  assert.doesNotMatch(fonte, /updateDoc\s*\(/);
  assert.doesNotMatch(fonte, /deleteDoc\s*\(/);
  assert.doesNotMatch(fonte, /writeBatch\s*\(/);
  assert.doesNotMatch(fonte, /runTransaction\s*\(/);
});

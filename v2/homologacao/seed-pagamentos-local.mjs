export function garantirCenarioPagamentosHomologacao(store) {
  const pix = new Map([
    ["DANUBIA", "danubia@pix.test"],
    ["LIVIA", "11911111111"],
    ["DIVINA", "divina@pix.test"],
    ["JANAINA", "janaina@pix.test"],
    ["LORENA", "11922222222"],
    ["ANA FLAVIA", "anaflavia@pix.test"]
  ]);

  store.listar("faccoes").forEach(faccao => {
    const chave = String(faccao.nome || "").toUpperCase();
    if (!faccao.chavePix && pix.has(chave)) store.upsert("faccoes", { ...faccao, chavePix: pix.get(chave) });
  });

  if (store.listar("pagamentos").length) return;
  const exemplos = [
    {
      id: "fechamento-v2-demo-alca",
      schemaVersion: 2,
      origem: "fechamento_financeiro_v2",
      numeroOP: "70001",
      referencia: "411",
      cor: "PRETO",
      tipoPeca: "sutia",
      competencia: "2026-08",
      processo: "ALÇA",
      responsavel: "JANAINA",
      faccao: "JANAINA",
      quantidade: 200,
      quantidadeOP: 500,
      valorUnitario: 0.05,
      total: 10,
      statusPagamento: "pendente",
      criadoEm: "2026-08-05T10:00:00-03:00"
    },
    {
      id: "fechamento-v2-demo-montagem",
      schemaVersion: 2,
      origem: "fechamento_financeiro_v2",
      numeroOP: "70001",
      referencia: "411",
      cor: "PRETO",
      tipoPeca: "sutia",
      competencia: "2026-08",
      processo: "SUTIÃ MONTAGEM",
      responsavel: "LIVIA",
      faccao: "LIVIA",
      quantidade: 500,
      quantidadeOP: 500,
      valorUnitario: 0.4,
      total: 200,
      statusPagamento: "pago",
      criadoEm: "2026-08-04T10:00:00-03:00"
    },
    {
      id: "fechamento-v2-demo-calcinha",
      schemaVersion: 2,
      origem: "fechamento_financeiro_v2",
      numeroOP: "80001",
      referencia: "610",
      cor: "BRANCO",
      tipoPeca: "calcinha",
      competencia: "2026-08",
      processo: "CALCINHA COMPLETA",
      responsavel: "LORENA",
      faccao: "LORENA",
      quantidade: 420,
      quantidadeOP: 420,
      valorUnitario: 2,
      total: 840,
      statusPagamento: "pendente",
      criadoEm: "2026-08-03T10:00:00-03:00"
    },
    {
      id: "fechamento-v2-demo-julho",
      schemaVersion: 2,
      origem: "fechamento_financeiro_v2",
      numeroOP: "70002",
      referencia: "912",
      cor: "CHOCOLATE",
      tipoPeca: "sutia",
      competencia: "2026-07",
      processo: "SUTIÃ COMPLETO",
      responsavel: "DANUBIA",
      faccao: "DANUBIA",
      quantidade: 100,
      quantidadeOP: 300,
      valorUnitario: 6.5,
      total: 650,
      statusPagamento: "pendente",
      criadoEm: "2026-07-30T10:00:00-03:00"
    }
  ];

  exemplos.forEach(item => store.upsert("pagamentos", item));
}

const fs = require("fs");

const RELEASE_ANTIGA = "2026-09-02-calcinha-necessidade-opcional-280";
const RELEASE_NOVA = "2026-09-03-alca-cortagem-montagem-x2-281";
const UPDATED_AT = "2026-09-03T09:24:00-03:00";

function ler(path) {
  return fs.readFileSync(path, "utf8");
}

function salvar(path, conteudo) {
  fs.writeFileSync(path, conteudo, "utf8");
}

function contar(texto, trecho) {
  return texto.split(trecho).length - 1;
}

function trocarUma(path, de, para) {
  const atual = ler(path);
  const qtd = contar(atual, de);
  if (qtd !== 1) throw new Error(`${path}: esperado 1 bloco, encontrado ${qtd}: ${de.slice(0, 90)}`);
  salvar(path, atual.replace(de, para));
}

function trocarTodas(path, de, para, minimo = 1) {
  const atual = ler(path);
  const qtd = contar(atual, de);
  if (qtd < minimo) throw new Error(`${path}: esperado pelo menos ${minimo} ocorrência(s), encontrado ${qtd}: ${de}`);
  salvar(path, atual.split(de).join(para));
}

const arquivoFaccoes = "corponu-faccoes-lateral-alca-v2-270.js";

trocarUma(
  arquivoFaccoes,
  'const VERSION = "2026-09-02-lateral-alca-fechamentos-antigos-279";',
  `const VERSION = "${RELEASE_NOVA}";`
);

trocarUma(
  arquivoFaccoes,
  "  const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540;\n",
  "  const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540;\n  const MULTIPLICADOR_ALCAS_POR_PECA = 2;\n"
);

trocarUma(
  arquivoFaccoes,
  '      tipoValor: "global_alca",\n      marcaLateralPronta: false',
  '      tipoValor: "global_alca",\n      multiplicadorPorPeca: MULTIPLICADOR_ALCAS_POR_PECA,\n      marcaLateralPronta: false'
);

trocarUma(
  arquivoFaccoes,
  '      tipoValor: "fixo",\n      valorFixo: VALOR_FIXO_CORTAGEM_MONTAGEM,\n      marcaLateralPronta: false',
  '      tipoValor: "fixo",\n      valorFixo: VALOR_FIXO_CORTAGEM_MONTAGEM,\n      multiplicadorPorPeca: MULTIPLICADOR_ALCAS_POR_PECA,\n      marcaLateralPronta: false'
);

trocarUma(
  arquivoFaccoes,
  '        valorFixoUnitario: processo.tipoValor === "fixo" ? processo.valorFixo : null,\n',
  '        valorFixoUnitario: processo.tipoValor === "fixo" ? processo.valorFixo : null,\n        multiplicadorValorUnitario: processo.multiplicadorPorPeca || 1,\n'
);

trocarUma(
  arquivoFaccoes,
  `    if (processo.tipoValor === "fixo") {\n      return { valor: arred4(processo.valorFixo), origem: "fixo_cortagem_montagem", semValor: false };\n    }`,
  `    if (processo.tipoValor === "fixo") {\n      const valorBase = Math.max(0, num(processo.valorFixo));\n      const multiplicador = Math.max(1, num(processo.multiplicadorPorPeca, 1));\n      const valor = arred4(valorBase * multiplicador);\n      return {\n        valor,\n        valorBase: arred4(valorBase),\n        multiplicador,\n        origem: multiplicador === 2 ? "fixo_cortagem_montagem-x2" : "fixo_cortagem_montagem",\n        semValor: valor <= 0\n      };\n    }`
);

trocarUma(
  arquivoFaccoes,
  `      const base = Math.max(0, num(dados.valor ?? dados.valorUnitario ?? dados.preco));\n      const valor = arred4(base * 2);\n      return { valor, origem: "valor-padrao-alca-x2", semValor: valor <= 0 };`,
  `      const base = Math.max(0, num(dados.valor ?? dados.valorUnitario ?? dados.preco));\n      const multiplicador = Math.max(1, num(processo.multiplicadorPorPeca, 1));\n      const valor = arred4(base * multiplicador);\n      return {\n        valor,\n        valorBase: arred4(base),\n        multiplicador,\n        origem: multiplicador === 2 ? "valor-padrao-alca-x2" : "valor-padrao-alca",\n        semValor: valor <= 0\n      };`
);

trocarUma(
  arquivoFaccoes,
  "        valorUnitario: unitario,\n        subtotal,\n",
  "        valorUnitario: unitario,\n        valorBaseUnitario: arred4(resolucao.valorBase ?? unitario),\n        multiplicadorValor: Math.max(1, num(resolucao.multiplicador, 1)),\n        regraValor: Math.max(1, num(resolucao.multiplicador, 1)) === 2 ? \"2_alcas_por_peca\" : \"valor_unitario_por_peca\",\n        subtotal,\n"
);

trocarUma(
  arquivoFaccoes,
  "    valorFixoCortagemMontagem: VALOR_FIXO_CORTAGEM_MONTAGEM\n",
  "    valorFixoCortagemMontagem: VALOR_FIXO_CORTAGEM_MONTAGEM,\n    multiplicadorAlcasPorPeca: MULTIPLICADOR_ALCAS_POR_PECA,\n    valorEfetivoCortagemMontagem: arred4(VALOR_FIXO_CORTAGEM_MONTAGEM * MULTIPLICADOR_ALCAS_POR_PECA)\n"
);

const arquivoProcessos = "corponu-processos-valores-lateral-alca-272.js";

trocarUma(
  arquivoProcessos,
  'const VERSION = "2026-08-31-faccoes-processos-estavel-272";',
  `const VERSION = "${RELEASE_NOVA}";`
);

trocarUma(
  arquivoProcessos,
  "  const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540;\n",
  "  const VALOR_FIXO_CORTAGEM_MONTAGEM = 0.0540;\n  const MULTIPLICADOR_ALCAS_POR_PECA = 2;\n"
);

trocarUma(
  arquivoProcessos,
  `            <p>Valor único e fixo por peça.</p>\n            <strong class="processos-la-valor-fixo">R$ 0,0540</strong>`,
  `            <p>O valor fixo é por alça; o pagamento considera 2 alças por peça.</p>\n            <strong class="processos-la-valor-fixo">R$ 0,0540 × 2 = R$ 0,1080 por peça</strong>`
);

trocarUma(
  arquivoProcessos,
  "    valorFixoCortagemMontagem: VALOR_FIXO_CORTAGEM_MONTAGEM\n",
  "    valorFixoCortagemMontagem: VALOR_FIXO_CORTAGEM_MONTAGEM,\n    multiplicadorAlcasPorPeca: MULTIPLICADOR_ALCAS_POR_PECA,\n    valorEfetivoCortagemMontagem: arred4(VALOR_FIXO_CORTAGEM_MONTAGEM * MULTIPLICADOR_ALCAS_POR_PECA)\n"
);

const moduloReconciliacao = `(() => {\n  "use strict";\n\n  const VERSION = "${RELEASE_NOVA}";\n  const FB = "10.12.5";\n  const VALOR_BASE = 0.0540;\n  const MULTIPLICADOR = 2;\n  const VALOR_CORRETO = 0.1080;\n  const PROCESSOS = ["CORTAGEM E MONTAGEM", "CORTAGEM MONTAGEM", "CORTE E MONTAGEM"];\n\n  if (window.__CORPONU_RECONCILIACAO_LATERAL_ALCA_281__ === VERSION) return;\n  window.__CORPONU_RECONCILIACAO_LATERAL_ALCA_281__ = VERSION;\n\n  let contextoPromise = null;\n  let executando = false;\n\n  const norm = valor => String(valor ?? "")\n    .normalize("NFD")\n    .replace(/[\\u0300-\\u036f]/g, "")\n    .trim()\n    .replace(/\\s+/g, " ")\n    .toUpperCase();\n\n  const num = (valor, fallback = 0) => {\n    if (typeof valor === "number") return Number.isFinite(valor) ? valor : fallback;\n    const texto = String(valor ?? "").trim();\n    if (!texto) return fallback;\n    const parsed = Number(texto.includes(",") ? texto.replace(/\\./g, "").replace(",", ".") : texto);\n    return Number.isFinite(parsed) ? parsed : fallback;\n  };\n\n  const arred2 = valor => Math.round((num(valor) + Number.EPSILON) * 100) / 100;\n  const arred4 = valor => Math.round((num(valor) + Number.EPSILON) * 10000) / 10000;\n\n  function toast(mensagem) {\n    const alvo = document.getElementById("toast");\n    if (!alvo) {\n      console.info(mensagem);\n      return;\n    }\n    alvo.textContent = mensagem;\n    alvo.classList.remove("hidden");\n    clearTimeout(window.__reconciliacaoLA281Toast);\n    window.__reconciliacaoLA281Toast = setTimeout(() => alvo.classList.add("hidden"), 6500);\n  }\n\n  async function contexto() {\n    if (contextoPromise) return contextoPromise;\n    contextoPromise = Promise.all([\n      import(\`https://www.gstatic.com/firebasejs/\${FB}/firebase-app.js\`),\n      import(\`https://www.gstatic.com/firebasejs/\${FB}/firebase-auth.js\`),\n      import(\`https://www.gstatic.com/firebasejs/\${FB}/firebase-firestore.js\`)\n    ]).then(([appMod, authMod, fs]) => {\n      if (!appMod.getApps().length) throw new Error("Firebase ainda não inicializado.");\n      const app = appMod.getApp();\n      return { auth: authMod.getAuth(app), db: fs.getFirestore(app), onAuth: authMod.onAuthStateChanged, fs };\n    }).catch(error => {\n      contextoPromise = null;\n      throw error;\n    });\n    return contextoPromise;\n  }\n\n  async function aguardarUsuario() {\n    const c = await contexto();\n    if (c.auth.currentUser) return c.auth.currentUser;\n    return new Promise((resolve, reject) => {\n      const unsubscribe = c.onAuth(c.auth, atual => {\n        if (!atual) return;\n        unsubscribe();\n        resolve(atual);\n      }, reject);\n    });\n  }\n\n  async function carregarPerfil(usuario) {\n    const c = await contexto();\n    const snap = await c.fs.getDoc(c.fs.doc(c.db, "usuarios", usuario.uid));\n    return snap.exists() ? snap.data() : {};\n  }\n\n  function pagamentoAlvo(item) {\n    if (!item || item.cancelado === true || norm(item.statusPagamento) === "CANCELADO") return false;\n    if (!PROCESSOS.includes(norm(item.processo))) return false;\n    if (Math.abs(arred4(item.valorUnitario) - VALOR_BASE) > 0.00001) return false;\n    if (item.correcaoCortagemMontagemX2 === true) return false;\n\n    const fonte = norm(item.fonteValor);\n    const origemFluxo = norm(item.origemFluxo);\n    const fluxo = norm(item.fluxoFaccoes);\n    return fonte === "FIXO_CORTAGEM_MONTAGEM" ||\n      origemFluxo === "FACCOES_LATERAL_ALCA_V2" ||\n      fluxo === "LATERAL_ALCA";\n  }\n\n  async function reconciliar() {\n    if (executando) return { corrigidos: 0, ignorados: 0, executando: true };\n    executando = true;\n    try {\n      const c = await contexto();\n      const usuario = await aguardarUsuario();\n      const perfil = await carregarPerfil(usuario);\n      if (norm(perfil?.tipo) !== "ADMIN" || perfil?.ativo === false) {\n        return { corrigidos: 0, ignorados: 0, admin: false };\n      }\n\n      const chaveSessao = \`corponu_reconciliacao_cortagem_montagem_x2_281_\${usuario.uid}\`;\n      if (sessionStorage.getItem(chaveSessao) === "ok") {\n        return { corrigidos: 0, ignorados: 0, sessaoConcluida: true };\n      }\n\n      const consulta = c.fs.query(\n        c.fs.collection(c.db, "entregasPagamento"),\n        c.fs.where("processo", "in", PROCESSOS)\n      );\n      const snap = await c.fs.getDocs(consulta);\n      const candidatos = snap.docs\n        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))\n        .filter(pagamentoAlvo);\n\n      let corrigidos = 0;\n      let ignorados = 0;\n      for (let inicio = 0; inicio < candidatos.length; inicio += 200) {\n        const lote = candidatos.slice(inicio, inicio + 200);\n        const batch = c.fs.writeBatch(c.db);\n        let operacoes = 0;\n\n        lote.forEach(item => {\n          const quantidade = Math.max(0, num(item.quantidade ?? item.quantidadeRecebida ?? item.qtd));\n          if (quantidade <= 0) {\n            ignorados += 1;\n            return;\n          }\n\n          const descontoDefeito = Math.max(0, num(item.descontoDefeito ?? item.defeito));\n          const subtotal = arred2(quantidade * VALOR_CORRETO);\n          const total = arred2(Math.max(subtotal - descontoDefeito, 0));\n          const pago = norm(item.statusPagamento) === "PAGO";\n          const agora = c.fs.serverTimestamp();\n\n          batch.set(c.fs.doc(c.db, "entregasPagamento", item.id), {\n            valorUnitarioAntesCorrecao: arred4(item.valorUnitario),\n            subtotalAntesCorrecao: arred2(item.subtotal ?? (quantidade * VALOR_BASE)),\n            totalAntesCorrecao: arred2(item.total),\n            valorBaseUnitario: VALOR_BASE,\n            multiplicadorValor: MULTIPLICADOR,\n            regraValor: "2_alcas_por_peca",\n            valorUnitario: VALOR_CORRETO,\n            subtotal,\n            total,\n            fonteValor: "fixo_cortagem_montagem-x2",\n            correcaoCortagemMontagemX2: true,\n            correcaoCortagemMontagemVersao: VERSION,\n            correcaoCortagemMontagemMotivo: "Valor de R$ 0,0540 é por alça; processo usa 2 alças por peça.",\n            correcaoAposPagamento: pago,\n            corrigidoPor: usuario.uid,\n            corrigidoEm: agora,\n            atualizadoPor: usuario.uid,\n            atualizadoEm: agora\n          }, { merge: true });\n          operacoes += 1;\n\n          const logRef = c.fs.doc(c.fs.collection(c.db, "logsAlteracoes"));\n          batch.set(logRef, {\n            acao: "pagamento_cortagem_montagem_corrigido_x2",\n            entidade: "entregaPagamento",\n            entidadeId: item.id,\n            tipoAlvo: "entregaPagamento",\n            alvoId: item.id,\n            detalhes: \`OP \${item.numeroOP || "-"} | CORTAGEM E MONTAGEM | unitário 0,0540 -> 0,1080 | total \${arred2(item.total)} -> \${total}\`,\n            usuarioId: usuario.uid,\n            usuarioUid: usuario.uid,\n            usuarioEmail: usuario.email || "",\n            criadoPor: usuario.uid,\n            criadoEm: agora,\n            versao: VERSION\n          });\n          operacoes += 1;\n          corrigidos += 1;\n        });\n\n        if (operacoes) await batch.commit();\n      }\n\n      sessionStorage.setItem(chaveSessao, "ok");\n      window.dispatchEvent(new CustomEvent("corponu:pagamentos-reconciliados", {\n        detail: { versao: VERSION, corrigidos, ignorados }\n      }));\n      if (corrigidos) toast(\`\${corrigidos} pagamento(s) de Cortagem e montagem corrigido(s) para R$ 0,1080 por peça.\`);\n      return { corrigidos, ignorados, admin: true };\n    } catch (error) {\n      console.error("Falha ao reconciliar pagamentos de Cortagem e montagem.", error);\n      throw error;\n    } finally {\n      executando = false;\n    }\n  }\n\n  function iniciar() {\n    contexto().then(c => {\n      c.onAuth(c.auth, atual => {\n        if (!atual) return;\n        window.setTimeout(() => reconciliar().catch(() => {}), 250);\n      });\n    }).catch(error => console.warn("Reconciliação de Lateral e Alça aguardando Firebase.", error));\n  }\n\n  window.CorpoNuPagamentosReconciliacaoLateralAlca = Object.freeze({\n    versao: VERSION,\n    reconciliar,\n    valorBase: VALOR_BASE,\n    multiplicador: MULTIPLICADOR,\n    valorCorreto: VALOR_CORRETO\n  });\n\n  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });\n  else iniciar();\n})();\n`;

salvar("corponu-pagamentos-reconciliacao-lateral-alca-281.js", moduloReconciliacao);

const loader = "corponu-atualizador.js";
trocarTodas(loader, RELEASE_ANTIGA, RELEASE_NOVA, 1);
trocarUma(
  loader,
  '      ["corponu-pagamentos-detalhes-sutia-completo-257.js", "pagamentos-detalhes-sutia-completo-257", "Não foi possível carregar a memória detalhada do pagamento do Sutiã Completo."],\n',
  '      ["corponu-pagamentos-detalhes-sutia-completo-257.js", "pagamentos-detalhes-sutia-completo-257", "Não foi possível carregar a memória detalhada do pagamento do Sutiã Completo."],\n      ["corponu-pagamentos-reconciliacao-lateral-alca-281.js", "pagamentos-reconciliacao-lateral-alca-281", "Não foi possível reconciliar pagamentos antigos de Cortagem e montagem."],\n'
);

trocarTodas("update.js", RELEASE_ANTIGA, RELEASE_NOVA, 1);
trocarTodas("index.html", RELEASE_ANTIGA, RELEASE_NOVA, 2);

const notes = "Produção. O processo Alça • Cortagem e montagem passa a seguir a mesma regra financeira da Alça: o valor fixo de R$ 0,0540 é por alça e são consideradas 2 alças por peça, resultando em R$ 0,1080 por peça. A regra foi movida para o cadastro canônico do processo com multiplicador explícito, e os novos pagamentos gravam valor-base, multiplicador e regra utilizada. A tela Processos agora mostra R$ 0,0540 × 2 = R$ 0,1080 por peça. Foi adicionada reconciliação financeira idempotente para pagamentos históricos de CORTAGEM E MONTAGEM lançados com valor unitário de R$ 0,0540 pelo fluxo Lateral e Alça: somente registros identificados pela origem correta e ainda não corrigidos são atualizados para R$ 0,1080; subtotal e total são recalculados preservando desconto por defeito. O valor anterior fica salvo para auditoria, pagamentos pagos mantêm o status e recebem marca de correção após pagamento, e cada ajuste gera log. Registros cancelados e valores já corretos não são alterados. Nenhuma regra do Firebase foi modificada.";
const release = { version: RELEASE_NOVA, updatedAt: UPDATED_AT, notes };
salvar("corponu-release.json", JSON.stringify(release, null, 2) + "\n");
salvar("version.json", JSON.stringify(release, null, 2) + "\n");

// Pós-condições estruturais.
const faccoesFinal = ler(arquivoFaccoes);
if (!faccoesFinal.includes('origem: multiplicador === 2 ? "fixo_cortagem_montagem-x2"')) throw new Error("Regra x2 fixa não encontrada.");
if (!faccoesFinal.includes('multiplicadorPorPeca: MULTIPLICADOR_ALCAS_POR_PECA')) throw new Error("Multiplicador canônico não encontrado.");
if (!faccoesFinal.includes('regraValor: Math.max(1, num(resolucao.multiplicador, 1)) === 2 ? "2_alcas_por_peca"')) throw new Error("Memória de cálculo do pagamento não encontrada.");
const reconciliadorFinal = ler("corponu-pagamentos-reconciliacao-lateral-alca-281.js");
if (!reconciliadorFinal.includes('valorUnitario: VALOR_CORRETO')) throw new Error("Reconciliador não atualiza valor unitário.");
if (!reconciliadorFinal.includes('valorUnitarioAntesCorrecao')) throw new Error("Reconciliador não preserva auditoria.");
if (!reconciliadorFinal.includes('Math.abs(arred4(item.valorUnitario) - VALOR_BASE)')) throw new Error("Reconciliador sem proteção contra dupla multiplicação.");

console.log(`Migração aplicada: ${RELEASE_NOVA}`);

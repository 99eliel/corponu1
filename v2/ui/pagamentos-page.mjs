import { texto } from "../core/normalizacao.mjs";
import { templatePagamentos } from "./pagamentos-template.mjs";

function competenciaAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filtrosDoContainer(container) {
  const filtros = container.querySelector("[data-v2-pagamentos-filtros]");
  return {
    competencia: texto(filtros.querySelector('[name="competencia"]')?.value),
    responsavel: texto(filtros.querySelector('[name="responsavel"]')?.value),
    referencia: texto(filtros.querySelector('[name="referencia"]')?.value),
    processo: texto(filtros.querySelector('[name="processo"]')?.value),
    numeroOP: texto(filtros.querySelector('[name="numeroOP"]')?.value),
    status: texto(filtros.querySelector('[name="status"]')?.value) || "todos"
  };
}

function renderLista(tbody, itens) {
  if (!itens.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty">Nenhum pagamento encontrado com estes filtros.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = itens.map(item => `
    <tr>
      <td><strong>${escapar(item.numeroOP || "-")}</strong></td>
      <td>${escapar(item.competencia || "-")}</td>
      <td>${escapar(item.responsavel || "-")}</td>
      <td>${escapar(item.referencia || "-")}</td>
      <td>${escapar(item.processo || "-")}</td>
      <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
      <td>${escapar(moeda(item.valorUnitario))}</td>
      <td><strong>${escapar(moeda(item.total))}</strong></td>
      <td><span class="badge ${item.statusPagamento === "pago" ? "ok" : "pending"}">${item.statusPagamento === "pago" ? "Pago" : "Pendente"}</span></td>
    </tr>
  `).join("");
}

function renderResumo(elemento, resumo) {
  elemento.innerHTML = `
    <strong>${resumo.quantidadeLancamentos}</strong> lançamentos
    <span>•</span><strong>${Number(resumo.quantidadePecas || 0).toLocaleString("pt-BR")}</strong> peças
    <span>•</span>Total <strong>${escapar(moeda(resumo.total))}</strong>
    <span>•</span>Pendente <strong>${escapar(moeda(resumo.totalPendente))}</strong>
    <span>•</span>Pago <strong>${escapar(moeda(resumo.totalPago))}</strong>
  `;
}

function abrirRelatorio({ titulo, subtitulo = "", cabecalho, linhas }) {
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) return false;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px;font-size:22px}.muted{color:#666;margin-bottom:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}td.valor,th.valor{text-align:right}@media print{button{display:none}}</style>
    </head><body><h1>${escapar(titulo)}</h1><div class="muted">${escapar(subtitulo)}</div><table><thead><tr>${cabecalho.map(c => `<th>${escapar(c)}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
  janela.document.close();
  return true;
}

export function montarTelaPagamentos({
  container,
  controller,
  store,
  obterUsuario = () => null,
  competenciaPadrao = competenciaAtual(),
  confirmarQuitacao = ({ quantidade, total }) => window.prompt(`Você vai marcar ${quantidade} pagamento(s), total ${moeda(total)}, como PAGOS.\n\nDigite PAGAR para confirmar:`) === "PAGAR"
}) {
  if (!(container instanceof HTMLElement)) throw new Error("Container inválido para Pagamentos V2.");
  if (!controller || !store) throw new Error("Pagamentos V2 sem controller/store.");

  container.innerHTML = templatePagamentos({ competenciaPadrao });
  const abort = new AbortController();
  const { signal } = abort;
  const tbody = container.querySelector("[data-v2-pagamentos-lista]");
  const resumoEl = container.querySelector("[data-v2-pagamentos-resumo]");
  const statusEl = container.querySelector("[data-v2-pagamentos-status]");
  const carregarMais = container.querySelector("[data-v2-carregar-mais]");
  let competenciaCarregada = "";
  let carregando = false;

  function render() {
    const filtros = filtrosDoContainer(container);
    const resultado = controller.listar(filtros);
    renderLista(tbody, resultado.itens);
    renderResumo(resumoEl, resultado.resumo);
    carregarMais.disabled = controller.acabou() || carregando;
    statusEl.textContent = controller.acabou() ? "Fim dos registros carregados." : "Há mais registros disponíveis.";
    return resultado;
  }

  async function aplicar() {
    const filtros = filtrosDoContainer(container);
    if (competenciaCarregada !== filtros.competencia) {
      carregando = true;
      statusEl.textContent = "Carregando pagamentos...";
      try {
        await controller.carregar({ competencia: filtros.competencia });
        competenciaCarregada = filtros.competencia;
      } finally {
        carregando = false;
      }
    }
    render();
  }

  container.querySelector("[data-v2-aplicar-filtros]").addEventListener("click", aplicar, { signal });

  container.querySelector("[data-v2-limpar-filtros]").addEventListener("click", async () => {
    const filtros = container.querySelector("[data-v2-pagamentos-filtros]");
    filtros.querySelectorAll('input:not([name="competencia"])').forEach(input => { input.value = ""; });
    filtros.querySelector('[name="status"]').value = "todos";
    render();
  }, { signal });

  carregarMais.addEventListener("click", async () => {
    if (carregando || controller.acabou()) return;
    carregando = true;
    carregarMais.disabled = true;
    try {
      await controller.carregarMais();
      render();
    } finally {
      carregando = false;
    }
  }, { signal });

  container.querySelector("[data-v2-quitar-filtrados]").addEventListener("click", async event => {
    const botao = event.currentTarget;
    const filtros = filtrosDoContainer(container);
    botao.disabled = true;
    const textoAnterior = botao.textContent;
    botao.textContent = "Conferindo filtrados...";
    try {
      const todos = await controller.pagamentosRepo.buscarTodos({ competencia: filtros.competencia });
      const filtrados = (await import("../core/pagamentos-regras.mjs")).filtrarPagamentos(todos, filtros);
      const resumo = (await import("../core/pagamentos-regras.mjs")).resumoQuitacao(filtrados);
      if (!resumo.quantidade) {
        statusEl.textContent = "Não há pagamentos pendentes nesses filtros.";
        return;
      }
      if (!confirmarQuitacao(resumo)) {
        statusEl.textContent = "Quitação cancelada.";
        return;
      }
      botao.textContent = "Marcando como pagos...";
      const resultado = await controller.quitarFiltrados(filtros, { usuario: obterUsuario() });
      statusEl.textContent = resultado.ok
        ? `${resultado.resumo.quantidade} pagamento(s) marcados como pagos • ${moeda(resultado.resumo.total)}.`
        : "Não foi possível concluir a quitação.";
      if (resultado.ok) await controller.carregar({ competencia: filtros.competencia });
      render();
    } catch (error) {
      console.error("[V2] Erro ao quitar pagamentos filtrados.", error);
      statusEl.textContent = "Erro ao confirmar pagamentos filtrados.";
    } finally {
      botao.disabled = false;
      botao.textContent = textoAnterior;
    }
  }, { signal });

  container.querySelector("[data-v2-relatorio-completo]").addEventListener("click", () => {
    const filtros = filtrosDoContainer(container);
    const { itens, resumo } = controller.listar(filtros);
    const pix = new Map(store.listar("faccoes").map(f => [String(f.nome || "").toUpperCase(), f.chavePix || f.pix || ""]));
    abrirRelatorio({
      titulo: "Relatório de Pagamentos",
      subtitulo: `Competência ${filtros.competencia || "todas"} • Total ${moeda(resumo.total)}`,
      cabecalho: ["OP", "Responsável", "PIX", "Referência", "Processo", "Qtd.", "Unitário", "Total", "Status"],
      linhas: itens.map(item => `<tr><td>${escapar(item.numeroOP)}</td><td>${escapar(item.responsavel)}</td><td>${escapar(pix.get(String(item.responsavel).toUpperCase()) || "-")}</td><td>${escapar(item.referencia)}</td><td>${escapar(item.processo)}</td><td>${item.quantidade}</td><td class="valor">${escapar(moeda(item.valorUnitario))}</td><td class="valor">${escapar(moeda(item.total))}</td><td>${escapar(item.statusPagamento)}</td></tr>`).join("")
    });
  }, { signal });

  container.querySelector("[data-v2-relatorio-simples]").addEventListener("click", () => {
    const filtros = filtrosDoContainer(container);
    const linhas = controller.relatorioSimplificado(filtros);
    abrirRelatorio({
      titulo: "Relatório Simplificado de Pagamentos",
      subtitulo: `Competência ${filtros.competencia || "todas"}`,
      cabecalho: ["Nome", "PIX", "Valor"],
      linhas: linhas.map(item => `<tr><td>${escapar(item.nome)}</td><td>${escapar(item.pix || "-")}</td><td class="valor"><strong>${escapar(moeda(item.valor))}</strong></td></tr>`).join("")
    });
  }, { signal });

  const parar = store.assinar("pagamentos", render);
  aplicar().catch(error => {
    console.error("[V2] Erro inicial em Pagamentos.", error);
    statusEl.textContent = "Não foi possível carregar os pagamentos.";
  });

  return {
    atualizar: render,
    desmontar() {
      abort.abort();
      parar();
      container.innerHTML = "";
    }
  };
}

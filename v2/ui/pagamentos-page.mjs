import { texto } from "../core/normalizacao.mjs";
import { templatePagamentos } from "./pagamentos-template.mjs";

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
function competenciaAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function lerFiltros(container) {
  const raiz = container.querySelector("[data-v2-pagamentos-filtros]");
  const valor = nome => texto(raiz.querySelector(`[name="${nome}"]`)?.value);
  return { competencia: valor("competencia"), responsavel: valor("responsavel"), referencia: valor("referencia"), processo: valor("processo"), numeroOP: valor("numeroOP"), status: valor("status") || "todos" };
}

function renderLista(tbody, itens) {
  tbody.innerHTML = itens.length ? itens.map(item => `<tr>
    <td><strong>${escapar(item.numeroOP || "-")}</strong></td><td>${escapar(item.competencia || "-")}</td>
    <td>${escapar(item.responsavel || "-")}</td><td>${escapar(item.referencia || "-")}</td><td>${escapar(item.processo || "-")}</td>
    <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td><td>${escapar(moeda(item.valorUnitario))}</td>
    <td><strong>${escapar(moeda(item.total))}</strong></td><td><span class="badge ${item.statusPagamento === "pago" ? "ok" : "pending"}">${item.statusPagamento === "pago" ? "Pago" : "Pendente"}</span></td>
  </tr>`).join("") : `<tr><td colspan="9"><div class="empty">Nenhum pagamento encontrado com estes filtros.</div></td></tr>`;
}

function renderResumo(el, r, completo) {
  el.innerHTML = `<strong>${r.quantidadeLancamentos}</strong> lançamentos <span>•</span> <strong>${Number(r.quantidadePecas || 0).toLocaleString("pt-BR")}</strong> peças <span>•</span> Total <strong>${moeda(r.total)}</strong> <span>•</span> Pendente <strong>${moeda(r.totalPendente)}</strong> <span>•</span> Pago <strong>${moeda(r.totalPago)}</strong>${completo ? "" : " <span>•</span> <small>totais dos registros carregados</small>"}`;
}

function abrirRelatorio({ titulo, subtitulo, cabecalho, linhas }) {
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) return false;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(titulo)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px;font-size:22px}.muted{color:#666;margin-bottom:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}.valor{text-align:right}</style></head><body><h1>${escapar(titulo)}</h1><div class="muted">${escapar(subtitulo || "")}</div><table><thead><tr>${cabecalho.map(c => `<th>${escapar(c)}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
  janela.document.close();
  return true;
}

export function montarTelaPagamentos({ container, controller, store, obterUsuario = () => null, competenciaPadrao = competenciaAtual(), confirmarQuitacao = ({ quantidade, total }) => window.prompt(`Você vai marcar ${quantidade} pagamento(s), total ${moeda(total)}, como PAGOS.\n\nDigite PAGAR para confirmar:`) === "PAGAR" }) {
  if (!(container instanceof HTMLElement)) throw new Error("Container inválido para Pagamentos V2.");
  if (!controller || !store) throw new Error("Pagamentos V2 sem controller/store.");
  container.innerHTML = templatePagamentos({ competenciaPadrao });

  const abort = new AbortController();
  const { signal } = abort;
  const tbody = container.querySelector("[data-v2-pagamentos-lista]");
  const resumoEl = container.querySelector("[data-v2-pagamentos-resumo]");
  const statusEl = container.querySelector("[data-v2-pagamentos-status]");
  const mais = container.querySelector("[data-v2-carregar-mais]");
  let competenciaCarregada = null;
  let carregando = false;

  function render() {
    const resultado = controller.listar(lerFiltros(container));
    renderLista(tbody, resultado.itens);
    renderResumo(resumoEl, resultado.resumo, controller.acabou());
    mais.disabled = carregando || controller.acabou();
    statusEl.textContent = controller.acabou() ? "Fim dos registros carregados." : "Há mais registros disponíveis.";
    return resultado;
  }

  async function aplicar() {
    const filtros = lerFiltros(container);
    if (competenciaCarregada !== filtros.competencia) {
      carregando = true; statusEl.textContent = "Carregando pagamentos...";
      try { await controller.carregar({ competencia: filtros.competencia }); competenciaCarregada = filtros.competencia; }
      finally { carregando = false; }
    }
    render();
  }

  container.querySelector("[data-v2-aplicar-filtros]").addEventListener("click", aplicar, { signal });
  container.querySelector("[data-v2-limpar-filtros]").addEventListener("click", () => {
    const raiz = container.querySelector("[data-v2-pagamentos-filtros]");
    raiz.querySelectorAll('input:not([name="competencia"])').forEach(input => { input.value = ""; });
    raiz.querySelector('[name="status"]').value = "todos"; render();
  }, { signal });

  mais.addEventListener("click", async () => {
    if (carregando || controller.acabou()) return;
    carregando = true; mais.disabled = true;
    try { await controller.carregarMais(); render(); } finally { carregando = false; }
  }, { signal });

  container.querySelector("[data-v2-quitar-filtrados]").addEventListener("click", async event => {
    const botao = event.currentTarget; const anterior = botao.textContent; const filtros = lerFiltros(container);
    botao.disabled = true; botao.textContent = "Conferindo filtrados...";
    try {
      const preparado = await controller.prepararQuitacao(filtros);
      if (!preparado.ok) { statusEl.textContent = "Não há pagamentos pendentes nesses filtros."; return; }
      if (!confirmarQuitacao(preparado.resumo)) { statusEl.textContent = "Quitação cancelada."; return; }
      botao.textContent = "Marcando como pagos...";
      const resultado = await controller.quitarPreparados(preparado, { usuario: obterUsuario() });
      statusEl.textContent = resultado.ok ? `${preparado.resumo.quantidade} pagamento(s) marcados como pagos • ${moeda(preparado.resumo.total)}.` : "Não foi possível concluir a quitação.";
      if (resultado.ok) await controller.carregar({ competencia: filtros.competencia });
      render();
    } catch (error) { console.error("[V2] Erro ao quitar pagamentos filtrados.", error); statusEl.textContent = "Erro ao confirmar pagamentos filtrados."; }
    finally { botao.disabled = false; botao.textContent = anterior; }
  }, { signal });

  container.querySelector("[data-v2-relatorio-completo]").addEventListener("click", async event => {
    const botao = event.currentTarget; const anterior = botao.textContent; botao.disabled = true; botao.textContent = "Preparando relatório...";
    try {
      const filtros = lerFiltros(container); const { itens, resumo } = await controller.buscarFiltradosCompletos(filtros);
      const pix = new Map(store.listar("faccoes").map(f => [String(f.nome || "").toUpperCase(), f.chavePix || f.pix || ""]));
      abrirRelatorio({ titulo: "Relatório de Pagamentos", subtitulo: `Competência ${filtros.competencia || "todas"} • Total ${moeda(resumo.total)}`, cabecalho: ["OP", "Responsável", "PIX", "Referência", "Processo", "Qtd.", "Unitário", "Total", "Status"], linhas: itens.map(i => `<tr><td>${escapar(i.numeroOP)}</td><td>${escapar(i.responsavel)}</td><td>${escapar(pix.get(String(i.responsavel).toUpperCase()) || "-")}</td><td>${escapar(i.referencia)}</td><td>${escapar(i.processo)}</td><td>${i.quantidade}</td><td class="valor">${moeda(i.valorUnitario)}</td><td class="valor">${moeda(i.total)}</td><td>${escapar(i.statusPagamento)}</td></tr>`).join("") });
    } catch (error) { console.error("[V2] Erro no relatório completo.", error); statusEl.textContent = "Não foi possível preparar o relatório completo."; }
    finally { botao.disabled = false; botao.textContent = anterior; }
  }, { signal });

  container.querySelector("[data-v2-relatorio-simples]").addEventListener("click", async event => {
    const botao = event.currentTarget; const anterior = botao.textContent; botao.disabled = true; botao.textContent = "Preparando relatório...";
    try {
      const filtros = lerFiltros(container); const { simplificado } = await controller.buscarFiltradosCompletos(filtros);
      abrirRelatorio({ titulo: "Relatório Simplificado de Pagamentos", subtitulo: `Competência ${filtros.competencia || "todas"}`, cabecalho: ["Nome", "PIX", "Valor"], linhas: simplificado.map(i => `<tr><td>${escapar(i.nome)}</td><td>${escapar(i.pix || "-")}</td><td class="valor"><strong>${moeda(i.valor)}</strong></td></tr>`).join("") });
    } catch (error) { console.error("[V2] Erro no relatório simplificado.", error); statusEl.textContent = "Não foi possível preparar o relatório simplificado."; }
    finally { botao.disabled = false; botao.textContent = anterior; }
  }, { signal });

  const parar = store.assinar("pagamentos", render);
  aplicar().catch(error => { console.error("[V2] Erro inicial em Pagamentos.", error); statusEl.textContent = "Não foi possível carregar os pagamentos."; });
  return { atualizar: render, desmontar() { abort.abort(); parar(); container.innerHTML = ""; } };
}

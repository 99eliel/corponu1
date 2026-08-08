import { criarStoreCorpoNu } from "../core/store.mjs";
import { OrdensService } from "../core/ordens-service.mjs";
import { OrdensController } from "../core/ordens-controller.mjs";
import { ManejoService } from "../core/manejo-service.mjs";
import { ManejoController } from "../core/manejo-controller.mjs";
import { FaccoesOperacionalService } from "../core/faccoes-operacional-service.mjs";
import { FaccoesController } from "../core/faccoes-controller.mjs";
import { FechamentoFinanceiroService } from "../core/financeiro-service.mjs";
import { FechamentoController } from "../core/fechamento-controller.mjs";
import { PagamentosController } from "../core/pagamentos-controller.mjs";
import { montarTelaOrdens } from "../ui/ordens-page.mjs";
import { montarTelaManejo } from "../ui/manejo-page.mjs";
import { montarTelaFaccoes } from "../ui/faccoes-page.mjs";
import { montarTelaFechamento } from "../ui/fechamento-page.mjs";
import { montarTelaPagamentos } from "../ui/pagamentos-page.mjs";
import { criarPagamentosRepoLocal } from "./pagamentos-local-repo.mjs";
import { garantirCenarioPagamentosHomologacao } from "./seed-pagamentos-local.mjs";
import {
  carregarDadosLocais,
  criarRepositoriosLocais,
  hidratarStoreLocal,
  instalarPersistenciaLocal,
  restaurarDadosLocais
} from "./local-db.mjs";

const store = hidratarStoreLocal(criarStoreCorpoNu(), carregarDadosLocais());
const pararPersistencia = instalarPersistenciaLocal(store);
garantirCenarioPagamentosHomologacao(store);
const repos = criarRepositoriosLocais(store);
const pagamentosConsultaRepo = criarPagamentosRepoLocal(store);

const usuario = {
  uid: "homologacao-eliel",
  nome: "Usuário de Homologação",
  email: "homologacao@local.test"
};
let perfilAtual = { tipo: "ADMIN", nome: "Administrador de Homologação" };

const ordensService = new OrdensService({ produtosRepo: repos.produtosRepo, ordensRepo: repos.ordensRepo });
const ordensController = new OrdensController({ store, ordensService });
const manejoService = new ManejoService({ manejoRepo: repos.manejoRepo });
const manejoController = new ManejoController({ store, manejoService });
const operacionalService = new FaccoesOperacionalService({ repo: repos.faccoesOperacionalRepo });
const faccoesController = new FaccoesController({
  store,
  movimentosRepo: repos.movimentosRepo,
  operacionalService,
  referenciaEspecial: "912"
});

const financeiroService = new FechamentoFinanceiroService({
  ordensRepo: { async buscarPorNumero(numeroOP) { return store.buscarOrdemPorNumero(numeroOP); } },
  valoresRepo: repos.valoresRepo,
  pagamentosRepo: repos.pagamentosRepo
});
const fechamentoController = new FechamentoController({ store, financeiroService });
const pagamentosController = new PagamentosController({ store, pagamentosRepo: pagamentosConsultaRepo });

const apps = {};
const el = id => document.getElementById(id);
const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function renderResumoLocal() {
  el("homologacaoResumo").innerHTML = `
    <strong>${store.listar("ordens").length}</strong> OPs locais
    <span>•</span><strong>${store.listar("movimentacoes").length}</strong> movimentações locais
    <span>•</span><strong>${store.listar("pagamentos").length}</strong> lançamentos financeiros locais
  `;
}

function renderPagamentosLocais() {
  const lista = store.listar("pagamentos").sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
  const alvo = el("homologacaoPagamentos");
  if (!alvo) return;
  if (!lista.length) {
    alvo.innerHTML = `<div class="empty">Nenhum fechamento lançado neste ambiente ainda.</div>`;
    return;
  }
  alvo.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>OP</th><th>Competência</th><th>Serviço</th><th>Quem fez</th><th>Qtd.</th><th>Valor</th><th>Status</th></tr></thead>
    <tbody>${lista.map(item => `<tr>
      <td><strong>${item.numeroOP || "-"}</strong></td><td>${item.competencia || "-"}</td>
      <td>${item.processo || "-"}</td><td>${item.responsavel || item.faccao || "-"}</td>
      <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td><td><strong>${moeda(item.total)}</strong></td>
      <td>${item.statusPagamento === "pago" ? "Pago" : "Pendente"}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

function montarOrdens() {
  apps.ordens = montarTelaOrdens({
    container: el("v2Ordens"), controller: ordensController, store, obterUsuario: () => usuario,
    confirmarConversao: (_conflito, dados) => confirm(`A OP ${dados.numeroOP} já existe como Sutiã. Corrigir o mesmo registro para Calcinha?`)
  });
}

function montarManejo() {
  apps.manejo = montarTelaManejo({ container: el("v2Manejo"), controller: manejoController, store, obterUsuario: () => usuario });
}

function montarFaccoes() {
  apps.faccoes?.desmontar?.();
  apps.faccoes = montarTelaFaccoes({
    container: el("v2Faccoes"), controller: faccoesController, store,
    obterPerfil: () => perfilAtual, obterUsuario: () => usuario,
    confirmarAviso: movimento => confirm(`Informar chegada da OP ${movimento.numeroOP}? Isto é somente operacional e não gera pagamento.`)
  });
}

function montarFechamento() {
  apps.fechamento = montarTelaFechamento({
    container: el("v2Fechamento"), controller: fechamentoController,
    onSalvo: () => renderPagamentosLocais()
  });
}

function montarPagamentos() {
  apps.pagamentos = montarTelaPagamentos({
    container: el("v2Pagamentos"), controller: pagamentosController, store,
    obterUsuario: () => usuario,
    confirmarQuitacao: ({ quantidade, total }) => confirm(`Marcar ${quantidade} pagamento(s), total ${moeda(total)}, como pagos?`)
  });
}

function navegar(chave) {
  document.querySelectorAll("[data-homologacao-page]").forEach(secao => secao.classList.toggle("hidden", secao.dataset.homologacaoPage !== chave));
  document.querySelectorAll("[data-homologacao-nav]").forEach(botao => botao.classList.toggle("active", botao.dataset.homologacaoNav === chave));
  location.hash = chave;
}

function configurarShell() {
  document.querySelectorAll("[data-homologacao-nav]").forEach(botao => botao.addEventListener("click", () => navegar(botao.dataset.homologacaoNav)));
  el("homologacaoPerfil").value = "ADMIN";
  el("homologacaoPerfil").addEventListener("change", event => {
    const admin = event.target.value === "ADMIN";
    perfilAtual = { tipo: admin ? "ADMIN" : "USUARIO", nome: admin ? "Administrador de Homologação" : "Usuário Comum de Homologação" };
    montarFaccoes();
  });
  el("btnRestaurarHomologacao").addEventListener("click", () => {
    if (!confirm("Restaurar todos os dados locais da homologação para o cenário inicial?")) return;
    pararPersistencia(); restaurarDadosLocais(); location.reload();
  });
  const inicial = location.hash.replace("#", "") || "ordens";
  navegar(["ordens", "manejo", "faccoes", "fechamento", "pagamentos"].includes(inicial) ? inicial : "ordens");
}

for (const dominio of ["ordens", "movimentacoes", "pagamentos"]) {
  store.assinar(dominio, () => { renderResumoLocal(); if (dominio === "pagamentos") renderPagamentosLocais(); });
}

montarOrdens(); montarManejo(); montarFaccoes(); montarFechamento(); montarPagamentos(); configurarShell(); renderResumoLocal(); renderPagamentosLocais();

window.__CORPONU_HOMOLOGACAO_V2__ = Object.freeze({
  store,
  restaurar() { pararPersistencia(); restaurarDadosLocais(); location.reload(); }
});

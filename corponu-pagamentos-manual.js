import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const RELEASE = "2026-07-30-lancamento-manual-pagamentos-restantes-1";
const PROCESSOS = [
  "ENCAPAR BOJO",
  "ALÇA",
  "CALCINHA MONTAGEM",
  "CALCINHA COMPLETA",
  "SUTIÃ MONTAGEM",
  "SUTIÃ COMPLETO"
];

const FACCOES_PADRAO = Object.freeze({
  "ENCAPAR BOJO": ["DIVINA", "GRACIANE", "JESSICA", "LARISSA", "ALINE BATISTA", "DAIANY", "NAGILA", "DELMA", "GIRLAINE"],
  "ALÇA": ["JANAINA", "IVONE", "LUANA", "KARYTA", "SIMEI", "SIMONE"],
  "CALCINHA MONTAGEM": ["ANA FLAVIA", "KAUANE", "LIANA", "DAIANA", "LEIDIANE", "ANDREZA"],
  "CALCINHA COMPLETA": ["LORENA", "JEAN", "SCHENEIDER", "DANIELA", "KAMILA", "LIANDRA", "JUZENI", "THEILLOR", "SILVANY", "LEONARDO", "MATHEUS", "BEATRIZ", "MARILIA", "DARLLEN", "RONEIDIA"],
  "SUTIÃ MONTAGEM": ["LIVIA", "FRACEILDA", "MOCINHA", "NAYARA", "NAGILA", "GIRLAINE", "JHENIFER"],
  "SUTIÃ COMPLETO": ["DANUBIA", "KAKA", "GISLAINY", "ITAMAR", "LUCIA", "GOIANIRA"]
});

let contexto = null;
let perfilAtual = null;
let opAtual = null;
let faccoesCache = [];
let restantesCache = [];
let restanteSelecionado = null;
let salvandoLancamento = false;
let salvandoRestante = false;

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slug(valor) {
  return normalizar(valor)
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52) || "SEM-DADO";
}

function numero(valor, padrao = 0) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  const texto = String(valor ?? "").trim();
  if (!texto) return padrao;
  const convertido = texto.includes(",")
    ? Number(texto.replace(/\./g, "").replace(",", "."))
    : Number(texto);
  return Number.isFinite(convertido) ? convertido : padrao;
}

function inteiro(valor, padrao = 0) {
  return Math.max(0, Math.floor(numero(valor, padrao)));
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeISO() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dataBR(valor) {
  const texto = String(valor || "").slice(0, 10);
  const partes = texto.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : (texto || "-");
}

function setorDoProcesso(processo) {
  const n = normalizar(processo);
  if (n.includes("CALCINHA")) return "calcinha";
  if (n.includes("BOJO")) return "bojo";
  if (n.includes("ALCA")) return "alca";
  return "sutia";
}

function labelSetor(setor) {
  const mapa = { sutia: "Sutiã", calcinha: "Calcinha", bojo: "Bojo", alca: "Alça" };
  return mapa[setor] || "Produção";
}

function processoComComponentes(processo) {
  return ["SUTIA MONTAGEM", "SUTIA COMPLETO"].includes(normalizar(processo));
}

function respostaBooleana(valor) {
  if (valor === "sim") return true;
  if (valor === "nao") return false;
  return null;
}

function podeGerenciarFinanceiro(perfil) {
  if (!perfil || perfil.ativo === false) return false;
  if (perfil.tipo === "admin") return true;
  const recursos = perfil.permissoes?.recursos || {};
  return recursos.gerenciarValores === true || recursos.marcarPagamentos === true;
}

function avisar(mensagem, tipo = "normal") {
  const toastPrincipal = document.getElementById("toast");
  if (toastPrincipal) {
    toastPrincipal.textContent = mensagem;
    toastPrincipal.classList.remove("hidden");
    toastPrincipal.style.background = tipo === "erro" ? "#991b1b" : "";
    clearTimeout(window.__toastManualPagamento);
    window.__toastManualPagamento = setTimeout(() => {
      toastPrincipal.classList.add("hidden");
      toastPrincipal.style.background = "";
    }, 5500);
    return;
  }
  alert(mensagem);
}

function injetarEstilos() {
  if (document.getElementById("stylePagamentoManualFinanceiro")) return;
  const style = document.createElement("style");
  style.id = "stylePagamentoManualFinanceiro";
  style.textContent = `
    .btn-pagamento-manual { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
    .btn-restantes-pagamento { background:#fff7ed !important; color:#9a3412 !important; border-color:#fdba74 !important; }
    .contador-restante-pagamento { display:inline-flex; min-width:21px; height:21px; align-items:center; justify-content:center; padding:0 6px; margin-left:5px; border-radius:999px; background:#ea580c; color:#fff; font-size:11px; font-weight:900; }
    #modalPagamentoManualFinanceiro .modal-card,
    #modalReceberRestantePagamento .modal-card { width:min(920px, calc(100vw - 24px)); max-height:94vh; overflow:auto; }
    .pagamento-manual-intro { padding:12px 14px; border:1px solid #bfdbfe; border-radius:13px; background:#eff6ff; color:#1e3a8a; line-height:1.45; }
    .pagamento-manual-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .pagamento-manual-grid .campo-largo { grid-column:1/-1; }
    .pagamento-manual-op { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end; }
    .pagamento-manual-resumo { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; padding:12px; border-radius:13px; background:#f8fafc; border:1px solid #e2e8f0; }
    .pagamento-manual-resumo-item { padding:9px 10px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; }
    .pagamento-manual-resumo-item small { display:block; color:#64748b; font-size:10px; font-weight:800; text-transform:uppercase; }
    .pagamento-manual-resumo-item strong { display:block; margin-top:4px; color:#0f172a; }
    .pagamento-manual-preview { padding:12px 14px; border-radius:12px; border:1px solid #c4b5fd; background:#faf5ff; color:#5b21b6; font-weight:800; line-height:1.5; }
    .pagamento-manual-alerta { padding:11px 13px; border-radius:11px; border:1px solid #fdba74; background:#fff7ed; color:#9a3412; font-size:12px; line-height:1.45; }
    .pagamento-manual-componentes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:12px; border:1px solid #ddd6fe; border-radius:12px; background:#faf5ff; }
    .pagamento-manual-componentes.hidden { display:none !important; }
    #painelRestantesPagamento { margin:14px 0; border:1px solid #fdba74; border-radius:16px; background:#fffaf0; overflow:hidden; }
    #painelRestantesPagamento.hidden { display:none !important; }
    #painelRestantesPagamento .restantes-pagamento-header { display:flex; justify-content:space-between; gap:12px; align-items:center; padding:14px 16px; border-bottom:1px solid #fed7aa; }
    #painelRestantesPagamento .restantes-pagamento-header h3 { margin:0 0 3px; }
    #painelRestantesPagamento .restantes-pagamento-header p { margin:0; color:#7c2d12; }
    #painelRestantesPagamento .restantes-pagamento-resumo { padding:10px 16px; background:#ffedd5; color:#9a3412; font-weight:900; }
    #painelRestantesPagamento .table-wrap { margin:0; background:#fff; }
    #painelRestantesPagamento .btn-receber-restante-pagamento { background:#16a34a; color:#fff; border-color:#16a34a; white-space:nowrap; }
    .restante-origem-manual { display:inline-flex; margin-top:4px; padding:2px 7px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:10px; font-weight:900; }
    @media (max-width:760px) {
      .pagamento-manual-grid, .pagamento-manual-componentes { grid-template-columns:1fr; }
      .pagamento-manual-resumo { grid-template-columns:1fr 1fr; }
      .pagamento-manual-op { grid-template-columns:1fr; }
      #painelRestantesPagamento .restantes-pagamento-header { align-items:flex-start; flex-direction:column; }
    }
    @media (max-width:460px) { .pagamento-manual-resumo { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

function criarModalLancamento() {
  if (document.getElementById("modalPagamentoManualFinanceiro")) return;
  const modal = document.createElement("div");
  modal.id = "modalPagamentoManualFinanceiro";
  modal.className = "modal-backdrop hidden";
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h3>Novo lançamento manual de pagamento</h3>
          <p>Registre a chegada, o pagamento e o saldo restante em uma única operação.</p>
        </div>
        <button class="modal-close" id="btnFecharPagamentoManualFinanceiro" type="button">×</button>
      </div>
      <form id="formPagamentoManualFinanceiro" class="form">
        <div class="pagamento-manual-intro">
          Localize a OP, selecione quem realizou o serviço e informe quantas peças realmente chegaram. O valor total pode ser preenchido agora ou deixado em branco para a Central de Pendências do financeiro.
        </div>
        <div class="pagamento-manual-op">
          <label>
            Número da OP
            <input id="pagManualNumeroOP" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 58384" required />
          </label>
          <button class="btn btn-primary" id="btnBuscarOPPagamentoManual" type="button">Buscar OP</button>
        </div>
        <div id="resumoOPPagamentoManual" class="pagamento-manual-resumo hidden"></div>
        <div class="pagamento-manual-grid">
          <label>
            Processo realizado
            <select id="pagManualProcesso" required>
              <option value="">Selecione</option>
              ${PROCESSOS.map(item => `<option value="${item}">${item}</option>`).join("")}
            </select>
          </label>
          <label>
            Facção / responsável
            <select id="pagManualFaccao" disabled required><option value="">Escolha o processo primeiro</option></select>
          </label>
          <label>
            Quantidade da OP / enviada
            <input id="pagManualQuantidadeEnviada" type="number" min="1" step="1" required />
          </label>
          <label>
            Quantidade que chegou
            <input id="pagManualQuantidadeRecebida" type="number" min="1" step="1" required />
          </label>
          <label>
            Data de envio <small>(opcional)</small>
            <input id="pagManualDataEnvio" type="date" />
          </label>
          <label>
            Data de chegada
            <input id="pagManualDataChegada" type="date" required />
          </label>
          <label class="campo-largo">
            Valor total final deste serviço <small>(opcional)</small>
            <input id="pagManualValorTotal" type="text" inputmode="decimal" placeholder="Ex.: 450,00 — deixe vazio para o financeiro preencher depois" />
          </label>
          <div id="componentesSutiaPagamentoManual" class="pagamento-manual-componentes campo-largo hidden">
            <label>
              Lateral foi pronta?
              <select id="pagManualLateral">
                <option value="nao_informado">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </label>
            <label>
              Bojo foi pronto?
              <select id="pagManualBojo">
                <option value="nao_informado">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </label>
          </div>
          <label class="campo-largo">
            Observações
            <textarea id="pagManualObservacoes" rows="3" placeholder="Informações adicionais do lançamento"></textarea>
          </label>
        </div>
        <div id="previewPagamentoManual" class="pagamento-manual-preview">Busque uma OP para iniciar.</div>
        <label class="check">
          <input id="pagManualConfirmacao" type="checkbox" required />
          <span>Conferi a OP, a facção, o processo e as quantidades informadas.</span>
        </label>
        <div class="actions">
          <button class="btn btn-success" id="btnSalvarPagamentoManual" type="submit">Salvar lançamento manual</button>
          <button class="btn" id="btnCancelarPagamentoManual" type="button">Cancelar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#btnFecharPagamentoManualFinanceiro")?.addEventListener("click", fecharModalLancamento);
  modal.querySelector("#btnCancelarPagamentoManual")?.addEventListener("click", fecharModalLancamento);
  modal.addEventListener("click", event => { if (event.target === modal) fecharModalLancamento(); });
  modal.querySelector("#btnBuscarOPPagamentoManual")?.addEventListener("click", buscarOPManual);
  modal.querySelector("#pagManualNumeroOP")?.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); buscarOPManual(); }
  });
  modal.querySelector("#pagManualProcesso")?.addEventListener("change", atualizarProcessoManual);
  ["pagManualQuantidadeEnviada", "pagManualQuantidadeRecebida", "pagManualValorTotal"].forEach(id => {
    modal.querySelector(`#${id}`)?.addEventListener("input", atualizarPreviewManual);
  });
  modal.querySelector("#formPagamentoManualFinanceiro")?.addEventListener("submit", salvarLancamentoManual);
}

function criarPainelRestantes() {
  if (document.getElementById("painelRestantesPagamento")) return;
  const pagina = document.getElementById("pagamentos");
  const ancora = pagina?.querySelector(".pagamento-cards") || pagina?.querySelector(".pagamento-filtros-entregas");
  if (!pagina || !ancora) return;
  const painel = document.createElement("section");
  painel.id = "painelRestantesPagamento";
  painel.className = "hidden";
  painel.innerHTML = `
    <div class="restantes-pagamento-header">
      <div>
        <h3>Restantes pendentes para pagamento</h3>
        <p>Peças que ainda não chegaram e não podem ser pagas até o recebimento complementar.</p>
      </div>
      <div class="actions">
        <button class="btn" id="btnAtualizarRestantesPagamento" type="button">Atualizar</button>
        <button class="btn" id="btnFecharRestantesPagamento" type="button">Fechar</button>
      </div>
    </div>
    <div id="resumoRestantesPagamento" class="restantes-pagamento-resumo">Carregando...</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>OP</th><th>Ref.</th><th>Processo</th><th>Facção</th><th>Pendente</th><th>Desde</th><th>Ação</th></tr></thead>
        <tbody id="listaRestantesPagamento"><tr><td colspan="7" class="empty">Nenhum restante carregado.</td></tr></tbody>
      </table>
    </div>`;
  ancora.insertAdjacentElement("afterend", painel);
  painel.querySelector("#btnAtualizarRestantesPagamento")?.addEventListener("click", carregarRestantes);
  painel.querySelector("#btnFecharRestantesPagamento")?.addEventListener("click", () => painel.classList.add("hidden"));
  painel.querySelector("#listaRestantesPagamento")?.addEventListener("click", event => {
    const botao = event.target.closest("[data-receber-restante-pagamento]");
    if (botao) abrirModalRestante(botao.dataset.receberRestantePagamento);
  });
}

function criarModalRestante() {
  if (document.getElementById("modalReceberRestantePagamento")) return;
  const modal = document.createElement("div");
  modal.id = "modalReceberRestantePagamento";
  modal.className = "modal-backdrop hidden";
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div><h3>Registrar chegada do restante</h3><p>Gere o pagamento apenas das peças recebidas nesta entrega.</p></div>
        <button class="modal-close" id="btnFecharRestantePagamento" type="button">×</button>
      </div>
      <form id="formReceberRestantePagamento" class="form">
        <div id="infoRestantePagamento" class="pagamento-manual-resumo"></div>
        <div class="pagamento-manual-grid">
          <label>
            Quantidade recebida agora
            <input id="restPagQuantidadeRecebida" type="number" min="1" step="1" required />
          </label>
          <label>
            Data da chegada
            <input id="restPagDataChegada" type="date" required />
          </label>
          <label class="campo-largo">
            Valor total final desta entrega <small>(opcional)</small>
            <input id="restPagValorTotal" type="text" inputmode="decimal" placeholder="Deixe vazio para o financeiro preencher depois" />
          </label>
          <label class="campo-largo">
            Observações
            <textarea id="restPagObservacoes" rows="3"></textarea>
          </label>
        </div>
        <div id="previewRestantePagamento" class="pagamento-manual-preview"></div>
        <label class="check">
          <input id="restPagConfirmacao" type="checkbox" required />
          <span>Conferi a quantidade recebida e o saldo que continuará pendente.</span>
        </label>
        <div class="actions">
          <button class="btn btn-success" id="btnSalvarRestantePagamento" type="submit">Salvar chegada complementar</button>
          <button class="btn" id="btnCancelarRestantePagamento" type="button">Cancelar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("#btnFecharRestantePagamento")?.addEventListener("click", fecharModalRestante);
  modal.querySelector("#btnCancelarRestantePagamento")?.addEventListener("click", fecharModalRestante);
  modal.addEventListener("click", event => { if (event.target === modal) fecharModalRestante(); });
  ["restPagQuantidadeRecebida", "restPagValorTotal"].forEach(id => modal.querySelector(`#${id}`)?.addEventListener("input", atualizarPreviewRestante));
  modal.querySelector("#formReceberRestantePagamento")?.addEventListener("submit", salvarRecebimentoRestante);
}

function criarBotoes() {
  const pagina = document.getElementById("pagamentos");
  if (!pagina || !podeGerenciarFinanceiro(perfilAtual)) return;
  const cabecalho = pagina.querySelector(".pagamentos-relatorio-panel > .panel-header:first-child");
  if (!cabecalho) return;
  let actions = cabecalho.querySelector(".actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "actions";
    cabecalho.appendChild(actions);
  }
  if (!document.getElementById("btnPagamentoManualFinanceiro")) {
    const botao = document.createElement("button");
    botao.id = "btnPagamentoManualFinanceiro";
    botao.className = "btn btn-pagamento-manual";
    botao.type = "button";
    botao.textContent = "Novo lançamento manual";
    botao.addEventListener("click", abrirModalLancamento);
    actions.prepend(botao);
  }
  if (!document.getElementById("btnRestantesPagamento")) {
    const botao = document.createElement("button");
    botao.id = "btnRestantesPagamento";
    botao.className = "btn btn-restantes-pagamento";
    botao.type = "button";
    botao.innerHTML = `Restantes pendentes <span id="contadorRestantesPagamento" class="contador-restante-pagamento hidden">0</span>`;
    botao.addEventListener("click", async () => {
      criarPainelRestantes();
      const painel = document.getElementById("painelRestantesPagamento");
      const abrir = painel?.classList.contains("hidden");
      painel?.classList.toggle("hidden", !abrir);
      if (abrir) await carregarRestantes();
    });
    actions.prepend(botao);
  }
}

function resetarFormularioManual() {
  opAtual = null;
  const form = document.getElementById("formPagamentoManualFinanceiro");
  form?.reset();
  const data = document.getElementById("pagManualDataChegada");
  if (data) data.value = hojeISO();
  const resumo = document.getElementById("resumoOPPagamentoManual");
  if (resumo) { resumo.innerHTML = ""; resumo.classList.add("hidden"); }
  const faccao = document.getElementById("pagManualFaccao");
  if (faccao) { faccao.disabled = true; faccao.innerHTML = '<option value="">Escolha o processo primeiro</option>'; }
  document.getElementById("componentesSutiaPagamentoManual")?.classList.add("hidden");
  const preview = document.getElementById("previewPagamentoManual");
  if (preview) preview.textContent = "Busque uma OP para iniciar.";
}

async function abrirModalLancamento() {
  criarModalLancamento();
  resetarFormularioManual();
  document.getElementById("modalPagamentoManualFinanceiro")?.classList.remove("hidden");
  await carregarFaccoes();
  document.getElementById("pagManualNumeroOP")?.focus();
}

function fecharModalLancamento() {
  document.getElementById("modalPagamentoManualFinanceiro")?.classList.add("hidden");
}

async function carregarFaccoes() {
  if (!contexto?.db) return;
  try {
    const snap = await getDocs(collection(contexto.db, "faccoes"));
    faccoesCache = snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.ativo !== false)
      .map(item => ({
        ...item,
        nomeExibicao: String(item.nome || item.nomeFaccao || item.razaoSocial || item.apelido || "").trim()
      }))
      .filter(item => item.nomeExibicao);
  } catch (error) {
    console.warn("Não foi possível carregar facções para o lançamento manual.", error);
    faccoesCache = [];
  }
}

function faccoesDoProcesso(processo) {
  const alvo = normalizar(processo);
  const vinculadas = faccoesCache.filter(item => {
    const processos = Array.isArray(item.processos) ? item.processos : [];
    const campos = [item.processo, item.tipoProcesso, ...processos].filter(Boolean);
    return campos.some(valor => normalizar(valor) === alvo);
  }).map(item => item.nomeExibicao);
  const padrao = FACCOES_PADRAO[processo] || [];
  const todas = [...vinculadas, ...padrao];
  const unicas = new Map();
  todas.forEach(nome => unicas.set(normalizar(nome), nome));
  return [...unicas.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function atualizarProcessoManual() {
  const processo = document.getElementById("pagManualProcesso")?.value || "";
  const select = document.getElementById("pagManualFaccao");
  if (select) {
    const nomes = faccoesDoProcesso(processo);
    select.disabled = !processo;
    select.innerHTML = processo
      ? `<option value="">Selecione a facção</option>${nomes.map(nome => `<option value="${escapar(nome)}">${escapar(nome)}</option>`).join("")}`
      : '<option value="">Escolha o processo primeiro</option>';
  }
  document.getElementById("componentesSutiaPagamentoManual")?.classList.toggle("hidden", !processoComComponentes(processo));
  atualizarPreviewManual();
}

async function procurarOP(numeroOP) {
  const texto = String(numeroOP || "").trim();
  if (!texto || !contexto?.db) return null;
  const consultas = [
    query(collection(contexto.db, "ordensProducao"), where("numeroOP", "==", texto), limit(5))
  ];
  const numerico = Number(texto);
  if (Number.isFinite(numerico)) consultas.push(query(collection(contexto.db, "ordensProducao"), where("numeroOP", "==", numerico), limit(5)));
  consultas.push(query(collection(contexto.db, "ordensProducao"), where("numeroOPExterno", "==", texto), limit(5)));
  consultas.push(query(collection(contexto.db, "ordensProducao"), where("op", "==", texto), limit(5)));
  for (const consulta of consultas) {
    try {
      const snap = await getDocs(consulta);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (error) {
      console.warn("Consulta alternativa de OP não disponível.", error);
    }
  }
  return null;
}

async function buscarOPManual() {
  const botao = document.getElementById("btnBuscarOPPagamentoManual");
  const numeroOP = document.getElementById("pagManualNumeroOP")?.value;
  if (!numeroOP) { avisar("Informe o número da OP.", "erro"); return; }
  const textoOriginal = botao?.textContent || "Buscar OP";
  if (botao) { botao.disabled = true; botao.textContent = "Buscando..."; }
  try {
    opAtual = await procurarOP(numeroOP);
    if (!opAtual) {
      avisar("OP não encontrada. Confira o número informado.", "erro");
      return;
    }
    const numeroExibicao = opAtual.numeroOP || opAtual.numeroOPExterno || opAtual.op || numeroOP;
    const referencia = opAtual.referencia || opAtual.ref || "-";
    const cor = opAtual.cor || "-";
    const quantidade = inteiro(opAtual.quantidade || opAtual.qtd || opAtual.quantidadeTotal || opAtual.totalPecas);
    const produto = opAtual.produtoNome || opAtual.nomeProduto || opAtual.nome || "-";
    document.getElementById("pagManualNumeroOP").value = numeroExibicao;
    document.getElementById("pagManualQuantidadeEnviada").value = quantidade || "";
    document.getElementById("pagManualQuantidadeRecebida").value = quantidade || "";
    const resumo = document.getElementById("resumoOPPagamentoManual");
    if (resumo) {
      resumo.innerHTML = `
        <div class="pagamento-manual-resumo-item"><small>OP</small><strong>${escapar(numeroExibicao)}</strong></div>
        <div class="pagamento-manual-resumo-item"><small>Referência</small><strong>${escapar(referencia)}</strong></div>
        <div class="pagamento-manual-resumo-item"><small>Cor</small><strong>${escapar(cor)}</strong></div>
        <div class="pagamento-manual-resumo-item"><small>Quantidade</small><strong>${quantidade.toLocaleString("pt-BR")}</strong></div>
        <div class="pagamento-manual-resumo-item campo-largo"><small>Produto</small><strong>${escapar(produto)}</strong></div>`;
      resumo.classList.remove("hidden");
    }
    atualizarPreviewManual();
  } finally {
    if (botao) { botao.disabled = false; botao.textContent = textoOriginal; }
  }
}

function atualizarPreviewManual() {
  const preview = document.getElementById("previewPagamentoManual");
  if (!preview) return;
  if (!opAtual) { preview.textContent = "Busque uma OP para iniciar."; return; }
  const enviada = inteiro(document.getElementById("pagManualQuantidadeEnviada")?.value);
  const recebida = inteiro(document.getElementById("pagManualQuantidadeRecebida")?.value);
  const restante = Math.max(enviada - recebida, 0);
  const valorTexto = document.getElementById("pagManualValorTotal")?.value || "";
  const valor = numero(valorTexto);
  preview.innerHTML = `
    Recebidas agora: <strong>${recebida.toLocaleString("pt-BR")}</strong> peça(s).<br>
    ${restante > 0 ? `Restante que ficará pendente: <strong>${restante.toLocaleString("pt-BR")}</strong> peça(s).` : "A OP ficará sem saldo restante."}<br>
    ${valorTexto.trim() ? `Pagamento criado com valor total de <strong>${moeda(valor)}</strong>.` : "O pagamento será criado <strong>aguardando valor</strong> para o financeiro preencher depois."}`;
}

function documentoRestante({ movimento, restanteId, quantidade, sequencia, usuario, dataGeracao }) {
  const qtd = inteiro(quantidade);
  return {
    id: restanteId,
    origem: "restante_faccao",
    origemRestanteFaccao: true,
    origemManualPagamentos: movimento.origemManualPagamentos === true,
    tipoDestino: "faccao",
    tipoDestinoLabel: "Facção",
    movimentacaoOrigemId: movimento.movimentacaoOrigemId || movimento.id || "",
    movimentacaoRaizId: movimento.movimentacaoRaizId || movimento.movimentacaoOrigemId || movimento.id || "",
    restanteSequencia: Math.max(1, Number(sequencia) || 1),
    restantePendente: true,
    restanteStatus: "pendente",
    opId: movimento.opId || "",
    numeroOP: movimento.numeroOP || "",
    referencia: movimento.referencia || "",
    cor: movimento.cor || "",
    produtoNome: movimento.produtoNome || "",
    setor: movimento.setor || setorDoProcesso(movimento.processo),
    setorLabel: movimento.setorLabel || labelSetor(movimento.setor || setorDoProcesso(movimento.processo)),
    destino: movimento.destino || "",
    destinoId: movimento.destinoId || "",
    processo: movimento.processo || "",
    processoMovimentacao: movimento.processo || "",
    quantidadeEnviada: qtd,
    quantidadeRecebida: 0,
    quantidadeRestantePendente: qtd,
    falta: qtd,
    dataEnvio: movimento.dataEnvio || "",
    dataGeracaoRestante: dataGeracao || movimento.dataChegada || hojeISO(),
    dataChegada: "",
    descontoDefeito: 0,
    defeito: 0,
    status: "restante_pendente",
    lateralPronta: movimento.lateralPronta ?? null,
    lateralProntaStatus: movimento.lateralProntaStatus ?? "nao_informado",
    bojoPronto: movimento.bojoPronto ?? null,
    lateralProntaChegada: movimento.lateralProntaChegada ?? movimento.lateralPronta ?? null,
    lateralProntaChegadaStatus: movimento.lateralProntaChegadaStatus ?? movimento.lateralProntaStatus ?? "nao_informado",
    bojoProntoChegada: movimento.bojoProntoChegada ?? movimento.bojoPronto ?? null,
    observacoes: `Restante automático de ${qtd} peça(s) da OP ${movimento.numeroOP || "-"}.`,
    criadoPor: usuario.uid,
    criadoEm: serverTimestamp(),
    atualizadoPor: usuario.uid,
    atualizadoEm: serverTimestamp(),
    versaoRestanteFaccao: RELEASE
  };
}

function dadosPagamentoManual({ movimento, pagamentoId, quantidade, valorTotal, usuario, observacoes, origemComplementar = false }) {
  const qtd = inteiro(quantidade);
  const total = Math.max(0, numero(valorTotal));
  const comValor = total > 0;
  const valorUnitario = comValor && qtd > 0 ? total / qtd : 0;
  return {
    id: pagamentoId,
    origem: origemComplementar ? "restante_faccao" : "lancamento_manual_pagamentos",
    origemManualPagamentos: true,
    pagamentoManualFinanceiro: true,
    pagamentoComplementarRestante: origemComplementar,
    movimentacaoId: movimento.id,
    movimentacaoOrigemId: movimento.movimentacaoOrigemId || "",
    pagamentoReenvio: origemComplementar,
    opId: movimento.opId || "",
    numeroOP: movimento.numeroOP || "",
    referencia: movimento.referencia || "",
    cor: movimento.cor || "",
    produtoNome: movimento.produtoNome || "",
    faccao: movimento.destino || "",
    precoReferenciaId: "",
    processo: movimento.processo || "",
    processoMovimentacao: movimento.processo || "",
    servicoId: "",
    servicoNome: movimento.processo || "",
    setor: movimento.setor || setorDoProcesso(movimento.processo),
    setorLabel: movimento.setorLabel || labelSetor(movimento.setor || setorDoProcesso(movimento.processo)),
    dataEntrega: movimento.dataChegada || hojeISO(),
    quantidade: qtd,
    falta: inteiro(movimento.falta),
    descontoDefeito: 0,
    subtotal: total,
    valorUnitario,
    total,
    statusPagamento: comValor ? "pendente" : "sem_valor",
    valorPendente: !comValor,
    valorManualFinanceiroPendente: !comValor,
    valorManualFinanceiro: comValor,
    valorTotalDefinidoManualmente: comValor,
    valorTotalManual: total,
    formaValorPagamento: comValor ? "total_manual_lancamento_pagamentos" : "total_manual_op",
    motivoValorPendente: comValor ? "" : "lancamento_manual_pagamentos_sem_valor",
    avisoPagamento: comValor ? "" : "Financeiro deve informar o valor total final deste lançamento manual.",
    observacoes: observacoes || (comValor
      ? "Lançamento manual criado pelo financeiro com valor total definido."
      : "Lançamento manual criado sem valor; aguardando definição do financeiro."),
    criadoPor: usuario.uid,
    criadoEm: serverTimestamp(),
    atualizadoPor: usuario.uid,
    atualizadoEm: serverTimestamp(),
    versaoGeracao: RELEASE,
    versaoRegistro: RELEASE
  };
}

async function salvarLancamentoManual(event) {
  event.preventDefault();
  if (salvandoLancamento || !contexto?.user || !opAtual) return;
  const usuario = contexto.user;
  const processo = document.getElementById("pagManualProcesso")?.value || "";
  const faccao = document.getElementById("pagManualFaccao")?.value || "";
  const quantidadeEnviada = inteiro(document.getElementById("pagManualQuantidadeEnviada")?.value);
  const quantidadeRecebida = inteiro(document.getElementById("pagManualQuantidadeRecebida")?.value);
  const dataEnvio = document.getElementById("pagManualDataEnvio")?.value || "";
  const dataChegada = document.getElementById("pagManualDataChegada")?.value || "";
  const valorTexto = document.getElementById("pagManualValorTotal")?.value || "";
  const valorTotal = valorTexto.trim() ? numero(valorTexto, -1) : 0;
  const observacoes = document.getElementById("pagManualObservacoes")?.value.trim() || "";
  const confirmado = document.getElementById("pagManualConfirmacao")?.checked;
  if (!processo || !faccao || !quantidadeEnviada || !quantidadeRecebida || !dataChegada || !confirmado) {
    avisar("Preencha e confira todos os campos obrigatórios.", "erro"); return;
  }
  if (quantidadeRecebida > quantidadeEnviada) {
    avisar("A quantidade recebida não pode ser maior que a quantidade da OP/enviada.", "erro"); return;
  }
  if (valorTexto.trim() && valorTotal <= 0) {
    avisar("Informe um valor total válido ou deixe o campo em branco.", "erro"); return;
  }
  const numeroOP = String(opAtual.numeroOP || opAtual.numeroOPExterno || opAtual.op || document.getElementById("pagManualNumeroOP")?.value || "").trim();
  const referencia = String(opAtual.referencia || opAtual.ref || "").trim().toUpperCase();
  const cor = String(opAtual.cor || "").trim().toUpperCase();
  if (!numeroOP || !referencia) { avisar("A OP não possui número ou referência válida.", "erro"); return; }
  const restante = quantidadeEnviada - quantidadeRecebida;
  const baseId = `manual-pag-${slug(numeroOP)}-${slug(processo)}-${slug(faccao)}-${dataChegada}`.slice(0, 180);
  const movimentoId = baseId;
  const pagamentoId = `${baseId}-pagamento`.slice(0, 190);
  const restanteId = restante > 0 ? `${baseId}-restante-1`.slice(0, 190) : "";
  const setor = setorDoProcesso(processo);
  const lateralStatus = document.getElementById("pagManualLateral")?.value || "nao_informado";
  const bojoStatus = document.getElementById("pagManualBojo")?.value || "nao_informado";
  const lateralPronta = respostaBooleana(lateralStatus);
  const bojoPronto = respostaBooleana(bojoStatus);
  const movimento = {
    id: movimentoId,
    origem: "lancamento_manual_pagamentos",
    origemManual: true,
    origemManualPagamentos: true,
    tipoDestino: "faccao",
    tipoDestinoLabel: "Facção",
    opId: opAtual.id || "",
    numeroOP,
    referencia,
    cor,
    produtoNome: opAtual.produtoNome || opAtual.nomeProduto || opAtual.nome || "",
    setor,
    setorLabel: labelSetor(setor),
    destino: faccao,
    processo,
    processoMovimentacao: processo,
    quantidadeEnviada,
    quantidadeRecebida,
    temRestantePendente: restante > 0,
    quantidadeRestantePendente: restante,
    restanteStatus: restante > 0 ? "pendente" : "concluido",
    restanteMovimentacaoId: restanteId,
    restanteAtualizadoPor: usuario.uid,
    restanteAtualizadoEm: serverTimestamp(),
    dataEnvio,
    dataEnvioNaoInformada: !dataEnvio,
    dataChegada,
    falta: restante,
    descontoDefeito: 0,
    defeito: 0,
    lateralPronta,
    lateralProntaStatus: lateralStatus,
    bojoPronto,
    lateralProntaChegada: lateralPronta,
    lateralProntaChegadaStatus: lateralStatus,
    bojoProntoChegada: bojoPronto,
    status: restante > 0 ? "retornou_parcial" : "retornou",
    observacoes: observacoes || `Lançamento manual pela aba Pagamentos. Recebido ${quantidadeRecebida}; restante ${restante}.`,
    criadoPor: usuario.uid,
    criadoEm: serverTimestamp(),
    atualizadoPor: usuario.uid,
    atualizadoEm: serverTimestamp(),
    versaoRegistro: RELEASE
  };
  const pagamento = dadosPagamentoManual({ movimento, pagamentoId, quantidade: quantidadeRecebida, valorTotal, usuario, observacoes });
  const botao = document.getElementById("btnSalvarPagamentoManual");
  const textoBotao = botao?.textContent || "Salvar lançamento manual";
  salvandoLancamento = true;
  if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
  try {
    await runTransaction(contexto.db, async transacao => {
      const movRef = doc(contexto.db, "movimentacoesProducao", movimentoId);
      const pagRef = doc(contexto.db, "entregasPagamento", pagamentoId);
      const [movSnap, pagSnap] = await Promise.all([transacao.get(movRef), transacao.get(pagRef)]);
      if (movSnap.exists() || pagSnap.exists()) throw new Error("DUPLICADO");
      transacao.set(movRef, movimento, { merge: false });
      if (restante > 0) {
        transacao.set(doc(contexto.db, "movimentacoesProducao", restanteId), documentoRestante({
          movimento,
          restanteId,
          quantidade: restante,
          sequencia: 1,
          usuario,
          dataGeracao: dataChegada
        }), { merge: false });
      }
      transacao.set(pagRef, pagamento, { merge: false });
      const logRef = doc(collection(contexto.db, "logsAlteracoes"));
      transacao.set(logRef, {
        acao: "lancamento_manual_pagamentos",
        entidade: "entregasPagamento",
        entidadeId: pagamentoId,
        detalhes: `OP ${numeroOP} | ${faccao} | ${processo} | enviada ${quantidadeEnviada} | recebida ${quantidadeRecebida} | restante ${restante} | valor ${valorTotal > 0 ? moeda(valorTotal) : "pendente"}`,
        usuarioId: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoEm: serverTimestamp(),
        versao: RELEASE
      });
    });
    fecharModalLancamento();
    avisar(restante > 0
      ? `Lançamento salvo. ${quantidadeRecebida.toLocaleString("pt-BR")} peças foram para pagamento e ${restante.toLocaleString("pt-BR")} ficaram em Restantes pendentes.`
      : `Lançamento salvo. ${quantidadeRecebida.toLocaleString("pt-BR")} peças foram encaminhadas para pagamento.`);
    await carregarRestantes();
    setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 350);
  } catch (error) {
    console.error("Erro ao salvar lançamento manual de pagamento.", error);
    avisar(error?.message === "DUPLICADO"
      ? "Já existe um lançamento manual igual para esta OP, facção, processo e data. Use o registro existente ou altere a data correta."
      : (String(error?.code || "").includes("permission-denied")
        ? "Sem permissão para criar o lançamento. Confira o perfil financeiro e as regras atuais do Firestore."
        : "Não foi possível salvar. Nenhuma parte da operação foi gravada."), "erro");
  } finally {
    salvandoLancamento = false;
    if (botao) { botao.disabled = false; botao.textContent = textoBotao; }
  }
}

function restantePendente(item) {
  return item && item.origemRestanteFaccao === true && item.excluido !== true && !item.dataChegada && inteiro(item.quantidadeEnviada || item.quantidadeRestantePendente || item.falta) > 0 && ["RESTANTE_PENDENTE", "PENDENTE"].includes(normalizar(item.status || item.restanteStatus || "restante_pendente"));
}

async function carregarRestantes() {
  if (!contexto?.db || !contexto.user) return;
  const resumo = document.getElementById("resumoRestantesPagamento");
  if (resumo) resumo.textContent = "Carregando pendências...";
  try {
    const snap = await getDocs(query(collection(contexto.db, "movimentacoesProducao"), where("origemRestanteFaccao", "==", true)));
    restantesCache = snap.docs.map(item => ({ id: item.id, ...item.data() })).filter(restantePendente).sort((a, b) => String(a.dataGeracaoRestante || "").localeCompare(String(b.dataGeracaoRestante || "")));
    renderRestantes();
  } catch (error) {
    console.error("Erro ao carregar restantes na aba Pagamentos.", error);
    if (resumo) resumo.textContent = "Não foi possível carregar os restantes pendentes.";
  }
}

function renderRestantes() {
  const tbody = document.getElementById("listaRestantesPagamento");
  const resumo = document.getElementById("resumoRestantesPagamento");
  const contador = document.getElementById("contadorRestantesPagamento");
  const totalPecas = restantesCache.reduce((soma, item) => soma + inteiro(item.quantidadeEnviada || item.quantidadeRestantePendente || item.falta), 0);
  if (contador) {
    contador.textContent = String(restantesCache.length);
    contador.classList.toggle("hidden", restantesCache.length === 0);
  }
  if (resumo) resumo.textContent = restantesCache.length
    ? `${restantesCache.length.toLocaleString("pt-BR")} pendência(s), somando ${totalPecas.toLocaleString("pt-BR")} peça(s) ainda não recebidas.`
    : "Nenhum restante pendente no momento.";
  if (!tbody) return;
  if (!restantesCache.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhum restante pendente.</td></tr>';
    return;
  }
  tbody.innerHTML = restantesCache.map(item => {
    const qtd = inteiro(item.quantidadeEnviada || item.quantidadeRestantePendente || item.falta);
    return `<tr>
      <td><strong>${escapar(item.numeroOP || "-")}</strong>${item.origemManualPagamentos ? '<span class="restante-origem-manual">Manual Pagamentos</span>' : ""}</td>
      <td>${escapar(item.referencia || "-")}</td>
      <td>${escapar(item.processo || "-")}</td>
      <td>${escapar(item.destino || "-")}</td>
      <td><strong>${qtd.toLocaleString("pt-BR")}</strong></td>
      <td>${dataBR(item.dataGeracaoRestante || item.dataEnvio)}</td>
      <td><button class="btn btn-sm btn-receber-restante-pagamento" type="button" data-receber-restante-pagamento="${escapar(item.id)}">Receber restante</button></td>
    </tr>`;
  }).join("");
}

function abrirModalRestante(id) {
  criarModalRestante();
  restanteSelecionado = restantesCache.find(item => item.id === id) || null;
  if (!restanteSelecionado) { avisar("Restante não encontrado. Atualize a lista.", "erro"); return; }
  const pendente = inteiro(restanteSelecionado.quantidadeEnviada || restanteSelecionado.quantidadeRestantePendente || restanteSelecionado.falta);
  const info = document.getElementById("infoRestantePagamento");
  if (info) info.innerHTML = `
    <div class="pagamento-manual-resumo-item"><small>OP</small><strong>${escapar(restanteSelecionado.numeroOP || "-")}</strong></div>
    <div class="pagamento-manual-resumo-item"><small>Referência</small><strong>${escapar(restanteSelecionado.referencia || "-")}</strong></div>
    <div class="pagamento-manual-resumo-item"><small>Facção</small><strong>${escapar(restanteSelecionado.destino || "-")}</strong></div>
    <div class="pagamento-manual-resumo-item"><small>Pendente</small><strong>${pendente.toLocaleString("pt-BR")}</strong></div>`;
  const form = document.getElementById("formReceberRestantePagamento");
  form?.reset();
  document.getElementById("restPagQuantidadeRecebida").value = pendente;
  document.getElementById("restPagQuantidadeRecebida").max = pendente;
  document.getElementById("restPagDataChegada").value = hojeISO();
  atualizarPreviewRestante();
  document.getElementById("modalReceberRestantePagamento")?.classList.remove("hidden");
}

function fecharModalRestante() {
  document.getElementById("modalReceberRestantePagamento")?.classList.add("hidden");
  restanteSelecionado = null;
}

function atualizarPreviewRestante() {
  const preview = document.getElementById("previewRestantePagamento");
  if (!preview || !restanteSelecionado) return;
  const pendente = inteiro(restanteSelecionado.quantidadeEnviada || restanteSelecionado.quantidadeRestantePendente || restanteSelecionado.falta);
  const recebida = inteiro(document.getElementById("restPagQuantidadeRecebida")?.value);
  const saldo = Math.max(pendente - recebida, 0);
  const valorTexto = document.getElementById("restPagValorTotal")?.value || "";
  const valor = numero(valorTexto);
  preview.innerHTML = `Recebidas agora: <strong>${recebida.toLocaleString("pt-BR")}</strong> peça(s).<br>${saldo > 0 ? `Novo saldo restante: <strong>${saldo.toLocaleString("pt-BR")}</strong> peça(s).` : "O restante será concluído."}<br>${valorTexto.trim() ? `Pagamento complementar: <strong>${moeda(valor)}</strong>.` : "Pagamento complementar ficará <strong>aguardando valor</strong>."}`;
}

async function salvarRecebimentoRestante(event) {
  event.preventDefault();
  if (salvandoRestante || !contexto?.user || !restanteSelecionado) return;
  const usuario = contexto.user;
  const recebida = inteiro(document.getElementById("restPagQuantidadeRecebida")?.value);
  const dataChegada = document.getElementById("restPagDataChegada")?.value || "";
  const valorTexto = document.getElementById("restPagValorTotal")?.value || "";
  const valorTotal = valorTexto.trim() ? numero(valorTexto, -1) : 0;
  const observacoes = document.getElementById("restPagObservacoes")?.value.trim() || "";
  const confirmado = document.getElementById("restPagConfirmacao")?.checked;
  const pendenteTela = inteiro(restanteSelecionado.quantidadeEnviada || restanteSelecionado.quantidadeRestantePendente || restanteSelecionado.falta);
  if (!recebida || !dataChegada || !confirmado) { avisar("Preencha e confira os campos obrigatórios.", "erro"); return; }
  if (recebida > pendenteTela) { avisar("A quantidade recebida é maior que o saldo pendente.", "erro"); return; }
  if (valorTexto.trim() && valorTotal <= 0) { avisar("Informe um valor válido ou deixe o campo vazio.", "erro"); return; }
  const botao = document.getElementById("btnSalvarRestantePagamento");
  const textoBotao = botao?.textContent || "Salvar chegada complementar";
  salvandoRestante = true;
  if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
  try {
    const resultado = await runTransaction(contexto.db, async transacao => {
      const restanteRef = doc(contexto.db, "movimentacoesProducao", restanteSelecionado.id);
      const pagamentoId = `${restanteSelecionado.id}-pagamento`.slice(0, 190);
      const pagamentoRef = doc(contexto.db, "entregasPagamento", pagamentoId);
      const raizId = restanteSelecionado.movimentacaoRaizId || restanteSelecionado.movimentacaoOrigemId || "";
      const raizRef = raizId ? doc(contexto.db, "movimentacoesProducao", raizId) : null;
      const leituras = [transacao.get(restanteRef), transacao.get(pagamentoRef)];
      if (raizRef) leituras.push(transacao.get(raizRef));
      const snaps = await Promise.all(leituras);
      const restSnap = snaps[0];
      const pagSnap = snaps[1];
      const raizSnap = raizRef ? snaps[2] : null;
      if (!restSnap.exists()) throw new Error("INEXISTENTE");
      const atual = { id: restSnap.id, ...restSnap.data() };
      if (!restantePendente(atual)) throw new Error("CONCLUIDO");
      if (pagSnap.exists() && pagSnap.data()?.excluido !== true) throw new Error("DUPLICADO");
      const pendente = inteiro(atual.quantidadeEnviada || atual.quantidadeRestantePendente || atual.falta);
      if (recebida > pendente) throw new Error("QUANTIDADE");
      const saldo = pendente - recebida;
      const proximaSequencia = Math.max(1, Number(atual.restanteSequencia) || 1) + 1;
      const proximoId = saldo > 0 ? `${slug(raizId || atual.id)}-restante-${proximaSequencia}`.slice(0, 190) : "";
      transacao.set(restanteRef, {
        dataChegada,
        quantidadeRecebida: recebida,
        falta: saldo,
        quantidadeRestantePendente: saldo,
        restantePendente: false,
        restanteStatus: saldo > 0 ? "entrega_parcial" : "concluido",
        status: saldo > 0 ? "retornou_parcial" : "retornou",
        chegadaComplementar: true,
        observacaoChegada: observacoes,
        proximoRestanteMovimentacaoId: proximoId,
        atualizadoPor: usuario.uid,
        atualizadoEm: serverTimestamp(),
        versaoRestanteFaccao: RELEASE
      }, { merge: true });
      const movimentoPagamento = {
        ...atual,
        id: atual.id,
        dataChegada,
        quantidadeRecebida: recebida,
        falta: saldo,
        observacoes
      };
      if (saldo > 0) {
        transacao.set(doc(contexto.db, "movimentacoesProducao", proximoId), documentoRestante({
          movimento: { ...atual, id: atual.id, movimentacaoRaizId: raizId || atual.id },
          restanteId: proximoId,
          quantidade: saldo,
          sequencia: proximaSequencia,
          usuario,
          dataGeracao: dataChegada
        }), { merge: false });
      }
      if (raizRef && raizSnap?.exists()) {
        transacao.set(raizRef, {
          temRestantePendente: saldo > 0,
          quantidadeRestantePendente: saldo,
          restanteStatus: saldo > 0 ? "pendente" : "concluido",
          restanteMovimentacaoAtualId: proximoId,
          restanteAtualizadoPor: usuario.uid,
          restanteAtualizadoEm: serverTimestamp(),
          versaoRestanteFaccao: RELEASE
        }, { merge: true });
      }
      const pagamento = dadosPagamentoManual({
        movimento: movimentoPagamento,
        pagamentoId,
        quantidade: recebida,
        valorTotal,
        usuario,
        observacoes,
        origemComplementar: true
      });
      transacao.set(pagamentoRef, pagamento, { merge: false });
      const logRef = doc(collection(contexto.db, "logsAlteracoes"));
      transacao.set(logRef, {
        acao: "chegada_complementar_restante_pagamentos",
        entidade: "movimentacaoProducao",
        entidadeId: atual.id,
        detalhes: `OP ${atual.numeroOP || "-"} | ${atual.destino || "-"} | ${atual.processo || "-"} | pendente ${pendente} | recebido ${recebida} | saldo ${saldo} | valor ${valorTotal > 0 ? moeda(valorTotal) : "pendente"}`,
        usuarioId: usuario.uid,
        usuarioEmail: usuario.email || "",
        criadoEm: serverTimestamp(),
        versao: RELEASE
      });
      return { saldo };
    });
    fecharModalRestante();
    avisar(resultado.saldo > 0
      ? `Chegada complementar salva. Ainda restam ${resultado.saldo.toLocaleString("pt-BR")} peça(s).`
      : "Chegada complementar salva e o restante foi concluído.");
    await carregarRestantes();
    setTimeout(() => document.getElementById("btnAtualizarServidor")?.click(), 350);
  } catch (error) {
    console.error("Erro ao receber restante pela aba Pagamentos.", error);
    const mensagens = {
      INEXISTENTE: "O restante não existe mais. Atualize a lista.",
      CONCLUIDO: "Esse restante já foi recebido ou concluído.",
      DUPLICADO: "Já existe pagamento para esta entrega complementar.",
      QUANTIDADE: "A quantidade informada é maior que o saldo atual."
    };
    avisar(mensagens[error?.message] || (String(error?.code || "").includes("permission-denied")
      ? "Sem permissão para registrar a chegada complementar."
      : "Não foi possível salvar. Nenhuma alteração foi gravada."), "erro");
  } finally {
    salvandoRestante = false;
    if (botao) { botao.disabled = false; botao.textContent = textoBotao; }
  }
}

async function carregarPerfil(usuario) {
  if (!usuario || !contexto?.db) return null;
  try {
    const snap = await getDoc(doc(contexto.db, "usuarios", usuario.uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Erro ao carregar perfil financeiro.", error);
    return null;
  }
}

async function configurarUsuario(usuario) {
  contexto.user = usuario || null;
  perfilAtual = usuario ? await carregarPerfil(usuario) : null;
  if (!usuario || !podeGerenciarFinanceiro(perfilAtual)) return;
  injetarEstilos();
  criarModalLancamento();
  criarModalRestante();
  criarPainelRestantes();
  criarBotoes();
  await carregarFaccoes();
  await carregarRestantes();
}

async function conectarFirebase(tentativa = 0) {
  try {
    if (!getApps().length) throw new Error("Firebase ainda não inicializado");
    const app = getApp();
    const auth = getAuth(app);
    contexto = { app, auth, db: getFirestore(app), user: null };
    onAuthStateChanged(auth, configurarUsuario);
  } catch (error) {
    if (tentativa < 30) {
      setTimeout(() => conectarFirebase(tentativa + 1), 300);
      return;
    }
    console.error("Não foi possível iniciar o lançamento manual de Pagamentos.", error);
  }
}

function iniciar() {
  if (window.__CORPONU_PAGAMENTOS_MANUAL_ATIVO__) return;
  window.__CORPONU_PAGAMENTOS_MANUAL_ATIVO__ = RELEASE;
  injetarEstilos();
  criarModalLancamento();
  criarModalRestante();
  criarPainelRestantes();
  conectarFirebase();
  const observador = new MutationObserver(() => {
    if (perfilAtual && podeGerenciarFinanceiro(perfilAtual)) {
      criarBotoes();
      criarPainelRestantes();
    }
  });
  observador.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
else iniciar();

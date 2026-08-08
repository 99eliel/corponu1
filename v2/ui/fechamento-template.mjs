import { PROCESSOS_FINANCEIROS } from "../core/financeiro-regras.mjs";

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function templateFechamentoPagamento({ competenciaPadrao = "" } = {}) {
  const opcoesProcesso = PROCESSOS_FINANCEIROS
    .map(processo => `<option value="${escapar(processo)}">${escapar(processo)}</option>`)
    .join("");

  return `
    <section class="v2-fechamento" data-v2-fechamento>
      <header class="v2-fechamento__header">
        <div>
          <h3>Fechamento de Pagamentos</h3>
          <p>Registre o serviço feito por OP e competência mensal. O financeiro é independente do fluxo operacional.</p>
        </div>
      </header>

      <form class="v2-fechamento__form" data-v2-fechamento-form>
        <div class="v2-fechamento__busca">
          <label>
            OP
            <input id="v2FechamentoOP" name="numeroOP" type="text" inputmode="numeric" autocomplete="off" required />
          </label>
          <button type="button" class="btn btn-primary" data-v2-buscar-op>Buscar OP</button>
        </div>

        <div class="v2-fechamento__resumo hidden" data-v2-resumo-op aria-live="polite"></div>

        <div class="v2-fechamento__grid">
          <label>
            Serviço feito
            <select id="v2FechamentoProcesso" name="processo" required>
              <option value="">Selecione</option>
              ${opcoesProcesso}
            </select>
          </label>

          <label>
            Quem fez
            <select id="v2FechamentoResponsavel" name="responsavel" required disabled>
              <option value="">Escolha o serviço primeiro</option>
            </select>
          </label>

          <label>
            Competência
            <input id="v2FechamentoCompetencia" name="competencia" type="month" value="${escapar(competenciaPadrao)}" required />
          </label>

          <label>
            Quantidade a fechar
            <input id="v2FechamentoQuantidade" name="quantidade" type="number" min="1" step="1" required />
          </label>

          <label>
            Ocorrência
            <input id="v2FechamentoOcorrencia" name="ocorrencia" type="number" min="1" step="1" value="1" required />
            <small>Use 2, 3... somente para retrabalho/novo serviço legítimo da mesma OP.</small>
          </label>
        </div>

        <fieldset class="v2-fechamento__componentes hidden" data-v2-componentes>
          <legend>Conferência do Sutiã Completo</legend>

          <label>
            Lateral já foi feita?
            <select name="lateral">
              <option value="">Selecione</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>

          <label>
            Bojo já foi feito?
            <select name="bojo">
              <option value="">Selecione</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>

          <label>
            Fecho foi feito?
            <select name="fecho">
              <option value="">Selecione</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>

          <label>
            Ponto de luz foi feito?
            <select name="pontoLuz">
              <option value="">Selecione</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>
        </fieldset>

        <label>
          Observações
          <textarea id="v2FechamentoObservacoes" name="observacoes" rows="3" placeholder="Opcional"></textarea>
        </label>

        <div class="v2-fechamento__preview" data-v2-preview>
          Busque uma OP para iniciar o fechamento.
        </div>

        <div class="v2-fechamento__acoes">
          <button class="btn btn-success" type="submit">Adicionar ao fechamento</button>
          <button class="btn" type="reset">Limpar</button>
        </div>
      </form>
    </section>
  `;
}

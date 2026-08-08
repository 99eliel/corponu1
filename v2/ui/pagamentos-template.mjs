function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function templatePagamentos({ competenciaPadrao = "" } = {}) {
  return `
    <section class="v2-pagamentos" data-v2-pagamentos>
      <header class="v2-pagamentos__header">
        <div>
          <h3>Pagamentos</h3>
          <p>Consulte lançamentos novos e o histórico já existente. Registros antigos são preservados sem migração ou alteração automática.</p>
        </div>
        <div class="v2-pagamentos__header-actions">
          <button type="button" class="btn" data-v2-relatorio-completo>Imprimir relatório completo</button>
          <button type="button" class="btn" data-v2-relatorio-simples>Imprimir Nome + PIX + Valor</button>
        </div>
      </header>

      <div class="v2-pagamentos__filtros" data-v2-pagamentos-filtros>
        <label>Competência<input type="month" name="competencia" value="${escapar(competenciaPadrao)}" /></label>
        <label>Responsável<input type="text" name="responsavel" autocomplete="off" placeholder="Todos" /></label>
        <label>Referência<input type="text" name="referencia" autocomplete="off" placeholder="Todas" /></label>
        <label>Processo<input type="text" name="processo" autocomplete="off" placeholder="Todos" /></label>
        <label>OP<input type="text" name="numeroOP" autocomplete="off" placeholder="Todas" /></label>
        <label>Origem
          <select name="origem">
            <option value="todos">Todos</option>
            <option value="v2">Fechamento V2</option>
            <option value="historico">Histórico</option>
          </select>
        </label>
        <label>Status
          <select name="status">
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
            <option value="sem_valor">Aguardando valor</option>
          </select>
        </label>
        <button type="button" class="btn btn-primary" data-v2-aplicar-filtros>Aplicar filtros</button>
        <button type="button" class="btn" data-v2-limpar-filtros>Limpar</button>
      </div>

      <div class="v2-pagamentos__resumo" data-v2-pagamentos-resumo></div>

      <div class="v2-pagamentos__acoes-lote">
        <button type="button" class="btn btn-success" data-v2-quitar-filtrados>Confirmar pagamentos filtrados</button>
        <small>A confirmação considera somente pagamentos com valor e status Pendente. Registros “Aguardando valor” nunca entram na quitação.</small>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OP</th><th>Competência</th><th>Origem</th><th>Responsável</th><th>Referência</th><th>Processo</th>
              <th>Qtd.</th><th>Unitário</th><th>Total</th><th>Status</th>
            </tr>
          </thead>
          <tbody data-v2-pagamentos-lista></tbody>
        </table>
      </div>

      <div class="v2-pagamentos__rodape">
        <button type="button" class="btn" data-v2-carregar-mais>Carregar mais</button>
        <span data-v2-pagamentos-status></span>
      </div>
    </section>
  `;
}

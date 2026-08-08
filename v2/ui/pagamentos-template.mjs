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
          <p>Consulte e quite lançamentos do Fechamento por competência. Esta tela não lê Facções operacionais nem movimentações.</p>
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
        <label>Status
          <select name="status">
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
          </select>
        </label>
        <button type="button" class="btn btn-primary" data-v2-aplicar-filtros>Aplicar filtros</button>
        <button type="button" class="btn" data-v2-limpar-filtros>Limpar</button>
      </div>

      <div class="v2-pagamentos__resumo" data-v2-pagamentos-resumo></div>

      <div class="v2-pagamentos__acoes-lote">
        <button type="button" class="btn btn-success" data-v2-quitar-filtrados>Confirmar pagamentos filtrados</button>
        <small>A confirmação considera todos os registros da competência que correspondem aos filtros, inclusive páginas ainda não carregadas.</small>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OP</th><th>Competência</th><th>Responsável</th><th>Referência</th><th>Processo</th>
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

export function templateManejoV2() {
  return `
    <section class="v2-manejo" data-v2-manejo>
      <header class="v2-manejo__header">
        <div>
          <h3>Manejo das Ordens</h3>
          <p>Organização operacional da OP. Nenhuma ação desta tela gera pagamento.</p>
        </div>
        <div class="v2-manejo__tabs" role="tablist" aria-label="Setor do Manejo">
          <button class="btn btn-primary" type="button" data-v2-manejo-setor="sutia" aria-selected="true">Sutiã</button>
          <button class="btn" type="button" data-v2-manejo-setor="calcinha" aria-selected="false">Calcinha</button>
        </div>
      </header>

      <div class="v2-manejo__filtros" data-v2-manejo-filtros>
        <label>
          Buscar
          <input type="search" name="busca" placeholder="OP, ref., cor, fase bojo, fase lateral..." />
        </label>
        <label>
          Status
          <select name="status"><option value="">Todos</option></select>
        </label>
        <label>
          Referência
          <select name="referencia"><option value="">Todas</option></select>
        </label>
        <label>
          Cor
          <select name="cor"><option value="">Todas</option></select>
        </label>
        <label>
          Fase Bojo
          <select name="faseBojo"><option value="">Todas</option></select>
        </label>
        <label>
          Fase Lateral
          <select name="faseLateral"><option value="">Todas</option></select>
        </label>
        <label>
          Necessidade
          <select name="necessidade"><option value="">Todas</option></select>
        </label>
        <button class="btn" type="button" data-v2-limpar-filtros>Limpar filtros</button>
      </div>

      <div class="v2-manejo__status" data-v2-manejo-status aria-live="polite"></div>

      <datalist id="v2ManejoFasesSugestoes">
        <option value="ENFESTO"></option>
        <option value="CORTE"></option>
        <option value="SEPARAÇÃO"></option>
        <option value="SILK"></option>
        <option value="PREPARAÇÃO"></option>
      </datalist>

      <div class="table-wrap v2-manejo__table-wrap">
        <table class="v2-manejo__table">
          <thead>
            <tr>
              <th>OP</th>
              <th>Ref.</th>
              <th>Cor</th>
              <th>Qtd.</th>
              <th>Necessidade</th>
              <th>Silk</th>
              <th>Data Silk</th>
              <th>Tecido</th>
              <th>Data Tecido</th>
              <th>Fase Bojo</th>
              <th>Fase Lateral</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody data-v2-manejo-lista></tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-v2-movimentacao-modal>
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h3 data-v2-movimentacao-titulo>Enviar para Facção</h3>
              <p data-v2-movimentacao-resumo></p>
            </div>
            <button class="modal-close" type="button" data-v2-fechar-movimentacao>×</button>
          </div>

          <form class="form" data-v2-movimentacao-form>
            <input type="hidden" name="ordemId" />

            <label>
              Processo
              <select name="processo" required></select>
            </label>

            <label>
              Facção
              <select name="destino" required disabled>
                <option value="">Escolha o processo primeiro</option>
              </select>
            </label>

            <label>
              Quantidade
              <input name="quantidade" type="number" min="1" step="1" required />
            </label>

            <label>
              Data de envio
              <input name="dataEnvio" type="date" required />
            </label>

            <div class="notice small" data-v2-movimentacao-aviso>
              Antes do envio, Silk e Data Tecido precisam estar preenchidos na linha do Manejo.
            </div>

            <div class="v2-movimentacao__status" data-v2-movimentacao-status aria-live="polite"></div>

            <div class="actions">
              <button class="btn btn-primary" type="submit">Confirmar envio</button>
              <button class="btn" type="button" data-v2-cancelar-movimentacao>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

export function templateFaccoesV2() {
  return `
    <section class="v2-faccoes" data-v2-faccoes>
      <header class="v2-faccoes__header">
        <div>
          <h3>Facções</h3>
          <p>Controle operacional de envio, chegada e reenvio. Nenhuma ação desta tela gera pagamento.</p>
        </div>
      </header>

      <div class="v2-faccoes__filtros" data-v2-faccoes-filtros>
        <label>
          Buscar
          <input type="search" name="busca" placeholder="OP, referência, cor, facção..." />
        </label>
        <label>
          Processo
          <select name="processo"><option value="">Todos</option></select>
        </label>
        <label>
          Facção
          <select name="destino"><option value="">Todas</option></select>
        </label>
        <label>
          Status
          <select name="status">
            <option value="">Todos</option>
            <option value="andamento">Em andamento</option>
            <option value="avisada">Chegada avisada</option>
            <option value="confirmada">Chegada confirmada</option>
            <option value="reenviado">Reenviado</option>
          </select>
        </label>
        <button class="btn" type="button" data-v2-faccoes-limpar>Limpar filtros</button>
      </div>

      <div class="v2-faccoes__status" data-v2-faccoes-status aria-live="polite"></div>

      <div class="table-wrap">
        <table class="v2-faccoes__table">
          <thead>
            <tr>
              <th>OP</th>
              <th>Ref.</th>
              <th>Cor</th>
              <th>Processo</th>
              <th>Facção</th>
              <th>Qtd.</th>
              <th>Envio</th>
              <th>Status</th>
              <th>Recebida</th>
              <th>Falta</th>
              <th>Defeito</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody data-v2-faccoes-lista></tbody>
        </table>
      </div>

      <div class="actions v2-faccoes__mais">
        <button class="btn" type="button" data-v2-faccoes-mais>Carregar mais</button>
      </div>

      <div class="modal-backdrop hidden" data-v2-chegada-modal>
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h3>Confirmar chegada</h3>
              <p data-v2-chegada-resumo></p>
            </div>
            <button class="modal-close" type="button" data-v2-chegada-fechar>×</button>
          </div>

          <form class="form" data-v2-chegada-form>
            <input type="hidden" name="movimentacaoId" />

            <label>
              Data de chegada
              <input type="date" name="dataChegada" required />
            </label>

            <div class="grid-2">
              <label>
                Falta
                <input type="number" name="falta" min="0" step="1" value="0" required />
              </label>
              <label>
                Defeito
                <input type="number" name="defeito" min="0" step="1" value="0" required />
              </label>
            </div>

            <section class="v2-chegada__componentes hidden" data-v2-chegada-componentes>
              <h4>Conferência do Sutiã Completo</h4>
              <p>O sistema pergunta somente o que ainda não possui informação confiável.</p>
              <div data-v2-chegada-componentes-campos></div>
            </section>

            <div class="v2-chegada__status" data-v2-chegada-status aria-live="polite"></div>

            <div class="actions">
              <button class="btn btn-success" type="submit">Confirmar chegada</button>
              <button class="btn" type="button" data-v2-chegada-cancelar>Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-v2-reenvio-modal>
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h3>Reenviar para facção</h3>
              <p data-v2-reenvio-resumo></p>
            </div>
            <button class="modal-close" type="button" data-v2-reenvio-fechar>×</button>
          </div>

          <form class="form" data-v2-reenvio-form>
            <input type="hidden" name="movimentacaoId" />

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
              <input type="number" name="quantidade" min="1" step="1" required />
            </label>

            <label>
              Data de envio
              <input type="date" name="dataEnvio" required />
            </label>

            <div class="notice small">
              Lateral e Bojo não bloqueiam o reenvio. Informação ausente continua como não informada.
            </div>

            <div class="v2-reenvio__status" data-v2-reenvio-status aria-live="polite"></div>

            <div class="actions">
              <button class="btn btn-primary" type="submit">Confirmar reenvio</button>
              <button class="btn" type="button" data-v2-reenvio-cancelar>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

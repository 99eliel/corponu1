import { PROCESSOS_CALCINHA } from "../core/ordens-regras.mjs";

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function templateOrdensV2() {
  const processos = PROCESSOS_CALCINHA
    .map(item => `<option value="${escapar(item)}">${escapar(item)}</option>`)
    .join("");

  return `
    <section class="v2-ordens" data-v2-ordens>
      <div class="v2-ordens__tabs" role="tablist" aria-label="Tipo da peça">
        <button class="btn btn-primary" type="button" data-v2-tipo="sutia" aria-selected="true">Sutiã</button>
        <button class="btn" type="button" data-v2-tipo="calcinha" aria-selected="false">Calcinha</button>
      </div>

      <div class="v2-ordens__layout">
        <form class="v2-ordens__form" data-v2-ordem-form>
          <input type="hidden" name="currentId" />
          <input type="hidden" name="tipoPeca" value="sutia" />

          <header>
            <h3 data-v2-ordem-titulo>Adicionar OP de Sutiã</h3>
            <p data-v2-ordem-descricao>Informe OP, referência, cor e quantidade. Necessidade é opcional.</p>
          </header>

          <label>
            Nº da OP
            <input name="numeroOP" type="text" inputmode="numeric" autocomplete="off" required />
          </label>

          <label>
            Referência
            <input name="referencia" type="text" autocomplete="off" required />
          </label>

          <label>
            Cor
            <input name="cor" type="text" autocomplete="off" required />
          </label>

          <label>
            Quantidade
            <input name="quantidade" type="number" min="1" step="1" required />
          </label>

          <label>
            Necessidade <small>(opcional)</small>
            <input name="necessidadeTexto" type="text" placeholder="Ex.: URGENTE, 24/08, observação livre" />
          </label>

          <section class="v2-ordens__calcinha hidden" data-v2-calcinha-campos>
            <div class="v2-ordens__datas">
              <label>
                Início da necessidade <small>(opcional)</small>
                <input name="necessidadeInicio" type="date" />
              </label>
              <label>
                Final da necessidade <small>(opcional)</small>
                <input name="necessidadeFim" type="date" />
              </label>
            </div>

            <div class="v2-ordens__planejamento">
              <label>
                Serviço planejado <small>(opcional)</small>
                <select name="processoPlanejado">
                  <option value="">Definir somente no envio</option>
                  ${processos}
                </select>
              </label>

              <label>
                Facção planejada <small>(opcional)</small>
                <select name="faccaoPlanejada" disabled>
                  <option value="">Definir somente no envio</option>
                </select>
              </label>
            </div>

            <div class="notice small">
              Serviço e facção podem ficar vazios. Cotton Line/Corpo Nu continua sendo definido no fluxo do Manejo.
            </div>
          </section>

          <label>
            Observações <small>(opcional)</small>
            <textarea name="observacoes" rows="3"></textarea>
          </label>

          <div class="v2-ordens__status" data-v2-ordem-status aria-live="polite"></div>

          <div class="actions">
            <button class="btn btn-primary" type="submit">Salvar OP</button>
            <button class="btn" type="reset">Limpar</button>
          </div>
        </form>

        <div class="v2-ordens__lista-panel">
          <header>
            <div>
              <h3>Ordens</h3>
              <p>A lista é alimentada pelo store V2 e atualiza imediatamente após cada gravação.</p>
            </div>
            <input type="search" data-v2-ordens-busca placeholder="Buscar OP, referência ou cor" />
          </header>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>OP</th>
                  <th>Tipo</th>
                  <th>Referência</th>
                  <th>Cor</th>
                  <th>Qtd.</th>
                  <th>Necessidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody data-v2-ordens-lista></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

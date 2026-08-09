(() => {
  "use strict";

  const VERSION = "2026-08-08-manejo-filtro-lateral-padrao-171";
  const POPUP_ID = "popupFiltroFaseLateral163";
  const STYLE_ID = "corponuManejoFiltroLateralPadrao171Style";
  const DECORADO = "data-filtro-lateral-padrao-171";

  if (window.__CORPONU_MANEJO_FILTRO_LATERAL_PADRAO_171__ === VERSION) return;
  window.__CORPONU_MANEJO_FILTRO_LATERAL_PADRAO_171__ = VERSION;

  function injetarEstilos() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${POPUP_ID}.fl171-padrao{
        width:min(360px,calc(100vw - 24px))!important;
        max-height:min(520px,calc(100vh - 24px))!important;
        padding:14px!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        background:#fff!important;
        border:1px solid #d7dfeb!important;
        border-radius:16px!important;
        box-shadow:0 20px 50px rgba(15,23,42,.22)!important;
        color:#182338!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-top{
        display:flex!important;
        align-items:flex-start!important;
        justify-content:space-between!important;
        gap:12px!important;
        margin:0!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-top strong{
        display:block!important;
        margin-top:2px!important;
        color:#172033!important;
        font-size:15px!important;
        line-height:1.25!important;
        font-weight:900!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-fechar{
        flex:0 0 32px!important;
        width:32px!important;
        height:32px!important;
        display:grid!important;
        place-items:center!important;
        padding:0!important;
        border:0!important;
        border-radius:9px!important;
        background:#f1f5f9!important;
        color:#64748b!important;
        font-size:18px!important;
        line-height:1!important;
        cursor:pointer!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-fechar:hover{
        background:#e8edf5!important;
        color:#334155!important;
      }
      #${POPUP_ID}.fl171-padrao .fl171-subtitulo{
        margin:-8px 44px 10px 0!important;
        color:#64748b!important;
        font-size:12px!important;
        line-height:1.3!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-busca{
        flex:0 0 auto!important;
        width:100%!important;
        height:44px!important;
        min-height:44px!important;
        box-sizing:border-box!important;
        margin:0 0 9px!important;
        padding:0 13px!important;
        border:1px solid #cbd6e5!important;
        border-radius:10px!important;
        background:#fff!important;
        color:#25324a!important;
        font-size:13px!important;
        font-weight:600!important;
        box-shadow:none!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-busca:focus{
        outline:none!important;
        border-color:#7c3aed!important;
        box-shadow:0 0 0 3px rgba(124,58,237,.12)!important;
      }
      #${POPUP_ID}.fl171-padrao .fl171-selecionar-todos{
        flex:0 0 auto!important;
        display:flex!important;
        align-items:center!important;
        gap:12px!important;
        width:100%!important;
        min-height:40px!important;
        box-sizing:border-box!important;
        margin:0 0 9px!important;
        padding:9px 12px!important;
        border:0!important;
        border-radius:8px!important;
        background:#edf4ff!important;
        color:#1d4ed8!important;
        cursor:pointer!important;
        font-size:13px!important;
        font-weight:900!important;
      }
      #${POPUP_ID}.fl171-padrao .fl171-selecionar-todos input,
      #${POPUP_ID}.fl171-padrao .fl163-opcao input[type="checkbox"]{
        appearance:auto!important;
        -webkit-appearance:checkbox!important;
        flex:0 0 17px!important;
        width:17px!important;
        min-width:17px!important;
        max-width:17px!important;
        height:17px!important;
        min-height:17px!important;
        max-height:17px!important;
        margin:0!important;
        padding:0!important;
        border-radius:3px!important;
        box-shadow:none!important;
        accent-color:#6d3af2!important;
        cursor:pointer!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-lista{
        flex:1 1 auto!important;
        display:block!important;
        min-height:0!important;
        max-height:286px!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        margin:0!important;
        padding:5px!important;
        border:1px solid #dbe3ee!important;
        border-radius:10px!important;
        background:#fff!important;
        scrollbar-width:thin;
        scrollbar-color:#8b8b8b #f1f5f9;
      }
      #${POPUP_ID}.fl171-padrao .fl163-opcao{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:12px!important;
        width:100%!important;
        min-height:39px!important;
        box-sizing:border-box!important;
        margin:0!important;
        padding:8px 10px!important;
        border-radius:7px!important;
        color:#202a3a!important;
        cursor:pointer!important;
        font-size:13px!important;
        font-weight:800!important;
        line-height:1.25!important;
        white-space:normal!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-opcao:hover{
        background:#f5f7fb!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-opcao:has(input:checked){
        background:#f0edff!important;
        color:#5b21b6!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-opcao span{
        display:block!important;
        flex:1 1 auto!important;
        min-width:0!important;
        margin:0!important;
        text-align:left!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-acoes{
        flex:0 0 auto!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:8px!important;
        margin:10px 0 0!important;
        padding:10px 0 0!important;
        border-top:1px solid #e2e8f0!important;
      }
      #${POPUP_ID}.fl171-padrao .fl163-acoes button{
        min-height:40px!important;
        height:40px!important;
        padding:0 13px!important;
        border-radius:9px!important;
        font-size:12.5px!important;
        font-weight:900!important;
        box-shadow:none!important;
      }
      #${POPUP_ID}.fl171-padrao [data-fl163-limpar]{
        margin-right:auto!important;
        border:1px solid #d7dfeb!important;
        background:#fff!important;
        color:#dc2626!important;
      }
      #${POPUP_ID}.fl171-padrao .fl171-cancelar{
        border:1px solid #cbd6e5!important;
        background:#fff!important;
        color:#334155!important;
      }
      #${POPUP_ID}.fl171-padrao [data-fl163-aplicar]{
        border:1px solid #6d3af2!important;
        background:#6d3af2!important;
        color:#fff!important;
      }
      #${POPUP_ID}.fl171-padrao [data-fl163-aplicar]:hover{
        background:#5b21b6!important;
        border-color:#5b21b6!important;
      }
      @media(max-width:520px){
        #${POPUP_ID}.fl171-padrao{padding:12px!important}
        #${POPUP_ID}.fl171-padrao .fl163-lista{max-height:250px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function checkboxesDaLista(popup) {
    return [...popup.querySelectorAll('.fl163-lista input[type="checkbox"]')];
  }

  function atualizarSelecionarTodos(popup) {
    const mestre = popup.querySelector('.fl171-selecionar-todos input[type="checkbox"]');
    if (!mestre) return;
    const checks = checkboxesDaLista(popup);
    const marcados = checks.filter(input => input.checked).length;
    mestre.disabled = checks.length === 0;
    mestre.checked = checks.length > 0 && marcados === checks.length;
    mestre.indeterminate = marcados > 0 && marcados < checks.length;
  }

  function decorarPopup(popup) {
    if (!popup || popup.getAttribute(DECORADO) === VERSION) return;
    popup.setAttribute(DECORADO, VERSION);
    popup.classList.add('fl171-padrao');

    const topo = popup.querySelector('.fl163-top');
    const titulo = topo?.querySelector('strong');
    if (titulo) titulo.textContent = 'Fase Lateral';

    if (topo && !popup.querySelector('.fl171-subtitulo')) {
      const subtitulo = document.createElement('div');
      subtitulo.className = 'fl171-subtitulo';
      subtitulo.textContent = 'Opções definidas pelo administrador';
      topo.insertAdjacentElement('afterend', subtitulo);
    }

    const busca = popup.querySelector('.fl163-busca');
    if (busca) busca.placeholder = 'Pesquisar nas opções...';

    const lista = popup.querySelector('.fl163-lista');
    if (lista && !popup.querySelector('.fl171-selecionar-todos')) {
      const todos = document.createElement('label');
      todos.className = 'fl171-selecionar-todos';
      todos.innerHTML = '<input type="checkbox" aria-label="Selecionar tudo"><span>Selecionar tudo</span>';
      lista.insertAdjacentElement('beforebegin', todos);
      todos.querySelector('input')?.addEventListener('change', event => {
        const marcado = !!event.currentTarget.checked;
        checkboxesDaLista(popup).forEach(input => {
          if (input.checked === marcado) return;
          input.checked = marcado;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        atualizarSelecionarTodos(popup);
      });
    }

    const acoes = popup.querySelector('.fl163-acoes');
    const aplicar = acoes?.querySelector('[data-fl163-aplicar]');
    if (acoes && aplicar && !acoes.querySelector('.fl171-cancelar')) {
      const cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.className = 'btn btn-sm fl171-cancelar';
      cancelar.textContent = 'Cancelar';
      cancelar.addEventListener('click', () => popup.querySelector('.fl163-fechar')?.click());
      acoes.insertBefore(cancelar, aplicar);
    }

    popup.addEventListener('change', event => {
      if (event.target?.matches?.('.fl163-lista input[type="checkbox"]')) {
        atualizarSelecionarTodos(popup);
      }
    });

    busca?.addEventListener('input', () => setTimeout(() => atualizarSelecionarTodos(popup), 0));

    if (lista) {
      const observerLista = new MutationObserver(() => atualizarSelecionarTodos(popup));
      observerLista.observe(lista, { childList: true, subtree: true });
    }

    atualizarSelecionarTodos(popup);
  }

  function verificarPopup() {
    decorarPopup(document.getElementById(POPUP_ID));
  }

  function iniciar() {
    injetarEstilos();
    verificarPopup();
    const observer = new MutationObserver(verificarPopup);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})();

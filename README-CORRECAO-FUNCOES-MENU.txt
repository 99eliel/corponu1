Correção aplicada

Problema: as opções dentro do menu dos três pontos chamavam fecharMenusAcoesManejo() antes da ação principal, mas essa função não estava exposta no escopo global. Como o app.js usa type=module, o navegador gerava erro e parava a ação antes de executar Enviar para facção, Mover/editar local, Rastrear etc.

Correção:
- exposto window.fecharMenusAcoesManejo;
- ações do menu usam window.<funcao> para evitar erro de escopo;
- botão verde de salvar rápido mantido;
- menu acima mantido;
- envio para facção força processos de sutiã: ENCAPAR BOJO, SUTIÃ COMPLETO, SUTIÃ MONTAGEM e ALÇA;
- nenhum dado lançado é apagado ou sobrescrito.

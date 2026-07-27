Correção do loop de versão
Versão: 2026-07-27-ligia-sem-loop-versao-2

Problema encontrado:
- index.html, sw.js, update.js e version.json estavam com versões diferentes.
- O update.js comparava a versão local com version.json e recarregava sem parar.

Correção aplicada:
1. Versão única em index.html, update.js, sw.js e version.json.
2. Proteção contra loop: se o navegador tentar atualizar uma vez e ainda receber arquivo antigo, ele para de recarregar.
3. Limpeza automática dos caches op-confeccao-* quando detectar versão nova.
4. Remoção do service worker antigo antes de recarregar.
5. Função emergencial no console: limparVersaoSistema()

Depois de subir esta versão:
- Abra o sistema com Ctrl+F5.
- Se ainda estiver em cache antigo, rode no console: limparVersaoSistema()

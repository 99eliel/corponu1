# Sistema OP Confecção com Firebase e Login

Esta versão usa:

- Firebase Authentication
- Cloud Firestore
- Login com e-mail e senha
- Perfil de usuário na coleção `usuarios`
- Perfil admin e usuário comum
- Produtos/referências no Firestore
- Ordens de produção no Firestore
- Relatórios puxando do Firestore

## Antes de abrir o sistema

No Firebase Console:

### 1. Authentication

Ative:

- Authentication > Sign-in method > Email/Password

Depois crie seu primeiro usuário admin em:

- Authentication > Users > Add user

Copie o UID desse usuário.

### 2. Firestore

Crie o Firestore Database em modo Production.

Depois crie manualmente a coleção:

`usuarios`

E dentro dela crie um documento com o ID igual ao UID do usuário admin.

Exemplo:

Documento:

`usuarios/UID_DO_ADMIN`

Campos:

```txt
nome: Eliel
email: seuemail@empresa.com
tipo: admin
ativo: true
criadoEm: 2026-06-27
```

### 3. Regras

Copie o conteúdo do arquivo `firebase-rules.txt` e cole em:

Firestore Database > Rules

Depois clique em Publish.

## Como rodar localmente

Como o sistema usa `script type="module"` e Firebase via CDN, não é recomendado abrir direto pelo `file://`.

Opções:

### Opção 1: VS Code Live Server

1. Abra a pasta no VS Code.
2. Instale a extensão Live Server.
3. Clique com botão direito no `index.html`.
4. Clique em "Open with Live Server".

### Opção 2: Python

Abra o terminal dentro da pasta e rode:

```bash
python -m http.server 5500
```

Depois acesse:

```txt
http://localhost:5500
```

## Importar dados da planilha

Dentro do ZIP existe o arquivo:

`backup-op-confeccao-planilha.json`

Entre como admin no sistema, vá em:

Importar / Backup > Importar backup JSON para Firestore

Selecione esse arquivo.

## Permissões

### Admin

- Cadastra produtos/referências
- Edita produtos/referências
- Exclui produtos/referências
- Cria ordens de produção
- Edita ordens de produção
- Exclui ordens de produção
- Cria usuários
- Ativa/desativa usuários
- Importa backup para o Firestore

### Usuário comum

- Visualiza produtos
- Cria ordens de produção
- Edita ordens de produção
- Visualiza relatórios
- Não cria produtos
- Não cria usuários
- Não exclui ordens


## Ajustes desta versão

- Campo de senha com botão **Mostrar/Ocultar** na tela de login.
- Campo de senha com botão **Mostrar/Ocultar** na tela de cadastro de usuários.
- Logo da empresa adicionada na tela de login e no menu lateral usando o link informado.

### Observação sobre a logo
Foi configurado uso direto do link do Imgur com tentativas automáticas em PNG, JPG e JPEG.
Se a imagem não carregar no navegador por alguma limitação externa do Imgur, me envie a logo como arquivo de imagem e eu troco para uma versão local dentro do projeto.


## Atualização: interface original com logs

Esta versão mantém a interface visual anterior, sem a personalização pesada da última versão.

Foi mantido/adicionado:

- Aba **Logs / Auditoria** para admin.
- Registro automático de ações importantes.
- Busca dentro dos logs.
- Exportação dos logs em CSV.

### Ações registradas

- Login
- Produto criado
- Produto atualizado
- Produto excluído
- OP criada
- OP atualizada
- OP excluída
- Usuário criado
- Usuário ativado/desativado
- Backup importado
- Backup exportado
- Relatório exportado
- Logs exportados

### Firestore

Foi adicionada a coleção:

```txt
logsAlteracoes
```

Copie novamente o conteúdo do arquivo `firebase-rules.txt` para o Firestore Rules e publique.


## Atualização: relatório Silk obrigatório

Foi adicionado o relatório **Silk** como processo obrigatório.

A ordem dos relatórios agora é:

```txt
Enfesto
Corte
Silk
Separação
Renda
Alça
Bojo
```

O relatório **Silk** funciona como Enfesto, Corte e Separação: mostra todas as ordens de produção.

Também foi ajustado o log de login para não exibir mais o UID do Firebase no campo "Item". Agora o item aparece como "Sistema".


## Correção: posição final do Silk

O relatório **Silk** foi movido para depois de **Bojo**.

A ordem final dos relatórios ficou:

```txt
Enfesto
Corte
Separação
Renda
Alça
Bojo
Silk
```

O **Silk** continua sendo obrigatório e geral, mostrando todas as ordens de produção.


## Atualização: zerar ordens e importar relatório externo PDF

Esta versão adiciona duas funções administrativas na aba **Importar / Backup**.

### 1. Zerar ordens de produção

O botão **Zerar ordens de produção** apaga todos os documentos da coleção:

```txt
ordensProducao
```

Ele não apaga:

```txt
produtos
usuarios
logsAlteracoes
configuracoes
```

Também registra a ação nos logs.

### 2. Importar relatório externo PDF

A função lê PDFs no padrão do relatório:

```txt
OP-Lote
Referência
COR / TAMANHO
Planejado
```

Ela extrai:

```txt
OP-Lote
Número da OP
Lote
Referência
Produto
Código da cor
Cor
Planejado
```

Antes de importar, o sistema mostra uma prévia.

### Como usar

1. Entre como admin.
2. Vá em **Importar / Backup**.
3. Selecione semana, mês e ano.
4. Clique em **Ler relatório PDF**.
5. Confira a prévia.
6. Clique em **Confirmar importação do PDF**.

Se a referência ainda não existir no cadastro de produtos, o sistema pode cadastrar automaticamente com alça, bojo e renda desmarcados. Depois é só editar a referência e marcar corretamente.


## Atualização: referências pendentes de conferência

Ao importar um PDF, se a referência da OP ainda não existir no cadastro de produtos, o sistema agora marca essa OP como **Pendente**.

Também cria o produto automaticamente com:

```txt
cadastroPendente: true
statusCadastro: pendente
```

E a OP importada fica com:

```txt
referenciaPendente: true
statusReferencia: pendente
```

Assim os responsáveis sabem que precisam abrir o cadastro da referência e conferir se possui:

```txt
Alça
Bojo
Renda / Sutiã
```

Quando o admin salva/atualiza o produto manualmente, o sistema atualiza automaticamente todas as ordens daquela referência, copia as marcações corretas de alça, bojo e renda e remove o status de pendência das OPs.


## Atualização: painel separado de referências pendentes

A aba **Produtos / Referências** agora possui um bloco separado no topo:

```txt
Referências pendentes de conferência
```

Esse bloco mostra somente as referências criadas automaticamente pela importação do PDF e que ainda precisam ser conferidas.

Para cada referência pendente, aparece:

```txt
Referência
Produto
Quantidade de OPs pendentes
Observação da pendência
Botão Conferir
Botão Ver OPs
```

### Como resolver uma pendência

1. Vá em **Produtos / Referências**.
2. No bloco **Referências pendentes de conferência**, clique em **Conferir**.
3. Marque se a referência possui **alça**, **bojo** e **renda/sutiã**.
4. Salve o produto.
5. O sistema atualiza automaticamente todas as OPs daquela referência e remove o status de pendente.


## Atualização: função Manejo

Foi adicionada a aba **Manejo**.

### Como funciona

O usuário seleciona uma OP já cadastrada no sistema. Automaticamente o sistema preenche:

```txt
Nº OP
Referência
Cor
QTI / Quantidade
```

Os demais campos são preenchidos manualmente pelo usuário:

```txt
Silk
Data tecido
Fase
Data
Facção
Chegada
Falta
Produção
CELU
Necessidade
Coluna / Observação
```

### Fases com recomendação automática

O campo **Fase** é livre. O usuário pode digitar qualquer fase nova.

Depois que uma fase é salva pela primeira vez, ela passa a aparecer como recomendação nas próximas vezes.

Exemplos:

```txt
BOJOS ENCAPADOS
COSTURA
ACABAMENTO
REVISÃO
```

### Firestore

Foram adicionadas as coleções:

```txt
manejos
fasesManejo
```

Atualize as regras do Firebase usando o arquivo `firebase-rules.txt`.


## Atualização: OPs automáticas na aba Manejo

A aba **Manejo** agora mostra automaticamente todas as ordens de produção cadastradas no sistema.

Foi criado o painel:

```txt
Ordens de produção para organizar
```

Ele mostra:

```txt
Nº OP
Referência
Cor
QTI
Status
Fases lançadas
Ações
```

### Status

- **Pendente**: a OP ainda não possui nenhum manejo/fase lançada.
- **Organizada**: a OP já possui pelo menos uma fase lançada.

### Como usar

1. Entre na aba **Manejo**.
2. Veja todas as OPs no painel superior.
3. Clique em **Organizar** na OP desejada.
4. O sistema preenche automaticamente Nº OP, Referência, Cor e QTI.
5. O usuário preenche fase, data, facção e demais campos.
6. Ao salvar, a fase fica vinculada àquela OP.
7. A OP passa de **Pendente** para **Organizada**.

Também foi adicionado o botão **Ver fases**, que filtra os registros de manejo daquela OP.


## Correção: Manejo em linha e sem erro de fases

A aba **Manejo** foi alterada para funcionar exatamente como uma planilha.

Agora:

- Toda OP que entra no sistema aparece automaticamente no Manejo.
- Cada OP aparece em uma linha.
- Nº OP, REF, QTI e COR vêm automaticamente da ordem de produção.
- O usuário edita direto na linha:
  - SILK
  - DATA TECIDO
  - FASE
  - DATA
  - FACÇÃO
  - CHEGADA
  - FALTA
  - PRODUÇÃO
  - CELU
  - NECESSIDADE
  - COLUNA
- Depois clica em **Salvar** na própria linha.
- A OP muda de **Pendente** para **Organizada**.

Também foi removida a dependência da coleção `fasesManejo`, que podia causar o erro **"Erro ao carregar fases do manejo"**. Agora as sugestões de fase são montadas automaticamente a partir dos manejos já salvos.


## Correção: Manejo salvo dentro da própria OP

Para evitar erro de permissão ao salvar manejo, a lógica foi simplificada:

- O manejo agora é salvo dentro do próprio documento da ordem de produção, no campo `manejo`.
- Não depende mais da coleção separada `manejos`.
- Como usuários comuns já podem editar ordens de produção, eles também conseguem salvar e reeditar o manejo.
- Depois de salvo, o usuário pode alterar a mesma linha e clicar em **Salvar** novamente quantas vezes precisar.

Estrutura salva na OP:

```txt
ordensProducao/{idDaOP}
  manejo:
    silk
    dataTecido
    fase
    data
    faccao
    chegada
    falta
    producao
    celu
    necessidade
    coluna
    status
```

Se aparecer erro de permissão, publique novamente o arquivo `firebase-rules.txt`, mas esta versão usa a permissão já existente da coleção `ordensProducao`.


## Atualização: Necessidade automática no Manejo

No **Manejo**, a coluna **NECESSIDADE** agora é preenchida automaticamente com a data/informação da ordem de produção.

A prioridade usada é:

```txt
1. necessidade
2. previsaoEntrega
3. dataNecessidade
4. dataEntrega
5. Semana + Mês/Ano da OP
6. Data de criação da OP
```

Na importação do PDF, o sistema agora tenta capturar também:

```txt
Cadastro
Liberação
Previsão entrega
```

E salva a **Previsão entrega** como necessidade da OP.

O usuário não edita mais a necessidade manualmente no Manejo. Ela vem travada da OP para evitar divergência.


## Versão de recuperação estável

Esta versão volta para a base estável antes da criação da aba administrativa de Status Manejo.

Mantém:

- Login Firebase
- Produtos e referências
- Ordens de produção
- Importação de PDF
- Referências pendentes
- Manejo em linha
- Necessidade automática no Manejo
- Logs
- Relatórios

Removido temporariamente:

- Aba administrativa Status Manejo
- Filtros avançados do Status Manejo

Use esta versão para restaurar o sistema caso a versão mais recente tenha quebrado o carregamento.


## Atualização: Manejo com filtros por coluna

A aba **Manejo** recebeu filtros no topo para organizar as OPs como uma planilha.

Agora é possível filtrar por:

```txt
Status
Nº OP
REF
SILK
Data tecido
Fase
QTI
Cor
Data
Facção
Chegada
Falta
Produção
CELU
Necessidade
```

Cada filtro mostra somente os valores que existem no sistema. Exemplo:

```txt
Filtro Cor > PRETO
```

Ao selecionar **PRETO**, o sistema mostra somente as OPs com essa cor.

### Produção

O campo **Produção** agora é uma **data**, não mais número.

### Coluna / Observação

A coluna **COLUNA / OBSERVAÇÃO** foi removida do Manejo.

### Segurança

Esta versão foi criada em cima da base estável de recuperação e não adiciona nova coleção no Firebase.


## Versão de diagnóstico da quebra no login

Esta versão é igual à versão do Manejo com filtros por coluna, mas com diagnóstico.

Ela mostra uma caixa laranja se acontecer erro em:

```txt
JavaScript
Login
Carregamento do perfil
Firestore
Renderização da tela depois do login
```

### Como testar

1. Suba esta versão no GitHub.
2. Abra em aba anônima primeiro.
3. Tente fazer login.
4. Se aparecer a caixa laranja, clique em **Copiar erro**.
5. Envie o erro para análise.

### Importante

Se em aba anônima funcionar, mas no navegador normal não funcionar, o problema é cache/service worker do PWA.

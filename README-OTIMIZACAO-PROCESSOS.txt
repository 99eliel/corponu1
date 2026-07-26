Otimização da aba Processos

- A aba Processos deixou de abrir listener em tempo real com todas as movimentações.
- Agora carrega por lotes de 80 registros usando getDocs + limit + startAfter.
- O botão Atualizar lista recarrega o primeiro lote.
- O botão Carregar mais 80 busca registros antigos sob demanda.
- Os filtros continuam funcionando sobre os registros já carregados.
- Isso economiza leituras no Firestore sem quebrar o fluxo de uso.

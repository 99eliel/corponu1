from pathlib import Path
import json

p = Path('app.js')
s = p.read_text(encoding='utf-8')

s = s.replace(
    'const precosReferenciaQuery = query(collection(db, "precosReferencia"), orderBy("referencia", "asc"));',
    'const precosReferenciaQuery = collection(db, "precosReferencia");',
    1,
)
s = s.replace(
    'const snap = await getDocs(query(collection(db, "precosReferencia"), orderBy("referencia", "asc")));',
    'const snap = await getDocs(collection(db, "precosReferencia"));',
    1,
)

antigo = '''    await setDoc(doc(db, "precosReferencia", docId), dados, { merge: true });

    // Atualiza a tela imediatamente; o onSnapshot depois apenas confirma o estado.
    const indiceLocal = state.precosReferencia.findIndex(item => item.id === docId);
    const registroLocal = {
      ...(indiceLocal >= 0 ? state.precosReferencia[indiceLocal] : {}),
      id: docId,
      referencia,
      processo,
      setor,
      setorLabel: getLabelSetorPagamento(setor),
      valor,
      ativo: true
    };
    if (indiceLocal >= 0) state.precosReferencia[indiceLocal] = registroLocal;
    else state.precosReferencia.push(registroLocal);

    await registrarLog(
      idAtual ? "preco_referencia_atualizado" : "preco_referencia_criado",
      "precoReferencia",
      docId,
      `Ref. ${referencia} | ${processo} | ${formatarMoedaBR(valor)}`
    );

    processoValorAtivo = chaveProcessoValor(processo, setor);
    limparFormPrecoReferencia();
    preencherProcessosValores();
    renderProcessosValores();
    renderPrecosReferencia();

    toast("Valor salvo.");'''

novo = '''    const precoRef = doc(db, "precosReferencia", docId);
    await setDoc(precoRef, dados, { merge: true });

    const confirmadoSnap = await getDoc(precoRef);
    if (!confirmadoSnap.exists()) {
      throw new Error(`Preço ${docId} não encontrado após o salvamento.`);
    }

    const confirmado = normalizarPrecoReferenciaCarregado(confirmadoSnap);
    const indiceLocal = state.precosReferencia.findIndex(item => item.id === docId);
    if (indiceLocal >= 0) state.precosReferencia[indiceLocal] = confirmado;
    else state.precosReferencia.push(confirmado);

    await registrarLog(
      idAtual ? "preco_referencia_atualizado" : "preco_referencia_criado",
      "precoReferencia",
      docId,
      `Ref. ${confirmado.referencia || referencia} | ${confirmado.processo || processo} | ${formatarMoedaBR(Number(confirmado.valor ?? valor))}`
    );

    processoValorAtivo = chaveProcessoValor(
      confirmado.processo || processo,
      normalizarSetorPrecoPorProcesso(confirmado.processo || processo, confirmado.setor || setor)
    );

    const idInput = document.getElementById("precoReferenciaId");
    const refInput = document.getElementById("precoReferenciaRef");
    const valorInput = document.getElementById("precoReferenciaValor");
    const buscaInput = document.getElementById("buscaPrecosReferencia");
    if (idInput) idInput.value = "";
    if (refInput) refInput.value = "";
    if (valorInput) valorInput.value = "";
    if (buscaInput) buscaInput.value = "";

    aplicarProcessoValorSelecionado(processoValorAtivo);
    preencherProcessosValores();
    renderProcessosValores();
    renderPrecosReferencia();
    refInput?.focus();

    toast(`Valor salvo e confirmado: Ref. ${confirmado.referencia || referencia}.`);'''

if antigo not in s:
    raise SystemExit('Bloco atual de salvamento de preco nao encontrado')
s = s.replace(antigo, novo, 1)
p.write_text(s, encoding='utf-8')

p = Path('index.html')
h = p.read_text(encoding='utf-8')
h = h.replace('app.js?v=2026-08-12-precos-processos-185', 'app.js?v=2026-08-12-precos-confirmados-186', 1)
p.write_text(h, encoding='utf-8')

Path('corponu-release.json').write_text(json.dumps({
    'version': '2026-08-12-precos-confirmados-186',
    'updatedAt': '2026-08-12T16:01:00-03:00',
    'notes': 'Confirma cada novo preco pelo documento exato antes de limpar o formulario, mantem a aba selecionada e carrega a colecao completa de precos sem depender de orderBy. O sucesso so aparece depois de o documento existir no Firestore.'
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

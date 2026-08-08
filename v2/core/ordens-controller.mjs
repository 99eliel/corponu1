import { listarFaccoesPorProcesso } from "./faccoes-regras.mjs";
import { tipoPecaDoDocumento } from "./ordens-regras.mjs";
import { processoCanonico, texto } from "./normalizacao.mjs";

export class OrdensController {
  constructor({ store, ordensService, fallbackFaccoesPorProcesso = {} }) {
    if (!store) throw new Error("Store V2 não configurado.");
    if (!ordensService) throw new Error("Serviço de Ordens V2 não configurado.");
    this.store = store;
    this.ordensService = ordensService;
    this.fallbackFaccoesPorProcesso = fallbackFaccoesPorProcesso;
  }

  listar(tipoPeca = "") {
    return this.store.listar("ordens")
      .filter(item => !tipoPeca || tipoPecaDoDocumento(item) === tipoPeca)
      .sort((a, b) => String(b.numeroOP || "").localeCompare(String(a.numeroOP || ""), "pt-BR", { numeric: true }));
  }

  obter(id) {
    return this.store.obter("ordens", id);
  }

  listarFaccoes(processo) {
    const canonico = processoCanonico(processo);
    return listarFaccoesPorProcesso(
      this.store.listar("faccoes"),
      canonico,
      { nomesFallback: this.fallbackFaccoesPorProcesso[canonico] || [] }
    );
  }

  async salvar({ entrada, currentId = "", usuario = null, confirmarConversao = null }) {
    let resultado = await this.ordensService.salvar({ entrada, currentId, usuario });

    if (resultado.requerConfirmacaoConversao) {
      const confirmar = typeof confirmarConversao === "function"
        ? await confirmarConversao(resultado.conflito, entrada)
        : false;

      if (!confirmar) {
        return {
          ...resultado,
          canceladoPeloUsuario: true
        };
      }

      resultado = await this.ordensService.salvar({
        entrada,
        currentId,
        usuario,
        permitirConversaoTipo: true
      });
    }

    return resultado;
  }

  selecionarParaEdicao(id) {
    const ordem = this.store.obter("ordens", texto(id));
    if (!ordem) return null;
    return {
      ...ordem,
      tipoPeca: tipoPecaDoDocumento(ordem)
    };
  }
}

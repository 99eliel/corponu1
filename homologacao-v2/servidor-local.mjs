import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PASTA_HOMOLOGACAO = fileURLToPath(new URL("./", import.meta.url));
const RAIZ = resolve(PASTA_HOMOLOGACAO, "..");
const PORTA = Number(process.env.PORT || 8765);
const HOST = "127.0.0.1";

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function caminhoSeguro(url = "/") {
  const pathname = decodeURIComponent(String(url).split("?")[0]);
  const relativo = pathname === "/" ? "homologacao-v2/index.html" : pathname.replace(/^\/+/, "");
  const alvo = resolve(RAIZ, normalize(relativo));
  if (!alvo.startsWith(RAIZ)) return null;
  return alvo;
}

const server = http.createServer(async (req, res) => {
  try {
    let arquivo = caminhoSeguro(req.url);
    if (!arquivo) {
      res.writeHead(403);
      res.end("Acesso negado");
      return;
    }

    const info = await stat(arquivo).catch(() => null);
    if (info?.isDirectory()) arquivo = join(arquivo, "index.html");

    const conteudo = await readFile(arquivo);
    res.writeHead(200, {
      "Content-Type": TIPOS[extname(arquivo).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Arquivo não encontrado.");
  }
});

server.listen(PORTA, HOST, () => {
  console.log("");
  console.log("============================================================");
  console.log(" CORPO NU FLOW - HOMOLOGACAO V2");
  console.log(" Dados locais. Nenhuma escrita no Firebase de producao.");
  console.log("============================================================");
  console.log("");
  console.log(`Abra: http://${HOST}:${PORTA}/homologacao-v2/`);
  console.log("Para encerrar, feche esta janela ou pressione Ctrl+C.");
  console.log("");
});

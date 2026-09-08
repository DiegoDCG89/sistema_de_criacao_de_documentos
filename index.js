import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Procura o index.html nos caminhos mais prováveis
function encontrarIndexHtml() {
  const caminhosPossiveis = [
    path.join(__dirname, 'public', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'sisdoc-eb', 'public', 'index.html'),
    path.join(process.cwd(), 'public', 'index.html'),
    path.join(process.cwd(), 'index.html')
  ];

  for (const p of caminhosPossiveis) {
    if (fs.existsSync(p)) {
      console.log(`[OK] index.html encontrado em: ${p}`);
      return p;
    }
  }
  return null;
}

const arquivoIndex = encontrarIndexHtml();

if (arquivoIndex) {
  // Serve a pasta onde o index.html foi encontrado
  app.use(express.static(path.dirname(arquivoIndex)));

  app.get('*', (req, res) => {
    res.sendFile(arquivoIndex);
  });
} else {
  console.error('[ERRO] index.html NÃO encontrado. Conteúdo do diretório atual:');
  console.error(fs.readdirSync(__dirname));
  
  app.get('*', (req, res) => {
    res.status(404).send(`
      <h2>Arquivo index.html não localizado no servidor.</h2>
      <p>Verifique se o arquivo está na pasta correta no GitHub.</p>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

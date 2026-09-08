import { iniciarMascaras, dataExtensoMilitar } from './utils.js';

// Inicializa a tela
document.addEventListener('DOMContentLoaded', () => {
  iniciarMascaras();
});

// Lógica de negócio isolada
document.getElementById('form-bagagem').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nome = document.getElementById('nome').value;
  // Captura os outros dados...

  await gerarDIEx(nome);
  await gerarNotaBar();
  
  mostrarModalSucesso();
});

async function gerarDIEx(nome) {
  // Lógica do docx.js focada apenas nesta funcionalidade
}

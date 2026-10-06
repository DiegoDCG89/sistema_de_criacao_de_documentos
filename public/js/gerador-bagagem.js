// =========================================================================
// SisDoc - Gerador de Bagagem na Mesma Sede (PNR)
// =========================================================================
import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone } from './utils.js';

function formatarDataPorExtenso() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = new Date();
  return `${String(hoje.getDate()).padStart(2, '0')} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function formatarMesAno() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = new Date();
  return `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function adicionarLinhaDependenteSede() {
  const listaDep = document.getElementById('lista-dependentes');
  if (!listaDep) return;
  const divLinha = document.createElement('div');
  divLinha.className = 'grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200 relative item-dependente items-end';
  divLinha.innerHTML = `
    <div class="sm:col-span-3">
      <label class="block text-[11px] font-semibold text-stone-600 mb-1">Nome Completo *</label>
      <input type="text" class="dep-nome w-full border border-stone-300 rounded px-2 py-1.5 text-xs uppercase" required>
    </div>
    <div class="sm:col-span-2 flex items-end gap-2">
      <div class="flex-grow">
        <label class="block text-[11px] font-semibold text-stone-600 mb-1">Grau de Parentesco *</label>
        <select class="dep-parentesco w-full border border-stone-300 rounded px-2 py-1.5 text-xs bg-white" required>
          <option value="">Selecione...</option>
          <option value="Esposa / Cônjuge">Esposa / Cônjuge</option>
          <option value="Companheira(o)">Companheira(o)</option>
          <option value="Filho(a)">Filho(a)</option>
          <option value="Enteado(a)">Enteado(a)</option>
          <option value="Pai / Mãe">Pai / Mãe</option>
          <option value="Menor sob Guarda">Menor sob Guarda</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <button type="button" class="btn-remover-dep px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded border text-xs">✕</button>
    </div>
  `;
  divLinha.querySelector('.btn-remover-dep').addEventListener('click', () => divLinha.remove());
  listaDep.appendChild(divLinha);
}

document.addEventListener('DOMContentLoaded', () => {
  const btnAddDep = document.getElementById('btn-add-dep');
  if (btnAddDep) btnAddDep.addEventListener('click', adicionarLinhaDependenteSede);
  const form = document.getElementById('form-mesma-sede');
  if (form) form.addEventListener('submit', processarEnvioMesmaSede);

  // Aplicação das máscaras idêntica ao gerador de cursos
  const campoCpf = document.getElementById('cpf');
  if (campoCpf) campoCpf.addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  const campoIdt = document.getElementById('idt');
  if (campoIdt) campoIdt.addEventListener('input', e => e.target.value = mascaraIdt(e.target.value));
  const campoPreccp = document.getElementById('preccp');
  if (campoPreccp) campoPreccp.addEventListener('input', e => e.target.value = mascaraPrecCP(e.target.value));
  const campoTelefone = document.getElementById('telefone');
  if (campoTelefone) campoTelefone.addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));
});

function coletarDependentesSede() {
  const radioSim = document.getElementById('opt_dep_sim');
  if (!radioSim || !radioSim.checked) return [];
  const dependentes = [];
  document.querySelectorAll('.item-dependente').forEach((el) => {
    const nome = el.querySelector('.dep-nome')?.value.trim().toUpperCase() || '';
    const parentesco = el.querySelector('.dep-parentesco')?.value.trim() || '';
    if (nome && parentesco) dependentes.push({ NOME: nome, PARENTESCO: parentesco });
  });
  return dependentes;
}

async function renderizarDocxSede(caminhoTemplate, dadosPayload) {
  const res = await fetch(c

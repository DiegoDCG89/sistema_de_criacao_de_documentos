
// =========================================================================
// SisDoc - Gerador de Bagagem na Mesma Sede (PNR)
// =========================================================================

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
          <option value="Filho(a)">Filho(a)</option>
          <option value="Enteado(a)">Enteado(a)</option>
          <option value="Pai / Mãe">Pai / Mãe</option>
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
  const res = await fetch(caminhoTemplate);
  if (!res.ok) throw new Error(`Template não encontrado: ${caminhoTemplate}`);
  const buffer = await res.arrayBuffer();
  const zip = new window.PizZip(buffer);
  const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(dadosPayload);
  return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function processarEnvioMesmaSede(e) {
  e.preventDefault();
  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit.innerHTML;

  try {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-pulse">Gerando documento...</span>`;

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const dependentes = coletarDependentesSede();

    const payload = {
      POSTO_GRAD: getVal('posto'),
      NOME_COMPLETO: getVal('nome').toUpperCase(),
      CPF: getVal('cpf'),
      IDENTIDADE: getVal('idt'),
      PREC_CP: getVal('preccp'),
      TELEFONE: getVal('telefone'),
      BAR_OCUPACAO: getVal('bar_ocupacao'),
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta'),
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    };

    const sufixoNome = `${payload.POSTO_GRAD.replace(/\s+/g, '_')}_${payload.NOME_COMPLETO.replace(/\s+/g, '_')}.docx`;
    const pastaDestinoDrive = `Mesma_Sede_${payload.NOME_COMPLETO.replace(/\s+/g, '_')}`;

    const blobDiex = await renderizarDocxSede('/templates/DIEx_Opcao_tranporte_na_mesma_sede.docx', payload);
    const nomeArquivoDiex = `DIEx_Bagagem_Mesma_Sede_${sufixoNome}`;
    
    // Download imediato para o militar
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blobDiex);
    link.download = nomeArquivoDiex;
    link.click();

    btnSubmit.innerHTML = `<span class="animate-pulse">Enviando para o Drive...</span>`;
    
    // Upload direto, sem necessidade de loop por ser só 1 arquivo
    await fetch(`/api/upload?filename=${encodeURIComponent(nomeArquivoDiex)}&folder=${encodeURIComponent(pastaDestinoDrive)}`, { 
      method: 'POST', 
      body: blobDiex 
    });

    alert("Documento gerado e enviado para o Google Drive com sucesso!");
  } catch (err) {
    alert(`Erro: ${err.message}`);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = textoOriginal;
  }
}

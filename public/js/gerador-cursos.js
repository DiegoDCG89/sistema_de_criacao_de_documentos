// =========================================================================
// SisDoc - Gerador de Cursos e Estágios (Normal e Complemento)
// =========================================================================

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

function adicionarLinhaDependente() {
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
  if (btnAddDep) btnAddDep.addEventListener('click', adicionarLinhaDependente);
  const form = document.getElementById('form-cursos');
  if (form) form.addEventListener('submit', processarEnvioCursos);
});

function coletarDependentes() {
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

async function renderizarDocx(caminhoTemplate, dadosPayload) {
  const res = await fetch(caminhoTemplate);
  if (!res.ok) throw new Error(`Template não encontrado: ${caminhoTemplate}`);
  const buffer = await res.arrayBuffer();
  const zip = new window.PizZip(buffer);
  const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(dadosPayload);
  return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function processarEnvioCursos(e) {
  e.preventDefault();
  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit.innerHTML;

  try {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-pulse">Gerando documentos...</span>`;

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const isComplemento = document.getElementById('chk_is_complemento')?.checked;

    const dependentes = coletarDependentes();
    const payload = {
      DATA_ATUAL: formatarDataPorExtenso(),
      MES_ANO: formatarMesAno(),
      POSTO_GRAD: getVal('posto'),
      NOME_COMPLETO: getVal('nome').toUpperCase(),
      CPF: getVal('cpf'),
      IDENTIDADE: getVal('idt'),
      PREC_CP: getVal('preccp'),
      TELEFONE: getVal('telefone'),
      NOME_CURSO: getVal('curso').toUpperCase(),
      OM_REALIZACAO: getVal('omCurso').toUpperCase(),
      GUARNICAO: getVal('guarnicaoCurso').toUpperCase(),
      ADT_DCEM: getVal('adtDcem'),
      DATA_DESLIGAMENTO: getVal('dataDesligamento'),
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta'),
      MOTIVO: getVal('motivo_complemento').toUpperCase(),
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    };

    const sufixoNome = `${payload.POSTO_GRAD.replace(/\s+/g, '_')}_${payload.NOME_COMPLETO.replace(/\s+/g, '_')}.docx`;
    const pastaDestinoDrive = `Curso_${payload.NOME_COMPLETO.replace(/\s+/g, '_')}`;

    // Definição dos templates de acordo com a opção Complemento
    const tplDiex = isComplemento ? '/templates/diex_opcao_curso_complemento.docx' : '/templates/diex_opcao_curso.docx';
    const tplBar = isComplemento ? '/templates/nota_diex_opcao_curso_bar_complemento.docx' : '/templates/nota_diex_opcao_curso_bar.docx';
    const tplOrd = isComplemento ? '/templates/ord_pagto_curso_complemento.docx' : '/templates/Nota_Ord_Pagto_curso.docx';
    const prefArq = isComplemento ? 'Complemento_' : '';

    const blobDiex = await renderizarDocx(tplDiex, payload);
    const nomeArquivoDiex = `DIEx_Opcao_Curso_${prefArq}${sufixoNome}`;
    
    // Baixa o DIEx localmente
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blobDiex);
    link.download = nomeArquivoDiex;
    link.click();

    const blobBar = await renderizarDocx(tplBar, payload);
    const blobOrdPagto = await renderizarDocx(tplOrd, payload);

    btnSubmit.innerHTML = `<span class="animate-pulse">Enviando para o Drive...</span>`;

    const enviarParaDrive = async (blob, nome) => {
      await fetch(`/api/upload?filename=${encodeURIComponent(nome)}&folder=${encodeURIComponent(pastaDestinoDrive)}`, { method: 'POST', body: blob });
    };

    // Upload Sequencial
    await enviarParaDrive(blobDiex, nomeArquivoDiex);
    await enviarParaDrive(blobBar, `Nota_p_BAR_Curso_${prefArq}${sufixoNome}`);
    await enviarParaDrive(blobOrdPagto, `Nota_Ord_Pagto_${prefArq}${sufixoNome}`);

    alert("Documentos de Curso gerados e enviados para o Google Drive com sucesso!");
  } catch (err) {
    alert(`Erro: ${err.message}`);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = textoOriginal;
  }
}

// =========================================================================
// SisDoc - Gerador de Movimentação (Normal e Complemento)
// =========================================================================

function formatarDataPorExtenso() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = new Date();
  return `${String(hoje.getDate()).padStart(2, '0')} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function adicionarLinhaDependenteMov() {
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
  if (btnAddDep) btnAddDep.addEventListener('click', adicionarLinhaDependenteMov);
  const form = document.getElementById('form-movimentacao');
  if (form) form.addEventListener('submit', processarEnvioMovimentacao);
});

function coletarDependentesMov() {
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

async function processarEnvioMovimentacao(e) {
  e.preventDefault();
  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit.innerHTML;

  try {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-pulse">Gerando documentos...</span>`;

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const isChecked = (id) => document.getElementById(id)?.checked;
    const marcar = (cond) => ({ SIM: cond ? 'X' : ' ', NAO: !cond ? 'X' : ' ' });

    const isComplemento = isChecked('chk_is_complemento');
    const possuiDep = isChecked('opt_dep_sim');
    const dependentesAcompanham = isChecked('opt_acomp_sim');
    const dependentes = possuiDep ? coletarDependentesMov() : [];

    const optAuto = isChecked('chk_auto');
    const optMoto = isChecked('chk_moto');

    const payload = {
      DATA_ATUAL: formatarDataPorExtenso(),
      POSTO_GRAD: getVal('posto'),
      NOME_COMPLETO: getVal('nome').toUpperCase(),
      CPF: getVal('cpf'),
      IDENTIDADE: getVal('idt'),
      PREC_CP: getVal('preccp'),
      TELEFONE: getVal('telefone'),
      
      OM_DESTINO: getVal('omDestino').toUpperCase(),
      OM_destino: getVal('omDestino').toUpperCase(),
      OM_origem: '5º BIL',
      GUARNICAO: getVal('guarnicao').toUpperCase(),
      ADT_DCEM: getVal('adtDcem'),
      Cidade_reside: getVal('cidadeReside').toUpperCase(),
      Cidade_destino: getVal('cidadeDestino').toUpperCase(),
      desligamento: getVal('dataDesligamento'),
      data_desligamento: getVal('dataDesligamento'),
      MOTIVO: getVal('motivo_complemento').toUpperCase(),

      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta'),

      ...marcar(optAuto), ...{AUTO_SIM: marcar(optAuto).SIM, AUTO_NAO: marcar(optAuto).NAO},
      ...marcar(optMoto), ...{MOTO_SIM: marcar(optMoto).SIM, MOTO_NAO: marcar(optMoto).NAO},
      ...marcar(isChecked('chk_bagagem')), ...{BAG_SIM: marcar(isChecked('chk_bagagem')).SIM, BAG_NAO: marcar(isChecked('chk_bagagem')).NAO},
      ...marcar(isChecked('chk_passagens')), ...{PASS_SIM: marcar(isChecked('chk_passagens')).SIM, PASS_NAO: marcar(isChecked('chk_passagens')).NAO},
      ...marcar(isChecked('chk_ajuda')), ...{AJUDA_SIM: marcar(isChecked('chk_ajuda')).SIM, AJUDA_NAO: marcar(isChecked('chk_ajuda')).NAO},

      MARC_DEP_SIM: possuiDep ? 'X' : ' ',
      MARC_DEP_NAO: !possuiDep ? 'X' : ' ',
      MARC_ACOMP_SIM: (possuiDep && dependentesAcompanham) ? 'X' : ' ',
      MARC_ACOMP_NAO: (!possuiDep || !dependentesAcompanham) ? 'X' : ' ',
      TEM_DEPENDENTES: possuiDep && dependentesAcompanham && dependentes.length > 0,
      DEPENDENTES: dependentes,

      TEM_VEICULO: Boolean(optAuto || optMoto),
      AUTO_MODELO: optAuto ? getVal('auto_modelo') : '-', AUTO_COR: optAuto ? getVal('auto_cor') : '-',
      AUTO_PLACA: optAuto ? getVal('auto_placa') : '-', AUTO_ANO: optAuto ? getVal('auto_ano') : '-',
      MOTO_MODELO: optMoto ? getVal('moto_modelo') : '-', MOTO_COR: optMoto ? getVal('moto_cor') : '-',
      MOTO_PLACA: optMoto ? getVal('moto_placa') : '-', MOTO_ANO: optMoto ? getVal('moto_ano') : '-'
    };

    const sufixoNome = `${payload.POSTO_GRAD.replace(/\s+/g, '_')}_${payload.NOME_COMPLETO.replace(/\s+/g, '_')}.docx`;
    const pastaDestinoDrive = `Movimentacao_${payload.NOME_COMPLETO.replace(/\s+/g, '_')}`;

    const tplDiex = isComplemento ? '/templates/diex_opcao_movimentacao_complemento.docx' : '/templates/diex_opcao_movimentacao.docx';
    const tplBar = isComplemento ? '/templates/nota_diex_opção_movimentacao_complemento.docx' : '/templates/nota_diex_opção_movimentacao.docx';
    const tplOrd = isComplemento ? '/templates/Ord_Pagto_Nota_movimentacao_complemento.docx' : '/templates/Ord_Pagto_Nota_movimentacao.docx';
    const prefArq = isComplemento ? 'Complemento_' : '';

    const blobDiex = await renderizarDocx(tplDiex, payload);
    const nomeArquivoDiex = `DIEx_Opcao_Movimentacao_${prefArq}${sufixoNome}`;
    
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

    await enviarParaDrive(blobDiex, nomeArquivoDiex);
    await enviarParaDrive(blobBar, `Nota_p_BAR_Mov_${prefArq}${sufixoNome}`);
    await enviarParaDrive(blobOrdPagto, `Nota_Ord_Pagto_Mov_${prefArq}${sufixoNome}`);

    alert("Documentos de Movimentação gerados e enviados para o Google Drive!");
  } catch (err) {
    alert(`Erro: ${err.message}`);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = textoOriginal;
  }
}

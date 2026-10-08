// =========================================================================
// SisDoc - Gerador de Bagagem na Mesma Sede (PNR)
// Gera 4 documentos via Docxtemplater:
//   diex_sped_bagagem, diex_bagagem, nota_bar_bagagem, ord_pagto_bagagem
// =========================================================================
import {
  mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData,
  nomeArquivoDoc, nomeSeguro, formatarDataMilitar, dataAtualMilitar, mesAnoAtualMilitar, renderizarDocx
} from './utils.js';

let dadosUltimoEnvio = null;

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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-dep')?.addEventListener('click', adicionarLinhaDependente);
  document.getElementById('form-bagagem')?.addEventListener('submit', processarEnvioBagagem);
  document.getElementById('btn-baixar-pdf')?.addEventListener('click', baixarPDFChecklist);

  const aplicar = (id, fn) => document.getElementById(id)?.addEventListener('input', e => e.target.value = fn(e.target.value));
  aplicar('cpf', mascaraCPF);
  aplicar('idt', mascaraIdt);
  aplicar('preccp', mascaraPrecCP);
  aplicar('telefone', mascaraTelefone);
  aplicar('dataOcupacao', mascaraData);
});

async function processarEnvioBagagem(e) {
  e.preventDefault();
  const btnSubmit = e.target.querySelector('button[type="submit"]');
  const textoOriginal = btnSubmit.innerHTML;

  try {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-pulse">Gerando documentos...</span>`;

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const dependentes = coletarDependentes();

    const payload = {
      DATA_ATUAL: dataAtualMilitar(),
      MES_ANO: mesAnoAtualMilitar(),
      POSTO_GRAD: getVal('posto'),
      NOME_COMPLETO: getVal('nome').toUpperCase(),
      CPF: getVal('cpf'),
      IDENTIDADE: getVal('idt'),
      PREC_CP: getVal('preccp'),
      TELEFONE: getVal('telefone'),
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta'),
      // BAR_OCUPACAO = só o número (aceita "BAR Nº 123", "Nº 123" ou "123"); DATA_BAR = ", de dd/mm/aaaa"
      BAR_OCUPACAO: getVal('bi').replace(/^\s*(?:BAR\s*)?(?:N[º°o]\.?\s*)?/i, '').trim(),
      DATA_BAR: getVal('dataOcupacao') ? `, de ${formatarDataMilitar(getVal('dataOcupacao'))}` : '',
      ENDERECO_PNR: getVal('enderecoPnr').toUpperCase(),
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    };

    if (!payload.POSTO_GRAD || !payload.NOME_COMPLETO) {
      throw new Error('Por favor, preencha pelo menos o Posto/Graduação e o Nome Completo.');
    }
    if (document.getElementById('opt_dep_sim')?.checked && dependentes.length === 0) {
      throw new Error('Você marcou que possui dependentes. Adicione ao menos um (nome e parentesco) ou marque NÃO.');
    }

    const pastaDestinoDrive = `Bagagem_${nomeSeguro(payload.NOME_COMPLETO)}`;
    const nomeDoc = (tipo) => nomeArquivoDoc(tipo, 'BAGAGEM', payload.POSTO_GRAD, payload.NOME_COMPLETO);

    // Os 4 documentos de Bagagem (todos via Docxtemplater)
    const documentos = [
      { nome: nomeDoc('DIEX_SPED'), blob: await renderizarDocx('/templates/diex_sped_bagagem.docx', payload) },
      { nome: nomeDoc('DIEX'),      blob: await renderizarDocx('/templates/diex_bagagem.docx', payload) },
      { nome: nomeDoc('NOTA_BAR'),  blob: await renderizarDocx('/templates/nota_bar_bagagem.docx', payload) },
      { nome: nomeDoc('ORD_PAGTO'), blob: await renderizarDocx('/templates/ord_pagto_bagagem.docx', payload) }
    ];

    // Baixa o DIEx (versão para assinatura) localmente
    const diexImpresso = documentos[1];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(diexImpresso.blob);
    link.download = diexImpresso.nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    btnSubmit.innerHTML = `<span class="animate-pulse">Enviando para o Drive...</span>`;

    // Upload sequencial
    for (const doc of documentos) {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(doc.nome)}&folder=${encodeURIComponent(pastaDestinoDrive)}`, { method: 'POST', body: doc.blob });
      if (!res.ok) throw new Error(`Falha no upload do arquivo ${doc.nome}`);
    }

    // Protocolo interno (mesmo padrão dos demais fluxos)
    try {
      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'BAG-' + Date.now().toString().slice(-6),
          dataCriacao: new Date().toLocaleDateString('pt-BR'),
          modalidade: 'Bagagem na Mesma Sede',
          posto: payload.POSTO_GRAD,
          nomeCompleto: payload.NOME_COMPLETO,
          cpf: payload.CPF
        })
      });
    } catch (eProtocolo) {
      console.warn('Aviso: protocolo local falhou, mas upload foi concluído.');
    }

    dadosUltimoEnvio = { posto: payload.POSTO_GRAD, nomeCompleto: payload.NOME_COMPLETO };

    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
      modalSucesso.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    } else {
      alert('Documentos de Bagagem gerados e enviados para o Google Drive com sucesso!');
    }
  } catch (err) {
    alert(`Erro: ${err.message}`);
    console.error(err);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = textoOriginal;
    if (window.lucide) lucide.createIcons();
  }
}

// PDF do checklist de anexos (mesmo layout do checklist do Complemento)
function baixarPDFChecklist() {
  if (!dadosUltimoEnvio || !window.jspdf) {
    alert('Gere os documentos primeiro para poder baixar o checklist.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MINISTÉRIO DA DEFESA', 105, 20, { align: 'center' });
  doc.text('EXÉRCITO BRASILEIRO', 105, 26, { align: 'center' });
  doc.text('5º BATALHÃO DE INFANTARIA LEVE', 105, 32, { align: 'center' });
  doc.setDrawColor(75, 83, 32);
  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);

  doc.setFontSize(14);
  doc.text('RELAÇÃO DE DOCUMENTOS (ANEXOS)', 105, 48, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Militar:', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dadosUltimoEnvio.posto} ${dadosUltimoEnvio.nomeCompleto}`, 35, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Modalidade:', 20, 66);
  doc.setFont('helvetica', 'normal');
  doc.text('Bagagem na Mesma Sede (Ocupação de PNR)', 45, 66);

  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 75, 170, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('O MILITAR DEVERÁ COMPARECER À DIVISÃO ADMINISTRATIVA', 105, 81, { align: 'center' });
  doc.text('PARA ASSINATURA E ENTREGA DE DOCUMENTOS', 105, 87, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.text('ANEXOS NECESSÁRIOS:', 20, 100);
  doc.setFont('helvetica', 'normal');

  const itens = Array.from(document.querySelectorAll('#lista-anexos-final li')).map(li => li.textContent.trim());
  let y = 108;
  itens.forEach(item => {
    const linhas = doc.splitTextToSize(`[   ] ${item}`, 165);
    doc.text(linhas, 20, y);
    y += linhas.length * 6;
  });

  doc.save(`Checklist_Bagagem_${dadosUltimoEnvio.posto.replace(/\s+/g, '_')}_${dadosUltimoEnvio.nomeCompleto.replace(/\s+/g, '_')}.pdf`);
}

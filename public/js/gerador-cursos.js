// =========================================================================
// SisDoc - Gerador de Cursos e Estágios (Docxtemplater + Google Drive)
// =========================================================================

// Formata data atual por extenso: ex: "17 de setembro de 2026"
function formatarDataPorExtenso() {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

// Cria uma nova linha de dependente com seleção de parentesco
function adicionarLinhaDependente() {
  const listaDep = document.getElementById('lista-dependentes');
  if (!listaDep) return;

  const divLinha = document.createElement('div');
  divLinha.className = 'grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200 relative item-dependente items-end';
  
  divLinha.innerHTML = `
    <div class="sm:col-span-3">
      <label class="block text-[11px] font-semibold text-stone-600 mb-1">Nome Completo *</label>
      <input type="text" class="dep-nome w-full border border-stone-300 rounded px-2 py-1.5 text-xs uppercase" placeholder="NOME DO DEPENDENTE" required>
    </div>
    <div class="sm:col-span-2 flex items-end gap-2">
      <div class="flex-grow">
        <label class="block text-[11px] font-semibold text-stone-600 mb-1">Grau de Parentesco *</label>
        <select class="dep-parentesco w-full border border-stone-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-[#2c3b2c] focus:outline-none" required>
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
      <button type="button" class="btn-remover-dep px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded border border-red-300 text-xs transition cursor-pointer" title="Remover Dependente">
        ✕
      </button>
    </div>
  `;

  // Evento para remover a linha ao clicar no '✕'
  divLinha.querySelector('.btn-remover-dep').addEventListener('click', () => {
    divLinha.remove();
  });

  listaDep.appendChild(divLinha);
}

// Inicialização dos eventos do formulário e interface
document.addEventListener('DOMContentLoaded', () => {
  // Controle da exibição da seção de Dependentes (Rádios SIM / NÃO)
  const radiosDep = document.querySelectorAll('input[name="opt_dependentes"]');
  const caixaInclusao = document.getElementById('caixa-inclusao-dependentes');

  radiosDep.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (!caixaInclusao) return;
      if (e.target.value === 'sim') {
        caixaInclusao.classList.remove('hidden');
      } else {
        caixaInclusao.classList.add('hidden');
      }
    });
  });

  // Botão Adicionar Dependente
  const btnAddDep = document.getElementById('btn-add-dep');
  if (btnAddDep) {
    btnAddDep.addEventListener('click', (e) => {
      e.preventDefault();
      adicionarLinhaDependente();
    });
  }

  // Intercepta a submissão do formulário
  const form = document.getElementById('form-cursos');
  if (form) {
    form.addEventListener('submit', processarEnvioCursos);
  }
});

// Coleta todos os dependentes cadastrados (apenas Nome e Grau de Parentesco)
function coletarDependentes() {
  const radioSim = document.querySelector('input[name="opt_dependentes"][value="sim"]');
  if (!radioSim || !radioSim.checked) {
    return [];
  }

  const itens = document.querySelectorAll('.item-dependente');
  const dependentes = [];

  itens.forEach((el) => {
    const nome = el.querySelector('.dep-nome')?.value.trim().toUpperCase() || '';
    const parentesco = el.querySelector('.dep-parentesco')?.value.trim() || '';

    if (nome && parentesco) {
      dependentes.push({
        NOME: nome,
        PARENTESCO: parentesco
      });
    }
  });

  return dependentes;
}

// Processador Principal de Geração do DIEx
async function processarEnvioCursos(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Confirmar e Gerar Documentos';

  try {
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="animate-pulse">Processando documento...</span>`;
    }

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';

    const dados = {
      DATA_ATUAL: formatarDataPorExtenso(),
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
      BI: getVal('bi'),
      DATA_DESLIGAMENTO: getVal('dataDesligamento'),
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta')
    };

    const dependentes = coletarDependentes();

    // Verificação das bibliotecas PizZip e Docxtemplater com fallbacks
    const PizZipConstructor = window.PizZip || window.pizzip || (typeof PizZip !== 'undefined' ? PizZip : null);
    const DocxtemplaterConstructor = window.docxtemplater || window.Docxtemplater || (typeof docxtemplater !== 'undefined' ? docxtemplater : null);

    if (!PizZipConstructor || !DocxtemplaterConstructor) {
      throw new Error("As bibliotecas PizZip ou Docxtemplater não foram carregadas. Verifique a conexão com a internet.");
    }

    // Carrega o modelo Word oficial
    const resTemplate = await fetch('/templates/diex_opcao_curso.docx');
    if (!resTemplate.ok) {
      throw new Error(`Não foi possível carregar '/templates/diex_opcao_curso.docx' (HTTP ${resTemplate.status})`);
    }
    const templateBuffer = await resTemplate.arrayBuffer();

    // Renderiza os dados no template
    const zip = new PizZipConstructor(templateBuffer);
    const doc = new DocxtemplaterConstructor(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    doc.render({
      ...dados,
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    });

    const blobWord = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const nomeArquivo = `DIEx_Opcao_Curso_${dados.POSTO_GRAD.replace(/\s+/g, '_')}_${dados.NOME_COMPLETO.replace(/\s+/g, '_')}.docx`;
    const nomePastaDrive = `Cursos - ${dados.POSTO_GRAD} ${dados.NOME_COMPLETO}`;

    // 1. Download Imediato do Word no navegador
    const urlDownload = URL.createObjectURL(blobWord);
    const link = document.createElement('a');
    link.href = urlDownload;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlDownload);

    // 2. Upload para o Google Drive e registro de protocolo
    if (btnSubmit) btnSubmit.innerHTML = `<span class="animate-pulse">Enviando ao Google Drive...</span>`;

    try {
      await fetch(`/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(nomePastaDrive)}`, {
        method: 'POST',
        body: blobWord
      });

      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          data: new Date().toISOString(),
          requerente: `${dados.POSTO_GRAD} ${dados.NOME_COMPLETO}`,
          tipo: 'DIEx Opção - Curso',
          arquivo: nomeArquivo,
          pasta: nomePastaDrive,
          dependentesQtd: dependentes.length
        })
      });
    } catch (driveErr) {
      console.warn("Aviso no upload para o Google Drive:", driveErr);
    }

    // 3. Exibe o modal de sucesso
    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
      modalSucesso.classList.remove('hidden');
    }

    // Configura o botão de PDF de Anexos
    const btnBaixarPdf = document.getElementById('btn-baixar-pdf');
    if (btnBaixarPdf) {
      btnBaixarPdf.onclick = () => gerarPdfAnexos(dados);
    }

  } catch (err) {
    console.error("Erro na geração:", err);
    alert(`Erro ao gerar documento: ${err.message}`);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = textoOriginal;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}

// Gerador da Lista de Anexos em PDF
function gerarPdfAnexos(dados) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Biblioteca jsPDF indisponível no momento.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("5º BATALHÃO DE INFANTARIA LEVE", 105, 20, { align: "center" });
  pdf.text("DIVISÃO ADMINISTRATIVA - DOCUMENTOS NECESSÁRIOS", 105, 28, { align: "center" });

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Requerente: ${dados.POSTO_GRAD} ${dados.NOME_COMPLETO}`, 20, 42);
  pdf.text(`Identidade: ${dados.IDENTIDADE}    CPF: ${dados.CPF}`, 20, 49);
  pdf.text(`Curso: ${dados.NOME_CURSO}`, 20, 56);
  pdf.text(`Data da Solicitação: ${dados.DATA_ATUAL}`, 20, 63);

  pdf.line(20, 68, 190, 68);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("DOCUMENTOS QUE DEVERÃO SER ENTREGUES:", 20, 78);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const anexos = [
    "1. 01 (uma) cópia autenticada do Adt DCEM;",
    "2. 01 (uma) cópia autenticada do BI da transcrição do Adt DCEM;",
    "3. 01 (uma) cópia autenticada do último contracheque;",
    "4. 01 (uma) cópia autenticada da Declaração de Beneficiários."
  ];

  let y = 88;
  anexos.forEach((item) => {
    pdf.text(item, 25, y);
    y += 8;
  });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Atenção: O militar deverá comparecer à Divisão Administrativa com os documentos acima.", 20, y + 10);

  pdf.save(`Lista_Anexos_${dados.POSTO_GRAD}_${dados.NOME_COMPLETO}.pdf`);
}
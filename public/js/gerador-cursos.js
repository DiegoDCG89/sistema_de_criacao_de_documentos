// =========================================================================
// SisDoc - Gerador de Cursos e Estágios (Multi-documentos na pasta Curso_{NOME})
// =========================================================================

// Formata data atual: ex: "17 de setembro de 2026"
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

// Formata apenas mês e ano: ex: "setembro de 2026"
function formatarMesAno() {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const hoje = new Date();
  return `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
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

  divLinha.querySelector('.btn-remover-dep').addEventListener('click', () => {
    divLinha.remove();
  });

  listaDep.appendChild(divLinha);
}

// Inicialização dos eventos da tela
document.addEventListener('DOMContentLoaded', () => {
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

  const btnAddDep = document.getElementById('btn-add-dep');
  if (btnAddDep) {
    btnAddDep.addEventListener('click', (e) => {
      e.preventDefault();
      adicionarLinhaDependente();
    });
  }

  const form = document.getElementById('form-cursos');
  if (form) {
    form.addEventListener('submit', processarEnvioCursos);
  }
});

// Coleta os dependentes adicionados
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

// Função auxiliar: Renderiza qualquer modelo .docx em memória
async function renderizarDocx(caminhoTemplate, dadosPayload, PizZipLib, DocxLib) {
  const res = await fetch(caminhoTemplate);
  if (!res.ok) {
    throw new Error(`Não foi possível carregar o template '${caminhoTemplate}' (HTTP ${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  const zip = new PizZipLib(buffer);
  const doc = new DocxLib(zip, { paragraphLoop: true, linebreaks: true });
  
  doc.render(dadosPayload);
  
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

// Processador Principal
async function processarEnvioCursos(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Confirmar e Gerar Documentos';

  try {
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="animate-pulse">Processando documentos...</span>`;
    }

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';

    const dados = {
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
      BI: getVal('bi'),
      DATA_DESLIGAMENTO: getVal('dataDesligamento'),
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta')
    };

    const dependentes = coletarDependentes();

    const PizZipConstructor = window.PizZip || window.pizzip || (typeof PizZip !== 'undefined' ? PizZip : null);
    const DocxtemplaterConstructor = window.docxtemplater || window.Docxtemplater || (typeof docxtemplater !== 'undefined' ? docxtemplater : null);

    if (!PizZipConstructor || !DocxtemplaterConstructor) {
      throw new Error("Bibliotecas Word (PizZip/Docxtemplater) não disponíveis.");
    }

    const payloadTemplate = {
      ...dados,
      TEM_DEPENDENTES: dependentes.length > 0,
      DEPENDENTES: dependentes
    };

    const sufixoNome = `${dados.POSTO_GRAD.replace(/\s+/g, '_')}_${dados.NOME_COMPLETO.replace(/\s+/g, '_')}.docx`;
    
    // Nome da pasta única
    const pastaDestinoDrive = `Curso_${dados.NOME_COMPLETO.replace(/\s+/g, '_')}`;

    // 1. GERAÇÃO DO DIEX PRINCIPAL (Baixa para o usuário + Envia ao Drive)
    const blobDiex = await renderizarDocx('/templates/diex_opcao_curso.docx', payloadTemplate, PizZipConstructor, DocxtemplaterConstructor);
    const nomeArquivoDiex = `DIEx_Opcao_Curso_${sufixoNome}`;

    // Download local exclusivo do DIEx
    const urlDownload = URL.createObjectURL(blobDiex);
    const link = document.createElement('a');
    link.href = urlDownload;
    link.download = nomeArquivoDiex;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlDownload);

    // 2. GERAÇÃO DOS ANEXOS INTERNOS (Apenas para o Google Drive)
    if (btnSubmit) btnSubmit.innerHTML = `<span class="animate-pulse">Gerando anexos internos...</span>`;

    const blobBar = await renderizarDocx('/templates/nota_diex_bar.docx', payloadTemplate, PizZipConstructor, DocxtemplaterConstructor);
    const nomeArquivoBar = `Nota_p_BAR_${sufixoNome}`;

    const blobOrdPagto = await renderizarDocx('/templates/Nota_Ord_Pagto_curso.docx', payloadTemplate, PizZipConstructor, DocxtemplaterConstructor);
    const nomeArquivoOrdPagto = `Nota_Ord_Pagto_${sufixoNome}`;

    // 3. UPLOAD SEQUENCIAL (Garante que apenas 1 pasta seja criada)
    if (btnSubmit) btnSubmit.innerHTML = `<span class="animate-pulse">Enviando arquivos para a pasta ${pastaDestinoDrive}...</span>`;

    const enviarParaDrive = async (blob, nomeArquivo) => {
      const url = `/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(pastaDestinoDrive)}`;
      return fetch(url, { method: 'POST', body: blob });
    };

    const listaEnvios = [
      { blob: blobDiex, nome: nomeArquivoDiex },
      { blob: blobBar, nome: nomeArquivoBar },
      { blob: blobOrdPagto, nome: nomeArquivoOrdPagto }
    ];

    // O primeiro upload cria a pasta; os subsequentes salvam na mesma pasta já criada
    for (const item of listaEnvios) {
      try {
        await enviarParaDrive(item.blob, item.nome);
      } catch (errEnvio) {
        console.warn(`Aviso no upload de ${item.nome}:`, errEnvio);
      }
    }

    // Registra o protocolo no backend
    try {
      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          data: new Date().toISOString(),
          requerente: `${dados.POSTO_GRAD} ${dados.NOME_COMPLETO}`,
          tipo: 'DIEx Opção - Curso (com Nota BAR e Ord Pagto)',
          arquivo: nomeArquivoDiex,
          pasta: pastaDestinoDrive,
          dependentesQtd: dependentes.length
        })
      });
    } catch (eProtocolo) {
      console.warn("Aviso ao registrar protocolo:", eProtocolo);
    }

    // Exibe o modal de sucesso na tela
    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
      modalSucesso.classList.remove('hidden');
    }

    const btnBaixarPdf = document.getElementById('btn-baixar-pdf');
    if (btnBaixarPdf) {
      btnBaixarPdf.onclick = () => gerarPdfAnexos(dados);
    }

  } catch (err) {
    console.error("Erro no processamento:", err);
    alert(`Erro ao processar documentos: ${err.message}`);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = textoOriginal;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}

// Gerador da Lista de Anexos em PDF (jsPDF)
function gerarPdfAnexos(dados) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Biblioteca jsPDF indisponível.");
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

function adicionarLinha() {
    const tbody = document.querySelector('#tabelaItens tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="item-nome" placeholder="Ex: Cozinha - Piso" required></td>
        <td><input type="text" class="item-estado" placeholder="Ex: Com avarias" required></td>
        <td><button type="button" class="btn-remover" onclick="removerLinha(this)">Remover</button></td>
    `;
    tbody.appendChild(tr);
}

function removerLinha(botao) {
    const tr = botao.closest('tr');
    tr.remove();
}

document.getElementById('formVistoria').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Coletar dados principais
    const dados = {
        tipoVistoria: document.getElementById('tipoVistoria').value,
        nomeMilitar: document.getElementById('nomeMilitar').value,
        dataVistoria: document.getElementById('dataVistoria').value,
        itens: []
    };

    // Coletar dados da tabela
    const linhas = document.querySelectorAll('#tabelaItens tbody tr');
    linhas.forEach(linha => {
        dados.itens.push({
            nome: linha.querySelector('.item-nome').value,
            estado: linha.querySelector('.item-estado').value
        });
    });

    try {
        const response = await fetch('/gerar-vistoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Documento gerado com sucesso! Salvo no Drive.');
            // Opcional: Baixar o documento para o usuário
            window.open(result.downloadUrl, '_blank'); 
        } else {
            alert('Erro ao gerar documento: ' + result.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão com o servidor.');
    }
});

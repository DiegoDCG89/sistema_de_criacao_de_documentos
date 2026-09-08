function renderDependentes() {
  const container = document.getElementById('lista-dependentes');
  container.innerHTML = '';
  
  if (dependentes.length === 0) {
    container.innerHTML = '<p class="text-xs text-stone-500 italic">Nenhum dependente adicionado. (Opcional)</p>';
    return;
  }

  dependentes.forEach(dep => {
    container.innerHTML += `
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-stone-50 p-2.5 rounded border border-stone-200">
        <div class="sm:col-span-5">
          <input type="text" placeholder="Nome Completo" value="${dep.nome}" oninput="window.atualizarDep(${dep.id}, 'nome', this.value.toUpperCase())" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 uppercase">
        </div>
        <div class="sm:col-span-3">
          <select onchange="window.atualizarDep(${dep.id}, 'parentesco', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 bg-white">
            <option value="Esposa" ${dep.parentesco === 'Esposa' ? 'selected' : ''}>Esposa</option>
            <option value="Companheiro(a)" ${dep.parentesco === 'Companheiro(a)' ? 'selected' : ''}>Companheiro(a)</option>
            <option value="Filho(a)" ${dep.parentesco === 'Filho(a)' ? 'selected' : ''}>Filho(a)</option>
            <option value="Enteado(a)" ${dep.parentesco === 'Enteado(a)' ? 'selected' : ''}>Enteado(a)</option>
            <option value="Pai" ${dep.parentesco === 'Pai' ? 'selected' : ''}>Pai</option>
            <option value="Mãe" ${dep.parentesco === 'Mãe' ? 'selected' : ''}>Mãe</option>
            <option value="Outro" ${dep.parentesco === 'Outro' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <input type="text" placeholder="Dt Nasc" value="${dep.dtNasc}" maxlength="10" oninput="window.aplicarMascaraDataDep(this, ${dep.id})" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5">
        </div>
        <div class="sm:col-span-2 flex gap-1">
          <input type="number" placeholder="Idade" value="${dep.idade}" oninput="window.atualizarDep(${dep.id}, 'idade', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5">
          <button type="button" onclick="window.removerDependente(${dep.id})" class="text-red-500 hover:text-red-700 px-2 font-bold"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      </div>
    `;
  });
  if (window.lucide) lucide.createIcons();
}

// Função para buscar e exibir os dados dos computadores
async function fetchComputadores() {
    try {
        const response = await fetch('/infocomputadores'); // Rota que criamos
        const data = await response.json();
        const listElement = document.getElementById('computadores-list');

        data.forEach(computador => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${computador.id}</td>
                <td>${computador.nome_computador}</td>
                <td>${computador.SerialNumber}</td>
                <td>${computador.endereco_mac}</td>
                <td>${computador.patrimonio}</td>
                <td>${new Date(computador.data_registro).toLocaleString('pt-BR', { timeZone: 'UTC' })}</td>                
                <td>${computador.cpu_info}</td>
                <td>${computador.disco_info}</td>
                <td>${computador.endereco_ip}</td>
            `;
            listElement.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao buscar os computadores:', error);
    }
}

// Chama a função quando a página carrega
window.onload = fetchComputadores;

document.addEventListener('DOMContentLoaded', () => {
    carregarUnidades();

    const unidadeSelect = document.getElementById('unidadeSelect');
    const agendamentosList = document.getElementById('agendamentosList');
    
    unidadeSelect.addEventListener('change', async () => {
        const codigoUnidade = unidadeSelect.value;
        if (codigoUnidade) {
            await carregarAgendamentosPorUnidade(codigoUnidade);
        } else {
            agendamentosList.innerHTML = '';
        }
    });

    // Verifica e remove agendamentos expirados a cada minuto
    setInterval(verificarEExcluirAgendamentosExpirados, 60000);
});

// Variáveis globais para armazenar agendamentos e rolagem
let agendamentos = []; // Array para armazenar todos os agendamentos
let currentIndex = 0;  // Índice do grupo atual
const groupSize = 8;   // Número total de agendamentos por grupo
let rolando = false;   // Variável para controlar o estado da rolagem automática

// Função para verificar e excluir automaticamente agendamentos expirados
async function verificarEExcluirAgendamentosExpirados() {
    const agendamentosList = document.getElementById('agendamentosList');
    const agendamentoItems = agendamentosList.getElementsByClassName('agendamento-item');

    const now = new Date(); // Data e hora atuais em São Paulo
    console.log('Data e Hora Atual:', now);

    for (let agendamentoItem of agendamentoItems) {
        const dataFimText = agendamentoItem.querySelector('.data-fim').textContent.split(': ')[1];
        const horaFimText = agendamentoItem.querySelector('.hora-fim').textContent.split(': ')[1];

        // Extrair as partes da data final
        const dataFimParts = dataFimText.split('/');
        const horaFimParts = horaFimText.split(':');

        // Convertendo data e hora final do agendamento para um objeto Date considerando fuso horário de São Paulo
        const dataFimDate = new Date(
            dataFimParts[2],        // Ano
            dataFimParts[1] - 1,    // Mês (0-baseado)
            dataFimParts[0],        // Dia
            horaFimParts[0],        // Hora
            horaFimParts[1],        // Minuto
            horaFimParts[2] || 0    // Segundo (padrão 0 se não existir)
        );

        console.log('Data e Hora Final do Agendamento:', dataFimDate);

        if (now >= dataFimDate) { // Comparação para ver se o agendamento expirou
            const agendamentoId = agendamentoItem.dataset.agendamentoId;
            console.log(`Agendamento expirado detectado: ID ${agendamentoId}`);
            await excluirAgendamento(agendamentoId);
            agendamentoItem.remove(); // Remover o agendamento do DOM
        } else {
            console.log(`Agendamento ainda ativo: ID ${agendamentoItem.dataset.agendamentoId}`);
        }
    }

    const codigoUnidade = unidadeSelect.value;
    if (codigoUnidade) {
        await carregarAgendamentosPorUnidade(codigoUnidade);
    }
}

// Função para excluir agendamento do servidor
async function excluirAgendamento(agendamentoId) {
    console.log(`Tentando excluir o agendamento com ID: ${agendamentoId}`); // Adicione este log
    try {
        const response = await fetch(`/excluir-agendamento/${agendamentoId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erro ao excluir agendamento');
        console.log(`Agendamento ${agendamentoId} excluído com sucesso`);
    } catch (error) {
        console.error('Erro ao excluir agendamento expirado:', error);
    }
}

async function carregarUnidades() {
    try {
        const response = await fetch('/listar-unidades');
        if (!response.ok) throw new Error('Erro ao carregar unidades');
        
        const unidades = await response.json();
        const unidadeSelect = document.getElementById('unidadeSelect');
        unidades.forEach(unidade => {
            const option = document.createElement('option');
            option.value = unidade.codigo;
            option.textContent = unidade.nome;
            unidadeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        alert('Erro ao carregar unidades.');
    }
}

async function carregarAgendamentosPorUnidade(codigoUnidade) {
    try {
        const response = await fetch(`/listar-agendamento/${codigoUnidade}`);
        if (!response.ok) throw new Error('Erro ao carregar agendamentos');
        
        agendamentos = await response.json(); // Armazena os agendamentos globalmente
        const agendamentosList = document.getElementById('agendamentosList');
        agendamentosList.innerHTML = '';

        // Adiciona uma div para a grid
        const gridContainer = document.createElement('div');
        gridContainer.classList.add('agendamentos-grid');

        if (agendamentos.length === 0) {
            agendamentosList.textContent = 'Nenhum agendamento encontrado.';
        } else {
            agendamentos.sort((a, b) => {
                const salaA = a.nome_sala.toUpperCase();
                const salaB = b.nome_sala.toUpperCase();
                return salaA.localeCompare(salaB) || new Date(`${a.data_reservas}T${a.hora_inicio}`) - new Date(`${b.data_reservas}T${b.hora_inicio}`);
            });

            agendamentos.forEach(agendamento => {
                const agendamentoItem = document.createElement('div');
                agendamentoItem.classList.add('agendamento-item');
                agendamentoItem.dataset.agendamentoId = agendamento.id_agendamento;

                const salaNome = document.createElement('h3');
                salaNome.textContent = `Sala: ${agendamento.nome_sala}`;
                agendamentoItem.appendChild(salaNome);

                const professorNome = document.createElement('p');
                professorNome.textContent = `Professor: ${agendamento.nome}`;
                agendamentoItem.appendChild(professorNome);

                const dataInicio = document.createElement('p');
                const horaInicio = document.createElement('p');
                dataInicio.textContent = `Data de Início: ${formatarData(agendamento.data_reservas)}`;
                horaInicio.textContent = `Hora de Início: ${formatarHora(agendamento.hora_inicio)}`;
                agendamentoItem.appendChild(dataInicio);
                agendamentoItem.appendChild(horaInicio);

                const dataFim = document.createElement('p');
                const horaFim = document.createElement('p');
                dataFim.classList.add('data-fim');
                horaFim.classList.add('hora-fim');
                dataFim.textContent = `Data de Fim: ${formatarData(agendamento.data_reservas)}`;
                horaFim.textContent = `Hora de Fim: ${formatarHora(agendamento.hora_fim)}`;
                agendamentoItem.appendChild(dataFim);
                agendamentoItem.appendChild(horaFim);

                const motivo = document.createElement('p');
                motivo.textContent = `Motivo: ${agendamento.motivo || 'Nenhum motivo fornecido'}`;
                agendamentoItem.appendChild(motivo);

                gridContainer.appendChild(agendamentoItem);
            });
            agendamentosList.appendChild(gridContainer);

            // Inicia a rolagem automática
            iniciarRolagem();
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        alert('Erro ao carregar agendamentos.');
    }
}

// Função para rolar automaticamente os agendamentos
function iniciarRolagem() {
    if (rolando) return; // Se já estiver rolando, sai da função
    rolando = true; // Marca que a rolagem está ativa
    mostrarAgendamentos();

    setInterval(() => {
        currentIndex = (currentIndex + 1) % Math.ceil(agendamentos.length / groupSize); // Atualiza o índice do grupo
        mostrarAgendamentos();
    }, 10000); // 10000 ms (10 segundos)
}

// Dentro da função mostrarAgendamentos
function mostrarAgendamentos() {
    const agendamentosList = document.getElementById('agendamentosList');
    const gridContainer = agendamentosList.querySelector('.agendamentos-grid');
    
    // Limpa a grid atual
    while (gridContainer.firstChild) {
        gridContainer.removeChild(gridContainer.firstChild);
    }

    // Obtém a data atual no formato 'DD/MM/YYYY'
    const dataAtual = new Date();
    const diaAtual = String(dataAtual.getDate()).padStart(2, '0');
    const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const anoAtual = dataAtual.getFullYear();
    const dataHoje = `${diaAtual}/${mesAtual}/${anoAtual}`;

    // Filtra apenas os agendamentos que têm data de início igual a hoje
    const agendamentosDeHoje = agendamentos.filter(agendamento => {
        const dataAgendamento = formatarData(agendamento.data_reservas);
        return dataAgendamento === dataHoje;
    });

    // Adiciona apenas os agendamentos de hoje à grid
    if (agendamentosDeHoje.length === 0) {
        agendamentosList.textContent = 'Nenhum agendamento para hoje.';
    } else {
        agendamentosDeHoje.forEach(agendamento => {
            const agendamentoItem = document.createElement('div');
            agendamentoItem.classList.add('agendamento-item');
            agendamentoItem.dataset.agendamentoId = agendamento.id_agendamento;

            const salaNome = document.createElement('h3');
            salaNome.innerHTML = ` <span>${agendamento.nome_sala}</span> <br><br>`;
            agendamentoItem.appendChild(salaNome);

            const professorNome = document.createElement('p');
            professorNome.innerHTML = `Professor: <span>${agendamento.nome}</span>`;
            agendamentoItem.appendChild(professorNome);

            const dataInicio = document.createElement('p');
            dataInicio.innerHTML = `Data de Início: <span>${formatarData(agendamento.data_reservas)}</span>`;
            agendamentoItem.appendChild(dataInicio);

            const horaInicio = document.createElement('p');
            horaInicio.innerHTML = `Hora de Início: <span>${formatarHora(agendamento.hora_inicio)}</span>`;
            agendamentoItem.appendChild(horaInicio);

            const dataFim = document.createElement('p');
            dataFim.classList.add('data-fim');
            dataFim.innerHTML = `Data de Fim: <span>${formatarData(agendamento.data_reservas)}</span>`;
            agendamentoItem.appendChild(dataFim);

            const horaFim = document.createElement('p');
            horaFim.classList.add('hora-fim');
            horaFim.innerHTML = `Hora de Fim: <span>${formatarHora(agendamento.hora_fim)}</span>`;
            agendamentoItem.appendChild(horaFim);

            const tipo_aula = document.createElement('p');
            tipo_aula.textContent = `Tipo Aula: ${agendamento.tipo_aula || 'Nenhuma aula fornecida'}`;
            agendamentoItem.appendChild(tipo_aula);

            const motivo = document.createElement('p');
            motivo.innerHTML = `Motivo: <span>${agendamento.motivo || 'Nenhum motivo fornecido'}</span>`;
            agendamentoItem.appendChild(motivo);

            // Adiciona o item à grid
            gridContainer.appendChild(agendamentoItem);
        });
    }
}




// Função para formatar a data considerando o fuso horário de São Paulo (Brazil)
function formatarData(data) {
    const dataObj = new Date(data);
    const utcDay = dataObj.getUTCDate();
    const utcMonth = dataObj.getUTCMonth() + 1; // Os meses são indexados de 0 a 11
    const utcYear = dataObj.getUTCFullYear();
  
    const day = utcDay < 10 ? '0' + utcDay : utcDay;
    const month = utcMonth < 10 ? '0' + utcMonth : utcMonth;

    return `${day}/${month}/${utcYear}`; // Formato brasileiro
}

// Função para formatar a hora considerando o fuso horário de São Paulo (Brazil)
function formatarHora(hora) {
    const [hours, minutes, seconds] = hora.split(':').map(Number);
    const dataHora = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0));
    
    const horasUTC = dataHora.getUTCHours();
    const minutosUTC = dataHora.getUTCMinutes();
    const segundosUTC = dataHora.getUTCSeconds();
    
    const horas = horasUTC < 10 ? '0' + horasUTC : horasUTC;
    const minutos = minutosUTC < 10 ? '0' + minutosUTC : minutosUTC;
    const segundos = segundosUTC < 10 ? '0' + segundosUTC : segundosUTC;

    return `${horas}:${minutos}:${segundos}`;
}

// Funções de carregamento das unidades e salas
document.addEventListener('DOMContentLoaded', () => {
    carregarUnidades();

    // Inicializa o Flatpickr para permitir seleção múltipla
    flatpickr("#data_selecionada", {
        mode: "multiple", // Modo que permite a seleção de múltiplas datas
        dateFormat: "Y-m-d", // Formato das datas - corrigido!
        onClose: function(selectedDates) {
            // Atualiza o campo de texto com as datas selecionadas formatadas
            const formataData = selectedDates.map(date => date.toISOString().split('T')[0]).join(', ');
            document.getElementById('data_selecionada').value = formataData; // Atualiza o valor do input
        }
    });
});

async function carregarUnidades() {
    console.log('Função carregarUnidades sendo executada');
    try {
        const response = await fetch('/listar-unidades');
        if (!response.ok) {
            throw new Error('Erro ao carregar unidades');
        }
        const unidades = await response.json();
        const unidadeSelect = document.getElementById('codigo_unidade');

        unidadeSelect.innerHTML = '<option value="" selected>Selecione uma unidade</option>';
        unidades.forEach(unidade => {
            const option = document.createElement('option');
            option.value = unidade.codigo_unidade || unidade.codigo;
            option.textContent = unidade.nome_unidade || unidade.nome;
            unidadeSelect.appendChild(option);
        });

        console.log('Unidades adicionadas ao select');
    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
    }
}

async function carregarSalasProfessoresPorUnidade(codigoUnidade) {
    try {
        const responseSalas = await fetch(`/listar-salas/${codigoUnidade}`);
        if (!responseSalas.ok) {
            throw new Error('Erro ao carregar salas');
        }
        const salas = await responseSalas.json();
        const salaSelect = document.getElementById('id_sala');
        salaSelect.innerHTML = ''; 

        salas.forEach(sala => {
            const option = document.createElement('option');
            option.value = sala.id_sala;
            option.textContent = sala.nome_sala;
            salaSelect.appendChild(option);
        });

        await carregarProfessoresPorUnidade(codigoUnidade);
    } catch (error) {
        console.error('Erro ao carregar salas e professores:', error);
    }
}

async function carregarProfessoresPorUnidade(codigoUnidade) {
    try {
        const response = await fetch(`/listar-professores-por-unidade/${codigoUnidade}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar professores');
        }
        const professores = await response.json();
        const professorSelect = document.getElementById('id_professor');
        professorSelect.innerHTML = '';

        professores.forEach(professor => {
            const option = document.createElement('option');
            option.value = professor.id_professor;
            option.textContent = professor.nome;
            professorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar professores:', error);
    }
}

document.getElementById('codigo_unidade').addEventListener('change', (e) => {
    const codigoUnidade = e.target.value;
    carregarSalasProfessoresPorUnidade(codigoUnidade);
});

// agendar
async function agendarSala(event) {
    event.preventDefault(); // Previne o envio do formulário

    const idSala = document.getElementById('id_sala').value;
    const idProfessor = document.getElementById('id_professor').value;

    const datasSelecionadas = document.getElementById('data_selecionada').value.split(',').map(date => date.trim());

    const horaInicio = document.getElementById('hora_inicio').value;
    const horaFim = document.getElementById('hora_fim').value;
    const motivo = document.getElementById('motivo').value;

    const agora = new Date();
    const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
    const [horaFimH, horaFimM] = horaFim.split(':').map(Number);

    // Verificação de data e hora
    for (const data of datasSelecionadas) {
        const [ano, mes, dia] = data.split('-').map(Number);
        const dataSelecionada = new Date(ano, mes - 1, dia, horaInicioH, horaInicioM);

        if (dataSelecionada < agora) {
            alert(`A data ${data} e horário já passaram. Não é possível agendar.`);
            return;
        }

        if (horaInicioH > horaFimH || (horaInicioH === horaFimH && horaInicioM >= horaFimM)) {
            alert('A hora de início deve ser anterior à hora de fim.');
            return;
        }
    }

    const agendamentoData = {
        id_sala: idSala,
        id_professor: idProfessor,
        data_reservas: datasSelecionadas,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        motivo
    };

    console.log('Dados do agendamento:', agendamentoData); // Verifique se todos os dados estão corretos.

    // Requisição POST para agendar a sala
    try {
        const response = await fetch('/agendar-sala', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agendamentoData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao agendar sala:', errorText);
            alert(`${errorText}`);
            return;
        }

        alert('Sala agendada com sucesso!');
        document.getElementById('agendamentoForm').reset();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao agendar sala. Por favor, tente novamente.');
    }
}


async function verificarAgendamentosExistentes(agendamentoData) {
    let conflitos = [];

    // Loop através de cada data selecionada
    for (let data of agendamentoData.data_reservas) {
        // Verifica se já há agendamentos para a sala na data e horário específicos
        const resposta = await fetch(`/verificar-agendamento/${agendamentoData.id_sala}/${data}/${agendamentoData.hora_inicio}/${agendamentoData.hora_fim}`);

        if (resposta.ok) {
            const resultado = await resposta.json();
            if (resultado.existe) {
                conflitos.push(data); // Adiciona a data ao array de conflitos se já existir agendamento
            }
        }
    }

    return conflitos; // Retorna os conflitos encontrados, se houver
}

// Adiciona o evento de submit ao formulário
document.getElementById('agendamentoForm').addEventListener('submit', agendarSala);

// Carrega as unidades inicialmente
carregarUnidades();

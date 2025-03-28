document.getElementById('id_professor').addEventListener('change', (event) => {
    console.log('Professor selecionado:', event.target.value);
});

// Funções de carregamento das unidades e salas
document.addEventListener('DOMContentLoaded', () => {
    // Carregar apenas a unidade do professor logado

    // Adicione o evento de clique para o botão de excluir selecionados
    document.getElementById('botaoExcluirSelecionados').addEventListener('click', excluirSelecionados);

    carregarUnidadesDoProfessor(); 
    //carregarProfessoresPorUnidade();
    

    flatpickr("#data_selecionada", {
        mode: "multiple", // Modo que permite a seleção de múltiplas datas
        dateFormat: "Y-m-d", // Formato das datas para o banco (internamente)
        locale: "pt",
        onClose: function(selectedDates) {
            // Atualiza o campo de texto com as datas selecionadas formatadas para DD/MM/YYYY
            const formataData = selectedDates.map(date => {
                const partes = date.toISOString().split('T')[0].split('-');
                return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formato DD/MM/YYYY
            }).join(', ');
    
            document.getElementById('data_selecionada').value = formataData; // Atualiza o valor do input
        }
    });
    
});

// Carregar tipos de aula por unidade
async function carregarTiposAulaPorUnidade(codigoUnidade) {
    try {
        const response = await fetch(`/listar-tipos-aula-por-unidade/${codigoUnidade}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar tipos de aula');
        }
        const tiposAula = await response.json();
        tiposAula.sort((a, b) => a.descricao.localeCompare(b.descricao)); // Ordena os tipos de aula
        
        const tipoAulaSelect = document.getElementById('id_tipo_aula');
        tipoAulaSelect.innerHTML = ''; // Limpa opções existentes

        // Adiciona a opção padrão "Selecionar Unidade Curricular"
        const defaultOption = document.createElement('option');
        defaultOption.value = ''; // Valor vazio
        defaultOption.textContent = 'Selecionar Unidade Curricular'; // Texto da opção
        defaultOption.disabled = true; // Sem opção de seleção
        defaultOption.selected = true; // Selecionado por padrão
        tipoAulaSelect.appendChild(defaultOption); 
        
        if (tiposAula.length === 0) {
            console.log('Nenhum tipo de aula encontrado');
            return; // Se não houver tipos de aula, retornar
        }

        tiposAula.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id_tipo_aula; // ID do tipo de aula
            option.textContent = tipo.descricao; // A descrição do tipo de aula
            tipoAulaSelect.appendChild(option); // Adiciona a opção ao select
        });
    } catch (error) {
        console.error('Erro ao carregar tipos de aula:', error);
    }
}

// Atualizar o evento para carregar salas e tipos de aula quando a unidade for mudada
document.getElementById('codigo_unidade').addEventListener('change', async (event) => {
    const codigoUnidade = event.target.value;
    console.log("Unidade selecionada:", codigoUnidade); // Verifica se a unidade é capturada corretamente
    if (codigoUnidade) {
        await carregarTiposAulaPorUnidade(codigoUnidade); // Carrega os tipos de aula da nova unidade
        await carregarSalasProfessoresPorUnidade(codigoUnidade); // Carrega as salas e professores da nova unidade
    }
});



// Carregar salas e professores por unidade
async function carregarSalasProfessoresPorUnidade(codigoUnidade) {
    try {
        const responseSalas = await fetch(`/listar-salas/${codigoUnidade}`); // Busca salas apenas para a unidade atual
        if (!responseSalas.ok) {
            throw new Error('Erro ao carregar salas'); // Lança erro se a requisição falhar
        }
        
        // Limpa o select de salas antes de preencher
        const salaSelect = document.getElementById('id_sala');
        salaSelect.innerHTML = ''; 

        // Adiciona a opção padrão "Selecionar Sala"
        const defaultOption = document.createElement('option');
        defaultOption.value = ''; // Valor vazio
        defaultOption.textContent = 'Selecionar Sala'; // Texto da opção
        defaultOption.disabled = true; // Sem opção de seleção
        defaultOption.selected = true; // Selecionado por padrão
        salaSelect.appendChild(defaultOption);    

        const salas = await responseSalas.json(); // Processa a resposta JSON
        
        // Ordenando as salas por nome
        salas.sort((a, b) => a.nome_sala.localeCompare(b.nome_sala)); // Ordena alfabética

        salas.forEach(sala => {
            const option = document.createElement('option');
            option.value = sala.id_sala; // Define o ID da sala como valor da opção
            option.textContent = sala.nome_sala; // Define o nome da sala como texto da opção
            salaSelect.appendChild(option); // Adiciona a opção ao select
        });

        // Carregar professores para a nova unidade
       // await carregarProfessoresPorUnidade(codigoUnidade); // Chama a função para carregar professores da unidade
    } catch (error) {
        console.error('Erro ao carregar salas e professores:', error); // Loga erro se houver
    }
}

// Carregar apenas a unidade do professor logado
async function carregarUnidadesDoProfessor() {
    try {
        const response = await fetch('/user-info'); // Pega as informações do usuário logado
        if (!response.ok) {
            throw new Error('Erro ao carregar unidade do professor');
        }
        const userInfo = await response.json();

        const unidadeSelect = document.getElementById('codigo_unidade');
        unidadeSelect.innerHTML = ''; // Limpa o select antes de preencher

        // Adicionando opções somente para as unidades associadas ao usuário logado
        if (userInfo.unidades && userInfo.unidades.length > 0) {
            userInfo.unidades.forEach(codigoUnidade => {
                const option = document.createElement('option');
                option.value = codigoUnidade;
                option.textContent = codigoUnidade; // Ou algum texto descritivo da unidade
                unidadeSelect.appendChild(option); 
            });
        } else {
            unidadeSelect.innerHTML = `<option disabled selected>Não há unidades associadas</option>`;
        }

        // Exibir o nome do colaborador (coordenador)
        const professorSelect = document.getElementById('id_professor');
        professorSelect.innerHTML = ''; // Limpa o select antes de preencher

        const option = document.createElement('option');
        option.value = userInfo.id_professor;  // O ID do professor logado
        option.textContent = userInfo.nome;     // O nome do professor logado
        option.selected = true; // Marque como selecionado
        professorSelect.appendChild(option);  

        // Se houver pelo menos uma unidade, carrega os tipos de aula e salas
        if (userInfo.unidades.length > 0) {
            await carregarTiposAulaPorUnidade(userInfo.unidades[0]); // Carregando para a primeira unidade
            await carregarSalasProfessoresPorUnidade(userInfo.unidades[0]);
        }
    } catch (error) {
        console.error('Erro ao carregar unidade:', error);
    }
}
/*
// Carregar apenas a unidade do professor logado
async function carregarUnidadesDoProfessor() {
    try {
        const response = await fetch('/user-info'); // Pega as informações do usuário logado
        if (!response.ok) {
            throw new Error('Erro ao carregar unidade do professor');
        }
        const userInfo = await response.json();

        const unidadeSelect = document.getElementById('codigo_unidade');
        unidadeSelect.innerHTML = ''; // Limpa o select antes de preencher

        // Adiciona opções para cada unidade associada
        if (userInfo.unidades && userInfo.unidades.length > 0) {
            userInfo.unidades.forEach(codigoUnidade => {
                const option = document.createElement('option');
                option.value = codigoUnidade;
                option.textContent = codigoUnidade; // Ou algum texto descritivo da unidade
                unidadeSelect.appendChild(option); 
            });
        } else {
            unidadeSelect.innerHTML = `<option disabled selected>Não há unidades associadas</option>`;
        }

        // Se houver pelo menos uma unidade, carrega os tipos de aula
        if (userInfo.unidades.length > 0) {
            await carregarTiposAulaPorUnidade(userInfo.unidades[0]); // Carregando para a primeira unidade
            await carregarSalasProfessoresPorUnidade(userInfo.unidades[0]); // Chama também para carregar as salas
        }
    } catch (error) {
        console.error('Erro ao carregar unidade:', error);
    }
}

*/
/*
async function agendarSala(event) {
    event.preventDefault(); // Previne o envio do formulário

    const idSala = document.getElementById('id_sala').value; // Obtém o ID da sala selecionada
    const idProfessor = document.getElementById('id_professor').value; // Obtém o ID do professor selecionado
    const tipoAulaSelect = document.getElementById('id_tipo_aula'); // Obter a descrição do tipo de aula
    const tipoAulaDescricao = tipoAulaSelect.options[tipoAulaSelect.selectedIndex].textContent; 

    // Log para verificar os valores
    console.log('ID do professor selecionado:', idProfessor);
    
    // Validar se o idProfessor é válido
    if (!idProfessor || isNaN(idProfessor)) {
        alert('ID do professor é inválido.');
        return;
    }

    const datasSelecionadas = document.getElementById('data_selecionada').value.split(',').map(date => date.trim());
    const horaInicio = document.getElementById('hora_inicio').value; // Obtém a hora de início
    const horaFim = document.getElementById('hora_fim').value; // Obtém a hora de fim
    const motivo = document.getElementById('motivo').value; // Obtém o motivo

    const agora = new Date(); // Obtém a data atual
    const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number); // Divide a hora de início
    const [horaFimH, horaFimM] = horaFim.split(':').map(Number); // Divide a hora de fim

    // Verificações de data e hora
    for (const data of datasSelecionadas) {
        const [ano, mes, dia] = data.split('-').map(Number);
        const dataSelecionada = new Date(ano, mes - 1, dia, horaInicioH, horaInicioM); // Cria um novo objeto Date com a data e a hora

        if (dataSelecionada < agora) {
            alert(`A data ${data} e horário já passaram. Não é possível agendar.`);
            return; // Se a data já passou, não permite agendamento
        }

        // Validação do horário
        if (horaInicioH > horaFimH || (horaInicioH === horaFimH && horaInicioM >= horaFimM)) {
            alert('A hora de início deve ser anterior à hora de fim.');
            return; // Garantir que o horário início é anterior ao de fim
        }
    }

    const agendamentoData = {
        id_sala: idSala,
        id_professor: idProfessor,
        tipo_aula: tipoAulaDescricao, 
        data_reservas: datasSelecionadas, 
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        motivo // Armazena o motivo da reserva
    };

    console.log('Dados do agendamento:', agendamentoData); // Registra os dados do agendamento.

    // Requisição POST para agendar a sala
    try {
        const response = await fetch('/agendar-sala', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agendamentoData) // Envia os dados do agendamento
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao agendar sala:', errorText);
            alert(`${errorText}`);
            return; // Se houver erro, exiba uma mensagem
        }

        alert('Sala agendada com sucesso!'); // Confirmação de agendamento
        document.getElementById('agendamentoForm').reset(); // Reseta o formulário após o agendamento
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao agendar sala. Por favor, tente novamente.'); // Mensagem de erro genérica
    }
}
*/
async function agendarSala(event) {
    event.preventDefault(); // Previne o envio do formulário

    const idSala = document.getElementById('id_sala').value; // Obtém o ID da sala selecionada
    const idProfessor = document.getElementById('id_professor').value; // Obtém o ID do professor selecionado
    const tipoAulaSelect = document.getElementById('id_tipo_aula'); // Obter a descrição do tipo de aula
    const tipoAulaDescricao = tipoAulaSelect.options[tipoAulaSelect.selectedIndex].textContent; 

    // Valida se uma unidade curricular (tipo de aula) foi selecionada
    if (!tipoAulaSelect.value) {
        alert('Por favor, selecione uma unidade curricular antes de agendar.');
        return; // Interrompe o agendamento se a unidade não for selecionada
    }

    // Valida se uma sala foi selecionada
    if (!idSala) {
        alert('Por favor, selecione uma sala antes de agendar.');
        return; // Interrompe o agendamento se a sala não for selecionada
    }

    // Log para verificar os valores
    console.log('ID do professor selecionado:', idProfessor);
    
    // Validar se o idProfessor é válido
    if (!idProfessor || isNaN(idProfessor)) {
        alert('ID do professor é inválido.');
        return;
    }

    // Obtendo as datas selecionadas do campo atualizado
    const datasSelecionadas = document.getElementById('data_selecionada').value.split(',').map(date => date.trim());
    const horaInicio = document.getElementById('hora_inicio').value; // Obtém a hora de início
    const horaFim = document.getElementById('hora_fim').value; // Obtém a hora de fim
    const motivo = document.getElementById('motivo').value; // Obtém o motivo

    const agora = new Date(); // Obtém a data atual
    const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number); // Divide a hora de início
    const [horaFimH, horaFimM] = horaFim.split(':').map(Number); // Divide a hora de fim

    // Verificações de data e hora
    for (const data of datasSelecionadas) {
        // Converte a data no formato DD/MM/YYYY para ano/mês/dia
        const [dia, mes, ano] = data.split('/').map(Number); 
        const dataSelecionada = new Date(ano, mes - 1, dia, horaInicioH, horaInicioM); // Cria um novo objeto Date

        if (dataSelecionada < agora) {
            alert(`A data ${data} e horário já passaram. Não é possível agendar.`);
            return; // Se a data já passou, não permite agendamento
        }

        // Validação do horário
        if (horaInicioH > horaFimH || (horaInicioH === horaFimH && horaInicioM >= horaFimM)) {
            alert('A hora de início deve ser anterior à hora de fim.');
            return; // Garantir que o horário de início é anterior ao de fim
        }
    }

    // Converte datas para o formato YYYY-MM-DD para o banco de dados
    const datasParaBanco = datasSelecionadas.map(data => {
        const [dia, mes, ano] = data.split('/').map(Number); // Assume formato DD/MM/YYYY
        return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`; // Formatação correta
    });

    const agendamentoData = {
        id_sala: idSala,
        id_professor: idProfessor,
        tipo_aula: tipoAulaDescricao, 
        data_reservas: datasParaBanco, // Passa as datas no formato correto para o banco
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        motivo // Armazena o motivo da reserva
    };

    console.log('Dados do agendamento:', agendamentoData); // Registra os dados do agendamento.

    // Requisição POST para agendar a sala
    try {
        const response = await fetch('/agendar-sala', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agendamentoData) // Envia os dados do agendamento
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao agendar sala:', errorText);
            alert(`${errorText}`);
            return; // Se houver erro, exiba uma mensagem
        }

        alert('Sala agendada com sucesso!'); // Confirmação de agendamento
        
        // Limpar os selects de sala e unidade curricular
        document.getElementById('id_sala').value = ''; // Limpa a sala selecionada
        tipoAulaSelect.value = ''; // Limpa a unidade curricular selecionada
        document.getElementById('data_selecionada').value = ''; // Limpa as datas selecionadas
        
        document.getElementById('agendamentoForm').reset(); // Reseta o formulário (se necessário)
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao agendar sala. Por favor, tente novamente.'); // Mensagem de erro genérica
    }
}



// Adicionar os eventos de mudança aos campos de data
document.getElementById('data_inicio').addEventListener('change', atualizarDatasSelecionadas);
document.getElementById('data_fim').addEventListener('change', atualizarDatasSelecionadas);
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', atualizarDatasSelecionadas);
});

/*
// Função para atualizar o campo de "Datas Selecionadas"
function atualizarDatasSelecionadas() {
    const dataInicio = document.getElementById('data_inicio').value; // Obtém a data de início
    const dataFim = document.getElementById('data_fim').value; // Obtém a data de fim
    const diasSelecionados = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => parseInt(checkbox.value)); // Coleta os dias da semana selecionados

    // Verifica se as datas de início e fim estão preenchidas
    if (dataInicio && dataFim) {
        const datasReservas = obterDatasPorDiasDaSemana(dataInicio, dataFim, diasSelecionados); // Obtém as datas correspondentes
        
        // Formata as datas para 'DD/MM/YYYY'
        const datasFormatadas = datasReservas.map(data => {
            const partes = data.split('-');
            return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formato DD/MM/YYYY
        });

        // Atualiza o campo de texto com as datas formatadas
        document.getElementById('data_selecionada').value = datasFormatadas.join(', '); // Preenche as datas selecionadas na entrada
    } else {
        document.getElementById('data_selecionada').value = ''; // Limpa se as datas não estiverem preenchidas
    }
}
*/
// Função para atualizar o campo de "Datas Selecionadas"

function atualizarDatasSelecionadas() {
    const dataInicio = document.getElementById('data_inicio').value; // Obtém a data de início
    const dataFim = document.getElementById('data_fim').value; // Obtém a data de fim
    const diasSelecionados = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.value) + 1); // Mapeamento de valor para [1-7]

    // Agora, ajustaremos para garantir que Domingo começando em 1
    const diasMapeados = diasSelecionados.map(d => d === 1 ? 0 : d - 1); // Ajusta para que domingo (1) mapeie para 0 e os demais
    console.log('Data de Início:', dataInicio);
    console.log('Data de Fim:', dataFim);
    console.log('Dias Selecionados:', diasMapeados);

    // Utiliza o Luxon para obter as datas
    if (dataInicio && dataFim) {
        const datasReservas = obterDatasPorDiasDaSemana(dataInicio, dataFim, diasMapeados); // Obtém as datas correspondentes

        const datasFormatadas = datasReservas.map(data => {
            const partes = data.split('-');
            return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formato DD/MM/YYYY
        });

        document.getElementById('data_selecionada').value = datasFormatadas.join(', '); // Atualiza o campo de texto

    } else {
        document.getElementById('data_selecionada').value = ''; // Limpa se as datas não estiverem preenchidas
    }
}

function atualizarContagemDias(datasReservas, diasSelecionados) {
    const contadorDias = {};

    // Inicializa o contador para cada dia da semana selecionada.
    for (const dia of diasSelecionados) {
        contadorDias[dia] = 0; // Cria uma entrada para cada dia da semana que vai contar
    }

    console.log('Datas Reservadas:', datasReservas);
    console.log('Dias Selecionados:', diasSelecionados);

    // Contagem das datas geradas
    datasReservas.forEach(data => {
        const date = new Date(data); // Converte para um objeto Date
        const diaDaSemana = date.getDay(); // 0 = Domingo, 1 = Segunda, ...

        // Aplicar o novo mapeamento dos dias:
        const diaMapeado = (diaDaSemana + 1); // Aqui o mapeamento correto de 0 a 6 vai para 1 a 7

        console.log(`Data: ${data}, Dia da Semana Calculado: ${diaMapeado}`);

        // Verifica se o dia mapeado está entre os dias selecionados
        if (diasSelecionados.includes(diaMapeado)) {
            contadorDias[diaMapeado]++; // Incrementa o contador para aquele dia
            console.log(`Contador Atual para ${diaMapeado}: ${contadorDias[diaMapeado]}`);
        }
    });

    // Preparar a string para resultado
    let resultado = [];
    for (let dia in contadorDias) {
        if (contadorDias[dia] > 0) {
            const nomeDia = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dia - 1]; // Ajustar índice
            resultado.push(`${contadorDias[dia]} ${nomeDia}${contadorDias[dia] > 1 ? 's' : ''}`); // Singular ou plural
        }
    }

    // Atualiza a contagem no parágrafo
    document.getElementById('contadorDias').innerHTML = resultado.join(', ') || 'Nenhum dia da semana selecionado.';
}




function obterDiasMapeados(dia) {
    return dia === 0 ? 1 : dia + 1; // Se for Domingo (0), retorna 1, caso contrário, soma 1
}
const { DateTime } = luxon; // Certifique-se de que luxon está carregado

function obterDatasPorDiasDaSemana(dataInicio, dataFim, diasSelecionados) {
    const datasReservas = [];
    const inicio = DateTime.fromISO(dataInicio).startOf('day');
    const fim = DateTime.fromISO(dataFim).startOf('day');

    console.log('Data de Início:', inicio.toISO());
    console.log('Data de Fim:', fim.toISO());

    // Loop para verificar as datas entre início e fim (inclusive)
    for (let d = inicio; d <= fim; d = d.plus({ days: 1 })) {
        const diaDaSemana = d.weekday; // Luxon já fornece 1 (segunda) a 7 (domingo)
        console.log(`Verificando data: ${d.toISODate()}, Dia da Semana: ${diaDaSemana}`);

        // Verifica se o dia da semana está entre os selecionados
        if (diasSelecionados.includes(diaDaSemana)) {
            const dataISO = d.toISODate(); // Formato YYYY-MM-DD
            if (!datasReservas.includes(dataISO)) {
                datasReservas.push(dataISO); // Adiciona ao array se não estiver presente
            }
        }
    }

    console.log('Datas Reservadas:', datasReservas);
    return datasReservas; // Retorna as datas reservadas
}



/*
// Função para obter datas com base em dias da semana e intervalo
function obterDatasPorDiasDaSemana(dataInicio, dataFim, diasSelecionados) {
    const datasReservas = [];
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Zera as horas, minutos, segundos e milissegundos
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);

    // Começar a partir da data de início
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaDaSemana = d.getDay(); // Obtém o dia da semana da data atual
        // Se o dia da semana está incluído e a data atual é igual ou superior à data de início
        if (diasSelecionados.includes(diaDaSemana)) {
            datasReservas.push(d.toISOString().split('T')[0]); // Adiciona a data ao array
        }
    }

    return datasReservas; // Retorna todas as datas que correspondem
}
//codigo antigo */
/*  // ESTE CODIGO ABAIXO FUNCIONA
function obterDatasPorDiasDaSemana(dataInicio, dataFim, diasSelecionados) {
    const datasReservas = [];
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Zerando horas, minutos, segundos e milissegundos
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);

    // Iniciando a partir da data de início
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaDaSemana = d.getDay(); // Obtém o dia da semana

        // Verifica se o dia da semana está selecionado e se a data é igual ou maior que data de início
        if (diasSelecionados.includes(diaDaSemana)) {
            // Se a data está dentro do intervalo e maior ou igual à data de início
            if (d >= inicio) {
                datasReservas.push(d.toISOString().split('T')[0]); // Adiciona a data ao array
            }
        }
    }

    // Remove as datas que são anteriores a data de início
    return datasReservas.filter(data => new Date(data) >= inicio);
}
*/

// Função para verificar agendamentos existentes
async function verificarAgendamentosExistentes(agendamentoData) {
    let conflitos = []; 

    for (let data of agendamentoData.data_reservas) {
        const partes = data.split('/').map(Number); // Assume o formato DD/MM/YYYY
        const dataFormatada = new Date(partes[2], partes[1] - 1, partes[0]); // Cria a data correspondente (ano, mes-1, dia)

        if (isNaN(dataFormatada)) {
            console.error('Data inválida:', data);
            continue; 
        }

        const dataFinal = dataFormatada.toISOString().split('T')[0]; // Formata para YYYY-MM-DD

        const resposta = await fetch(`/verificar-agendamento/${agendamentoData.id_sala}/${dataFinal}/${agendamentoData.hora_inicio}/${agendamentoData.hora_fim}`);

        if (resposta.ok) {
            const resultado = await resposta.json();
            if (resultado.existe) {
                conflitos.push(...resultado.agendamentos);
            }
        }
    }

    return conflitos;
}


// Adiciona o evento de submit ao formulário
document.getElementById('agendamentoForm').addEventListener('submit', agendarSala);

// Inicializa o carregamento das unidades
carregarUnidadesDoProfessor(); // Chama a função para carregar apenas a unidade do professor logado

// Verificar conflitos ao clicar
document.getElementById('verificarAgendamentos').addEventListener('click', async () => {
    const datasSelecionadas = document.getElementById('data_selecionada').value.split(',').map(date => date.trim());
    const idSala = document.getElementById('id_sala').value;
    const horaInicio = document.getElementById('hora_inicio').value;
    const horaFim = document.getElementById('hora_fim').value;

    // Formatar horas
    const horaInicioFormatada = formatarHora(horaInicio);
    const horaFimFormatada = formatarHora(horaFim);

    // Log das horas formatadas
    console.log('Hora de Início formatada:', horaInicioFormatada);
    console.log('Hora de Fim formatada:', horaFimFormatada);

    const conflitos = await verificarAgendamentosExistentes({
        id_sala: idSala, // Certifique-se de que está aqui
        data_reservas: datasSelecionadas,
        hora_inicio: horaInicioFormatada,
        hora_fim: horaFimFormatada
    });

    // Exibir resultados
    const resultadoDiv = document.getElementById('resultadoVerificacao');
    resultadoDiv.innerHTML = ''; // Limpa resultados anteriores

    if (conflitos.length > 0) {
        resultadoDiv.innerHTML = `<p>Conflitos encontrados nas seguintes datas/horários:</p><ul>`;
        conflitos.forEach(conflito => {
            // Aqui você deve acessar o nome do professor diretamente do objeto 'conflito'
            const partesData = conflito.data_reservas.split('-'); 
            const dataFormatada = `${partesData[2]}-${partesData[1]}-${partesData[0]}`; 

            // Exiba os horários corretos do agendamento existente
            resultadoDiv.innerHTML += `<li>Data: ${dataFormatada}, de ${conflito.hora_inicio} a ${conflito.hora_fim} | Agendado por: ${conflito.nome_professor}</li>`;
        });

        resultadoDiv.innerHTML += '</ul>';
    } else {
        resultadoDiv.innerHTML = '<p>Não há conflitos para as datas e horários selecionados.</p>';
    }
});
// Verificar salas disponíveis
document.getElementById('verificarSalas').addEventListener('click', async () => {
    // Coleta as datas do campo "Datas Selecionadas"
    const datasSelecionadas = document.getElementById('data_selecionada').value.split(',').map(date => date.trim());
    const horaInicio = document.getElementById('hora_inicio').value;
    const horaFim = document.getElementById('hora_fim').value;
    const codigoUnidade = document.getElementById('codigo_unidade').value; 

    // Validar entradas antes da requisição
    if (!datasSelecionadas.length || !horaInicio || !horaFim || !codigoUnidade) {
        alert('Por favor, preencha as datas, horas e selecione a unidade.');
        return;
    }

    // Converte as datas para o formato YYYY-MM-DD
    const datasParaBanco = datasSelecionadas.map(data => {
        const [dia, mes, ano] = data.split('/').map(Number); // Divide o formato DD/MM/YYYY
        return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`; // Formato YYYY-MM-DD
    });

    // Fazer requisição para verificar salas disponíveis
    const resposta = await fetch(`/salas-disponiveis?data=${datasParaBanco.join(',')}&hora_inicio=${horaInicio}&hora_fim=${horaFim}&codigo_unidade=${codigoUnidade}`);

    if (!resposta.ok) {
        const errorText = await resposta.text();
        console.error(`Erro ao buscar salas: ${errorText}`);
        alert(`Erro: ${resposta.status} - ${errorText}`);
        return;
    }

    const resultado = await resposta.json();

    // Limpando os resultados anteriores
    const resultadoDiv = document.getElementById('resultadoSalasDisponiveis');
    resultadoDiv.innerHTML = '';

    // Exibir salas disponíveis
    if (resultado.salasDisponiveis && resultado.salasDisponiveis.length > 0) {
        resultadoDiv.innerHTML = `<h3>Salas Disponíveis:</h3><ul>`;
        resultado.salasDisponiveis.forEach(sala => {
            // Aqui vamos garantir que as datas foram corretamente formatadas
            const datasFormatadas = sala.datas_disponiveis.map(data => formatarData(data)); // Formata as datas para exibição

            // Adiciona a opção de sala com dados para o clique
            resultadoDiv.innerHTML += `<li class="sala-item" data-id="${sala.id_sala}" data-datas="${datasFormatadas.join(', ')}">
                ${sala.nome_sala} - disponível nas datas:
                <span class="datas">${datasFormatadas.join(', ')}</span>
            </li>`;
        });
        resultadoDiv.innerHTML += `</ul>`;
    } else {
        resultadoDiv.innerHTML = '<p>Não há salas disponíveis para as datas e horários selecionados.</p>';
    }

    // Adicionar evento de clique para as salas disponíveis
    const salaItems = document.querySelectorAll('.sala-item');

    salaItems.forEach(item => {
        item.addEventListener('click', () => {
            const idSala = item.getAttribute('data-id'); // Obtém o ID da sala clicada
            const datas = item.getAttribute('data-datas'); // Obtém as datas disponíveis

            document.getElementById('id_sala').value = idSala; // Preenche o campo da sala
            document.getElementById('data_selecionada').value = datas; // Preenche o campo das datas selecionadas
        });
    });
});

// Função para formatar a data de YYYY-MM-DD para DD/MM/YYYY
function formatarData(data) {
    const partes = data.split('-'); // Divide a string em partes
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Retorna o formato DD/MM/YYYY
}


// Função para formatar a data de YYYY-MM-DD para DD/MM/YYYY
function formatarData(data) {
    const partes = data.split('-'); // Divide a string em partes
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Retorna o formato DD/MM/YYYY
}



// Função para formatar a data de YYYY-MM-DD para DD-MM-YYYY
function formatarData(data) {
    const partes = data.split('-'); // Divide a string em partes
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Retorna o formato DD-MM-YYYY
}


// Função para ordenar datas
function ordenarDatas(datas) {
    return datas.sort((a, b) => new Date(a) - new Date(b));
}
function formatarHora(hora) {
    const [h, m] = hora.split(':');
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`; // Adiciona ':00' para os segundos
}



// Função para validar se a hora está no formato correto
function isValidTime(time) {
    const timePattern = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; 
    return timePattern.test(time);
}




// Função para excluir um agendamento
async function excluirAgendamento(id, elemento) {
    console.log('ID do Agendamento:', id);
    console.log('Elemento:', elemento); // Verifica qual elemento está sendo passado

    // Confirmação antes da exclusão
    const confirmar = confirm('Tem certeza que deseja excluir este agendamento?');
    if (!confirmar) {
        return; // Se o usuário negar, apenas retorna
    }

    try {
        const response = await fetch(`/excluir-agendamento/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Agendamento excluído com sucesso!'); // Alerta de confirmação
            // Aqui vamos recarregar a lista de agendamentos
            await carregarAgendamentos(); // Carrega novamente os agendamentos
        } else {
            alert('Erro ao excluir agendamento.');
        }
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        alert('Erro ao excluir agendamento. Tente novamente.'); // Mensagem de erro
    }
}
// Função para carregar e exibir agendamentos
async function carregarAgendamentos() {
    const response = await fetch('/listar-agendamentos-professor-logado');

    // Verifique se a resposta é OK
    if (!response.ok) {
        const errorText = await response.text();
        alert('Erro ao carregar agendamentos: ' + errorText);
        return;
    }

    // Processar a resposta
    agendamentosAtual = await response.json(); // Salva os agendamentos na variável global

    // Obtém a data e hora atuais
    const agora = new Date();
    // Define "agora" para 00:01 do dia atual
    agora.setHours(0, 1, 0, 0);

    console.log('Data e hora de referência (meia-noite e um minuto):', agora);

    // Filtrar apenas agendamentos que são do presente ou futuros
    agendamentosAtual = agendamentosAtual.filter(agendamento => {
        const dataAgendamento = new Date(agendamento.data_reservas + 'T' + agendamento.hora_inicio);
        console.log('Verificando agendamento:', dataAgendamento, 'com data/horário de referência:', agora);
        return dataAgendamento >= agora; // Retorna apenas agendamentos no presente ou no futuro
    });

    // Ordena os agendamentos por data e hora.
    agendamentosAtual.sort((a, b) => {
        const dataA = new Date(a.data_reservas + 'T' + a.hora_inicio); // Combina data e hora
        const dataB = new Date(b.data_reservas + 'T' + b.hora_inicio);
        return dataA - dataB; // Ordena de forma crescente
    });

    // Exibe a quantidade de agendamentos encontrados
    console.log('Agendamentos futuros:', agendamentosAtual);

    paginaAtual = 0; // Reseta a página atual
    exibirAgendamentos(); // Chama a função para mostrar os agendamentos
}



// Altere o filtro para incluir ordenação
// Evento ao clicar no botão "Aplicar Filtros"
document.getElementById('aplicarFiltros').addEventListener('click', async () => {
    const salaFiltro = document.getElementById('filtroSala').value.toLowerCase();
    const dataInicioFiltro = document.getElementById('filtroDataInicio').value; 
    const dataFimFiltro = document.getElementById('filtroDataFim').value; 
    const turnoFiltro = document.getElementById('filtroTurno').value; 
    const diaSemanaFiltro = document.getElementById('filtroDiaSemana').value;

    const response = await fetch('/listar-agendamentos-professor-logado');
    if (!response.ok) {
        const errorText = await response.text();
        alert('Erro ao carregar agendamentos: ' + errorText);
        return;
    }

    const agendamentos = await response.json();
    const agendamentosList = document.getElementById('agendamentosExistentes');
    agendamentosList.innerHTML = ''; // Limpa a lista anterior

    const agendamentosFiltrados = agendamentos.filter(agendamento => {
        const salaAgendamento = agendamento.nome_sala.toLowerCase();
        const dataAgendamento = new Date(agendamento.data_reservas).toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const diaDaSemanaAgendamento = new Date(agendamento.data_reservas).getDay(); // 0=Domingo, 1=Segunda, ...

        const correspondeSala = salaFiltro ? salaAgendamento.includes(salaFiltro) : true;
        const correspondeDataInicio = dataInicioFiltro ? dataAgendamento >= dataInicioFiltro : true;
        const correspondeDataFim = dataFimFiltro ? dataAgendamento <= dataFimFiltro : true;

        // Lógica para verificar se o agendamento se encaixa no turno selecionado
        let correspondeTurno = true;
        if (turnoFiltro) {
            if (turnoFiltro === 'manha') {
                correspondeTurno = agendamento.hora_inicio >= '06:00' && agendamento.hora_fim <= '12:15';
            } else if (turnoFiltro === 'tarde') {
                correspondeTurno = agendamento.hora_inicio >= '12:15' && agendamento.hora_fim <= '17:15';
            } else if (turnoFiltro === 'noite') {
                correspondeTurno = agendamento.hora_inicio >= '17:15' && agendamento.hora_fim <= '23:59';
            }
        }

        // Verificação para o dia da semana
        const correspondeDiaSemana = diaSemanaFiltro ? diaDaSemanaAgendamento.toString() === diaSemanaFiltro : true;

        return correspondeSala && correspondeDataInicio && correspondeDataFim && correspondeTurno && correspondeDiaSemana;
    });

    // Exibir os agendamentos filtrados
    if (agendamentosFiltrados.length === 0) {
        agendamentosList.textContent = 'Nenhum agendamento encontrado com os filtros aplicados.';
    } else {
        agendamentosFiltrados.forEach(agendamento => {
            const agendamentoItem = document.createElement('div');
            agendamentoItem.className = 'agendamento-item'; // Adiciona uma classe para fácil seleção
            agendamentoItem.innerHTML = `
                <p><strong>Sala:</strong> ${agendamento.nome_sala}</p>
                <p><strong>Data:</strong> ${formatarData(agendamento.data_reservas)}</p>
                <p><strong>Início:</strong> ${formatarHora(agendamento.hora_inicio)}</p>
                <p><strong>Fim:</strong> ${formatarHora(agendamento.hora_fim)}</p>
                <p><strong>Motivo:</strong> ${agendamento.motivo || 'Nenhum motivo fornecido'}</p>
                <button onclick="excluirAgendamento(${agendamento.id_agendamento}, this.closest('.agendamento-item'))">Excluir</button>
                <hr>
            `;
            agendamentosList.appendChild(agendamentoItem);
        });
    }

    // Armazena os agendamentos filtrados
    agendamentosAtual = agendamentosFiltrados; 
    paginaAtual = 0; 
    exibirAgendamentos(); 
});


flatpickr("#filtroData", {
    mode: "multiple", // Permite a seleção de várias datas
    dateFormat: "Y-m-d", // Formato de entrada
    locale: "pt", // Definindo o idioma
    onClose: function(selectedDates) {
        const formataData = selectedDates.map(date => date.toISOString().split('T')[0]).join(', ');
        document.getElementById('filtroData').value = formataData; // Atualiza o valor do input
    }
});


// Permitir que o usuário pressione "Enter" para aplicar os filtros
document.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        document.getElementById('aplicarFiltros').click();
    }
});
// Variáveis globais para controlar a exibição de agendamentos
let agendamentosAtual = []; // Array para armazenar os agendamentos filtrados
let paginaAtual = 0; // Variável para controlar a página atual
const itensPorPagina = 8; // Número de itens que você deseja mostrar por página (8 para 2 linhas de 4)



// Função para exibir os agendamentos
function exibirAgendamentos() {
    const agendamentosList = document.getElementById('agendamentosExistentes');
    agendamentosList.innerHTML = ''; // Limpa o conteúdo anterior
    const inicio = paginaAtual * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const agendamentosParaExibir = agendamentosAtual.slice(inicio, fim);

    // Começar a criar a tabela
    const tabela = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th scope="col">Selecionar</th>
                    <th scope="col">Sala</th>
                    <th scope="col">Data</th>
                    <th scope="col">Início</th>
                    <th scope="col">Fim</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${agendamentosParaExibir.length === 0 ? '<tr><td colspan="7" class="text-center">Nenhum agendamento encontrado.</td></tr>' : ''}
                ${agendamentosParaExibir.map(agendamento => `
                    <tr>
                        <td><input type="checkbox" class="agendamento-checkbox" data-id="${agendamento.id_agendamento}"></td>
                        <td>${agendamento.nome_sala}</td>
                        <td>${formatarData(agendamento.data_reservas)}</td>
                        <td>${formatarHora(agendamento.hora_inicio)}</td>
                        <td>${formatarHora(agendamento.hora_fim)}</td>
                        <td>${agendamento.motivo || 'Nenhum motivo fornecido'}</td>
                        <td>
                            <button class="btn btn-danger" onclick="excluirAgendamento(${agendamento.id_agendamento}, this.closest('tr'))">Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    agendamentosList.innerHTML = tabela; // Preenche a lista com a tabela

    // Adiciona eventos aos checkboxes
    document.querySelectorAll('.agendamento-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', atualizarBotaoExcluir);
    });

    // Atualizar a visibilidade do botão de excluir selecionados
    atualizarBotaoExcluir();

    // Controle da exibição dos botões de navegação
    document.getElementById('botaoAnterior').style.display = paginaAtual > 0 ? 'block' : 'none';
    document.getElementById('botaoProximo').style.display = (paginaAtual + 1) * itensPorPagina < agendamentosAtual.length ? 'block' : 'none';
}



// Evento ao clicar no botão "Ver meus Agendamentos"
document.getElementById('verMeusAgendamentos').addEventListener('click', async () => {
    const response = await fetch('/listar-agendamentos-professor-logado');
    
    // Verifique se a resposta é OK
    if (!response.ok) {
        const errorText = await response.text();
        alert('Erro ao carregar agendamentos: ' + errorText);
        return;
    }

    const agendamentos = await response.json();
    
    // Armazenar os agendamentos na variável global
    agendamentosAtual = agendamentos; 

    // Ordena os agendamentos por data e hora
    agendamentosAtual.sort((a, b) => {
        const dataA = new Date(a.data_reservas + 'T' + a.hora_inicio);
        const dataB = new Date(b.data_reservas + 'T' + b.hora_inicio);
        return dataA - dataB;
    });

    // Resetar a página atual
    paginaAtual = 0; 

    // Exibir os agendamentos
    exibirAgendamentos(); 
});

// Funções de navegação
document.getElementById('botaoProximo').addEventListener('click', () => {
    paginaAtual++;
    exibirAgendamentos();
});

document.getElementById('botaoAnterior').addEventListener('click', () => {
    paginaAtual--;
    exibirAgendamentos();
});
async function excluirSelecionados() {
    const checkboxes = document.querySelectorAll('.agendamento-checkbox:checked');
    const idsParaExcluir = Array.from(checkboxes).map(checkbox => checkbox.dataset.id);
    console.log('IDs a serem excluídos:', idsParaExcluir); // Verifica os IDs a serem excluídos
    if (idsParaExcluir.length === 0) {
        alert('Nenhum agendamento selecionado para excluir.'); // Mensagem se nenhum checkbox estiver marcado
        return;
    }

    const confirmar = confirm('Tem certeza que deseja excluir os agendamentos selecionados?');
    if (!confirmar) return;

    try {
        await Promise.all(idsParaExcluir.map(id => {
            return fetch(`/excluir-agendamento/${id}`, {
                method: 'DELETE'
            });
        }));

        alert('Agendamentos excluídos com sucesso!'); // Mensagem de sucesso
        await carregarAgendamentos(); // Recarrega a lista de agendamentos após a exclusão
    } catch (error) {
        console.error('Erro ao excluir agendamentos:', error);
        alert('Erro ao excluir os agendamentos. Tente novamente.'); // Mensagem de erro
    }
}
// Adiciona eventos aos checkboxes
document.querySelectorAll('.agendamento-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', atualizarBotaoExcluir);
});

// Função para atualizar a visibilidade do botão de excluir selecionados
function atualizarBotaoExcluir() {
    const checkboxes = document.querySelectorAll('.agendamento-checkbox');
    const algumSelecionado = Array.from(checkboxes).some(checkbox => checkbox.checked);
    const excluirButton = document.getElementById('botaoExcluirSelecionados');
    excluirButton.style.display = algumSelecionado ? 'block' : 'none'; // Mostra ou oculta o botão
}

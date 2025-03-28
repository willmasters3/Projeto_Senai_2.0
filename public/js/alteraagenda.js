// Função para carregar informações do usuário
async function carregarInfoUsuario() {
    try {
        const response = await fetch('/user-info');
        if (!response.ok) throw new Error('Erro ao carregar informações do usuário.');

        return await response.json();
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
        return null;
    }
}

// Função para carregar unidades, filtrando pela unidade do usuário
async function carregarUnidades() {
    const userInfo = await carregarInfoUsuario();
    
    if (!userInfo) {
        document.getElementById('resultadoAdicionar').innerHTML = 'Erro ao carregar unidades. Por favor, faça login novamente.';
        return;
    }

    try {
        const response = await fetch('/listar-unidades');
        if (!response.ok) throw new Error('Erro ao carregar unidades.');

        const unidades = await response.json();
        const unidadeSelect = document.getElementById('unidadeSelect');
        unidadeSelect.innerHTML = '<option value="">Selecione uma unidade</option>';

        unidades.forEach(unidade => {
            if (userInfo.unidades.includes(unidade.codigo)) {
                const option = document.createElement('option');
                option.value = unidade.codigo;
                option.textContent = unidade.nome;
                unidadeSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar as unidades:', error);
        alert('Erro ao carregar unidades.');
    }
}

// Função para formatar a data considerando o formato DD/MM/YYYY e hora HH:mm:ss
function formatarDataCompleta(data, hora) {
    const partesData = data.split('/');
    const dia = partesData[0].padStart(2, '0');
    const mes = partesData[1].padStart(2, '0');
    const ano = partesData[2];

    const dataFormatada = `${ano}-${mes}-${dia}T${hora}`;
    return new Date(dataFormatada);
}

// Função para aplicar filtros
async function aplicarFiltros() {
    const filtroProfessor = document.getElementById('filtroProfessor').value || '';
    const filtroDataInicio = document.getElementById('filtroDataInicio').value || '';
    const filtroDataFim = document.getElementById('filtroDataFim').value || '';
    const filtroSala = document.getElementById('filtroSala').value || '';
    const unidadeSelect = document.getElementById('unidadeSelect');
    const codigoUnidade = unidadeSelect.value;

    try {
        const response = await fetch(`/listar-agendamentos-filtrados?unidadeCodigo=${codigoUnidade}&professor=${filtroProfessor}&dataInicio=${filtroDataInicio}&dataFim=${filtroDataFim}&sala=${filtroSala}`);
        
        if (!response.ok) throw new Error('Erro ao carregar agendamentos filtrados');
        
        const agendamentos = await response.json();
        const agendamentosList = document.getElementById('agendamentosList');
        agendamentosList.innerHTML = '';

        if (agendamentos.length === 0) {
            agendamentosList.textContent = 'Nenhum agendamento encontrado com os critérios fornecidos.';
        } else {
            agendamentos.forEach(agendamento => {
                const agendamentoItem = document.createElement('div');
                agendamentoItem.classList.add('agendamento-item');
                agendamentoItem.dataset.agendamentoId = agendamento.id_agendamento;

                const salaNome = document.createElement('h3');
                salaNome.textContent = ` ${agendamento.nome_sala}`;
                agendamentoItem.appendChild(salaNome);

                const professorNome = document.createElement('p');
                professorNome.textContent = `Professor: ${agendamento.nome}`;
                agendamentoItem.appendChild(professorNome);

                const dataInicio = document.createElement('p');
                dataInicio.textContent = `Data de Início: ${formatarData(agendamento.data_reservas)}`;
                agendamentoItem.appendChild(dataInicio);

                const horaInicio = document.createElement('p');
                horaInicio.textContent = `Hora de Início: ${formatarHora(agendamento.hora_inicio)}`;
                agendamentoItem.appendChild(horaInicio);

                const dataFim = document.createElement('p');
                dataFim.textContent = `Data de Fim: ${formatarData(agendamento.data_reservas)}`;
                agendamentoItem.appendChild(dataFim);
                
                const horaFim = document.createElement('p');
                horaFim.textContent = `Hora de Fim: ${formatarHora(agendamento.hora_fim)}`;
                agendamentoItem.appendChild(horaFim);

                const tipo_aula = document.createElement('p');
                tipo_aula.textContent = `Tipo de Atividade/UC: ${agendamento.tipo_aula || 'Nenhuma aula fornecida'}`;
                agendamentoItem.appendChild(tipo_aula);
                
                const motivo = document.createElement('p');
                motivo.textContent = `Motivo/Turma: ${agendamento.motivo || 'Nenhum motivo fornecido'}`;
                agendamentoItem.appendChild(motivo);
                
                // Botão de excluir
                const excluirButton = document.createElement('button');
                excluirButton.textContent = 'Excluir';
                excluirButton.addEventListener('click', async () => {
                    const confirmacao = confirm('Deseja excluir este agendamento?');
                    if (confirmacao) {
                        await excluirAgendamento(agendamento.id_agendamento);
                        agendamentoItem.remove(); // Remove do DOM
                    }
                });

                // Botão de editar
                const editarButton = document.createElement('button');
                editarButton.textContent = 'Editar';
                editarButton.addEventListener('click', () => {
                    abrirModalEdicao(agendamento);
                });

                agendamentoItem.appendChild(excluirButton);
                agendamentoItem.appendChild(editarButton); // Adiciona o botão de editar
                agendamentosList.appendChild(agendamentoItem);
            });
        }
    } catch (error) {
        console.error(error);
        alert('Erro ao aplicar filtros.');
    }
}

// Função para abrir modal de edição
async function abrirModalEdicao(agendamento) {
    const modal = document.createElement('div');
    modal.classList.add('modal');

    // Obtem o código da unidade da propriedade do agendamento
    const unidadeSelect = document.getElementById('unidadeSelect'); // Obtendo o select da unidade
    const unidadeCodigo = unidadeSelect.value; // Pega o valor da seleção atual

    // Valida se a unidade está definida
    if (!unidadeCodigo) {
        console.error('Código da unidade não encontrado ao abrir o modal de edição.');
        alert('Erro: Nenhuma unidade selecionada.'); // Mensagem de erro
        return; // Retorna se nenhuma unidade foi selecionada
    }

    // Carregar os professores e tipos de atividade apenas da unidade selecionada
    const professores = await carregarProfessoresPorUnidade(unidadeCodigo);
    const tiposAtividade = await carregarTiposDeAtividadePorUnidade(unidadeCodigo);

    modal.innerHTML = `
        <div class="modal-content">
            <h3>Editar Agendamento</h3>
            <label for="novoProfessor">Professor:</label>
            <select id="novoProfessor">
                ${professores.map(professor => `
                    <option value="${professor.id_professor}" ${professor.nome === agendamento.nome ? 'selected' : ''}>${professor.nome}</option>
                `).join('')}
            </select>
            <label for="novoTipoAtividade">Tipo de Atividade:</label>
            <select id="novoTipoAtividade">
                ${tiposAtividade.map(tipo => `
                    <option value="${tipo.id_tipo_aula}" ${tipo.descricao === agendamento.tipo_aula ? 'selected' : ''}>${tipo.descricao}</option>
                `).join('')}
            </select>
            <label for="novoMotivo">Motivo:</label>
            <input type="text" id="novoMotivo" value="${agendamento.motivo || ''}">
            <button id="salvarEdicao">Salvar</button>
            <button id="fecharModal">Fechar</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Salvar as edições
    document.getElementById("salvarEdicao").addEventListener("click", async () => {
        const novoProfessor = document.getElementById("novoProfessor").value;
        const novoTipoAtividade = document.getElementById("novoTipoAtividade").options[document.getElementById("novoTipoAtividade").selectedIndex].text; // Aqui pega a descrição em vez do ID
        const novoMotivo = document.getElementById("novoMotivo").value;
    
        await editarAgendamento(agendamento.id_agendamento, novoProfessor, novoTipoAtividade, novoMotivo);
        modal.remove();
        location.reload();
    });
    
    
    

    // Lógica para fechar o modal
    document.getElementById("fecharModal").addEventListener("click", () => {
        modal.remove();
    });
}





async function carregarProfessoresPorUnidade(codigoUnidade) {
    try {
        const response = await fetch(`/listar-professores-por-unidade/${codigoUnidade}`);
        if (!response.ok) throw new Error('Erro ao carregar professores por unidade');

        return await response.json();
    } catch (error) {
        console.error('Erro ao carregar professores por unidade:', error);
        return [];
    }
}

async function carregarTiposDeAtividadePorUnidade(codigoUnidade) {
    try {
        const response = await fetch(`/listar-tipos-aula-por-unidade/${codigoUnidade}`);
        if (!response.ok) throw new Error('Erro ao carregar tipos de atividade por unidade');

        return await response.json();
    } catch (error) {
        console.error('Erro ao carregar tipos de atividade por unidade:', error);
        return [];
    }
}



// Função para editar agendamento
async function editarAgendamento(idAgendamento, novoProfessor, novoTipoAtividade, novoMotivo) {
    try {
        const response = await fetch(`/editar-agendamento/${idAgendamento}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                professor: novoProfessor, // Professor ID
                tipoAtividade: novoTipoAtividade, // O ID que você deve enviar
                motivo: novoMotivo, // Motivação do agendamento
            }),
        });

        if (!response.ok) throw new Error('Erro ao editar agendamento.');

        alert('Agendamento atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        alert('Erro ao editar agendamento.');
    }
}
document.getElementById('btnFiltroExclusao').addEventListener('click', () => {
    const filtrosDivExclusao = document.getElementById('filtrosExclusao');
    const estadoAtualExclusao = filtrosDivExclusao.style.display;

    filtrosDivExclusao.style.display = (estadoAtualExclusao === 'none' || estadoAtualExclusao === '') ? 'flex' : 'none';
});


// Evento DOMContentLoaded para inicializar aplicações e listeners
document.addEventListener('DOMContentLoaded', () => {
    carregarUnidades(); // Carrega as unidades ao carregar a página

    const unidadeSelect = document.getElementById('unidadeSelect');
    unidadeSelect.addEventListener('change', async () => {
        const codigoUnidade = unidadeSelect.value;
        if (codigoUnidade) {
            await carregarAgendamentosPorUnidade(codigoUnidade); // Carrega os agendamentos para a unidade selecionada
        } else {
            document.getElementById('agendamentosList').innerHTML = ''; // Limpa a lista
        }
    });

    const btnFiltro = document.getElementById('btnFiltro');
    const filtrosDiv = document.getElementById('filtros');

    // Verifica se o botão de filtro existe e adiciona evento de clique
    if (btnFiltro) {
        btnFiltro.addEventListener('click', () => {
            // Alterna a visibilidade do painel de filtros
            const estadoAtual = filtrosDiv.style.display;
            filtrosDiv.style.display = (estadoAtual === 'none' || estadoAtual === '') ? 'flex' : 'none';
        });
    }

    const btnAplicarFiltro = document.getElementById('btnAplicarFiltro');
    if (btnAplicarFiltro) {
        btnAplicarFiltro.addEventListener('click', aplicarFiltros); // Chama a função de aplicação de filtros
    } else {
        console.error('Botão de aplicar filtro não encontrado no DOM.');
    }
});

let paginaAtual = 1; // Página atual
const totalPorPagina = 20; // Total de agendamentos por página

// Função para carregar agendamentos por unidade e paginação
async function carregarAgendamentosPorUnidade(codigoUnidade) {
    try {
        const response = await fetch(`/listar-agendamento/${codigoUnidade}`);
        if (!response.ok) throw new Error('Erro ao carregar agendamentos');

        const agendamentos = await response.json();
        const agendamentosList = document.getElementById('agendamentosList');
        agendamentosList.innerHTML = '';

        const totalAgendamentos = agendamentos.length; // Total de agendamentos
        const totalPaginas = Math.ceil(totalAgendamentos / totalPorPagina); // Total de páginas

        // Paginação
        const agendamentosPagados = agendamentos.slice((paginaAtual - 1) * totalPorPagina, paginaAtual * totalPorPagina);
        
        if (agendamentosPagados.length === 0) {
            agendamentosList.textContent = 'Nenhum agendamento encontrado para esta unidade no momento.';
        } else {
            // Loop para adicionar agendamentos paginados
            agendamentosPagados.forEach(agendamento => {
                // Montagem do item de agendamento na interface
                const agendamentoItem = document.createElement('div');
                agendamentoItem.classList.add('agendamento-item');
                agendamentoItem.dataset.agendamentoId = agendamento.id_agendamento;

                const salaNome = document.createElement('h3');
                salaNome.textContent = ` ${agendamento.nome_sala}`;
                agendamentoItem.appendChild(salaNome);

                const professorNome = document.createElement('p');
                professorNome.textContent = `Professor: ${agendamento.nome}`;
                agendamentoItem.appendChild(professorNome);

                const dataInicio = document.createElement('p');
                dataInicio.textContent = `Data de Início: ${formatarData(agendamento.data_reservas)}`;
                agendamentoItem.appendChild(dataInicio);

                const horaInicio = document.createElement('p');
                horaInicio.textContent = `Hora de Início: ${formatarHora(agendamento.hora_inicio)}`;
                agendamentoItem.appendChild(horaInicio);

                const dataFim = document.createElement('p');
                dataFim.textContent = `Data de Fim: ${formatarData(agendamento.data_reservas)}`;
                agendamentoItem.appendChild(dataFim);

                const horaFim = document.createElement('p');
                horaFim.textContent = `Hora de Fim: ${formatarHora(agendamento.hora_fim)}`;
                agendamentoItem.appendChild(horaFim);

                const tipo_aula = document.createElement('p');
                tipo_aula.textContent = `Tipo de Atividade/UC: ${agendamento.tipo_aula || 'Nenhuma aula fornecida'}`;
                agendamentoItem.appendChild(tipo_aula);

                const motivo = document.createElement('p');
                motivo.textContent = `Motivo/Turma: ${agendamento.motivo || 'Nenhum motivo fornecido'}`;
                agendamentoItem.appendChild(motivo);

                // Botão de excluir
                const excluirButton = document.createElement('button');
                excluirButton.textContent = 'Excluir';
                excluirButton.addEventListener('click', async () => {
                    const confirmacao = confirm('Deseja excluir este agendamento?');
                    if (confirmacao) {
                        await excluirAgendamento(agendamento.id_agendamento);
                        agendamentoItem.remove(); 
                    }
                });

                // Botão de editar
                const editarButton = document.createElement('button');
                editarButton.textContent = 'Editar';
                editarButton.addEventListener('click', () => {
                    abrirModalEdicao(agendamento);
                });

                agendamentoItem.appendChild(excluirButton);
                agendamentoItem.appendChild(editarButton); // Adiciona o botão de editar
                agendamentosList.appendChild(agendamentoItem);
            });
        }

        // Adicionar controles de paginação
        adicionarControlesPaginacao(totalPaginas);
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        alert('Erro ao carregar agendamentos.');
    }
}

// Adicionar controles de paginação
function adicionarControlesPaginacao(totalPaginas) {
    const paginacao = document.getElementById('paginacao');
    paginacao.innerHTML = ''; // Limpa a página anterior

    // Controle de página anterior
    const botaoAnterior = document.createElement('button');
    botaoAnterior.textContent = 'Anterior';
    botaoAnterior.disabled = paginaAtual === 1; // Desabilita se estiver na primeira página
    botaoAnterior.addEventListener('click', () => {
        paginaAtual--;
        carregarAgendamentosPorUnidade(document.getElementById('unidadeSelect').value);
    });
    paginacao.appendChild(botaoAnterior);

    // Botões de página
    for (let i = 1; i <= totalPaginas; i++) {
        const botaoPagina = document.createElement('button');
        botaoPagina.textContent = i;
        botaoPagina.disabled = (i === paginaAtual); // Destacar a página atual

        // Adiciona a classe para botão da página ativa
        if (i === paginaAtual) {
            botaoPagina.classList.add('pagina-ativa');
        }

        botaoPagina.addEventListener('click', () => {
            paginaAtual = i;
            carregarAgendamentosPorUnidade(document.getElementById('unidadeSelect').value);
        });
        paginacao.appendChild(botaoPagina);
    }

    // Controle de próxima página
    const botaoProximo = document.createElement('button');
    botaoProximo.textContent = 'Próximo';
    botaoProximo.disabled = paginaAtual === totalPaginas; // Desabilita se estiver na última página
    botaoProximo.addEventListener('click', () => {
        paginaAtual++;
        carregarAgendamentosPorUnidade(document.getElementById('unidadeSelect').value);
    });
    paginacao.appendChild(botaoProximo);
}

// Função para excluir um agendamento
async function excluirAgendamento(idAgendamento) {
    try {
        const response = await fetch(`/excluir-agendamento/${idAgendamento}`, {
            method: 'DELETE' // Usando o método DELETE para a exclusão
        });

        if (!response.ok) throw new Error('Erro ao excluir agendamento.');

        alert('Agendamento excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        alert('Erro ao excluir agendamento.');
    }
}

// Função para formatar a data no formato brasileiro
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

document.getElementById('btnExcluirIntervalo').addEventListener('click', async () => {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    const unidadeSelect = document.getElementById('unidadeSelect');
    const codigoUnidade = unidadeSelect.value; // Captura a unidade selecionada

    if (!dataInicio || !dataFim) {
        alert('Por favor, selecione ambas as datas.');
        return;
    }

    if (!codigoUnidade) {
        alert('Por favor, selecione uma unidade antes de excluir agendamentos.');
        return;
    }

    // Mensagem de confirmação que inclui as datas e a unidade
    const mensagemConfirmacao = `Tem certeza que deseja excluir os agendamentos da unidade ${codigoUnidade} entre ${dataInicio} e ${dataFim}?`;
    const confirmacao = confirm(mensagemConfirmacao);
    
    // Se o usuário confirmar, chame a função de exclusão
    if (confirmacao) {
        await excluirAgendamentosNoIntervalo(codigoUnidade, dataInicio, dataFim);
    }
});

// Função para excluir agendamentos em um intervalo de datas para uma unidade específica
async function excluirAgendamentosNoIntervalo(codigoUnidade, dataInicio, dataFim) {
    try {
        const response = await fetch(`/excluir-agendamentos-intervalo`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codigoUnidade, dataInicio, dataFim }),
        });

        if (!response.ok) throw new Error('Erro ao excluir agendamentos.');
        
        alert('Agendamentos excluídos com sucesso!');
        // Opcionalmente, recarregar a lista de agendamentos
        carregarAgendamentosPorUnidade(codigoUnidade);
    } catch (error) {
        console.error('Erro ao excluir agendamentos:', error);
        alert('Erro ao excluir agendamentos.');
    }
}


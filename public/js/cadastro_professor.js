// Função para carregar informações do usuário
async function carregarInfoUsuario() {
    try {
        const response = await fetch('/user-info');
        if (!response.ok) throw new Error('Erro ao carregar informações do usuário.');

        const userInfo = await response.json();
        return userInfo;
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
        return null;
    }
}

// Função para carregar unidades, com a lógica para admin e usuários comuns
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
        const unidadeSelect = document.getElementById('codigo_unidade');

        // Limpa o select antes de adicionar novas opções
        unidadeSelect.innerHTML = '<option value="" disabled selected>Marque uma ou várias unidades</option>';

        // Se o usuário for admin, carrega todas as unidades
        if (userInfo.permissao === 'admin') {
            unidades.forEach(unidade => {
                const option = document.createElement('option');
                option.value = unidade.codigo; // Adiciona o código da unidade
                option.textContent = unidade.nome; // Adiciona o nome da unidade
                unidadeSelect.appendChild(option);
            });
        } else {
            // Coordenadores devem ver todas as unidades que eles estão associados
            const unidadeDoUsuario = unidades.filter(unidade => userInfo.unidades.includes(unidade.codigo));
            
            if (unidadeDoUsuario.length > 0) {
                unidadeDoUsuario.forEach(unidade => {
                    const option = document.createElement('option');
                    option.value = unidade.codigo; // Adiciona o código da unidade
                    option.textContent = unidade.nome; // Adiciona o nome da unidade
                    unidadeSelect.appendChild(option);
                });
            } else {
                // Exibir uma mensagem se não houver unidades associadas
                unidadeSelect.innerHTML = `<option disabled selected>Não há unidades associadas para este coordenador.</option>`;
                console.warn('Nenhuma unidade encontrada para o usuário:', userInfo.codigo_unidade);
            }
        }

    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        alert('Erro ao carregar unidades.');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    carregarUnidades(); // Carregar unidades ao iniciar a página

// Função para tratar o registro do professor
document.getElementById('professorForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const unidadesSelecionadas = Array.from(document.getElementById('codigo_unidade').selectedOptions).map(option => option.value);
    data.unidades = unidadesSelecionadas;

    const endpoint = data.permissao === 'coordenador' ? '/register-coordenador' : '/register';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Funcionário/Coordenador adicionado com sucesso!');
            e.target.reset(); 
            listarProfessores(); 
        } else if (response.status === 409) {
            alert('Matrícula já cadastrada.');
        } else {
            alert('Erro ao adicionar professor/coordenador.');
        }
    } catch (error) {
        console.error('Erro ao adicionar professor/coordenador:', error);
        alert('Erro ao adicionar professor/coordenador.');
    }
});

    

    // Quando unidade for selecionada, listar professores
    document.getElementById('codigo_unidade').addEventListener('change', listarProfessores);
});

// Listar professores da unidade selecionada
async function listarProfessores() {
    const codigoUnidade = document.getElementById('codigo_unidade').value;
    console.log('Código da Unidade Selecionada:', codigoUnidade); // Log do código da unidade
    const tabelatBody = document.getElementById('professoresTabela').getElementsByTagName('tbody')[0];
    tabelatBody.innerHTML = ''; // Limpar a tabela

    if (codigoUnidade) {
        try {
            const response = await fetch(`/listar-professores-por-unidade/${codigoUnidade}`);
            const professores = await response.json();
            console.log('Professores Recebidos:', professores); // Log

            // Verifica se há professores
            if (professores.length === 0) {
                const row = tabelatBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 4; 
                cell.textContent = 'Nenhum professor encontrado para esta unidade.';
            } else {
                professores.forEach(professor => {
                    const row = tabelatBody.insertRow();
                    row.innerHTML = `
                        <td>${professor.nome || 'Nome não disponível'}</td>
                        <td>${professor.login || 'Login não disponível'}</td>
                        <td>${professor.matricula || 'Nenhuma matrícula disponível'}</td>
                        <td>
                            <button onclick="desassociarProfessor(${professor.id_professor}, '${codigoUnidade}')">Desassociar</button>
                            <button onclick="excluirProfessor(${professor.id_professor})" style="background-color:red"">Excluir</button>
                            <button onclick="alterarSenha(${professor.id_professor})">Alterar Senha</button>
                        </td>
                    `;
                });
            }
            
            // Mostrar a tabela de professores
            const container = document.getElementById('professoresContainer');
            if (container) {
                container.style.display = 'block'; // Mostrar
            }
        } catch (error) {
            console.error('Erro ao listar professores:', error);
        }
    } else {
        // Esconde a tabela
        const container = document.getElementById('professoresContainer');
        if (container) {
            container.style.display = 'none';
        }
    }
}
async function desassociarProfessor(idProfessor, codigoUnidade) {
    if (confirm('Tem certeza que deseja desassociar este professor desta unidade?')) {
        try {
            const response = await fetch(`/desassociar-professor/${idProfessor}/${codigoUnidade}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Professor desassociado com sucesso!');
                listarProfessores(); // Atualiza a lista de professores
            } else {
                alert('Erro ao desassociar professor.');
            }
        } catch (error) {
            console.error('Erro ao desassociar professor:', error);
            alert('Erro ao desassociar professor.');
        }
    }
}


// Outras funções como alterarSenha, editarProfessor, atualizarProfessor e excluirProfessor permanecem inalteradas.


async function alterarSenha(id) {
    const novaSenha = prompt("Digite a nova senha:");

    if (novaSenha) {
        try {
            const response = await fetch(`/alterar-senha/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novaSenha })
            });

            if (response.ok) {
                alert('Senha alterada com sucesso!');
                listarProfessores(); // Atualiza a lista de professores após a alteração
            } else {
                alert('Erro ao alterar a senha.');
            }
        } catch (error) {
            console.error('Erro ao alterar a senha:', error);
            alert('Erro ao alterar a senha.');
        }
    } else {
        alert("A nova senha é obrigatória.");
    }
}


// Funções de editar e excluir o professor
function editarProfessor(id) {
    // Obtém os dados do professor para edição
    const professorNome = prompt("Digite o novo nome do professor:");
    const professorMatricula = prompt("Digite a nova matrícula do professor:");

    if (professorNome && professorMatricula) {
        atualizarProfessor(id, professorNome, professorMatricula);
    } else {
        alert("Nome e matrícula são obrigatórios para edição!");
    }
}

// Função para atualizar o professor no backend
async function atualizarProfessor(id, nome, matricula) {
    try {
        const response = await fetch(`/atualizar-professor/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, matricula })
        });

        if (response.ok) {
            alert('Professor atualizado com sucesso!');
            listarProfessores(); // Atualiza a lista de professores após a edição
        } else {
            alert('Erro ao atualizar professor.');
        }
    } catch (error) {
        console.error('Erro ao atualizar professor:', error);
        alert('Erro ao atualizar professor.');
    }
}

async function excluirProfessor(id) {
    if (confirm('Tem certeza que deseja excluir este professor?')) {
        try {
            await fetch(`/excluir-professor/${id}`, { method: 'DELETE' });
            alert('Professor excluído com sucesso!');
            listarProfessores(); // Atualizar a lista de professores
        } catch (error) {
            console.error('Erro ao excluir professor:', error);
            alert('Erro ao excluir professor.');
        }
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const salasSelect = document.getElementById('salas');
    const programasDiv = document.getElementById('programas');
    const associarBtn = document.getElementById('associarBtn');
    const desassociarBtn = document.getElementById('excluirBtn');
    const programasAssociadosDiv = document.getElementById('programasAssociados');
    const formPrograma = document.getElementById('formPrograma');
    const programasAdicionados = document.getElementById('programasAdicionados');
    const excluirProgramasBtn = document.getElementById('excluirProgramas');
    const selectAllCheckbox = document.getElementById('selectAll');

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

    async function carregarSalas(unidades) {
        try {
            const response = await fetch('/listasSalas');
            if (!response.ok) {
                throw new Error('Erro ao carregar as salas');
            }
            const salas = await response.json();
    
            // Filtrar salas com base nas unidades do usuário
            const salasFiltradas = salas.filter(sala => unidades.includes(sala.codigo_unidade));
    
            // Criar um objeto para agrupar salas por unidade
            const salasAgrupadas = {};
    
            // Agrupar salas por código de unidade
            salasFiltradas.forEach(sala => {
                if (!salasAgrupadas[sala.codigo_unidade]) {
                    salasAgrupadas[sala.codigo_unidade] = {
                        nome_unidade: sala.nome_unidade,
                        salas: []
                    };
                }
                salasAgrupadas[sala.codigo_unidade].salas.push(sala);
            });
    
            // Limpa o select antes de adicionar as opções
            salasSelect.innerHTML = '<option value="">Selecione uma sala</option>';
    
            // Ordena as unidades
            const unidadesOrdenadas = Object.keys(salasAgrupadas).sort();
    
            // Adiciona as salas organizadas no select
            unidadesOrdenadas.forEach(codigoUnidade => {
                const unidade = salasAgrupadas[codigoUnidade];
    
                unidade.salas.sort((a, b) => a.nome_sala.localeCompare(b.nome_sala)); // Ordena as salas por nome
    
                unidade.salas.forEach(sala => {
                    const option = document.createElement('option');
                    option.value = sala.id_sala;
                    option.textContent = `Unidade: ${codigoUnidade} ${unidade.nome_unidade} - ${sala.nome_sala}`;
                    salasSelect.appendChild(option);
                });
            });
    
        } catch (error) {
            console.error('Erro ao carregar as salas:', error);
            alert('Erro ao carregar as salas. Por favor, tente novamente.');
        }
    }
    

    async function carregarProgramas() {
        try {
            const response = await fetch('/listaProgramas');
            if (!response.ok) {
                throw new Error('Erro ao carregar os programas');
            }
            const programas = await response.json();
            programas.sort((a, b) => a.nome_programa.localeCompare(b.nome_programa));
    
            programasDiv.innerHTML = ''; 
            programas.forEach(programa => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = programa.id_programa;
                checkbox.id = `programa-${programa.id_programa}`;
                const label = document.createElement('label');
                label.htmlFor = `programa-${programa.id_programa}`;
                label.textContent = `${programa.nome_programa} - Versão ${programa.versao}`;
                programasDiv.appendChild(checkbox);
                programasDiv.appendChild(label);
                programasDiv.appendChild(document.createElement('br'));
            });
    
            selectAllCheckbox.addEventListener('change', function () {
                const isChecked = selectAllCheckbox.checked;
                programasDiv.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            });
        } catch (error) {
            console.error('Erro ao carregar os programas:', error);
            alert('Erro ao carregar os programas. Por favor, tente novamente.');
        }
    }

    async function carregarProgramasAssociados(idSala) {
        try {
            const response = await fetch(`/programas-sala/${idSala}`);
            if (!response.ok) {
                throw new Error('Erro ao carregar os programas associados');
            }
            const programasAssociados = await response.json();

            programasAssociados.sort((a, b) => a.nome_programa.localeCompare(b.nome_programa));

            programasAssociadosDiv.innerHTML = '';
            programasAssociados.forEach(programa => {
                const div = document.createElement('div');
                div.textContent = `${programa.nome_programa} - Versão ${programa.versao}`;
                programasAssociadosDiv.appendChild(div);
            });
        } catch (error) {
            console.error('Erro ao carregar os programas associados:', error);
            alert('Erro ao carregar os programas associados. Por favor, tente novamente.');
        }
    }

    salasSelect.addEventListener('change', function () {
        const idSala = salasSelect.value;
        if (idSala) {
            carregarProgramasAssociados(idSala);
        } else {
            programasAssociadosDiv.innerHTML = '';
        }
    });

    associarBtn.addEventListener('click', async function (event) {
        event.preventDefault();
        const idSala = salasSelect.value;
        if (!idSala) {
            alert('Por favor, selecione uma sala antes de associar programas.');
            return;
        }
        const programasSelecionados = Array.from(programasDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10));

        if (!Array.isArray(programasSelecionados) || !programasSelecionados.every(Number.isInteger)) {
            alert('Os IDs dos programas devem ser números inteiros.');
            return;
        }

        try {
            const response = await fetch('/associar-sala-programa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sala: idSala, programas: programasSelecionados })
            });
            if (response.ok) {
                alert('Associação realizada com sucesso');
                carregarProgramasAssociados(idSala);
            } else {
                throw new Error('Erro ao associar sala e programa');
            }
        } catch (error) {
            console.error('Erro ao associar sala e programa:', error);
            alert('Erro ao associar sala e programa. Por favor, tente novamente.');
        }
    });

    desassociarBtn.addEventListener('click', async function (event) {
        event.preventDefault();
        const idSala = salasSelect.value;
        if (!idSala) {
            alert('Por favor, selecione uma sala antes de desassociar programas.');
            return;
        }
        const programasSelecionados = Array.from(programasDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10));

        if (!Array.isArray(programasSelecionados) || !programasSelecionados.every(Number.isInteger)) {
            alert('Os IDs dos programas devem ser números inteiros.');
            return;
        }

        try {
            const response = await fetch('/desassociar-sala-programa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sala: idSala, programas: programasSelecionados })
            });
            if (response.ok) {
                alert('Desassociação realizada com sucesso');
                carregarProgramasAssociados(idSala);
            } else {
                throw new Error('Erro ao desassociar sala e programa');
            }
        } catch (error) {
            console.error('Erro ao desassociar sala e programa:', error);
            alert('Erro ao desassociar sala e programa. Por favor, tente novamente.');
        }
    });

    formPrograma.addEventListener('submit', function (event) {
        event.preventDefault();
        const nomePrograma = document.getElementById('nomePrograma').value;
        const versaoPrograma = document.getElementById('versaoPrograma').value;

        const novoPrograma = {
            nomePrograma: nomePrograma,
            versao: versaoPrograma
        };

        fetch('/adicionarPrograma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoPrograma)
        })
        .then(response => {
            if (response.ok) {
                alert('Programa adicionado');
                formPrograma.reset();
                carregarProgramasAdicionados();
            } else {
                alert('Erro ao adicionar programa.');
            }
        });
    });

    excluirProgramasBtn.addEventListener('click', function (event) {
        event.preventDefault();
        const checkboxes = programasAdicionados.querySelectorAll('input[type="checkbox"]:checked');
        const idsParaExcluir = Array.from(checkboxes).map(cb => cb.value);

        fetch('/excluirProgramas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ programas: idsParaExcluir })
        })
        .then(response => {
            if (response.ok) {
                alert('Programas excluídos');
                carregarProgramasAdicionados();
            } else {
                alert('Erro ao excluir programas.');
            }
        });
    });

    async function carregarProgramasAdicionados() {
        try {
            const response = await fetch('/programasAdicionados');
            if (!response.ok) {
                throw new Error('Erro ao carregar os programas adicionados');
            }
            const programas = await response.json();

            programas.sort((a, b) => a.nome_programa.localeCompare(b.nome_programa));

            programasAdicionados.innerHTML = '';
            programas.forEach(programa => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = programa.id_programa;
                checkbox.id = `adicionado-${programa.id_programa}`;
                const label = document.createElement('label');
                label.htmlFor = `adicionado-${programa.id_programa}`;
                label.textContent = `${programa.nome_programa} - Versão ${programa.versao}`;
                programasAdicionados.appendChild(checkbox);
                programasAdicionados.appendChild(label);
                programasAdicionados.appendChild(document.createElement('br'));
            });
        } catch (error) {
            console.error('Erro ao carregar os programas adicionados:', error);
            alert('Erro ao carregar os programas adicionados. Por favor, tente novamente.');
        }
    }

    // Carregar dados ao carregar a página
    const userInfo = await carregarInfoUsuario();
    if (userInfo) {
        // Chame a função para carregar as salas, passando as unidades do usuário
        await carregarSalas(userInfo.unidades);
    } else {
        alert('Não foi possível carregar as informações do usuário.');
    }
    
    carregarProgramas();
    carregarProgramasAdicionados();
});

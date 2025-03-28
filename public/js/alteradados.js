document.addEventListener('DOMContentLoaded', function() {
    const formSala = document.getElementById('form-alterar-sala');
    const cadeirasInput = document.getElementById('cadeiras');
    const computadoresInput = document.getElementById('computadores');
    const quadroBrancoInput = document.getElementById('quadroBranco');
    const telaProjetorInput = document.getElementById('telaProjetor');
    const tvInput = document.getElementById('tv');
    const areaInput = document.getElementById('area');
    const projetorInput = document.getElementById('projetor');
    const maquinarioInput = document.getElementById('maquinario');
    const salasSelect = document.getElementById('salas');
    const imageInput = document.getElementById('salaImage');

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

    // Função para carregar as salas filtradas pela unidade do usuário
    async function carregarSalas() {
        try {
            const response = await fetch(`/salas`);
            const salas = await response.json();
            console.log("Salas carregadas:", salas); // Para verificar os dados que você está recebendo
            salasSelect.innerHTML = '<option value="" disabled selected>Selecione uma sala</option>';
    
            if (salas.length === 0) {
                alert('Nenhuma sala encontrada para suas unidades.');
            }
    
            salas.forEach(sala => {
                const option = document.createElement('option');
                option.value = sala.id_sala;
                option.textContent = `Unidade: ${sala.codigo_unidade}  ${sala.nome_unidade} - ${sala.nome_sala}`;
                salasSelect.appendChild(option);
            });
            salasSelect.selectedIndex = 0;
        } catch (error) {
            console.error('Erro ao carregar as salas:', error);
            alert('Erro ao carregar as salas. Por favor, tente novamente.');
        }
    }
    

    // Função para carregar os detalhes da sala selecionada
    async function carregarDetalhesSala(idSala) {
        try {
            const response = await fetch(`/sala/${idSala}`);
            const salaDetalhes = await response.json();
            if (salaDetalhes) {
                cadeirasInput.value = salaDetalhes.cadeiras;
                computadoresInput.value = salaDetalhes.computadores;
                quadroBrancoInput.value = salaDetalhes.quadro_branco;
                telaProjetorInput.value = salaDetalhes.tela_projetor;
                tvInput.value = salaDetalhes.tv;
                areaInput.value = salaDetalhes.area;
                projetorInput.value = salaDetalhes.projetor;
                maquinarioInput.value = salaDetalhes.maquinario;
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes da sala:', error);
            alert('Erro ao carregar os detalhes da sala. Por favor, tente novamente.');
        }
    }

    // Função para salvar alterações
    async function salvarAlteracoes() {
        const idSala = salasSelect.value;
        const cadeiras = cadeirasInput.value;
        const computadores = computadoresInput.value;
        const quadroBranco = quadroBrancoInput.value;
        const telaProjetor = telaProjetorInput.value;
        const tv = tvInput.value;
        const area = areaInput.value;
        const projetor = projetorInput.value;
        const maquinario = maquinarioInput.value;

        const formData = new FormData();
        formData.append('idSala', idSala);
        formData.append('cadeiras', cadeiras);
        formData.append('computadores', computadores);
        formData.append('quadroBranco', quadroBranco);
        formData.append('telaProjetor', telaProjetor);
        formData.append('tv', tv);
        formData.append('area', area);
        formData.append('projetor', projetor);
        formData.append('maquinario', maquinario);

        const imageFile = imageInput.files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
    
        try {
            const response = await fetch('/alterarSala', {
                method: 'POST',
                body: formData,
            });
    
            const responseText = await response.text();
            if (response.ok) {
                alert('Dados da sala alterados com sucesso');
                formSala.reset();
                await carregarSalas();
            } else {
                alert(`Erro ao alterar os dados da sala: ${responseText}`);
            }
        } catch (error) {
            console.error('Erro ao enviar os dados:', error);
            alert('Erro ao enviar os dados. Por favor, tente novamente.');
        }
    }

    // Evento para o envio do formulário
    formSala.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede o envio do formulário

        // Validação dos campos
        if (salasSelect.value === "") {
            alert('Por favor, selecione uma sala.');
            return; 
        }

        // Verifica se os campos obrigatórios estão preenchidos
        if (!cadeirasInput.value || 
            !computadoresInput.value || !quadroBrancoInput.value || 
            !projetorInput.value || !telaProjetorInput.value || 
            !tvInput.value || !areaInput.value || 
            !maquinarioInput.value) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return; 
        }

        // Se todas as validações passarem, salvar as alterações
        salvarAlteracoes();
    });

    // Evento para selecionar a sala e carregar os detalhes
    salasSelect.addEventListener('change', function() {
        const idSalaSelecionada = salasSelect.value;
        if (idSalaSelecionada) {
            carregarDetalhesSala(idSalaSelecionada);
        } else {
            // Limpa os campos se nenhuma sala estiver selecionada
            cadeirasInput.value = '';
            computadoresInput.value = '';
            quadroBrancoInput.value = '';
            telaProjetorInput.value = '';
            tvInput.value = '';
            areaInput.value = '';
            projetorInput.value = '';
            maquinarioInput.value = '';
            imageInput.value = '';
        }
    });

    carregarSalas();  // Carregar as salas quando a página é carregada
});

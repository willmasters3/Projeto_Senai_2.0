document.addEventListener('DOMContentLoaded', () => {
    // Definições e seletores
    const menuIcon = document.querySelector('.menu-icon');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const body = document.querySelector('body');
    const informacaoSala = document.getElementById('informacaoSala');
    const fraseDinamica = document.getElementById('frase-dinamica');
    const sendMessageButton = document.getElementById('sendMessage');
   
    // Frases do menu
    const frases = [
        "para mais informações.",
        ", selecione uma unidade e clique na sala desejada.",
        " e explore os recursos disponíveis!"
    ];
    let fraseAtual = 0;
    let letraIndex = 0;

    function escreverFraseLetraPorLetra() {
        if (letraIndex < frases[fraseAtual].length) {
            fraseDinamica.textContent += frases[fraseAtual].charAt(letraIndex);
            letraIndex++;
            setTimeout(escreverFraseLetraPorLetra, 100);
        } else {
            setTimeout(() => {
                fraseDinamica.textContent = '';
                fraseAtual = (fraseAtual + 1) % frases.length;
                letraIndex = 0;
                escreverFraseLetraPorLetra();
            }, 2000);
        }
    }

    escreverFraseLetraPorLetra(); // Inicia o efeito de escrita letra por letra

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        informacaoSala.style.display = sidebar.classList.contains('active') ? 'none' : 'block';
    }

    // Carregar unidades
    fetch('/unidades')
        .then(response => response.json())
        .then(data => {
            const unidadeSelect = document.getElementById('unidadeSelect');
            data.forEach(unidade => {
                const option = document.createElement('option');
                option.value = unidade.codigo_unidade;
                option.textContent = unidade.nome_unidade;
                unidadeSelect.appendChild(option);
            });
        });

   
    const checkParentBackgroundColor = () => {
        const parentBackgroundColor = window.getComputedStyle(menuToggle.parentElement).getPropertyValue('background-color');
        menuIcon.src = isLightColor(parentBackgroundColor) ? "/imagens/botao-de-menu-branco.png" : "/imagens/botao-de-menu.png";
    };

    checkParentBackgroundColor();
    window.addEventListener('resize', checkParentBackgroundColor);

    menuToggle.addEventListener('click', toggleSidebar);

    // Fechar o sidebar ao clicar fora
    document.addEventListener('click', (event) => {
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target) && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-active');
        }
    });

    document.getElementById('unidadeSelect').addEventListener('change', (event) => {
        const codigoUnidade = event.target.value;
        if (codigoUnidade) {
            fetch(`/salas/${codigoUnidade}`)
                .then(response => response.json())
                .then(data => {
                    const salasContainer = document.getElementById('salasContainer');
                    const salasButtons = document.getElementById('salasButtons');
                    salasButtons.innerHTML = '';
                    salasContainer.style.display = 'block';

                    const compareSalas = (a, b) => {
                        const parseNumero = str => parseInt(str.replace(/\D/g, ''), 10);
                        const numA = parseNumero(a.nome_sala);
                        const numB = parseNumero(b.nome_sala);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                        }
                        return a.nome_sala.localeCompare(b.nome_sala, undefined, { numeric: true, sensitivity: 'base' });
                    };

                    data.sort(compareSalas);

                    data.forEach(sala => {
                        const button = document.createElement('button');
                        button.textContent = sala.nome_sala;
                        button.addEventListener('click', () => {
                            toggleSidebar();

                            document.getElementById('salaInfo').style.display = 'block';
                            document.getElementById('salaDetalhes').textContent = '';
                            document.getElementById('agendamentosList').innerHTML = '';
                            document.getElementById('programasList').innerHTML = '';

                            fetch(`/sala/${sala.id_sala}`)
                                .then(response => response.json())
                                .then(details => {
                                    const salaDetalhes = document.getElementById('salaDetalhes');
                                    salaDetalhes.innerHTML = `
                                        <strong>Unidade:</strong> ${details.codigo_unidade}<br><br>
                                        <strong>Nome:</strong> ${details.nome_sala}<br><br>
                                        <strong>Cadeiras:</strong> ${details.cadeiras ?? 'N/A'}<br><br>
                                        <strong>Computadores:</strong> ${details.computadores ?? 'N/A'}<br><br>
                                        <strong>Quadro Branco:</strong> ${details.quadro_branco ?? 'N/A'}<br><br>
                                        <strong>Tela Projetor:</strong> ${details.tela_projetor ?? 'N/A'}<br><br>
                                        <strong>Projetor:</strong> ${details.projetor ?? 'N/A'}<br><br>
                                        <strong>TV:</strong> ${details.tv ?? 'N/A'}<br><br>
                                        <strong>Área:</strong> ${details.area ?? 'N/A'}<br><br>
                                        <strong>Recursos didáticos:</strong> ${details.maquinario ?? 'N/A'}
                                        <br><br> ${details.imagem ? `<img src="${details.imagem}" alt="Imagem da Sala" style="max-width: 600px; max-height: 200px;">` : 'N/A'}
                                    `;
                                    salaInfo.style.display = 'block';

                                    fetch(`/listar-agendamentos/${sala.id_sala}`)
                                        .then(response => {
                                            if (response.status === 204) {
                                                const agendamentosList = document.getElementById('agendamentosList');
                                                agendamentosList.innerHTML = '<div>Esta sala não possui agendamentos. Aproveite e veja os programas disponíveis!</div>';
                                                return;
                                            }

                                            if (!response.ok) {
                                                const agendamentosList = document.getElementById('agendamentosList');
                                                agendamentosList.innerHTML = '<div>Ocorreu um erro ao listar agendamentos. Tente novamente mais tarde.</div>';
                                                return [];
                                            }

                                            return response.json();
                                        })
                                        .then(agendamentos => {
                                            const agendamentosList = document.getElementById('agendamentosList');
                                            agendamentosList.innerHTML = '';

                                            if (agendamentos.length === 0) {
                                                agendamentosList.innerHTML = '<div>Esta sala não possui agendamentos. Aproveite e veja os programas disponíveis!</div>';
                                                return;
                                            }

                                            agendamentos.forEach(agendamento => {
                                                const agendamentoInfo = `
                                                <div>
                                                    <strong>Professor(a):</strong> ${agendamento.nome}<br>
                                                    <strong>Data:</strong> ${formatarData(agendamento.data_reservas)}<br>
                                                    <strong>Hora Início:</strong> ${formatarHora(agendamento.hora_inicio)}<br>
                                                    <strong>Hora Fim:</strong> ${formatarHora(agendamento.hora_fim)}<br>
                                                    <strong>Aula:</strong> ${agendamento.tipo_aula ?? 'Não especificado'}<br>
                                                    <strong>Motivo:</strong> ${agendamento.motivo ?? 'Não especificado'}<br>
                                                    <hr>
                                                </div>
                                                `;
                                                agendamentosList.innerHTML += agendamentoInfo;
                                            });
                                        })
                                        .catch(error => {
                                            console.error('Erro ao listar agendamentos:', error);
                                            const agendamentosList = document.getElementById('agendamentosList');
                                            agendamentosList.innerHTML = '<div>Esta sala não possui agendamentos. Aproveite e veja os programas disponíveis!</div>';
                                        });

                                    // Buscar e exibir os programas da sala
                                    fetch(`/programas/${sala.id_sala}`)
                                        .then(response => {
                                            if (!response.ok) {
                                                throw new Error('Erro ao buscar programas');
                                            }
                                            return response.json();
                                        })
                                        .then(programas => {
                                            programas.sort((a, b) => (a.nome_programa || 'N/A').localeCompare(b.nome_programa || 'N/A'));
                                            const programasList = document.getElementById('programasList');
                                            programasList.innerHTML = '';

                                            programas.forEach(programa => {
                                                const listItem = document.createElement('li');
                                                listItem.textContent = `${programa.nome_programa || 'N/A'} - Versão: ${programa.versao || 'N/A'}`;
                                                programasList.appendChild(listItem);
                                            });

                                            const programaFilter = document.getElementById('programaFilter');
                                            programaFilter.addEventListener('input', () => {
                                                const filterValue = programaFilter.value.toLowerCase();
                                                const filteredProgramas = programas.filter(programa =>
                                                    (programa.nome_programa || 'N/A').toLowerCase().includes(filterValue)
                                                );
                                                programasList.innerHTML = '';
                                                filteredProgramas.forEach(programa => {
                                                    const listItem = document.createElement('li');
                                                    listItem.textContent = `${programa.nome_programa || 'N/A'} - Versão: ${programa.versao || 'N/A'}`;
                                                    programasList.appendChild(listItem);
                                                });
                                            });
                                        })
                                        .catch(error => {
                                            console.error('Erro ao buscar programas:', error);
                                        });
                                })
                                .catch(error => {
                                    console.error('Erro ao buscar detalhes da sala:', error);
                                });
                        });
                        salasButtons.appendChild(button);
                    });
                })
                .catch(error => {
                    console.error('Erro ao buscar salas:', error);
                });
        } else {
            document.getElementById('salasContainer').style.display = 'none';
            document.getElementById('salaInfo').style.display = 'none';
            document.getElementById('salaDetalhes').textContent = '';
            document.getElementById('programasList').innerHTML = '';
        }
    });

    // Mostrar a imagem expandida quando clicada
    document.getElementById('salaDetalhes').addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName.toUpperCase() === 'IMG') {
            const expandedImage = document.createElement('img');
            expandedImage.src = target.src;
            expandedImage.className = 'clickable-image expanded';

            // Fechar a imagem expandida ao clicar fora dela
            expandedImage.addEventListener('click', () => {
                expandedImage.remove();
            });

            document.body.appendChild(expandedImage);
        }
    });

    // Função para verificar se uma cor é clara
    function isLightColor(color) {
        const rgb = color.match(/\d+/g);
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        return brightness > 150; // Valor arbitrário para determinar se a cor é clara ou escura
    }

    // Função para formatar a data considerando o fuso horário de São Paulo (Brasil)
    function formatarData(data) {
        const dataObj = new Date(data);
        const utcDay = dataObj.getUTCDate();
        const utcMonth = dataObj.getUTCMonth() + 1; // Os meses são indexados de 0 a 11, então +1 para ajustar
        const utcYear = dataObj.getUTCFullYear();

        // Adiciona zero à esquerda se o dia ou mês for menor que 10
        const day = utcDay < 10 ? '0' + utcDay : utcDay;
        const month = utcMonth < 10 ? '0' + utcMonth : utcMonth;

        return `${day}/${month}/${utcYear}`; // Formato brasileiro
    }

    // Função para formatar a hora considerando o fuso horário de São Paulo (Brasil)
    function formatarHora(hora) {
        if (typeof hora === 'string' && hora.includes(':')) {
            const [hours, minutes, seconds] = hora.split(':').map(Number);
            const horas = hours < 10 ? '0' + hours : hours;
            const minutos = minutes < 10 ? '0' + minutes : minutes;
            const segundos = (seconds || 0) < 10 ? '0' + (seconds || 0) : (seconds || 0);
            return `${horas}:${minutos}:${segundos}`;
        }
        return 'Hora inválida'; // Caso o formato da hora esteja incorreto
    }
});
//função para trocar de pagina
function loadPage(page) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', page, true);
    xhr.onload = function() {
        if (this.status == 200) {
            document.querySelector('#mainContainer').innerHTML = this.responseText;
        } else {
            console.error('Erro ao carregar a página.');
        }
    };
    xhr.send();
}

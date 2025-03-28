document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const userInput = document.getElementById('userInput');
    const sendMessageButton = document.getElementById('sendMessage');
    const chatbot = document.getElementById('chatbot'); // Referência ao chatbot

    // Função para obter a saudação com base na hora atual
    function obterSaudacao() {
        const horaAtual = new Date().getHours();
        if (horaAtual < 12) {
            return 'Bom dia!';
        } else if (horaAtual < 18) {
            return 'Boa tarde!';
        } else {
            return 'Boa noite!';
        }
    }
    // Função para obter informações sobre a sala escolhida
    async function obterInformacoesSala(salaNome) {
        try {
            const result = await pool.request()
                .input('nome_sala', sql.NVarChar, salaNome)
                .query('SELECT * FROM Salas WHERE nome_sala = @nome_sala');

            if (result.recordset.length > 0) {
                const sala = result.recordset[0];
                return `Informações da Sala ${sala.nome_sala}: Cadeiras: ${sala.cadeiras}, Computadores: ${sala.computadores}, Equipamentos: ${sala.equipamentos}.`;
            } else {
                return `Desculpe, não encontrei informações para a sala ${salaNome}.`;
            }
        } catch (error) {
            console.error('Erro ao obter informações da sala:', error);
            return 'Houve um erro ao tentar obter as informações da sala.';
        }
    }

    // Função para adicionar mensagens
    function addMessage(content, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = (sender === 'Você' ? 'user-message' : 'chatbot-message');
        messageElement.innerHTML = content; // Usar innerHTML para permitir links
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Adicionar um listener para os links de unidades clicáveis
        const unidadeLinks = messageElement.querySelectorAll('.link-unidade');
        unidadeLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir comportamento padrão do link
                userInput.value = link.textContent; // Preencher o input com o nome da unidade
                handleUserInput(); // Enviar a mensagem automaticamente
            });
        });

        // Adicionar um listener para os links de salas clicáveis
        const salaLinks = messageElement.querySelectorAll('.link-sala');
        salaLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir comportamento padrão do link
                userInput.value = link.textContent; // Preencher o input com o nome da sala
                handleUserInput(); // Enviar a mensagem automaticamente
            });
        });
    }

    // Adicionar saudação inicial quando o chat for aberto
    chatbot.addEventListener('click', () => {
        if (chatContainer.children.length === 0) {
            const saudacao = obterSaudacao();
            addMessage(saudacao, 'Chatbot'); // Mensagem inicial do chatbot
        }
    });

    async function handleUserInput() {
        const input = userInput.value.trim();
        if (!input) return;
        addMessage(input, 'Você');
        userInput.value = '';

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input })
        });

        if (response.ok) {
            const data = await response.json();
            addMessage(data.response, 'Chatbot'); // Exibe a resposta do chatbot
        } else {
            addMessage('Erro ao se comunicar com o chatbot.', 'Chatbot');
        }
    }

    sendMessageButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput(); // Envia a mensagem ao pressionar Enter
    });

    // Mostrar/Ocultar o Chatbot
    document.getElementById('chatButton').addEventListener('click', () => {
        chatbot.style.display = (chatbot.style.display === 'none' || chatbot.style.display === '') ? 'flex' : 'none'; // Exibe ou oculta o chatbot
    });
});

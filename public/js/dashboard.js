document.addEventListener("DOMContentLoaded", async () => {
    const welcomeMessage = document.getElementById("welcome-message");

    // Função para obter a saudação com base no horário
    const getGreeting = () => {
        const currentHour = new Date().getHours();

        if (currentHour >= 5 && currentHour < 12) {
            return "Bom dia";
        } else if (currentHour >= 12 && currentHour < 18) {
            return "Boa tarde";
        } else {
            return "Boa noite";
        }
    };

    try {
        // Faz a requisição para obter os dados do usuário
        const response = await fetch('/user-info');
        
        if (response.ok) {
            const user = await response.json();
            const nomeCompleto = user.nome || 'usuário'; // Exibe o nome do usuário
            welcomeMessage.textContent = `${getGreeting()}, ${nomeCompleto}!`;
        } else {
            welcomeMessage.textContent = `${getGreeting()}, usuário!`;
        }
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        welcomeMessage.textContent = `${getGreeting()}, usuário!`;
    }
});

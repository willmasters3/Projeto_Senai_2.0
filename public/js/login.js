document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector('form');
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o envio padrão do formulário

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const redirectUrl = await response.text(); // Recebe a URL de redirecionamento do servidor
                window.location.href = redirectUrl; // Redireciona para a página correta
            } else {
                const errorText = await response.text();
                alert(errorText); // Exibe uma mensagem de erro
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            alert('Erro ao fazer login. Tente novamente mais tarde.');
        }
    });
});

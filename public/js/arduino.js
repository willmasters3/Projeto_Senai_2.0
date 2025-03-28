function ligarLuz() {
    fetch('/ligar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na resposta da rede');
        }
        return response.text();
    })
    .then(data => {
        console.log(data);
        alert(data);
    })
    .catch((error) => {
        console.error('Erro:', error);
        alert('Erro ao ligar a luz: ' + error.message);
    });
}

function desligarLuz() {
    fetch('/desligar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na resposta da rede');
        }
        return response.text();
    })
    .then(data => {
        console.log(data);
        alert(data);
    })
    .catch((error) => {
        console.error('Erro:', error);
        alert('Erro ao desligar a luz: ' + error.message);
    });
}

// Função para adicionar dinamicamente os campos para o nome das salas
function adicionarSala() {
  const divSalas = document.getElementById('salas');
  const novaSala = document.createElement('div');

  novaSala.innerHTML = `
      <label for="nomeSala">Nome da Sala:</label>
      <input type="text" name="sala[]" required>
      <button type="button" onclick="removerSala(this)">Remover</button>
    `;

  divSalas.appendChild(novaSala);
}




// Função para enviar os dados do formulário para o servidor
async function enviarDadosFormulario(dados, url, mensagemSucesso) {
  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    if (resposta.ok) {
      alert(mensagemSucesso);
      location.reload(); // Recarregar a página para atualizar a lista de unidades e salas
    } else {
      throw new Error('Erro ao enviar os dados para o servidor.');
    }
  } catch (erro) {
    console.error('Erro ao enviar os dados:', erro);
    alert(erro.message); // Exibir mensagem de erro detalhada
  }
}

// Evento de envio do formulário para criar unidade e salas
document.getElementById('form-criar-unidade').addEventListener('submit', async function (event) {
  event.preventDefault(); // Evita o envio do formulário

  const nomeUnidade = document.getElementById('nomeUnidade').value;
  const codigoUnidade = document.getElementById('codigoUnidade').value;
  const salas = document.querySelectorAll('input[name="sala[]"]');
  const nomesSalas = Array.from(salas).map(sala => sala.value);

  const dados = {
    nomeUnidade: nomeUnidade,
    codigoUnidade: codigoUnidade,
    salas: nomesSalas
  };

  await enviarDadosFormulario(dados, '/criar-unidade-salas', 'Unidade e salas criadas com sucesso!');
});
/*
//estou aqui
document.getElementById('form-adicionar-salas').addEventListener('submit', async function (event){
event.preventDefault();
const unidadeAdicionarSala = document.getElementById('unidadeAdicionarSala').value;
const novaSala = document.querySelectorAll('input[name="novaSala[]"]');
const nomesSalas = Array.from(novaSala).map(sala => sala.value);

const dados ={
  unidadeAdicionarSala : unidadeAdicionarSala,
  novaSala : nomesSalas
}
await enviarDadosFormulario(dados, '/form-adicionar-salas', 'Sala inserida com Sucesso!');
});

*/
// arrumar acima

// Evento de envio do formulário para renomear unidade
document.getElementById('form-renomear-unidade').addEventListener('submit', async function (event) {
  event.preventDefault();

  const codigoUnidadeRenomear = document.getElementById('codigoUnidadeRenomear').value;
  const novoNomeUnidade = document.getElementById('novoNomeUnidade').value;

  const dados = {
    codigoUnidade: codigoUnidadeRenomear,
    novoNomeUnidade: novoNomeUnidade
  };

  await enviarDadosFormulario(dados, '/renomear-unidade', 'Unidade renomeada com sucesso!');
});

// Evento de envio do formulário para remover unidade
document.getElementById('form-remover-unidade').addEventListener('submit', async function (event) {
  event.preventDefault();

  const codigoUnidadeRemover = document.getElementById('codigoUnidadeRemover').value;

  const dados = {
    codigoUnidade: codigoUnidadeRemover
  };

  await enviarDadosFormulario(dados, '/remover-unidade', 'Unidade removida com sucesso!');
});

// Função para listar unidades e suas salas
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const resposta = await fetch('/listar-unidades-salas');
    const unidadesSalas = await resposta.json();

    const unidadesSalasHTML = unidadesSalas.map(unidade => {
      const salasHTML = unidade.salas.map(sala => `<li>${sala}</li>`).join('');
      return `
          <div>
            <h2>${unidade.nome}</h2>
            <p>Código: ${unidade.codigo}</p>
            <ul>${salasHTML}</ul>
          </div>
        `;
    }).join('');

    document.getElementById('unidades-salas').innerHTML = unidadesSalasHTML;

    await atualizarSelectsUnidades();
  } catch (error) {
    console.error('Erro ao obter a lista de unidades e salas:', error);
    alert('Erro ao obter a lista de unidades e salas.');
  }
});

// Função para atualizar os selects de unidades
async function atualizarSelectsUnidades() {
  try {
    const resposta = await fetch('/listar-unidades');
    const unidades = await resposta.json();

    const selectRenomear = document.getElementById('codigoUnidadeRenomear');
    const selectRemover = document.getElementById('codigoUnidadeRemover');
    // const selectAdicionarSala = document.getElementById('unidadeAdicionarSala');

    // Limpa os selects antes de preenchê-los
    selectRenomear.innerHTML = '';
    selectRemover.innerHTML = '';
    // selectAdicionarSala.innerHTML = '';

    unidades.forEach(unidade => {
      const optionRenomear = document.createElement('option');
      optionRenomear.value = unidade.codigo;
      optionRenomear.textContent = unidade.nome;
      selectRenomear.appendChild(optionRenomear);

      const optionRemover = document.createElement('option');
      optionRemover.value = unidade.codigo;
      optionRemover.textContent = unidade.nome;
      selectRemover.appendChild(optionRemover);

      const optionAdicionarSala = document.createElement('option');
      optionAdicionarSala.value = unidade.codigo;
      optionAdicionarSala.textContent = unidade.nome;
     // selectAdicionarSala.appendChild(optionAdicionarSala);
    });
    
  } catch (error) {
    console.error('Erro ao listar unidades:', error);
    alert('Erro ao listar unidades.');
  }
}
// salas.js

document.addEventListener('DOMContentLoaded', function() {
  carregarUnidades();
});

async function carregarUnidades() {
  const response = await fetch('/listar-unidades');
  const unidades = await response.json();
  
  const unidadeSelect = document.getElementById('unidadeSelect');
  unidades.forEach(unidade => {
      const option = document.createElement('option');
      option.value = unidade.codigo;
      option.textContent = unidade.nome;
      unidadeSelect.appendChild(option);
  });
}

async function carregarSalas() {
  const unidadeSelect = document.getElementById('unidadeSelect');
  const codigoUnidade = unidadeSelect.value;
  
  if (!codigoUnidade) {
      document.getElementById('salasContainer').innerHTML = '';
      return;
  }

  const response = await fetch(`/listar-salas/${codigoUnidade}`);
  const salas = await response.json();
  
  const salasContainer = document.getElementById('salasContainer');
  salasContainer.innerHTML = ''; // Limpa conteúdo anterior

  salas.forEach(sala => {
      const salaDiv = document.createElement('div');
      salaDiv.innerHTML = `
          <span>${sala.nome_sala}</span>
          <button onclick="editarSala(${sala.id_sala})">Editar</button>
          <button onclick="excluirSala(${sala.id_sala})">Excluir</button>
      `;
      salasContainer.appendChild(salaDiv);
  });
}
// Função para editar sala -  esta funcao vai me deixar louco ainda
async function editarSala(idsala) {
  const novoNomeSala = prompt("Digite o novo nome da sala:");

  if (!novoNomeSala) {
      alert("O novo nome da sala é obrigatório.");
      return;
  }

  const novosDados = {
      idSala: idsala,
      novoNomeSala: novoNomeSala
  };

  try {
      const response = await fetch('/renomear-sala', { // Mantido a URL da API ok
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(novosDados),
      });

      // Adicionado para verificar se a resposta não é ok
      if (!response.ok) {
          const text = await response.text(); // Captura a resposta textual do erro ...
          console.error('Erro ao editar a sala:', text); // Loga o erro no console ...
          throw new Error(`Erro ao editar a sala: ${text}`); // Lança uma exceção com a mensagem de erro...
      }

      const data = await response.json();
      console.log('Sala editada com sucesso:', data);
      carregarSalas(); // Atualiza as salas para refletir alterações
  } catch (error) {
      console.error('Erro:', error); // Loga o erro no console
     /* alert('Houve um erro ao editar a sala. Verifique o console para mais detalhes.'); */ // Exibe um alerta detalhando o erro Me irritei e tirei fora!
  }
}



function excluirSala(idSala) {
  if (confirm("Tem certeza que deseja excluir esta sala?")) {
      fetch(`/deletar-sala/${idSala}`, {
          method: 'DELETE',
      })
      .then(response => {
          if (response.ok) {
              alert('Sala excluída com sucesso!');
              carregarSalas();
          } else {
              alert('Erro ao excluir a sala.');
          }
      });
  }
}
async function adicionarSala() {
  const unidadeSelect = document.getElementById('unidadeSelect');
  const codigoUnidade = unidadeSelect.value;
  const novaSala = document.getElementById('novaSalaInput').value;

  if (!codigoUnidade || !novaSala) {
      alert("Por favor, selecione uma unidade e forneça o nome da nova sala.");
      return;
  }

  try {
      const response = await fetch('/adicionar-sala', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ codigoUnidade, nomeSala: novaSala })
      });

      if (response.ok) {
          alert('Sala adicionada com sucesso!');
          document.getElementById('novaSalaInput').value = ''; // Limpa o campo de entrada
          carregarSalas(); // Atualiza a lista de salas
      } else if (response.status === 409) {
          const errorMessage = await response.text(); // Captura a mensagem de erro do servidor
          alert(`Erro: ${errorMessage}`); // Exibe a mensagem específica
      } else {
          alert('Erro ao adicionar nova sala.');
      }
  } catch (error) {
      console.error('Erro ao adicionar sala:', error);
      alert('Erro ao adicionar sala.');
  }
}

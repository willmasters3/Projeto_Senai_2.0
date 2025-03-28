const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');
const multer = require('multer');
const config = require('../dbConfig');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon'); 
const Fuse = require('fuse.js');



let pool;

sql.connect(config)
    .then(p => {
        pool = p;
        console.log('Conectado ao banco de dados');
    })
    .catch(err => console.error('Erro ao conectar ao banco de dados:', err));
 

// Configurar o multer para upload de arquivos

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../imagens')); // Path correto
    },
    filename: function (req, file, cb) {
        cb(null, `image-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });




// Rota para a página inicial feito (publico)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html')); // Ajustando o caminho correto
    
});
router.get('/registro'), (req,res)=>{
    res.sendFile(path.join(__dirname, '../private/html','registro.html' ));
}
// Rota para obter unidades feito 
router.get('/unidades', async (req, res) => {
    try {
        let result = await pool.request().query('SELECT codigo_unidade, nome_unidade FROM Unidades');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Registro de um novo professor
// Registro de um novo professor
router.post('/register', async (req, res) => {
    const { nome, matricula, login, senha, permissao, unidades } = req.body;

    try {
        // 1. Verificar se o professor já existe
        const existingProfessor = await pool.request()
            .input('matricula', sql.NVarChar, matricula)
            .query('SELECT * FROM professores WHERE matricula = @matricula');

        if (existingProfessor.recordset.length > 0) {
            // 2. Se o professor já existe, verificar associações
            const professor = existingProfessor.recordset[0];
            const existingAssociations = await pool.request()
                .input('id_professor', sql.Int, professor.id_professor)
                .query('SELECT * FROM ProfessorUnidade WHERE id_professor = @id_professor');

            // 3. Verificar se o novo código da unidade já está associado
            const newAssociations = [];

            for (const codigoUnidade of unidades) {
                if (!existingAssociations.recordset.some(a => a.codigo_unidade === codigoUnidade)) {
                    newAssociations.push(codigoUnidade);
                    
                }
            }

            // 4. Se há novas associações (unidades), adicioná-las
            for (const codigoUnidade of newAssociations) {
                await pool.request()
                    .input('id_professor', sql.Int, professor.id_professor)
                    .input('codigo_unidade', sql.NVarChar, codigoUnidade)
                    .query('INSERT INTO ProfessorUnidade (id_professor, codigo_unidade) VALUES (@id_professor, @codigo_unidade)');
            }

            return res.status(200).send('Professor já existe e foi associado a novas unidades, se necessário.');
        }

        // 5. Se o professor não existe, prosseguir com a criação normal
        const hashedPassword = await bcrypt.hash(senha, 10);
        const result = await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('matricula', sql.NVarChar, matricula)
            .input('login', sql.NVarChar, login)
            .input('senha', sql.NVarChar, hashedPassword)
            .input('permissao', sql.NVarChar, permissao)
            .query(`INSERT INTO professores (nome, matricula, login, senha, permissao) 
                    OUTPUT INSERTED.id_professor
                    VALUES (@nome, @matricula, @login, @senha, @permissao)`);

        const idProfessor = result.recordset[0].id_professor;

        // 6. Associar unidades ao novo professor
        for (const codigoUnidade of unidades) {
            await pool.request()
                .input('id_professor', sql.Int, idProfessor)
                .input('codigo_unidade', sql.NVarChar, codigoUnidade)
                .query(`INSERT INTO ProfessorUnidade (id_professor, codigo_unidade) 
                        VALUES (@id_professor, @codigo_unidade)`);
        }

        res.status(201).send('Professor cadastrado com sucesso.');
    } catch (error) {
        console.error('Erro ao registrar professor:', error);
        res.status(500).send('Erro ao registrar professor.');
    }
});

//NOVO
// Rota para verificar se a matrícula já existe
router.get('/verificar-matricula/:matricula', async (req, res) => {
    const { matricula } = req.params;
    try {
        const result = await pool.request()
            .input('matricula', sql.NVarChar, matricula) // Utiliza a matrícula recebida
            .query('SELECT * FROM professores WHERE matricula = @matricula');

        // Se existir um registro, retorna as informações do professor
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]); // Retorna a primeira entrada correspondente
        } else {
            res.json(null); // Indica que a matrícula não existe
        }
    } catch (error) {
        console.error('Erro ao verificar matrícula:', error);
        res.status(500).send('Erro ao verificar matrícula.');
    }
});

// Rota para registro de um novo coordenador
router.post('/register-coordenador', async (req, res) => {
    const { nome, matricula, login, senha, unidades } = req.body;

    try {
        // 1. Verificar se o coordenador já existe
        const existingCoordenador = await pool.request()
            .input('matricula', sql.NVarChar, matricula)
            .query('SELECT * FROM professores WHERE matricula = @matricula');

        if (existingCoordenador.recordset.length > 0) {
            return res.status(409).send('Coordenador já existe.');
        }

        // 2. Registrar o novo coordenador
        const hashedPassword = await bcrypt.hash(senha, 10);
        const result = await pool.request()
            .input('nome', sql.NVarChar, nome)
            .input('matricula', sql.NVarChar, matricula)
            .input('login', sql.NVarChar, login)
            .input('senha', sql.NVarChar, hashedPassword)
            .input('permissao', sql.NVarChar, 'coordenador') // Definindo permissão como coordenador
            .query(`INSERT INTO professores (nome, matricula, login, senha, permissao)
                    OUTPUT INSERTED.id_professor
                    VALUES (@nome, @matricula, @login, @senha, @permissao)`);

        const idCoordenador = result.recordset[0].id_professor;

        // 3. Associar unidades ao novo coordenador
        for (const codigoUnidade of unidades) {
            await pool.request()
                .input('id_professor', sql.Int, idCoordenador)
                .input('codigo_unidade', sql.NVarChar, codigoUnidade)
                .query(`INSERT INTO ProfessorUnidade (id_professor, codigo_unidade) 
                        VALUES (@id_professor, @codigo_unidade)`);
        }

        res.status(201).send('Coordenador cadastrado com sucesso.');
    } catch (error) {
        console.error('Erro ao registrar coordenador:', error);
        res.status(500).send('Erro ao registrar coordenador.');
    }
});


// Rota para login

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM professores WHERE login = @username');

        if (result.recordset.length === 0) {
            return res.status(401).send('Usuário ou senha inválidos.');
        }

        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.senha);

        if (!match) {
            return res.status(401).send('Usuário ou senha inválidos.');
        }

        // Buscando as associações na tabela ProfessorUnidade
        const unidadesResult = await pool.request()
            .input('id_professor', sql.Int, user.id_professor)
            .query('SELECT codigo_unidade FROM ProfessorUnidade WHERE id_professor = @id_professor');

        const unidades = unidadesResult.recordset.map(row => row.codigo_unidade);

        // Armazenar as informações do usuário na sessão
        req.session.user = {
            id_professor: user.id_professor,
            nome: user.nome,
            login: user.login,
            permissao: user.permissao,
            unidades // Armazenar todas as unidades associadas
        };

        // Redirecionamento baseado no tipo de usuário
        if (user.permissao === 'admin') {
            return res.send('/html/dashboard.html'); 
        } else if (user.permissao === 'coordenador') {
            return res.send('/html/dashboard-coordenador.html'); // Novo caminho para a dashboard do coordenador
        } else {
            return res.send('/html/agendasala.html'); // Para outros usuários, como usuários comuns
        }
    } catch (err) {
        console.error('Erro ao fazer login:', err);
        res.status(500).send('Erro ao fazer login.');
    }
});




// Rota para obter dados do usuário logado
router.get('/user-info', (req, res) => {
    if (req.session.user) {
        return res.json(req.session.user); // Envia os dados do usuário logado
    } else {
        return res.status(401).send('Usuário não autenticado.');
    }
});



//altera a senha
router.put('/alterar-senha/:id', async (req, res) => {
    const { id } = req.params;
    const { novaSenha } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(novaSenha, 10);
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('senha', sql.NVarChar, hashedPassword)
            .query('UPDATE professores SET senha = @senha WHERE id_professor = @id');

        res.status(200).send('Senha alterada com sucesso.');
    } catch (err) {
        console.error('Erro ao alterar a senha:', err);
        res.status(500).send('Erro ao alterar a senha.');
    }
});


// Rota para obter salas por código da unidade
router.get('/salas/:codigoUnidade', async (req, res) => {
    const { codigoUnidade } = req.params;
    try {
        let result = await pool.request()
            .input('codigoUnidade', sql.VarChar, codigoUnidade)
            .query(`
                SELECT s.id_sala, s.nome_sala, u.codigo_unidade, u.nome_unidade 
                FROM Salas s 
                JOIN Unidades u ON s.codigo_unidade = u.codigo_unidade 
                WHERE s.codigo_unidade = @codigoUnidade
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Erro ao obter salas:', err);
        res.status(500).send(err.message);
    }
});

// Rota para obter detalhes de uma sala feito
router.get('/sala/:idSala', async (req, res) => {
    const { idSala } = req.params;
    try {
        let result = await pool.request()
            .input('idSala', sql.Int, idSala)
            .query('SELECT * FROM Salas WHERE id_sala = @idSala');
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


//rota para agendamento
router.post('/agendar-sala', async (req, res) => {
    const { id_sala, id_professor, data_reservas, hora_inicio, hora_fim, motivo, tipo_aula } = req.body; // Aqui falta a captura de tipo_aula

    console.log('Recebendo dados para agendamento:', req.body);

    if (!id_sala || !id_professor || !Array.isArray(data_reservas) || !hora_inicio || !hora_fim || !motivo || !tipo_aula) {
        return res.status(400).send('Dados incompletos ou inválidos');
    }

    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        for (const data of data_reservas) {
            const dataLuxon = DateTime.fromISO(data);

            if (!dataLuxon.isValid) {
                throw new Error('Data inválida.');
            }

            const conflitos = await transaction.request()
                .input('id_sala', sql.Int, id_sala)
                .input('data', sql.NVarChar, data)
                .input('hora_inicio', sql.NVarChar, hora_inicio)
                .input('hora_fim', sql.NVarChar, hora_fim)
                .query(`
                    SELECT COUNT(*) AS numConflictos
                    FROM agendamentos
                    WHERE id_sala = @id_sala
                    AND data_reservas = @data
                    AND (
                        (hora_inicio < @hora_fim AND hora_fim > @hora_inicio)
                    )
                `);

            if (conflitos.recordset[0].numConflictos > 0) {
                await transaction.rollback();
                const partesData = data.split('-');
                const dataFormatada = `${partesData[2]} de ${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
                     'outubro', 'novembro', 'dezembro'][parseInt(partesData[1], 10) - 1]} de ${partesData[0]}`;

                return res.status(400).send(`Data (${dataFormatada}) e horário já ocupados. Escolha outro, por gentileza.`);
            }

            await transaction.request()
                .input('id_sala', sql.Int, id_sala)
                .input('id_professor', sql.Int, id_professor)
                .input('data_reservas', sql.NVarChar, data)
                .input('hora_inicio', sql.NVarChar, hora_inicio)
                .input('hora_fim', sql.NVarChar, hora_fim)
                .input('tipo_aula', sql.NVarChar, tipo_aula) // Aqui você precisa incluir tipo_aula
                .input('motivo', sql.NVarChar, motivo)
                .query(`
                    INSERT INTO agendamentos (id_sala, id_professor, data_reservas, hora_inicio, hora_fim, motivo, tipo_aula) 
                    VALUES (@id_sala, @id_professor, @data_reservas, @hora_inicio, @hora_fim, @motivo, @tipo_aula)
                `);
        }

        await transaction.commit();
        res.status(200).send('Agendamentos criados com sucesso!');
    } catch (error) {
        console.error('Erro ao criar agendamentos:', error);
        
        if (transaction) {
            await transaction.rollback(); // Rollback em caso de erro
        }
        
        if (error.message === 'Data inválida.') {
            return res.status(400).send('Data inválida.');
        }

        res.status(500).send('Erro ao criar agendamentos.');
    }
});


// Dentro do seu arquivo de rotas (router.js ou similar)
router.put('/editar-agendamento/:id', async (req, res) => {
    const { id } = req.params;
    const { professor, tipoAtividade, motivo } = req.body; 

    try {
        await pool.request()
            .input('id', sql.Int, id)
            .input('professor', sql.Int, professor)
            .input('tipoAtividade', sql.NVarChar, tipoAtividade) 
            .input('motivo', sql.NVarChar, motivo)
            .query(`
                UPDATE agendamentos 
                SET 
                    id_professor = @professor, 
                    tipo_aula = @tipoAtividade, -- Atualiza com a descrição
                    motivo = @motivo 
                WHERE id_agendamento = @id
            `);

        res.status(200).send('Agendamento atualizado com sucesso.');
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        res.status(500).send('Erro ao editar agendamento.');
    }
});





// Rota para listar tipos de aula por unidade

router.get('/listar-tipos-aula-por-unidade/:codigoUnidade', async (req, res) => {
    const { codigoUnidade } = req.params; // Pega o parâmetro da URL
    try {
        const result = await pool.request()
            .input('codigoUnidade', sql.NVarChar, codigoUnidade) // Aqui você declara e atribui a variável
            .query(`
                SELECT ta.id_tipo_aula, ta.descricao
                FROM unidade_tipo_aula uta 
                JOIN tipos_aula ta ON uta.id_tipo_aula = ta.id_tipo_aula
                JOIN Unidades u ON uta.id_unidade = u.codigo_unidade
                WHERE u.codigo_unidade = @codigoUnidade;
            `);
        if (result.recordset.length === 0) {
            return res.status(404).send('Nenhum tipo de aula encontrado para esta unidade.');
        }
        res.json(result.recordset); // Retorna os resultados como JSON
    } catch (err) {
        console.error('Erro ao listar tipos de aula:', err);
        res.status(500).send('Erro ao listar tipos de aula.');
    }
});
//rota 
router.put('/editar-tipo-aula/:idTipoAula', async (req, res) => {
    const { descricao, id_unidade } = req.body;
    const { idTipoAula } = req.params;

    try {
        // Verifica primeiro se a combinação já existe
        const existing = await pool.request()
            .input('id_unidade', sql.NVarChar, id_unidade)
            .input('idTipoAula', sql.Int, idTipoAula)
            .query(`
                SELECT COUNT(*) as count 
                FROM unidade_tipo_aula 
                WHERE id_unidade = @id_unidade AND id_tipo_aula <> @idTipoAula
            `);

        if (existing.recordset[0].count > 0) {
            return res.status(409).send('Esse tipo de aula já está associado a essa unidade.');
        }

        const result = await pool.request()
            .input('descricao', sql.VarChar, descricao)
            .input('id_unidade', sql.VarChar, id_unidade)
            .input('idTipoAula', sql.Int, idTipoAula)
            .query('UPDATE unidade_tipo_aula SET descricao = @descricao, id_unidade = @id_unidade WHERE id_tipo_aula = @idTipoAula');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('Tipo de aula não encontrado.');
        }

        res.send('Tipo de aula editado com sucesso!');
    } catch (error) {
        console.error('Erro ao editar tipo de aula:', error);
        res.status(500).send('Erro ao editar tipo de aula.');
    }
});


// Rota para adicionar um novo tipo de aula e associá-lo a uma unidade
router.post('/adicionar-unidade-tipo-aula', async (req, res) => {
    const { descricao, id_unidade } = req.body;

    // Verifica se a descrição e a unidade foram passadas
    if (!descricao || !id_unidade || typeof id_unidade !== 'string') { // Verificamos que é uma string
        return res.status(400).send('Descrição e ID da unidade são obrigatórios e ID deve ser uma string.');
    }

    try {
        // Incluir a descrição na tabela tipos_aula
        const resultTipoAula = await pool.request()
            .input('descricao', sql.NVarChar(255), descricao)
            .query('INSERT INTO tipos_aula (descricao) VALUES (@descricao); SELECT SCOPE_IDENTITY() AS id_tipo_aula;');

        const id_tipo_aula = resultTipoAula.recordset[0].id_tipo_aula;

        // Associar o tipo de aula à unidade
        await pool.request()
            .input('id_unidade', sql.NVarChar, id_unidade) // Mantém como nvarchar
            .input('id_tipo_aula', sql.Int, id_tipo_aula)
            .query('INSERT INTO unidade_tipo_aula (id_unidade, id_tipo_aula) VALUES (@id_unidade, @id_tipo_aula);');

        res.status(201).send('Tipo de aula adicionado e associado à unidade com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar e associar tipo de aula:', error);
        res.status(500).send('Erro ao adicionar e associar tipo de aula.');
    }
});

// Rota para editar um tipo de aula
router.put('/editar-tipo-aula/:idTipoAula', async (req, res) => {
    const { descricao } = req.body; // Remova 'id_unidade' daqui
    const { idTipoAula } = req.params;

    try {
        // Atualiza apenas a descrição na tabela tipos_aula
        const result = await pool.request()
            .input('descricao', sql.VarChar, descricao)
            .input('idTipoAula', sql.Int, idTipoAula)
            .query('UPDATE tipos_aula SET descricao = @descricao WHERE id_tipo_aula = @idTipoAula');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('Tipo de aula não encontrado.');
        }

        res.send('Tipo de aula editado com sucesso!');
    } catch (error) {
        console.error('Erro ao editar tipo de aula:', error);
        res.status(500).send('Erro ao editar tipo de aula.');
    }
});
// Rota para dessassociar um tipo de aula de todas as unidades
router.delete('/dessassociar-tipo-aula/:idTipoAula', async (req, res) => {
    const { idTipoAula } = req.params;

    try {
        await pool.request()
            .input('idTipoAula', sql.Int, idTipoAula)
            .query('DELETE FROM unidade_tipo_aula WHERE id_tipo_aula = @idTipoAula');

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao dessassociar tipo de aula:', error);
        res.status(500).send('Erro ao dessassociar tipo de aula.');
    }
});
// Rota para desassociar professor de uma unidade
router.delete('/desassociar-professor/:id/:codigo_unidade', async (req, res) => {
    const { id, codigo_unidade } = req.params;

    try {
        await pool.request()
            .input('id_professor', sql.Int, id)
            .input('codigo_unidade', sql.NVarChar, codigo_unidade)
            .query('DELETE FROM ProfessorUnidade WHERE id_professor = @id_professor AND codigo_unidade = @codigo_unidade');

        res.sendStatus(200); // Resposta de sucesso
    } catch (error) {
        console.error('Erro ao desassociar professor:', error);
        res.status(500).send('Erro ao desassociar professor.');
    }
});

// Rota para editar um tipo de aula
router.put('/editar-tipo-aula/:idTipoAula', async (req, res) => {
    const { descricao } = req.body; // informações que vão ser atualizadas
    const { idTipoAula } = req.params;

    try {
        // Atualiza a descrição do tipo de aula na tabela tipos_aula
        const result = await pool.request()
            .input('descricao', sql.VarChar, descricao)
            .input('idTipoAula', sql.Int, idTipoAula)
            .query('UPDATE tipos_aula SET descricao = @descricao WHERE id_tipo_aula = @idTipoAula');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('Tipo de aula não encontrado.');
        }

        // Se necessário, atualize as tabelas associadas também
        await pool.request()
            .input('descricao', sql.VarChar, descricao)
            .input('idTipoAula', sql.Int, idTipoAula) // caso tenha que atualizar nos associados
            .query('UPDATE unidade_tipo_aula SET descricao = @descricao WHERE id_tipo_aula = @idTipoAula');

        res.send('Tipo de aula editado com sucesso!');
    } catch (error) {
        console.error('Erro ao editar tipo de aula:', error);
        res.status(500).send('Erro ao editar tipo de aula.');
    }
});

// Rota para excluir um tipo de aula
router.delete('/excluir-tipo-aula/:idTipoAula', async (req, res) => {
    const { idTipoAula } = req.params;

    try {
        // Verifica se há referências a este tipo de aula
        const referenceCheck = await pool.request()
            .input('idTipoAula', sql.Int, idTipoAula)
            .query('SELECT COUNT(*) AS count FROM unidade_tipo_aula WHERE id_tipo_aula = @idTipoAula');

        if (referenceCheck.recordset[0].count > 0) {
            return res.status(409).send('Não é possível excluir este tipo de aula; ele está associado a unidades.');
        }

        // Se não houver referências, procede com a exclusão
        await pool.request()
            .input('idTipoAula', sql.Int, idTipoAula)
            .query('DELETE FROM tipos_aula WHERE id_tipo_aula = @idTipoAula');

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao excluir tipo de aula:', error);
        res.status(500).send('Erro ao excluir tipo de aula.');
    }
});
// Rota para adicionar uma nova unidade curricular
router.post('/adicionar-unidade-curricular', async (req, res) => {
    const { ano, semestre, turma, turno, modulo, tipoCurso } = req.body;

    try {
        await pool.request()
            .input('ano', sql.Int, ano)
            .input('semestre', sql.Int, semestre)
            .input('turma', sql.NVarChar(1), turma)
            .input('turno', sql.Int, turno)
            .input('modulo', sql.Int, modulo)
            .input('tipoCurso', sql.Int, tipoCurso)
            .query(`
                INSERT INTO UnidadesCurriculares (ano, semestre, turma, turno, modulo, tipo_curso)
                VALUES (@ano, @semestre, @turma, @turno, @modulo, @tipoCurso);
            `);

        res.status(201).send('Unidade curricular adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar unidade curricular:', error);
        res.status(500).send('Erro ao adicionar unidade curricular.');
    }
});


// Rota para associar uma unidade curricular a um tipo de aula
router.post('/associar-unidade-tipo-aula', async (req, res) => {
    const { id_unidade_curricular, id_tipo_aula } = req.body;

    try {
        await pool.request()
            .input('id_unidade_curricular', sql.Int, id_unidade_curricular)
            .input('id_tipo_aula', sql.Int, id_tipo_aula)
            .query(`
                INSERT INTO unidade_tipo_aula_associacao (id_unidade_curricular, id_tipo_aula)
                VALUES (@id_unidade_curricular, @id_tipo_aula);
            `);

        res.status(201).send('Associação criada com sucesso!');
    } catch (error) {
        console.error('Erro ao associar unidade curricular a tipo de aula:', error);
        res.status(500).send('Erro ao associar unidade curricular a tipo de aula.');
    }
});
// Rota para listar associações de uma unidade curricular
router.get('/listar-associacoes/:unidadeId', async (req, res) => {
    const { unidadeId } = req.params;

    try {
        const result = await pool.request()
            .input('unidadeId', sql.Int, unidadeId)
            .query(`
                SELECT uta.id_tipo_aula, ta.descricao
                FROM unidade_tipo_aula_associacao uta
                JOIN tipos_aula ta ON uta.id_tipo_aula = ta.id_tipo_aula
                WHERE uta.id_unidade_curricular = @unidadeId
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar associações:', error);
        res.status(500).send('Erro ao listar associações.');
    }
});
// Rota para obter unidades curriculares
router.get('/listar-unidades-curriculares', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT TOP (1000) [id_unidade_curricular], [ano], [semestre], [turma], [turno], [modulo], [tipo_curso] FROM [ProjetoSenai2.0].[dbo].[UnidadesCurriculares]');
        res.json(result.recordset);
    } catch (err) {
        console.error('Erro ao listar unidades curriculares:', err);
        res.status(500).send('Erro ao listar unidades curriculares.');
    }
});
// Rota para dessassociar um ou mais tipos de aula de uma unidade curricular
router.delete('/dessassociar-unidade-tipo-aula', async (req, res) => {
    const { id_unidade_curricular, id_tipos_aula } = req.body;

    if (!Array.isArray(id_tipos_aula) || id_tipos_aula.length === 0) {
        return res.status(400).send('Nenhum tipo de aula selecionado para dessassociar.');
    }

    try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (let id_tipo_aula of id_tipos_aula) {
            await transaction.request()
                .input('id_unidade_curricular', sql.Int, id_unidade_curricular)
                .input('id_tipo_aula', sql.Int, id_tipo_aula)
                .query(`
                    DELETE FROM unidade_tipo_aula_associacao
                    WHERE id_unidade_curricular = @id_unidade_curricular AND id_tipo_aula = @id_tipo_aula
                `);
        }

        await transaction.commit();
        res.status(200).send('Dessassociação realizada com sucesso!');
    } catch (error) {
        console.error('Erro ao dessassociar unidade curricular:', error);
        res.status(500).send('Erro ao dessassociar unidade curricular.');
    }
});


router.get('/verificar-agendamento/:id_sala/:data/:hora_inicio/:hora_fim', async (req, res) => {
    const { id_sala, data, hora_inicio, hora_fim } = req.params;

    // Validação das variáveis recebidas
    try {
        const result = await pool.request()
            .input('id_sala', sql.Int, id_sala)
            .input('data', sql.NVarChar, data)
            .input('hora_inicio', sql.NVarChar, hora_inicio)
            .input('hora_fim', sql.NVarChar, hora_fim)
            .query(`
                SELECT COUNT(*) AS numConflictos
                FROM agendamentos
                WHERE id_sala = @id_sala
                AND data_reservas = @data
                AND (
                    (hora_inicio < @hora_fim AND hora_fim > @hora_inicio)
                )
            `);

        const existe = result.recordset[0].numConflictos > 0;

        // Retorna resposta
        res.json({
            existe: existe,
            agendamentos: existe ? await getAgendamentos(id_sala, data, hora_inicio, hora_fim) : []
        });
    } catch (error) {
        console.error('Erro ao verificar agendamentos:', error);
        res.status(500).send('Erro ao verificar agendamentos.');
    }
});

// Função auxiliar para pegar os agendamentos em conflito
async function getAgendamentos(id_sala, data, hora_inicio, hora_fim) {
    const result = await pool.request()
        .input('id_sala', sql.Int, id_sala)
        .input('data', sql.NVarChar, data)
        .input('hora_inicio', sql.NVarChar, hora_inicio)
        .input('hora_fim', sql.NVarChar, hora_fim)
        .query(`
            SELECT a.*, p.nome AS nome_professor
            FROM agendamentos a
            JOIN professores p ON a.id_professor = p.id_professor
            WHERE a.id_sala = @id_sala AND a.data_reservas = @data
            AND (
                (a.hora_inicio < @hora_fim AND a.hora_fim > @hora_inicio)
            )
        `);

    return result.recordset;
}







// rota que lista o agendamento - tem q modificar algumas coisas
router.get('/listar-agendamentos/:id_Sala', async (req, res) => {
    const { id_Sala } = req.params;
    const hoje = new Date(); // Obtemos a data atual
    const dataAtual = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    try {
        let result = await pool.request()
            .input('id_Sala', sql.Int, id_Sala)
            .input('dataAtual', sql.Date, dataAtual) // Adicionamos o parâmetro da data
            .query(`
                SELECT 
                    a.id_agendamento, 
                    a.data_reservas, 
                    a.hora_inicio, 
                    a.hora_fim, 
                    p.nome,
                    a.motivo,
                    a.tipo_aula
                FROM agendamentos a
                JOIN professores p ON a.id_professor = p.id_professor
                WHERE a.id_sala = @id_Sala
                  AND CAST(a.data_reservas AS DATE) = @dataAtual -- Filtra apenas agendamentos do dia atual
                ORDER BY a.hora_inicio; 
            `);
        
        if (result.recordset.length === 0) {
            // Retornar uma resposta que indica não haver agendamentos
            return res.status(204).send('Não há agendamentos para esta sala hoje.');
        }

        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar agendamentos:', error);
        res.status(500).send('Erro ao listar agendamentos.');
    }
});
// Rota para listar agendamentos do professor específico
router.get('/listar-agendamentos/:id_professor', async (req, res) => {
    console.log('Resposta do servidor:', await response.text()); 
    const { id_professor } = req.params;

    try {
        const result = await pool.request()
            .input('id_professor', sql.Int, id_professor)
            .query('SELECT * FROM agendamentos WHERE id_professor = @id_professor');

        if (result.recordset.length === 0) {
            return res.json([]); // Retorna um JSON vazio
        }

        res.json(result.recordset); // Retorna os dados em formato JSON
    } catch (error) {
        console.error('Erro ao listar agendamentos:', error);
        res.status(500).send('Erro ao listar agendamentos.');
    }
});
// Rota para listar agendamentos do professor logado
// Rota para listar agendamentos do professor logado
router.get('/listar-agendamentos-professor-logado', async (req, res) => {
    const id_professor = req.session.user?.id_professor;

    if (!id_professor) {
        return res.status(401).send('Usuário não autenticado.');
    }

    try {
        const result = await pool.request()
            .input('id_professor', sql.Int, id_professor)
            .query(`
                SELECT a.*, s.nome_sala 
                FROM agendamentos a 
                JOIN Salas s ON a.id_sala = s.id_sala 
                WHERE a.id_professor = @id_professor
            `);

        const agendamentos = result.recordset || [];
        res.json(agendamentos); // Retorna o JSON com os agendamentos do professor logado
    } catch (error) {
        console.error('Erro ao listar agendamentos do professor:', error);
        return res.status(500).send('Erro ao listar agendamentos do professor.');
    }
});



// exclui agenda
router.delete('/excluir-agendamento/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Recebido pedido para excluir agendamento com ID: ${id}`);
    try {
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM agendamentos WHERE id_agendamento = @id');
        res.sendStatus(200);
        console.log(`Agendamento com ID: ${id} excluído com sucesso.`);
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        res.status(500).send('Erro ao excluir agendamento.');
    }
});
// Rota para excluir agendamentos em um intervalo de datas para uma unidade específica
router.delete('/excluir-agendamentos-intervalo', async (req, res) => {
    const { codigoUnidade, dataInicio, dataFim } = req.body;

    try {
        await pool.request()
            .input('codigoUnidade', sql.NVarChar, codigoUnidade)
            .input('dataInicio', sql.Date, dataInicio)
            .input('dataFim', sql.Date, dataFim)
            .query(`
                DELETE FROM agendamentos 
                WHERE data_reservas BETWEEN @dataInicio AND @dataFim 
                AND id_sala IN (SELECT id_sala FROM Salas WHERE codigo_unidade = @codigoUnidade)
            `); // Aqui subconsulta para garantir que é da unidade correta

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao excluir agendamentos no intervalo:', error);
        res.status(500).send('Erro ao excluir agendamentos.');
    }
});



// feito ok
// Rota para listar todos os agendamentos de uma unidade
router.get('/listar-agendamento/:unidadeCodigo', async (req, res) => {
    const { unidadeCodigo } = req.params;
    try {
        const result = await pool.request()
            .input('unidadeCodigo', sql.NVarChar, unidadeCodigo)
            .query(`
                SELECT a.id_agendamento, a.data_reservas, a.hora_inicio, a.hora_fim, s.nome_sala, p.nome, a.motivo, a.tipo_aula
                FROM agendamentos a
                JOIN salas s ON a.id_sala = s.id_sala
                JOIN professores p ON a.id_professor = p.id_professor
                WHERE s.codigo_unidade = @unidadeCodigo
                ORDER BY a.data_reservas, a.hora_inicio; -- Ordenar por data e hora
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar agendamentos:', error);
        res.status(500).send('Erro ao listar agendamentos.');
    }
});


// Rota para listar agendamentos filtrados
router.get('/listar-agendamentos-filtrados', async (req, res) => {
    const { unidadeCodigo, professor, dataInicio, dataFim, sala } = req.query;
    try {
        // Cria a consulta SQL dinâmica
        let query = `
            SELECT a.id_agendamento, s.nome_sala, p.nome, a.data_reservas, a.hora_inicio, a.hora_fim, a.motivo, a.tipo_aula
            FROM agendamentos a
            JOIN salas s ON a.id_sala = s.id_sala
            JOIN professores p ON a.id_professor = p.id_professor
            WHERE s.codigo_unidade = @unidadeCodigo
        `;
        
        if (professor) {
            query += ` AND p.nome LIKE '%' + @professor + '%'`;
        }
        
        if (dataInicio) {
            query += ` AND a.data_reservas >= @dataInicio`;
        }

        if (dataFim) {
            query += ` AND a.data_reservas <= @dataFim`;
        }

        if (sala) {
            query += ` AND s.nome_sala LIKE '%' + @sala + '%'`;
        }
        
        // Executando a consulta
        const result = await pool.request()
            .input('unidadeCodigo', sql.NVarChar, unidadeCodigo)
            .input('professor', sql.NVarChar, professor || '')
            .input('dataInicio', sql.NVarChar, dataInicio || '')
            .input('dataFim', sql.NVarChar, dataFim || '')
            .input('sala', sql.NVarChar, sala || '')
            .query(query);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar agendamentos filtrados:', error);
        res.status(500).send('Erro ao listar agendamentos filtrados.');
    }
});


// Rota para buscar programas associados a uma sala esta feito ok
router.get('/programas/:idSala', async (req, res) => {
    const { idSala } = req.params;
    try {
        let result = await pool.request()
            .input('idSala', sql.Int, idSala)
            .query(`
                SELECT p.id_programa, p.nome_programa, p.versao 
                FROM Programas p 
                JOIN SalaPrograma sp ON p.id_programa = sp.id_programa 
                WHERE sp.id_sala = @idSala
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Erro ao obter programas da sala:', err);
        res.status(500).send(err.message);
    }
});

// Rota para criar unidade e salas  feito
router.post('/criar-unidade-salas', async (req, res) => {
    const { nomeUnidade, codigoUnidade, salas } = req.body;

    try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const queryUnidade = `
                INSERT INTO Unidades (nome_unidade, codigo_unidade)
                VALUES (@nomeUnidade, @codigoUnidade);
            `;
            await transaction.request()
                .input('nomeUnidade', sql.NVarChar, nomeUnidade)
                .input('codigoUnidade', sql.NVarChar, codigoUnidade)
                .query(queryUnidade);

            for (const nomeSala of salas) {
                const querySala = `
                    INSERT INTO Salas (nome_sala, codigo_unidade)
                    VALUES (@nomeSala, @codigoUnidade);
                `;
                await transaction.request()
                    .input('nomeSala', sql.NVarChar, nomeSala)
                    .input('codigoUnidade', sql.NVarChar, codigoUnidade)
                    .query(querySala);
            }

            await transaction.commit();
            res.status(200).send('Unidade e salas criadas com sucesso!');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Erro ao criar unidade e salas:', error);
        res.status(500).send('Erro ao criar unidade e salas.');
    }
});
//criado uma rota para excluir a sala
router.delete('/deletar-sala/:idSala', async (req, res) => {
    const { idSala } = req.params;
    try {
        await pool.request()
            .input('idSala', sql.Int, idSala)
            .query('DELETE FROM Salas WHERE id_sala = @idSala');
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao excluir sala:', error);
        res.status(500).send('Erro ao excluir sala.');
    }
});
// Rota para renomear uma sala
router.post('/renomear-sala', async (req, res) => {
    const { idSala, novoNomeSala } = req.body;

    if (!idSala || !novoNomeSala) {
        return res.status(400).send('ID da sala e novo nome da sala são obrigatórios.');
    }

    try {
        const query = `
            UPDATE Salas
            SET nome_sala = @novoNomeSala
            WHERE id_sala = @idSala
        `;

        const request = pool.request();
        request.input('idSala', sql.Int, idSala);
        request.input('novoNomeSala', sql.NVarChar, novoNomeSala);

        await request.query(query);
        res.sendStatus(200); // Resposta de sucesso
    } catch (error) {
        console.error('Erro ao renomear sala:', error);
        res.status(500).send('Erro ao renomear sala.');
    }
});

// Rota para alterar a sala
router.post('/alterarSala', upload.single('image'), async (req, res) => {
    const idSala = req.body.idSala;
    const cadeiras = req.body.cadeiras;
    const computadores = req.body.computadores;
    const quadroBranco = req.body.quadroBranco;
    const telaProjetor = req.body.telaProjetor;
    const tv = req.body.tv;
    const area = req.body.area;
    const projetor = req.body.projetor;
    const maquinario = req.body.maquinario;

    const imageFilePath = req.file ? `/imagens/${req.file.filename}` : null;

    try {
        let query = `
            UPDATE Salas
            SET cadeiras = @cadeiras,
                computadores = @computadores,
                quadro_branco = @quadroBranco,
                tela_projetor = @telaProjetor,
                tv = @tv,
                area = @area,
                projetor = @projetor,
                maquinario = @maquinario
        `;
        if (imageFilePath) {
            query += `, imagem = @imageFilePath `;
        }
        query += ` WHERE id_sala = @idSala`;

        const request = pool.request();
        request.input('idSala', sql.Int, idSala);
        request.input('cadeiras', sql.Int, cadeiras);
        request.input('computadores', sql.Int, computadores);
        request.input('quadroBranco', sql.NVarChar(100), quadroBranco);
        request.input('telaProjetor', sql.NVarChar(100), telaProjetor);
        request.input('tv', sql.NVarChar(100), tv);
        request.input('area', sql.NVarChar(100), area);
        request.input('projetor', sql.NVarChar(100), projetor);
        request.input('maquinario', sql.NVarChar(100), maquinario);
        if (imageFilePath) {
            request.input('imageFilePath', sql.NVarChar(255), imageFilePath);
        }

        await request.query(query);
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao atualizar os dados da sala:', error);
        res.status(500).send('Erro ao alterar os dados da sala: ' + error.message);
    }
});



// rota que lida para nova sala a ser adicionada
router.post('/adicionar-sala', async (req, res) => {
    const { codigoUnidade, nomeSala } = req.body;
    try {
        await pool.request()
            .input('codigoUnidade', sql.NVarChar, codigoUnidade)
            .input('nomeSala', sql.NVarChar, nomeSala)
            .query('INSERT INTO Salas (nome_sala, codigo_unidade) VALUES (@nomeSala, @codigoUnidade)');
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao adicionar sala:', error);
        res.status(500).send('Erro ao adicionar sala.');
    }
});

// Rota para listar unidades e salas esta feito
router.get('/listar-unidades-salas', async (req, res) => {
    try {
        const query = `
            SELECT u.nome_unidade AS nome, u.codigo_unidade AS codigo,
                   s.nome_sala AS sala
            FROM Unidades u
            LEFT JOIN Salas s ON u.codigo_unidade = s.codigo_unidade
            ORDER BY u.nome_unidade, s.nome_sala;
        `;
        const result = await pool.request().query(query);

        const unidadesSalas = [];
        let unidadeAtual = null;
        for (const row of result.recordset) {
            if (row.nome !== unidadeAtual) {
                unidadeAtual = row.nome;
                unidadesSalas.push({ nome: row.nome, codigo: row.codigo, salas: [] });
            }
            unidadesSalas[unidadesSalas.length - 1].salas.push(row.sala);
        }

        res.json(unidadesSalas);
    } catch (error) {
        console.error('Erro ao obter a lista de unidades e salas:', error);
        res.status(500).send('Erro ao obter a lista de unidades e salas.');
    }
});

// Rota para listar unidades esta feito
router.get('/listar-unidades', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT codigo_unidade AS codigo, nome_unidade AS nome FROM Unidades');
        res.json(result.recordset);
    } catch (err) {
        console.error('Erro ao listar unidades:', err);
        res.status(500).send('Erro ao listar unidades');
    }
});

// Rota para renomear unidade feito ok
router.post('/renomear-unidade', async (req, res) => {
    const { codigoUnidade, novoNomeUnidade } = req.body;
    try {
        await pool.request()
            .input('codigoUnidade', sql.NVarChar, codigoUnidade)
            .input('novoNomeUnidade', sql.NVarChar, novoNomeUnidade)
            .query(`
                UPDATE Unidades
                SET nome_unidade = @novoNomeUnidade
                WHERE codigo_unidade = @codigoUnidade
            `);
        res.sendStatus(200);
    } catch (err) {
        console.error('Erro ao renomear unidade:', err);
        res.status(500).send('Erro ao renomear unidade');
    }
});

// Rota para remover unidade e suas salas associadas feito ok
router.post('/remover-unidade', async (req, res) => {
    const { codigoUnidade } = req.body;

    try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request()
                .input('codigoUnidade', sql.NVarChar, codigoUnidade)
                .query('DELETE FROM Salas WHERE codigo_unidade = @codigoUnidade');

            await transaction.request()
                .input('codigoUnidade', sql.NVarChar, codigoUnidade)
                .query('DELETE FROM Unidades WHERE codigo_unidade = @codigoUnidade');

            await transaction.commit();
            res.sendStatus(200);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Erro ao remover unidade:', err);
        res.status(500).send('Erro ao remover unidade');
    }
});

// Rota para adicionar um novo programa feito ok
router.post('/adicionarPrograma', async (req, res) => {
    const { nomePrograma, versao } = req.body;
    try {
        const query = `
            INSERT INTO programas (nome_programa, versao)
            VALUES (@nomePrograma, @versao)
        `;
        await pool.request()
            .input('nomePrograma', sql.NVarChar(50), nomePrograma)
            .input('versao', sql.NVarChar(50), versao)
            .query(query);
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao adicionar o programa:', error);
        res.status(500).send('Erro ao adicionar o programa.');
    }
});
// insere nova sala na unidade existente tem que arrumar este codigo 
router.post('form-adicionar-salas', async (req, res) =>{
    const {unidadeAdicionarSala,  novaSala} = req.body;

    try{
        //Inicio
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try{
            for(const nomeSala of novaSala){
                // inserir nova sala
                const querySala = `
                INSERT INTO SALAS (nome_sala)
                values (@novaSala, @codigoUnidade)`; 
                
                await transaction.request()
                .input('nomeSala', sql.NVarChar, nomeSala)
                .input('codigoUnidade', sql.NVarChar, unidadeAdicionarSala)
                .query(querySala);
            }
            
                // Comitar a transação
                await transaction.commit();
                res.status(200).send('Salas criadas com sucesso!');

        }catch (error) {
            // Desfazer a transação em caso de erro
            await transaction.rollback();
            throw error; // Rethrow para tratar no bloco de erro externo
        }   
    }catch (error) {
        console.error('Erro ao criar salas:', error);
        res.status(500).send('Erro ao criar salas.');

    }
});

// Rota para excluir programas selecionados feito ok
router.post('/excluirProgramas', async (req, res) => {
    const { programas } = req.body;
    if (!Array.isArray(programas) || programas.length === 0) {
        return res.status(400).send('Nenhum programa selecionado para exclusão');
    }
    try {
        const query = `DELETE FROM programas WHERE id_programa IN (${programas.map(programa => parseInt(programa, 10)).join(',')})`;
        await pool.request().query(query);
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao excluir programas:', error);
        res.status(500).send('Erro ao excluir programas.');
    }
});

// Rota para obter a lista de programas adicionados feito ok
router.get('/programasAdicionados', async (req, res) => {
    try {
        const query = 'SELECT id_programa, nome_programa, versao FROM programas';
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao obter programas adicionados:', error);
        res.status(500).send('Erro ao obter programas adicionados.');
    }
});

// Rota para obter salas pelas unidades do professor logado
router.get('/salas', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Usuário não autenticado.');
    }

    const unidades = req.session.user.unidades; // As unidades associadas ao usuário

    try {
        if (!unidades || unidades.length === 0) {
            return res.status(404).send('Nenhuma unidade associada encontrada para o usuário.');
        }

        // Criando placeholders e preparando a consulta
        const placeholders = unidades.map((_, i) => `@unidade${i}`).join(', ');
        const request = pool.request();

        // Adicionando cada parâmetro à consulta
        unidades.forEach((unidade, i) => {
            request.input(`unidade${i}`, sql.NVarChar, unidade);
        });

        const result = await request.query(`
            SELECT s.id_sala, s.nome_sala, u.nome_unidade, u.codigo_unidade 
            FROM Salas s 
            JOIN Unidades u ON s.codigo_unidade = u.codigo_unidade 
            WHERE u.codigo_unidade IN (${placeholders})
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao buscar as salas:', error);
        res.status(500).send('Erro ao buscar as salas');
    }
});

// Rota para verificar salas disponíveis
router.get('/salas-disponiveis', async (req, res) => {
    const { data, hora_inicio, hora_fim, codigo_unidade } = req.query;

    // Validações de parâmetros
    if (!data || !hora_inicio || !hora_fim || !codigo_unidade) {
        return res.status(400).send('Todos os parâmetros de data, hora e unidade são obrigatórios.');
    }

    const datas = data.split(',').map(d => d.trim()); // Divide múltiplas datas

    try {
        const resultados = [];

        for(const dataSelecionada of datas) {
            const query = `
                SELECT s.id_sala, s.nome_sala,   
                       CASE 
                           WHEN a.data_reservas IS NULL THEN @dataSelecionada 
                           ELSE NULL 
                       END as data_disponivel
                FROM Salas s
                LEFT JOIN Agendamentos a ON s.id_sala = a.id_sala
                AND a.data_reservas = @dataSelecionada
                AND (
                    (a.hora_inicio < @hora_fim AND a.hora_fim > @hora_inicio)
                )
                WHERE s.codigo_unidade = @codigo_unidade
            `;

            const request = pool.request();
            request.input('hora_inicio', sql.NVarChar, hora_inicio);
            request.input('hora_fim', sql.NVarChar, hora_fim);
            request.input('codigo_unidade', sql.NVarChar, codigo_unidade);
            request.input('dataSelecionada', sql.NVarChar, dataSelecionada);

            const result = await request.query(query);
            // Adiciona as salas ao resultado
            result.recordset.forEach(sala => {
                let salaIndex = resultados.findIndex(r => r.id_sala === sala.id_sala);
                if(salaIndex === -1) {
                    sala.datas_disponiveis = (sala.data_disponivel) ? [sala.data_disponivel] : [];
                    resultados.push(sala);
                } else {
                    if(sala.data_disponivel) {
                        resultados[salaIndex].datas_disponiveis.push(sala.data_disponivel);
                    }
                }
            });
        }

        // Apenas retorna salas com datas disponíveis
        resultados.forEach(r => {
            r.datas_disponiveis = [...new Set(r.datas_disponiveis)]; // Remove duplicatas
        });

        // Gerar o retorno
        res.json({ salasDisponiveis: resultados.filter(sala => sala.datas_disponiveis.length > 0) });
    } catch (error) {
        console.error('Erro ao verificar salas disponíveis:', error);
        res.status(500).send('Erro ao verificar salas disponíveis.');
    }
});



// PUDER VERIFICAR ISSO e mesclar a busca feito ok
router.get('/listasSalas', async (req, res) => {
    try {
      const result = await sql.query`
        SELECT s.id_sala, s.nome_sala, u.nome_unidade, u.codigo_unidade 
        FROM Salas s 
        JOIN Unidades u ON s.codigo_unidade = u.codigo_unidade
      `;
      res.json(result.recordset);
    } catch (error) {
      console.error('Erro ao buscar as salas:', error);
      res.status(500).send('Erro ao buscar as salas');
    }
  });
  // Endpoint para buscar os programas feito ok
  router.get('/listaProgramas', async (req, res) => {
    try {
      const result = await sql.query`SELECT id_programa, nome_programa, versao FROM Programas`;
      res.json(result.recordset);
    } catch (error) {
      console.error('Erro ao buscar os programas:', error);
      res.status(500).send('Erro ao buscar os programas');
    }
  });

// Rota para buscar programas associados a uma sala feito ok
router.get('/programas-sala/:id_sala', async (req, res) => {
    const { id_sala } = req.params;
    try {
        const query = `SELECT p.id_programa, p.nome_programa, p.versao FROM Programas p JOIN SalaPrograma sp ON p.id_programa = sp.id_programa WHERE sp.id_sala = @id_sala`;
        const result = await pool.request().input('id_sala', sql.Int, id_sala).query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao buscar programas associados à sala:', error);
        res.status(500).send('Erro ao buscar programas associados à sala');
    }
});

// Rota para associar sala e programa feito ok
router.post('/associar-sala-programa', async (req, res) => {
    const { sala, programas } = req.body;
    try {
        for (const programa of programas) {
            const query = `INSERT INTO SalaPrograma (id_sala, id_programa) VALUES (@sala, @programa)`;
            await pool.request().input('sala', sql.Int, sala).input('programa', sql.Int, programa).query(query);
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao associar sala e programa:', error);
        res.status(500).send('Erro ao associar sala e programa');
    }
});

// Rota para desassociar sala e programa feito ok
router.post('/desassociar-sala-programa', async (req, res) => {
    const { sala, programas } = req.body;
    try {
        for (const programa of programas) {
            const query = `DELETE FROM SalaPrograma WHERE id_sala = @sala AND id_programa = @programa`;
            await pool.request().input('sala', sql.Int, sala).input('programa', sql.Int, programa).query(query);
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao desassociar sala e programa:', error);
        res.status(500).send('Erro ao desassociar sala e programa');
    }
});

//rota prof
router.get('/listar-professores-por-unidade/:codigoUnidade', async (req, res) => {
    const { codigoUnidade } = req.params;

    try {
        const result = await pool.request()
            .input('codigo_unidade', sql.NVarChar, codigoUnidade)
            .query(`
                SELECT p.id_professor, p.nome, p.login, p.matricula
                FROM professores p
                JOIN ProfessorUnidade pu ON p.id_professor = pu.id_professor
                WHERE pu.codigo_unidade = @codigo_unidade
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar professores por unidade:', error);
        res.status(500).send('Erro ao listar professores.');
    }
});
// esta rota mostra geranciar agendamnetos botao editar

// Rota para listar todos os professores
router.get('/listar-todos-professores', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT p.id_professor, p.nome, p.login, p.matricula FROM professores p');

        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar todos os professores:', error);
        res.status(500).send('Erro ao listar professores.');
    }
});
// Rota para listar todos os tipos de aula
router.get('/listar-todos-tipos-aula', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT ta.id_tipo_aula, ta.descricao FROM tipos_aula ta');

        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar todos os tipos de aula:', error);
        res.status(500).send('Erro ao listar tipos de aula.');
    }
});



router.get('/listar-salas/:unidadeCodigo', async (req, res) => {
    const { unidadeCodigo } = req.params;
    try {
        let result = await pool.request()
            .input('unidadeCodigo', unidadeCodigo)
            .query(`
                SELECT id_sala, nome_sala
                FROM salas
                WHERE codigo_unidade = @unidadeCodigo
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar salas:', error);
        res.status(500).send('Erro ao listar salas.');
    }
});
// Rota para criar um novo professor
/*
router.post('/adicionar-professor', async (req, res) => {
    const { nome, matricula, codigo_unidade } = req.body;
    try {
        
        const result = await pool.request()
            .input('matricula', sql.NVarChar(20), matricula)
            .input('codigo_unidade', sql.NVarChar(10), codigo_unidade)
            .query(`
                SELECT COUNT(*) AS count 
                FROM professores 
                WHERE matricula = @matricula AND codigo_unidade = @codigo_unidade
            `);

        if (result.recordset[0].count > 0) {
            return res.status(409).send('Matrícula já cadastrada nesta unidade.');
        }

        const query = `
            INSERT INTO professores (nome, matricula, codigo_unidade)
            VALUES (@nome, @matricula, @codigo_unidade)
        `;
        await pool.request()
            .input('nome', sql.NVarChar(100), nome)
            .input('matricula', sql.NVarChar(20), matricula)
            .input('codigo_unidade', sql.NVarChar(10), codigo_unidade)
            .query(query);

        res.status(201).send('Professor adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar professor:', error);
        res.status(500).send('Erro ao adicionar professor.');
    }
});

// Rota para listar professores por unidade
router.get('/listar-professores-por-unidade/:codigoUnidade', async (req, res) => {
    const { codigoUnidade } = req.params;
    try {
        const result = await pool.request()
            .input('codigoUnidade', sql.NVarChar, codigoUnidade)
            .query(`SELECT id_professor, nome, matricula FROM professores WHERE codigo_unidade = @codigoUnidade`);
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar professores:', error);
        res.status(500).send('Erro ao listar professores.');
    }
});
*/
//rota para excluir cadastro e tbm ela remove a associação
router.delete('/excluir-professor/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Primeiro, remover associações na tabela ProfessorUnidade
        await pool.request()
            .input('id_professor', sql.Int, id)
            .query('DELETE FROM ProfessorUnidade WHERE id_professor = @id_professor');

        // Depois, excluir o professor da tabela professores
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM professores WHERE id_professor = @id');

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro ao excluir professor:', error.message); // Log mais claro
        res.status(500).send('Erro ao excluir professor.');
    }
});
// Rota para obter a lista de computadores
router.get('/infocomputadores', async (req, res) => {
    try {
        // Conectar ao banco de dados e realizar a consulta
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT TOP (1000) [id], 
                               [nome_computador],
                               [SerialNumber],
                               [endereco_mac], 
                               [patrimonio], 
                               [data_registro], 
                               [nomes_programas], 
                               [cpu_info], 
                               [endereco_ip],
                               [disco_info] 
            FROM [ProjetoSenai2.0].[dbo].[computadores]
        `);

        // Retornar os dados em formato JSON
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao buscar dados dos computadores:', error);
        res.status(500).send('Erro ao buscar dados dos computadores.');
    }
});



// Função para remover acentos
const removeAccents = (string) => {
    return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// routes/router.js (ou onde quer que tenha as rotas)
router.post('/api/chat', async (req, res) => {
    const { text: originalText } = req.body;
    let responseText;

    try {
        const text = removeAccents(originalText.toLowerCase());

        // Inicializa opção do Fuse.js
        const options = {
            includeScore: true,
            keys: ['nome_unidade'] // Chave na qual Fuse.js deve buscar
        };

        // Reconhecendo saudações e outras intenções
        if (text.includes('bom dia') || text.includes('boa tarde') || text.includes('boa noite')) {
            responseText = 'Olá! Como posso ajudá-lo hoje?';
        } else if (text.includes('programa')) {
            responseText = 'Claro! Primeiro, qual unidade você gostaria de saber? Aqui estão as unidades disponíveis: SENAI Cypriano Micheletto - Canoas, SENAI Ney Damasceno Ferreira - Gravataí, SENAI Visconde de Mauá - Porto Alegre, SENAI Comendador Clemente Cífali - Cachoerinha.';
        } else if (text.includes('salas')) {
            const unidades = await pool.request().query('SELECT nome_unidade FROM Unidades');
            const unidadeList = unidades.recordset.map(u => ({ nome_unidade: u.nome_unidade }));
            responseText = `Aqui estão as unidades disponíveis: ${unidadeList.map(u => `<a href="#" class="link-unidade">${u.nome_unidade}</a>`).join(', ')}. Por favor, escolha uma unidade para saber mais sobre as salas.`;
        } else if (text.includes('senai')) {
            const unidades = await pool.request().query('SELECT nome_unidade FROM Unidades');
            const unidadeList = unidades.recordset.map(u => ({ nome_unidade: u.nome_unidade }));
            const fuse = new Fuse(unidadeList, options);
            const results = fuse.search(text);
        
            if (results.length > 0) {
                const unidadeEspecifica = results[0].item.nome_unidade;
        
                // Aqui fazemos a declaração correta da variável e passamos o valor
                const salas = await pool.request()
                    .input('nome_unidade', sql.NVarChar, unidadeEspecifica) // Declarar a variável
                    .query(`SELECT id_sala, nome_sala FROM Salas WHERE codigo_unidade = (SELECT codigo_unidade FROM Unidades WHERE nome_unidade = @nome_unidade)`); // Usar a variável
        
                const salaList = salas.recordset;
        
                if (salaList.length > 0) {
                    const salasDisponiveis = salaList.map(s => `<a href="#" class="link-sala" data-id="${s.id_sala}">${s.nome_sala}</a>`).join(', ');
                    responseText = `Você selecionou ${unidadeEspecifica}. Aqui estão as salas disponíveis: ${salasDisponiveis}. Por favor, escolha uma sala.`;
                } else {
                    responseText = `A unidade ${unidadeEspecifica} não possui salas disponíveis.`;
                }
            } else {
                responseText = `Desculpe, não reconheço essa unidade.`;
            }
            }else if (text.includes('sala')) { 
                const salaEscolhida = originalText.toLowerCase().split('sala')[1]?.trim();
        
            if (salaEscolhida) {
                console.log(`Buscando sala: ${salaEscolhida}`); // Adicione este log
        
                const salaDetails = await pool.request()
                .input('nome_sala', sql.NVarChar, salaEscolhida) // Passa o nome da sala como parâmetro
                .query(`SELECT * FROM Salas WHERE LOWER(nome_sala) = LOWER(@nome_sala)`);


        
                if (salaDetails.recordset.length > 0) {
                    const details = salaDetails.recordset[0];
        
                    responseText = `
                        Informações da Sala: <br>
                        <strong>Nome:</strong> ${details.nome_sala || 'N/A'}<br>
                        <strong>Cadeiras:</strong> ${details.cadeiras || 'N/A'}<br>
                        <strong>Computadores:</strong> ${details.computadores || 'N/A'}<br>
                        <strong>Quadro Branco:</strong> ${details.quadro_branco || 'N/A'}<br>
                        <strong>Tela Projetor:</strong> ${details.tela_projetor || 'N/A'}<br>
                        <strong>Projetor:</strong> ${details.projetor || 'N/A'}<br>
                        <strong>TV:</strong> ${details.tv || 'N/A'}<br>
                        <strong>Área:</strong> ${details.area || 'N/A'}<br>
                        <strong>Recursos didáticos:</strong> ${details.maquinario || 'N/A'}<br>
                        ${details.imagem ? `<img src="${details.imagem}" alt="Imagem da Sala" style="max-width: 600px; max-height: 200px;">` : 'N/A'}
                    `;
                } else {
                    responseText = `Desculpe, não encontrei informações para a sala "${salaEscolhida}".`;
                }
            }else {
                responseText = 'Por favor, selecione uma sala válida.';
            }
        }
        
        else {
            responseText = 'Desculpe, não entendi sua pergunta. Eu posso informar sobre programas e salas. Você pode começar perguntando algo como "Quero saber sobre programas" ou "Quais são as salas disponíveis?".';
        }

        res.json({ response: responseText });
    } catch (error) {
        console.error('Erro ao processar a mensagem do chatbot:', error);
        res.status(500).json({ response: 'Erro ao processar a mensagem' });
    }
});



module.exports = router;


const cron = require('node-cron');

const sql = require('mssql');

async function getPool() {
    // Usa a conexão pool do index.js
    const pool = await sql.connect(connectToDatabase.config); // Conecta conforme a configuração
    return pool;
}

async function verificarEExcluirAgendamentosExpirados() {
    const now = new Date();
    const pool = await connectToDatabase();

    try {
        const result = await pool.request().query(`
            SELECT id_agendamento, data_fim, hora_fim
            FROM agendamentos
        `);

        // Iteração sobre os agendamentos para verificar e excluir 
        for (const agendamento of result.recordset) {
            const dataFimParts = agendamento.data_fim.split('/');
            const horaFimParts = agendamento.hora_fim.split(':');

            const dataFimDate = new Date(Date.UTC(dataFimParts[2], dataFimParts[1] - 1, dataFimParts[0], horaFimParts[0], horaFimParts[1], horaFimParts[2] || 0));

            if (now >= dataFimDate) {
                await excluirAgendamento(agendamento.id_agendamento, pool);
                console.log(`Agendamento ${agendamento.id_agendamento} excluído com sucesso!`);
            }
        }

    } catch (error) {
        console.error('Erro ao verificar e excluir agendamentos expirados:', error);
    }
}

async function excluirAgendamento(agendamentoId, pool) {
    try {
        await pool.request()
            .input('id', sql.Int, agendamentoId)
            .query('DELETE FROM agendamentos WHERE id_agendamento = @id');
    } catch (error) {
        console.error('Erro ao excluir agendamento expirado:', error);
    }
}

// Agendar para rodar a função de verificação a cada minuto
cron.schedule('* * * * *', async () => {
    console.log('Verificando agendamentos expirados...');
    await verificarEExcluirAgendamentosExpirados();
});

module.exports = {
    verificarEExcluirAgendamentosExpirados,
    excluirAgendamento
};

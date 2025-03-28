const express = require('express');
const session = require('express-session'); 
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurando sessões
app.use(session({
    secret: 'segredo-seguro',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 600000 } // 10 minutos
}));

// Middleware de autenticação
function checkAuth(req, res, next) {
    // Verifica se o usuário está autenticado
    if (req.session.user) {
        return next(); // Permitir acesso se autenticado
    } else {
        // Redireciona para a página de login se não estiver autenticado
        res.redirect('/html/login.html');
    }
}


// Middleware de verificação de permissões para admin e coordenadores
function checkPermissions(req, res, next) {
    const { permissao } = req.session.user || {};
    if (permissao === 'admin') {
        return next(); // Acesso total para admin
    } else if (permissao === 'coordenador') {
        // Rotas restritas para coordenadores
        const restrictedPages = [
            'adicionaprogramas.html',
            'adicionaunidade.html'
        ];
        if (restrictedPages.includes(req.path.split('/').pop())) {
            return res.status(403).send('Acesso negado.'); // Acesso negado para essas páginas
        }
        return next(); // Permite acesso para outras páginas
    } else {
        res.status(403).send('Acesso negado.'); // Acesso negado para usuários não autenticados
    }
}


// Rota para o index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Tornar a página de login acessível sem autenticação
app.get('/html/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/login.html'));
});
// Rota para tornar htmltestesdeproducao.html acessível publicamente
app.get('/html/agendamentos.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/agendamentos.html'));
});
// Rota para tornar infocomputadores.html acessível publicamente
app.get('/html/infocomputadores.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/infocomputadores.html'));
});
// Rota para tornar agendas-api.html acessível publicamente
app.get('/html/agendas-api.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/agendas-api.html'));
});

// Rota protegida para agendasala (acesso a qualquer usuário autenticado)
app.get('/html/agendasala.html', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/agendasala.html'));
});

// Proteger as rotas que não devem ser acessadas por usuários comuns
const protectedRoutes = [
    'adicionaprogramas.html',
    'adicionaunidade.html',
    'alteraagenda.html',
    'alteradados.html',
    'cadastro.html',
    'dashboard.html',
    'dashboard-coordenador.html',
    'unidadescurriculares.html'
];

// Proteger as rotas para admin e coordenadores
protectedRoutes.forEach(route => {
    app.get(`/html/${route}`, checkAuth, checkPermissions, (req, res) => {
        res.sendFile(path.join(__dirname, `public/html/${route}`));
    });
});

// Servir arquivos estáticos normalmente
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));

// Importando e usando as rotas
const routes = require('./routes');
app.use(routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});

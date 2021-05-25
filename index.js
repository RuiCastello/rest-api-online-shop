/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

require('dotenv').config();

const express = require("express");
const mongoose = require('mongoose');
// const bodyParser = require('body-parser')
const models = require('./models')(mongoose);
const controllers = require('./controllers').init(models);
const morgan = require('morgan');
const cors = require('cors');
const routes = require('./routes');

let app = express();

app.set('view engine', 'pug');

// Hoje em dia já não é necesário usar o body-parser com as novas versões do express, pois ele já vem com essa funcionalidade integrada.
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
//     extended: true
// }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Como lidar com CORS, como isto é um rest api que em teoria será usado por clientes fora do servidor, podemos relaxar as regras de cors para que todos os utilizadores tenham acesso aos endpoints do api
//Assim é como se lida com CORS manualmente:
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     if (req.method === 'OPTIONS'){
//         res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
//         return res.status(200).json({});
//     }
//     next();
// });
//E assim lida-se com CORS automaticamente usando o package cors do npm
app.use(cors());

//Morgan é um pacote com serviços de logging, aqui vamos usá-lo de forma simples para complementar a consola com informação pertinente para o desenvolvimento da nossa app:
app.use(morgan('dev'));


mongoose.connect(process.env.DATABASE, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

// Verificação da conexão.
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', () => console.log('connected'));

routes.init(app, express, models, controllers);

app.listen(process.env.PORT);
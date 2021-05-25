/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";
const { CustomShopError } = require('./CustomShopError');
const MongooseError = require('mongoose').Error;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const getMe = (req, res, next) => {
    const token = req.headers['x-token'];

    if (token == null) {
        let error = new CustomShopError('Não tem permissões para aceder a este endpoint, por favor faça login e tente novamente.');
        error.additionalInfo = {
            functionality: "Log-in",
            method: "POST",
            url: "/login",
        };
        error.status = 401;
        return next(error);
    }

    jwt.verify(token, process.env.SECRET, (error, user) => {
        if (error) {
            let error = new CustomShopError('Existe um problema com a autenticação, por favor certifique-se que enviou o token correto nos headers com a chave x-token e tente novamente');
            error.additionalInfo = {
                functionality: "Log-in",
                method: "POST",
                url: "/login",
            };
            error.status = 401;
            return next(error);
        }

        req.me = user;
        return next();
    })
}

const isAuthenticated = [
    getMe,
    (req, res, next) => {
        if (req.me) {
            next();
        } else {
            let error = new CustomShopError('Existe um problema com a autenticação, por favor certifique-se que enviou o token correto nos headers com a chave x-token e tente novamente');
            error.additionalInfo = {
                functionality: "Log-in",
                method: "POST",
                url: "/login",
            };
            error.status = 401;
            return next(error);
        }
    }
];

const isAdmin = [
    getMe,
    (req, res, next) => {
        if (req.me && req.me.role == 'ADMIN') {
            next();
        } else {
            let error = new CustomShopError('Não está autenticado numa conta com poderes de administração. O seu role atual é: ' + req.me.role);
            error.additionalInfo = {
                functionality: "Ver lista de produtos",
                method: "GET",
                url: "/products",
            };
            error.status = 401;
            return next(error);
        }
    }
];

const isCS = [
    getMe,
    (req, res, next) => {
        if (req.me && req.me.role == 'CS') {
            next();
        } else {
            let error = new CustomShopError('Não está autenticado numa conta com poderes de suporte ao cliente. O seu role atual é: ' + req.me.role);
            error.additionalInfo = {
                functionality: "Ver lista de produtos",
                method: "GET",
                url: "/products",
            };
            error.status = 401;
            return next(error);
        }
    }
];

const isProductManager = [
    getMe,
    (req, res, next) => {
        if (req.me && (req.me.role == 'CS' || req.me.role == 'ADMIN') ) {
            next();
        } else {
            let error = new CustomShopError('Não tem permissão para aceder a esta funcionalidade. Para tal precisa de estar logado numa conta com poderes de Administração ou de Suporte ao Cliente. O seu role atual é: ' + req.me.role);
            error.additionalInfo = {
                functionality: "Ver lista de produtos",
                method: "GET",
                url: "/products",
            };
            error.status = 401;
            return next(error);
        }
    }
];

const createToken = async (user) => {
    const { _id, role } = user;
    return await jwt.sign({_id, role}, process.env.SECRET, { expiresIn: '90m' });
}

const comparePassword = async (candidatePassword, userPassword) => {
    return await bcrypt.compare(candidatePassword, userPassword);
}

module.exports = {
    isAuthenticated,
    isAdmin,
    isCS,
    isProductManager,
    createToken,
    comparePassword,
}
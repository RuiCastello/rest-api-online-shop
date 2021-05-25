/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const models = require('../models')(mongoose);
const { Purchase, User, Product, Feedback, Comment, Category } = models;
const bcrypt = require('bcrypt');
const BSON = require('bson');
const { EJSON } = require('bson');

mongoose.connect(process.env.DATABASE, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

// Verificação da conexão.
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', () => console.log('connected'));


//Ler ficheiro EJSON com os dados
const users = EJSON.parse(fs.readFileSync(__dirname+'/users.json', 'utf-8'), { relaxed: false });
const categories = EJSON.parse(fs.readFileSync(__dirname+'/categories.json', 'utf-8'), { relaxed: false });
const comments = EJSON.parse(fs.readFileSync(__dirname+'/comments.json', 'utf-8'), { relaxed: false });
const products = EJSON.parse(fs.readFileSync(__dirname+'/products.json', 'utf-8'), { relaxed: false });
const purchases = EJSON.parse(fs.readFileSync(__dirname+'/purchases.json', 'utf-8'), { relaxed: false });
const feedbacks = EJSON.parse(fs.readFileSync(__dirname+'/feedbacks.json', 'utf-8'), { relaxed: false });

//Adicionar items à base de dados
const uploadData = async () => {
    try{

        // await mongoose.connection.collection('users').insertMany(users);
        // await mongoose.connection.collection('categories').insertMany(categories);
        // await mongoose.connection.collection('products').insertMany(products);
        // await mongoose.connection.collection('purchases').insertMany(purchases);
        // await mongoose.connection.collection('feedbacks').insertMany(feedbacks);
        // await mongoose.connection.collection('comments').insertMany(comments);

        // await User.collection.insertMany(users);

        await User.create(users, { validateBeforeSave: false });
        await Category.create(categories, { validateBeforeSave: false });
        await Product.create(products, { validateBeforeSave: false });
        await Purchase.create(purchases, { validateBeforeSave: false });
        await Feedback.create(feedbacks, { validateBeforeSave: false });
        await Comment.create(comments, { validateBeforeSave: false });

        let salt = await bcrypt.genSalt(10);
       
        let password = await bcrypt.hash('1234567', salt);
        
        await User.updateMany(
            { _id: { $exists: true } },
            { $set: { password: password } }
         );
          
        console.log('Dados inseridos com sucesso!');

        process.exit();
    }
    catch(error){
        console.log(error);
    }
}

uploadData();


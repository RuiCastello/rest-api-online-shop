/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict"; 

const ProductController = require('./ProductController');
const PurchaseController = require('./PurchaseController');
const UserController = require('./UserController.js');
const AuthController = require('./AuthController.js');
const errorController = require('./ErrorController.js');
const FeedbackController = require('./FeedbackController.js');
const CommentController = require('./CommentController.js');
const CategoryController = require('./CategoryController.js');

const getControllers = (models) => {
    const productController = new ProductController(models);
    const purchaseController = new PurchaseController(models);
    const userController = new UserController(models);
    const authController = new AuthController(models);
    const feedbackController = new FeedbackController(models);
    const commentController = new CommentController(models);
    const categoryController = new CategoryController(models);

    return { 
        purchaseController, 
        productController, 
        userController, 
        authController, 
        errorController,
        feedbackController,
        commentController,
        categoryController,
    }
}

module.exports.init = getControllers;
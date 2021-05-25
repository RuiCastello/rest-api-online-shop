/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const purchase = require('./purchaseModel');
const user = require('./userModel');
const product = require('./productModel');
const feedback = require('./feedbackModel');
const comment = require('./commentModel');
const category = require('./categoryModel');

module.exports = (mongoose) => {
    return {
        Purchase: purchase(mongoose),
        User: user(mongoose),
        Product: product(mongoose),
        Feedback: feedback(mongoose),
        Comment: comment(mongoose),
        Category: category(mongoose),
    }
}


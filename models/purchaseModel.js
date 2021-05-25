/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const validator = require('validator');

const purchase = (mongoose) => {
    const purchasesSchema = new mongoose.Schema(
        {
            products: 
            [
                {
                    quantity: {
                        type: Number,
                        required: false,
                        default: 1,
                        min:1
                    },
                    product:{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'product',
                        required: true,
                    }
                }
            ],
            paid: {
                type: Boolean,
                required: false,
                default: false,
            },
            buyer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
                required: true,
            },
            createdAt: {
                type: Date, 
                select: false
            },
	        updatedAt: {
                type: Date, select: false
            },
            __v: {
                type: Number,
                select:false
            }
        },
        {
            timestamps: true,
        }
    );

    purchasesSchema.post('save', function (doc, next) {
        if(doc.updatedAt) delete doc._doc.updatedAt;
        if(doc.createdAt) delete doc._doc.createdAt;
        if(doc.__v != null) delete doc._doc.__v;
        next();
    });

    const Purchase = mongoose.model(
        'purchase',
        purchasesSchema,
    );
    return Purchase;
}

module.exports = purchase;
/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const validator = require('validator');

const comment = (mongoose) => {
    const CommentsSchema = new mongoose.Schema(
        {
            comment: {
                type: String,
                required: true,
                minlength: [15, 'Os comentários têm de ter pelo menos 15 caracteres.'],
                trim: true,
            },
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
            },
            createdAt: {
                type: Date, 
                select: false
            },
	        updatedAt: {
                type: Date, 
                select: false
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

    CommentsSchema.post('save', function (doc, next) {
        if(doc.updatedAt) delete doc._doc.updatedAt;
        if(doc.createdAt) delete doc._doc.createdAt;
        if(doc.__v != null) delete doc._doc.__v;
        next();
    });

    const Comment = mongoose.model(
        'comment',
        CommentsSchema,
    );
    return Comment;
}

module.exports = comment;
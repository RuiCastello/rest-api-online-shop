/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const validator = require('validator');

const feedback = (mongoose) => {
    const FeedbacksSchema = new mongoose.Schema(
        {
            rating: {
                type: Number,
                required: [true, 'Por favor diga-nos o que achou deste produto atribuindo-lhe uma rating de 1 a 10'],
                trim: true,
                min: [1, 'A rating não pode ser inferior a 1'],
                max: [10, 'A rating não pode ser superior a 10'],
            },
            review: {
                type: String,
                required: false,
                minlength: [15, 'As reviews têm de ter pelo menos 15 caracteres.'],
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

    // Desnecessário porque basta fazer com que a rating seja "required" e temos o mesmo efeito.
    // FeedbacksSchema.path('review').validate(function (review) {
    //     if (!this.rating) return false;
    //     return true;
    //  }, 'Para enviar uma review sobre um produto é necessário atribuir-lhe uma rating de 1 a 10');

    //Se nenhum user for válido, isto limpa o field user para não aparecer nenhum "user" : null após o populate
    FeedbacksSchema.post(/^find/, function (doc, next) {
        if(doc && 'user' in doc && doc.user === null) delete doc._doc.user;
        next();
    });

    FeedbacksSchema.post('save', function (doc, next) {
        if(doc.updatedAt) delete doc._doc.updatedAt;
        if(doc.createdAt) delete doc._doc.createdAt;
        if(doc.__v != null) delete doc._doc.__v;
        next();
    });

    const Feedback = mongoose.model(
        'feedback',
        FeedbacksSchema,
    );
    return Feedback;
}

module.exports = feedback;
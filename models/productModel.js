/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const validator = require('validator');
const slugify = require('slugify');

const product = (mongoose) => {
    const ProductsSchema = new mongoose.Schema(
        {
            price: {
                type: Number,
                required: [true, 'É necessário estipular um preço, por favor envie price no body com os dados respectivos'],
                trim: true,
            },
            name: {
                type: String,
                required: [true, 'É necessário um nome, por favor envie name no body com os dados respectivos'],
                minlength: [2, 'O nome tem de ter pelo menos 2 caracteres'],
                trim: true,
            },
            description:{
                type: String,
                required: [true, 'É necessária uma descrição, por favor envie description no body com os dados respectivos'],
                minlength: [10, 'A descrição tem de ter pelo menos 10 caracteres'],
                trim: true,
            },
            feedback: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'feedback',
                }
            ],
            comments: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'comment',
                }
            ],
            images: [
                {
                    type: String,
                }
            ],
            slug:{
                type: String,
                unique: true
            },
            category:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'category',
            },
            subcategory:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'category',
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
            },
            id: {
                type: Number,
                select:false
            }
        },
        {
            timestamps: true,
            toJSON: {
                virtuals: true,
                versionKey: false,
                // Aqui no transform podemos alterar os virtuals que são devolvidos no document, pois os virtuals aparecem automaticamente nas query results quando se usa este método toJSON, mas com o transform, podemos fazer-lhe uma espécie de "hook" onde ainda podemos alterar a forma como o resultado devolvido/returned, ou seja, o argumento "ret" aparece.
                transform(doc, ret) {
                  if(!ret.averageRating) delete ret.averageRating;
                }
              }
        }
    );

    //Como criar indexes com um ou mais fields, se tiver mais do que um, o index torna-se mais rápido para quando esses dois fields são usados numa procura por exemplo.
    ProductsSchema.index({price: 1, updatedAt: -1});
    ProductsSchema.index({slug: 1});
    //definir text indexes para todos os Type: String.  $** é um wildcard, tb podíamos colocar aqui o nome específico dos campos que queremos procurar 
    ProductsSchema.index({'$**': 'text'});


    ProductsSchema.path('name')
    .validate(
        async function(name) {
            let product = this;
            // name = name.toLowerCase();
            let nameExistsAlready = await Product.findOne({name: name}).exec();
            if (nameExistsAlready && product.isModified('name')) return false;
            return true;
        }, 'Nome já existente na base de dados, por favor insira um nome diferente para o produto.'
    );



    // Virtual para calcular a Média das ratings do feedback baseadas numa query que assume um populate ao feedback
    ProductsSchema.virtual('averageRating').get(function() {
        if (this.feedback){
            let avgRating = 0;
            let counter = 0;
            this.feedback.forEach((element)=>{
                avgRating += Number(element.rating);
                counter ++;
            });

            avgRating = avgRating/counter;
            avgRating = parseFloat( avgRating.toFixed(2) );

            if (avgRating && Number(avgRating) > 0) return avgRating;
            else return null;
        }
        return null;
      })


    //Neste middlewares do mongoose podemos fazer tradicionalmente com callbacks com function(next) e chamar next() quando a função tiver feito o que tinha a fazer, ou fazer assim com async e funciona sem nunca ter de chamar ou passar o next.
    ProductsSchema.pre('save', async function() {
        this.slug = slugify(this.name + "_" + this.description, { lower: true} );
    })

    ProductsSchema.path('price').validate(function (price) {
        if (price <= 0) return false;
        return true;
     }, 'Existe um problema com o preço (não pode ser negativo, nem zero), por favor corrija.');


    ProductsSchema.post('save', function (doc, next) {
        if(doc.updatedAt) delete doc._doc.updatedAt;
        if(doc.createdAt) delete doc._doc.createdAt;
        if(doc.__v != null) delete doc._doc.__v;
        next();
    });

    const Product = mongoose.model(
        'product',
        ProductsSchema,
    );
    return Product;
}

module.exports = product;
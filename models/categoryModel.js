/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const validator = require('validator');

const category = (mongoose) => {
    const CategorysSchema = new mongoose.Schema(
        {
            name: {
                type: String,
                required: [true, 'A categoria tem de ser definida (tem de ter um nome).'],
                minlength: [2, 'Os nomes das categorias têm de ter pelo menos 2 caracteres.'],
                unique: true,
                trim: true,
                lowercase: true,
            },
            parent: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'category',
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
            toJSON: {
                virtuals: true,
                versionKey: false,
                transform(doc, ret) {
                  if(ret.user) delete ret.user;
                  if(ret.id) delete ret.id;
                  if(ret.parent) delete ret.parent;
                //   if(!ret.parent) delete ret.type;

                }
              }
        }
    );



    // Virtual para mostrar o tipo de categoria, principal ou sub-categoria
    CategorysSchema.virtual('type').get(function() {
        if (!this.parent){
           return 'Main Category';
        }
        return 'Sub-Category';
      });


    CategorysSchema.virtual('subCategories', {
        ref: 'category', 
        localField: '_id', 
        foreignField: 'parent', 
      });


    CategorysSchema.method('isParent', function(){
        //Parents não têm dados no parent object, só filhos é que têm dados no parent object
        if (this.parent) return false; 
        return true;
    });
    
    CategorysSchema.method('children', async function(){
        this._childCategories = await Category.find({parent: this._id}).select('name');
        return this._childCategories;
    });
    

    CategorysSchema.path('name')
    .validate(
        async function(name) {
            let category = this;
            name = name.toLowerCase();
            let nameExistsAlready = await Category.findOne({name: name}).exec();
            if (nameExistsAlready && category && category.isModified('name')) return false;
            return true;
        }, 'Nome já existente na base de dados, por favor insira um nome diferente para a categoria.'
    );


    CategorysSchema.post('save', function (doc, next) {
        if(doc.updatedAt) delete doc._doc.updatedAt;
        if(doc.createdAt) delete doc._doc.createdAt;
        if(doc.__v != null) delete doc._doc.__v;
        next();
    });

    const Category = mongoose.model('category', CategorysSchema);

    return Category;
}

module.exports = category;
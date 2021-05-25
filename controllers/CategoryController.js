/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { checkBodyDataErrors, trimInternalModelKeysArray, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata, parseRequestQueryObj } = require('../lib/dataServices');

class CategoryController {

    constructor(models) {
        this.models = models;
    }

    async index(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;

        try {          
            let excludeFilter = ['name', 'limit', 'page', 'sort'];
            const { mongoQuery, page, lastPage } = await parseRequestQueryObj(req.query, excludeFilter, Category);

            let totalDocuments = await Category.countDocuments({parent: { $exists: false }});

            const categories = await mongoQuery
            .find({parent: { $exists: false }})
            .populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'parent',
                select: 'name',
            })
            .populate({
                path: 'subCategories'
            });

            const responseObj = await addIndexMetadata(categories, Category, "categories", "category", totalDocuments);
            responseObj.metadata.page = page;
            responseObj.metadata.total_pages = lastPage;
            
            return res.status(200).json(responseObj);

        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não conseguimos obter os dados que procura neste momento. Iremos tentar resolver o problema, por favor tente mais tarde.";
            error.status = 400;
            next(error);
        }
    }

    async insert(req, res, next) {
        const { Category } = this.models;
        try{
            let bodyDataErrors = checkBodyDataErrors(req.body, Category, ['parent']);
            if ( bodyDataErrors ) return next(bodyDataErrors);

            const novo = await Category.create( {...req.body, user: req.me._id } );

            const responseObj = await addInsertMetadata(novo, Category, 'categories', 'category');

            res.status(201).json(responseObj);

        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.statusCode = 400;
            next(error);
        }

    }

    async show(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;

        try {
            let category = await Category.findById(id)
            .populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'parent',
                select: 'name',
            }).populate({
                path: 'subCategories'
            });
            
            // console.log('isParent?', category.isParent())
            

            // let children = await category.children();
            // if (children && Array.isArray(children) && children.length > 0){
            //     category = {...category._doc};
            //     category.subCategories = children;
            // }


            
            if (category) {
                const responseObj = await addShowMetadata(category, Category, "categories", 'categories');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Categoria não encontrada.');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.status = 400;
            next(error);
        }
    }

    async edit(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;
        const to_edit = req.body;
        
        try {
            let bodyDataErrors = checkBodyDataErrors(to_edit, Category);
            if ( bodyDataErrors ) return next(bodyDataErrors);
            
            let category = await Category.findById(id).populate({
                path: 'user',
                select: 'name',
            }).populate({
                path: 'parent',
                select: 'name',
            }).populate({
                path: 'subCategories'
            });
            
            

            if(category) {
                Object.entries(to_edit).forEach(([key, value]) => {
                    if (key != 'parent'){
                        category[key] = value;
                    }
                });
                let editedKeys = await category.modifiedPaths();
                await category.save();
            
                let children = await category.children();
                if (children && Array.isArray(children) && children.length > 0){
                    category = {...category._doc};
                    category.subCategories = children;
                }
                const responseObj = await addEditMetadata(category, Category, "categories", 'categories', editedKeys);
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Categoria não encontrada');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer a atualização de dados da respectiva categoria. Por favor certifique-se que o seu pedido é válido e volte a tentar."
            error.status = 400;
            next(error);        
        }
    }

    async delete(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;

        try {

            let checkParent = await Category.findById(id);
            let children = await checkParent.children();
            if (children && Array.isArray(children) && children.length > 0){
                let error = new CustomShopError('Esta categoria-mãe tem subcategorias associadas. Por favor remova as subcategorias associadas antes de desgravar esta.');
                error.statusCode = 400;
                throw error;
            }


            const category = await Category.deleteOne({ _id: id });

                if(category.deletedCount > 0) {
                    const metadata = {
                        deletedCount: category.deletedCount,
                        functionality: "Add a new category",
                        method: "POST",
                        url: "/categories",
                    };

                    const responseObj = {
                    status: 'success',
                    message: 'Categoria removida com sucesso.', 
                    metadata: metadata,
                    };

                    return res.status(200).json(responseObj);
                } else {
                    let error = new CustomShopError('Categoria não encontrada.');
                    error.statusCode = 404;
                    throw error;
                }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível remover os dados da categoria que procura. Por favor certifique-se que a category id que enviou é válida e volte a tentar."
            error.status = 400;
            next(error);
        }
    }


    //
    //Métodos de SubCategorias
    //

    
    async insertSubCategory(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;
        const subCategory = req.params.subCategory;

        try{
            let bodyDataErrors = checkBodyDataErrors(req.body, Category);
            if ( bodyDataErrors ) return next(bodyDataErrors);

            const parentCategory = await Category.findById(id).populate({
                path: 'user',
                select: 'name',
            });
            
            if (parentCategory) {
    
                let novo = await Category.create( {...req.body, user: req.me._id, parent: id} );
                novo = await novo
                .populate({
                    path: 'user',
                    select: 'name',
                })
                .populate({
                    path: 'parent',
                    select: 'name',
                })
                .execPopulate();

                const responseObj = await addInsertMetadata(novo, Category, 'categories', 'category');
    
                res.status(201).json(responseObj);
    
            } else {
                let error = new CustomShopError('Categoria não encontrada.');
                error.statusCode = 404;
                throw error;
            }          

        }catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            console.log(error);
            error.statusCode = 400;
            next(error);
        }

    }

    async showSubCategory(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;
        const subId = req.params.subCategory;

        try {
            const parentCategory = await Category.findById(id);
            const childCategory = await Category.findById(subId);
            const category = await Category.findOne({_id: subId, parent: id}).populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'parent',
                select: 'name',
            });

            if( (!parentCategory && category) || (!parentCategory && childCategory) || (!category && childCategory)) {
                let error = new CustomShopError('A categoria-mãe não foi encontrada, por favor corrija o seu pedido.');
                error.statusCode = 404;
                throw error;
            }

            if (category) {
                const responseObj = await addShowMetadata(category, Category, "categories", 'categories');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Categoria não encontrada.');
                error.statusCode = 404;
                throw error;
            }

        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.status = 400;
            next(error);
        }
    }

    async editSubCategory(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;
        const subId = req.params.subCategory;
        const to_edit = req.body;
        
        try {
            let bodyDataErrors = checkBodyDataErrors(to_edit, Category);
            if ( bodyDataErrors ) return next(bodyDataErrors);


            const parentCategory = await Category.findById(id);
            const childCategory = await Category.findById(subId);
            let category = await Category.findOne({_id: subId, parent: id});

            if( (!parentCategory && category) || (!parentCategory && childCategory) || (!category && childCategory)) {
                let error = new CustomShopError('A categoria-mãe não foi encontrada, por favor corrija o seu pedido.');
                error.statusCode = 404;
                throw error;
            }         

            if (category) {
                
                Object.entries(to_edit).forEach(([key, value]) => {
                    if (key != 'parent'){
                        category[key] = value;
                    }
                });
                let editedKeys = await category.modifiedPaths();
                await category.save();
            
    
                //Como fazer um populate após já ter recebido um document - .execPopulate() no fim é o mais importante, para executar a devolução de uma promise
                category = await category
                .populate({
                    path: 'user',
                    select: 'name',
                })
                .populate({
                    path: 'parent',
                    select: 'name',
                })
                .execPopulate();

                const responseObj = await addEditMetadata(category, Category, "categories", 'category', editedKeys);
                res.status(200).json(responseObj);

            } else {
                let error = new CustomShopError('Categoria não encontrada.');
                error.statusCode = 404;
                throw error;
            }


        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer a atualização de dados da respectiva categoria. Por favor certifique-se que o seu pedido é válido e volte a tentar."
            error.status = 400;
            next(error);        
        }
    }

    async deleteSubCategory(req, res, next) {
        const { Category } = this.models;
        const id = req.params.id;
        const subId = req.params.subCategory;
        const to_edit = req.body;
        
        try {

            let checkParent = await Category.findById(subId);
            let children = await checkParent.children();
            if (children && Array.isArray(children) && children.length > 0){
                let error = new CustomShopError('Esta categoria-mãe tem subcategorias associadas. Por favor remova as subcategorias associadas antes de desgravar esta.');
                error.statusCode = 400;
                throw error;
            }

            const category = await Category.deleteOne({ _id: subId });

            if(category.deletedCount > 0) {
                const metadata = {
                    deletedCount: category.deletedCount,
                    functionality: "Add a new category",
                    method: "POST",
                    url: "/categories",
                };

                const responseObj = {
                status: 'success',
                message: 'Categoria removida com sucesso.', 
                metadata: metadata,
                };

                return res.status(200).json(responseObj);
                } else {
                    let error = new CustomShopError('Categoria não encontrada.');
                    error.statusCode = 404;
                    throw error;
                }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível remover os dados da categoria que procura. Por favor certifique-se que a category id que enviou é válida e volte a tentar."
            error.status = 400;
            next(error);
        }
    }



}

module.exports = CategoryController;
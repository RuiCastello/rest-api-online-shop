/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { checkBodyDataErrors, trimInternalModelKeysArray, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata, parseRequestQueryObj} = require('../lib/dataServices');
const mongoose = require('mongoose');
const multer = require('multer');
const { deleteFile } = require('../lib/fileServices');
var _ = require('lodash');


class ProductController {

    constructor(models) {
        this.models = models;
    }

    async index(req, res, next) {
        const { Product } = this.models;
        try {
            //Definir que elementos serão filtrados do nosso processamento de queries avançado
            const excludeFilter = ['name', 'description', 'limit', 'page', 'sort'];

            //Processar o request do user pelo nosso processamento de queries avançado
            //Este serviço permite ordenar, paginar, procurar e filtrar resultados 
            const { mongoQuery, totalDocuments, page, lastPage } = await parseRequestQueryObj(req.query, excludeFilter, Product);

            //Populates à query devolvida pelo processamento avançado de user request
            const products = await mongoQuery
            .populate({path:'feedback', select:'rating review user'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'category', select:'name'})
            .populate({path:'subcategory', select:'name parent'});

            //Formatar mensagem de output
            const responseObj = await addIndexMetadata(products, Product, "products", "product", totalDocuments);
            responseObj.metadata.page = page;
            responseObj.metadata.total_pages = lastPage;
            
            //Display da mensagem de output
            return res.status(200).json(responseObj);
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não conseguimos obter os dados que procura neste momento. Iremos tentar resolver o problema, por favor tente mais tarde.";
            error.status = 400;
            next(error);
        }
    }

    async insert(req, res, next) {
        const { Product, Category } = this.models;
        const to_edit = req.body;
        try{

            //Verificar que parametros o user tentou enviar, se algum não for válido, fazer display de uma mensagem de erro adequada
            let bodyDataErrors = checkBodyDataErrors(to_edit, Product, ['images', 'slug', 'id'], ['image', 'category', 'subcategory', 'deleteImage']);
            if ( bodyDataErrors ) {

                //Se existir um erro na criação do produto, ver se houve upload de imagem no middleware anterior e desgravá-la caso afirmativo
                if (req.file && req.file.filename){
                    let fullImagePath = req.file.destination + "/" + req.file.filename;
                    let pathToDelete = fullImagePath.split('/');
                    pathToDelete.shift();
                    pathToDelete = pathToDelete.join('/');
                    deleteFile(pathToDelete);
                }

                return next(bodyDataErrors);
            }
           
            // Validar categorias
            await this.checkCategories(to_edit, Category);

            // Se o user fez upload de uma imagem, adicioná-la à BD
            if (req.file && req.file.filename)
                {
                    to_edit.images = [];
                    to_edit.images.push(req.file.destination+'/'+req.file.filename);
                }

            // Adicionar o novo produto à BD
            const novo = await Product.create( to_edit );

            // Fazer populates ao novo produto acabado de criar
            await novo.populate({path:'category', select:'name'})
            .populate({path:'subcategory', select:'name parent'}).execPopulate();

            //Preparar formatação de mensagem de output
            const responseObj = await addInsertMetadata(novo, Product, 'products', 'product');
            
            //Display de mensagem de output
            res.status(201).json(responseObj);
        } catch (error) {
            // console.log(error)
            //Se existir um erro na criação do produto, ver se houve upload de imagem e desgravá-la caso afirmativo
            if (req.file && req.file.filename){
                let fullImagePath = req.file.destination + "/" + req.file.filename;
                let pathToDelete = fullImagePath.split('/');
                pathToDelete.shift();
                pathToDelete = pathToDelete.join('/');
                deleteFile(pathToDelete);
            }

            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.status = 400;
            next(error);
        }

    }

    async show(req, res, next) {
        const { Product } = this.models;
        const id = req.params.id;
        // console.log('params_id',id)
        try {
            //query
            const product = await Product.findById(id)
            .populate({path:'feedback', select:'rating review user'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'category', select:'name'})
            .populate({path:'subcategory', select:'name parent'})
            
            if (product) {
                //Formatar mensagem output
                const responseObj = await addShowMetadata(product, Product, 'products', 'product');
                //Display mensagem output
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Produto não encontrado.');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível mostrar os dados do produto que procura. Por favor certifique-se que o product id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }

    //Middleware function para converter slugs em ids caso encontre uma slug válida no url
    async slugToId(req, res, next) {
        const { Product } = this.models;
        const slug = req.params.id;
        try {
            if(slug && _.isString(slug) && slug.trim().length > 0){
                const product = await Product.findOne({slug: slug})
                if (product) {
                    req.params.id = String(product._id);
                } 
            }
            next();
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível mostrar os dados do produto que procura. Por favor certifique-se que o product id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }

    async showSlug(req, res, next) {
        const { Product } = this.models;
        const slug = req.params.slug;
        try {
            const product = await Product.findOne({slug: slug})
            .populate({path:'feedback', select:'rating review user'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'category', select:'name'})
            .populate({path:'subcategory', select:'name parent'})
            
            if (product) {
                const responseObj = await addShowMetadata(product, Product, 'products', 'product');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Produto não encontrado.');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível mostrar os dados do produto que procura. Por favor certifique-se que o product id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }

    async edit(req, res, next) {
        const { Product, Category } = this.models;
        const id = req.params.id;
        const to_edit = req.body;
        
        try {
            let bodyDataErrors = checkBodyDataErrors(to_edit, Product, ['images', 'slug', 'id'], ['image', 'category', 'subcategory', 'deleteImage']);

             //Caso tenha havido um upload de uma imagem mas o user não tenha tentado alterar mais nada no produto, então aceitar apenas a imagem e não dar erro. Caso contrário, fornecer uma mensagem adequada.
            if (req.file && req.file.filename && bodyDataErrors){
                let product = await Product.findById(id);
                if(product) {
                    product.images.push(req.file.destination+'/'+req.file.filename);
                    let editedKeys = await product.modifiedPaths();
                    await product.save();
    
                    //Aqui usamos um populate após o save, o que só é possível correndo uma nova query, ou fazendo uso do execPopulate() que devolve uma promise.
                    await product.populate({path:'category', select:'name'})
                    .populate({path:'subcategory', select:'name parent'}).execPopulate();
    
                    const responseObj = await addEditMetadata(product, Product, 'products', 'product', editedKeys);
                    return res.status(200).json(responseObj);
                }
            }
            else if ( bodyDataErrors ) return next(bodyDataErrors);
        
            await this.checkCategories(to_edit, Category);

            let product = await Product.findById(id)
            .populate({path:'feedback', select:'rating review user'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'category', select:'name'})
            .populate({path:'subcategory', select:'name parent'});

            if(product) {
            
                //
                // Lógica de delete image
                //
                let numImages = product.images.length;
                if (req.body.deleteImage != null && req.body.deleteImage != undefined && req.body.deleteImage >=0 && req.body.deleteImage < numImages){
                    let indexImageDelete = Number(req.body.deleteImage);
                    let productToDeleteImageFrom = product;
                    let pathToDelete = productToDeleteImageFrom.images.splice(indexImageDelete, 1);
                    pathToDelete = pathToDelete[0].split('/');
                    pathToDelete.shift();
                    pathToDelete = pathToDelete.join('/');
                    deleteFile(pathToDelete);
                }else if(req.body.deleteImage != null && req.body.deleteImage != undefined){
                    let error = new CustomShopError('Está a tentar remover uma imagem que não existe. (Nota: o valor de deleteImage é de 0 a 9, ou seja, se está a tentar remover a única imagem do produto, deve usar o valor 0.');
                    error.statusCode = 404;
                    throw error;
                }
                
            
                Object.entries(to_edit).forEach(([key, value]) => {
                    product[key] = value;
                });

                if (req.file && req.file.filename)
                {
                    product.images.push(req.file.destination+'/'+req.file.filename);
                }
                let editedKeys = await product.modifiedPaths();
                await product.save();

                //Aqui usamos um populate após o save, o que só é possível correndo uma nova query, ou fazendo uso do execPopulate() que devolve uma promise.
                await product.populate({path:'category', select:'name'})
                .populate({path:'subcategory', select:'name parent'}).execPopulate();

                const responseObj = await addEditMetadata(product, Product, 'products', 'product', editedKeys);
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Produto não encontrado');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            // console.log(error)
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer a atualização de dados do respectivo produto. Por favor certifique-se que o seu pedido é válido e volte a tentar."
            error.status = 400;
            next(error);        
        }
    }

    async delete(req, res, next) {
        const { Product, User, Feedback, Comment } = this.models;
        const id = req.params.id;
        try {
            const product = await Product.deleteOne({ _id: id });

                if(product.deletedCount > 0) {

                    //Caso o produto tenha sido removido, deixa de fazer sentido manter referências a dados como feedback e comentários, pois estão diretamente relacionados com os produtos. Então limpamos as referências todas do produto que está a ser removido:

                    let feedbacksToDelete = await Feedback.find({product: id});
                    feedbacksToDelete.forEach( async (element) =>{
                        await User.findByIdAndUpdate({_id:element.user}, {$pull: {feedback: element._id}});
                    });
                    await Feedback.deleteMany({product: id});
                   
                    let commentsToDelete = await Comment.find({product: id});
                    commentsToDelete.forEach( async (element) =>{
                        await User.findByIdAndUpdate({_id:element.user}, {$pull: {comments: element._id}});
                    });
                    await Comment.deleteMany({product: id});
                    

                    const responseObj = await addDeleteMetadata(product, Product, 'products', 'product', 'Produto removido com sucesso.');
                    return res.status(200).json(responseObj);
                } else {
                    let error = new CustomShopError('Produto não encontrado.');
                    error.statusCode = 404;
                    throw error;
                }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível remover os dados do produto que procura. Por favor certifique-se que o product id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }



    async uploadImages(req, res, next) {
        const { Product } = this.models;
        const id = req.params.id;
        try {
            let product = await Product.aggregate([
                {
                    $match: { _id: mongoose.Types.ObjectId(id) }
                },
                {
                    $unwind: "$images"
                },
                {
                    $count: "num_images"
                }
            ]);

            //Descobrir o número de imagens pertencentes a este produto
            let numImages = 0;
            if(product && Array.isArray(product) && product.length > 0) {
                numImages = product[0].num_images;
            }

            //Definir como, onde, e em que formato queremos gravar os ficheiros uploaded
            const multerStorage = multer.diskStorage({
                destination: (req, file, cb) => {
                    cb(null, 'public/img/products');
                },
                filename: (req, file, cb) =>{
                    const ext = file.mimetype.split('/')[1];
                    cb(null, 'product-'+req.me._id+'-'+Date.now()+'.'+ext); 
                }
            });

            // definir em que situações aceitamos o upload ou o ignoramos/recusamos
            const multerFilter = (req, file, cb) => {
                if (file.mimetype.startsWith('image')) {

                    //Não aceitar o upload de uma nova imagem caso o máximo número de imagens tenha sido atingido
                    if (product && numImages >= 10){

                        let error = new CustomShopError('O máximo número de imagens aceite por cada produto são 10, para introduzir mais imagens, por favor remova alguma.');
                        error.additionalInfo = {
                            method: 'PUT',
                            url: '/products/'+id,
                            key: 'deleteImage',
                            value: 'the number of the image you want to delete from 0 to 9'
                        }
                        error.statusCode = 400;
                        cb(error, false);
                        return;
                    }

                    cb(null, true);
                }else{
                    let error = new CustomShopError('Tipo de ficheiro inválido. Só pode fazer upload de imagens.');
                    error.statusCode = 400;
                    cb(error, false);
                    return;
                }
            };

            //Criação do nosso objecto multer com as settings que definimos acima
            const upload = multer({ 
                storage: multerStorage,
                fileFilter: multerFilter 
            });

            try{
            //upload.single devolve uma função do tipo middleware, ou seja, (req, res, next) =>{}
            const uploadMiddlewareFunction = upload.single('image');

            //Portanto podemos chamá-la e passar-lhe os nossos valores de req, res e next neste método
            uploadMiddlewareFunction(req, res, next);
            } catch (error) {
                if (checkErrorType(error)) return next(error);
                error.message = "Alguma coisa correu mal com o upload da imagem. Por favor certifique-se que está a enviar a imagem no formato correto e num form multipart/form-data e volte a tentar."
                error.status = 400;
                next(error);
            }
        } catch (error) {
            //Aqui não nos importamos muito com os erros gerais, pois isto é um middleware que só é executado até ao fim quando o user está realmente a enviar um ficheiro, para erros gerais, passamos a task aos próximos middleware para que detectem os problemas e providenciem uma mensagem mais adequada ao utilizador.
            next();
        }
    }



    async checkCategories(to_edit, Category){

            //Certificar que caso o user esteja a tentar editar as categorias ou subcategorias, que estas existam antes de serem aceites.
            if (to_edit && 'category' in to_edit && to_edit.category.length > 0)
            {
                let mainCategory;
                try{
                    mainCategory = await Category.findById(to_edit.category);
                }catch{
                    let error = new CustomShopError('A categoria enviada não é válida, por favor corrija.');
                    error.additionalInfo = {category: to_edit.category}
                    error.statusCode = 404;
                    throw error;
                }
                if (mainCategory){
                    if ( !mainCategory.isParent() ){
                        let error = new CustomShopError('A categoria enviada não é uma categoria principal (categoria-mãe), por favor corrija.');
                        error.additionalInfo = {
                            category: to_edit.category
                        }
                        error.statusCode = 404;
                        throw error;
                    }
                }
                else {
                    let error = new CustomShopError('Essa categoria principal não existe, por favor corrija o seu pedido e tente novamente');
                    error.additionalInfo = {
                        category: to_edit.category
                    }
                    error.statusCode = 404;
                    throw error;
                }
            }
            
            if (to_edit && 'subcategory' in to_edit && to_edit.subcategory.length > 0)
            {
                let subCategory;
                try{
                    subCategory = await Category.findById(to_edit.subcategory);
                }catch{
                    let error = new CustomShopError('A sub-categoria enviada não é válida, por favor corrija.');
                    error.additionalInfo = {subCategory: to_edit.subcategory}
                    error.statusCode = 404;
                    throw error;
                }
                if (subCategory){
                    if ( subCategory.isParent() ){
                        let error = new CustomShopError('A sub-categoria enviada não é uma sub-categoria, por favor corrija.');
                        error.additionalInfo = {
                            subCategory: to_edit.subcategory
                        }
                        error.statusCode = 404;
                        throw error;
                    }
                }
                else {
                    let error = new CustomShopError('Essa sub-categoria não existe, por favor corrija o seu pedido e tente novamente');
                    error.additionalInfo = {
                        subcategory: to_edit.subcategory
                    }
                    error.statusCode = 404;
                    throw error;
                }

            }
    }



    async toggleWishlist(req, res, next) {
        const { Product, User } = this.models;
        const id = req.params.id;
        // const to_edit = req.body;
        
        try {
            let product = await Product.findById(id)
            .populate({path:'feedback', select:'rating review user'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'category', select:'name'})
            .populate({path:'subcategory', select:'name parent'});

            if(product) {                
                
                //Verificar se o produto está na wishlist do user
                let user = await User.findOne({ _id: req.me._id, wishlist: id})
                .select('-purchases -feedback -comments');
                
                //Se estiver, remover produto da wishlist
                if (user){
                    // await User.updateOne( {_id: req.me._id}, { $pullAll: {uid: [id] } } );
                    user.wishlist.pull(id); 
                }else{
                    //Se não estiver, adicionar produto à wishlist
                    user = await User.findById(req.me._id)
                    .select('-purchases -feedback -comments');
                    user.wishlist.push(id); 
                }

                await user.populate({path:'wishlist', select:'name'}).execPopulate();
                await user.save();

                const responseObj = await addEditMetadata(user, User, 'users', 'user');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Produto não encontrado');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            // console.log(error)
            if (checkErrorType(error)) return next(error);
            error.message = "Não foi possível adicionar o produto à sua wishlist. Por favor certifique-se que o seu pedido é válido e volte a tentar."
            error.status = 400;
            next(error);        
        }
    }


    // Estatísticas avançadas sobre todos os produtos na BD
    // Uso avançado de queries com aggregates
    async stats(req, res, next) {
        const { Product, Purchase } = this.models;
        const id = req.params.id;
        
        try {
          
            let productPrices = await Product.aggregate([
                {
                    $group: {
                        _id: 'All products',
                        avgPrice: { $avg: "$price"},
                        minPrice: { $min: '$price'},
                        maxPrice: { $max: '$price'},
                    }
                },
                {
                    $project: {
                        _id: 0,
                        avgPrice : { $round: ['$avgPrice', 2] },
                        minPrice : { $round: ['$minPrice', 2] },
                        maxPrice : { $round: ['$maxPrice', 2] },
                    }
                }
            ]);


            let productFeedback = await Product.aggregate([
                {   
                    $lookup:{
                        from: "feedbacks",
                        localField: "_id",
                        foreignField: 'product',  
                        as: "Feedback",
                    }
                },
                {
                    $match: {
                        Feedback: { '$ne': null, '$exists': true, $not: {$size: 0} }
                    }
                },
                {
                    $project: {
                        Feedback: 1, name: 1
                    }
                },
                {
                    $unwind: '$Feedback'
                },
                {
                    $group: {
                        _id: '$name',
                        avgRating: { $avg: "$Feedback.rating"},
                        totalFeedback: { $sum: 1},
                    }
                },
                {
                    $sort: {
                        avgRating: -1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id",
                        avgRating : { $round: ['$avgRating', 2] },
                        totalFeedback : '$totalFeedback',
                    }
                },
                {
                    $limit: 3 
                }

            ]);

            let productMultistats;


            //Outra maneira de fazer as estatisticas era começar por um unwind das purchases, mas tem um problema, produtos que nunca tenham sido comprados não iriam aparecer no lookup, então usei uma forma alternativa mais abaixo de fazer estas estatísticas.
            // productMultistats = await Purchase.aggregate([
                
            //     {
            //         $unwind: '$products'
            //     },
            //     {
            //         $project: {
            //             _id:0,
            //             id: "$products.product",
            //             quantity: "$products.quantity",
            //         }
            //     },
            //     {   
            //         $lookup:{
            //             from: "products",
            //             localField: "id",
            //             foreignField: '_id',  
            //             as: "sales",
            //         }
            //     },
            //     {
            //         $unwind: { "path": "$sales", "preserveNullAndEmptyArrays": true }
            //     },
            //     {
            //         $project: {
            //             id: "$id",
            //             quantity: "$quantity",
            //             name: "$sales.name",
            //             price: "$sales.price",
            //         }
            //     },

            //     {
            //         $group: {
            //             _id: "$id",
            //             name: {$first: "$name"},
            //             price: {$first: '$price'},
            //             totalSales: { $sum: { $multiply: [1, "$quantity"] }},
            //         }
            //     },
            //     {
            //         $sort: {totalSales: -1} 
            //     },
            //     {   
            //         $lookup:{
            //             from: "feedbacks",
            //             localField: "_id",
            //             foreignField: 'product',  
            //             as: "feedback",
            //         }
            //     },
            //     {
            //         $unwind: { "path": "$feedback", "preserveNullAndEmptyArrays": true }
            //     },
            //     {
            //         $project: {
            //             _id: "$_id",
            //             name: "$name",
            //             price: "$price",
            //             totalSales: "$totalSales",
            //             feedback : "$feedback",
            //             feedbackCount:
            //             {
            //               $cond: { if: { $not: ["$feedback"] }, then: 0, else: 1 }
            //             }
            //         }
            //     },
            //     {
            //         $group: {
            //             _id: "$_id",
            //             name: {$first: "$name"},
            //             price: {$first: '$price'},
            //             totalSales: { $first: "$totalSales"},
            //             avgRating: { $avg: "$feedback.rating"},
            //             totalFeedback: { $sum: "$feedbackCount"},
            //         }
            //     },
            //     {   
            //         $lookup:{
            //             from: "comments",
            //             localField: "_id",
            //             foreignField: 'product',  
            //             as: "comments",
            //         }
            //     },
            //     {
            //         $unwind: { "path": "$comments", "preserveNullAndEmptyArrays": true }
            //     },
            //     {
            //         $project: {
            //             _id: "$_id",
            //             name: "$name",
            //             price: "$price",
            //             totalSales: "$totalSales",
            //             avgRating : { $round: ['$avgRating', 2] },
            //             totalFeedback: "$totalFeedback",
            //             comments:
            //             {
            //               $cond: { if: { $not: ["$comments"] }, then: 0, else: 1 }
            //             }
            //         }
            //     },
            //     {
            //         $group: {
            //             _id: "$_id",
            //             name: {$first: "$name"},
            //             price: {$first: '$price'},
            //             totalSales: { $first: "$totalSales"},
            //             avgRating: { $first: "$avgRating"},
            //             totalFeedback: { $first: "$totalFeedback"},
            //             totalComments: { $sum: "$comments" },
            //         }
            //     },
            //     {
            //         $project: {
            //             _id: "$_id",
            //             name: "$name",
            //             price: "$price",
            //             totalSales: "$totalSales",
            //             avgRating : { $round: ['$avgRating', 2] },
            //             totalFeedback : '$totalFeedback',
            //             totalComments : '$totalComments'
            //         }
            //     },
            //     {
            //         $sort: {
            //             totalSales: -1,
            //             avgRating: -1,
            //             totalFeedback: -1,
            //             totalComments: -1,
            //         }
            //     },
            //     {
            //         $limit: 30
            //     }
            // ]);


            //
            //
            //
            //
            //


            // Aqui fazemos as estatísticas usando um lookup um pouco mais complexo, onde se usa a sintaxe com let e pipeline para se fazer match the parametros locais com parametros dentro de um array de arrays por exemplo
            productMultistats = await Product.aggregate([
                {   
                    $lookup:{
                        from: "purchases",
                        let: { id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $in: [ "$$id", "$products.product" ] }        
                                }
                            }
                        ],  
                        as: "sales",
                    }
                },
                {
                    $unwind: { "path": "$sales", "preserveNullAndEmptyArrays": true  }
                },
                {
                    $project: {
                        _id: "$_id",
                        sales: {
                            $filter: {
                               input: "$sales.products",
                               as: "item",
                               cond: { $eq: [ "$$item.product", "$_id" ] }
                            }
                         },
                        name: "$name",
                        price: "$price",
                    }
                },
                {
                    $project: {
                        _id: "$_id",
                        quantity: "$sales.quantity",
                        name: "$name",
                        price: "$price",
                    }
                },
                {
                    $unwind: { "path": "$quantity", "preserveNullAndEmptyArrays": true  }
                },
                {
                    $group: {
                        _id: "$_id",
                        name: {$first: "$name"},
                        price: {$first: '$price'},
                        totalSales: { $sum: { $multiply: [1, "$quantity"] }},
                    }
                },
                {
                    $sort: {totalSales: -1} 
                },
                {   
                    $lookup:{
                        from: "feedbacks",
                        localField: "_id",
                        foreignField: 'product',  
                        as: "feedback",
                    }
                },
                {
                    $unwind: { "path": "$feedback", "preserveNullAndEmptyArrays": true }
                },
                {
                    $project: {
                        _id: "$_id",
                        name: "$name",
                        price: "$price",
                        totalSales: "$totalSales",
                        feedback : "$feedback",
                        feedbackCount:
                        {
                          $cond: { if: { $not: ["$feedback"] }, then: 0, else: 1 }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        name: {$first: "$name"},
                        price: {$first: '$price'},
                        totalSales: { $first: "$totalSales"},
                        avgRating: { $avg: "$feedback.rating"},
                        totalFeedback: { $sum: "$feedbackCount"},
                    }
                },
                {   
                    $lookup:{
                        from: "comments",
                        localField: "_id",
                        foreignField: 'product',  
                        as: "comments",
                    }
                },
                {
                    $unwind: { "path": "$comments", "preserveNullAndEmptyArrays": true }
                },
                {
                    $project: {
                        _id: "$_id",
                        name: "$name",
                        price: "$price",
                        totalSales: "$totalSales",
                        avgRating : { $round: ['$avgRating', 2] },
                        totalFeedback: "$totalFeedback",
                        comments:
                        {
                          $cond: { if: { $not: ["$comments"] }, then: 0, else: 1 }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        name: {$first: "$name"},
                        price: {$first: '$price'},
                        totalSales: { $first: "$totalSales"},
                        avgRating: { $first: "$avgRating"},
                        totalFeedback: { $first: "$totalFeedback"},
                        totalComments: { $sum: "$comments" },
                    }
                },
                {
                    $project: {
                        _id: "$_id",
                        name: "$name",
                        price: "$price",
                        totalSales: "$totalSales",
                        avgRating : { $round: ['$avgRating', 2] },
                        totalFeedback : '$totalFeedback',
                        totalComments : '$totalComments'
                    }
                },
                {
                    $sort: {
                        totalSales: -1,
                        avgRating: -1,
                        totalFeedback: -1,
                        totalComments: -1,
                    }
                },
                {
                    $limit: 30
                }
            ]);






            //
            //
            //
            //




            
            if (productMultistats.length < 1) {

                productMultistats = await Product.aggregate([
                    {
                        $group: {
                            _id: "$_id",
                            name: {$first: "$name"},
                            price: {$first: '$price'},
                        }
                    },
                    {
                        $sort: {totalSales: -1} 
                    },
                    {   
                        $lookup:{
                            from: "feedbacks",
                            localField: "_id",
                            foreignField: 'product',  
                            as: "feedback",
                        }
                    },
                    {
                        $unwind: { "path": "$feedback", "preserveNullAndEmptyArrays": true }
                    },
                    {
                        $project: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            feedback : "$feedback",
                            feedbackCount:
                            {
                              $cond: { if: { $not: ["$feedback"] }, then: 0, else: 1 }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            name: {$first: "$name"},
                            price: {$first: '$price'},
                            avgRating: { $avg: "$feedback.rating"},
                            totalFeedback: { $sum: "$feedbackCount"},
                        }
                    },
                    {   
                        $lookup:{
                            from: "comments",
                            localField: "_id",
                            foreignField: 'product',  
                            as: "comments",
                        }
                    },
                    {
                        $unwind: { "path": "$comments", "preserveNullAndEmptyArrays": true }
                    },
                    {
                        $project: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            avgRating : { $round: ['$avgRating', 2] },
                            totalFeedback: "$totalFeedback",
                            comments:
                            {
                              $cond: { if: { $not: ["$comments"] }, then: 0, else: 1 }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            name: {$first: "$name"},
                            price: {$first: '$price'},
                            avgRating: { $first: "$avgRating"},
                            totalFeedback: { $first: "$totalFeedback"},
                            totalComments: { $sum: "$comments" },
                        }
                    },
                    {
                        $project: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            avgRating : { $round: ['$avgRating', 2] },
                            totalFeedback : '$totalFeedback',
                            totalComments : '$totalComments'
                        }
                    },
                    {
                        $sort: {
                            avgRating: -1,
                            totalFeedback: -1,
                            totalComments: -1,
                        }
                    },
                    {
                        $limit: 30
                    }
                ]);
    
            }

            let result;
            if (productFeedback.length < 1) {
                result = [{"All products pricing stats": productPrices}, {"Top 30 products - Multiple Stats": productMultistats}];
            }else{
                result = [{"All products pricing stats": productPrices}, {"Top 3 - Best rated products": productFeedback}, {"Top 30 products - Multiple Stats": productMultistats}];
            }
            return res.json(result);
            
        } catch (error) {
            // console.log(error)
            if (checkErrorType(error)) return next(error);
            error.message = "Lamentamos mas de momento não é possível calcular as stats dos produtos. Por favor certifique-se que o seu pedido é válido e volte a tentar mais tarde."
            error.status = 400;
            next(error);        
        }
    }


    //Estatísticas avançadas sobre um produto específico
    async statsProduct(req, res, next) {
        const { Product, Purchase } = this.models;
        const id = req.params.id;
        
        try {

            let productMultistats = await Purchase.aggregate([
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        _id:0,
                        id: "$products.product",
                        quantity: "$products.quantity",
                    }
                },
                {
                    $match: {
                        id: mongoose.Types.ObjectId(id),
                    }
                },
                {   
                    $lookup:{
                        from: "products",
                        localField: "id",
                        foreignField: '_id',  
                        as: "sales",
                    }
                },
                {
                    $unwind: { "path": "$sales", "preserveNullAndEmptyArrays": true }
                },
                {
                    $project: {
                        id: "$id",
                        quantity: "$quantity",
                        name: "$sales.name",
                        price: "$sales.price",
                    }
                },

                {
                    $group: {
                        _id: "$id",
                        name: {$first: "$name"},
                        price: {$first: '$price'},
                        totalSales: { $sum: { $multiply: [1, "$quantity"] }},
                    }
                },
                {
                    $sort: {totalSales: -1} 
                },
                {   
                    $lookup:{
                        from: "feedbacks",
                        localField: "_id",
                        foreignField: 'product',  
                        as: "feedback",
                    }
                },
                {
                    $unwind: { "path": "$feedback", "preserveNullAndEmptyArrays": true }
                },
                {
                    $project: {
                        _id: "$_id",
                        name: "$name",
                        price: "$price",
                        totalSales: "$totalSales",
                        feedback : "$feedback",
                        feedbackCount:
                        {
                          $cond: { if: { $not: ["$feedback"] }, then: 0, else: 1 }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        name: {$first: "$name"},
                        price: {$first: '$price'},
                        totalSales: { $first: "$totalSales"},
                        avgRating: { $avg: "$feedback.rating"},
                        totalFeedback: { $sum: "$feedbackCount"},
                    }
                },
                {   
                    $lookup:{
                        from: "comments",
                        localField: "_id",
                        foreignField: 'product',  
                        as: "comments",
                    }
                },
                {
                    $unwind: { "path": "$comments", "preserveNullAndEmptyArrays": true }
                },
                {
                    $project: {
                        _id: "$_id",
                        name: "$name",
                        price: "$price",
                        totalSales: "$totalSales",
                        avgRating : { $round: ['$avgRating', 2] },
                        totalFeedback: "$totalFeedback",
                        comments:
                        {
                          $cond: { if: { $not: ["$comments"] }, then: 0, else: 1 }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        name: {$first: "$name"},
                        price: {$first: '$price'},
                        totalSales: { $first: "$totalSales"},
                        avgRating: { $first: "$avgRating"},
                        totalFeedback: { $first: "$totalFeedback"},
                        totalComments: { $sum: "$comments" },
                    }
                },
                {
                    $project: {
                        _id: "$_id",
                        name: "$name",
                        price: "$price",
                        totalSales: "$totalSales",
                        avgRating : { $round: ['$avgRating', 2] },
                        totalFeedback : '$totalFeedback',
                        totalComments : '$totalComments'
                    }
                },
                {
                    $sort: {
                        totalSales: -1,
                        avgRating: -1,
                        totalFeedback: -1,
                        totalComments: -1,
                    }
                },
                {
                    $limit: 30
                }
            ]);

            if (productMultistats.length < 1) {
                productMultistats = await Product.aggregate([
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId(id),
                        }
                    },
                    {
                        $project: {
                            id: "$_id",
                            name: "$name",
                            price: "$price",
                        }
                    },
                    {   
                        $lookup:{
                            from: "feedbacks",
                            localField: "_id",
                            foreignField: 'product',  
                            as: "feedback",
                        }
                    },
                    {
                        $unwind: { "path": "$feedback", "preserveNullAndEmptyArrays": true }
                    },
                     {
                        $project: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            avgRating : { $round: ['$avgRating', 2] },
                            feedback:
                            {
                              $cond: { if: { $not: ["$feedback"] }, then: 0, else: 1 }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            name: {$first: "$name"},
                            price: {$first: '$price'},
                            avgRating: { $avg: "$feedback.rating"},
                            totalFeedback: { $sum: "$feedback"},
                        }
                    },
                    {   
                        $lookup:{
                            from: "comments",
                            localField: "_id",
                            foreignField: 'product',  
                            as: "comments",
                        }
                    },
                    {
                        $unwind: { "path": "$comments", "preserveNullAndEmptyArrays": true }
                    },
                    {
                        $project: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            avgRating : { $round: ['$avgRating', 2] },
                            totalFeedback: "$totalFeedback",
                            // comments: { $size: "$comments" }
                            // comments: { $ifNull: [ "$comments", 0 ] }, 
                            comments:
                            {
                              $cond: { if: { $not: ["$comments"] }, then: 0, else: 1 }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            name: {$first: "$name"},
                            price: {$first: '$price'},
                            avgRating: { $first: "$avgRating"},
                            totalFeedback: { $first: "$totalFeedback"},
                            totalComments: { $sum: "$comments" },
                        }
                    },
                    {
                        $project: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            avgRating : { $round: ['$avgRating', 2] },
                            totalFeedback : '$totalFeedback',
                            totalComments : '$totalComments'
                        }
                    },
                    {
                        $sort: {
                            avgRating: -1,
                            totalFeedback: -1,
                            totalComments: -1,
                        }
                    },
                    {
                        $limit: 30
                    }
                ]);

            }


            let result = productMultistats;
            return res.json(result);
            
        } catch (error) {
            // console.log(error)
            if (checkErrorType(error)) return next(error);
            error.message = "Lamentamos mas de momento não é possível calcular as stats dos produtos. Por favor certifique-se que o seu pedido é válido e volte a tentar mais tarde."
            error.status = 400;
            next(error);        
        }
    }



}

module.exports = ProductController;
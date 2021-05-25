/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { checkBodyDataErrors, trimInternalModelKeysArray, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata } = require('../lib/dataServices');

class CommentController {

    constructor(models) {
        this.models = models;
    }

    async index(req, res, next) {
        const { Comment } = this.models;
        const productId = req.params.id;
        try {
            // Encontrar os comentários de um respectivo produto na BD
            const comments = await Comment.find({product: productId}).populate({
                path: 'user',
                select: 'name',
            })
            .select('-product')
            .populate({
                path: 'product',
                select: 'name'
            });

            //Contar número de resultados
            const totalDocuments = await Comment.countDocuments({product: productId});
            
            //Formatar resposta
            const responseObj = await addIndexMetadata(comments, Comment, "products/"+productId+"/comments", "comment", totalDocuments);
            
            //Display da resposta
            return res.status(200).json(responseObj);
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não conseguimos obter os dados que procura neste momento. Iremos tentar resolver o problema, por favor tente mais tarde.";
            error.status = 400;
            next(error);
        }
    }

    async insert(req, res, next) {
        const { User, Comment, Product } = this.models;
        const productId = req.params.id;
        try{
            //Validar dados inseridos pelo utilizador com uma função que faz várias verificações e responde com mensagens de erro adequadas dependendo da situação
            let bodyDataErrors = checkBodyDataErrors(req.body, Comment);
            if ( bodyDataErrors ) return next(bodyDataErrors);

            //Verificar se o user já comentou este produto
            const alreadyReviewedProduct = await Comment.countDocuments({user: req.me._id, product: productId});
            
            //Caso tenha já comentado, dar mensagem de erro
            if(alreadyReviewedProduct >0) {
                let error = new CustomShopError('Já enviou um comentário sobre este produto, para modificar o seu comentário por favor use o mesmo url com o método PUT');
                error.statusCode = 400;
                return next(error);
            }

            //Caso tudo ok, adicionar comentário à BD
            const novo = await Comment.create( {...req.body, product: productId, user: req.me._id });

            //Gravar o comment na ref comment do user respectivo
            let user = await User.findById(req.me._id);
            if ( !(user.comments && Array.isArray(user.comments)) ) user.comments = [];
            user.comments.push(novo._id);
            await user.save();

            //Gravar o comment na ref comment do product respectivo
            let product = await Product.findById(productId);
            if ( !(product.comments && Array.isArray(product.comments)) ) product.comments = [];
            product.comments.push(novo._id);
            await product.save();

            //Formatar resposta
            const responseObj = await addInsertMetadata(novo, Comment, 'comments', 'comment');

            //Display da resposta
            res.status(201).json(responseObj);
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.statusCode = 400;
            next(error);
        }

    }

    async show(req, res, next) {
        const { Comment } = this.models;
        const commentId = req.params.commentId;
        const productId = req.params.id;

        try {
            //Encontrar comment na BD
            const comment = await Comment.findById(commentId).populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'product',
                select: 'name'
            });
            
            if (comment) {
                //Caso tenha encontrado o comment, então formatar resposta e responder
                const responseObj = await addShowMetadata(comment, Comment, "products/"+productId+"/comments", 'this product\'s comment');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Comentário não encontrado.');
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
        const { Comment } = this.models;
        let commentId = req.params.commentId;
        const productId = req.params.id;
        const to_edit = req.body;
        
        try {
            //Validar dados de entrada
            let bodyDataErrors = checkBodyDataErrors(to_edit, Comment);
            if ( bodyDataErrors ) return next(bodyDataErrors);
            
            //Se o user estiver na rota genérica /comments que não envia commentId, então encontrar o commentId do comentário do user neste produto
            if(!commentId || (commentId && String(commentId).length < 5)){
                //Encontrar o commentId
                const checkUserComment = await Comment.findOne({ product: productId, user: req.me._id });
                if (checkUserComment) commentId = checkUserComment._id; 
            }

            //Encontrar comment a ser editado na BD
            const comment = await Comment.findById(commentId).populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'product',
                select: 'name'
            });
            
            //Se o comment não pertence ao user, então dar erro
            if(!comment.user || comment.user._id != req.me._id){
                let error = new CustomShopError('Este comentário não lhe pertence. Só pode editar comentários que tenha inserido você mesmo.');
                error.statusCode = 400;
                return next(error);
            }

            if(comment) {
                //Caso tenha sido encontrado então aplicar as edições e persisti-las
                Object.entries(to_edit).forEach(([key, value]) => {
                    comment[key] = value;
                });
                let editedKeys = await comment.modifiedPaths();
                await comment.save();
                
                //Formatar resposta
                const responseObj = await addEditMetadata(comment, Comment, "products/"+productId+"/comments", 'this product\'s comment', editedKeys);
                
                //Responder
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Comentário não encontrado');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer a atualização de dados do respectivo comentário. Por favor certifique-se que o seu pedido é válido e volte a tentar."
            error.status = 400;
            next(error);        
        }
    }

    async delete(req, res, next) {
        const { Comment, User, Product } = this.models;
        let commentId = req.params.commentId;
        const productId = req.params.id;

        try {


            //Se o user estiver na rota genérica /comments que não envia commentId, então encontrar o commentId do comentário do user neste produto
            if(!commentId || (commentId && String(commentId) < 5)){
                //Encontrar o commentId
                const checkUserComment = await Comment.findOne({ product: productId, user: req.me._id });
                if (checkUserComment) {commentId = checkUserComment._id; }
                else{
                    let error = new CustomShopError('Não encontrámos nenhum comentário seu, se quiser remover um comentário tem de inserir um primeiro.');
                    error.statusCode = 400;
                    return next(error);
                }
            }

            const checkUserComment = await Comment.findById(commentId);

            //Se o comment não pertence ao usere o user não é admin ou cs, então dar erro
            if( req.me.role != "ADMIN" && req.me.role != "CS" && (!checkUserComment.user || checkUserComment.user != req.me._id) ){
                let error = new CustomShopError('Este comentário não lhe pertence. Só pode remover comentários que tenham sido inseridos por você mesmo.');
                error.statusCode = 400;
                return next(error);
            }

            const comment = await Comment.deleteOne({ _id: commentId });

                if(comment.deletedCount > 0) {      
                    
                    //Caso o comment tenha sido removido com sucesso, então limpar o comment também das suas refencias no product e no user
                    await User.findByIdAndUpdate({_id:checkUserComment.user}, {$pull: {comments: commentId}});
                    await Product.findByIdAndUpdate({_id:productId}, {$pull: {comments: commentId}});

                    const metadata = {
                        deletedCount: comment.deletedCount,
                        functionality: "Add a fresh new comment to this product",
                        method: "POST",
                        url: "/products/"+productId+"/comments",
                    };

                    const responseObj = {
                    status: 'success',
                    message: 'Comment removido com sucesso.', 
                    metadata: metadata,
                    };

                    return res.status(200).json(responseObj);
                } else {
                    let error = new CustomShopError('Comentário não encontrado.');
                    error.statusCode = 404;
                    throw error;
                }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível remover os dados do comentário que procura. Por favor certifique-se que o comment id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }
}

module.exports = CommentController;
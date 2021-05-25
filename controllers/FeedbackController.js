/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { checkBodyDataErrors, trimInternalModelKeysArray, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata } = require('../lib/dataServices');

class FeedbackController {

    constructor(models) {
        this.models = models;
    }

    async index(req, res, next) {
        const { Feedback } = this.models;
        const productId = req.params.id;
        try {
            //Query a todos os feedbacks que correspondam ao produto escolhido
            const feedbacks = await Feedback.find({product: productId}).populate({
                path: 'user',
                select: 'name',
            })
            .select('-product')
            .populate({
                path: 'product',
                select: 'name'
            });
            
            //Contar o numero de feedbacks
            const totalDocuments = await Feedback.countDocuments({product: productId});
            
            //Formatar output
            const responseObj = await addIndexMetadata(feedbacks, Feedback, "products/"+productId+"/feedback", "feedback", totalDocuments);
            
            //Output
            return res.status(200).json(responseObj);
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não conseguimos obter os dados que procura neste momento. Iremos tentar resolver o problema, por favor tente mais tarde.";
            error.status = 400;
            next(error);
        }
    }

    async insert(req, res, next) {
        const { User, Feedback, Product } = this.models;
        const productId = req.params.id;
        try{
            let bodyDataErrors = checkBodyDataErrors(req.body, Feedback);
            if ( bodyDataErrors ) return next(bodyDataErrors);

            //Query ao user para receber o objecto purchases com o populate
            let user =  await User.findById(req.me._id).select('-password').populate({path: 'purchases', populate: { path: 'products.product'}});

            //Lógica para verificar se o user já comprou este produto (só se pode fazer review de produtos já comprados)
            let userOwnsProduct;
            if (user && user.purchases && Array.isArray(user.purchases)){
                let purchaseArray = user.purchases;
                userOwnsProduct = purchaseArray.some( (element) =>{
                   
                    if(element.paid){
                        let productsArray = element.products;
                        let foundProduct = productsArray.some( (element2) => {
                            if (element2.product && element2.product._id && productId == element2.product._id) return true;
                        });
                        if (foundProduct) return true;
                    };

                });
            };

            if (!userOwnsProduct){
                let error = new CustomShopError('Só pode fazer reviews de produtos que já tenha comprado. Se quiser pode fazer um comentário ao invés de uma review, para tal por favor siga as instruções mais abaixo. Ou em alternativa, pode comprar o produto e depois fazer uma review.');
                error.additionalInfo = [
                    {
                    method: 'POST',
                    url: '/products/'+productId+'/comments',
                    key: 'comment',
                    value: 'O seu comentário tem de ser mais longo do que 15 caracteres.'
                    },
                    {
                        method: 'POST',
                        url: '/products/'+productId+'/cart',
                        info: 'Para comprar o produto use o url acima e depois use /purchases/(purchaseId)/payment com POST, após ter adicionado o produto ao seu carrinho para efetuar o pagamento.'
                    }
                ];
               
                error.statusCode = 400;
                return next(error);
            }


            const alreadyReviewedProduct = await Feedback.countDocuments({user: req.me._id, product: productId});
            
            if(alreadyReviewedProduct >0) {
                let error = new CustomShopError('Já enviou feedback sobre este produto, para modificar o seu feedback por favor use o mesmo url com o método PUT');
                error.statusCode = 400;
                return next(error);
            }

            const novo = await Feedback.create( {...req.body, product: productId, user: req.me._id });

            //Gravar o feedback na ref feedback do user respectivo
            // let user = await User.findById(req.me._id);
            if ( !(user.feedback && Array.isArray(user.feedback)) ) user.feedback = [];
            user.feedback.push(novo._id);
            await user.save();

            //Gravar o feedback na ref feedback do product respectivo
            let product = await Product.findById(productId);
            if ( !(product.feedback && Array.isArray(product.feedback)) ) product.feedback = [];
            product.feedback.push(novo._id);
            await product.save();

            const responseObj = await addInsertMetadata(novo, Feedback, 'feedbacks', 'feedback');

            res.status(201).json(responseObj);
        } catch (error) {
            // console.log (error)
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.statusCode = 400;
            next(error);
        }

    }

    async show(req, res, next) {
        const { Feedback } = this.models;
        const feedbackId = req.params.feedbackId;
        const productId = req.params.id;

        try {
            const feedback = await Feedback.findById(feedbackId).populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'product',
                select: 'name'
            });
            
            if (feedback) {
                const responseObj = await addShowMetadata(feedback, Feedback, "products/"+productId+"/feedback", 'this product\'s feedback');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Feedback não encontrado.');
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
        const { Feedback } = this.models;
        let feedbackId = req.params.feedbackId;
        const productId = req.params.id;
        const to_edit = req.body;
        
        try {
            let bodyDataErrors = checkBodyDataErrors(to_edit, Feedback);
            if ( bodyDataErrors ) return next(bodyDataErrors);
            

            //Se o user estiver na rota genérica /feedback que não envia feedbackId, então encontrar o feedbackId do feedback do user neste produto
            if(!feedbackId || (feedbackId && String(feedbackId).length < 5)){
                //Encontrar o feedbackId
                const checkUserFeedback = await Feedback.findOne({ product: productId, user: req.me._id });
                if (checkUserFeedback) feedbackId = checkUserFeedback._id; 
            }


            const feedback = await Feedback.findById(feedbackId).populate({
                path: 'user',
                select: 'name',
            })
            .populate({
                path: 'product',
                select: 'name'
            });
            
            //Se o feedback não pertence ao user, então dar erro
            if(!feedback.user || feedback.user._id != req.me._id){
                let error = new CustomShopError('Este feedback não lhe pertence. Só pode editar feedback que tenha inserido você mesmo.');
                error.statusCode = 400;
                return next(error);
            }
            else if(feedback) {
                Object.entries(to_edit).forEach(([key, value]) => {
                    feedback[key] = value;
                });
                let editedKeys = await feedback.modifiedPaths();
                await feedback.save();
                const responseObj = await addEditMetadata(feedback, Feedback, "products/"+productId+"/feedback", 'this product\'s feedback', editedKeys);
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Feedback não encontrado');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer a atualização de dados do respectivo feedback. Por favor certifique-se que o seu pedido é válido e volte a tentar."
            error.status = 400;
            next(error);        
        }
    }

    async delete(req, res, next) {
        const { Feedback, User, Product } = this.models;
        let feedbackId = req.params.feedbackId;
        const productId = req.params.id;

        try {
            let feedback;

            //Se o user estiver na rota genérica /feedbacks que não envia feedbackId, então encontrar o feedbackId do feedback do user sobre este produto
            if(!feedbackId || (feedbackId && String(feedbackId).length < 5)){
                //Encontrar o feedbackId
                const checkUserFeedback = await Feedback.findOne({ product: productId, user: req.me._id });
                if (checkUserFeedback) {feedbackId = checkUserFeedback._id; }
                else{
                    let error = new CustomShopError('Não encontrámos nenhum feedback seu, se quiser remover um feedback tem de inserir um primeiro.');
                    error.statusCode = 400;
                    return next(error);
                }
            }

            const checkUserFeedback = await Feedback.findById(feedbackId);
            
            //Se o feedback não pertence ao user e o user não é admin ou cs, então dar erro
            if( req.me.role != "ADMIN" && req.me.role != "CS" && (!checkUserFeedback.user || checkUserFeedback.user != req.me._id) ){
                let error = new CustomShopError('Este feedback não lhe pertence. Só pode remover feedbacks que tenham sido inseridos por você mesmo.');
                error.statusCode = 400;
                return next(error);
            }

            //remover feedback da BD
            if(req.me.role != "ADMIN" && req.me.role != "CS"){
                feedback = await Feedback.deleteOne({ _id: feedbackId, user: req.me._id });
            }else{
                feedback = await Feedback.deleteOne({ _id: feedbackId });
            }

            if(feedback.deletedCount > 0) {                

                //Caso o feedback tenha sido removido com sucesso, então limpar o feedback também das suas refencias no product e no user
                await User.findByIdAndUpdate({_id:checkUserFeedback.user}, {$pull: {feedback: feedbackId}});
                await Product.findByIdAndUpdate({_id:productId}, {$pull: {feedback: feedbackId}});

                const metadata = {
                    deletedCount: feedback.deletedCount,
                    functionality: "Add a fresh new review/feedback to this product",
                    method: "POST",
                    url: "/products/"+productId+"/feedback",
                };

                const responseObj = {
                status: 'success',
                message: 'Feedback removido com sucesso.', 
                metadata: metadata,
                };

                return res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Feedback não encontrado ou não tem permissões para remover este feedback (só pode remover feedback seu).');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            // console.log(error)
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível remover os dados do feedback que procura. Por favor certifique-se que o feedback id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }
}

module.exports = FeedbackController;
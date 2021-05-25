/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { isAuthenticated } = require('../lib/auth');
const { checkBodyDataErrors, trimInternalModelKeysArray, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata } = require('../lib/dataServices');

class PurchaseController {

    constructor(models) {
        this.models = models;
    }



    async addCartProduct(req, res, next) {
        const { Purchase, Product, User } = this.models;
        const productId = req.params.id;
        const { quantity } = req.body;

        //Verificar se um dado productId pertence a um produto existente
        try {
            const product = await Product.findById(productId);
            if (product) {
                
                try{
                    let user = await User.findById(req.me._id).populate('purchases');

                    //receber o último carrinho que ainda não está pago e adicionar-lhe o novo produto
                    if (user.purchases.length > 0){
                        
                        const [lastPurchaseId] = user.purchases.slice(-1);

                        
                        if (lastPurchaseId != null || lastPurchaseId != undefined){

                            //Encontrar a última purchase (mais recente)
                            const lastPurchase = await Purchase.findById(lastPurchaseId).populate('products');

                            //Se este carrinho já estiver pago, então criar um novo carrinho
                            let realPurchase;
                            if (lastPurchase.paid){
                                const newPurchase = new Purchase({
                                    paid: false,
                                    buyer: req.me._id
                                });

                                realPurchase = newPurchase;
                            } 
                            else {

                                // verificar se o produto já existe na lista de compras mais recente, e se já existe, então devolver erro.
                                let index; 
                                if ( lastPurchase.products.some( 
                                    (element, elementIndex) => { 
                                        if (element.product == productId) {
                                            index = elementIndex;
                                            return true;
                                        }
                                    } 
                                )){
                                    // Se o produto estiver na lista de compras mais recente, devolve-se um erro

                                    const error = new CustomShopError('O produto que está a tentar adicionar já se encontra na sua lista de compras. Para modificar quantidades ou removê-lo da lista de compras por favor use o mesmo path com o método PUT ou DELETE');
                                    error.additionalInfo = {
                                        functionality: "Ver todos os carrinhos/purchases",
                                        method: "GET",
                                        url: "/purchases",
                                    }
                                    error.statusCode = 403;
                                    throw error;
                                }
                                else{
                                    //Se não estiver na lista de compras mais recente, deixa-se adicionar o produto
                                    realPurchase = lastPurchase;
                                }
                                
                            }
                            
                            let newProduct = {
                                quantity: quantity,
                                product: product._id
                            };

                            realPurchase.products.push(newProduct);

                            //Guardar a compra na BD
                            try {
                                
                                if (user) {
                                    await realPurchase.save();
                                    if (lastPurchase.paid) {
                                        user.purchases.push(realPurchase._id);
                                        await user.save();
                                    }

                                    const checkSavedPurchase = await Purchase.findById(realPurchase._id).populate('products.product');

                                    const responseObj = {
                                        status: 'success',
                                        data: {
                                            message: 'Produto adicionado com sucesso.',
                                            cart: checkSavedPurchase
                                        },
                                        metadata: {
                                            functionality: "Ver todos os produtos",
                                            method: "GET",
                                            url: "/products",
                                        }
                                    };
                                    return res.status(201).json(responseObj);
                                } else {
                                    const error = new CustomShopError('Utilizador não encontrado.');
                                    error.statusCode = 400;
                                    throw error;
                                }
                            } catch (error) {
                                if (checkErrorType(error)) return next(error);
                                error.message = "O produto que está a tentar adicionar não se encontra na base de dados."
                                error.status = 400;
                                next(error);
                            }

                        }
                        

                    }else{
                        //Criar uma nova compra

                            //Fill new Purchase object with data (paid, buyer, and products)
                            const newPurchase = new Purchase({
                                paid: false,
                                buyer: req.me._id
                            });
                            
                            let newProduct = {
                                quantity: quantity,
                                product: product._id
                            };

                            newPurchase.products.push(newProduct);

                           
                            try {
                                
                                if (user) {
                                    await newPurchase.save();
                                    user.purchases.push(newPurchase._id);
                                    await user.save();
                                    
                                    const checkSavedPurchase = await Purchase.findById(newPurchase._id).populate('products.product');
                                   
                                    const responseObj = {
                                        status: 'success',
                                        data: {
                                            message: 'Produto adicionado ao carrinho com sucesso.',
                                            cart: checkSavedPurchase
                                        },
                                        metadata: {
                                            functionality: "Ver todos os produtos",
                                            method: "GET",
                                            url: "/products",
                                        }
                                    };
                                    return res.status(201).json(responseObj);
                                } else {
                                    const error = new CustomShopError('Utilizador não encontrado.');
                                    error.statusCode = 400;
                                    throw error;
                                }
                            } catch (error) {
                                if (checkErrorType(error)) return next(error);
                                error.message = "Não foi possível executar o seu pedido, por favor verifique todos os dados que enviou e tente novamente."
                                error.status = 400;
                                next(error);
                            }

                    }
                }catch(error){
                    if (checkErrorType(error)) return next(error);
                    error.message = "Não foi possível executar o seu pedido, por favor verifique todos os dados que enviou e tente novamente."
                    error.status = 400;
                    next(error);
                }
            } else {
                const error = new CustomShopError('O produto que procura não se encontra na base de dados 1.');
                error.statusCode = 400;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O produto que procura não se encontra na base de dados 2."
            error.status = 400;
            next(error);
        }

    } //End addCartProduct()




    async editCartProduct(req, res, next) {
        const { Purchase, Product, User } = this.models;
        const productId = req.params.id;
        const { quantity } = req.body;
        
        //Check if given productId belongs to an existing product
        try {
            const product = await Product.findById(productId);
            if (product) {
                
                try{
                    let user = await User.findById(req.me._id).populate('purchases');

                    //get the last unpaid cart and add new product there
                    if (user.purchases.length > 0){
                        
                        const [lastPurchaseId] = user.purchases.slice(-1);

                        //Se o último carrinho estiver bem definido e não existirem quaisquer erros, então continuar
                        if (lastPurchaseId != null || lastPurchaseId != undefined){

                            //Get last Purchase object
                            const lastPurchase = await Purchase.findById(lastPurchaseId).populate('products');

                            //if Purchase has already been paid, output error
                            if (lastPurchase.paid){
                                const error = new CustomShopError('Quando estiver a adicionar um produto ao carrinho pela primeira vez, por favor use o método POST neste mesmo url');
                                error.additionalInfo = {
                                    functionality: "Adicionar produto ao carrinho",
                                    method: "POST",
                                    url: "/products/"+productId+"/cart",
                                }
                                error.statusCode = 403;
                                throw error;
                            } 
                          
                            // verificar se o produto já existe na lista de compras mais recente, e se já existe, altera quantidade ou remove o produto se quantidade for zero.
                            let index; 
                            if ( lastPurchase.products.some( 
                                (element, elementIndex) => { 
                                    if (element.product == productId) {
                                        index = elementIndex;
                                        return true;
                                    }
                                }))
                                {
                                    // Se o produto estiver na lista de compras mais recente, edita-se quantidade ou remove-se
                                    if ( quantity && quantity > 0){
                                        lastPurchase.products[index].quantity = quantity;
                                    }else{
                                        //Se quantity não estive definido, assumir acção de remover produto. (acção de toggle)
                                        lastPurchase.products.splice(index, 1);
                                    }
                                }
                                else{
                                    //Se não estiver na lista de compras mais recente, adiciona-se (acção de toggle)
                                    let editedProduct = {
                                        quantity: quantity,
                                        product: product._id
                                    };
        
                                    lastPurchase.products.push(editedProduct);
                                }

                            //Guardar a compra
                            try {
                                await lastPurchase.save();
                                const checkSavedPurchase = await Purchase.findById(lastPurchase._id).populate('products.product');

                                const responseObj = {
                                    status: 'success',
                                    data: {
                                        message: 'Carrinho editado com sucesso.',
                                        cart: checkSavedPurchase
                                    },
                                    metadata: [
                                        {
                                            functionality: "Ver todos os produtos",
                                            method: "GET",
                                            url: "/products",
                                        },
                                        {
                                            functionality: "Remover produto",
                                            method: "DELETE",
                                            url: "/products/"+productId+"/cart",
                                        },
                                    ]
                                };
                                return res.status(201).json(responseObj);
                               
                            } catch (error) {
                                if (checkErrorType(error)) return next(error);
                                error.message = "Não foi possível processar o seu pedido, por favor verifique os seus dados e volte a tentar."
                                error.status = 400;
                                next(error);
                            }

                        }else{
                            const error = new CustomShopError('Quando estiver a adicionar um produto ao carrinho pela primeira vez, por favor use o método POST neste mesmo url.');
                            error.statusCode = 400;
                            throw error;
                        }
                        
                    }else{
                        const error = new CustomShopError('Quando estiver a adicionar um produto ao carrinho pela primeira vez, por favor use o método POST neste mesmo url.');
                        error.statusCode = 400;
                        throw error;
                    }
                }catch(error){
                    if (checkErrorType(error)) return next(error);
                                error.message = "Não foi possível processar o seu pedido, por favor verifique os seus dados e volte a tentar."
                                error.status = 400;
                                next(error);
                }
            } else {
                const error = new CustomShopError('O produto que procura não se encontra na base de dados 3.');
                error.statusCode = 400;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O produto que procura não se encontra na base de dados 4"
            error.status = 400;
            next(error);
        }

    } //End editCartProduct()




    async deleteCartProduct(req, res, next) {
        const { Purchase, Product, User } = this.models;
        const productId = req.params.id;
        const { quantity } = req.body;
        
        //Check if given productId belongs to an existing product
        try {
            const product = await Product.findById(productId);
            if (product) {
                
                try{
                    let user = await User.findById(req.me._id).populate('purchases');

                    //ver se o carrinho não-pago tem lá alguma coisa
                    if (user.purchases.length > 0){
                        
                        // receber o id do carrinho mais recente não-pago
                        const [lastPurchaseId] = user.purchases.slice(-1);

                        //Se o último carrinho estiver bem definido e não existirem quaisquer erros, então continuar
                        if (lastPurchaseId != null || lastPurchaseId != undefined){

                            //receber o objecto da última Purchase
                            const lastPurchase = await Purchase.findById(lastPurchaseId).populate('products');

                            //Se a Purchase já tiver sido efetuada, então output error
                            if (lastPurchase.paid){

                                const error = new CustomShopError('Não existe nenhuma lista de compras por pagar. Só pode remover produtos de uma lista de compras que ainda não esteja paga.');
                                error.additionalInfo = {
                                    functionality: "Adicionar produto a um novo carrinho",
                                    method: "POST",
                                    url: "/products/"+productId+"/cart",
                                }
                                error.statusCode = 403;
                                throw error;
                            } 
                          
                            // verificar se o produto já existe na lista de compras mais recente, e se já existe, remove o produto 
                            let index; 
                            if ( lastPurchase.products.some( 
                                (element, elementIndex) => { 
                                    if (element.product == productId) {
                                        index = elementIndex;
                                        return true;
                                    }
                                }))
                                {
                                    // Se o produto estiver na lista de compras mais recente, então remove-se
                                    lastPurchase.products.splice(index, 1);

                                    //Guardar a compra
                                    try {
                                        await lastPurchase.save();
                                        const checkSavedPurchase = await Purchase.findById(lastPurchase._id).populate('products.product');

                                        const responseObj = {
                                            status: 'success',
                                            message: 'O produto foi removido do carrinho de compras.',
                                            metadata: {
                                                functionality: "Ver todos os produtos",
                                                method: "GET",
                                                url: "/products/",
                                                DeletedProduct: product
                                            }
                                        };
                                        return res.status(200).json(responseObj);
                                    } catch (error) {
                                        if (checkErrorType(error)) return next(error);
                                        error.message = "Não foi possível satisfazer o seu pedido, por favor verifique os dados e tente novamente."
                                        error.status = 400;
                                        return next(error);
                                    }
                                    
                                }
                                else{
                                    //Se não estiver na lista de compras mais recente, então output mensagem de erro
                                    const error = new CustomShopError('O produto não foi encontrado na sua lista de compras.');
                                    error.additionalInfo = 
                                    {
                                        functionality: "Ver todos os produtos",
                                        method: "GET",
                                        url: "/products/",
                                    };
                                    error.statusCode = 404;
                                    throw error;
                                }

                        }else{
                            const error = new CustomShopError('Não tem nenhum carrinho de compras passível de ser anulado/removido');
                            error.statusCode = 400;
                            throw error;
                        }
                        
                    }else{
                        const error = new CustomShopError('Não tem nenhum carrinho de compras passível de ser anulado/removido');
                        error.statusCode = 400;
                        throw error;
                    }
                }catch(error){
                    if (checkErrorType(error)) return next(error);
                    error.message = "Não foi possível satisfazer o seu pedido, por favor verifique os dados e tente novamente."
                    error.status = 400;
                    return next(error);
                }
            } else {
                const error = new CustomShopError('O produto que procura não se encontra na base de dados.');
                error.statusCode = 400;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O produto que procura não se encontra na base de dados"
            error.status = 400;
            return next(error);
        }

    } //End deleteCartProduct()





    async index(req, res, next) {
        const { User, Purchase } = this.models;
        try {
            const purchase = await Purchase.find({buyer: req.me._id}).populate('products.product').populate({
                path: 'buyer',
                select: 'name -_id',
            });

            const totalDocuments = await Purchase.countDocuments({buyer: req.me._id});
            const responseObj = await addIndexMetadata(purchase, Purchase, "purchases", "purchase", totalDocuments);
            return res.status(200).json(responseObj);

        } catch (error) {
            next(error);
            if (checkErrorType(error)) return next(error);
            error.message = "Não conseguimos obter os dados que procura neste momento. Iremos tentar resolver o problema, por favor tente mais tarde.";
            error.status = 400;
            next(error);
        }
    }

    //Exemplo de como fazer uma query com query builder: 
    // Person.
    //   find({ occupation: /host/ }).
    //   where('name.last').equals('Ghost').
    //   where('age').gt(17).lt(66).
    //   where('likes').in(['vaporizing', 'talking']).
    //   limit(10).
    //   sort('-occupation').
    //   select('name occupation')

    async show(req, res, next) {
        const { User, Purchase } = this.models;
        const id = req.params.id;

        try {
            const purchase = await Purchase.find({buyer: req.me._id, _id: id}).populate('products.product').populate({
                path: 'buyer',
                select: 'name -_id',
            });

            const responseObj = await addShowMetadata(purchase, Purchase, "purchases", "purchase");
            
            if (!purchase.paid){
                const metadata = [
                    {
                    functionality: "Verificar o custo total do seu carrinho",
                    method: "GET",
                    url: "/purchases/" + id + "/payment",
                    },
                    {
                    functionality: "Pagar este carrinho",
                    method: "POST",
                    url: "/purchases/" + id + "/payment",
                    },
                ];
                metadata.push(responseObj.metadata);
                responseObj.metadata = metadata;
            }

            return res.status(200).json(responseObj);
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível mostrar os dados do compra que procura. Por favor certifique-se que o purchase id que enviou no url é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }//end show()


    async pay(req, res, next) {
        const { Purchase, User } = this.models;
        const id = req.params.id;

        try {
            const user = await User.findById(req.me._id)
            .where('purchases').equals(id)
            .select('purchases')
            .populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            })
            .populate({
                path: 'purchases',
                populate: { path: 'buyer', 
                // select:'-password -email -createdAt -updatedAt -__v',
                select:'_id',
                }
            });

            
            if (user.purchases){
                const purchase = await Purchase.findById(id)
                .populate({
                    path: 'products.product',
                })
                .populate({
                    path: 'buyer', 
                    select:'_id',
                });

                if (purchase){

                    //Verificar caso este pagamento já tenha sido pago, neste caso devolver mensagem respectiva
                    if (purchase.paid) {
                        const error = new CustomShopError('O pagamento deste carrinho já foi efetuado.');
                        error.additionalInfo = {
                            functionality: "Ver todos os carrinhos/purchases",
                            method: "GET",
                            url: "/purchases",
                        }
                        error.statusCode = 403;
                        throw error;
                    }

                    //Processar pagamento com API de um payment service provider
                    const paymentGood = await this.processPayment(req, res, next);

                    if (paymentGood){
                        purchase.paid = true;
                        await purchase.save();

                        const responseObj = {
                            status: 'success',
                            data: {
                                message: 'Pagamento efetuado com sucesso.',
                                cart: purchase
                            },
                            metadata: {
                                functionality: "Ver todos os carrinhos/purchases",
                                method: "GET",
                                url: "/purchases",
                            }
                        };
                        return res.status(200).json(responseObj);
                    }else{
                        const error = new CustomShopError('Problemas com o pagamento, por favor tente novamente.');
                        error.statusCode = 400;
                        throw error;
                    }
                }else{
                    const error = new CustomShopError('Esta purchase não é válida, por favor corrija o seu pedido e tente novamente.');
                    error.statusCode = 400;
                    throw error;
                }
            }else{
                const error = new CustomShopError('Esta purchase não é válida, por favor corrija o seu pedido e tente novamente.');
                error.statusCode = 400;
                throw error;
            }
 
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Este Carrinho/Purchase não é válido, por favor verifique os dados do seu pedido e tente novamente."
            error.status = 400;
            next(error);
        }

    }

    async processPayment(req, res, next){
        try{
            //Inserir código para aceder ao API do payment process service
            // const paid = await servicePayment(CCinfo);
            //Se "paid" devolver true então:
            return true;
        } catch(error){
            if (checkErrorType(error)) return next(error);
            error.message = "Problemas com o pagamento, por favor tente novamente."
            error.status = 400;
            next(error);
            return false;
        }
    }







    

    async getTotal(req, res, next) {
        const { Purchase, User } = this.models;
        const id = req.params.id;

        try {
            const user = await User.findById(req.me._id)
            .where('purchases').equals(id)
            .select('purchases')
            .populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            })
            .populate({
                path: 'purchases',
                populate: { path: 'buyer', 
                // select:'-password -email -createdAt -updatedAt -__v',
                select:'_id',
                }
            });

            
            if (user.purchases){
                const purchase = await Purchase.findById(id)
                .populate({
                    path: 'products.product',
                })
                .populate({
                    path: 'buyer', 
                    select:'_id',
                });

                if (purchase){
                    //Verificar caso este pagamento já tenha sido pago, neste caso devolver mensagem respectiva
                    if (purchase.paid) {
                        const error = new CustomShopError('O pagamento deste carrinho já foi efetuado.');
                        error.additionalInfo = {
                            functionality: "Ver todos os carrinhos/purchases",
                            method: "GET",
                            url: "/purchases",
                        }
                        error.statusCode = 403;
                        throw error;
                    }

                    //Verificar o preço total dos produtos neste carrinho
                    //Usando Reduce() 
                    // IMPORTANTE - é bom definir o initialValue no reduce, para que não seja automaticamente atribuido o primeiro valor do array ao acc, assim é mais fácil controlarmos o que vai sair no output, pois por exemplo, num array com apenas uma entrada, o reduce() simplesmente devolve o primeiro elemento do array e não faz call ao callback. 
                    let totalPrice = purchase.products.reduce( (acc, ele, index) =>{
                        return ( acc + (ele['product']['price'] * ele['quantity']) );
                    }, 0 );
                    totalPrice = parseFloat( totalPrice.toFixed(2) );
                    
                    
                    //Usando forEach()
                    // purchase.products.forEach( (element) => {
                    //     let instantProductId = element['product'];
                    //     console.log(instantProductId['price']);
                    //   totalPrice += element['quantity'] * element['product']['price'];
                    // });
                    if (totalPrice && totalPrice > 0){

                        const responseObj = {
                            status: 'success',
                            data: {
                                message: 'O preço total deste carrinho é de: ' + totalPrice +" euros",
                                buy: 'Para efetuar o pagamento deste carrinho use o método POST neste mesmo path',
                                cart: purchase
                            },
                            metadata: {
                                functionality: "Pagar este carrinho/purchase",
                                method: "POST",
                                url: "/purchases/" + id + "/payment",
                            }
                        };
                        return res.status(200).json(responseObj);

                    }else{
                        const error = new CustomShopError('Problemas com o pagamento, por favor tente novamente.');
                        error.statusCode = 400;
                        throw error;
                    }
                }
                else{
                    const error = new CustomShopError('Esta purchase não é válida, por favor corrija o seu pedido e tente novamente.');
                    error.statusCode = 400;
                    throw error;
                }
            }else{            
                const error = new CustomShopError('Esta purchase não é válida, por favor corrija o seu pedido e tente novamente.');
                error.statusCode = 400;
                throw error;
            }
 
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Este Carrinho/Purchase não é válido, por favor verifique os dados do seu pedido e tente novamente."
            error.status = 400;
            next(error);
        }

    } //end getTotal()




    async delete(req, res, next) {
        const { Purchase, User } = this.models;
        const id = req.params.id;

        try {
            const user = await User.findById(req.me._id)
            .where('purchases').equals(id)
            .select('purchases')
            .populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            })
            .populate({
                path: 'purchases',
                populate: { path: 'buyer', 
                // select:'-password -email -createdAt -updatedAt -__v',
                select:'_id',
                }
            });

            
            if (user.purchases){
                const purchase = await Purchase.findById(id)
                .populate({
                    path: 'products.product',
                })
                .populate({
                    path: 'buyer', 
                    select:'_id',
                });

                

                if (purchase){
 
                    //Verificar caso este pagamento já tenha sido pago, neste caso devolver mensagem respectiva
                    if (purchase.paid) {
                        let error = new CustomShopError('O pagamento deste carrinho já foi efetuado. Não é possível desgravar dados de pagamento efetuados pois estes servem para arquivo histórico de transações.');
                        error.additionalInfo = {
                            functionality: "Ver todos os carrinhos/purchases",
                            method: "GET",
                            url: "/purchases",
                        }
                        error.statusCode = 403;
                        throw error;
                    }

                    
                    const purchaseDeleted = await purchase.deleteOne({ _id: id });
                    let indexToDelete;
                    user.purchases.some( (element, index) => {
                        if (element.id == id) {
                            indexToDelete = index;
                            return true; 
                        }
                    })
               
                    // Se o delete funcionou bem no modelo Purchase, então fazer delete à sua referência no modelo User, anulando o respectivo elemento no array de referencia Purchases
                    if (purchaseDeleted && indexToDelete != null && indexToDelete >=0){
                        user.purchases.splice(indexToDelete, 1);
                        await user.save();

                        const responseObj = {
                            status: 'success',
                            message: 'Carrinho de compras removido com sucesso',
                            metadata: {
                                functionality: "Ver todos os produtos",
                                method: "GET",
                                url: "/products/",
                            }
                        };
                        return res.status(200).json(responseObj);
                    }else{
                        const error = new CustomShopError('Não foi possível remover esta lista de compras/carrinho, por favor tente mais tarde.');
                        error.statusCode = 409;
                        throw error;
                    }
                }else{            
                    const error = new CustomShopError('Esta purchase não é válida, por favor corrija o seu pedido e tente novamente.');
                    error.statusCode = 400;
                    throw error;
                }
            }else{            
                const error = new CustomShopError('Esta purchase não é válida, por favor corrija o seu pedido e tente novamente.');
                error.statusCode = 400;
                throw error;
            }
 
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Este Carrinho/Purchase não é válido, por favor verifique os dados do seu pedido e tente novamente."
            error.status = 400;
            next(error);
        }

    }//end delete()
   
}

module.exports = PurchaseController;
/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { checkBodyDataErrors, trimInternalModelKeysArray, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata } = require('../lib/dataServices');


class UserController {

    constructor(models) {
        this.models = models;
    }

    async index(req, res, next) {
        const { User } = this.models;

        try{
            const users = await User.find().populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            })
            .populate({path:'feedback', select:'rating review'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'wishlist', select:'name'});
            
            const responseObj = await addIndexMetadata(users, User, "users", "user");
            return res.status(200).json(responseObj);
        }catch(error){
            if (checkErrorType(error)) return next(error);
            error.message = "Não conseguimos obter os dados que procura neste momento. Iremos tentar resolver o problema, por favor tente mais tarde.";
            error.status = 400;
            next(error);
        }
    }

    async insert(req, res, next) {
        const { User } = this.models;

        try {
            let bodyDataErrors = checkBodyDataErrors(req.body, User, ['passwordResetToken', 'passwordResetDeadline'], ['password2']);
            if ( bodyDataErrors ) return next(bodyDataErrors);

            const novo = await User.create( req.body );
            const responseObj = await addInsertMetadata(novo, User, 'users', 'user');

            res.status(201).json(responseObj);
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.status = 400;
            next(error);
        }
    }


    async show(req, res, next) {
        const { User } = this.models;
        const id = req.params.id;
        try {
            const user = await User.findById(id).select('-password').populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            })
            .populate({path:'feedback', select:'rating review'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'wishlist', select:'name'});

            if (user) {    
                const responseObj = await addShowMetadata(user, User, 'users', 'user');
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Utilizador não encontrado.');
                error.statusCode = 404;
                throw error;
            }
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível mostrar os dados do utilizador que procura. Por favor certifique-se que o user id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }


    async edit(req, res, next) {
        const { User } = this.models;
        const id = req.params.id;
        const to_edit = req.body;

        try {
            let bodyDataErrors = checkBodyDataErrors(req.body, User, ['passwordResetToken', 'passwordResetDeadline'], ['password2']);

            if ( bodyDataErrors ) return next(bodyDataErrors);

            const user = await User.findById(id).select('-password').populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            })
            .populate({path:'feedback', select:'rating review'})
            .populate({path:'comments', select:'comment'})
            .populate({path:'wishlist', select:'name'});

            let editedKeys = [];
            if (user) {
                Object.entries(to_edit).forEach(([key, value]) => {
                    user[key] = value;
                });
                try{ 
                    //Se quisermos usar a solução mais elegante para saber o que foi mesmo modificado no modelo, podemos usar o modifiedPaths(), mas temos de ter o cuidado de chamar este método antes do save:
                    editedKeys = user.modifiedPaths();
                    user.adminEditing = true;
                    await user.save();

                }catch(error) {
                    if (checkErrorType(error)) return next(error);
                    error.message = "Não é possível fazer a atualização de dados do respectivo utilizador. Por favor certifique-se que o seu pedido é válido e volte a tentar."
                    error.status = 400;
                    next(error);
                }

                // editedUser = editedUser.modifiedPaths({includeChildren: true});
                //Aqui verificamos diretamente no model do mongoose se o save() modificou algum parametro, e filtramos as keys automáticas (_id, timestamps, etc...)
                
                //Forma bruta de ir buscar os modifiedPaths ao modelo do mongoose, a vantagem disto sobre fazer user.modifiedPaths() é que assim conseguimos obter os modified paths depois de ter feito o save.
                // if (user.$__.modifiedPaths && user.$__.modifiedPaths.length > 0){
                //     editedKeys = trimInternalModelKeysArray(user.$__.modifiedPaths);
                // }
                

                //Se nada tiver sido alterado, então dizer isso ao utilizador:
                if (editedKeys.length <= 0) {
                    let error = new CustomShopError('Nada foi alterado, certifique-se que está a enviar as chaves/keys corretas no body (ex: email, password) e/ou que os seus valores são diferentes dos existentes');
                    error.statusCode = 400;
                    throw error;
                }

                //Uma solução possível é esta, para remover a password do objecto que se devolve no json(), copiar o objecto .doc dentro do modelo user, e depois remover-lhe o par chave/valor com um delete. 
                //Uma solução seria copiar o objecto primeiro porque um delete directo no modelo não teria efeito.
                //Mas teria efeito se fosse feito diretamente no ._doc, ou seja: delete user._doc.password; (o que seria uma solução alternativa). Ou seja:
                // let userShallowCopy = { ...user._doc };

                //esconder password caso tenha sido atualizada
                if (user.password) delete user._doc.password;

                const responseObj = await addEditMetadata(user, User, 'users', 'user', editedKeys);
                res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Utilizador não encontrado');
                error.statusCode = 404;
                throw error;
            }
        } catch(error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível editar os dados do utilizador que procura. Por favor certifique-se que o user id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }

    }

    async delete(req, res, next) {
        const { User } = this.models;
        const id = req.params.id;
        try {
            const user = await User.deleteOne({ _id: id });

            if(user.deletedCount > 0) {
                const responseObj = await addDeleteMetadata(user, User, 'users', 'user', 'Utilizador removido com sucesso.');
                return res.status(200).json(responseObj);
            } else {
                let error = new CustomShopError('Utilizador não encontrado.');
                error.statusCode = 404;
                throw error;
            }
           
        } catch (error) {
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível remover os dados do utilizador que procura. Por favor certifique-se que o user id que enviou é válido e volte a tentar."
            error.status = 400;
            next(error);
        }
    }
}

module.exports = UserController;
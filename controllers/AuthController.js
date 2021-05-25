/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { createToken } = require('../lib/auth');
const { checkBodyDataErrors, trimInternalModelKeysArray, getEditableModelKeys, checkErrorType } = require('../lib/validationServices');
const { CustomShopError } = require('../lib/CustomShopError');
const { addIndexMetadata, addInsertMetadata, addShowMetadata, addEditMetadata, addDeleteMetadata } = require('../lib/dataServices');
const SendEmail = require('../lib/SendEmail');
const crypto = require('crypto');


class AuthController {

    constructor(models) {
        this.models = models;
    }

    async warnUser(req, res, next) {
        const { User } = this.models;
        let editableKeysArray = getEditableModelKeys(User, ['role']);

        // console.log(req.originalUrl)
        let error = new CustomShopError('Endpoint incorreto');
        error.statusCode = 400;
        error.additionalInfo = { 
            WrongEndPoint: 'Se está tentar registar-se, por favor use o endpoint \'/register\' com o método POST, e as propriedades descritas abaixo. Se está tentar fazer login, por favor use o endpoint \'/login\' com o método POST e o email/username e password',
            valid_keys: editableKeysArray,
        };
        return next(error);
    }

    async logIn(req, res, next) {
        const { User } = this.models;
        const { email, password, username } = req.body;
        let emailOrUsername;

        try{
        //Verificar se o utilizador enviou uma password e um email no body
            if ((password && email) || (password && username)){
                // const user = await User.findOne({ email }).select('password');
                
                email ? emailOrUsername = {email: email} : emailOrUsername = { username: username};

                const user = await User.findOne( emailOrUsername );
                if (user) {
                    if (await user.checkPassword(password, emailOrUsername)) {
                        res.status(200).json({
                            token: await createToken(user),
                        })
                    } else {
                        let error = new CustomShopError('Password incorreta');
                        error.statusCode = 400;
                        throw error;
                    }
                } else {
                    let error = new CustomShopError('Utilizador não encontrado');
                    error.statusCode = 400;
                    throw error;
                }
            }else if (email || username){
                let error = new CustomShopError('É necessário uma password');
                error.statusCode = 400;
                throw error;
            }
            else if (password){
                let error = new CustomShopError('É necessário um email ou um username');
                error.statusCode = 400;
                throw error;
            }
            else{
                let error = new CustomShopError('São necessários um email ou username, e uma password');
                error.statusCode = 400;
                throw error;
            }
        }catch(error){
            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível executar o seu pedido. Por favor certifique-se que os dados que está a enviar são válidos e volte a tentar."
            error.status = 400;
            return next(error);
        }
    }

    async register(req, res, next) {
        const { User } = this.models;

        try {

            //Passei a lógica da confirmação da password para o modelo User usando um virtual para a password2 e um pre(validate) para comparar as duas passes. Assim a validação fica mais centralizada e torna as mensagens para o utilizador mais coerentes.

            // if (req.body.password && req.body.password2){
            //     if (req.body.password != req.body.password2){
            //         let error = new CustomShopError('A password e password2 têm de coincidir, por favor corrija estes valores e tente novamente');
            //         error.statusCode = 400;
            //         throw error;
            //     }
            // }else{
            //     let error = new CustomShopError('Certifique-se que enviou os campos password e password2, e que estes são coincidentes. Por favor corrija o seu pedido e tente novamente');
            //     error.statusCode = 400;
            //     throw error;
            // }
            

            let bodyDataErrors = checkBodyDataErrors(req.body, User, ['role', 'passwordResetToken', 'PasswordResetDeadline'], ['password2']);
            if ( bodyDataErrors ) return next(bodyDataErrors);
            let editableKeysArray = getEditableModelKeys(User, ['role', 'name', 'passwordResetToken', 'PasswordResetDeadline']);

            //User não deverá poder mudar o seu role, apenas um admin deverá poder editar esse valor no /users endpoint
            if (req.body.role) delete req.body.role;

            const novo = await User.create( req.body );
            const token = await createToken(novo);

            const metadata = [
                {
                    functionality: "Your data",
                    method: "GET, PUT, DELETE",
                    url: "/me",
                },
                {
                    functionality: "Log-in",
                    method: "POST",
                    url: "/login",
                    valid_keys: editableKeysArray,
                },
            ];
        
            const responseObj = {
            status: 'success',
            data: {
                token: await createToken(novo),
                user: novo,
            },
            metadata: metadata,
            };

            res.status(201).json(responseObj);
        } catch (error) {
            // console.log(error)
            if (checkErrorType(error)) return next(error);
            error.message = "O seu pedido não pode ser executado, por favor verifique se os dados que está a enviar são válidos e tente novamente.";
            error.status = 400;
            next(error);
        }
    }

    async me(req, res, next) {
        const { User } = this.models;
        try {
            //Como usar o populate() em mais do que um nível de hierarquia -> é só usar objectos com o path lá dentro para cada nova referência que queremos que o mongoose faça search
            const user = await User.findById(req.me._id)
            .select('-password')
            .populate({
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

            let error2 = new CustomShopError('Não é possível mostrar os dados do utilizador. Por favor faça login novamente e volte a tentar');
            let editableKeysArray = getEditableModelKeys(User, ['role', 'name'], ['password2']);
            const metadata = {
                    functionality: "Log-in",
                    method: "POST",
                    url: "/login",
                    valid_keys: editableKeysArray,
            }
            error2.additionalInfo = metadata;
            error2.status = 400;
            next(error2);
        }
    }

    async edit(req, res, next) {
        const { User } = this.models;
        const id = req.me._id;
        const to_edit = req.body;

        try {
            let bodyDataErrors = checkBodyDataErrors(to_edit, User, ['role', 'passwordResetToken', 'passwordResetDeadline'], ['password2', 'currentPassword']);
            if ( bodyDataErrors ) return next(bodyDataErrors);


            //Para não mostrar a password, pode-se fazer aqui um select negativo, ou então definir no Schema "select: false", para que este comportamento seja o default. (que pode ser overriden com um select expressamente definido com a password).
            const user = await User.findById(req.me._id).select('-password').populate({
                path: 'purchases',
                populate: { path: 'products.product'}
            }).populate({path:'wishlist', select:'name'});

            let editedKeys = [];
            if (user) {
                Object.entries(to_edit).forEach(([key, value]) => {
                    if(key != 'role') {
                        user[key] = value;
                    }
                    // editedKeys.push(key);
                });
                try{
                    editedKeys = user.modifiedPaths();
                    await user.save();
                }catch(error) {
                    if (checkErrorType(error)) return next(error);
                    error.message = "Não é possível fazer a atualização de dados do respectivo utilizador. Por favor certifique-se que o seu pedido é válido e volte a tentar."
                    error.status = 400;
                    next(error);
                }

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

                //hide password in case it's been updated
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
        const { User, Product, Feedback, Comment } = this.models;
        try {
            const deletedUser = await User.deleteOne({ _id: req.me._id });
            if(deletedUser.deletedCount > 0) {

                //Caso o user tenha sido removido, aqui podia-se limpar todas as referências menos as purchases pois essas são intencionalmente mantidas para que não se perca ou corrompa o histórico de transações dos produtos da loja, mesmo assim aqui prefiro manter tudo, incluindo feedback e comentários, pois feedback sobre produtos continuam a ser válidos mesmo que o utilizador não exista mais, e passam a ser anónimos pois perderam a referência ao autor, e o mesmo para os comentários.
                
                const responseObj = await addDeleteMetadata(deletedUser, Product, 'products', 'product', 'Utilizador removido com sucesso.');
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

    async forgotPassword(req, res, next) {
        const { User } = this.models;
        const { email, username } = req.body;

        try {
            
            if (email || username){
                const user = await User.findOne( {$or: 
                    [
                        {$and: [
                            {email: email}, {email: {$nin:[null, ""]} }
                        ]},
                        {$and: [
                            {username: username}, {username: {$nin:[null, ""]} }
                        ]}
                    ]
                } );
            
                //Se o utilizador foi encontrado então:
                //ENVIAR EMAIL com o token para fazer reset à password
                if (user && user.email){
                    
                    //Gerar token
                    const rToken = await user.createPasswordResetToken();

                    //Guardar hashed token na base de dados
                    await user.save();

                    //Enviar email com token não-encriptado
                    const resetPasswordURL = req.protocol + "://" + req.get('host') + "/resetPassword/" + rToken;

                    await new SendEmail(user, resetPasswordURL).sendReset();

                    const responseObj = {
                        status: 'success',
                        message: 'Token enviada. Por favor verifique o seu email e siga as instruções lá descritas para fazer reset à sua password.', 
                        };
                    return res.json(responseObj);
                }else{
                    let error = new CustomShopError('Não existe um utilizador correspondente aos dados enviados, por favor verifique os seus dados e tente novamente.')
                    error.statusCode = 400;
                    return next(error);
                }
            }
            else{
                let error = new CustomShopError('Não enviou nenhum dos dados necessarios para fazer reset à sua password. Por favor envie o email ou username nesta mesma rota com o método POST');
                error.statusCode = 400;
                return next(error);
            }

        } catch (error) {
            // console.log(error);

            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer reset à password do utilizador que procura. Por favor verifique se os dados que está a enviar são válidos e volte a tentar."
            error.status = 400;
            next(error);
        }
    }

    
    async resetPassword(req, res, next) {
        const { User } = this.models;
        const rToken = req.params.rToken;
        const to_edit = req.body;

        try {
            let bodyDataErrors = checkBodyDataErrors(to_edit, User, ['name', 'username', 'email', 'role', 'passwordResetToken', 'passwordResetDeadline', 'currentPassword'], ['password2']);
            if ( bodyDataErrors ) return next(bodyDataErrors);

            if (rToken){
                const hashedToken = crypto.createHash('sha256').update(rToken).digest('hex');
                // console.log(rToken, hashedToken);
                //Se existir algum user com a reset token respectiva na bd
                const user = await User.findOne( { passwordResetToken: hashedToken } ).select('passwordResetDeadline');
                
                

            
                //Se tudo estiver ok e o utilizador foi encontrado então atualizar password:
                if (user){

                        //e caso a token ainda esteja válida (não tenha expirado)
                    if (!user.passwordResetDeadline || user.passwordResetDeadline < Date.now()) {
                        // console.log(user.passwordResetDeadline, user.passwordResetDeadline, Date.now())
                        let error = new CustomShopError('O seu link para efetuar o reset da password expirou, por favor crie um novo caso ainda necessite de fazer reset à sua password.');
                        error.additionalInfo = {
                            url: '/forgotPassword',
                            keys: 'username or email',
                            method: 'POST'
                        }
                        error.statusCode = 400;
                        return next (error);
                    }
                    
                    if(!(req.body.password && req.body.password2)){
                        let error = new CustomShopError('O seu token está correto mas esqueceu-se de enviar a nova password. Para fazer reset à password, por favor volte a enviar o mesmo token com o método POST neste url mas adicione os campos password e password2 no body com a password pretendida.');
                        error.additionalInfo = {
                            keys_missing: 'password and password2',
                            method: 'POST'
                        }
                        error.statusCode = 400;
                        return next (error);
                    }

                    user.password = req.body.password;
                    user.password2 = req.body.password2;
                    user.passwordResetToken = undefined;
                    user.passwordResetDeadline = undefined;
                    
                    // Passar variável para o pre-save no model users, para ele saber que estamos a tentar fazer reset à password e não pedir a currentPassword (como se estivessemos simplesmente logados a tentar mudar a pass).
                    user.resetPassword = true;
                    await user.save();

                    const responseObj = {
                        status: 'success',
                        message: 'Password Alterada. Por favor faça login com a nova password',
                        metadata:{
                            url: '/login',
                            keys: 'email ou username, e password',
                            method: 'POST'
                        } 
                        };
                    return res.json(responseObj);
                }else{
                    let error = new CustomShopError('A token que enviou não é válida, por favor veja se copiou bem o url que recebeu no email. (atenção que esta mensagem também pode significar que já fez reset à sua password, verifique se já consegue fazer login, caso contrário, faça novamente reset à sua password.')
                    error.statusCode = 400;
                    return next(error);
                }
            }
            else{
                let error = new CustomShopError('Não enviou nenhum dos dados necessarios para fazer reset à sua password. Por favor envie a token que recebeu no seu email no url /resetPassword/(token) com o método POST');
                error.statusCode = 400;
                return next(error);
            }

        } catch (error) {
            // console.log(error);

            if (checkErrorType(error)) return next(error);
            error.message = "Não é possível fazer reset à password do utilizador que procura. Por favor verifique se os dados que está a enviar são válidos e volte a tentar."
            error.status = 400;
            next(error);
        }
    }





}

module.exports = AuthController;
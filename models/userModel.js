/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const validator = require('validator');

const user = (mongoose) => {

    const userSchema = new mongoose.Schema(
        {
            
            name: {
                type: String,
                required: [true, 'É necessário um nome, por favor envie name no body com o respectivo valor'],
                trim: true,
                minlength: [2, 'O nome tem de ter pelo menos 2 caracteres'],
            },
            username: {
                type: String,
                required: [true, 'É necessário um nome de utilizador, por favor envie username no body com o respectivo valor'],
                unique: true,
                trim: true,
                lowercase: true,
                minlength: [2, 'O nome de utilizador tem de ter pelo menos 2 caracteres'],
            },
            email: {
                type: String,
                required: [true, 'É necessário um endereço de email, por favor envie email no body com o respectivo valor'],
                unique: true,
                trim: true,
                lowercase: true,
            },
            password: {
                type: String,
                required: [true, 'É necessário uma palavra-passe, por favor envie password no body com o respectivo valor'],
                select: false,
                minlength: [7, 'A password precisa de ter no mínimo 7 caracteres'],
                trim: true,
            },
            role: {
                type: String,
                required: true,
                enum: {
                    values:['ADMIN', 'CS' , 'NORMAL'], 
                    message:'Os valores permitidos são ADMIN, CS, e NORMAL'
                },
                default: 'NORMAL',
            },
            purchases: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'purchase',
            }],
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
            wishlist: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'product',
                }
            ],
            passwordResetToken:{
                type: String,
                select: false
            },
            passwordResetDeadline:{
                type: Date,
                select: false
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

    //Existem várias formas de alterar o comportamento default do select nas queries, uma delas é diretamente na própria query, outra é na definição do Schema com o parametro select: false/true, e outra é como aqui em baixo, com um pre(find) que corre em todas as queries começadas com "find" (neste caso usamos um regex). O problema é que com esta opção corremos o risco de complicar a nossa vida ao usar find para obter a password em funcionalidades que necessitem dela (para autenticação por exemplo).
    // userSchema.pre(/^find/, function(next) {
    //     this.select("-password -createdAt -updatedAt -__v");
    //     next(); 
    // });

    //Limpar o doc que é gravado depois de um save, removendo os campos que foram definidos com "select: false".
    //Dá jeito porque o select: false no schema não é aplicado em todas as situações, por exemplo após uma inserção na BD. Como normalmente não fazemos find a seguir à inserção mas obtemos o objecto diretamente a partir do return value do model.save(), desta forma "limpamos" automaticamente também esse return.
    userSchema.post('save', function (doc, next) {
        if(doc.password) delete doc._doc.password;
        if(doc.updatedAt) delete doc._doc.updatedAt;
        if(doc.createdAt) delete doc._doc.createdAt;
        if(doc.__v != null) delete doc._doc.__v;
        next();
    });

    userSchema.virtual('currentPassword')
    .get(function() {
      return this._currentPassword;
    })
    .set(function(value) {
        this._currentPassword = value;
    });

    userSchema.virtual('password2')
    .get(function() {
      return this._password2;
    })
    .set(function(value) {
        this._password2 = value;
    });


    //Validar a confirmação de password e alteração de password + confirmação
    userSchema.pre('validate', async function() {

        //Caso este documento não seja novo então pedir a password atual ( ou seja, caso isto seja uma alteração de password e não um novo registo) 
        //E caso este documento não esteja no estado de fazer reset à password (neste caso não queremos pedir ao user a currentPassword, porque ele não a sabe)
        if (!this.isNew && !this.resetPassword && !this.adminEditing ){
            //Se o utilizador estiver a tentar editar a password, informá-lo que tb tem de enviar currentPassword caso não o tenha feito
            if ((this.password || this.password2) && !this.currentPassword){
                this.invalidate('passwordConfirmation', 'Para mudar a sua password tem de enviar a password atual no campo currentPassword');
            
            //Caso tenha enviado tudo, então verificar se a currentPassword está correta.
            }else if (this.currentPassword && ! await this.checkPassword(this.currentPassword, {email: this.email})){
                this.invalidate('passwordConfirmation', 'A sua password atual não está correta, por favor tente novamente');               
            }
        }

        //Caso a password seja diferente da password2, avisar o utilizador sobre o erro (qd o utilizador não envia nenhuma delas, elas são iguais portanto isto só ativa quando o user está realmente a tentar enviar uma password para registar ou editar)
        if (this.password !== this.password2) {
            this.invalidate('passwordConfirmation', 'Por favor insira a mesma password nos dois campos (password e password2)');
        }
    });

    userSchema.methods.checkPassword = async function(candidatePassword, emailOrUsername) {
            //Como neste Schema a password tem a propriedade "select: false", o "this" nesta instancia não contém a password, e como tal teremos que a ir buscar expressamente.
            const thisUser = await User.findOne( emailOrUsername ).select('password');
            const userPassword = thisUser.password;
            return await bcrypt.compare(candidatePassword, userPassword);
    }

    userSchema.methods.createPasswordResetToken = async function (){
        //gerar uma string aleatória
        const rToken = crypto.randomBytes(32).toString('hex');
        // console.log('rToken before', rToken);
        //fazer hash a essa string e usá-la como token para guardar na base de dados para fazer reset à password
        this.passwordResetToken = crypto.createHash('sha256').update(rToken).digest('hex');

        //15 minutos para ir ver o email e poder fazer reset à password.
        this.passwordResetDeadline = Date.now() + 15 * 60 * 1000;
        // console.log('rToken after', rToken, '--- hashedToken', this.passwordResetToken);

        //Devolver a token não-encriptada para ser enviada por email
        return rToken;
    }


    // userSchema.methods.getModifiedFields = function() {
    //     let modifiedP = this.modifiedPaths();
    //     console.log(modifiedP);
    //     return modifiedP;
    // };
    
    //Ao que parece modifiedPaths() só funciona com um pre(save)
    //Ou seja se for chamado no controller, também se tem de ter o cuidado de chamar antes de fazer save(), senão o array devolvido estará vazio.
    // userSchema.pre('save', async function() {
    //     this.getModifiedFields();
    // });



    // Nos middlewares também se pode usar promises em vez de callbacks
    // Por exemplo, assim é com callbacks:
    //   userSchema.pre('save', function(next) {
    //     var user = this;

    //     if(!user.isModified('password')) {
    //         return next();
    //     }

    //     bcrypt.genSalt(10, function(err, salt)  {
    //         if(err) {
    //             return next(err);
    //         }

    //         bcrypt.hash(user.password, salt, function(err, hash) {
    //             if(err) {
    //                 return next(err);
    //             }

    //             user.password = hash;
    //             next();
    //         });
    //     });
    // });

    // E com promises faz-se assim: (neste caso usei async await pois força uma promise a ser devolvida implicitamente e torna-se mais fácil)   
    userSchema.pre('save', async function() {

        if(!this.isModified('password')) {
            return;
        }

        let salt;
        try{
            salt = await bcrypt.genSalt(10);
        } catch(err){
            throw new Error('Problem generating salt...');
        }

        if(salt) {
            try{
                this.password = await bcrypt.hash(this.password, salt);
            } catch(err){
                throw new Error('Problem generating hashed password...');
            }   
        }

    });

    const User = mongoose.model('user', userSchema);

    //Verifica se o email tem uma formatação válida
    userSchema.path('email')
        .validate(
                function (email) {
                return validator.isEmail(email);
            }, 'Email com formatação errada.')
    // Verifica se o email já existe na base de dados
        .validate(
            async function(email) {
                let user = this;
                let emailExistsAlready = await User.findOne({email: email}).exec();
                if (emailExistsAlready && user.isModified('email')) return false;
                return true;
            }, 'Email já existente na base de dados, por favor insira um email diferente.'
        )

    //Verifica se o username já existe na BD
    userSchema.path('username')
        .validate(
            async function(username) {
                let user = this;
                let usernameExistsAlready = await User.findOne({username: username}).exec();
                if (usernameExistsAlready && user.isModified('username')) return false;
                return true;
            }, 'Nome de utilizador já existente na base de dados, por favor insira um username diferente.'
        )
    
    return User;
}

module.exports = user;
/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const MongooseError = require('mongoose').Error;
const { CustomShopError } = require('../lib/CustomShopError');

module.exports = (error, req, res, next) => {
    res.status(error.status || error.statusCode || 500);

    let messageOutput;

    // let proto = Object.getPrototypeOf(error);
    // let protoParent = ValidationError.prototype;
    // console.log(proto, "---" ,protoParent);
    // let debug = {
    //     class: error.constructor.name, 
    //     error: error,
    //     prototype: proto,
    //     protoParent: protoParent,
    // }
    // return res.json(debug);

   //Caso o erro seja um erro proveniente do mongoose (de validação por exemplo), então fazer-lhe um parse especial para simplificar as mensagens para o utilizador
    if ( error instanceof MongooseError){
        // let props = Object.getOwnPropertyNames(error);
        // console.log(props);
        // console.log('INSTANCE OF MongooseError')
        //Mudar o formato das mensagens de erro provenientes dos erros de validação do mongoose para dentro de um só objecto com diferentes keys para cada erro.

        //Caso o erro seja do tipo validation que nós queremos mostrar ao utilizador, então esse erro contém a key "errors", caso não contenha, é porque foi um erro técnico que não queremos mostrar ao utilizador, então damos uma mensagem genérica de erro.
        if (error.errors){
            messageOutput = Object.entries(error.errors).map( (element)=>{
                let [key, value] = element;
                key = key + "Error";
                let returnErrorObj = {};
                returnErrorObj[key]=value.message;
                return returnErrorObj;
            });
            
            messageOutput = messageOutput.reduce( (acc, element) => {
                let [k, v] = Object.entries(element)[0];

                //Caso exista alguma chave em duplicado no objecto de mensagens de erro, então muda-se o nome a uma delas para que não se perca nenhuma mensagem.
                for (let i=0; k in acc; i++){
                    k = k + "_"+ i;
                }
                
                acc[k] = v;
                return acc;
            })
        }
        else{
            messageOutput = {
                message: 'Não conseguimos satisfazer o seu pedido devido a um erro. Por favor verifique se o seu pedido é válido e tente novamente. O erro mais provável é que esteja a passar um valor no url fora de formato.',
            };
        }
    }else if(error instanceof CustomShopError){ //Caso o erro seja um erro custom criado por nós então fazer-lhe um parse diferente
        messageOutput = {
            message: error.message,
            additional_info: error.additionalInfo, 
        };

        // console.log('INSTANCE OF CustomShopError');
        // let props = Object.getOwnPropertyNames(error);
        // console.log(props);
        // console.log("error", error.message); 
        // error = JSON.stringify(error);
    }
    else{ //Caso seja outro tipo qualquer de erro, devolver apenas a mensagem de erro ao utilizador e nada mais.
        // console.log('INSTANCE OF OTHER ERROR')
        // console.log(error)
        messageOutput = error.message;
    }

    return res.json({
        status: 'failed',
        error: messageOutput
    });
  }
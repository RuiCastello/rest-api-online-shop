/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

"use strict";

const { CustomShopError } = require('./CustomShopError');
const MongooseError = require('mongoose').Error;


const checkBodyDataErrors = ( bodyData, Model, extraFilter, extraKeys ) => {

    let validKeysArray = getValidModelKeys(Model);
    let editableKeysArray = getEditableModelKeys(Model, extraFilter, extraKeys);

    //Verificar se utilizador enviou alguma coisa
    if ( bodyData && Object.keys(bodyData).length > 0 )
    {
        //Caso o utilizador tenha enviado dados para alterar, verificar se enviou alguma coisa que pertença ao model, senão enviar uma mensagem de erro adequada.
       

        let invalidKeySent = Object.keys(bodyData).some( (element) => {
            let elementLC = element.toLowerCase();
            let lowerCaseEditableKeysArray = editableKeysArray.map( element2 => element2.toLowerCase() )

            // console.log('normal', editableKeysArray, 'lower', lowerCaseEditableKeysArray )

            if(lowerCaseEditableKeysArray.indexOf(elementLC) <= -1) {
                return true;
            }
            else return false;
        });

        let badCapitalizations = Object.keys(bodyData).filter( (element) => {
            if( editableKeysArray.indexOf(element) <= -1 && editableKeysArray.findIndex( (element2) =>{
                if ( element2.toLowerCase() == element.toLowerCase() ) return true; 
                } 
                ) > -1 ) 
            { 
                return true;
            }
        });

        if (badCapitalizations.length > 0) {

            badCapitalizations = badCapitalizations.map(element => { return (element += " should be "+ element.toLowerCase() + ".")});

            let error = new CustomShopError();
            error.message = "Está a enviar uma chave/key que pertence ao modelo mas está mal escrita, por favor corrija (repare na capitalização).";
            error.additionalInfo = { affected_keys: badCapitalizations };
            error.statusCode = 400;
            return error;
        }

        if (invalidKeySent) {
            let error = new CustomShopError();
            error.message = 'Está a enviar uma chave/key que não existe ou não pode alterar, por favor corrija o seu pedido.';
            error.additionalInfo = {
                valid_keys: editableKeysArray,
            };
            error.statusCode = 400;
            return error;
        }
       
    }else{
        let error = new CustomShopError();
        error.message = "Por favor envie os dados necessários no body com os valores respectivos. Como referência mais abaixo tem a lista das keys que pode enviar.";
        error.additionalInfo = {
            valid_keys: editableKeysArray,
        };
        error.statusCode = 400;
        // error.statusCode = 400;
        return error;
    }
}

const getValidModelKeys = (Model) =>{
    const validKeysArray = Object.keys(Model.schema.paths).filter( (element) =>{
        element = element.toLowerCase();
        if (element != '_id' && element != '__v' && element != 'updatedat' && element != 'createdat'){
            return true;
        }
        return false;
    });

    // console.log('validKeysArray', validKeysArray);

    return validKeysArray;
}


const getEditableModelKeys = (Model, extraFilter, extraKeys) =>{
    let editableKeysArray = Object.keys(Model.schema.paths).filter( (element) =>{
        let elementLC = element.toLowerCase();

        //Se existir algum elemento proibido de editar como path neste model, então filtramos esses elementos deste array
        if (elementLC != '_id' && elementLC != '__v' && elementLC != 'updatedat' && elementLC != 'createdat' && 
        !(Model.schema.paths[element] && 'caster' in Model.schema.paths[element] && 'options' in Model.schema.paths[element].caster && 'ref' in Model.schema.paths[element].caster.options &&  Model.schema.paths[element].caster.options.ref !== undefined) && 
        !(Model.schema.paths[element] && 'options' in Model.schema.paths[element] && 'ref' in Model.schema.paths[element].options && Model.schema.paths[element].options.ref !== undefined) ){
            
            //Se existirem outro elementos que queiramos proibir definidos no extraFilter, então filtrar também estes elementos do array principal
            if (extraFilter) {
                let result = extraFilter.some( (element2) =>{
                    if (elementLC == element2.toLowerCase()) return true;
                }) 
                if (!result) {return true;}
                else{return false;}
            }
            return true;
        }
        return false;
    });

    if (extraKeys) editableKeysArray = editableKeysArray.concat(extraKeys);

    // console.log('editableKeysArray', editableKeysArray);

    return editableKeysArray;
}

const trimInternalModelKeysArray = (arrayWithKeys) =>{
    const validKeysArray = arrayWithKeys.filter( (element) =>{
        element = element.toLowerCase();
        if (element != '_id' && element != '__v' && element != 'updatedat' && element != 'createdat'){
            return true;
        }
        return false;
    });

    return validKeysArray;
}



const checkErrorType = (error) =>{
    if ( error instanceof MongooseError){
        return true;       
    }else if(error instanceof CustomShopError){ 
        return true;   
    }
    return false;
}



module.exports = {
    checkBodyDataErrors: checkBodyDataErrors,
    getValidModelKeys: getValidModelKeys,
    trimInternalModelKeysArray: trimInternalModelKeysArray,
    checkErrorType: checkErrorType,
    getEditableModelKeys: getEditableModelKeys,
}
/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */


const { CustomShopError } = require('../lib/CustomShopError');
const pluralize = require('pluralize');
var _ = require('lodash');

const addIndexMetadata = async (result, Model, path, modelName, totalDoc) =>{
    
    let totalDocuments;
    if (!totalDoc && (totalDoc == undefined || totalDoc == null) ) {totalDocuments = await Model.countDocuments();}
    else{totalDocuments = totalDoc;}

    const modelsWithMetadata = result.map( (element, index) =>{
        let modelCounter = (index+1);
        let modelObj = {};
        modelObj['#'] = modelCounter;
        modelObj[modelName] = element;
        modelObj.metadata = {
            functionality: "Get data from this "+ modelName,
            method: "GET",
            url: "/" + path + "/"+ element._id,
        };

        return modelObj;
    });

    let totalPluralModelName = "total_" + pluralize.plural(modelName);

    const responseObj = {
        status: 'success',
        data: modelsWithMetadata,
        metadata: {
            [totalPluralModelName]: totalDocuments,
            "total_this_page": result.length, 
        }
    }

    return responseObj;
};


const addInsertMetadata = async (result, Model, path, modelName) =>{

    const metadata = {
        functionality: "Get this " + modelName + " data",
        method: "GET",
        url: "/" + path + "/"+ result._id,
    };

    const responseObj = {
    status: 'success',
    data: result,
    metadata: metadata,
    };

    return responseObj;
}

const addShowMetadata = async (result, Model, path, modelName) =>{
    const metadata = {
        functionality: "Get all " + pluralize.plural(modelName),
        method: "GET",
        url: "/" + path,
    };

    const responseObj = {
    status: 'success',
    data: result,
    metadata: metadata,
    };

    return responseObj;
}


const addEditMetadata = async (result, Model, path, modelName, editedKeys) =>{

    const metadata = {
        updated_data: editedKeys,
        functionality: "Get all " + pluralize.plural(modelName),
        method: "GET",
        url: "/" + path,
    };

    const responseObj = {
    status: 'success',
    data: result,
    metadata: metadata,
    };

    return responseObj;
}


const addDeleteMetadata = async (result, Model, path, modelName, message) =>{

    const metadata = {
        deletedCount: result.deletedCount,
        functionality: "Get all " + pluralize.plural(modelName),
        method: "GET",
        url: "/" + path,
    };

    const responseObj = {
    status: 'success',
    message: message, 
    metadata: metadata,
    };

    return responseObj;
}



const parseRequestQueryObj = async (reqQuery, excludeFilter, Model) =>{
    if (typeof reqQuery === 'object' && reqQuery !== null){
        let filtered = {...reqQuery};
        let operators = ['gte', 'gt', 'lte', 'lt', 'eq', 'ne'];

        //Excluir certos elementos predefinidos enviados como argumento do array req.query
        excludeFilter.forEach( (element) => {
            if (element in filtered) delete filtered[element];
        });

        //Caso encontre algum dos operators no req.query, então meter-lhes um cifrão $ antes do operador, pois assim ficamos com a sintaxe correta no final para fazer query diretamente no mongoDB
        operators.forEach( (element) =>{
            for (let key in filtered){
                if (_.isObject(filtered[key]) && element in filtered[key]) {
                    filtered[key]["$"+element] = filtered[key][element];
                    delete filtered[key][element];
                }
            }
        });
        
        //
        //SEARCH - Verificar se há um pedido de procura com a key "search"
        //
        //USANDO text indexes e sintaxe de query {$text : {$search: 'stringDeProcura'}}
        // Vantagem - dá para fazer diacritic insensitive searches
        // if (_.isObject(filtered) && 'search' in filtered){
        //     filtered['$text'] =
        //     {
        //         '$search': filtered.search
        //     }
        //     delete filtered.search;
        // }

        //USANDO REGEX (possivelmente mais lento mas funciona com partial matching)
        //Desvantagem - não dá para fazer diacritic insensitive searches
        if (_.isObject(filtered) && 'search' in filtered){

            //Forma de remover diacritics (acentos) de uma string.
            // filtered.search = filtered.search.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

            let regexExpression = new RegExp(filtered.search, 'i');
            filtered['$or']=[
                {
                    name: regexExpression,
                },
                {
                    description: regexExpression,
                },
            ];
            delete filtered.search;
        }


        let filteredQuery = filtered;

        //Objecto de query ao mongoDB sem lhe fazer ainda um await, ou seja, aqui ainda é apenas uma query (não devolveu dados). Será executado mais tarde quando a query estiver toda formada.
        //Usei .collation({locale: "en"}) para forçar o sort a ficar por ordem alfabética, pois por default o mongoDB não faz case-insensitive sorting, ou seja, palavras começadas por maiúscula e minúscula estariam sempre foram de ordem 
        let mongoQuery = Model.find( filteredQuery ).collation( {locale: "en" } );

        //Ordenar a mongoQuery se um sort tiver sido enviado no req.query
        if(reqQuery.sort){
            let firstAndSecondSort = reqQuery.sort.split(',').join(' ');
            mongoQuery = mongoQuery.sort(firstAndSecondSort);
            // console.log(firstAndSecondSort)
        }else{
            mongoQuery = mongoQuery.sort('-createdAt');
        }

        //Paginação
        let page = Number(reqQuery.page) || 1;
        let limit = reqQuery.limit * 1 || 100;
        let skip = (page-1) * limit;
        if (skip < 0) skip = 0; 

        mongoQuery = mongoQuery.skip(skip).limit(limit);

        let totalDocuments = await Model.countDocuments( filteredQuery );
        let lastPage = Math.ceil(totalDocuments/limit);

        if (reqQuery.page){
            if (skip >= totalDocuments) {
                let error = new CustomShopError('Página inexistente. A última página disponível é: ' + lastPage);
                error.statusCode = 404;
                throw error;
            }
        }
       
        return {
            mongoQuery, 
            totalDocuments,
            page,
            lastPage,
        }
    }
}


module.exports = {
    addIndexMetadata,
    addInsertMetadata,
    addShowMetadata,
    addEditMetadata,
    addDeleteMetadata,
    parseRequestQueryObj,
}
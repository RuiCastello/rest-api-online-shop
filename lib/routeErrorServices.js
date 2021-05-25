/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */


const { CustomShopError } = require('../lib/CustomShopError');

const getAppRoutesList = () =>{

    const metadata = [
        {
            note: "Para mais informações pode ler a documentação da app em: https://github.com/RuiCastello/rest-api-online-shop",
        },
        {
            functionality: "Regista uma nova conta de utilizador.",
            method: "POST",
            url: "/register",
            keys: "name, username, email, password, password2",
        },
        {
            functionality: "Permite fazer o login de um utilizador. Apenas são necessários uma password e um username ou um email. Devolve uma token para ser usada nos headers com a chave x-token em futuros pedidos.",
            method: "POST",
            url: "/login",
            keys: "username or email, password"
        },
        {
            functionality: "Gestão de conta do próprio utilizador",
            method: "GET, PUT, DELETE",
            url: "/me",
            keys: "name, username, email, password, password2, currentPassword"
        },
        {
            functionality: "Envia um pedido de alteração de password, requer um email ou um username como input. Caso o pedido seja aceite, o utilizador receberá um email com o link e instruções para poder alterar a sua password",
            method: "POST",
            url: "/forgotPassword",
            keys: "username or email"
        },    
        {
            functionality: "Altera a password para a nova password que o utilizador envia no próprio pedido",
            method: "POST",
            url: "/resetPassword/(emailToken)",
            keys: "emailToken, password, password2"
        },
        {
            functionality: "Informação e criação de produtos",
            method: "GET, POST",
            url: "/products",
            keys: "price, name, description, category, subcategory, search, sort, limit, page, image"
        },
        {
            functionality: "Informação e administração de produtos",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)",
            keys: "price, name, description, category, subCategory, deleteImage, image"
        },
        {
            functionality: "Adicionar, remover, ou editar quantidades de um produto específico no carrinho",
            method: "POST, PUT, DELETE",
            url: "/products/(productId)/cart",
            keys: "quantity"
        },
        {
            functionality: "Múltiplas estatísticas sobre todos os produtos da loja em geral.",
            method: "GET",
            url: "/products/stats",
        },
        {
            functionality: "Múltiplas estatísticas sobre um produto específico",
            method: "GET",
            url: "/products/(productId)/stats",
        },
        {
            functionality: "Informação e criação de novos utilizadores",
            method: "GET, POST",
            url: "/users",
            keys: "name, username, email, password, password2, role"
        },
        {
            functionality: "Informação e administração de utilizadores",
            method: "GET, PUT, DELETE",
            url: "/users/(userId)",
            keys: "name, username, email, password, password2, role"
        },
        {
            functionality: "Lista as compras do próprio utilizador",
            method: "GET",
            url: "/purchases",
        },
        {
            functionality: "Mostra os dados de uma compra específica, e permite ao utilizador remover essa compra  caso ela não tenha ainda sido paga. (corresponde ao carrinho de compras nesse caso)",
            method: "GET, DELETE",
            url: "/purchases/(purchaseId)",
        },
        {
            functionality: "Mostra o custo total da compra selecionada assim como os dados da compra (GET). Permite também efetuar o pagamento da compra (POST)",
            method: "GET, POST",
            url: "/purchases/(purchaseId)/payment",
        },
        {
            functionality: "Mostra os dados do feedback sobre um produto, e permite gerir/criar o feedback do próprio utilizador",
            method: "GET, POST, PUT, DELETE",
            url: "/products/(productId)/feedback",
            keys: "rating, review"
        },
        {
            functionality: "Mostra os dados de um feedback específico e permite a sua gestão",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)/feedback/(feedbackId)",
            keys: "rating, review"
        },
        {
            functionality: "Mostra os dados dos comentários sobre um produto, e permite gerir/criar o comentário do próprio utilizador",
            method: "GET, POST, PUT, DELETE",
            url: "/products/(productId)/comments",
            keys: "comment"
        },
        {
            functionality: "Mostra os dados de um comentário específico e permite a sua gestão",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)/comments/(commentId)",
            keys: "comment"
        },
        {
            functionality: "Adiciona ou remove um produto específico da lista de desejos do próprio utilizador",
            method: "PUT",
            url: "/products/(productId)/wishlist",
        },
        {
            functionality: "Lista e permite a criação de categorias principais",
            method: "GET, POST",
            url: "/categories",
            key: "name"
        },
        {
            functionality: "Permite gerir categorias e sub-categorias",
            method: "GET, POST, PUT, DELETE",
            url: "/categories/(categoryId)",
            keys: "name"
        },
        {
            functionality: "Permite gerir sub-categorias",
            method: "GET, PUT, DELETE",
            url: "/categories/(categoryId)/(subCategoryId)",
            keys: "name"
        },
    ];

    return metadata;
}

const getProductRelatedRoutesList = (req, res, next) =>{

    const error = new CustomShopError('A rota que está a tentar aceder não existe. Para uma lista das rotas possíveis veja mais abaixo:');
    error.additionalInfo = [
        {
            note: "Para mais informações pode ler a documentação da app em: https://github.com/RuiCastello/rest-api-online-shop",
        },
        {
            functionality: "Informação e criação de produtos",
            method: "GET, POST",
            url: "/products",
            keys: "price, name, description, category, subcategory, search, sort, limit, page, image"
        },
        {
            functionality: "Informação e administração de produtos",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)",
            keys: "price, name, description, category, subCategory, deleteImage, image"
        },
        {
            functionality: "Adicionar, remover, ou editar quantidades de um produto específico no carrinho",
            method: "POST, PUT, DELETE",
            url: "/products/(productId)/cart",
            keys: "quantity"
        },
        {
            functionality: "Múltiplas estatísticas sobre todos os produtos da loja em geral.",
            method: "GET",
            url: "/products/stats",
        },
        {
            functionality: "Múltiplas estatísticas sobre um produto específico",
            method: "GET",
            url: "/products/(productId)/stats",
        },
        {
            functionality: "Mostra os dados do feedback sobre um produto, e permite gerir/criar o feedback do próprio utilizador",
            method: "GET, POST, PUT, DELETE",
            url: "/products/(productId)/feedback",
            keys: "rating, review"
        },
        {
            functionality: "Mostra os dados de um feedback específico e permite a sua gestão",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)/feedback/(feedbackId)",
            keys: "rating, review"
        },
        {
            functionality: "Mostra os dados dos comentários sobre um produto, e permite gerir/criar o comentário do próprio utilizador",
            method: "GET, POST, PUT, DELETE",
            url: "/products/(productId)/comments",
            keys: "comment"
        },
        {
            functionality: "Mostra os dados de um comentário específico e permite a sua gestão",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)/comments/(commentId)",
            keys: "comment"
        },
        {
            functionality: "Adiciona ou remove um produto específico da lista de desejos do próprio utilizador",
            method: "PUT",
            url: "/products/(productId)/wishlist",
        },
        {
            functionality: "Lista e permite a criação de categorias principais",
            method: "GET, POST",
            url: "/categories",
            key: "name"
        },
        {
            functionality: "Permite gerir categorias e sub-categorias",
            method: "GET, POST, PUT, DELETE",
            url: "/categories/(categoryId)",
            keys: "name"
        },
        {
            functionality: "Permite gerir sub-categorias",
            method: "GET, PUT, DELETE",
            url: "/categories/(categoryId)/(subCategoryId)",
            keys: "name"
        },
        {
            functionality: "Lista as compras do próprio utilizador",
            method: "GET",
            url: "/purchases",
        },
        {
            functionality: "Mostra os dados de uma compra específica, e permite ao utilizador remover essa compra  caso ela não tenha ainda sido paga. (corresponde ao carrinho de compras nesse caso)",
            method: "GET, DELETE",
            url: "/purchases/(purchaseId)",
        },
        {
            functionality: "Mostra o custo total da compra selecionada assim como os dados da compra (GET). Permite também efetuar o pagamento da compra (POST)",
            method: "GET, POST",
            url: "/purchases/(purchaseId)/payment",
        },
    ];
    error.status = 404;
    next(error);    
}

const getCategoryRelatedRoutesList = (req, res, next) =>{
    const error = new CustomShopError('A rota que está a tentar aceder não existe. Para uma lista das rotas possíveis veja mais abaixo:');
    error.additionalInfo = [
        {
            note: "Para mais informações pode ler a documentação da app em: https://github.com/RuiCastello/rest-api-online-shop",
        },
        {
            functionality: "Lista e permite a criação de categorias principais",
            method: "GET, POST",
            url: "/categories",
            key: "name"
        },
        {
            functionality: "Permite gerir categorias e sub-categorias",
            method: "GET, POST, PUT, DELETE",
            url: "/categories/(categoryId)",
            keys: "name"
        },
        {
            functionality: "Permite gerir sub-categorias",
            method: "GET, PUT, DELETE",
            url: "/categories/(categoryId)/(subCategoryId)",
            keys: "name"
        }
    ];
    error.status = 404;
    next(error);    
}

const getFeedbackCommentsRelatedRoutesList = (req, res, next) =>{
    const error = new CustomShopError('A rota que está a tentar aceder não existe. Para uma lista das rotas possíveis veja mais abaixo:');
    error.additionalInfo = [
        {
            note: "Para mais informações pode ler a documentação da app em: https://github.com/RuiCastello/rest-api-online-shop",
        },
        {
            functionality: "Mostra os dados do feedback sobre um produto, e permite gerir/criar o feedback do próprio utilizador",
            method: "GET, POST, PUT, DELETE",
            url: "/products/(productId)/feedback",
            keys: "rating, review"
        },
        {
            functionality: "Mostra os dados de um feedback específico e permite a sua gestão",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)/feedback/(feedbackId)",
            keys: "rating, review"
        },
        {
            functionality: "Mostra os dados dos comentários sobre um produto, e permite gerir/criar o comentário do próprio utilizador",
            method: "GET, POST, PUT, DELETE",
            url: "/products/(productId)/comments",
            keys: "comment"
        },
        {
            functionality: "Mostra os dados de um comentário específico e permite a sua gestão",
            method: "GET, PUT, DELETE",
            url: "/products/(productId)/comments/(commentId)",
            keys: "comment"
        }
    ];
    error.status = 404;
    next(error);    
}

const getPurchaseRelatedRoutesList = (req, res, next) =>{
    const error = new CustomShopError('A rota que está a tentar aceder não existe. Para uma lista das rotas possíveis veja mais abaixo:');
    error.additionalInfo = [
        {
            note: "Para mais informações pode ler a documentação da app em: https://github.com/RuiCastello/rest-api-online-shop",
        },
        {
            functionality: "Lista as compras do próprio utilizador",
            method: "GET",
            url: "/purchases",
        },
        {
            functionality: "Mostra os dados de uma compra específica, e permite ao utilizador remover essa compra  caso ela não tenha ainda sido paga. (corresponde ao carrinho de compras nesse caso)",
            method: "GET, DELETE",
            url: "/purchases/(purchaseId)",
        },
        {
            functionality: "Mostra o custo total da compra selecionada assim como os dados da compra (GET). Permite também efetuar o pagamento da compra (POST)",
            method: "GET, POST",
            url: "/purchases/(purchaseId)/payment",
        }
    ];
    error.status = 404;
    next(error);    
}


const getUserRelatedRoutesList = (req, res, next) =>{
    const error = new CustomShopError('A rota que está a tentar aceder não existe. Para uma lista das rotas possíveis veja mais abaixo:');
    error.additionalInfo = [
        {
            note: "Para mais informações pode ler a documentação da app em: https://github.com/RuiCastello/rest-api-online-shop",
        },
        {
            functionality: "Informação e criação de novos utilizadores",
            method: "GET, POST",
            url: "/users",
            keys: "name, username, email, password, password2, role"
        },
        {
            functionality: "Informação e administração de utilizadores",
            method: "GET, PUT, DELETE",
            url: "/users/(userId)",
            keys: "name, username, email, password, password2, role"
        }
    ];
    error.status = 404;
    next(error);    
}


module.exports = {
    getAppRoutesList,
    getProductRelatedRoutesList,
    getCategoryRelatedRoutesList,
    getFeedbackCommentsRelatedRoutesList,
    getPurchaseRelatedRoutesList,
    getUserRelatedRoutesList
}
/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const productRouter = require('./productRouter');
const purchaseRouter = require('./purchaseRouter');
const authRouter = require('./authRouter');
const userRouter = require('./userRouter');
const feedbackRouter = require('./feedbackRouter');
const commentRouter = require('./commentRouter');
const categoryRouter = require('./categoryRouter');
const { getAppRoutesList } = require('../lib/routeErrorServices');
const { CustomShopError } = require('../lib/CustomShopError');

//Passar as variáveis app e express para os diferentes routers 
class RouterIndex {
    static init (app, express, models, controllers){

        // Definir as rotas para o routers individuais (cada um no seu ficheiro)
        app.use( '/categories', categoryRouter(express, controllers.categoryController) );       
        app.use( '/products', commentRouter(express, controllers.commentController) );       
        app.use( '/products', feedbackRouter(express, controllers.feedbackController) );       
        app.use( '/products', productRouter(express, controllers.productController, controllers.purchaseController) );       
        app.use( '/purchases', purchaseRouter(express, controllers.purchaseController) );       
        app.use( '/users', userRouter(express, controllers.userController) );       
        app.use( '/', authRouter(express, controllers.authController) ); 
        app.use('/public', express.static(process.cwd() + '/public'));

        // Apanhar e lidar com todos os erros que fazem call a next() (manual ou automaticamente) 
        app.use( (req, res, next)=>{
            const error = new CustomShopError('A rota que está a tentar aceder não existe. Para uma lista das rotas possíveis veja mais abaixo:');
            error.additionalInfo = getAppRoutesList();
            error.status = 404;
            next(error);
          });

        app.use(controllers.errorController);
    }
}


module.exports = RouterIndex;


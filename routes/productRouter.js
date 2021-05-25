/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const { isAuthenticated, isProductManager } = require('../lib/auth');
const { getProductRelatedRoutesList } = require('../lib/routeErrorServices');


productRouter = (express, controller, purchaseController) =>{
  
  const router = express.Router();

  //Estatísticas sobre produtos
  router.route('/stats')
  .all((req, res, next) => controller.slugToId(req, res, next) )
  .get((req, res, next) => controller.stats(req, res, next));

  router.route('/:id/stats')
  .all((req, res, next) => controller.slugToId(req, res, next) )
  .get((req, res, next) => controller.statsProduct(req, res, next))

  //subrota da rota /product a qual será controlada pelo purchaseController
  router.route('/:id/cart')
    .all((req, res, next) => controller.slugToId(req, res, next) )
    .post(isAuthenticated, (req, res, next) => purchaseController.addCartProduct(req, res, next))
    .put(isAuthenticated, (req, res, next) => purchaseController.editCartProduct(req, res, next))
    .delete(isAuthenticated, (req, res, next) => purchaseController.deleteCartProduct(req, res, next));

  //subrota para a wishlist
    router.route('/:id/wishlist')
    .all((req, res, next) => controller.slugToId(req, res, next) )
    .put(isAuthenticated, (req, res, next) => controller.toggleWishlist(req, res, next));

  router.route('/')
    .get( (req, res, next) => controller.index(req, res, next))
    .post( 
      isProductManager, 
      (req, res, next) => controller.uploadImages(req, res, next), 
      (req, res, next) => controller.insert(req, res, next)
      );

  router.route('/:id')
    // Middleware que converte slug em id, verificando se a slug existe antes de converter, se não existir, ignora e faz next()
    .all((req, res, next) => controller.slugToId(req, res, next) )
    .get((req, res, next) => controller.show(req, res, next))
    .put( 
      isProductManager, 
      (req, res, next) => controller.uploadImages(req, res, next), 
      (req, res, next) => controller.edit(req, res, next)
      )
    .delete( isProductManager, (req, res, next) => controller.delete(req, res, next));

  // Rota específica para uma slug
  router.route('/name/:slug')
    .get( (req, res, next) => controller.showSlug(req, res, next));

  // Catch-all
  router.use("/*", getProductRelatedRoutesList);

  return router;
}

module.exports = productRouter;

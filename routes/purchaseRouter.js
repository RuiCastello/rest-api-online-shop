/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const { isAuthenticated } = require('../lib/auth');
const { getPurchaseRelatedRoutesList } = require('../lib/routeErrorServices');


purchaseRouter = (express, controller) =>{
  
  const router = express.Router();

  router
  .get("/", isAuthenticated, (req, res, next) => controller.index(req, res, next));

  router.route('/:id')
    .get(isAuthenticated, (req, res, next) => controller.show(req, res, next))
    .delete(isAuthenticated, (req, res, next) => controller.delete(req, res, next));

  router.route('/:id/payment')
    .post(isAuthenticated, (req, res, next) => controller.pay(req, res, next))
    .get(isAuthenticated, (req, res, next) => controller.getTotal(req, res, next));

  router.use('/*', getPurchaseRelatedRoutesList );

  return router;
}

module.exports = purchaseRouter;

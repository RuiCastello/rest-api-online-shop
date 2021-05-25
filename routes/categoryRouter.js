/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const { isProductManager } = require('../lib/auth');
const { getCategoryRelatedRoutesList } = require('../lib/routeErrorServices');

categoryRouter = (express, controller) =>{
  
  const router = express.Router();

  router.route('/')
  .get((req, res, next) => controller.index(req, res, next))
  .post(isProductManager, (req, res, next) => controller.insert(req, res, next));

  router.route('/:id')
  .get((req, res, next) => controller.show(req, res, next))
  .put(isProductManager, (req, res, next) => controller.edit(req, res, next))
  .delete(isProductManager, (req, res, next) => controller.delete(req, res, next))
  .post(isProductManager, (req, res, next) => controller.insertSubCategory(req, res, next));

  router.route('/:id/:subCategory')
  .get((req, res, next) => controller.showSubCategory(req, res, next))
  .put(isProductManager, (req, res, next) => controller.editSubCategory(req, res, next))
  .delete(isProductManager, (req, res, next) => controller.deleteSubCategory(req, res, next));

  // Catch-all
  router.use("/*", getCategoryRelatedRoutesList);

  return router;
}

module.exports = categoryRouter;

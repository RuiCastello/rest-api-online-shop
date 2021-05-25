/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const { isAdmin } = require('../lib/auth');
const { getUserRelatedRoutesList } = require('../lib/routeErrorServices');


userRouter = (express, controller) =>{
  
  const router = express.Router();

  router.route('/')
  .get(isAdmin, (req, res, next) => controller.index(req, res, next))
  .post(isAdmin, (req, res, next) => controller.insert(req, res, next));

  router.route('/:id')
  .get(isAdmin, (req, res, next) => controller.show(req, res, next))
  .put(isAdmin, (req, res, next) => controller.edit(req, res, next))
  .delete(isAdmin, (req, res, next) => controller.delete(req, res, next));

  router.use('/*', getUserRelatedRoutesList );

  return router;
}

module.exports = userRouter;

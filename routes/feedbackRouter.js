/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const { isAuthenticated, isProductManager } = require('../lib/auth');
const { getFeedbackCommentsRelatedRoutesList } = require('../lib/routeErrorServices');

feedbackRouter = (express, controller) =>{
  
  const router = express.Router();

  router.route('/:id/feedback')
  .get((req, res, next) => controller.index(req, res, next))
  .post(isAuthenticated, (req, res, next) => controller.insert(req, res, next))
  .put(isAuthenticated, (req, res, next) => controller.edit(req, res, next))
  .delete(isAuthenticated, (req, res, next) => controller.delete(req, res, next))
  .all( getFeedbackCommentsRelatedRoutesList );

  router.route('/:id/feedback/:feedbackId')
  .get((req, res, next) => controller.show(req, res, next))
  .put(isAuthenticated, (req, res, next) => controller.edit(req, res, next))
  .delete(isAuthenticated, (req, res, next) => controller.delete(req, res, next))
  .all( getFeedbackCommentsRelatedRoutesList );

  return router;
}

module.exports = feedbackRouter;

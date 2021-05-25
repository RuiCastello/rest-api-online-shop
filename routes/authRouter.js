/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const { isAuthenticated } = require('../lib/auth');

authRouter = (express, controller) =>{
  
  const router = express.Router();

        //Log-in
        router.route('/login')
          .post((req, res, next) => controller.logIn(req, res, next))
          .all((req, res, next) => controller.warnUser(req, res, next));

        //Register
        router.route('/register')
          .post( (req, res, next) => controller.register(req, res, next))
          .all((req, res, next) => controller.warnUser(req, res, next));

        //Forgot Password
        router.route('/forgotPassword')
          .post( (req, res, next) => controller.forgotPassword(req, res, next))
          .all( (req, res, next) => res.status(404).json({status: 'error', message:'A rota que está a tentar usar não existe, para fazer reset à sua password, deve usar este mesmo path/url mas com o método POST.'}) );
        router.route('/resetPassword/:rToken')
          .post( (req, res, next) => controller.resetPassword(req, res, next))
          .all( (req, res, next) => res.status(404).json({status: 'error', message:'A rota que está a tentar usar não existe, para fazer reset à sua password, deve usar este mesmo path/url mas com o método POST.'}) );

        //Me
        router.route('/me')
            .get(isAuthenticated, (req, res, next) => controller.me(req, res, next))
            .put(isAuthenticated, (req, res, next) => controller.edit(req, res, next))
            .delete(isAuthenticated, (req, res, next) => controller.delete(req, res, next))
            .all( (req, res, next) => res.status(404).json({status: 'error', message:'A rota que está a tentar usar não existe, para ver os seus dados user o método GET nesta rota, para editar use PUT, e para remover a sua conta completamente use DELETE.'}) );

  return router;
}

module.exports = authRouter;

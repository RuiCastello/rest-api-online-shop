/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

class CustomShopError extends Error {  
    constructor (message) {
      super(message)
  
      Object.defineProperty(this, 'name', {
        value: this.constructor.name,
        writable: true,
        enumerable: false, // Ao dizer aqui que não é enumerável, ela deixa de aparecer no res.json() quando é passada dentro dessa função. Ou seja, ela só aparece caso se tente fazer o output dela explicitamente, por exemplo res.json(error.name), se for só res.json(error) o valor de "name" não aparecerá.
        configurable: true 
    });
  
      Error.captureStackTrace(this, this.constructor);
    }
  }

  
  
  
  module.exports = {
    CustomShopError: CustomShopError
  }
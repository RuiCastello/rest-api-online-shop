/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const fs = require('fs');

const deleteFile = (filePath) =>{
    let filePathBase = "./public/";
    filePath = filePathBase + filePath;

    // console.log(filePath)
    fs.unlink(filePath, (error)=>{
        // if (error) throw error;
    })

}//end deleteFile

module.exports = {
    deleteFile: deleteFile,
};

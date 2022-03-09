const fs = require("fs");

/**
 * Write File Json
 * @param {string} path 
 * @param {*} data
 */
function write_json(path, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve(path);
        });
    });
}

/**
 * Read File Json
 * @param {string} path
 */
function read_json(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, "utf-8", (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });
}

/**
 * Check if File Json exists
 * @param {string} path
 */
function exists_json(path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            resolve({ exists: err?.code != "ENOENT" });
        });
    });
}

module.exports = { write_json, read_json, exists_json };
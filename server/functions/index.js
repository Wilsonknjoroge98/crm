const functions = require('firebase-functions');
const expressApp = require('./server.js');

exports.app = functions.https.onRequest(expressApp);

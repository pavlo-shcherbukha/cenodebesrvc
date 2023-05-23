const http = require('http');
const express = require('express');
const winston = require('./config/winston');
var morgan = require('morgan');
const path = require('path');
const fs = require('fs');
var fileUpload = require('express-fileupload');

const axios = require('axios');
const FormData = require('form-data');
var multiparty = require('multiparty');
const UrlPattern = require('url-pattern');

var logger = winston ;
const { LogContext,  AppLogger } = require('./config/logcontext');
var logctx= new LogContext();
var applog= new AppLogger();
applog.LogContext=logctx;
var label='server'
applog.info( 'Server is starting',label);
applog.info( 'Server test message',label);

const localConfig = require('./config/local.json');


const app = express();
app.set('x-powered-by', false);
const server = http.createServer(app);

app.use(fileUpload( { //useTempFiles: true, 
      //tempFileDir: './uploads', 
      debug: true, 
      limits: { fileSize: 50 * 1024 * 1024 }  
    })
);
app.use(morgan('combined', { stream: winston.stream }));

const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init('/server/config/mappings.json');

// pasha:  It is needed  in routers o services but  not in server
const serviceManager = require('./services/service-manager');
require('./services/index')(app, serviceManager);
require('./routers/index')(app, server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Add your code here
const port =  process.env.SHAPPDB_SERVICE_PORT  || localConfig.port;

cookieParser    = require('cookie-parser'),
session         = require('express-session'),
bodyParser      = require('body-parser');

query           = require('querystring');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use((req, res, next) => {
  applog.express_log_request( req, res, next);
  res.header("Access-Control-Allow-Origin", "*"); 
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ad-name, x-powered-by, date, authorization, callid, SystemID, DtRequest,app_username,x-Content-Type");
  res.header('Access-Control-Allow-Methods', 'DELETE,GET,PATCH,POST,PUT'); 
  applog.express_log_response( req, res, next); 
  next();
});



/*=====================================================================*/


const apperror = require('./error/appError');
const applib = require('./applib/apputils');
const dbsrvc = require('./services/prod_db_srvc');
const { exit } = require('process');

const dbname = IBMCloudEnv.getString('STORAGE_DBNAME');
const db= new dbsrvc.ProdDbServcie(dbname);

(async function() {
  try{
    applog.info('Connect to Database',label)
	  await db.initdb();
    applog.info('Connect to Database-OK',label)
  } catch( err ){
      applog.error( `Database connection error:  ${err.message} ${err.stack}`  ,label);

    
  }  
})();

/**
 * Register product
 * {
 *     "product_id": "Laptop1",
 *     "product_title": "Laptop tnonkpad"
 *  }
 * 
 */
app.post('/api/productregistry',  function(req, res) {
    label='http-post:api-productregistry' 
    try {
      
      var product_dsc = req.body ;
      applog.info( `Reqbody: ` + JSON.stringify(req.body)  ,label);
      applog.info( `save into db `  ,label);
      db.add_product(product_dsc)
      .then( cas =>{
          applog.info( `Saved. Return result ` + JSON.stringify(cas)  ,label);
          return res.status(200).json( cas );
      })
      .catch(err =>{
        applog.error( `Error!!!!! ${err.message} `   ,label);
        errresp=applib.HttpErrorResponse(err)
        applog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp )   ,label);
        return res.status(errresp.Error.statusCode ).json(errresp);
      });  
             
    }
    catch (err)  {
        applog.error( `Regestration error! ${err.message} `   ,label);
        errresp=applib.HttpErrorResponse(err)
        applog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp )   ,label);
        return res.status(errresp.Error.statusCode ).json(errresp);
    };


});

/**
 * Read registry list
 */
app.get('/api/productregistry',  function(req, res, next) {
  let label='http-get:api-productregistry' 
  let alogctx= new LogContext();
  let alog= new AppLogger();
  alog.LogContext=alogctx;      
  alog.info("Method path /api/productregistry")    
  alog.info( `Read products `  ,label);
  try {
        db.read_products( alog ) 
        .then(r_result=>{
            alog.info( `Return result ` + JSON.stringify(r_result), label);
            return res.status(200).json(  r_result );
        })
        .catch(err =>{
          alog.error( `Error` + err.message  ,label);
          errresp=applib.HttpErrorResponse(err)
          alog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp ), label);
          return res.status(errresp.Error.statusCode ).json(errresp);
        });  
  } 
  catch ( err ) {
    alog.error( `Error  ` + err.message  ,label);
    errresp=applib.HttpErrorResponse(err)
    alog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp ), label);
    return res.status(errresp.Error.statusCode ).json(errresp);

  }    
});

app.options('/api/productregistry',  function(req, res) {
  label='http-option:api-productregistry' 
  applog.info( ` Method ${label} `  ,label);
  return res.status(200).end();
});



/**
 * Red product  by prod_id
 */
app.get('/api/productregistry/:prod_id',  function(req, res, next) {
  let label='http-get:api-productregistry-:prod_id' ;
  let alogctx= new LogContext();
  let alog= new AppLogger();
  alog.LogContext=alogctx;      
  alog.info("Method path /api/productregistry/:prod_id")


  alog.info( ` MEthod ${label} `  ,label);
  var prod_id = req.params.prod_id;
  alog.info( `Read product by  ${prod_id}`, label);  
  try {
        
        db.get_product(prod_id, alog)
        .then(cas=>{
            data={ product: prod_id, settings:cas}
            alog.info( `Return result ` + JSON.stringify(data), label);
            return res.status(200).json(  data );
        })
        .catch(err =>{
          alog.error( `Error` + err.message  ,label);
          errresp=applib.HttpErrorResponse(err)
          alog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp ), label);
          return res.status(errresp.Error.statusCode ).json(errresp);
        });  
  } 
  catch ( err ) {
    alog.error( `Error by ${prod_id} ` + err.message  ,label);
    errresp=applib.HttpErrorResponse(err)
    alog.error( `Error result! ${errresp.Error.statusCode} ` + JSON.stringify( errresp ), label);
    return res.status(errresp.Error.statusCode ).json(errresp);

  }    
 
});

/**
 * Update product
 */
app.post('/api/productregistry/:prod_id',  function(req, res, next) {
  let alogctx= new LogContext();
  let alog= new AppLogger();
  alog.LogContext=alogctx;      
  alog.info("Method path /app/settingslist/:prod_id")

  try {  
      var prod_id = req.params.prod_id;
      var body = req.body.settings ;
      console.log( "prod_id ====>" + prod_id )
      body["_id"]=prod_id

      console.log( "body ====>" + JSON.stringify(body) )
      db.update_product(prod_id, body, alog)
      .then( cas =>{
        return res.status(200).json( cas );
      })
      .catch(err =>{
        alog.error( `Error` + err.message  ,label);
        errresp=applib.HttpErrorResponse(err)
        alog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp ), label);
        return res.status(errresp.Error.statusCode ).json(errresp);
      })
      .finally( ()=>{
        alogctx=undefined;
        alog=undefined;
      });    
  }
  catch (err){
    alog.error( `Error by ${prod_id} ` + err.message  ,label);
    errresp=applib.HttpErrorResponse(err)
    alog.error( `Result with error! ${errresp.Error.statusCode} ` + JSON.stringify( errresp ), label);
    alogctx=undefined;
    alog=undefined;
    return res.status(errresp.Error.statusCode ).json(errresp);
  }    

});

app.options('/api/productregistry/:prod_id',  function(req, res) {
  label='http-option:api-productregistry-{prod_id}' 
  applog.info( ` Виклик методу `  ,label);
  return res.status(200).end();
});




/*=====================================================================*/

/** Right call listen 
 *  in include possibilisty to run application from mocha
*/
if(!module.parent){ 

  server.listen(port, function(){

    applog.info( 'SERVER HAS STARTED',label);
    applog.info( `LISTENING  PORT= ${port} on HOST ${ ( typeof process.env.HOSTNAME === "undefined") ? 'localhost' :  process.env.HOSTNAME}`,label);
  
  });
}


module.exports = server;
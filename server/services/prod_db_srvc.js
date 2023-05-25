/**
 * 
 * Cloudant product API
 */

const fs = require('fs');

const apperror = require('../error/appError');
const applib = require('../applib/apputils');

const winston = require('../config/winston');
var logger = winston ;  
const { LogContext,  AppLogger } = require('../config/logcontext');

const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init('/server/config/mappings.json');

const product_settings_templ = require('../config/product_settings.json');
const product_registry_templ = require('../config/product_registry_templ.json');

const { CloudantV1 } = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

cloudant_apikey=IBMCloudEnv.getString('CLOUDANT_APIKEY');
cloudant_url=IBMCloudEnv.getString('CLOUDANT_URL');






class ProdDbServcie {
    constructor ( a_dbname ) {
      this.label = 'ProdDbServcie' ;
      this.logctx= new LogContext();
      this.applog= new AppLogger();
      this.applog.LogContext=this.logctx;
      this.service=null
      this.authenticator=null
      this.dbname=a_dbname
    } ;
        
    /** logger */
    log(){

        this.applog.info( 'db message', this.label);
        this.applog.error( 'ERROR message', this.label);
    };

    /**
     * Find object in array of objects
     * @param {*} service_list 
     * @param {*} service_id 
     * @returns 
     */
    findservice( service_list, product_id ){
        return new Promise(function (resolve) {
            return resolve( service_list.findIndex( (item ) => { 
                                                                    //console.log(  '1 ' + service_id);
                                                                    //console.log(  JSON.stringify(item));    
                                                                    if (item.product_id.localeCompare(product_id ) === 0){
                                                                        return true;
                                                                    }
                            }) )
        });
    } //findservice


    /**
     * connect to db
     */
    db_connect(){

        this.authenticator = new IamAuthenticator({
            apikey: cloudant_apikey
        });
        this.service = CloudantV1.newInstance({authenticator: this.authenticator});
        this.service.setServiceUrl(cloudant_url);
        
    }

    /**
     * connect to db and create database if it does not exists
     */
    async initdb(){
        let label=this.label+'.' + 'initdb'

        try {
            this.applog.info( `Check existance of DB: `, label);
            this.db_connect()
            let serverinfo=  await this.service.getServerInformation()
            let databases= await this.service.getAllDbs()
            this.applog.info( `ServerInfo=` + JSON.stringify(serverinfo.result), label );
            this.applog.info( `DB LIST: ` + JSON.stringify(databases.result), label);
            if (databases.result.indexOf(this.dbname) < 0) {
                this.applog.info( `DB: ${this.dbname} відсутня.`, label);
                this.applog.info( `Creating DB : ${this.dbname}`, label);
                await this.service.putDatabase(    {db: this.dbname,partitioned: false});
                this.applog.info( `Creating DB: ${this.dbname} - created`, label);
                this.applog.info( `Connect to DB: ${this.dbname}`, label);
                this.applog.info( `Connect to DB: ${this.dbname} - connected`, label);
                let documents = []
                documents.push(product_registry_templ)
                documents.push(product_settings_templ)
                this.applog.info( `DB: ${this.dbname} create objects in DB`, label);    
                let docscrt = await this.service.postBulkDocs({ db: this.dbname, bulkDocs: { docs: documents} });
                this.applog.info( `DB: ${this.dbnamee}  create objects in DB resp: ` + JSON.stringify(docscrt), label);    
                docscrt.result.forEach( item => {
                    if (item.ok!==true){
                        this.applog.info( `DB: ${this.dbname} Error creating objects in DB: ` + JSON.stringify( item ), label);    
                    } 
                })
            }    
        } 
        catch (err)  {
            this.applog.error(err.message, label);
            
        };
    } // initdb
    
    /**
     * Add product into list
     * @param {*} product_dsc 
     * @returns 
     */
    async  add_product( product_dsc ){
        var label=this.label+'.' + 'add_product'
        this.applog.info('add product ' + JSON.stringify(product_dsc),label)
        const product_register_id="product-registry";
        var product_id=product_dsc.product_id;
        var product_register={}
        var crt_setting_flag=false
        try {
            this.applog.info('read registry ',label);
            let prod_register = await this.service.getDocument({ db: this.dbname, docId: product_register_id});
            product_register=prod_register;
            this.applog.info('read registry-OK',label);
            this.applog.info('Check if product exists in the registry  [' + product_id  + ']',label);
            let resultidx = await  this.findservice( prod_register.result.registrylist,   product_id );
            if (resultidx < 0 ){
                this.applog.info('Check if product exists in the registry [' + product_id  + '] - add new one!',label);
                product_register.result.registrylist.push(product_dsc );
                crt_setting_flag=true
                let result={};
                result= await this.service.postDocument({ db: this.dbname,  document: product_register.result});
                

                if (crt_setting_flag===true) {
                    this.applog.info('Product [' + product_id  + '] - creating product decription from template ',label);
                    let newsetting = Object.assign({}, product_settings_templ);;
                    newsetting._id=product_id;
                    result= await this.service.postDocument({ db: this.dbname,  document: newsetting});
                    this.applog.info('Product [' + product_id  + '] - reating product decription from template - OK',label);
                }    
                this.applog.info('Product [' + product_id  + '] - return result! ' + JSON.stringify(result),label);
                return result;

            }  else {
                this.applog.info('Check if product exists in the registry [' + product_id  + '] - Found!',label);
                let resp={"ok": true};
                this.applog.info('Product [' + product_id  + '] - return result! ' + JSON.stringify(resp),label);
                return resp
            }  
        } catch (err)  {
            this.applog.error(err.message, label);
            throw new apperror.ApplicationError(err.message);
        };
    } //add_product

    /**
     * Read products
     * @param {*} alog 
     * @returns 
     */
    async read_products(alog){
        var label=this.label+'.' + 'read_products'
        alog.info(`Прочитати список зареєстрованих продуктів` , label)
        const product_register_id="product-registry";
        try {
            alog.info(`Читаю з CouchDB` , label)
            let srvc_register = await this.service.getDocument({ db: this.dbname, docId: product_register_id});
            let result={}
            result.list=srvc_register.result.registrylist;
            alog.info(`Повертаю результат ` + JSON.stringify( result ) , label)
            return result;
        } catch (err)  {
            alog.error(err.message, label);
            throw new apperror.ApplicationError(err.message);
        };
    } 

    /**
     * Read product by product_id
     * @param {*} product_id 
     * @param {*} alog 
     * @returns 
     */
    async get_product( product_id , alog){
        var label=this.label+'.' + 'get_product'
        alog.info(`read product` , label)
        try {
            const document_id=product_id;
            let product = await this.service.getDocument( { db: this.dbname, docId: document_id} )
            alog.info(`return result ` + JSON.stringify( product ) , label)
            return  product.result;
        } catch (err)  {
            alog.error(err.message, label);
            throw new apperror.ApplicationError(err.message);

        };
    } 

    /**
     * Update product
     * @param {*} prod_id 
     * @param {*} data 
     * @param {*} alog 
     * @returns 
     */
    async update_product( prod_id, data, alog ){
        const document_id=prod_id;
        const body=data
        var label=this.label+'.' + 'update_product'
        alog.info(`Update product` , label)
        try {        
       
                return await this.service.postDocument({ db: this.dbname, document: body});
        } catch (err)  {
                alog.error(err.message, label);
                throw new apperror.ApplicationError(err.message);
        };        

    }

}  // EdsDbServcie


module.exports.ProdDbServcie = ProdDbServcie;
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
    'N/email',
    'N/file',
    'N/search',
    'N/render',
    'N/url',
    'N/config',
    'N/https',
    'N/xml',
    'N/runtime',
    'N/record',
    'N/encode',
    './lib/data_search_lib',
    './lib/constants_lib',
    './lib/helper_lib.js'

], function(email, file, search, render, url, config, https, xml, runtime, record, encode, search_lib, constant_lib, helper_lib) {


    function onRequest(context) {
         let request = context.request;
           let response = context.response;
           let params = request.parameters;

           log.debug("request", request);

        try {

            if (request.method === 'GET') 
            {
                log.debug('GET params', params);
                getHandler(request, response, params, context.request);
            } 
            else if (request.method === 'POST') 
            {
                postHandler(request, response, params, context.request);
            }
        } catch (e) {
            log.error('Error::onRequest', e);
            response.writeLine({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
        }

    }

    function getHandler(request, response, param, context) {

        log.debug("get request hit!!!");

      log.debug("get param", param);
       log.debug("get param", request);

       log.debug("payLoad", JSON.parse(param.payLoad));
       let payLoad = JSON.parse(param.payLoad);
       
       let vendorbillInternalId = payLoad.internalid;
       let transactionType      = payLoad.transactionType;
       let undueTaxCode        = payLoad.undueTaxCode;

      let undueDebitAcc = payLoad.undueDebitAcc;
      let isSuiteTaxEnabled = payLoad.isSuiteTaxEnabled;
      let isUndueEnabled = payLoad.isUndueEnabled;

      let vendorBillObject = payLoad.vendorBillObject;
      let vendorPaymentId = payLoad.vendorPaymentId;
      let newRecordType = payLoad.newRecordType;

      let pndCategory = helper_lib.getPndCategoryOptimized(vendorbillInternalId, transactionType)
      let undueCreditAcc = helper_lib.getCreditAccountFromTaxCode(isSuiteTaxEnabled, undueTaxCode);

           if(isUndueEnabled)
           {
                   let vatTaxAmount = helper_lib.getVatAmountFromTransaction(isSuiteTaxEnabled, vendorbillInternalId, undueTaxCode );

                      if(vatTaxAmount>0)
                      {
                        let journalEntryId = helper_lib.createReversalJournalEntry(vendorBillObject, vatTaxAmount, vendorPaymentId, newRecordType, undueDebitAcc, undueCreditAcc)
                          log.audit("journalEntryId: ", journalEntryId);
                      }
          }

                    
                 let queueId = helper_lib.createQueueRecord(vendorBillObject, pndCategory)
                 log.debug("queueId: ", queueId);

      response.write(JSON.stringify({message : "success", queueId : "queueId"}))

    }


    function postHandler(request, response) {

        log.debug("post request hit!!!");

        try {
            
          let payLoad = JSON.parse(request.body);
          let {
            internalid,
            transactionType,
            undueTaxCode,
            undueDebitAcc,
            isSuiteTaxEnabled,
            isUndueEnabled,
            vendorBillObject,
            vendorPaymentId,
            newRecordType,
          } = payLoad; 
      
          let pndCategory = helper_lib.getPndCategoryOptimized(internalid, transactionType);
          let undueCreditAcc = helper_lib.getCreditAccountFromTaxCode(isSuiteTaxEnabled, undueTaxCode);
      
          if (isUndueEnabled) {
            let vatTaxAmount = helper_lib.getVatAmountFromTransaction(isSuiteTaxEnabled, internalid, undueTaxCode);
      
            if (vatTaxAmount > 0) {
              let journalEntryId = helper_lib.createReversalJournalEntry(
                vendorBillObject,
                vatTaxAmount,
                vendorPaymentId,
                newRecordType,
                undueDebitAcc,
                undueCreditAcc, 
                internalid
              );
              log.audit("journalEntryId: ", journalEntryId);
            }
          }
      
          // wait(360000);

          let queueId = helper_lib.createQueueRecord(vendorBillObject, pndCategory);
          log.debug("queueId: ", queueId);
      
          // function wait(ms) {
          //   var start = +(new Date());
          //   while (new Date() - start < ms);
          // }

          response.write(JSON.stringify({ message: "success", queueId: queueId }));
        } 
        catch (error) {
          log.error('Error processing request:', error);
          response.write(JSON.stringify({ message: "error", error: error.toString() }));
        }
      }
    
   
    

    return {
        onRequest: onRequest
    }


});
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript 
 */

define(['N/record', 'N/search', 'N/task', 'N/runtime', './lib/helper_lib'],

  function (record, search, task, runtime, helper_lib) { 

    function afterSubmit(context) {

      if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
           
        if (runtime.executionContext === runtime.ContextType.USER_INTERFACE || runtime.executionContext == "CSVIMPORT") {
 
        try { 

        log.debug("context.context.newRecord.id", context.type)
        log.debug("runtime.executionContext ",  runtime.executionContext )

        let internalId = context.newRecord.id;
        let recordType = context.newRecord.type;
        let configurationRecordFields = helper_lib.getConfigurationRecordFields();
        let isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled;

        log.debug("isSuiteTaxEnabled: ", isSuiteTaxEnabled);

        // if (!isSuiteTaxEnabled) { return }

        let transObj = record.load({
          type: recordType,
          id: internalId,
          isDynamic: false
        });


        let sublist = transObj.getLineCount({ sublistId: 'item' }) > 0 ? 'item' : transObj.getLineCount({ sublistId: 'expense' }) > 0 ? 'expense' : ""

        sublistCount = transObj.getLineCount({ sublistId: sublist })

        log.debug("itemsSublistCount: ", transObj.getLineCount({ sublistId: 'item' }));
        log.debug("expenseSublistCount: ", transObj.getLineCount({ sublistId: 'expense' }));

        for (var i = 0; i < sublistCount; i++) {

          let whtTaxRate =transObj.getSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_tax_rate', line: i });
          let amount = transObj.getSublistValue({ sublistId: sublist, fieldId: 'amount', line: i });  //changed for beforeVatWork

          let grossAmt = transObj.getSublistValue({ sublistId: sublist, fieldId: 'grossamt', line: i });

          let vatRate = parseFloat((grossAmt-amount)*100/amount).toFixed()

          log.debug("vatRate: ", vatRate); 
          log.debug("grossAmt: ", grossAmt); 
          log.debug("amount: ", amount); 

          if ((amount == 0) || (!amount)) { continue }

          let isPartialPayment = transObj.getSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_apply_partial_payments', line: i });

          let partialPayment = (transObj.getSublistValue({ sublistId: sublist, fieldId: 'custcol_wht_partial_payment_amount', line: i }));

          log.debug("isPartialPayment: ", isPartialPayment);

          log.debug("partialPayment: ", partialPayment);

          if (whtTaxRate) { 
              // partialPayment ? 
              // helper_lib.setPartialNetAmntFieldsForSuiteTax(transObj, whtTaxRate, sublist, i, isSuiteTaxEnabled) :
              // helper_lib.setFullNetAmntFieldsForSuiteTax(transObj, whtTaxRate, amount, sublist, i, isSuiteTaxEnabled)
            
            if((isPartialPayment && partialPayment)){ 
              helper_lib.setPartialNetAmntFieldsForSuiteTax(transObj, whtTaxRate, sublist, i, isSuiteTaxEnabled, runtime.executionContext)
            }
            else if((!isPartialPayment && partialPayment)){
              helper_lib.setPartialNetAmntFieldsForSuiteTax(transObj, whtTaxRate, sublist, i, isSuiteTaxEnabled, runtime.executionContext)
            }
            else if(!isPartialPayment && !partialPayment){
              helper_lib.setFullNetAmntFieldsForSuiteTax(transObj, whtTaxRate, grossAmt, sublist, i, isSuiteTaxEnabled, runtime.executionContext)
            }

          } 
          else { 
    
            partialPayment ?  
            transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_apply_partial_payments', value: true, line: i }) 
            :  true
            
          } 

          transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_related_vat_rate', value: vatRate, line: i });
       
        } 

                  

        transObj.save({ ignoreMandatoryFields: true });

        }

        catch(e){
          log.error("Error in afterSubmit!",e);
        }

        }
  
     }

    }
 
    return {
      afterSubmit: afterSubmit
    }


  }


);
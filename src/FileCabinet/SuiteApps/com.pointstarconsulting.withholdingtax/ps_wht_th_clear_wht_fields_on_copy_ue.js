/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search', 'N/log', './lib/helper_lib', 'N/runtime'],

    function(record, search, log, helper_lib, runtime) { 


        function beforeLoad (context) {

            try{

            if (context.type === context.UserEventType.COPY) {

                if (context.newRecord.type == 'invoice' || context.newRecord.type == 'vendorbill') {

                    var newRecord = context.newRecord;

                    var isThaiTaxTransaction = newRecord.getValue('custbody_ps_wht_is_thai_tax_trans') || ''

                    if(isThaiTaxTransaction){
                        var itemSublist = 'item';
                        var expenseSublist = 'expense';
                        var itemSublistCount = newRecord.getLineCount({ sublistId: itemSublist });
                        var expenseSublistCount = newRecord.getLineCount({ sublistId: expenseSublist });
    
                        helper_lib.clearLineFieldsOnCopyContextOfNewRecord(itemSublist, itemSublistCount, newRecord);
                        helper_lib.clearLineFieldsOnCopyContextOfNewRecord(expenseSublist, expenseSublistCount, newRecord);

                        newRecord.setValue('custbody_ps_wht_is_thai_tax_trans',false);
                        newRecord.setValue('custbody_ps_wht_ref_journal_entry','');
                    }
    
                    newRecord.setValue('custbody_ps_wht_ref_journal_entry','');
                   
                }
                
                if (context.newRecord.type == 'check' || context.newRecord.type == 'cashsale'){
                   
                    let newRecord = context.newRecord;

                    var isThaiTaxTransaction = newRecord.getValue('custbody_ps_wht_is_thai_tax_trans') || ''

                    log.debug("check : isThaiTaxTransaction",isThaiTaxTransaction);

                    if(isThaiTaxTransaction){
                        newRecord.getField('custbody_ps_wht_sequence_no') ? newRecord.setValue('custbody_ps_wht_sequence_no', '') : false
                        newRecord.getField('custbody_ps_wht_certificate_no') ? newRecord.setValue('custbody_ps_wht_certificate_no', '') : false
                        newRecord.getField('custbody_ps_wht_bill_lines_data') ? newRecord.setValue('custbody_ps_wht_bill_lines_data', '') : false
                        newRecord.getField('custbody_ps_wht_is_thai_tax_trans') ? newRecord.setValue('custbody_ps_wht_is_thai_tax_trans', false) : false
                    }
                }
            }
           
            }
            catch(e){
                log.error("Error in beforeLoad",e);
            }

            }

        function beforeSubmit(context){

            try {

            if (context.newRecord.type == 'invoice' || context.newRecord.type == 'vendorbill') {   
                
                if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {

                    log.debug('context',context)

                    let transactionRecord = context.newRecord;
  
                
                    let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(transactionRecord, 'item');
                    let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(transactionRecord, 'expense');


                    if (isWhtCodeExistInItemsSublist || isWhtCodeExistInExpenseSublist) {
                        transactionRecord.setValue('custbody_ps_wht_is_thai_tax_trans',true);
                    }

                    // if (runtime.executionContext === runtime.ContextType.USER_INTERFACE) {

                    // let sublist = transactionRecord.getLineCount({ sublistId: 'item' }) > 0 ? 'item' : transactionRecord.getLineCount({ sublistId: 'expense' }) > 0 ? 'expense': ""
                    // let sublistCount = sublist ? transactionRecord.getLineCount({ sublistId: sublist }) : 0

                    // log.debug("sublist: ",sublist);
                    // log.debug("sublistCount: ",sublistCount);

                    // for (var i = 0; i < sublistCount; i++) {

                    //     // let isPartialPayment = transactionRecord.getSublistValue(sublist, 'custcol_ps_wht_apply_partial_payments', i);
                    //     // log.debug("isPartialPayment: ",isPartialPayment);

                    //     // if(isPartialPayment){
        
                    //         let partialTaxAmount = helper_lib.isNull(transactionRecord.getSublistValue(sublist, 'custcol_ps_wht_partial_wht_amount_new', i));
                    //         log.debug("partialTaxAmount"+i,partialTaxAmount);
        
                    //         partialTaxAmount ? transactionRecord.setSublistValue(sublist,'custcol_ps_wht_partial_wht_amount_nfm',i,parseFloat(partialTaxAmount).toFixed(4)) : true
                            
                    //         let x = helper_lib.isNull(transactionRecord.getSublistValue(sublist, 'custcol_ps_wht_partial_wht_amount_nfm', i));
                    //         log.debug("x"+i,x);
                    //     // }
                         
                    // }
                
                    // }
              }
            }

            if (context.newRecord.type == 'check' || context.newRecord.type == 'cashsale') {

                if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {

                let transactionRecord = context.newRecord;

                
                    let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(transactionRecord, 'item');
                    let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(transactionRecord, 'expense');


                    if (isWhtCodeExistInItemsSublist || isWhtCodeExistInExpenseSublist) {
                        transactionRecord.setValue('custbody_ps_wht_is_thai_tax_trans',true);
                    }

                }

            }

            }
            catch(e){
                log.error("Error in beforeSubmit!",e);
            }
        }
    
        return {
            beforeLoad:  beforeLoad,
            beforeSubmit : beforeSubmit
        }

    }

); 
    /** 
     * @NApiVersion 2.1
     * @NScriptType ClientScript
     * @NModuleScope public 
     */
    

    const applySublist = 'apply';
    const itemSublistId = 'item';
    const applyField = 'apply'; 
    const docField = 'doc';
    const amountField = 'grossamt';  

    const amountItemField = 'grossamt';
    const taxCodeItemField = 'custcol_ps_wht_tax_code';
    const isPartialPaymentItemField = 'custcol_ps_wht_apply_partial_payments';



    define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog', './lib/helper_lib'],
        function(currentRecord, record, search, dialog, helper_lib) {


            var configurationRecordFields = ''
            var isIntTaxBundleInstalled = ''
            var isSuiteTaxEnabled = ''

            function pageInit(context) { 

                try {

                configurationRecordFields = helper_lib.getConfigurationRecordFields(); 
                isIntTaxBundleInstalled = configurationRecordFields.custrecord_ps_wht_international_tax_bndl;
                isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled;

                if (context.mode === 'create') {

                    let currentRec = context.currentRecord;
                    let searchParams = new URLSearchParams(window.location.search);

                    /** The withholding condition was being set from the before load of the payments UEs. 
                     * but after getting errors in different payment forms in setting th fields, we have shifted the logic here that will work
                     * on both venodr payment and customer payment
                     ----------------------------------------------------------------------------------------------------------------*/
                   
                    let transactionId = searchParams.get('inv') ? searchParams.get('inv') : searchParams.get('bill');
                    let transactionType =  currentRec.type == 'vendorpayment' ? 'vendorbill' : 'invoice'
                  
                    let isWhtCodeExist = transactionId ? helper_lib.checkIfWhtCodeExistOnTransaction(transactionId, transactionType) : ''

                    console.log("isWhtCodeExist on transaction : ", isWhtCodeExist);
                    console.log('transactionId',transactionId);
                    console.log('transactionType',transactionType);


                    if (transactionId && isWhtCodeExist) {

                        if(isIntTaxBundleInstalled){    
                            alert("To apply withholding tax to amount, re-check the 'Apply' box next to the bill you want to pay.")
                        }
                        else{
                            let entityFld = '';
    
                            currentRec.type == 'vendorpayment' ? entityFld = 'entity' : entityFld = 'customer'
        
                            const entityId = searchParams.get('entity')
        
                            if (entityId) {
                                currentRec.setValue(entityFld, entityId)
                            }
                        }

                        
                        let transactionFields = ['custbody_ps_wht_condition', 'cseg_subs_branch'];
                        let transactionRecord = search.lookupFields({
                            type: transactionType,
                            id: transactionId,
                            columns: transactionFields
                        }); 

                        console.log('transactionRecord', transactionRecord);

                        let conditionFieldLength = transactionRecord ? transactionRecord.custbody_ps_wht_condition.length : 0
                        let branchFieldLength = transactionRecord ? transactionRecord.cseg_subs_branch.length : 0


                        console.log('conditionFieldLength', conditionFieldLength);
                        console.log('branchFieldLength', branchFieldLength);
                    
                        let whtConditionValue = conditionFieldLength > 0 ? transactionRecord.custbody_ps_wht_condition[0].value : ''
                        let subsidiaryBranchValue = branchFieldLength > 0 ? transactionRecord.cseg_subs_branch[0].value : ''
                    
                        console.log('whtCondition', whtConditionValue);
                        console.log('subsidiaryBranch', subsidiaryBranchValue);
                    
                        if (whtConditionValue) {
                            currentRec.setValue({
                                fieldId: 'custbody_ps_wht_condition',
                                value: whtConditionValue
                            });
                        }
                    
                        if (subsidiaryBranchValue) {
                            currentRec.setValue({
                                fieldId: 'cseg_subs_branch',
                                value: subsidiaryBranchValue
                            });
                        }
                    } 
                    
                    /**------------------------------------------------------------------------------------------------------------- */
                    
                    
                // document.getElementById('markall').onclick = function() {markall();};

    

                // let transType = currentRec.type == 'vendorpayment' ?  ['VendBill','VendCred'] : ['CustInvc','CustCred']
                // let account =  currentRec.type == 'vendorpayment' ? currentRec.getValue('apacct') : currentRec.getValue('aracct')

                
                // function markall() {

                //     console.log("markall() hit");

              
                //     console.log("markall() hit");

                //     var count = nlapiGetLineItemCount('apply');

                //     console.log("markAll | count",count);

                //     let entityId = ''

                //     for(var i=1;i<=count;i++)
                //     {
                    
                //         console.log("i::",i);
                //           nlapiSelectLineItem('apply', i);
                        
                //           let doc = nlapiGetLineItemValue('apply','doc',i)
                //           let type = nlapiGetLineItemValue('apply','trantype',i)

                //           if(type == 'VendBill'){

                //             let transObj = record.load({
                //                 type: 'vendorbill',
                //                 id: doc,
                //                 isDynamic: true
                //               });

                      
                //               entityId = transObj.getValue('entity');

                //               break;
                            
                //           }


                //     }

                //     console.log("entityId",entityId);

                //     let thaiTaxTransactions = helper_lib.getThaiTaxTransactions(entityId, transType, account)


                //     for(vari=1;i<=count;i++){

                //         nlapiSelectLineItem('apply', i);
                        
                //         let doc = nlapiGetLineItemValue('apply','doc',i)

                //         for(var j=0;j<=thaiTaxTransactions.length;j++){

                //             if(doc==thaiTaxTransactions[j]){
                //                 console.log('doc',doc); 
                //                 console.log('thaiTaxTransactions[j]',thaiTaxTransactions[j]);
                //                 console.log('doc==thaiTaxTransactions[j]',doc==thaiTaxTransactions[j]);
                //                  nlapiSelectLineItem('apply', i);
                //                  nlapiSetCurrentLineItemValue('apply', 'apply', 'T', true, false);

                //             }                      
                //             else{
                //                 nlapiSelectLineItem('apply', i);
                //                 nlapiSetCurrentLineItemValue('apply', 'apply', 'T', false, false);
                //             }
                //         }

                //     }



                        
                //     }
                  

                }
    

            } 

            catch(e){
                log.error("Error on Page Init!", e.message);
            }

        }


            function fieldChanged(context) {

                var currentRec = context.currentRecord;
                var sublistId = context.sublistId;
                var fieldId = context.fieldId;
                var line = context.line;
                var tranType = {
                    "VendBill": "vendorbill",
                    "CustInvc": "invoice"
                }


                console.log("fieldId changed!", fieldId);



                try {



                    if (currentRec.type == 'vendorpayment' || currentRec.type == 'customerpayment') {

                        if (fieldId == 'trandate') {

                            if(isSuiteTaxEnabled){
                                return;
                            }

                            let tranDate = currentRec.getValue('trandate')
                            let taxPeriod = helper_lib.getTaxPeriod(tranDate); 

                            currentRec.setValue('custbody_ps_wht_tax_period', taxPeriod)
                        }

                         

                        if (sublistId === 'apply') {
                            
                            var applyFld = currentRec.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: line });

                            console.log("applyFld",applyFld);

                            if(!applyFld){
                                return
                            }
 

                            var doc = currentRec.getSublistValue({ sublistId: 'apply', fieldId: 'doc', line: line });
                            var type = currentRec.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: line });
                            var billRecord = record.load({ type: tranType[type], id: doc, isDynamic: true });
                            let itemSublistCount = billRecord.getLineCount('item');
                            let expenseSublistCount = billRecord.getLineCount('expense');

                             

                            if (itemSublistCount > 0) {

                                console.log("itemSublistCount", itemSublistCount);

                                var isWhtCodeExist = helper_lib.checkIfWhtCodeExistBody(billRecord, 'item');

                                console.log("isWhtCodeExist", isWhtCodeExist);
 
                                if (isWhtCodeExist) {
                                    var billPaymentAmount = helper_lib.getPaymentAmount(billRecord, tranType[type], 'item');

                                    console.log("billPaymentAmount", billPaymentAmount);

                                    if (fieldId === 'apply' && applyFld) {  

                                        console.log("if (fieldId === 'apply' && applyFld)");

                                        if (billPaymentAmount > 0) {
                                            console.log("helper_lib.formatNumberWithCommas(billPaymentAmount)",helper_lib.formatNumberWithCommas(billPaymentAmount));
                                            nlapiSetLineItemValue('apply', 'amount', line + 1, helper_lib.formatNumberWithCommas(billPaymentAmount))
                                                //  currentRec.setValue('payment', billPaymentAmount)
                                            document.getElementById(`amount${line + 1}_formattedValue`).disabled = true;
                                        // nlapiDisableLineItemField('apply', 'amount', true)
                                        } else {
                                            // type == 'VendBill' ? alert('Set Line Item Amounts on Bill First!') : alert('Set Line Item Amounts on Invoice First!')

                                            nlapiSetLineItemValue('apply', 'amount', line + 1, '')
                                            nlapiSetLineItemValue('apply', 'disc', line + 1, '')
                                            nlapiSetLineItemValue('apply', 'apply', line + 1, false)
                                        }
                                    } else if (fieldId === 'disc') {

                                        if (billPaymentAmount > 0) {
                                            var discountFld = currentRec.getSublistValue({ sublistId: 'apply', fieldId: 'disc', line: line });
                                            console.log('discountFld', discountFld);
                                            nlapiSetLineItemValue('apply', 'amount', line + 1, helper_lib.formatNumberWithCommas(billPaymentAmount - discountFld))
                                                //  currentRec.setValue('payment', billPaymentAmount - discountFld)
                                        }
                                    } else {
                                        document.getElementById(`amount${line + 1}_formattedValue`).disabled = false;
                                        document.getElementById(`disc${line + 1}_formattedValue`).disabled = false;
                                        // nlapiDisableLineItemField('apply', 'amount', false)
                                        // nlapiDisableLineItemField('apply', 'disc', false)
                                    }
                                }

                            }

                            if (expenseSublistCount > 0) {

                                console.log("expenseSublistCount", expenseSublistCount);

                                var isWhtCodeExist = helper_lib.checkIfWhtCodeExistBody(billRecord, 'expense');

                                console.log("isWhtCodeExist", isWhtCodeExist);

                                if (isWhtCodeExist) {

                                    var billPaymentAmount = helper_lib.getPaymentAmount(billRecord, tranType[type], 'expense');

                                    console.log("billPaymentAmount", billPaymentAmount);

                                    if (fieldId === 'apply' && applyFld) {

                                        if (billPaymentAmount > 0) {
                                            nlapiSetLineItemValue('apply', 'amount', line + 1, helper_lib.formatNumberWithCommas(billPaymentAmount))
                                                //  currentRec.setValue('payment', billPaymentAmount)
                                            document.getElementById(`amount${line + 1}_formattedValue`).disabled = true;
                                        //   nlapiDisableLineItemField('apply', 'amount', true)
                                        } else {
                                            // type == 'VendBill' ? alert('Set Line Item Amounts on Bill First!') : alert('Set Line Item Amounts on Invoice First!')

                                            nlapiSetLineItemValue('apply', 'amount', line + 1, '')
                                            nlapiSetLineItemValue('apply', 'disc', line + 1, '')
                                            nlapiSetLineItemValue('apply', 'apply', line + 1, false)


                                        }
                                    } else if (fieldId === 'disc') {

                                        if (billPaymentAmount > 0) {
                                            var discountFld = currentRec.getSublistValue({ sublistId: 'apply', fieldId: 'disc', line: line });
                                            console.log('discountFld', discountFld);
                                            nlapiSetLineItemValue('apply', 'amount', line + 1, helper_lib.formatNumberWithCommas(billPaymentAmount - discountFld))
                                                //  currentRec.setValue('payment', billPaymentAmount - discountFld)
                                        }
                                    } else {
                                        document.getElementById(`amount${line + 1}_formattedValue`).disabled = false;
                                        document.getElementById(`disc${line + 1}_formattedValue`).disabled = false;
                                        // nlapiDisableLineItemField('apply', 'amount', false)
                                        // nlapiDisableLineItemField('apply', 'disc', false)
                                    }
                                }

                            }



                            if(applyFld){

                            // Calculate the total payment amount from the selected lines
                            var totalPaymentAmount = 0;
                            
                            console.log("if(applyFld)",applyFld);

                            for (let i = 0; i < currentRec.getLineCount('apply'); i++) {
                                if (fieldId === 'apply' && applyFld){
                                    console.log("fieldId === 'apply' && applyFld");
                                    
                                    var linePaymentAmount = helper_lib.isNull(currentRec.getSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i }));
                                    console.log("linePaymentAmount"+i,linePaymentAmount);

                                    currentRec.setValue('payment', '');
                                    if(linePaymentAmount>0){
                                        totalPaymentAmount += linePaymentAmount;
                                    }   
                           
                                }
                            }

                            console.log("setting totalPaymentAmount",totalPaymentAmount);

                            // Set the calculated payment amount to the payment field
                           // currentRec.setValue('payment', (totalPaymentAmount)); //commented before JK demo on 7thNov23 due to the issue that muliple invoices were not selecting. Need to uncomment later after demo 

                            }
                        

                        }

                    }



                } catch (e) {
                    console.error('Error::fieldChanged::' + fieldId, e);
                    log.error('Error::fieldChanged::' + fieldId, e);
                }

            }

    
      


            return {

                fieldChanged: fieldChanged,
                pageInit: pageInit

            };

        }
    );
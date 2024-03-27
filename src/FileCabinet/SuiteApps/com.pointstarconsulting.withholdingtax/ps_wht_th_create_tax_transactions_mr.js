/** 
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/config', 'N/format', 'N/runtime', './lib/helper_lib.js'],
    function(search, record, config, format, runtime, helper_lib) {

         

        function getInputData() {
            try {
                var billRecords = helper_lib.getRecordsToProcess();

                log.debug("getRecordsToProcess: ", billRecords)
                log.debug("No of Records To Process: ", billRecords.length)
    
                return billRecords;
            }
            catch(e){
                log.error("Error in getInputData()",e);
            } 
        }

        function map(context) {

            let billCreditId;
            let searchResult;

            try {

                searchResult = JSON.parse(context.value);

                log.debug("searchResult: ", searchResult); 

                let script = runtime.getCurrentScript();
                log.audit({
                "title": "Governance Monitoring | start | internalID: "+searchResult.internalId,
                "details": "Remaining Usage = " + script.getRemainingUsage()
                });


                let transactionToUpdate = '';

                if (searchResult.type == 'invoice') {
                    transactionToUpdate = 'invoice'
                } else if (searchResult.type == 'bill') {
                    transactionToUpdate = 'vendorbill'
                }

                let transactionObj = record.load({
                    type: transactionToUpdate,
                    id: searchResult.internalId,
                    isDynamic: false 
                });

                log.debug('transactionObject',transactionObj);

                 
                let itemSublistCount = transactionObj.getLineCount('item');
                let expenseSublistCount = transactionObj.getLineCount('expense');
                let sublist;
                let lineItemCount = 0;
                let billStatus = transactionObj.getText('statusRef')

                if (itemSublistCount > 0) { 
                    lineItemCount = itemSublistCount
                    sublist = 'item';
                } 
 
                if (expenseSublistCount > 0) {
                    lineItemCount = expenseSublistCount
                    sublist = 'expense' 
                } 


                
                billCreditId = transformTransaction(searchResult, transactionObj, lineItemCount, sublist);


                  /**-------------------- for testing purpose only (start)------------------- */

                
                  for(var i = 0; i < lineItemCount; i++){


                let sublistFields = transactionObj.getSublistFields({
                    sublistId: sublist
                });

                    log.audit('sublistFields: ' +i, sublistFields);


            
                    // let amount = transactionObj.getSublistValue({
                    //     sublistId: sublist,
                    //     fieldId: 'grossamt', 
                    //     line: i
                    // });
        
                    // log.audit("amountttttt:: "+i,amount);

                    
                for(var j = 0; j < sublistFields.length ; j++){
                    
                    let x = transactionObj.getSublistValue({
                        sublistId: sublist,
                        fieldId: sublistFields[j],
                        line: i
                    });

                    log.audit('Sublist Field ID: ' + sublistFields[j]);
                    log.audit(`${i}`, `FieldId : ${sublistFields[j]} Value is ${x}`);
             
 
               }


                     }

                /**-------------------- for testing purpose only (end)------------------- */

              let  transactionObj2 = record.load({
                    type: transactionToUpdate,
                    id: searchResult.internalId,
                    isDynamic: false 
                });


              helper_lib.updateRemainingAmountOfBill(transactionObj2, searchResult.internalId, lineItemCount, sublist, searchResult.type);

               billStatus != 'paidInFull' ? helper_lib.clearTaxFields(transactionObj2, lineItemCount, sublist) : true


                transactionObj2.save({ enableSourcing: false, ignoreMandatoryFields: true });

                helper_lib.updateQueueStatus(billCreditId, searchResult, '')


                let script2 = runtime.getCurrentScript();
                log.audit({
                "title": "Governance Monitoring | start | internalID: "+searchResult.internalId,
                "details": "Remaining Usage = " + script2.getRemainingUsage()
                });



            } catch (e) {
                log.error("Error Catch : ", e)
                helper_lib.updateQueueStatus(billCreditId, searchResult, e.message)
                log.error("updateQueueStatus Catch : ")
            } finally {
                context.write({
                    key: context.key,
                    value: searchResult.soId
                });
            }


        }

        function summarize(summary) {

            log.debug('summarize yields : ', summary.yields);
            log.debug('summarize concurrency : ', summary.concurrency);
            log.debug('summarize usage : ', summary.usage);


        }


        function transformTransaction(tranData, billTransactionObj, billLineItemCount, billSublist) {

            try {
                log.debug("fromId : ", tranData.internalId);
                log.debug("paymentId : ", tranData.paymentId);

                let toType, fromType, creditFormType;
                let configurationRecordFields = helper_lib.getConfigurationRecordFields();
                let isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled;
        
                log.debug("isSuiteTaxEnabled: ", isSuiteTaxEnabled);

                if (tranData.type == 'bill') {
                    toType = 'vendorcredit'
                    fromType = 'vendorbill'
                    creditFormType = 'Bill Credit'
                } else if (tranData.type == 'invoice') {
                    toType = 'creditmemo'
                    fromType = 'invoice'
                    creditFormType = 'Credit Memo'
                }
 
                let transformRecordObj = record.transform({
                    fromType: fromType,
                    fromId: tranData.internalId,
                    toType: toType,
                    // isDynamic : true
                }); 

                log.debug("transformRecordObj : ", transformRecordObj);


                if(isSuiteTaxEnabled){ 

                    let taxDetailsLineCount = transformRecordObj.getLineCount('taxdetails');
                    log.debug("taxDetailsLineCount :: ", taxDetailsLineCount);

                    if(taxDetailsLineCount > 0){
                        //remove tax details tab lines
                        helper_lib.removeBillCreditLines(transformRecordObj, taxDetailsLineCount, 'taxdetails') 

                    }

                    let taxDetailsLineCountAfter = transformRecordObj.getLineCount('taxdetails');
                    log.debug("taxDetailsLineCountAfter :: ", taxDetailsLineCountAfter);
                } 

               

                let thaiTransactionForms = helper_lib.getFormId(toType);
                let billCreditForm = helper_lib.getValueByKey(creditFormType, thaiTransactionForms)                 
                log.debug("billCreditForm : ", billCreditForm);
           

             
           
                transformRecordObj.getField('customform') ? transformRecordObj.setValue('customform', billCreditForm) : false
                

                
                log.debug("tranData.date: ", tranData.date);

                let creditFormAfter = transformRecordObj.getValue("customform");

                log.debug("creditFormAfter: ", creditFormAfter);

            
                let billDate = helper_lib.convertToNetsuiteDateFormat(tranData.date)

                log.debug("billDate: ", billDate);

                tranData.date ? transformRecordObj.setText({
                    fieldId: 'trandate',
                    text: billDate
                }) : log.error("Error : Trandate not found on Bill Payment!")

                transformRecordObj.getField('custbody_wht_related_bill_pymnt') ? transformRecordObj.setValue('custbody_wht_related_bill_pymnt', tranData.paymentId) : false


                let itemSublistCount = transformRecordObj.getLineCount('item');
                let expenseSublistCount = transformRecordObj.getLineCount('expense');
                let sublist = 'item';
                let totalLines = 0;

                if (itemSublistCount > 0) {
                    totalLines = itemSublistCount
                }


                if (expenseSublistCount > 0) {
                    totalLines = expenseSublistCount
                    sublist = 'expense'
                }

                let taxLinesObj = {};
                let billLineNoObj = {};
                let vatTaxRateObj = {};
                let taxAmount;


                log.debug("sublist: ", sublist);
                log.debug("totalLines: ", totalLines);

 
                for (var i = 0; i < billLineItemCount; i++) {

                    let partialPayment = billTransactionObj.getSublistValue({
                        sublistId: billSublist,
                        fieldId: 'custcol_ps_wht_apply_partial_payments',
                        line: i
                    });

                    log.debug("partialPayment: ", partialPayment);


                    taxAmount = parseFloat(helper_lib.isNull(billTransactionObj.getSublistValue({
                        sublistId: billSublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                        line: i 
                    })));

                    let taxCode = billTransactionObj.getSublistValue({
                        sublistId: billSublist,
                        fieldId: 'custcol_ps_wht_tax_code',
                        line: i
                    });

                    log.debug("taxCode" + i, taxCode);

                    let vatTaxRate = 0 ;

                    if(isSuiteTaxEnabled){ 

                        vatTaxRate = billTransactionObj.getSublistValue({
                            sublistId: billSublist,
                            fieldId: 'custcol_ps_wht_related_vat_rate',
                            line: i
                        });
                     
                    }
                    else{

                        vatTaxRate = billTransactionObj.getSublistValue({
                            sublistId: billSublist,
                            fieldId: 'taxrate1',
                            line: i
                        });

                    }

           

                    log.debug("vatTaxRate" + i, vatTaxRate);

                    let lineNo = billTransactionObj.getSublistText({
                        sublistId: billSublist, 
                        fieldId: 'line',
                        line: i
                    });

                    log.debug("taxAmount" + i, taxAmount);

                    if (taxAmount > 0) {
                        taxLinesObj[lineNo] = taxAmount;
                        billLineNoObj[lineNo] = taxCode;
                        vatTaxRateObj[lineNo] = vatTaxRate;
                    }

                }  

                log.debug("taxLinesObj final: ", taxLinesObj);
                log.debug("billLineNoObj final: ", billLineNoObj);

                helper_lib.removeBillCreditLines(transformRecordObj, totalLines, sublist)

                // let testCount = transformRecordObj.getLineCount('item');

                // log.debug("testCount | after line removed: ", testCount);


                helper_lib.setBillCreditLines(transformRecordObj, tranData, billLineNoObj, taxLinesObj, isSuiteTaxEnabled, vatTaxRateObj)

                // testCount = transformRecordObj.getLineCount('item');

                // log.debug("testCount | after line set: ", testCount);

                helper_lib.reSelectApplyCheckboxToApplyCredit(transformRecordObj, tranData)

                log.debug("transformRecordObj after : ", transformRecordObj);

            //     // Logs for testing (to be removed) ------------>start
            //     transformRecordObj.selectLine({
            //         sublistId: 'item',
            //         line: 0 
            //     });

            //    let testAmount = transformRecordObj.getCurrentSublistValue('item','amount');
            //    log.debug("testAmount after : ", testAmount);

            //    let testRate = transformRecordObj.getCurrentSublistValue('item','rate');
            //    log.debug("testRate after : ", testRate);

            //    //------------------->end


                let transformedRecId = transformRecordObj.save({ enableSourcing: false, ignoreMandatoryFields: true });

                log.debug({
                    title: 'Bill Credit/Credit Memo Created',
                    details: 'Bill Credit/Credit Memo ID: ' + transformedRecId
                });

                return transformedRecId
            } catch (e) {
                log.error("Error in transformTransaction(): ", e)
            }


        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        }
    }
);
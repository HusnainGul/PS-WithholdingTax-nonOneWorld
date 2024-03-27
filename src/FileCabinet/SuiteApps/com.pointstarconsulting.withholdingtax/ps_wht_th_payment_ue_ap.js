/**
 * @NApiVersion 2.1 
 * @NScriptType UserEventScript
 */ 

define(['N/record', 'N/search', 'N/https','N/url','N/task', 'N/runtime', './lib/helper_lib', './lib/moment'],

    function( record, search, https ,url, task, runtime, helper_lib, moment) {


        function beforeLoad(context) { 
            try {
            if (context.newRecord.type == 'vendorpayment' && context.type === context.UserEventType.CREATE) {

                let vendorPaymentRecord = context.newRecord;

                const urlString = vendorPaymentRecord.getValue('entryformquerystring');
                const paramPairs = urlString.split('&'); 
                
                let billId = null;
                
                for (const paramPair of paramPairs) {
                    const [paramKey, paramValue] = paramPair.split('=');
                    if (paramKey === 'bill') {
                        billId = paramValue;
                        break; // Exit the loop once 'bill' parameter is found
                    }
                }
                
                log.debug("billId: ", billId);

                // if (billId){

                //     let billRecord = record.load({
                //         type: 'vendorbill',
                //         id: billId,
                //         isDynamic: true 
                //     });

                //     log.debug("vendorPaymentRecord.getFields(): ", vendorPaymentRecord.getFields());

    
                //     let whtCondition = billRecord.getValue('custbody_ps_wht_condition');
                //     log.debug("whtCondition: ", whtCondition);
    
                //     let subsidiaryBranch = billRecord.getValue('cseg_subs_branch');
                //     log.debug("subsidiaryBranch: ", subsidiaryBranch);

                //     // let currency = billRecord.getValue('currency');
                //     // log.debug("currency: ", currency);
    
                //     // vendorPaymentRecord.setValue('currency', currency)
                //     vendorPaymentRecord.setValue('custbody_ps_wht_condition', whtCondition)
                    
                //     subsidiaryBranch ? 
                //     vendorPaymentRecord.setValue('cseg_subs_branch', subsidiaryBranch)  : 
                //     vendorPaymentRecord.setValue('cseg_subs_branch', '') 

                //     log.debug("billRecord: ", billRecord);

                // }
               
            } 
            } 
            catch (e) {
                log.error("Error in beforeLoad!",e);   
            }
        }
 
        function afterSubmit(context) { 
 
            try { 

                var script = runtime.getCurrentScript();
                log.audit({
                "title": "Governance Monitoring | after-submit | start",
                "details": "Remaining Usage = " + script.getRemainingUsage()
                });

                let configurationRecordFields = helper_lib.getConfigurationRecordFields();
                let isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled; 
                
                if (context.newRecord.type == 'vendorpayment' && context.type === context.UserEventType.CREATE) {

                    log.debug("context.UserEventType.CREATE",context.UserEventType.CREATE);
    
                    let vendorPaymentId = context.newRecord.id;
                    let vendorPaymentRecord = context.newRecord;
                    let vendorBills = helper_lib.getBillOrInvoiceData(vendorPaymentId, 'vendorpayment', 'T')
                    let vendorBillsNontax = helper_lib.getBillOrInvoiceData(vendorPaymentId, 'vendorpayment', 'F')
                    let paymentFilingStatus = vendorPaymentRecord.getValue("custbody_ps_wht_filing_status");

                    
                    log.debug("paymentFilingStatus: ", paymentFilingStatus);

                    for (var i = 0; i < vendorBillsNontax.length; i++) {
        
                        log.debug("Processing Non-Tax Bills..");

                        log.debug("isSuiteTaxEnabled: ", isSuiteTaxEnabled);
                        log.debug("configurationRecordFields.custrecord_ps_wht_enable_undue_je: ", configurationRecordFields.custrecord_ps_wht_enable_undue_je);
    
                       // let pndCategory = helper_lib.getPndCategoryOptimized(vendorBillsNontax[i].internalid, 'vendorbill')
                        let undueTaxCode = configurationRecordFields.custrecord_ps_wht_undue_taxcode
                        let undueDebitAcc = configurationRecordFields.custrecord_ps_wht_undue_debit_account
                        let undueCreditAcc = helper_lib.getCreditAccountFromTaxCode(isSuiteTaxEnabled, undueTaxCode);
    
                        if(configurationRecordFields.custrecord_ps_wht_enable_undue_je){
                            
                            let vatTaxAmount = helper_lib.getVatAmountFromTransaction(isSuiteTaxEnabled, vendorBillsNontax[i].internalid, undueTaxCode );
    
                            if(vatTaxAmount>0){
                                let journalEntryId = helper_lib.createReversalJournalEntry(vendorBillsNontax[i], vatTaxAmount, vendorPaymentId, context.newRecord.type, undueDebitAcc, undueCreditAcc, vendorBillsNontax[i].internalid)
                                log.audit("journalEntryId: ", journalEntryId);   
                            }
    
                        }
                        
                        // let queueId = helper_lib.createQueueRecord(vendorBillsNontax[i], pndCategory)
                        // log.debug("queueId: ", queueId);
    
                    }


                    for (var i = 0; i < vendorBills.length; i++) {
        
                        log.debug("Processing Tax Bills..");

                        log.debug("isSuiteTaxEnabled: ", isSuiteTaxEnabled);
                        log.debug("configurationRecordFields.custrecord_ps_wht_enable_undue_je: ", configurationRecordFields.custrecord_ps_wht_enable_undue_je);
    
                        let pndCategory = helper_lib.getPndCategoryOptimized(vendorBills[i].internalid, 'vendorbill')
                        let undueTaxCode = configurationRecordFields.custrecord_ps_wht_undue_taxcode
                        let undueDebitAcc = configurationRecordFields.custrecord_ps_wht_undue_debit_account
                        let undueCreditAcc = helper_lib.getCreditAccountFromTaxCode(isSuiteTaxEnabled, undueTaxCode);
    
                        if(configurationRecordFields.custrecord_ps_wht_enable_undue_je){
                            
                            let vatTaxAmount = helper_lib.getVatAmountFromTransaction(isSuiteTaxEnabled, vendorBills[i].internalid, undueTaxCode );
    
                            if(vatTaxAmount>0){
                                let journalEntryId = helper_lib.createReversalJournalEntry(vendorBills[i], vatTaxAmount, vendorPaymentId, context.newRecord.type, undueDebitAcc, undueCreditAcc, vendorBills[i].internalid)
                                log.audit("journalEntryId: ", journalEntryId);   
                            }
    
                        }
                        
                        let queueId = helper_lib.createQueueRecord(vendorBills[i], pndCategory)
                        log.debug("queueId: ", queueId);

                        /** UPDATE 3rd-Dec-2024: saving filing status field on bill when payment saved.
                         * Made this changes when Musab needed filing status field on bill
                         * Reason : saved search join was not working
                         * --------->start
                         */

                        let billRecordObj = record.load({
                            type: "vendorbill",
                            id: vendorBills[i].internalid,
                            isDynamic: true 
                        });

                        billRecordObj.setValue({
                            fieldId: 'custbody_ps_wht_filing_status', 
                            value: paymentFilingStatus
                        });
            
                        var billRecordId = billRecordObj.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                        log.debug("billRecordId: ", billRecordId);

                        /**----------end */
    
                    }
    
                    var taskId = triggerDownload();
                    log.debug("taskId: ", taskId);
    
                    var script2 = runtime.getCurrentScript();
                    log.audit({
                    "title": "Governance Monitoring | after-submit | end",
                    "details": "Remaining Usage = " + script2.getRemainingUsage()
                    });
    
                }
    

            if (context.newRecord.type == 'check' && context.type === context.UserEventType.CREATE) {

                const checkRecordId = context.newRecord.id;
                const checkRecord = record.load({
                    type: 'check',
                    id: checkRecordId,
                    isDynamic: true
                });
                
                let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(checkRecord, 'item');
                let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(checkRecord, 'expense');

                log.debug("isWhtCodeExistInItemsSublist", isWhtCodeExistInItemsSublist);
                log.debug("isWhtCodeExistInExpenseSublist", isWhtCodeExistInExpenseSublist);
        
                const vatCodeOnTransaction = helper_lib.checkStandardVatTaxCodeOnTransaction(checkRecordId, 'check');
                log.debug("vatCodeOnTransaction: ", vatCodeOnTransaction);

                if (vatCodeOnTransaction && configurationRecordFields.custrecord_ps_wht_enable_undue_je) {
                    processCheckWithReversal(checkRecord, checkRecordId, isWhtCodeExistInItemsSublist, isWhtCodeExistInExpenseSublist, 'check', context, isSuiteTaxEnabled);
                } 
                else {
                    processCheckWithoutReversal(checkRecord, checkRecordId, isWhtCodeExistInItemsSublist, isWhtCodeExistInExpenseSublist, 'check', context, isSuiteTaxEnabled);
                }

            }

            // if (context.newRecord.type == 'check' && (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT)) {

            //     const checkRecordId = context.newRecord.id;
            //     const checkRecord = record.load({
            //         type: 'check',
            //         id: checkRecordId,
            //         isDynamic: true
            //     });

               
                
            //     let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(checkRecord, 'item');
            //     let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(checkRecord, 'expense');

            //     log.debug("isWhtCodeExistInItemsSublist", isWhtCodeExistInItemsSublist);
            //     log.debug("isWhtCodeExistInExpenseSublist", isWhtCodeExistInExpenseSublist);

                
            //     if((isWhtCodeExistInExpenseSublist) && (context.type === context.UserEventType.EDIT))
            //     {
                   
            //         let totalLines = checkRecord.getLineCount({ sublistId: 'expense'});

            //         if (totalLines>1)
            //         {
            //           checkRecord.removeLine({ sublistId: "expense", line: totalLines - 1});
            //         }
            //     }
            //     else if((isWhtCodeExistInItemsSublist) && (context.type === context.UserEventType.EDIT))
            //     {
            //              let TaxCodeItemArray = helper_lib.getAllThaiTaxCodes();
            //              let lineCount = checkRecord.getLineCount({ sublistId: 'item'});
            //              for (let line = lineCount - 1; line >= 0; line--) 
            //              {
            //                 log.debug("line", line);
            //                 const quantity = checkRecord.getSublistValue({sublistId:'item',fieldId: 'quantity', line });
            //                 const itemInternalId = checkRecord.getSublistValue({sublistId:'item',fieldId: 'item', line });
            //                 log.debug("itemInternalId", itemInternalId);

            //                 log.debug("itemInternalId Type", typeof itemInternalId);
            //                 if (!quantity) 
            //                 {
            //                    if(TaxCodeItemArray.indexOf(itemInternalId) !== -1)
            //                    {
            //                       checkRecord.removeLine({ sublistId: "item", line: line });
            //                    }
                               
            //                 }
            //              }
            //     }

        
            //     const vatCodeOnTransaction = helper_lib.checkStandardVatTaxCodeOnTransaction(checkRecordId, 'check');
            //     log.debug("vatCodeOnTransaction: ", vatCodeOnTransaction);

            //     if (vatCodeOnTransaction && configurationRecordFields.custrecord_ps_wht_enable_undue_je) {
            //             processCheckWithReversal(checkRecord, checkRecordId, isWhtCodeExistInItemsSublist, isWhtCodeExistInExpenseSublist, 'check', context, isSuiteTaxEnabled);
            //     } else {
            //         processCheckWithoutReversal(checkRecord, checkRecordId, isWhtCodeExistInItemsSublist, isWhtCodeExistInExpenseSublist, 'check', context, isSuiteTaxEnabled);
            //     }

            // }

            if (context.newRecord.type == 'vendorcredit' && context.type === context.UserEventType.CREATE) {

                log.audit("Vendor Credit...");

                let checkRecordId = context.newRecord.id;
                let checkRecord = record.load({
                    type: 'vendorcredit',
                    id: checkRecordId,
                    isDynamic: true 
                });

                let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(checkRecord, 'item');
                let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(checkRecord, 'expense');

                log.debug("isWhtCodeExistInItemsSublist", isWhtCodeExistInItemsSublist);
                log.debug("isWhtCodeExistInExpenseSublist", isWhtCodeExistInExpenseSublist);



                if (isWhtCodeExistInItemsSublist || isWhtCodeExistInExpenseSublist) {

                    let tranDate = checkRecord.getValue("trandate");
                    let billItemsLinesPayload = []; 
                    let billExpenseLinesPayload = [];
                    let reportData = '';

                    let itemSublistCount = checkRecord.getLineCount('item');
                    let expenseSublistCount = checkRecord.getLineCount('expense');

                    log.debug("itemSublistCount", itemSublistCount);
                    log.debug("expenseSublistCount", expenseSublistCount);


                    let pndCategory = helper_lib.getPndCategory(checkRecordId, 'vendorcredit')
                    let sequenceNo = helper_lib.getLastSequenceNo(tranDate, pndCategory)

                    if (itemSublistCount > 0) {

                        let payload = helper_lib.getTransactionLinesPayload(checkRecordId, checkRecord, 'item', context.newRecord.type);
                        billItemsLinesPayload.push(payload)

                        log.debug("billItemsLinesPayload::", billItemsLinesPayload);

                        reportData = billItemsLinesPayload;

                        checkRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(billItemsLinesPayload));

                        calculateTaxLineFieldsForSuitetaxEnabled(itemSublistCount, checkRecord,'item', billItemsLinesPayload, isSuiteTaxEnabled)
                        helper_lib.addTaxItemsToItemSublistOfCheckOrCashSale(checkRecord, itemSublistCount, 'vendorcredit', isSuiteTaxEnabled)

                    }

                    if (expenseSublistCount > 0) {

                        let payload = helper_lib.getTransactionLinesPayload(checkRecordId, checkRecord, 'expense', context.newRecord.type);
                        billExpenseLinesPayload.push(payload)

                        log.debug("billExpenseLinesPayload::", billExpenseLinesPayload);

                        reportData = billExpenseLinesPayload; 

                        checkRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(billExpenseLinesPayload));

                        calculateTaxLineFieldsForSuitetaxEnabled(expenseSublistCount, checkRecord,'expense', billExpenseLinesPayload, isSuiteTaxEnabled)
                        helper_lib.addTaxItemsToExpenseSublistOfCheck(checkRecord, expenseSublistCount, isSuiteTaxEnabled)

                    }

                    helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, checkRecordId, tranDate, checkRecord, 'vendorcredit', context.type)


                    let checkData = {
                        "CreditWht": checkRecordId,
                        "Status": "Done"
                    }

                    var queueId = helper_lib.updateDataInQueueRecord(sequenceNo, pndCategory, tranDate, reportData, checkData, 'vendorcredit');
                    log.debug("queueId: ", queueId);


                    let checkStatusId = checkRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

                    log.debug("checkStatusId: ", checkStatusId);


                }

            }

            } catch (e) {
                log.error("Error in afterSubmit!",e); 
            }         
        }

        function beforeSubmit(context) {

            try {
                
            log.debug('beforeSubmit')

            var script1 = runtime.getCurrentScript();
            log.audit({
            "title": "Governance Monitoring | before-submit | start",
            "details": "Remaining Usage = " + script1.getRemainingUsage()
            });
 
            if (context.newRecord.type == 'vendorpayment') {

                if (context.type === context.UserEventType.CREATE) {

                    let vendorPaymentRecord = context.newRecord;
                    let billItemsLinesPayload = [];
                    let billExpenseLinesPayload = [];
                    let finalPayload=[];
                    let paymentDate = vendorPaymentRecord.getValue('trandate');


                    var lineItemCount = vendorPaymentRecord.getLineCount({
                        sublistId: 'apply'
                    });


                    let entityId = vendorPaymentRecord.getValue('entity');
                    let account = vendorPaymentRecord.getValue('apacct');

                    log.audit("entityId ++",entityId);
                    log.audit("account ++",account);
                    let thaiTaxTransactions = helper_lib.getThaiTaxTransactions(entityId, ['VendBill','VendCred'], account)

                    //saved search bnegi..to linecount ko filter krlnge sirf tax codes k lye phr neche for k loop me ye wala line count of array use hogi


                    var whtTaxAmountItems = 0
                    var whtTaxAmountExpense = 0
                    let selectedBillsWithTaxCodes = []


                    log.debug('Before submit : linecount', lineItemCount);

                    for (var i = 0; i < lineItemCount; i++) {

                        let isChecked = vendorPaymentRecord.getSublistValue('apply', 'apply', i);
                        let currentBillId = vendorPaymentRecord.getSublistValue('apply', 'doc', i);


                        for(var j=0;j<=thaiTaxTransactions.length;j++){

                            if(currentBillId==thaiTaxTransactions[j]){

                                
                            //   log.audit("currentBillId", currentBillId)
                            //   log.audit("thaiTaxTransactions[j]"+i, thaiTaxTransactions[j])
                              

                                if (isChecked) {

                                    let transactionType = helper_lib.getTransactionType(currentBillId);
        
                                    log.debug('transactionType: ', transactionType);
         
                                    if (transactionType == 'VendBill') {
        
        
                                        var billRecord = record.load({
                                            type: 'vendorbill',
                                            id: currentBillId,
                                            isDynamic: true,
                                        }); 
        
                                        //record bill here and use in both places
        
                                        //checkIfWhtCodeExistOnTransaction is jesa ek new function bnana hai jisme lines k bjae header field use krni hai
                                        let isWhtCodeExist = helper_lib.checkIfWhtCodeExistBody(billRecord, 'vendorbill')
                   
                                        log.debug("isWhtCodeExist on transaction : ", isWhtCodeExist);
                                        isWhtCodeExist ? selectedBillsWithTaxCodes.push(currentBillId) : isWhtCodeExist
                                        
        
                                        billIdWithTaxCode = currentBillId;
        
                                        log.debug("in condition Checked and Vendor Bill");
        
                        
                                        let thaiTransactionForms = helper_lib.getFormId('vendorbill');
                                        let billForm = helper_lib.getValueByKey('Bill', thaiTransactionForms);
                                        log.debug("billForm : ", billForm);
                        
                                      
                                        billRecord.setValue('customform',billForm); 
                        
        
                                        let itemSublistCount = billRecord.getLineCount('item');
                                        let expenseSublistCount = billRecord.getLineCount('expense');
        
                                       
                                        whtTaxAmountItems =  itemSublistCount > 0 ? getAndSetBillPaymentAmount('item', billRecord, currentBillId, vendorPaymentRecord, i, finalPayload, whtTaxAmountItems) : 0;
                                        whtTaxAmountExpense = expenseSublistCount > 0 ? getAndSetBillPaymentAmount('expense', billRecord, currentBillId, vendorPaymentRecord, i, finalPayload, whtTaxAmountExpense) : 0;
        
    
                                        log.audit("billItemsLinesPayload",billItemsLinesPayload);
                                        log.audit("billExpenseLinesPayload",billExpenseLinesPayload);
                                        log.audit("finalPayload without credit",finalPayload);
        
                                    }
        
        
                                    if (transactionType == 'VendCred') {
        
                                        let creditRecordId = currentBillId;
        
                                        let creditAmount = vendorPaymentRecord.getSublistValue('apply', 'amount', i);
        
                                        log.debug('creditAmount: ', creditAmount);
         
                                        vendorPaymentRecord.setSublistValue('apply', 'amount', i, creditAmount);
        
                                        log.debug('amount set in payment..');
        
                                        let subsidiaryFld = helper_lib.getSubsidiary(vendorPaymentRecord);
                                        vendorPaymentRecord.setValue("subsidiary", subsidiaryFld);
        
                                        log.debug('subsidiary set in payment..');
        
                                      
                                        let creditRecord = record.load({
                                            type: 'vendorcredit',
                                            id: creditRecordId,
                                            isDynamic: true 
                                        });
        
                                        let creditPayload='';
        
                                        let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(creditRecord, 'item');
                                        let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(creditRecord, 'expense');
                        
                                        log.debug("isWhtCodeExistInItemsSublist credit", isWhtCodeExistInItemsSublist);
                                        log.debug("isWhtCodeExistInExpenseSublist credit", isWhtCodeExistInExpenseSublist);
        
                                        //Chnaged on26th January, Removing else-if due to multiple bill error in JK production
                                        //3 bills with item and 1 bill with expense sublist
        
                                        if(isWhtCodeExistInItemsSublist){
                                            let itemSublistCount = creditRecord.getLineCount('item');
                                            creditPayload = itemSublistCount > 0 ? helper_lib.getTransactionLinesPayload(creditRecordId, creditRecord, 'item', 'vendorcredit') : true
                                        }
                                        
                                        else if(isWhtCodeExistInExpenseSublist){
                                            let expenseSublistCount = creditRecord.getLineCount('expense');
                                            creditPayload = expenseSublistCount > 0 ? helper_lib.getTransactionLinesPayload(creditRecordId, creditRecord, 'expense', 'vendorcredit') : true
                                        } 
                                    
                                        finalPayload.push(creditPayload)
        
                                        log.audit("finalPayload with credit",finalPayload);
                                    }
        
                                }

                            }

                      

                    }
 
 
                    }


                    log.debug("billItemsLinesPayload final", billItemsLinesPayload)
                    log.debug("billExpenseLinesPayload final", billExpenseLinesPayload)


                    log.debug("finalPayload", finalPayload)

                    log.debug("whtTaxAmountItems", whtTaxAmountItems)
                    log.debug("whtTaxAmountExpense", whtTaxAmountExpense)
                    log.debug("finalTaxOfPayment", whtTaxAmountItems + whtTaxAmountExpense)
                    
                    vendorPaymentRecord.setValue('custbody_ps_wht_tax_amount_sum', whtTaxAmountItems + whtTaxAmountExpense)
                  

                    //setting Reference No and Wht Certificate Fields

                    log.debug("selectedBillsWithTaxCodes:", selectedBillsWithTaxCodes);

                    let currentBillId = null;

                    if (selectedBillsWithTaxCodes.length > 0) {
                        for (let i = 0; i < selectedBillsWithTaxCodes.length; i++) {
                            currentBillId = selectedBillsWithTaxCodes[i];
                            if (currentBillId !== null) {
                                break;
                            }
                        }
                    }


                   let pndCategory = helper_lib.getPndCategoryOptimized(currentBillId, 'vendorbill')
                   let sequenceNo = helper_lib.getLastSequenceNo(paymentDate, pndCategory)
                


                    helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, currentBillId, paymentDate, vendorPaymentRecord, 'vendorbill', context.type )

                    
                    
                    vendorPaymentRecord.setText('custbody_ps_wht_bill_lines_data', JSON.stringify(finalPayload))

                } else if (context.type === context.UserEventType.DELETE) {
                    var paymentObj = context.oldRecord;
                    var billPaymentId = paymentObj.id;
                    var isThaiTaxTransaction = paymentObj.getValue('custbody_ps_wht_is_thai_tax_trans'); 
                
                    log.debug('Bill Payment to be deleted', billPaymentId);
                
                    if (isThaiTaxTransaction === true) {
                        log.debug('Deleting Vendor Credit...');
                      
                        let billLinesData = JSON.parse(paymentObj.getValue('custbody_ps_wht_bill_lines_data'));
                        let relatedBillCredit = helper_lib.getRelatedBillCredit(billPaymentId, 'vendorbill');
                        log.debug("billLinesData", billLinesData);

                        for (var i = 0; i < relatedBillCredit.length; i++) {
                            log.debug("billLinesData[i]", JSON.stringify(billLinesData[i]));
                
                            helper_lib.reCalculateAndSetRemainingAmountOnBill(billPaymentId, relatedBillCredit[i].billId, billLinesData[i], 'vendorbill');
                
                            if (relatedBillCredit[i].billCreditId) {
                                helper_lib.deleteVendorCreditFromPayment(relatedBillCredit[i].billCreditId, 'vendorbill');
                            }
                        }
                    } 
                }
                else if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT) {
                    
                    var newRecord = context.newRecord;
                    var oldRecord = context.oldRecord;

                    var newPaymentDate = newRecord.getValue({ fieldId: 'trandate' });
                    var oldPaymentDate = oldRecord.getValue({ fieldId: 'trandate' });
                    let currentSequenceNo = oldRecord.getValue({ fieldId: 'custbody_ps_wht_sequence_no' });


                    log.debug('newPaymentDate', newPaymentDate)
                    log.debug('oldPaymentDate', oldPaymentDate)

                    const formattedNewDate = helper_lib.splitDate(newPaymentDate)
                    const formattedOldDate = helper_lib.splitDate(oldPaymentDate)

                    if (formattedNewDate.mm !== formattedOldDate.mm) {

                        log.debug("Updating sequence and certificate no...");

                        var lineItemCount = oldRecord.getLineCount({
                            sublistId: 'apply'
                        });

                        let billId;

                        for (var i = 0; i < lineItemCount; i++) {

                            let isChecked = oldRecord.getSublistValue('apply', 'apply', i);
                            let currentBillId = oldRecord.getSublistValue('apply', 'doc', i);
                            let currentTranType = oldRecord.getSublistValue('apply', 'trantype', i);
                            let isWhtCodeExist = false;

                            if (currentTranType != 'VendCred' && isChecked) {

                                isWhtCodeExist = helper_lib.checkIfWhtCodeExistOnTransaction(currentBillId, 'vendorbill')

                            }

                            if (isWhtCodeExist) {
                                billId = currentBillId;
                                break;
                            }

                            log.debug("isWhtCodeExist on transaction :: ", isWhtCodeExist);

                        }

                        log.debug("billId", billId); 

                        if (billId) {

                            let pndCategory = helper_lib.getPndCategory(billId, 'vendorbill')
                            let sequenceNo = helper_lib.getLastSequenceNo(newPaymentDate, pndCategory)

                            helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, billId, newPaymentDate, newRecord, 'vendorbill', context.type )

                            let relatedQueueId = helper_lib.getQueueId(currentSequenceNo, oldPaymentDate, pndCategory);
                            log.debug("relatedQueueId", relatedQueueId);


                            let splittedNewPaymentDate = helper_lib.splitDate(newPaymentDate)
                            let parsedPaymentDate = helper_lib.compileDate(splittedNewPaymentDate.mm, splittedNewPaymentDate.dd, splittedNewPaymentDate.yyyy)
                            let netsuiteFormatedPaymentDate = helper_lib.convertDateToNetSuiteFormat(parsedPaymentDate)

                            helper_lib.updateWhtTaxJobRecord(sequenceNo, netsuiteFormatedPaymentDate, relatedQueueId)
                        }


                    }
                }

            }

            if (context.newRecord.type == 'check') {

                if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT) {
                    var newRecord = context.newRecord;
                    var oldRecord = context.oldRecord;
                    let checkId = context.oldRecord.id;

                    var newPaymentDate = newRecord.getValue({ fieldId: 'trandate' });
                    var oldPaymentDate = oldRecord.getValue({ fieldId: 'trandate' });
                    let currentSequenceNo = oldRecord.getValue({ fieldId: 'custbody_ps_wht_sequence_no' });

                    log.debug('newPaymentDate', newPaymentDate)
                    log.debug('oldPaymentDate', oldPaymentDate)

                    const formattedNewDate = helper_lib.splitDate(newPaymentDate)
                    const formattedOldDate = helper_lib.splitDate(oldPaymentDate)


                    if (formattedNewDate.mm !== formattedOldDate.mm) {

                        log.debug("Updating sequence and certificate no...");


                        let pndCategory = helper_lib.getPndCategory(checkId, 'check')
                        let sequenceNo = helper_lib.getLastSequenceNo(newPaymentDate, pndCategory)


                        helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, checkId, newPaymentDate, newRecord, 'check', context.type )

                        let relatedQueueId = helper_lib.getQueueId(currentSequenceNo, oldPaymentDate, pndCategory);
                        log.debug("relatedQueueId", relatedQueueId);

                        let splittedNewPaymentDate = helper_lib.splitDate(newPaymentDate)
                        let parsedPaymentDate = helper_lib.compileDate(splittedNewPaymentDate.mm, splittedNewPaymentDate.dd, splittedNewPaymentDate.yyyy)

                        let netsuiteFormatedPaymentDate = helper_lib.convertDateToNetSuiteFormat(parsedPaymentDate)

                        log.debug("netsuiteFormatedPaymentDate: " + netsuiteFormatedPaymentDate);

                        helper_lib.updateWhtTaxJobRecord(sequenceNo, netsuiteFormatedPaymentDate, relatedQueueId)
                    }
                }

                var script2 = runtime.getCurrentScript();
                log.audit({
                "title": "Governance Monitoring | before-submit | end",
                "details": "Remaining Usage = " + script2.getRemainingUsage()
                });

            }

            } catch (e) {
                log.error("Error in beforeSubmit!",e);
            }

        }

        
        function calculateTaxLineFieldsForSuitetaxEnabled(sublistCount, transObj, sublist, linePayload, isSuiteTaxEnabled){

            log.debug("in calculateTaxLineFieldsForSuitetaxEnabled()");
          
            try {

                if(isSuiteTaxEnabled){

                    for (var i = 0; i < sublistCount; i++) {

                        let whtTaxRate =transObj.getSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_tax_rate', line: i });
                        let lineData = linePayload[0][i+1]
                        let grossAmount = lineData.amount //the reason gross amount is taken from payload is that we are not able to get gross amount in 2nd second 
                        log.debug("grossAmount"+i+":", grossAmount); 
              
                        if ((grossAmount == 0) || (!grossAmount)) { continue }
              
                        if (whtTaxRate) {
                            transObj.selectLine({sublistId: sublist ,line: i});
                            transObj.setCurrentSublistValue({sublistId: sublist,fieldId: 'custcol_ps_wht_tax_rate',value: parseFloat(whtTaxRate).toFixed(2)});
                            transObj.commitLine({sublistId: sublist});

                            log.debug("actualAmount:--" + i, grossAmount);
        
                            let taxAmount = (parseFloat(whtTaxRate) / 100) * grossAmount;
        
                            transObj.selectLine({sublistId: sublist ,line: i});
                            transObj.setCurrentSublistValue({sublistId: sublist,fieldId: 'custcol_ps_wht_net_amount',value: grossAmount - taxAmount});
                            transObj.commitLine({sublistId: sublist});

                            transObj.selectLine({sublistId: sublist ,line: i});
                            transObj.setCurrentSublistValue({sublistId: sublist,fieldId: 'custcol_ps_wht_tax_amount', value: taxAmount});
                            transObj.commitLine({sublistId: sublist});

                                   }    
                }

            }

                
                
            } catch (e) {
                log.error("Error in calculateTaxLineFieldsForSuitetaxEnabled()",e);  
            }

           

        }
         
        function processCheckWithReversal(checkRecord, checkRecordId, isWhtCodeExistInItemsSublist, isWhtCodeExistInExpenseSublist, recordType, context, isSuiteTaxEnabled ) {
          
            try {

            if (isWhtCodeExistInItemsSublist || isWhtCodeExistInExpenseSublist) {
               
                let tranDate = checkRecord.getValue("trandate");
                let billItemsLinesPayload = [];
                let billExpenseLinesPayload = [];
                let reportData = '';
                let taxAmount;

                let itemSublistCount = checkRecord.getLineCount('item');
                let expenseSublistCount = checkRecord.getLineCount('expense');

                log.debug("itemSublistCount", itemSublistCount);
                log.debug("expenseSublistCount", expenseSublistCount);

                if(itemSublistCount > 0) {
                    taxAmount = helper_lib.getWhtTaxAmountForVatLines(checkRecord, '', 'item')
                }
                else if (expenseSublistCount > 0){
                    taxAmount = helper_lib.getWhtTaxAmountForVatLines(checkRecord, '', 'expense')
                }

                log.debug("taxAmount: ", taxAmount);

                let data = {"internalid" : checkRecordId , "subsidiary" : checkRecord.getValue("subsidiary") };
                let journalEntryId =   helper_lib.createReversalJournalEntry(data, taxAmount, checkRecordId, recordType)
                journalEntryId ? checkRecord.setValue('custbody_ps_wht_ref_journal_entry', journalEntryId) : true


                let pndCategory = helper_lib.getPndCategory(checkRecordId, 'check')
                let sequenceNo = helper_lib.getLastSequenceNo(tranDate, pndCategory)

                if (itemSublistCount > 0) {

                    let payload = helper_lib.getTransactionLinesPayload(checkRecordId, checkRecord, 'item', recordType);
                    billItemsLinesPayload.push(payload)

                    log.debug("billItemsLinesPayload::", billItemsLinesPayload);

                    reportData = billItemsLinesPayload;
                    checkRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(billItemsLinesPayload));
                    helper_lib.addTaxItemsToItemSublistOfCheckOrCashSale(checkRecord, itemSublistCount, 'check', isSuiteTaxEnabled)
  
                }

                if (expenseSublistCount > 0) {

                    let payload = helper_lib.getTransactionLinesPayload(checkRecordId, checkRecord, 'expense', recordType);
                    billExpenseLinesPayload.push(payload)

                    log.debug("billExpenseLinesPayload::", billExpenseLinesPayload);

                    reportData = billExpenseLinesPayload;
                    checkRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(billExpenseLinesPayload));
                    helper_lib.addTaxItemsToExpenseSublistOfCheck(checkRecord, expenseSublistCount, isSuiteTaxEnabled)

                }

                helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, checkRecordId, tranDate, checkRecord, 'check', context.type )


                let checkData = {
                    "CheckId": checkRecordId,
                    "Status": "Done"
                }

                var queueId = helper_lib.updateDataInQueueRecord(sequenceNo, pndCategory, tranDate, reportData, checkData, 'check');
                log.debug("queueId: ", queueId);


                let checkStatusId = checkRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

                log.debug("checkStatusId: ", checkStatusId);


            }

            } 
            catch (e) {
                log.error("Error in processCheckWithReversal()",e); 
                }
        }
        
        function processCheckWithoutReversal(checkRecord, checkRecordId, isWhtCodeExistInItemsSublist, isWhtCodeExistInExpenseSublist, recordType, context, isSuiteTaxEnabled) {
         try{
            if (isWhtCodeExistInItemsSublist || isWhtCodeExistInExpenseSublist) {
               
                let tranDate = checkRecord.getValue("trandate");
                let billItemsLinesPayload = [];
                let billExpenseLinesPayload = [];
                let reportData = '';

                let itemSublistCount = checkRecord.getLineCount('item');
                let expenseSublistCount = checkRecord.getLineCount('expense');

                log.debug("itemSublistCount", itemSublistCount);
                log.debug("expenseSublistCount", expenseSublistCount);


                let pndCategory = helper_lib.getPndCategory(checkRecordId, 'check')
                let sequenceNo = helper_lib.getLastSequenceNo(tranDate, pndCategory)

                if (itemSublistCount > 0) {

                    let payload = helper_lib.getTransactionLinesPayload(checkRecordId, checkRecord, 'item', recordType);
                    billItemsLinesPayload.push(payload)

                    log.debug("billItemsLinesPayload::", billItemsLinesPayload);

                    reportData = billItemsLinesPayload;
                    checkRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(billItemsLinesPayload));
                    helper_lib.addTaxItemsToItemSublistOfCheckOrCashSale(checkRecord, itemSublistCount, 'check', isSuiteTaxEnabled)

                }

                if (expenseSublistCount > 0) {

                    let payload = helper_lib.getTransactionLinesPayload(checkRecordId, checkRecord, 'expense', recordType);
                    billExpenseLinesPayload.push(payload)

                    log.debug("billExpenseLinesPayload::", billExpenseLinesPayload);

                    reportData = billExpenseLinesPayload;
                    checkRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(billExpenseLinesPayload));
                    helper_lib.addTaxItemsToExpenseSublistOfCheck(checkRecord, expenseSublistCount, isSuiteTaxEnabled)

                }

                helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, checkRecordId, tranDate, checkRecord, 'check', context.type )


                let checkData = {
                    "CheckId": checkRecordId,
                    "Status": "Done"
                }

                var queueId = helper_lib.updateDataInQueueRecord(sequenceNo, pndCategory, tranDate, reportData, checkData, 'check');
                log.debug("queueId: ", queueId);


                let checkStatusId = checkRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

                log.debug("checkStatusId: ", checkStatusId);


            }
        } 
        catch (e) {
            log.error("Error in processCheckWithoutReversal()",e); 
            }
        }

        
        function triggerDownload() {
            try{
            var taskObj = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_ps_wht_mr_create_credit'
            });

            return taskObj.submit();
          }
            catch (e) {
                log.error("Error in triggerDownload()",e); 
                }

        }

        function getAndSetBillPaymentAmount(sublistType, billRecord, currentBillId, vendorPaymentRecord, i, finalPayload, whtTaxAmountItems) {
           try{
            let payload = helper_lib.getTransactionLinesPayload(currentBillId, billRecord, sublistType, 'bill');
            finalPayload.push(payload)

            log.debug("finalPayload::", finalPayload);

            let billPaymentAmount = helper_lib.getPaymentAmount(billRecord, 'vendorbill', sublistType);

            whtTaxAmountItems += helper_lib.getWhtTaxAmount(billRecord, 'vendorbill', sublistType);

            let billPaymentDiscount = vendorPaymentRecord.getSublistValue('apply', 'disc', i);

            log.debug('billPaymentAmount Final', billPaymentAmount);
            log.debug('whtTaxAmountItems Final', whtTaxAmountItems); 
            log.debug('billPaymentDiscount', billPaymentDiscount);

            let subsidiaryFld = helper_lib.getSubsidiary(vendorPaymentRecord);

            log.debug("finalPayload.lenght",finalPayload.length);

            vendorPaymentRecord.setValue("subsidiary", subsidiaryFld);

            if (billPaymentDiscount > 0) {
                vendorPaymentRecord.setSublistValue({
                    sublistId: 'apply',
                    fieldId: 'disc',
                    line: i,
                    value: billPaymentDiscount
                });
                billPaymentAmount -= billPaymentDiscount;
            }

            vendorPaymentRecord.setSublistValue({
                sublistId: 'apply',
                fieldId: 'amount',
                line: i,
                value: billPaymentAmount
            });

            return whtTaxAmountItems
        }
        catch (e) { 
            log.error("Error in getAndSetBillPaymentAmount()",e); 
            }
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit,
            beforeLoad : beforeLoad
        }


    } 


);
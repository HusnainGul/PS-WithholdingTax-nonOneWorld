/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search', 'N/task', 'N/runtime', './lib/helper_lib', './lib/moment'],

    function (record, search, task, runtime, helper_lib, moment) {


        function beforeLoad(context) {

            try {

                if (context.newRecord.type == 'customerpayment' && context.type === context.UserEventType.CREATE) {

                    let customerPaymentRecord = context.newRecord;


                    const urlString = customerPaymentRecord.getValue('entryformquerystring');
                    const paramPairs = urlString.split('&');

                    let invoiceId = null;

                    for (const paramPair of paramPairs) {
                        const [paramKey, paramValue] = paramPair.split('=');
                        if (paramKey === 'inv') {
                            invoiceId = paramValue;
                            break; // Exit the loop once 'bill' parameter is found
                        }
                    }

                    log.debug("invoiceId: ", invoiceId);

                    // if(invoiceId){

                    //     let invoiceRecord = record.load({
                    //         type: 'invoice',
                    //         id: invoiceId,
                    //         isDynamic: true
                    //     });

                    //     let whtCondition = invoiceRecord.getValue('custbody_ps_wht_condition');
                    //     log.debug("whtCondition: ", whtCondition);

                    //     let subsidiaryBranch = invoiceRecord.getValue('cseg_subs_branch');
                    //     log.debug("subsidiaryBranch: ", subsidiaryBranch);

                    //     // let form = customerPaymentRecord.getValue('customform');
                    //     // log.debug("form: ", form);

                    //     // customerPaymentRecord.setValue('customform',211);

                    //     // let form2 = customerPaymentRecord.getValue('customform');
                    //     // log.debug("form: ", form2);

                    //     // log.debug("getFields: ", customerPaymentRecord.getFields());

                    //     // customerPaymentRecord.setValue('custbody_ps_wht_condition', whtCondition)

                    //     // subsidiaryBranch ?
                    //     // customerPaymentRecord.setValue('cseg_subs_branch', subsidiaryBranch) :
                    //     // customerPaymentRecord.setValue('cseg_subs_branch', '')

                    // }


                }

            } catch (e) {
                log.error("Error in beforeLoad()", e);
            }
        }


        function afterSubmit(context) {

            log.audit("afterSubmit");

            try {

                let configurationRecordFields = helper_lib.getConfigurationRecordFields();
                let isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled;


                if (context.newRecord.type == 'customerpayment' && context.type === context.UserEventType.CREATE) {

                    let customerPaymentId = context.newRecord.id;
                    var customerPaymentRecord = context.newRecord;
                    let vendorBills = helper_lib.getBillOrInvoiceData(customerPaymentId, 'customerpayment', 'T')


                    for (var i = 0; i < vendorBills.length; i++) {

                        let pndCategory = helper_lib.getPndCategoryOptimized(vendorBills[i].internalid, 'invoice')

                        let queueId;
                        queueId = helper_lib.createQueueRecord(vendorBills[i], pndCategory)
                        log.debug("queueId: ", queueId);


                    }

                    var taskId = triggerDownload();
                    log.debug("taskId: ", taskId);

                }

                if (context.newRecord.type == 'cashsale' && context.type === context.UserEventType.CREATE) {

                    log.debug("cash sale after submit..");

                    const cashSaleRecordId = context.newRecord.id;
                    const cashSaleRecord = record.load({
                        type: 'cashsale',
                        id: cashSaleRecordId,
                        isDynamic: true //changed
                    });

                    const isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(cashSaleRecord, 'item');
                    log.debug("isWhtCodeExistInItemsSublist", isWhtCodeExistInItemsSublist);

                    const vatCodeOnTransaction = helper_lib.checkStandardVatTaxCodeOnTransaction(cashSaleRecordId, 'cashsale');
                    log.debug("vatCodeOnTransaction: ", vatCodeOnTransaction);


                    if (vatCodeOnTransaction && configurationRecordFields.custrecord_ps_wht_enable_undue_je) {

                        processCashSaleWithReversal(cashSaleRecord, cashSaleRecordId, 'cashsale', context, isSuiteTaxEnabled);


                    } else {
                        processCashSaleWithoutReversal(cashSaleRecord, cashSaleRecordId, isWhtCodeExistInItemsSublist, 'cashsale', context, isSuiteTaxEnabled);
                    }

                }

                if (context.newRecord.type == 'creditmemo' && context.type === context.UserEventType.CREATE) {

                    log.debug("credit memo sale after submit..");

                    const creditMemoId = context.newRecord.id;
                    const creditMemoRecord = record.load({
                        type: 'creditmemo',
                        id: creditMemoId,
                        isDynamic: true //changed to true
                    });

                    const isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(creditMemoRecord, 'item');
                    log.debug("isWhtCodeExistInItemsSublist", isWhtCodeExistInItemsSublist);

                    const vatCodeOnTransaction = helper_lib.checkStandardVatTaxCodeOnTransaction(creditMemoId, 'creditmemo');
                    log.debug("vatCodeOnTransaction: ", vatCodeOnTransaction);

                    if (vatCodeOnTransaction) {
                        // const reversalJournalFld = helper_lib.isReversalJournalChecked(vatCodeOnTransaction);
                        // log.debug("reversalJournalFld: ", reversalJournalFld);

                        // if (reversalJournalFld && isWhtCodeExistInItemsSublist) {
                        //     processCashSaleWithReversal(creditMemoRecord, creditMemoId, 'creditmemo', isSuiteTaxEnabled);
                        // }
                        // else if(!reversalJournalFld && isWhtCodeExistInItemsSublist){
                        //     processCashSaleWithoutReversal(creditMemoRecord, creditMemoId, isWhtCodeExistInItemsSublist, 'creditmemo');
                        // }

                        // processCashSaleWithReversal(creditMemoRecord, creditMemoId, 'creditmemo', isSuiteTaxEnabled); //not needed on credit memo

                    } else {
                        processCashSaleWithoutReversal(creditMemoRecord, creditMemoId, isWhtCodeExistInItemsSublist, 'creditmemo', context, isSuiteTaxEnabled);
                    }

                }

            } catch (e) {
                log.error("Error in afterSubmit!", e);
            }

        }

        function beforeSubmit(context) {

            try {

                if (context.newRecord.type == 'customerpayment') {

                    if (context.type === context.UserEventType.CREATE) {

                        let customerPaymentRecord = context.newRecord;
                        let invoiceItemsLinesPayload = [];
                        let invoiceExpenseLinesPayload = [];
                        let finalPayload = [];
                        let paymentDate = customerPaymentRecord.getValue('trandate');


                        var lineItemCount = customerPaymentRecord.getLineCount({
                            sublistId: 'apply'
                        });


                        let entityId = customerPaymentRecord.getValue('customer');
                        let account = customerPaymentRecord.getValue('aracct');

                        log.audit("entityId ++", entityId);
                        log.audit("account ++", account);
                        let thaiTaxTransactions = helper_lib.getThaiTaxTransactions(entityId, ['CustInvc', 'CustCred'], account)

                        let whtTaxAmountItems = 0
                        let whtTaxAmountExpense = 0
                        let selectedInvoicessWithTaxCodes = []

                        log.debug('Before submit : linecount', lineItemCount);

                        for (var i = 0; i < lineItemCount; i++) {

                            let isChecked = customerPaymentRecord.getSublistValue('apply', 'apply', i);
                            let currrentInvoiceId = customerPaymentRecord.getSublistValue('apply', 'doc', i);

                            for (var j = 0; j <= thaiTaxTransactions.length; j++) {

                                if (currrentInvoiceId === thaiTaxTransactions[j]) {


                                    log.audit("currrentInvoiceId", currrentInvoiceId)
                                    log.audit("thaiTaxTransactions[j]" + i, thaiTaxTransactions[j])


                                    if (isChecked) {

                                        let transactionType = helper_lib.getTransactionType(currrentInvoiceId);
                                        log.audit('transactionType: ', transactionType);


                                        if (transactionType === 'CustInvc') {

                                            var invoiceRecord = record.load({
                                                type: 'invoice',
                                                id: currrentInvoiceId,
                                                isDynamic: true,
                                            });

                                            // let isWhtCodeExist = helper_lib.checkIfWhtCodeExistOnTransaction(currrentInvoiceId, 'invoice')
                                            let isWhtCodeExist = helper_lib.checkIfWhtCodeExistBody(invoiceRecord, 'invoice')

                                            log.debug("isWhtCodeExist on transaction : ", isWhtCodeExist);
                                            isWhtCodeExist ? selectedInvoicessWithTaxCodes.push(currrentInvoiceId) : isWhtCodeExist

                                            billIdWithTaxCode = currrentInvoiceId;

                                            log.debug("in condition Checked and Invoice");


                                            let itemSublistCount = invoiceRecord.getLineCount('item');
                                            let expenseSublistCount = invoiceRecord.getLineCount('expense');

                                            whtTaxAmountItems = itemSublistCount > 0 ? getAndSetCustomerPaymentAmount('item', invoiceRecord, currrentInvoiceId, customerPaymentRecord, i, invoiceItemsLinesPayload, whtTaxAmountItems) : 0;
                                            whtTaxAmountExpense = expenseSublistCount > 0 ? getAndSetCustomerPaymentAmount('expense', invoiceRecord, currrentInvoiceId, customerPaymentRecord, i, invoiceExpenseLinesPayload, whtTaxAmountExpense) : 0;


                                            finalPayload = invoiceItemsLinesPayload.length > 0 ? invoiceItemsLinesPayload : invoiceExpenseLinesPayload

                                            log.audit("invoiceItemsLinesPayload", invoiceItemsLinesPayload);
                                            log.audit("invoiceExpenseLinesPayload", invoiceExpenseLinesPayload);
                                            log.audit("finalPayload without credit", finalPayload);

                                        }


                                    }

                                }
                            }


                        }


                        var lineItemCountCredit = customerPaymentRecord.getLineCount({
                            sublistId: 'credit'
                        });

                        log.debug('Before submit : linecountCredit', lineItemCountCredit);

                        for (var i = 0; i < lineItemCountCredit; i++) {

                            let isChecked = customerPaymentRecord.getSublistValue('credit', 'apply', i);
                            let currrentInvoiceId = customerPaymentRecord.getSublistValue('credit', 'doc', i);

                            if (isChecked) {


                                let transactionType = helper_lib.getTransactionType(currrentInvoiceId);

                                log.audit('transactionType: ', transactionType);

                                if (transactionType == 'CustCred') {


                                    let creditMemoId = currrentInvoiceId;

                                    let creditAmount = customerPaymentRecord.getSublistValue('credit', 'amount', i);

                                    log.debug('creditAmount: ', creditAmount);

                                    customerPaymentRecord.setSublistValue('credit', 'amount', i, creditAmount);

                                    log.debug('amount set in customer payment..');

                                    let creditMemoRecord = record.load({
                                        type: 'creditmemo',
                                        id: creditMemoId,
                                        isDynamic: true
                                    });

                                    let creditMemoPayload = '';

                                    let isWhtCodeExistInItemsSublist = helper_lib.checkIfWhtCodeExist(creditMemoRecord, 'item');
                                    let isWhtCodeExistInExpenseSublist = helper_lib.checkIfWhtCodeExist(creditMemoRecord, 'expense');

                                    log.debug("isWhtCodeExistInItemsSublist credit", isWhtCodeExistInItemsSublist);
                                    log.debug("isWhtCodeExistInExpenseSublist credit", isWhtCodeExistInExpenseSublist);


                                    if (isWhtCodeExistInItemsSublist) {
                                        let itemSublistCount = creditMemoRecord.getLineCount('item');
                                        creditMemoPayload = itemSublistCount > 0 ? helper_lib.getTransactionLinesPayload(creditMemoId, creditMemoRecord, 'item', 'creditmemo') : true
                                    } else if (isWhtCodeExistInExpenseSublist) {
                                        let expenseSublistCount = creditMemoRecord.getLineCount('expense');
                                        creditMemoPayload = expenseSublistCount > 0 ? helper_lib.getTransactionLinesPayload(creditMemoId, creditMemoRecord, 'expense', 'creditmemo') : true
                                    }

                                    finalPayload.push(creditMemoPayload)

                                    log.audit("finalPayload with credit memo", finalPayload);

                                }

                            }

                        }

                        log.debug("invoiceItemsLinesPayload final", invoiceItemsLinesPayload)
                        log.debug("invoiceExpenseLinesPayload final", invoiceExpenseLinesPayload)

                        log.debug("whtTaxAmountItems", whtTaxAmountItems)
                        log.debug("whtTaxAmountExpense", whtTaxAmountExpense)

                        customerPaymentRecord.setValue('custbody_ps_wht_tax_amount_sum', whtTaxAmountItems + whtTaxAmountExpense)


                        //setting Reference No and Wht Certificate Fields

                        log.debug("selectedInvoicessWithTaxCodes:", selectedInvoicessWithTaxCodes);

                        let currrentInvoiceId = null;

                        if (selectedInvoicessWithTaxCodes.length > 0) {
                            for (let i = 0; i < selectedInvoicessWithTaxCodes.length; i++) {
                                currrentInvoiceId = selectedInvoicessWithTaxCodes[i];
                                if (currrentInvoiceId !== null) {
                                    break;
                                }
                            }
                        }

                        let pndCategory = helper_lib.getPndCategory(currrentInvoiceId, 'invoice') || '';
                        let sequenceNo = helper_lib.getLastSequenceNo(paymentDate, pndCategory) || '';


                        helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, currrentInvoiceId, paymentDate, customerPaymentRecord, 'invoice', context.type)


                        log.audit("check");

                        customerPaymentRecord.setText('custbody_ps_wht_bill_lines_data', JSON.stringify(finalPayload))

                    } else if (context.type === context.UserEventType.DELETE) {

                        var paymentObj = context.oldRecord;
                        var customerPaymentId = paymentObj.id;
                        var isThaiTaxTransaction = paymentObj.getValue('custbody_ps_wht_is_thai_tax_trans');

                        log.debug('Customer Payment to be deleted', customerPaymentId);
                        log.debug('isThaiTaxTransaction', isThaiTaxTransaction);

                        if (isThaiTaxTransaction === true) {
                            log.debug('Deleting Credit Memo...');

                            let billLinesData = JSON.parse(paymentObj.getValue('custbody_ps_wht_bill_lines_data'));
                            log.debug('billLinesData', billLinesData);

                            let relatedBillCredit = helper_lib.getRelatedBillCredit(customerPaymentId, 'invoice')

                            for (var i = 0; i < relatedBillCredit.length; i++) {

                                helper_lib.reCalculateAndSetRemainingAmountOnBill(customerPaymentId, relatedBillCredit[i].billId, billLinesData[i], 'invoice');

                                if (relatedBillCredit[i].billCreditId) {
                                    helper_lib.deleteVendorCreditFromPayment(relatedBillCredit[i].billCreditId, 'invoice')
                                }

                            }

                        }


                    } else if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT) {
                        var newRecord = context.newRecord;
                        var oldRecord = context.oldRecord;

                        var newPaymentDate = newRecord.getValue({fieldId: 'trandate'});
                        var oldPaymentDate = oldRecord.getValue({fieldId: 'trandate'});
                        let currentSequenceNo = oldRecord.getValue({fieldId: 'custbody_ps_wht_sequence_no'});


                        log.debug('newPaymentDate', newPaymentDate)
                        log.debug('oldPaymentDate', oldPaymentDate)

                        const formattedNewDate = helper_lib.splitDate(newPaymentDate)
                        const formattedOldDate = helper_lib.splitDate(oldPaymentDate)

                        if (formattedNewDate.mm !== formattedOldDate.mm) {

                            log.debug("Updating sequence and certificate no...");

                            var lineItemCount = oldRecord.getLineCount({
                                sublistId: 'apply'
                            });

                            let invoiceID;

                            for (var i = 0; i < lineItemCount; i++) {

                                let isChecked = oldRecord.getSublistValue('apply', 'apply', i);
                                let currrentInvoiceId = oldRecord.getSublistValue('apply', 'doc', i);
                                let currentTranType = oldRecord.getSublistValue('apply', 'trantype', i);
                                let isWhtCodeExist = false;

                                if (currentTranType != 'CustCred' && isChecked) {

                                    isWhtCodeExist = helper_lib.checkIfWhtCodeExistOnTransaction(currrentInvoiceId, 'invoice')

                                }

                                if (isWhtCodeExist) {
                                    invoiceID = currrentInvoiceId;
                                    break;
                                }

                                log.debug("isWhtCodeExist on transaction :: ", isWhtCodeExist);

                            }

                            log.debug("invoiceID", invoiceID);

                            if (invoiceID) {

                                let pndCategory = helper_lib.getPndCategory(invoiceID, 'invoice')
                                let sequenceNo = helper_lib.getLastSequenceNo(newPaymentDate, pndCategory)

                                helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, invoiceID, newPaymentDate, newRecord, 'invoice', context.type)

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

                if (context.newRecord.type == 'cashsale') {

                    if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT) {
                        var newRecord = context.newRecord;
                        var oldRecord = context.oldRecord;
                        let cashSaleId = context.oldRecord.id;

                        var newPaymentDate = newRecord.getValue({fieldId: 'trandate'});
                        var oldPaymentDate = oldRecord.getValue({fieldId: 'trandate'});
                        let currentSequenceNo = oldRecord.getValue({fieldId: 'custbody_ps_wht_sequence_no'});

                        log.debug('newPaymentDate', newPaymentDate)
                        log.debug('oldPaymentDate', oldPaymentDate)

                        const formattedNewDate = helper_lib.splitDate(newPaymentDate)
                        const formattedOldDate = helper_lib.splitDate(oldPaymentDate)


                        if (formattedNewDate.mm !== formattedOldDate.mm) {

                            log.debug("Updating sequence and certificate no...");

                            let pndCategory = helper_lib.getPndCategory(cashSaleId, 'cashsale')
                            let sequenceNo = helper_lib.getLastSequenceNo(newPaymentDate, pndCategory)

                            helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, cashSaleId, newPaymentDate, newRecord, 'cashsale', context.type)

                            let relatedQueueId = helper_lib.getQueueId(currentSequenceNo, oldPaymentDate, pndCategory);
                            log.debug("relatedQueueId", relatedQueueId);

                            let splittedNewPaymentDate = helper_lib.splitDate(newPaymentDate)
                            let parsedPaymentDate = helper_lib.compileDate(splittedNewPaymentDate.mm, splittedNewPaymentDate.dd, splittedNewPaymentDate.yyyy)

                            let netsuiteFormatedPaymentDate = helper_lib.convertDateToNetSuiteFormat(parsedPaymentDate)

                            log.debug("netsuiteFormatedPaymentDate: " + netsuiteFormatedPaymentDate);

                            helper_lib.updateWhtTaxJobRecord(sequenceNo, netsuiteFormatedPaymentDate, relatedQueueId)
                        }
                    }

                }

            } catch (e) {
                log.error("Error in beforeSubmit()", e);
            }

        }


        function processCashSaleWithReversal(cashSaleRecord, cashSaleRecordId, recordType, context, isSuiteTaxEnabled) {

            try {

                const tranDate = cashSaleRecord.getValue("trandate");

                const itemSublistCount = cashSaleRecord.getLineCount('item');
                log.debug("itemSublistCount", itemSublistCount);

                let taxAmount = helper_lib.getWhtTaxAmountForVatLines(cashSaleRecord, '', 'item')
                log.debug("taxAmount: ", taxAmount);

                let data = {"internalid": cashSaleRecordId};
                let journalEntryId = helper_lib.createReversalJournalEntry(data, taxAmount, cashSaleRecordId, recordType)
                journalEntryId ? cashSaleRecord.setValue('custbody_ps_wht_ref_journal_entry', journalEntryId) : true

                if (itemSublistCount > 0) {
                    const invoiceItemsLinesPayload = [helper_lib.getTransactionLinesPayload(cashSaleRecordId, cashSaleRecord, 'item', recordType)];
                    log.debug("invoiceItemsLinesPayload::", invoiceItemsLinesPayload);

                    const reportData = invoiceItemsLinesPayload;
                    cashSaleRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(invoiceItemsLinesPayload));

                    calculateTaxLineFieldsForSuitetaxEnabled(itemSublistCount, cashSaleRecord, 'item', invoiceItemsLinesPayload, isSuiteTaxEnabled)

                    helper_lib.addTaxItemsToItemSublistOfCheckOrCashSale(cashSaleRecord, itemSublistCount, recordType, isSuiteTaxEnabled);

                    const pndCategory = '';
                    const sequenceNo = '';
                    const cashSaleData = {
                        "CashsaleId": cashSaleRecordId,
                        "Status": "Done"
                    };
                    const queueId = helper_lib.updateDataInQueueRecord(sequenceNo, pndCategory, tranDate, reportData, cashSaleData, recordType);
                    log.debug("queueId: ", queueId);

                    cashSaleRecord.setValue('undepfunds', 'T');
                    const cashSaleStatusId = cashSaleRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                    log.debug("cashSaleStatusId: ", cashSaleStatusId);
                }
            } catch (e) {
                log.error("Error in processCashSaleWithReversal()", e)
            }
        }


        function processCashSaleWithoutReversal(cashSaleRecord, cashSaleRecordId, isWhtCodeExistInItemsSublist, recordType, context, isSuiteTaxEnabled) {
            try {
                if (isWhtCodeExistInItemsSublist) {
                    const tranDate = cashSaleRecord.getValue("trandate");
                    const itemSublistCount = cashSaleRecord.getLineCount('item');
                    log.debug("itemSublistCount", itemSublistCount);

                    if (itemSublistCount > 0) {
                        const invoiceItemsLinesPayload = [helper_lib.getTransactionLinesPayload(cashSaleRecordId, cashSaleRecord, 'item', recordType)];
                        log.debug("invoiceItemsLinesPayload::", invoiceItemsLinesPayload);

                        const reportData = invoiceItemsLinesPayload;
                        cashSaleRecord.setValue('custbody_ps_wht_bill_lines_data', JSON.stringify(invoiceItemsLinesPayload));

                        calculateTaxLineFieldsForSuitetaxEnabled(itemSublistCount, cashSaleRecord, 'item', invoiceItemsLinesPayload, isSuiteTaxEnabled)

                        helper_lib.addTaxItemsToItemSublistOfCheckOrCashSale(cashSaleRecord, itemSublistCount, recordType, isSuiteTaxEnabled);

                        const pndCategory = helper_lib.getPndCategory(cashSaleRecordId, recordType);
                        const sequenceNo = helper_lib.getLastSequenceNo(tranDate, pndCategory);

                        helper_lib.calculateAndSetSequenceAndCertificateNo(sequenceNo, cashSaleRecordId, tranDate, cashSaleRecord, recordType, context.type);

                        const cashSaleData = {
                            "CashsaleId": cashSaleRecordId,
                            "Status": "Done"
                        };
                        const queueId = helper_lib.updateDataInQueueRecord(sequenceNo, pndCategory, tranDate, reportData, cashSaleData, recordType);
                        log.debug("queueId: ", queueId);

                        cashSaleRecord.setValue('undepfunds', 'T');
                        const cashSaleStatusId = cashSaleRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                        log.debug("cashSaleStatusId: ", cashSaleStatusId);
                    }
                }
            } catch (e) {
                log.error("Error in processCashSaleWithoutReversal()", e);
            }
        }

        function calculateTaxLineFieldsForSuitetaxEnabled(sublistCount, transObj, sublist, linePayload, isSuiteTaxEnabled) {

            log.debug("in calculateTaxLineFieldsForSuitetaxEnabled()");

            try {

                if (isSuiteTaxEnabled) {

                    for (var i = 0; i < sublistCount; i++) {

                        let whtTaxRate = transObj.getSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_tax_rate',
                            line: i
                        });
                        let lineData = linePayload[0][i + 1]
                        let grossAmount = lineData.amount //the reason gross amount is taken from payload is that we are not able to get gross amount in 2nd second 
                        log.debug("grossAmount" + i + ":", grossAmount);

                        if ((grossAmount == 0) || (!grossAmount)) {
                            continue
                        }

                        if (whtTaxRate) {
                            transObj.selectLine({sublistId: 'item', line: i});
                            transObj.setCurrentSublistValue({
                                sublistId: sublist,
                                fieldId: 'custcol_ps_wht_tax_rate',
                                value: parseFloat(whtTaxRate).toFixed(2)
                            });
                            transObj.commitLine({sublistId: sublist});

                            log.debug("actualAmount:--" + i, grossAmount);

                            let taxAmount = (parseFloat(whtTaxRate) / 100) * grossAmount;

                            transObj.selectLine({sublistId: 'item', line: i});
                            transObj.setCurrentSublistValue({
                                sublistId: sublist,
                                fieldId: 'custcol_ps_wht_net_amount',
                                value: grossAmount - taxAmount
                            });
                            transObj.commitLine({sublistId: sublist});

                            transObj.selectLine({sublistId: 'item', line: i});
                            transObj.setCurrentSublistValue({
                                sublistId: sublist,
                                fieldId: 'custcol_ps_wht_tax_amount',
                                value: taxAmount
                            });
                            transObj.commitLine({sublistId: sublist});

                        }
                    }

                }


            } catch (e) {
                log.error("Error in calculateTaxLineFieldsForSuitetaxEnabled()", e);
            }


        }


        function triggerDownload() {

            try {

                var taskObj = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_ps_wht_mr_create_credit'
                });

                return taskObj.submit();

            } catch (e) {
                log.error("Error in triggerDownload()", e);
            }
        }

        function getAndSetCustomerPaymentAmount(sublistType, invoiceRecord, currrentInvoiceId, customerPaymentRecord, i, invoiceItemsLinesPayload, whtTaxAmountItems) {

            try {

                let payload = helper_lib.getTransactionLinesPayload(currrentInvoiceId, invoiceRecord, sublistType, 'invoice');
                invoiceItemsLinesPayload.push(payload)

                log.debug("invoiceItemsLinesPayload::", invoiceItemsLinesPayload);

                let customerPaymentAmount = helper_lib.getPaymentAmount(invoiceRecord, 'invoice', sublistType);

                whtTaxAmountItems += helper_lib.getWhtTaxAmount(invoiceRecord, 'invoice', sublistType);


                let customerPaymentDiscount = customerPaymentRecord.getSublistValue('apply', 'disc', i);

                log.debug('customerPaymentAmount Final', customerPaymentAmount);
                log.debug('whtTaxAmountItems Final', whtTaxAmountItems);
                log.debug('customerPaymentDiscount', customerPaymentDiscount);

               if (customerPaymentDiscount > 0) {
                    log.debug("  if (customerPaymentDiscount > 0)", (customerPaymentDiscount > 0));
                    customerPaymentRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'disc',
                        line: i,
                        value: customerPaymentDiscount
                    });
                    customerPaymentAmount -= customerPaymentDiscount;
                }

                log.debug("line number : ", i);
                log.debug("customerPaymentAmount: ", customerPaymentAmount);
                log.debug("currrentInvoiceId: ", currrentInvoiceId);

                customerPaymentRecord.setSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    line: i,
                    value: customerPaymentAmount
                });

                return whtTaxAmountItems

            } catch (e) {
                log.error("Error in getAndSetCustomerPaymentAmount()", e);
            }


        }


        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit,
            beforeLoad: beforeLoad
        }


    }
);
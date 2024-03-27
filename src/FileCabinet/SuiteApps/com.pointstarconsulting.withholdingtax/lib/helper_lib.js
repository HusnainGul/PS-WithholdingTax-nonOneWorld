/**
 * @NApiVersion 2.1
 * @NModuleScope public
 * @description This file contains all the saved searches for the project.
 */

/** This code is tested with some new features and fixes after the demo to managment
 * This version is before the refactoring of code on 15thJune,2023
 */

/** Code after detach head issue resolved*/


define(['N/search', 'N/record', 'N/format', 'N/runtime', './lodash.js', '../moment.js', 'N/url', 'N/format/i18n', './data_search_lib', './constants_lib', 'N/ui/dialog'],
    function (search, record, format, runtime, _, moment, url, formati, search_lib, constant_lib, dialog) {

        let mapReduceScriptId = 'customscript_ps_wht_mr_create_credit'
        let taxJobRecordScriptId = 'customrecord_ps_tht_wht_job';
        let taxJobStatusField = 'custrecord_ps_wht_queue_status';
        let taxJobDataField = 'custrecord_ps_wht_vendor_credit_data';
        let taxJobCategoryField = 'custrecord_ps_wht_pnd_category';
        let whtTaxCodeFld = 'custcol_ps_wht_tax_code';
        let lineAmountFld = 'grossamt';
        let isApplyWhtPartialAmountFld = 'custcol_ps_wht_apply_partial_payments';
        let whtBillLineNoFld = 'custcol_ps_wht_bill_line_no';

        let defaultVatCode = "UNDEF-TH"

        /*-----------------------QA-----------------------*/
        // let journalEntryDebitAccount = 130; // QA : AR side
        // let journalEntryCreditAccount = 129; // QA : AR side
        // let jouralEntryProjectId = 2; // QA : AR side

        let journalEntryDebitAccount = 2085; // QA : AP side
        let journalEntryCreditAccount = 2086; // QA : AP side
        let jouralEntryProjectId = 4;  // QA : AP side

        let undueCodeAP = 102;  //'TH VAT:U-TH' //QA
        let undueCodeAR = 97; //'U-TH (old)' //QA


        /*-----------------------DEV-----------------------*/
        // let journalEntryDebitAccount = 136; // DEV : AR side
        // let journalEntryCreditAccount = 135; // DEV : AR side
        // let jouralEntryProjectId = 9; // DEV : AR side
        //  let undueCodeAP =  339;  //'TH VAT:U-TH' //DEV
        //  let undueCodeAR  = ''

        let rootFolder = 'SuiteApps/com.pointstarconsulting.withholdingtax/';


        function checkTaxCodeExpiry(whtTaxCode) {

            try {

                log.debug("in checkTaxCodeExpiry()");

                let taxCodeRecord = record.load({
                    type: 'customrecord_ps_tht_wht_tax_code',
                    id: whtTaxCode,
                    isDynamic: true
                });

                let validUntilDate = taxCodeRecord.getValue('custrecord_ps_wht_taxcode_valid_until')
                log.debug("validUntilDate", validUntilDate);

                let isExpired = false

                if (validUntilDate) {

                    let currentDate = moment().toDate();

                    log.debug("validUntilDate", validUntilDate);
                    log.debug("currentDate", currentDate);

                    isExpired = moment(currentDate).isAfter(validUntilDate);

                    log.debug("isExpired", isExpired);
                }

                return isExpired
            } catch (e) {
                log.error("Error in checkTaxCodeExpiry()", e);
            }

        }

        function getWhtConfigurationRecord() {
            try {
                let customrecord_ps_tht_wht_configurationSearchObj = search.create({
                    type: "customrecord_ps_tht_wht_configuration",
                    filters: [
                        ["custrecord_ps_wht_ispreferred", "is", "T"]
                    ],
                    columns: [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC
                        }),
                        "internalid",
                        "custrecord_ps_wht_cert_print_copies",
                        "custrecord_ps_wht_cert_no_format",
                        "custrecord_ps_wht_ispreferred"
                    ]
                });

                let results = customrecord_ps_tht_wht_configurationSearchObj.run().getRange({start: 0, end: 1000});

                let configRecordId;

                for (let i = 0; i < results.length; i++) {

                    let isPreferred = results[i].getValue({name: 'custrecord_ps_wht_ispreferred'});

                    log.debug('isPreferred: ', isPreferred);

                    if (isPreferred) {
                        configRecordId = results[i].getValue({name: 'internalid'});
                    }
                }


                log.debug('configRecordId: ', configRecordId);

                return configRecordId
            } catch (e) {
                log.error("Error in getWhtConfigurationRecord()", e.message);
            }

        }


        function convertToNetsuiteDateFormat(dateString) {

            try {

                const currentUser = runtime.getCurrentUser();

                const netsuiteDateFormat = currentUser.getPreference({name: 'DATEFORMAT'});

                log.debug("netsuiteDateFormat: ", netsuiteDateFormat);

                const parsedDate = format.parse({
                    value: dateString,
                    type: format.Type.DATE,
                    format: netsuiteDateFormat
                });

                const netsuiteDateString = format.format({value: parsedDate, type: format.Type.DATE});

                return netsuiteDateString;
            } catch (e) {
                log.error("Error in convertToNetsuiteDateFormat()", e)
            }
        }

        function createQueueRecord(data, pndCategory) {

            try {


                let queueRec = record.create({
                    type: taxJobRecordScriptId
                });

                queueRec.setValue({fieldId: taxJobStatusField, value: 'pending'});
                queueRec.setValue({fieldId: taxJobDataField, value: JSON.stringify(data)});
                queueRec.setValue({fieldId: taxJobCategoryField, value: pndCategory});


                return queueRec.save({enableSourcing: true, ignoreMandatoryFields: true});
            } catch (e) {
                log.error('Error::createQueueRecord', e);
            }


        }


        function calculateAndSetSequenceAndCertificateNo(sequenceNo, transactionId, transactionDate, transactionRecord, transactionType, contextType) {

            try {
                let transactionRecordWithTaxCode;
                let certificateNo = '';
                if (!!transactionId) {
                    transactionType === 'vendorbill' || transactionType === 'invoice' ?
                        transactionRecordWithTaxCode = record.load({
                            type: transactionType,
                            id: transactionId,
                            isDynamic: true
                        }) : transactionRecordWithTaxCode = transactionRecord;
                } else {
                    transactionRecordWithTaxCode = transactionRecord;
                }

                certificateNo = generateCertificateNo(transactionRecordWithTaxCode, transactionDate, sequenceNo, transactionType);
                log.debug("certificateNo: " + certificateNo);


                transactionRecord.setValue('custbody_ps_wht_sequence_no', sequenceNo);
                transactionRecord.setValue('custbody_ps_wht_certificate_no', certificateNo);

                log.audit("contextType: " + contextType);
                log.audit("sequenceNo: " + sequenceNo);
                log.audit("certificateNo: " + certificateNo);

                if ((sequenceNo || certificateNo) && contextType === 'create') {
                    transactionRecord.setValue('custbody_ps_wht_is_thai_tax_trans', true);
                }

            } catch (e) {
                log.error("Error in calculateAndSetSequenceAndCertificateNo", e.message);
            }


        }


        function getTransactionType(internalId) {

            try {

                let transactionSearchObj = search.create({
                    type: "transaction",
                    filters: [
                        ["internalid", "anyof", internalId]
                    ],
                    columns: [
                        "type"
                    ]
                });

                let results = transactionSearchObj.run().getRange({start: 0, end: 1000});

                let tranType;

                for (let i = 0; i < results.length; i++) {
                    tranType = results[i].getValue({name: 'type'});
                }

                log.debug("tranType: ", tranType);

                return tranType

            } catch (e) {
                log.error("Error in getTransactionType()", e);
            }

        }


        function getBillDate(billId) {


            let vendorbillSearchObj = search.create({
                type: "vendorbill",
                filters: [
                    ["type", "anyof", "VendBill"],
                    "AND", ["internalid", "anyof", billId]
                ],
                columns: [
                    "trandate"
                ]
            });
            let billDate;

            vendorbillSearchObj.run().each(function (result) {

                billDate = result.getValue("trandate")

                return true;

            });

            log.debug("billDate: ", billDate)

            return billDate

        }


        function formatDate(date) {
            if (!date) {
                return null;
            }

            try {
                return format.format({
                    type: format.Type.DATE,
                    value: date
                });
            } catch (e) {
                log.error({
                    title: 'Error formatting date',
                    details: e
                });

                return null;
            }
        }

        function parseDate(dateString) {
            let parts = dateString.split('/');
            if (parts.length !== 3) {
                log.error({
                    title: 'Error parsing date string',
                    details: 'Invalid date string: ' + dateString
                });
                return null;
            }

            let day = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1; // Months are zero-based in JavaScript Date object
            let year = parseInt(parts[2], 10);

            let dateObj = new Date(year, month, day);
            if (isNaN(dateObj)) {
                log.error({
                    title: 'Error parsing date string',
                    details: 'Invalid date string: ' + dateString
                });
                return null;
            }
            return dateObj;
        }


        function setBillPaymentAmount(rec) {
            let vendorPaymentRecord = rec


            let lineItemCount = vendorPaymentRecord.getLineCount({
                sublistId: 'apply'
            });

            log.debug('Before submit : linecount', lineItemCount);


            for (let i = 0; i < lineItemCount; i++) {

                let isChecked = vendorPaymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i
                });

                let currentBillId = vendorPaymentRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: i
                });

                if (isChecked) {

                    let billPaymentAmount = calculateBillPaymentAmount(currentBillId);

                    log.debug('billPaymentAmount Final', billPaymentAmount);

                    vendorPaymentRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        line: i,
                        value: billPaymentAmount
                    });
                }


            }

        }

        function calculateBillPaymentAmount(billId) {

            log.debug("helperLib : calculateBillPaymentAmount()");

            let billPaymentAmount = 0;

            let billRecord = record.load({
                type: record.Type.VENDOR_BILL,
                id: billId,
                isDynamic: true
            });

            let isPartialPayment = billRecord.getText('custbody_ps_wht_pay_partially')

            log.debug("billId: ", billId);

            log.debug("isPartialPayment: ", isPartialPayment);

            let lineItemCount = billRecord.getLineCount({
                sublistId: 'item'
            });

            for (let i = 0; i < lineItemCount; i++) {

                let amount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'grossamt',
                    line: i
                }));

                if (isPartialPayment == "F") {

                    let netAmount = parseFloat(isNull(billRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_net_amount',
                        line: i
                    })));

                    log.debug("netAmount : ", netAmount);

                    netAmount ? (billPaymentAmount = billPaymentAmount + netAmount) :
                        (billPaymentAmount = billPaymentAmount + amount)

                } else {
                    let partialAmount = parseFloat(billRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_wht_partial_payment_amount',
                        line: i
                    }));

                    let taxAmount = parseFloat(isNull(billRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                        line: i
                    })));

                    let remainingAmount = isNullReturnEmpty(billRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_remaining_amount',
                        line: i
                    }))


                    log.debug("partialAmount : ", partialAmount);
                    log.debug("taxAmount : ", taxAmount);
                    log.debug("amount : ", amount);

                    let amountDifference = partialAmount - taxAmount;

                    log.debug("amountDifference : ", amountDifference);

                    if (partialAmount) {
                        billPaymentAmount = billPaymentAmount + amountDifference
                    } else {
                        remainingAmount > 0 ?
                            (billPaymentAmount = billPaymentAmount + amount) : billPaymentAmount

                    }


                    log.debug("billPaymentAmount : ", billPaymentAmount);

                }


            }

            return billPaymentAmount

        }


        function getBillOrInvoiceData(paymentId, paymentType, isThaiTaxBills) {

            try {

                var isOneWorld = runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});


                log.debug("paymentId: ", paymentId);

                let type = (paymentType == 'vendorpayment') ? 'VendPymt' : (paymentType == 'customerpayment') ? 'CustPymt' : '';

                let columns = [
                    "appliedtotransaction",
                    "location",
                    "trandate",
                    "custbody_ps_wht_filing_status", 
                    "cseg_subs_branch",
                    "entity"
                ]

                isOneWorld ? columns.push("subsidiary") : true

                let vendorpaymentSearchObj = search.create({
                    type: paymentType,
                    filters: [
                        ["type", "anyof", type],
                        "AND", ["internalid", "anyof", paymentId],
                        "AND", ["mainline", "is", "F"],
                        "AND", ["appliedtotransaction.custbody_ps_wht_is_thai_tax_trans", "is", isThaiTaxBills]
                    ],
                    columns
                });

                let vendorBill = [];

                vendorpaymentSearchObj.run().each(function (result) {
                    log.debug("Id: ", result.getValue("appliedtotransaction"))
                    if (result.getValue("appliedtotransaction")) {
                        let type = '';
                        type = paymentType == 'customerpayment' ? 'invoice' : 'bill'
                        log.debug("vendorBill Id: ", result.getValue("appliedtotransaction"))
                        vendorBill.push({
                            type: type,
                            internalid: result.getValue("appliedtotransaction"),
                            trandate: result.getValue("trandate"),
                            location: result.getValue("location"),
                            paymentId: paymentId,
                            subsidiary: isOneWorld ? result.getValue("subsidiary") : "",
                            subsidiarybranch: result.getValue("cseg_subs_branch"),
                            filingstatus: result.getValue("custbody_ps_wht_filing_status"),
                            entity: result.getValue("entity"),

                        });

                    }
                    return true;

                });


                log.debug("vendorBill" + isThaiTaxBills + " before: ", vendorBill)

                vendorBill = _.chain(vendorBill)
                    .reject({'internalid': ''})
                    .uniqBy('internalid')
                    .value();

                log.debug("vendorBill" + isThaiTaxBills + " after: ", vendorBill)

                return vendorBill

            } catch (e) {
                log.error("Error in getBillOrInvoiceData()", e.message);
            }


        }


        function formatNumberWithCommas(number) {

            try {
                log.debug("helperLib : formatNumberWithCommas()");
                let decimalPlaces = 2;
                let numberString = parseFloat(number).toFixed(decimalPlaces);
                let parts = numberString.split(".");
                let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                let decimalPart = parts.length > 1 ? "." + parts[1] : "";
                return integerPart + decimalPart;
            } catch (e) {
                log.error("Error in formatNumberWithCommas()", e)
            }

        }

        function openRecInNewWindow(recType, recId) {
            try {

                let recordUrl = url.resolveRecord({recordType: recType, recordId: recId, isEditMode: false})
                window.open(recordUrl, '_blank');
            } catch (e) {
                log.error("Error in openRecInNewWindow()", e)
            }
        }

        function isNull(val) {
            if ((val != null) && (val != 'null') && (val != '') && (val != undefined) && (val != 'undefined') && (val != 'NaN') && (val != ' ') && (val)) return val;
            else return '0';
        }

        function isNullZero(val) {
            if ((val != null) && (val != 'null') && (val != '') && (val != undefined) && (val != 'undefined') && (val != 'NaN') && (val != ' ') && (val)) return val;
            else return 0;
        }


        function isNullReturnEmpty(val) {
            if ((val != null) && (val != 'null') && (val != undefined) && (val != 'undefined') && (val != 'NaN') && (val != ' ') && (val)) return val;
            else return '';
        }


        function isUndefined(val) {
            if ((val === '') || (val === 'undefined') || (val === undefined)) {
                return true
            } else {
                return false
            }

        }


        function getThaiTaxTransactions(entityId, types, account) {

            try {

                let type1 = types[0]
                let type2 = types[1]

                log.debug("type1", type1);
                log.debug("type2", type2);
                log.debug("account", account);

                var vendorbillSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["name", "anyof", entityId],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["type", "anyof", type1, type2],
                            "AND",
                            ["account", "anyof", account],
                            "AND",
                            ["custbody_ps_wht_is_thai_tax_trans", "is", "T"]
                        ],
                    columns:
                        [
                            "internalid"
                        ]
                });

                let vendorbillSearchResults = vendorbillSearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });


                let data = [];

                for (let i in vendorbillSearchResults) {
                    data.push(vendorbillSearchResults[i].getValue('internalid'))
                }

                log.audit("taxTransactions: ", data);

                return data

            } catch (e) {
                log.error("Error in getThaiTaxTransactions()", e);
            }
        }

        function getSubsidaryBranch(subsidiary) {

            log.debug("subsidiary in function", subsidiary)
            if (!subsidiary) {
                return
            }

            let customrecord_cseg_subs_branchSearchObj = search.create({
                type: "customrecord_cseg_subs_branch",
                filters: [
                    ["custrecord_ps_wht_subs_brn_filterby_subs", "anyof", subsidiary]
                ],
                columns: [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "internalid",
                        label: "Internal Id"
                    }),
                ]
            });

            let reportResults = customrecord_cseg_subs_branchSearchObj.run().getRange({
                start: 0,
                end: 1000
            });

            let internalId;
            let name;
            let data = [];

            for (let i in reportResults) {
                internalId = reportResults[i].getValue('internalid')
                name = reportResults[i].getValue('name')
                data.push({id: internalId, name: name})
            }

            log.debug("data: ", data)

            return data
        }

        function getRecordsList(type) {
            try {

                let customrecord_ps_tht_wht_categorySearchObj = search.create({
                    type: type,
                    filters: [],
                    columns: [
                        "internalid", "name"
                    ]
                });
                let reportResults = customrecord_ps_tht_wht_categorySearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });

                let internalId;
                let name;
                let data = [];

                log.debug("reportResults: " + type, reportResults)

                for (let i in reportResults) {
                    internalId = reportResults[i].getValue('internalid')
                    name = reportResults[i].getValue('name')
                    data.push({id: internalId, name: name})
                }

                log.debug("data: ", data)

                return data

            } catch (e) {
                log.debug("error: ", e.message)
                return [{id: '', name: ''}]
            }

        }


        function getTaxLineFieldValues(billRecord, i, sublist) {

            log.debug("helperLib : getTaxLineFieldValues()");


            //     let sublistFields = billRecord.getSublistFields({
            //     sublistId: sublist
            // });

            // log.audit('sublistFields: ' +i, sublistFields);

            // for(var j = 0; j < sublistFields.length ; j++){

            //     let x = billRecord.getSublistValue({
            //         sublistId: sublist,
            //         fieldId: sublistFields[j],
            //         line: i
            //     });

            //     log.audit('Sublist Field ID: ' + sublistFields[j]);
            //     log.audit(`${i}`, `FieldId : ${sublistFields[j]} Value is ${x}`);


            // }


            let standardTaxCode = billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'taxcode',
                line: i
            });

            let amount = parseFloat(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'amount',  //changed after before-vat calculation
                line: i
            }));

            log.audit("amountttttt:: " + i, amount);

            let grossamt = parseFloat(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'grossamt',  //changed after before vat calculation
                line: i
            }));

            log.audit("grossamt:: " + i, grossamt);


            let taxCode = billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_tax_code',
                line: i
            });

            let isPartialPayment = billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_apply_partial_payments',
                line: i
            });

            let item = billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'item',
                line: i
            });

            let partialAmount = parseFloat(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_wht_partial_payment_amount',
                line: i
            }));

            partialAmount ? partialAmount : partialAmount = 0


            let partialTaxAmount = parseFloat(isNull(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                line: i
            })));

            log.debug("getTaxLineFieldValues() partialTaxAmount :: ", partialTaxAmount);

            partialTaxAmount ? partialTaxAmount : partialTaxAmount = 0

            let netAmount = parseFloat(isNull(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_net_amount',
                line: i
            })));


            let taxAmount = parseFloat(isNull(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_tax_amount',
                line: i
            })));


            let currentRemainingAmount = isNullReturnEmpty(billRecord.getSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_remaining_amount',
                line: i
            }));


            log.audit("261 currentRemainingAmount", currentRemainingAmount);


            if (currentRemainingAmount) {
                let value = currentRemainingAmount.toString().replace(/,/g, "")
                currentRemainingAmount = parseFloat(value)
            }

            log.audit("273 currentRemainingAmount", currentRemainingAmount);


            let fields = {
                amount: amount,
                grossamt: grossamt,
                item: item,
                taxCode: taxCode,
                isPartialPayment: isPartialPayment,
                partialAmount: partialAmount,
                partialTaxAmount: partialTaxAmount,
                netAmount: netAmount,
                taxAmount: taxAmount,
                currentRemainingAmount: currentRemainingAmount,
                standardTaxCode: standardTaxCode
            }

            log.debug("taxLineFieldValues : ", fields);

            return fields

        }


        function updateBillPaymentAmountPartial(taxLineField, billPaymentAmount) {

            log.debug("helper_lib : updateBillPaymentAmountPartial()");

            let amountToAdd;

            !!taxLineField.taxCode ?
                amountToAdd = taxLineField.partialAmount - taxLineField.partialTaxAmount :
                amountToAdd = taxLineField.partialAmount

            log.debug("amountToAdd", amountToAdd);

            amountToAdd = taxLineField.currentRemainingAmount > 0 ? amountToAdd :
                isUndefined(taxLineField.currentRemainingAmount) ? amountToAdd : 0;

            log.debug("billPaymentAmount : ", billPaymentAmount);

            return amountToAdd

        }

        function updateBillPaymentAmountFull(taxLineField, billPaymentAmount) {

            log.debug("helper_lib : updateBillPaymentAmountFull()");

            log.debug("taxLineField.currentRemainingAmount", taxLineField.currentRemainingAmount);

            let amountToAdd;

            !!taxLineField.taxCode ? amountToAdd = taxLineField.netAmount :
                taxLineField.currentRemainingAmount === '' ? amountToAdd = taxLineField.grossamt :
                    billPaymentAmount = 0

            log.debug("amountToAdd", amountToAdd);

            amountToAdd = taxLineField.currentRemainingAmount > 0 ? amountToAdd :
                isUndefined(taxLineField.currentRemainingAmount) ? amountToAdd :
                    0;

            log.debug("updateBillPaymentAmountFull billPaymentAmount", billPaymentAmount);

            return amountToAdd

        }

        function calculateRemainingAmountFull(taxLineField) {

            log.debug("helperLib : calculateRemainingAmountFull()");

            let remainingAmount = 0;

            if (!!taxLineField.taxCode) {
                const {currentRemainingAmount, netAmount = 0, taxAmount = 0, amount = 0} = taxLineField;
                remainingAmount = currentRemainingAmount > 0 ?
                    currentRemainingAmount - netAmount - taxAmount :
                    currentRemainingAmount === '' ?
                        amount - netAmount - taxAmount :
                        currentRemainingAmount;
            }

            return remainingAmount
        }

        function calculateRemainingAmountPartial(taxLineField) {

            log.debug("helperLib : calculateRemainingAmountPartial()");

            let remainingAmount = 0;

            if (taxLineField.currentRemainingAmount > 0) {
                remainingAmount = taxLineField.currentRemainingAmount - taxLineField.partialAmount;
            } else if (taxLineField.currentRemainingAmount === '') {
                remainingAmount = taxLineField.grossamt - taxLineField.partialAmount;
            }


            return remainingAmount
        }

        function setRemainingAmountOnBill(billRecord, remainingAmount, i, sublist) {

            log.debug("helperLib : setRemainingAmountOnBill()");

            // billRecord.selectLine({
            //     sublistId: sublist,
            //     line: i
            // });

            remainingAmount < 0 ? remainingAmount = 0 : remainingAmount;

            // billRecord.setCurrentSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_remaining_amount', value: formatNumberWithCommas(remainingAmount) });


            // billRecord.commitLine({
            //     sublistId: sublist
            // });

            billRecord.setSublistValue({
                sublistId: sublist,
                fieldId: 'custcol_ps_wht_remaining_amount',
                value: formatNumberWithCommas(remainingAmount),
                line: i
            });


        }


        function clearTaxFields(billRecord, lineItemCount, sublist) {

            try {
                log.debug("helperLib : clearTaxFields()");

                for (let i = 0; i < lineItemCount; i++) {

                    // billRecord.selectLine({
                    //     sublistId: sublist,
                    //     line: i
                    // });

                    // billRecord.setCurrentSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_partial_wht_amount_new', value: '' });
                    // billRecord.setCurrentSublistValue({ sublistId: sublist, fieldId: 'custcol_wht_partial_payment_amount', value: '' });
                    // billRecord.setCurrentSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_net_amount', value: '' });
                    // billRecord.setCurrentSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_tax_amount', value: '' });
                    // billRecord.setCurrentSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_partial_net_amount', value: '' });

                    // billRecord.commitLine({
                    //     sublistId: sublist
                    // });


                    let applyPartialPayment = billRecord.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_apply_partial_payments',
                        line: i
                    });


                    if (applyPartialPayment) {

                        billRecord.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                            value: '',
                            line: i
                        });
                        billRecord.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_wht_partial_payment_amount',
                            value: '',
                            line: i
                        });
                        billRecord.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_net_amount',
                            value: '',
                            line: i
                        });
                        billRecord.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_tax_amount',
                            value: '',
                            line: i
                        });
                        billRecord.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_net_amount',
                            value: '',
                            line: i
                        });
                        billRecord.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: '',
                            line: i
                        });

                    }

                }

            } catch (e) {
                log.error("Error in clearTaxFields()", e);
            }

        }


        function clearLineFieldsOnCopyContextOfNewRecord(sublistId, sublistCount, newRecord) {

            try {

                log.debug("clearLineFieldsOnCopyContextOfNewRecord()");
                log.debug("sublistCount", sublistCount);
                log.debug("sublistId", sublistId);
                if (sublistCount > 0) {
                    for (let i = 0; i < sublistCount; i++) {
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_remaining_amount',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: isApplyWhtPartialAmountFld,
                            line: i,
                            value: false
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: whtTaxCodeFld,
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_tax_rate',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_net_amount',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_tax_amount',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_wht_partial_payment_amount',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                            line: i,
                            value: ''
                        });
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_partial_net_amount',
                            line: i,
                            value: ''
                        });
                    }
                }
            } catch (e) {
                log.error("Error in clearLineFieldsOnCopyContextOfNewRecord()", e);
            }
        }


        function getTransactionLinesPayload(tranId, transactionRecordObj, sublist, recordType) {

            try {

                log.debug("helperLib : getTransactionLinesPayload()");

                let payload = [];

                tranId ? payload.push({'type': recordType, 'createdFrom': tranId}) : tranId


                let lineItemCount = transactionRecordObj.getLineCount({
                    sublistId: sublist
                });

                for (let i = 0; i < lineItemCount; i++) {

                    let taxLineField = getTaxLineFieldValues(transactionRecordObj, i, sublist)

                    let data = {
                        sublist: sublist,
                        line: i,
                        'item': taxLineField.item,
                        'taxRate': taxLineField.taxRate,
                        'isPartialPayment': taxLineField.isPartialPayment,
                        'taxCode': taxLineField.taxCode,
                        'amount': taxLineField.amount, //sending gross amount in amount key for pnd reports
                        'currentRemainingAmount': taxLineField.currentRemainingAmount
                    }

                    if (!!taxLineField.taxCode) {
                        data.partialAmount = !!taxLineField.isPartialPayment ? taxLineField.partialAmount : null;
                        data.partialTaxAmount = !!taxLineField.isPartialPayment ? taxLineField.partialTaxAmount : null;
                        data.netAmount = !taxLineField.isPartialPayment ? taxLineField.netAmount : null;
                        data.taxAmount = !taxLineField.isPartialPayment ? taxLineField.taxAmount : null;
                    } else {
                        data.partialAmount = !!taxLineField.isPartialPayment ? taxLineField.partialAmount : null;
                    }

                    if (taxLineField.currentRemainingAmount !== 0) {
                        payload.push(data);
                    }


                }

                log.debug("payload: ", payload);

                return payload

            } catch (e) {
                log.error("Error in getTransactionLinesPayload()", e)
            }

        }


        function setBillPaymentHeaderFields(billRecord, vendorPaymentRecord, billLinesPayload, subsidiaryFld) {


            // let vendorBillFilingStatus = billRecord.getValue('custbody_ps_wht_filing_status')
            // let vendorBillSubsidiaryBranch = billRecord.getValue('cseg_subs_branch')
            // let vendorBillTaxPeriod = billRecord.getValue('custbody_ps_wht_tax_period')

            // vendorPaymentRecord.setText('custbody_ps_wht_bill_lines_data', JSON.stringify(billLinesPayload))
            //  vendorPaymentRecord.setValue('custbody_ps_wht_filing_status', vendorBillFilingStatus);
            //   vendorPaymentRecord.setValue('cseg_subs_branch', vendorBillSubsidiaryBranch);
            //    vendorPaymentRecord.setValue('custbody_ps_wht_tax_period', vendorBillTaxPeriod);
            // vendorPaymentRecord.setValue("custbody_ps_wht_tax_amount_sum", whtTaxAmount);

        }


        function getTaxCodeNameFormId(internalId) {

            let customrecord_ps_tht_wht_tax_codeSearchObj = search.create({
                type: "customrecord_ps_tht_wht_tax_code",
                filters: [
                    ["internalid", "anyof", internalId]
                ],
                columns: [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC
                    })
                ]
            });

            let taxCodeName;

            customrecord_ps_tht_wht_tax_codeSearchObj.run().each(function (result) {

                taxCodeName = result.getValue('name')

            });

            log.debug("taxCodeName: ", taxCodeName)

            return taxCodeName

        }

        function getItemId(taxCode, type) {

            try {

                let taxCodeName = getTaxCodeNameFormId(taxCode)
                let itemToSearch = ''


                log.debug("type::", type);


                if (type === 'invoice' || type === 'cashsale' || type === 'creditmemo') {
                    itemToSearch = 'AR-' + taxCodeName;
                } else if (type === 'bill' || type === 'check' || type === 'vendorcredit') {
                    itemToSearch = taxCodeName;
                }

                log.debug("tax Code::", taxCode);
                log.debug("itemToSearch::", itemToSearch);

                let itemSearchObj = search.create({
                    type: "item",
                    filters: [
                        ["name", "is", itemToSearch]
                    ],
                    columns: [
                        "internalid"
                    ]
                });

                let itemId;

                itemSearchObj.run().each(function (result) {

                    itemId = result.getValue('internalid')

                });

                log.debug("itemId: ", itemId)

                return itemId

            } catch (e) {
                log.error("Error in getItemId()", e.message);
            }

        }


        function updateQueueStatus(billCreditId, searchResult, exception) {

            try {

                log.debug("in updateQueueStatus | CreditId:", billCreditId);
                log.debug("searchResult:", searchResult);

                let reportData;
                let sequenceNo;
                let paymentDate;

                if (searchResult.type == "check") {

                    log.debug(" searchResult.type = check", searchResult.type == "check");

                    let checkRecord = record.load({type: 'check', id: searchResult.internalId, isDynamic: true});

                    paymentDate = checkRecord.getValue('trandate');
                    sequenceNo = checkRecord.getValue('custbody_ps_wht_sequence_no');
                    reportData = checkRecord.getValue('custbody_ps_wht_bill_lines_data');

                }

                if (searchResult.type == "bill" && searchResult.paymentId) {

                    let billPaymentRecord = record.load({
                        type: 'vendorpayment',
                        id: searchResult.paymentId,
                        isDynamic: true
                    });

                    paymentDate = billPaymentRecord.getValue('trandate');
                    sequenceNo = billPaymentRecord.getValue('custbody_ps_wht_sequence_no');
                    reportData = billPaymentRecord.getValue('custbody_ps_wht_bill_lines_data');

                }


                if (searchResult.type == "invoice" && searchResult.paymentId) {

                    let customerPayment = record.load({
                        type: 'customerpayment',
                        id: searchResult.paymentId,
                        isDynamic: true
                    });

                    paymentDate = customerPayment.getValue('trandate');
                    sequenceNo = customerPayment.getValue('custbody_ps_wht_sequence_no');
                    reportData = customerPayment.getValue('custbody_ps_wht_bill_lines_data');

                }

                if (!exception) {

                    log.debug(" if (!exception):");

                    let submitFields = {};
                    submitFields['custrecord_ps_wht_queue_status'] = 'Done';
                    submitFields['custrecord_ps_wht_report_data'] = reportData;
                    submitFields['custrecord_ps_wht_sequence_no'] = parseInt(sequenceNo);
                    submitFields['custrecord_ps_wht_payment_date'] = paymentDate;

                    log.debug(" searchResult.type", searchResult.type);


                    submitFields['custrecord_ps_wht_trans_type'] = searchResult.type;


                    let resultValue = JSON.stringify({
                        "BillId": searchResult.internalId,
                        "PaymentId": searchResult.paymentId,
                        "CreditId": billCreditId,
                        "Status": 'Done'
                    })

                    submitFields['custrecord_ps_wht_result'] = resultValue;


                    log.debug("submitFields", submitFields);

                    record.submitFields({
                        type: 'customrecord_ps_tht_wht_job',
                        id: searchResult.queueId,
                        values: submitFields,
                        options: {
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        }
                    });

                } else {

                    log.debug(" if (exception):");
                    let submitFields = {};
                    submitFields['custrecord_ps_wht_queue_status'] = 'Error';
                    submitFields['custrecord_ps_wht_report_data'] = reportData;
                    submitFields['custrecord_ps_wht_sequence_no'] = parseInt(sequenceNo);
                    submitFields['custrecord_ps_wht_payment_date'] = paymentDate;

                    log.debug(" searchResult.type", searchResult.type);


                    submitFields['custrecord_ps_wht_trans_type'] = searchResult.type;


                    log.debug("submitFields", submitFields);


                    let resultValue = JSON.stringify({
                        "BillId": searchResult.internalId,
                        "PaymentId": searchResult.paymentId,
                        "CreditId": exception,
                        "Status": 'Error'
                    })

                    submitFields['custrecord_ps_wht_result'] = resultValue;


                    log.debug("submitFields", submitFields);

                    record.submitFields({
                        type: 'customrecord_ps_tht_wht_job',
                        id: searchResult.queueId,
                        values: submitFields,
                        options: {
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        }
                    });
                }

            } catch (e) {
                log.error("Error in updateQueueStatus()", e)
            }

        }

        function getRecordsToProcess() {
            let finalResult = [];
            try {
                let queueSearch = search.create({
                    type: 'customrecord_ps_tht_wht_job',
                    columns: [
                        search.createColumn({name: "name", sort: search.Sort.DESC, label: "Name"}),
                        search.createColumn({name: "custrecord_ps_wht_vendor_credit_data", label: "Vendor Credit Data"})
                    ],
                    filters: [
                        ["custrecord_ps_wht_vendor_credit_data", "isnotempty", ""],
                        "AND", ["custrecord_ps_wht_queue_status", "is", "pending"]

                    ]
                });

                let results = queueSearch.run().getRange({start: 0, end: 1000});

                log.debug("Results : ", results);
                log.debug("Results lenght : ", results.length);

                for (let i = 0; i < results.length; i++) {
                    let data = results[i].getValue({name: 'custrecord_ps_wht_vendor_credit_data'});
                    data = JSON.parse(data);
                    log.debug("data: ", data);
                    finalResult.push({
                        queueId: results[i].id,
                        type: data.type,
                        internalId: data.internalid,
                        date: data.trandate,
                        location: data.location,
                        paymentId: data.paymentId,
                        entity: data.entity
                    });
                }

                log.debug('finalResult', finalResult);
                return finalResult;

            } catch (e) {
                log.error('Error::getRecordsToProcess', e);
            }

        }

        function removeBillCreditLines(billCreditRecord, totalLines, sublist) {

            try {

                log.debug("in removeBillCreditLines()");

                for (let i = totalLines - 1; i >= 0; i--) {

                    billCreditRecord.removeLine({
                        sublistId: sublist,
                        line: i,
                        ignoreRecalc: true
                    });

                }

            } catch (e) {
                log.error("Error in removeBillCreditLines()", e);
            }

        }


        function setBillCreditLines(billCreditRecord, billdata, billLineNoObj, taxLinesObj, isSuiteTaxEnabled, vatTaxRateObj) {


            try {

                let lineNo = 0;
                let taxCodeValue = ''

                log.debug("setBillCreditLines()")
                log.debug("billdata", billdata)
                log.debug("billLineNoObj", billLineNoObj)
                log.debug("taxLinesObj", taxLinesObj)
                log.debug("vatTaxRateObj", vatTaxRateObj);

                if (!isSuiteTaxEnabled) {
                    taxCodeValue = getDefaultVatCode()
                    log.debug("taxCodeValue", taxCodeValue)
                }


                for (const key in billLineNoObj) {
                    if (billLineNoObj.hasOwnProperty(key)) {

                        const taxCode = billLineNoObj[key];
                        const billLineNo = key;
                        const taxAmount = taxLinesObj[key];
                        const relVatRate = vatTaxRateObj[key];

                        // change
                        let itemToSet = ""
                        const taxCodeFieldObjToMap = {
                            invoice: 'custrecord_ps_wht_taxcode_ar_item',
                            cashsale: 'custrecord_ps_wht_taxcode_ar_item',
                            creditmemo: 'custrecord_ps_wht_taxcode_ar_item',
                            bill: 'custrecord_ps_wht_taxcode_ap_item',
                            check: 'custrecord_ps_wht_taxcode_ap_item',
                            vendorcredit: 'custrecord_ps_wht_taxcode_ap_item',
                        };


                        // change


                        if (taxCode) {


                            // change

                            let column = taxCodeFieldObjToMap[billdata.type];
                            itemToSet = search.lookupFields({
                                type: 'customrecord_ps_tht_wht_tax_code',
                                id: taxCode,
                                columns: [column]
                            })[column];


                            if (itemToSet.length == 0) {
                                continue
                            }

                            // change
                            log.debug("itemToSet: ", itemToSet)

                            billCreditRecord.insertLine({
                                sublistId: 'item',
                                line: lineNo,
                            });


                            billCreditRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: itemToSet[0].value,
                                line: lineNo,

                            })

                            billCreditRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_wht_bill_line_no',
                                value: billLineNo,
                                line: lineNo,
                            })


                            billCreditRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: taxAmount,
                                line: lineNo,
                            })

                            billCreditRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                value: taxAmount,
                                line: lineNo,
                            })

                            billCreditRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'grossamt',
                                value: taxAmount,
                                line: lineNo,
                            })


                            billCreditRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_wht_related_vat_rate',
                                value: relVatRate,
                                line: lineNo,
                            })


                            if (!isSuiteTaxEnabled && taxCodeValue) {
                                billCreditRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxcode',
                                    value: taxCodeValue,
                                    line: lineNo,
                                })
                            }


                            // billCreditRecord.commitLine({
                            //     sublistId: 'item'
                            //    });

                            log.debug("Credit Amnt" + lineNo, taxAmount);

                            lineNo++;
                        }
                    }
                }

            } catch (e) {
                log.error("Error in setBillCreditLines()", e)
            }

        }


        // function setCheckCreditLines(creditRecord, checkData, billLineNoObj, taxLinesObj) {


        //     log.debug("setCheckCreditLines()");

        //     log.debug("checkData.internalId", checkData.internalId);


        //     creditRecord.setValue({
        //         fieldId: 'entity',
        //         value: checkData.entity
        //     });


        //     let lineNo = 0;

        //     for (const key in billLineNoObj) {
        //         if (billLineNoObj.hasOwnProperty(key)) {

        //             const taxCode = billLineNoObj[key];
        //             const billLineNo = key;
        //             const taxAmount = taxLinesObj[key];


        //             if (taxCode) {

        //                 let itemToSet = getItemId(taxCode)

        //                 log.debug("itemToSet: ", itemToSet)

        //                 creditRecord.selectNewLine({
        //                     sublistId: 'item'
        //                 });

        //                 creditRecord.setCurrentSublistValue({
        //                     sublistId: 'item',
        //                     fieldId: 'item',
        //                     value: itemToSet,
        //                 })

        //                 creditRecord.setCurrentSublistValue({
        //                     sublistId: 'item',
        //                     fieldId: 'custcol_ps_wht_bill_line_no',
        //                     value: billLineNo,
        //                 })


        //                 creditRecord.setCurrentSublistValue({
        //                     sublistId: 'item',
        //                     fieldId: 'rate',
        //                     value: taxAmount,
        //                 })

        //                 creditRecord.setCurrentSublistValue({
        //                     sublistId: 'item',
        //                     fieldId: 'amount',
        //                     value: taxAmount,
        //                 })

        //                 creditRecord.commitLine({
        //                     sublistId: 'item'
        //                 });

        //                 log.debug("Credit Amnt" + lineNo, taxAmount);

        //                 lineNo++;
        //             }
        //         }
        //     }


        // }


        function reSelectApplyCheckboxToApplyCredit(billCreditRecord, billdata) {

            log.debug("reSelectApplyCheckboxToApplyCredit()");

            try {

                let applySublistLineCount = billCreditRecord.getLineCount({
                    sublistId: 'apply'
                });

                log.debug("applySublistLineCount", applySublistLineCount);

                for (let i = 0; i < applySublistLineCount; i++) {

                    let doc = billCreditRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'doc',
                        line: i
                    });


                    // log.debug("doc: "+i, doc);
                    // log.debug("billdata.internalId: "+i, billdata.internalId);


                    if (doc == billdata.internalId) {

                        log.debug("doc == billdata.internalId", doc == billdata.internalId);

                        billCreditRecord.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: false,
                            line: i
                        })

                        billCreditRecord.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true,
                            line: i
                        })

                        // break;

                    }

                }

            } catch (e) {
                log.error("Error in reSelectApplyCheckboxToApplyCredit()", e)
            }

        }


        function getSubsidiary(vendorPaymentRecord) {

            try {

                let subsidiary = vendorPaymentRecord.getValue({
                    fieldId: 'subsidiary'
                });
                log.debug('Subsidiary:', subsidiary);

                return subsidiary

            } catch (e) {
                log.error("Error in getSubsidiary", e);
            }
        }

        function getPaymentAmount(billRecord, type, sublist) {

            try {


                log.debug("getPaymentAmount() type :", type);

                let billPaymentAmount = 0;

                let lineItemCount = billRecord.getLineCount({
                    sublistId: sublist
                });

                for (let i = 0; i < lineItemCount; i++) {

                    let taxLineField = getTaxLineFieldValues(billRecord, i, sublist)

                    if (!!taxLineField.isPartialPayment) {

                        billPaymentAmount += updateBillPaymentAmountPartial(taxLineField, billPaymentAmount)

                    } else {
                        billPaymentAmount += updateBillPaymentAmountFull(taxLineField, billPaymentAmount)
                    }

                    log.debug("billPaymentAmount" + i, billPaymentAmount);

                }

                log.debug("billPaymentAmount returned: ", billPaymentAmount);

                return billPaymentAmount

            } catch (e) {
                log.error("Error in getPaymentAmount()", e)
            }


        }


        function getWhtTaxAmount(billRecord, type, sublist) {

            log.debug("in getWhtTaxAmount", type)

            let whtTaxAmount = 0

            let lineItemCount = billRecord.getLineCount({
                sublistId: sublist
            });

            for (let i = 0; i < lineItemCount; i++) {

                let taxLineField = getTaxLineFieldValues(billRecord, i, sublist)

                if (!!taxLineField.taxCode) {
                    const amount = !!taxLineField.isPartialPayment ? taxLineField.partialTaxAmount : taxLineField.taxAmount;
                    if (amount) {
                        whtTaxAmount += amount;
                    }
                }
            }

            return whtTaxAmount

        }


        function getVatAmountFromTransaction(isSuiteTaxEnabled, internalId, undueTaxCode) {
            try {

                log.debug("in getVatAmountFromTransaction() ");
                log.debug("undueTaxCode: ", undueTaxCode);

                if (isSuiteTaxEnabled) {

                    var vendorbillSearchObj = search.create({
                        type: "vendorbill",
                        filters:
                            [
                                ["type", "anyof", "VendBill"],
                                "AND",
                                ["internalid", "anyof", internalId],
                                "AND",
                                ["taxdetail.taxamount", "isnotempty", ""]
                            ],
                        columns:
                            [
                                "item",
                                search.createColumn({
                                    name: "linenumber",
                                    join: "taxDetail"
                                }),
                                search.createColumn({
                                    name: "taxcode",
                                    join: "taxDetail"
                                }),
                                search.createColumn({
                                    name: "taxrate",
                                    join: "taxDetail"
                                }),
                                search.createColumn({
                                    name: "taxfxamount",
                                    join: "taxDetail"
                                })
                            ]
                    });

                    let results = vendorbillSearchObj.run().getRange({start: 0, end: 1000});


                    log.debug("Results : ", results);
                    log.debug("Results lenght : ", results.length);

                    let taxAmount = 0

                    for (let i = 0; i < results.length; i++) {
                        let taxCode = results[i].getValue({name: "taxcode", join: "taxDetail"})
                        log.debug("taxCode : " + i, taxCode);
                        if (taxCode == undueTaxCode) {
                            let amt = parseFloat(isNull(results[i].getValue({name: "taxfxamount", join: "taxDetail"})))
                            taxAmount = taxAmount + amt
                        }
                    }

                    log.debug("taxAmount : ", taxAmount);

                    return taxAmount

                } else {


                    var vendorbillSearchObj = search.create({
                        type: "vendorbill",
                        filters:
                            [
                                ["type", "anyof", "VendBill"],
                                "AND",
                                ["internalid", "anyof", internalId],
                                "AND",
                                ["taxline", "is", "F"]
                            ],
                        columns:
                            [
                                "item",
                                search.createColumn({
                                    name: "internalid",
                                    join: "taxItem"
                                }),
                                search.createColumn({
                                    name: "name",
                                    join: "taxItem"
                                }),
                                search.createColumn({
                                    name: "rate",
                                    join: "taxItem"
                                }),
                                search.createColumn({
                                    name: "formulanumeric",
                                    formula: "{taxitem.rate} * {fxamount} / 100"
                                })
                            ]
                    });

                    let results = vendorbillSearchObj.run().getRange({start: 0, end: 1000});


                    log.debug("Results : ", results);
                    log.debug("Results lenght : ", results.length);

                    let taxAmount = 0

                    for (let i = 0; i < results.length; i++) {
                        let taxCode = results[i].getValue({name: "internalid", join: "taxItem"})
                        log.debug("taxCode : " + i, taxCode);
                        if (taxCode == undueTaxCode) {
                            let amt = Math.abs(parseFloat(isNull(results[i].getValue({name: "formulanumeric"}))));
                            log.debug("amt : " + i, amt);
                            taxAmount = taxAmount + amt
                        }
                    }

                    log.debug("taxAmount : ", taxAmount);

                    return taxAmount


                }

            } catch (e) {
                log.error("Error in getVatAmountFromTransaction()", e);
            }
        }

        function getWhtTaxAmountForVatLines(billRecord, type, sublist) {

            try {


                log.debug("in getWhtTaxAmountForVatLines", type)

                let whtTaxAmount = 0

                let lineItemCount = billRecord.getLineCount({
                    sublistId: sublist
                });

                for (let i = 0; i < lineItemCount; i++) {

                    let taxLineField = getTaxLineFieldValues(billRecord, i, sublist)

                    log.debug("taxLineField.standardTaxCode", taxLineField.standardTaxCode)

                    if (taxLineField.standardTaxCode == undueCodeAP || taxLineField.standardTaxCode == undueCodeAR) {
                        const amount = !!taxLineField.isPartialPayment ? taxLineField.partialTaxAmount : taxLineField.taxAmount;
                        if (amount) {
                            whtTaxAmount += amount;
                        }
                    }
                }

                return whtTaxAmount

            } catch (e) {
                log.error("Error in getWhtTaxAmountForVatLines()", e);
            }

        }

        function isPartialPaymentChecked(recordObj, sublist) {

            try {

                let applyPartialPayment = false;
                let lineItemCount = recordObj.getLineCount(sublist);

                if (lineItemCount > 0) {

                    for (let i = 0; i < lineItemCount; i++) {

                        applyPartialPayment = recordObj.getSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_apply_partial_payments',
                            line: i
                        });

                        log.debug("applyPartialPayment" + i, applyPartialPayment)
                        if (applyPartialPayment) {
                            break;
                        }
                    }

                }

                return applyPartialPayment

            } catch (e) {
                log.error("Error in isPartialPaymentChecked()", e);
            }

        }


        function isPartialAmountProvided(tranId, sublist, type) {

            try {

                console.log("type", type);
                console.log("tranId", tranId);

                let makePayment = true;

                let transactionObj = record.load({
                    type: type,
                    id: tranId,
                    isDynamic: true,
                });

                console.log("transactionObj", transactionObj);

                let totalLines = transactionObj.getLineCount({
                    sublistId: sublist
                });

                console.log("totalLines", totalLines)

                for (let i = 0; i < totalLines; i++) {

                    let partialPayment = transactionObj.getSublistValue(sublist, 'custcol_ps_wht_apply_partial_payments', i);
                    let partialPaymentAmount = (transactionObj.getSublistValue(sublist, 'custcol_wht_partial_payment_amount', i));
                    let remainingAmount = isNullReturnEmpty(transactionObj.getSublistValue(sublist, 'custcol_ps_wht_remaining_amount', i))

                    if (remainingAmount) {
                        let value = remainingAmount.toString().replace(/,/g, "")
                        remainingAmount = parseFloat(value)
                    }

                    if (partialPayment == true && remainingAmount > 0) {
                        if (partialPaymentAmount == null || partialPaymentAmount === '') {
                            makePayment = false
                            break;
                        }
                    }

                }

                console.log("makePayment", makePayment)

                return makePayment

            } catch (e) {
                log.error("Error in isPartialAmountProvided()", e)
            }

        }

        function calculateAndSetWhtFields(currentRec, sublistId, taxRate) {
            try {

                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_tax_rate',
                    value: parseFloat(taxRate).toFixed(2)
                });

                let netAmount = 0;

                // let grossAmnt = currentRec.getCurrentSublistValue({
                //     sublistId: sublistId,
                //     fieldId: 'grossamt',

                // });

                // log.debug("grossAmnt : ", grossAmnt)
                // console.log("grossAmnt : ", grossAmnt)

                // if (grossAmnt) {
                //     netAmount = grossAmnt
                // }
                // else {

                let amount = currentRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'amount',

                });

                let vatTaxAmount = isNullZero(currentRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'tax1amt'
                }));


                log.debug("amount : ", amount)
                console.log("amount : ", amount)

                log.debug("vatTaxAmount : ", vatTaxAmount)
                console.log("vatTaxAmount : ", vatTaxAmount)


                netAmount = amount

                log.debug("netAmount : ", netAmount)
                console.log("netAmount : ", netAmount)

                // }


                log.debug("netAmount : ", netAmount)
                console.log("netAmount : ", netAmount)

                let taxAmount = taxRate ? (parseFloat(taxRate) / 100) * netAmount : 0

                console.log("netAmount - taxAmount + vatTaxAmount", netAmount - taxAmount + vatTaxAmount);

                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_net_amount',
                    value: netAmount - taxAmount + vatTaxAmount
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_tax_amount',
                    value: taxAmount
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                    value: ''
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_wht_partial_payment_amount',
                    value: ''
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_net_amount',
                    value: ''
                });

                log.debug("taxAmount : ", taxAmount)

                log.debug("rate : ", parseFloat(taxRate))
            } catch (e) {
                log.error("Error in calculateAndSetWhtFields()", e);
            }
        }


        function clearPartialAmountFields(currentRec, sublistId) {

            try {
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                    value: ''
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                    value: ''
                });
                // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: isApplyWhtPartialAmountFld, value: false });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_wht_partial_payment_amount',
                    value: ''
                });
            } catch (e) {
                log.error("Error in clearPartialAmountFields()", e)
            }
        }

        function clearRateAndRemainingAmountFields(currentRec, sublistId) {

            currentRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', value: ''});
            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custcol_ps_wht_remaining_amount',
                value: ''
            });
        }

        function calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) {

            try {

                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_tax_rate',
                    value: parseFloat(taxRate).toFixed(2)
                });

                let partialAmount = (currentRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_wht_partial_payment_amount',

                }));

                let taxAmount = taxRate ? (parseFloat(taxRate) / 100) * partialAmount : 0
                // let vatTaxRate = (currentRec.getCurrentSublistValue({
                //     sublistId: sublistId,
                //     fieldId: 'taxrate1',

                // }));

                // console.log("vatTaxRate : ", vatTaxRate)

                // let vatTaxRateAmt = parseFloat(vatTaxRate.replace('%', ''));

                // console.log("vatTaxRateAmt : ", vatTaxRateAmt)

                // let denominator = 1 + (vatTaxRateAmt/100);

                // console.log("vatTaxRateAmt : ", vatTaxRateAmt)


                // let taxAmount = taxRate ?  (parseFloat(taxRate) / denominator * 100) * partialAmount : 0

                console.log("taxAmount : ", taxAmount)

                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                    value: taxAmount
                });
                // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount_nfm', value: parseFloat(taxAmount).toFixed(4) });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_net_amount',
                    value: ''
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_tax_amount',
                    value: ''
                });

                log.debug("taxAmount : ", taxAmount)
                log.debug("rate : ", parseFloat(taxRate))

            } catch (e) {
                log.error("Error in calculateAndSetWhtPartialPayment()", e);
            }

        }


        function getTaxPeriod(tranDate) {


            try {

                let splittedDate = splitDate(tranDate)
                let lastDayOfMonth = getLastDayOfMonth(splittedDate.mm)

                let startDate = compileDate(splittedDate.mm, '01', splittedDate.yyyy);
                let endDate = compileDate(splittedDate.mm, lastDayOfMonth, splittedDate.yyyy);

                console.log("startDate", startDate);
                console.log("endDate", endDate);

                let startDateNS = convertDateToNetSuiteFormat(startDate)
                let endDateNS = convertDateToNetSuiteFormat(endDate)


                console.log("startDateNS", startDateNS);
                console.log("endDateNS", endDateNS);


                let taxPeriodSearchObj = search.create({
                    type: "accountingperiod", //changed after field source of Tax Period field changed
                    filters: [
                        ["startdate", "on", startDateNS],
                        "AND", ["enddate", "on", endDateNS]
                    ],
                    columns: [
                        search.createColumn({name: "periodname", label: "Period Name"}),
                        search.createColumn({name: "internalid", label: "InternalId"}),
                    ]
                });

                let results = taxPeriodSearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });

                let periodName;
                let periodId;

                console.log("results", results);
                log.debug("results: " + type, results)

                for (let i in results) {
                    periodId = results[i].getValue('internalid')
                    periodName = results[i].getValue('periodname')
                }

                console.log("periodId", periodId);
                console.log("periodName", periodName);

                return periodId

            } catch (e) {
                log.error("Error in getTaxPeriod()", e)
            }

        }

        function clearWhtFields(currentRec, sublistId) {

            try {
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_net_amount',
                    value: ''
                });
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_tax_amount',
                    value: ''
                });

            } catch (e) {
                log.error("Error in clearWhtFields()", e);
            }
        }


        function setPartialAmountFields(currentRec, sublistId, taxRate, partialAmount) {

            log.debug('setPartialAmountFields()');

            let vatTaxRate = (currentRec.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'taxrate1',

            }));

            console.log("vatTaxRate : ", vatTaxRate)

            let denominator = 1 + (vatTaxRate / 100);

            console.log("denominator : ", denominator)

            console.log("taxRate : ", taxRate)

            let denominator1 = partialAmount / denominator;

            console.log("denominator1 : ", denominator1)

            let rateAmnt = parseFloat(taxRate.replace('%', ''));

            console.log("rateAmnt : ", rateAmnt)


            let denominator2 = denominator1 * (rateAmnt / 100)

            console.log("denominator2 : ", denominator2)


            let partialTaxAmount = taxRate ? parseFloat(denominator2) : 0
            // let partialTaxAmount = (parseFloat(taxRate) / 100) * partialAmount
            let partialNetAmount = partialAmount - partialTaxAmount


            log.debug("partialTaxAmount :: ", partialTaxAmount);


            if (taxRate) {
                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                    value: partialTaxAmount,
                });

                // currentRec.setCurrentSublistValue({
                //     sublistId: sublistId,
                //     fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                //     value: parseFloat(partialTaxAmount).toFixed(4),
                // });

                currentRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_ps_wht_partial_net_amount',
                    value: convertInToCurrency(parseFloat(partialNetAmount).toFixed(4)),
                });


                log.debug({title: 'taxRate:', details: parseFloat(taxRate)});
            }


            currentRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: isApplyWhtPartialAmountFld,
                value: true,
            });


        }


        function getTaxRate(taxCode) {

            try {

                let customrecord_ps_tht_wht_tax_codeSearchObj = search.create({
                    type: "customrecord_ps_tht_wht_tax_code",
                    filters: [
                        ["internalid", "anyof", taxCode]
                    ],
                    columns: [
                        "custrecord_ps_wht_taxcode_rate"
                    ]
                });


                let rate;

                customrecord_ps_tht_wht_tax_codeSearchObj.run().each(function (result) {

                    rate = result.getValue("custrecord_ps_wht_taxcode_rate");

                    return true;

                });

                log.debug("tax rate: ", rate);

                return rate

            } catch (e) {
                log.error("Error in getTaxRate()", e);
            }
        }

        function calculateRemainingBillAmount(billId, lineNo, whtRate, type, billExchangeRate) {

            log.debug("in calculateRemainingBillAmount()");
            log.debug("lineId", lineNo);
            log.debug("billExchangeRate", billExchangeRate);

            if (billId && lineNo && whtRate) {

                let searchType;

                let filters = [];

                if (type == 'bill') {
                    filters.push(["type", "anyof", "VendCred"], "AND", ["createdfrom.internalid", "anyof", billId])
                    searchType = 'vendorcredit'
                } else if (type == 'invoice') {
                    filters.push(["type", "anyof", "CustCred"], "AND", ["createdfrom.internalid", "anyof", billId])
                    searchType = 'creditmemo'
                }

                let vendorcreditSearchObj = search.create({
                    type: searchType,
                    filters,
                    columns: [
                        'type',
                        'tranid',
                        'amount',
                        'rate',
                        'fxrate',
                        'custcol_ps_wht_related_vat_rate',
                        whtBillLineNoFld
                    ]
                });

                let results = vendorcreditSearchObj.run().getRange({start: 0, end: 1000});

                log.debug("Results : ", results);

                let billPaymentAmount = 0;

                log.debug("Results lenght : ", results.length);

                for (let i = 0; i < results.length; i++) {

                    let billLineNo = results[i].getValue({name: whtBillLineNoFld});

                    log.debug(" billLineNo", billLineNo);

                    if (billLineNo == lineNo) {

                        log.debug("  if (billLineNo == lineNo) : ");

                        // let amount = parseFloat(billExchangeRate) == 1 ?
                        // parseFloat(results[i].getValue({ name: 'amount' })) :
                        // parseFloat(results[i].getValue({ name: 'fxrate' }))

                        let amount = parseFloat(results[i].getValue({name: 'fxrate'}))
                        let vatTaxRate = parseFloat(results[i].getValue({name: 'custcol_ps_wht_related_vat_rate'}))

                        log.debug("vatTaxRate" + i, vatTaxRate);
                        log.debug("amount" + i, Math.abs(amount));
                        log.debug("whtRate" + i, whtRate);

                        let denominator = 1 + (vatTaxRate / 100);
                        log.debug("denominator" + i, denominator);

                        // Use toFixed() method, but convert back to a number before adding to billPaymentAmount
                        let paymentAmount = Number(Math.abs(amount) * denominator / (whtRate / 100)).toFixed(2);
                        log.debug("paymentAmount" + i, paymentAmount); //1000

                        billPaymentAmount = billPaymentAmount + parseFloat(paymentAmount); // Convert to number here
                        log.debug("billPaymentAmount" + i, billPaymentAmount);
                    }

                }

                log.debug("billPaymentAmount : ", billPaymentAmount);


                let totalAmount = billPaymentAmount;

                return totalAmount

            } else {
                return 0
            }


        }


        function disableSublistColumn(currentRec, sublistId, columnFieldId) {
            let sublistName = currentRec.getSublist({sublistId: sublistId});
            let applyFieldColumn = sublistName.getColumn({fieldId: columnFieldId});
            applyFieldColumn.isDisabled = true;
        }


        function updateRemainingAmountOfBill(vendorBillRecord, vendorBillId, lineItemCount, sublist, type) {

            log.debug("in updateRemainingAmountOfBill");

            try {

                let noOfBillCredits = checkRelatedBillCredits(vendorBillId, type)
                let billExchangeRate = vendorBillRecord.getValue('exchangerate');
                let totalPartialPayment = 0

                for (let i = 0; i < lineItemCount; i++) {

                    // let amount = vendorBillRecord.getSublistValue({
                    //     sublistId: sublist,
                    //     fieldId: 'grossamt',
                    //     line: i
                    // });

                    // log.audit("amountttttt updateRemainingAmountOfBill():: "+i,amount);


                    let taxLineField = getTaxLineFieldValues(vendorBillRecord, i, sublist)
                    let remainingAmount;
                    let lineId = vendorBillRecord.getSublistValue(sublist, 'line', i);

                    if (taxLineField.taxCode) {

                        log.debug(" if (taxLineField.taxCode)");

                        let taxRate = getTaxRate(taxLineField.taxCode)
                        let processedAmount = calculateRemainingBillAmount(vendorBillId, lineId, parseFloat(taxRate), type, billExchangeRate) //changed i+1 to lineId
                        log.audit(" taxLineField.amount", taxLineField.amount);
                        log.audit(" processedAmount", processedAmount);

                        if (!!taxLineField.isPartialPayment) {
                            remainingAmount = taxLineField.grossamt - processedAmount;
                            // let beforeVatDifference = taxLineField.partialAmount - processedAmount;
                            // log.audit(" taxLineField.partialAmount", taxLineField.partialAmount);
                            // log.audit(" processedAmount", processedAmount);
                            // log.audit(" beforeVatDifference", beforeVatDifference);
                            // remainingAmount = taxLineField.grossamt - processedAmount - beforeVatDifference;
                        } else {
                            remainingAmount = taxLineField.amount - processedAmount;
                        }


                    } else {

                        log.debug(" !if (taxLineField.taxCode)");

                        if (!!taxLineField.isPartialPayment) {
                            log.debug(" !!taxLineField.isPartialPayment");
                            remainingAmount = calculateRemainingAmountPartial(taxLineField);
                        } else {
                            log.debug(" full payment");
                            remainingAmount = noOfBillCredits > 0 ? 0 : taxLineField.amount
                        }

                    }

                    remainingAmount = Number(remainingAmount.toFixed(2));

                    log.debug("remainingAmount" + i, remainingAmount);

                    remainingAmount = remainingAmount <= 0 ? 0 : remainingAmount;

                    setRemainingAmountOnBill(vendorBillRecord, remainingAmount, i, sublist)

                }

            } catch (e) {
                log.error("Error in updateRemainingAmountOfBill()", e)
            }
        }

        function checkRelatedBillCredits(internalId, type) {

            try {

                log.debug("in checkRelatedBillCredits()");

                let noOfBillCredits;
                let searchType;
                if (internalId) {

                    let filters = [];

                    if (type == 'bill') {
                        filters.push(["type", "anyof", "VendCred"], "AND", ["createdfrom.internalid", "anyof", internalId])
                        searchType = "vendorcredit"
                    } else if (type == 'invoice') {
                        filters.push(["type", "anyof", "CustCred"], "AND", ["createdfrom.internalid", "anyof", internalId])
                        searchType = "creditmemo"
                    }

                    log.debug("filters", filters);

                    let vendorcreditSearchObj = search.create({
                        type: searchType,
                        filters,
                        columns: [
                            "tranid"
                        ]
                    });

                    let results = vendorcreditSearchObj.run().getRange({start: 0, end: 1000});

                    (results.length > 0) ? noOfBillCredits = results.length : noOfBillCredits = 0;

                    log.debug("resultOfBillCredits: ", results);
                }

                log.debug("noOfBillCredits: ", noOfBillCredits);

                return noOfBillCredits

            } catch (e) {
                log.error("Error in checkRelatedBillCredits()", e)
            }


        }


        function ispnd3TransactionAvailable(subsidiary, subsidiaryBranchCode, taxPeriod, filingStatus) {

            console.log("subsidiary-" + subsidiary)
            console.log("subsidiaryBranchCode-" + subsidiaryBranchCode)
            console.log("taxPeriod-" + taxPeriod)
            console.log("filingStatus-" + filingStatus)

            var isOneWorld = runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});

            console.log("isOneWorld: " + isOneWorld)


            if (!subsidiary && isOneWorld) {
                alert("Please Select Subsidiary")
                return
            } else if (!subsidiaryBranchCode && isOneWorld) {

                alert("Please Select Subsidiary Branch")
                return
            } else if (!taxPeriod) {

                alert("Please Select WHT Period")
                return
            } else if (!filingStatus) {

                alert("Please Select Filing Status")
                return
            }

            let transactionSearchObj = search.create({
                type: "vendorpayment",
                filters: [
                    ["type", "anyof", "VendPymt"],
                    "AND", ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
                    "AND", ["subsidiary", "anyof", subsidiary],
                    "AND", ["custbody_ps_wht_filing_status", "anyof", filingStatus],
                    "AND", ["cseg_subs_branch", "anyof", subsidiaryBranchCode],
                    "AND", ["custbody_ps_wht_bill_lines_data", "isnotempty", ""],
                    "AND", ["mainline", "is", "F"]
                ],
                columns: [
                    search.createColumn({name: "trandate", label: "Date"}),
                    search.createColumn({name: "internalid", label: "InternalId"}),
                    search.createColumn({name: "custbody_ps_wht_bill_lines_data", label: "Bill Data"}),
                    search.createColumn({
                        name: "entityid",
                        join: "vendor",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "address",
                        join: "vendor",
                        label: "Address"
                    })
                ]
            });

            let postingData = transactionSearchObj.run();
            range = postingData.getRange(0, 999);
            let parseData = JSON.parse(JSON.stringify(range));

            console.log(parseData)

            if (parseData.length > 0) {

                if (ispnd3TransactionWithTaxCodeAvailable(subsidiary, subsidiaryBranchCode, taxPeriod, filingStatus)) {
                    return true
                } else {
                    return false
                }

            } else {
                alert("No Transaction Found")
                false
            }


        }


        function ispnd3TransactionWithTaxCodeAvailable(subsidiary, subsidiaryBranchCode, taxPeriod, filingStatus) {
            let vendorpaymentSearchObj = search.create({
                type: "vendorpayment",
                filters: [
                    ["type", "anyof", "VendPymt"],
                    "AND", ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
                    "AND", ["subsidiary", "anyof", subsidiary],
                    "AND", ["custbody_ps_wht_filing_status", "anyof", filingStatus],
                    "AND", ["cseg_subs_branch", "anyof", subsidiaryBranchCode],
                    "AND", ["custbody_ps_wht_bill_lines_data", "isnotempty", ""],
                    "AND", ["mainline", "is", "F"]
                ],
                columns: [
                    search.createColumn({name: "trandate", label: "Date"}),
                    search.createColumn({name: "internalid", label: "InternalId"}),
                    search.createColumn({name: "custbody_ps_wht_bill_lines_data", label: "Bill Data"}),
                    search.createColumn({
                        name: "entityid",
                        join: "vendor",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "address",
                        join: "vendor",
                        label: "Address"
                    })
                ]
            });

            let postingData = vendorpaymentSearchObj.run();
            range = postingData.getRange(0, 999);
            let parseData = JSON.parse(JSON.stringify(range));

            console.log(parseData)

            if (parseData.length > 0) {
                return true
            } else {
                alert("No Transaction Found")
                false
            }

        }

        function getRelatedBillCredit(billPaymentId, type) {

            try {


                let searchType = ''
                let filterType = ''

                if (type == 'invoice') {
                    searchType = 'creditmemo'
                    filterType = 'CustCred'
                } else if (type == 'vendorbill') {
                    searchType = 'vendorcredit'
                    filterType = 'VendCred'
                }

                log.debug("searchType ", searchType);
                log.debug("filterType ", filterType);

                let vendorcreditSearchObj = search.create({
                    type: searchType,
                    filters: [
                        ["type", "anyof", filterType],
                        "AND", ["custbody_wht_related_bill_pymnt", "anyof", billPaymentId],
                        "AND", ["mainline", "is", "T"]
                    ],
                    columns: [
                        "internalid",
                        "createdfrom"
                    ]
                });

                log.debug("vendorcreditSearchObj ", vendorcreditSearchObj);

                var searchResultCount = vendorcreditSearchObj.runPaged().count;
                log.debug("searchResultCount ", searchResultCount);

                let data = [];

                vendorcreditSearchObj.run().each(function (result) {

                    data.push({
                        billCreditId: result.getValue("internalid"),
                        billId: result.getValue("createdfrom"),
                    })
                    return true;

                });

                log.debug("Related Bill Credit Id: ", data);

                return data

            } catch (e) {
                log.error("Error in getRelatedBillCredit()", e);
            }

        }

        function extractNumberFromPndCategory(string) {
            // Use a regular expression to match the number at the end of the string
            const match = string.match(/\d+$/);

            // If a match is found, return the matched number as a string
            if (match) {
                return match[0];
            }

            // Otherwise, return null
            return null;
        }


        function getWhtCategory(taxCode) {

            let customrecord_ps_tht_wht_tax_codeSearchObj = search.create({
                type: "customrecord_ps_tht_wht_tax_code",
                filters: [
                    ["internalid", "anyof", taxCode]
                ],
                columns: [
                    "custrecord_ps_wht_taxcode_category"
                ]
            });


            let results = customrecord_ps_tht_wht_tax_codeSearchObj.run().getRange({start: 0, end: 1000});

            let category;

            for (let i = 0; i < results.length; i++) {
                category = results[i].getText({name: 'custrecord_ps_wht_taxcode_category'});
            }

            log.debug("category: ", category);
            let pndNumber = extractNumberFromPndCategory(category)

            log.debug("pndNumber: ", pndNumber);

            return pndNumber


        }


        function getBillTaxCode(billRecord, tranType) {

            log.debug("getBillTaxCode()");
            log.debug("tranType", tranType);
            log.debug("billRecord", billRecord);

            let taxCode;

            let itemLinesCount = billRecord.getLineCount('item');
            let expenseLinesCount = billRecord.getLineCount('expense');
            let totalLines = 0;
            let sublist;

            if (itemLinesCount > 0) {
                totalLines = itemLinesCount
                sublist = 'item'
            } else if (expenseLinesCount > 0) {
                totalLines = expenseLinesCount
                sublist = 'expense'
            }

            log.debug("totalLines", totalLines);

            for (let i = 0; i < totalLines; i++) {

                log.debug(" i", i);

                let whtTaxCode = billRecord.getSublistValue(sublist, whtTaxCodeFld, i);

                if (whtTaxCode) {
                    taxCode = whtTaxCode
                    log.debug("taxCode : ", taxCode);
                    return taxCode
                }

            }

            log.debug("taxCode : ", taxCode);

            return taxCode

        }


        function checkIfWhtCodeExist(billRecord, sublist) {

            try {

                let taxCodeApplied = false;

                let totalLines = billRecord.getLineCount({
                    sublistId: sublist
                });

                for (let i = 0; i < totalLines; i++) {

                    let whtTaxCode = billRecord.getSublistValue(sublist, whtTaxCodeFld, i);

                    if (whtTaxCode) {
                        taxCodeApplied = true

                        return taxCodeApplied
                    }

                }

                log.debug("taxCodeApplied : ", taxCodeApplied);

                return taxCodeApplied

            } catch (e) {
                log.error("Error in checkIfWhtCodeExist()", e);
            }

        }


        function checkIfWhtCodeExistBody(billRecord, sublist) {

            try {

                let taxCodeApplied = billRecord.getValue("custbody_ps_wht_is_thai_tax_trans");
                log.debug("taxCodeApplied", taxCodeApplied);

                return taxCodeApplied

            } catch (e) {
                log.error("Error in checkIfWhtCodeExistBody()", e);
            }

        }


        function getBillPaymentDataForBillData(subsidiary, subsidiaryBranchCode, taxPeriod, filingStatus) {
            let attachmentArray = []

            let vendorpaymentSearchObj = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "VendPymt", "Check"],
                    "AND", ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
                    // "AND", ["subsidiary", "anyof", subsidiary],
                    "AND", ["custbody_ps_wht_filing_status", "anyof", filingStatus],
                    "AND", ["cseg_subs_branch", "anyof", subsidiaryBranchCode],
                    "AND", ["custbody_ps_wht_bill_lines_data", "isnotempty", ""],
                    "AND", ["mainline", "is", "F"]
                ],
                columns: [

                    search.createColumn({name: "custbody_ps_wht_bill_lines_data", label: "Bill Data"}),
                    search.createColumn({name: "internalid", label: "InternalId"}),
                ]
            });

            let searchResultCount = vendorpaymentSearchObj.runPaged().count;

            vendorpaymentSearchObj.run().each(function (searchItem) {

                let searchObj = {}
                searchObj.billData = searchItem.getValue({"name": "custbody_ps_wht_bill_lines_data"});
                searchObj.internalid = searchItem.getValue({"name": "internalid"});

                attachmentArray.push(searchObj)
                return true;
            });
            log.debug("attachmentArray", attachmentArray)

            return attachmentArray

        }


        function checkIfWhtCodeExistOnTransaction(internalId, type) {

            try {

                log.debug(" checkIfWhtCodeExistOnTransaction()");
                log.debug(" internalId", internalId);
                log.debug(" type", type);


                let transObj = record.load({
                    type: type,
                    id: internalId,
                    isDynamic: true
                });

                let taxCodeApplied = false;

                let itemsSublistCount = transObj.getLineCount({
                    sublistId: 'item'
                });

                let expenseSublistCount = transObj.getLineCount({
                    sublistId: 'expense'
                });


                let taxCodeOnItemsSublist = itemsSublistCount > 0 ? checkIfWhtCodeExist(transObj, 'item') : false
                let taxCodeOnExpenseSublist = expenseSublistCount > 0 ? checkIfWhtCodeExist(transObj, 'expense') : false


                if (taxCodeOnItemsSublist || taxCodeOnExpenseSublist) {
                    taxCodeApplied = true
                }

                log.debug("taxCodeApplied : ", taxCodeApplied);

                return taxCodeApplied

            } catch (e) {
                log.error("Error in checkIfWhtCodeExistOnTransaction()", e);
            }

        }


        function getPndCategoryOptimized(internalId, type) {

            log.debug("getPndCategoryOptimized | internalId", internalId);

            try {

                if (internalId) {

                    var transactionSearchObj = search.create({
                        type: "transaction",
                        filters:
                            [
                                ["internalid", "anyof", internalId],
                                "AND",
                                ["mainline", "is", "F"],
                                "AND",
                                ["custcol_ps_wht_tax_code", "noneof", "@NONE@"]
                            ],
                        columns:
                            [
                                "item",
                                "custcol_ps_wht_tax_code",
                                search.createColumn({
                                    name: "custrecord_ps_wht_taxcode_category",
                                    join: "CUSTCOL_PS_WHT_TAX_CODE"
                                })
                            ]
                    });


                    var searchResultCount = transactionSearchObj.runPaged().count;
                    log.debug("searchResultCount ", searchResultCount);

                    log.debug("transactionSearchObj ", transactionSearchObj);

                    let pndCategory = ''

                    transactionSearchObj.run().each(function (result) {

                        if (result.getValue({
                            name: "custrecord_ps_wht_taxcode_category",
                            join: "CUSTCOL_PS_WHT_TAX_CODE"
                        })) {
                            pndCategory = result.getValue({
                                name: "custrecord_ps_wht_taxcode_category",
                                join: "CUSTCOL_PS_WHT_TAX_CODE"
                            })
                            return
                        }

                    });

                    log.debug('pndCategory: ', pndCategory);


                    return pndCategory


                }


            } catch (e) {
                log.error("Error in getPndCategoryOptimized()", e.message);
            }

        }


        function getPndCategory(internalId, type) {
            log.debug("getPndCategory | internalId", internalId);
            try {
                if (internalId) {

                    let transObj = record.load({
                        type: type,
                        id: internalId,
                        isDynamic: true
                    });

                    log.debug("transObj", transObj);

                    let itemsSublistCount = transObj.getLineCount({
                        sublistId: 'item'
                    });

                    let expenseSublistCount = transObj.getLineCount({
                        sublistId: 'expense'
                    });

                    let totalLines = 0;
                    let whtTaxCode;
                    let whtCategory;

                    if (itemsSublistCount > 0) {
                        totalLines = itemsSublistCount;
                        sublist = 'item';
                    } else if (expenseSublistCount > 0) {
                        totalLines = expenseSublistCount;
                        sublist = 'expense';
                    } else {
                        totalLines = 0;
                    }
                    log.debug("totalLines", totalLines);
                    for (let i = 0; i < totalLines; i++) {
                        whtTaxCode = transObj.getSublistValue(sublist, whtTaxCodeFld, i);
                        if (whtTaxCode) {
                            break;
                        }
                    }
                    log.debug("whtTaxCode", whtTaxCode);
                    if (whtTaxCode) {

                        let customrecord_ps_tht_wht_tax_codeSearchObj = search.create({
                            type: "customrecord_ps_tht_wht_tax_code",
                            filters: [
                                ["internalid", "anyof", whtTaxCode]
                            ],
                            columns: [
                                "custrecord_ps_wht_taxcode_category"
                            ]
                        });


                        log.debug("whtTaxCode", whtTaxCode);


                        let results = customrecord_ps_tht_wht_tax_codeSearchObj.run().getRange({start: 0, end: 1000});
                        log.debug("results", results);


                        for (let i = 0; i < results.length; i++) {
                            whtCategory = results[i].getValue({name: 'custrecord_ps_wht_taxcode_category'});
                        }

                        log.debug("whtCategory: ", whtCategory);

                    }

                    return whtCategory

                }
            } catch (e) {
                log.error("Error in getPndCategory()", e.message);
            }
        }


        function deleteVendorCreditFromPayment(vendorCreditId, type) {

            try {

                let transactionToDelete;

                if (type == 'invoice') {
                    transactionToDelete = record.Type.CREDIT_MEMO
                } else if (type == 'vendorbill') {
                    transactionToDelete = record.Type.VENDOR_CREDIT
                }

                let vendorCredit = record.delete({
                    type: transactionToDelete,
                    id: vendorCreditId,
                });

                log.debug("Vendor Credit Delete Status: ", vendorCredit);

            } catch (e) {
                log.error("Error in deleteVendorCreditFromPayment()", e);
            }

        }


        function reCalculateAndSetRemainingAmountOnBill(billPaymentId, billId, billLinesData, type) {

            try {

                log.debug("in reCalculateAndSetRemainingAmountOnBill(): ");


                log.debug("billLinesData: ", billLinesData);

                let billRecord = record.load({
                    type: type,
                    id: billLinesData[0].createdFrom,
                    isDynamic: false
                });


                for (let i = 1; i < billLinesData.length; i++) {

                    let index = billLinesData[i].line;

                    log.debug("index", index);

                    let remainingAmount = isNullReturnEmpty(billRecord.getSublistValue(billLinesData[i].sublist, 'custcol_ps_wht_remaining_amount', index));

                    if (remainingAmount) {
                        let value = remainingAmount.toString().replace(/,/g, "")
                        remainingAmount = parseFloat(value)
                    }

                    log.debug("remainingAmount: " + index, remainingAmount);


                    if (billLinesData[i].taxCode) {
                        billLinesData[i].isPartialPayment ?
                            remainingAmount += billLinesData[i].partialAmount :
                            remainingAmount += billLinesData[i].netAmount + billLinesData[i].taxAmount
                    } else {
                        billLinesData[i].isPartialPayment ?
                            remainingAmount += billLinesData[i].partialAmount :
                            remainingAmount += billLinesData[i].amount
                    }


                    log.debug("remainingAmount: " + index, remainingAmount);

                    setRemainingAmountOnBill(billRecord, remainingAmount, index, billLinesData[i].sublist)
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: isApplyWhtPartialAmountFld,
                        value: false,
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_tax_code',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_tax_rate',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_wht_partial_payment_amount',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_tax_amount',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_wht_partial_payment_amount',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_partial_net_amount',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                        value: '',
                        line: index
                    });
                    billRecord.setSublistValue({
                        sublistId: billLinesData[i].sublist,
                        fieldId: 'custcol_ps_wht_net_amount',
                        value: '',
                        line: index
                    });

                }

                billRecord.save({enableSourcing: false, ignoreMandatoryFields: true});

            } catch (e) {
                log.error("Error in reCalculateAndSetRemainingAmountOnBill()", e);
            }

        }


        function unCheckPartialPaymentCheckbox(billRecord, i, sublist) {

            billRecord.selectLine({
                sublistId: sublist,
                line: i
            });

            billRecord.setCurrentSublistValue({sublistId: sublist, fieldId: isApplyWhtPartialAmountFld, value: false});

            billRecord.commitLine({
                sublistId: sublist
            });

        }

        function getLastDayOfMonth(month) {

            const lastDayOfMonth = moment(month, 'MM').endOf('month').format('D');

            return lastDayOfMonth;

        }

        function compileDate(month, date, year) {
            return month + '/' + date + '/' + year
        }


        function convertDateToNetSuiteFormat(date) {

            let netsuiteDateFormat = getNetsuiteDateFormat()
            log.debug("Netsuite Date Format", netsuiteDateFormat)

            const parsedDate = moment(date, 'MM/DD/YYYY'); //Parsing to current DateFormat
            const formattedDate = parsedDate.format(netsuiteDateFormat); //Parsing to netsuite DateFormat

            let netsuiteDate = format.format({
                value: formattedDate,
                type: format.Type.DATE
            });

            return netsuiteDate
        }

        function splitDate(date) {

            try {

                const inputDate = moment(date);
                const yy = inputDate.format("YY");
                const yyyy = inputDate.format("YYYY");
                const mm = inputDate.format("MM");
                const dd = inputDate.format("DD");

                let splittedDate = {
                    "dd": dd,
                    "mm": mm,
                    "yy": yy,
                    "yyyy": yyyy
                }

                return splittedDate

            } catch (e) {
                log.error("Error in splitDate()", e)
            }
        }

        function getMonthlyBillPaymentsCount(month, year) {

            let lastDayOfMonth = getLastDayOfMonth(month)
            let startDate = compileDate(month, '01', year);
            let endDate = compileDate(month, lastDayOfMonth, year);


            let startDateNS = convertDateToNetSuiteFormat(startDate)
            let endDateNS = convertDateToNetSuiteFormat(endDate)

            log.debug("lastDayOfMonth", lastDayOfMonth);
            log.debug("startDate", startDate);
            log.debug("endDate", endDate);
            log.debug("startDate NS", startDateNS);
            log.debug("endDate NS", endDateNS);

            let vendorpaymentSearchObj = search.create({
                type: "vendorpayment",
                filters: [
                    ["type", "anyof", "VendPymt"],
                    "AND", ["custbody_ps_wht_bill_lines_data", "isnotempty", ""],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["trandate", "within", startDateNS, endDateNS]
                ],
                columns: [
                    search.createColumn({
                        name: "internalid",
                        summary: "COUNT"
                    })
                ]
            });

            let results = vendorpaymentSearchObj.run().getRange({start: 0, end: 1000});

            let count;

            for (let i = 0; i < results.length; i++) {
                count = results[i].getValue({name: 'internalid', summary: 'COUNT'});
            }

            log.debug("count: ", count);

            count = parseInt(count) + 1

            return count

        }


        //Refactor : merge getQueueId with getLastSequnceNo() due to repeatation

        function getQueueId(sequenceNo, date, pndCategory) {
            try {

                let splittedDate = splitDate(date)
                let lastDayOfMonth = getLastDayOfMonth(splittedDate.mm)

                log.debug("in getQueueId()");
                log.debug("sequenceNo in getQueueId(): ", sequenceNo);
                log.debug("pndCategory: ", pndCategory);

                let startDate = compileDate(splittedDate.mm, '01', splittedDate.yyyy);
                let endDate = compileDate(splittedDate.mm, lastDayOfMonth, splittedDate.yyyy);
                let startDateNS = convertDateToNetSuiteFormat(startDate)
                let endDateNS = convertDateToNetSuiteFormat(endDate)

                log.debug("startDateNS sequenceNo: ", startDateNS);
                log.debug("endDateNS sequenceNo: ", endDateNS);

                let customrecord_ps_tht_wht_jobSearchObj = search.create({
                    type: "customrecord_ps_tht_wht_job",
                    filters: [
                        ["custrecord_ps_wht_payment_date", "within", startDateNS, endDateNS],
                        "AND", ["custrecord_ps_wht_pnd_category", "anyof", pndCategory],
                        "AND", ["custrecord_ps_wht_sequence_no", "equalto", sequenceNo]

                    ],
                    columns: [
                        search.createColumn({
                            name: "internalid",
                            label: "Internal Id"
                        })
                    ]
                });

                let results = customrecord_ps_tht_wht_jobSearchObj.run().getRange({start: 0, end: 1});

                log.debug("results: ", results);
                log.debug("results.length: ", results.length);

                let queueId;

                for (let i = 0; i < results.length; i++) {
                    queueId = results[i].getValue({name: 'internalid'});
                }

                return queueId

            } catch (e) {
                log.error("Error in getQueueId()", e);
            }
        }


        function getLastSequenceNo(tranDate, pndCategory) {

            try {

                if (pndCategory) {

                    let splittedDate = splitDate(tranDate)
                    let lastDayOfMonth = getLastDayOfMonth(splittedDate.mm)

                    let startDate = compileDate(splittedDate.mm, '01', splittedDate.yyyy);
                    let endDate = compileDate(splittedDate.mm, lastDayOfMonth, splittedDate.yyyy);

                    let startDateNS = convertDateToNetSuiteFormat(startDate)
                    let endDateNS = convertDateToNetSuiteFormat(endDate)

                    log.debug("startDateNS sequenceNo: ", startDateNS);
                    log.debug("endDateNS sequenceNo: ", endDateNS);

                    let customrecord_ps_tht_wht_jobSearchObj = search.create({
                        type: "customrecord_ps_tht_wht_job",
                        filters: [
                            ["custrecord_ps_wht_sequence_no", "isnotempty", ""],
                            "AND", ["custrecord_ps_wht_payment_date", "within", startDateNS, endDateNS],
                            "AND", ["custrecord_ps_wht_pnd_category", "anyof", pndCategory]

                        ],
                        columns: [
                            search.createColumn({
                                name: "custrecord_ps_wht_sequence_no",
                                sort: search.Sort.DESC,
                                label: "SequenceNo"
                            }),
                            search.createColumn({
                                name: "internalid",
                                label: "Internal Id"
                            })
                        ]
                    });

                    let results = customrecord_ps_tht_wht_jobSearchObj.run().getRange({start: 0, end: 1});

                    log.debug("results: ", results);
                    log.debug("results.length: ", results.length);


                    let lastSequenceNo;
                    let queueId;
                    let currentSequenceNo;

                    for (let i = 0; i < results.length; i++) {
                        lastSequenceNo = results[i].getValue({name: 'custrecord_ps_wht_sequence_no'});
                        queueId = results[i].getValue({name: 'internalid'});
                    }

                    log.debug("lastSequenceNo: ", lastSequenceNo);
                    log.debug("queueId: ", queueId);

                    if (isUndefined(lastSequenceNo)) {
                        lastSequenceNo = 0
                    }

                    log.debug("lastSequenceNo: ", lastSequenceNo);

                    currentSequenceNo = parseInt(lastSequenceNo) + 1

                    log.debug("currentSequenceNo: ", currentSequenceNo);

                    return currentSequenceNo
                }
            } catch (e) {
                log.error("Error in getLastSequenceNo()", e.message);
            }


        }

        function updateWhtTaxJobRecord(sequenceNo, paymentDate, queueId) {

            try {

                let whtTaxJobRecord = record.load({
                    type: 'customrecord_ps_tht_wht_job',
                    id: queueId,
                    isDynamic: true
                });

                whtTaxJobRecord.setValue('custrecord_ps_wht_sequence_no', sequenceNo)
                whtTaxJobRecord.setText('custrecord_ps_wht_payment_date', paymentDate)

                let whtTaxJobId = whtTaxJobRecord.save({enableSourcing: false, ignoreMandatoryFields: true});

                whtTaxJobId ? log.debug("whtTaxJobRecord Updated!") : log.debug("Error in updating whtTaxJobRecord..")

            } catch (e) {
                log.error("Error in updateWhtTaxJobRecord()", e);
            }

        }

        function convertToDigits(number, noOfDigits) {
            const numberString = number.toString();

            if (numberString.length >= noOfDigits) {
                return numberString;
            }

            const zerosToAdd = noOfDigits - numberString.length;
            const paddedString = '0'.repeat(zerosToAdd) + numberString;

            return paddedString;
        }

        function generateCertificateNo(billRecord, tranDate, sequenceNo, tranType) {

            let splittedDate = splitDate(tranDate)
            let taxCode = getBillTaxCode(billRecord, tranType)

            let category = taxCode ? getWhtCategory(taxCode) : ''
            let configurationRecordId = getWhtConfigurationRecord();

            configurationRecordId ? log.debug("configurationRecordId", configurationRecordId) : log.error("Wht Tax Configuration Record not found!!!")

            let configurationRecordObj = record.load({
                type: 'customrecord_ps_tht_wht_configuration',
                id: configurationRecordId,
                isDynamic: true
            });
            let certificateNoFormat = configurationRecordObj.getValue('custrecord_ps_wht_cert_no_format');

            log.debug("certificateNoFormat: " + certificateNoFormat);

            const certificateVariables = {
                WHT_CATEGORY: convertToDigits(category, 2),
                YY: splittedDate.yy,
                MM: splittedDate.mm,
                NNNNN: convertToDigits(sequenceNo, 5),
            };
            log.debug("certificateVariables: " + JSON.stringify(certificateVariables));


            const regex = /\$\{(\w+)\}/g;
            let matches;
            let certificateNo = certificateNoFormat;

            // Replace each variable component in the format string with its corresponding value
            while ((matches = regex.exec(certificateNoFormat)) !== null) {
                const [match, variableName] = matches;
                const variableValue = certificateVariables[variableName];
                certificateNo = certificateNo.replace(match, variableValue);
            }

            log.debug("certificateNo: " + certificateNo);

            return certificateNo;
        }


        function getNetsuiteDateFormat() {
            let userObj = runtime.getCurrentUser();
            let dateFormat = userObj.getPreference({
                name: 'DATEFORMAT'
            });

            let dateFormatNetsuiteAndMomentMap = {
                'D-Mon-YYYY': 'D-MMM-YYYY',
                'DD-Mon-YYYY': 'DD-MMM-YYYY',
                'D-MONTH-YYYY': 'D-MMMM-YYYY',
                'D MONTH, YYYY': 'D MMMM, YYYY',
                'DD-MONTH-YYYY': 'DD-MMMM-YYYY',
                'DD MONTH, YYYY': 'DD MMMM, YYYY'
            }

            dateFormat = dateFormatNetsuiteAndMomentMap[dateFormat] ? dateFormatNetsuiteAndMomentMap[dateFormat] : dateFormat
            return dateFormat

        }


        function addTaxItemsToItemSublistOfCheckOrCashSale(recordObject, itemSublistCount, tranType, isSuiteTaxEnabled) {

            try {

                let sublist = 'item';

                let taxLinesObj = {};
                let billLineNoObj = {};
                let taxAmount;
                let taxCodeValue = ''

                if (!isSuiteTaxEnabled) {
                  
                    taxCodeValue = getDefaultVatCode()
                    log.debug("taxCodeValue", taxCodeValue)
                }

                for (let i = 0; i < itemSublistCount; i++) {

                    taxAmount = parseFloat(isNull(recordObject.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_tax_amount',
                        line: i
                    })));

                    let taxCode = recordObject.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_tax_code',
                        line: i
                    });

                    log.debug("taxCode" + i, taxCode);

                    log.debug("taxAmount" + i, taxAmount);

                    if (taxAmount > 0) {
                        taxLinesObj[i + 1] = taxAmount;

                        billLineNoObj[i + 1] = taxCode;
                    }

                }


                log.debug("taxLinesObj final: ", taxLinesObj);
                log.debug("billLineNoObj final: ", billLineNoObj);


                for (const key in billLineNoObj) {
                    if (billLineNoObj.hasOwnProperty(key)) {

                        const taxCode = billLineNoObj[key];
                        const taxAmount = taxLinesObj[key];

                        if (taxCode) {

                            let itemToSet = getItemId(taxCode, tranType)

                            log.debug("itemToSet: ", itemToSet)


                            recordObject.selectNewLine({
                                sublistId: 'item'
                            });


                            // Set values for the new line item
                            recordObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: itemToSet // Item internal ID
                            });


                            recordObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: 1
                            });

                            recordObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: taxAmount * (-1)
                            });

                            recordObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                value: taxAmount * (-1)
                            });


                            if (!isSuiteTaxEnabled && taxCodeValue) {
                                recordObject.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxcode',
                                    value: taxCodeValue
                                })
                            }


                            // Commit the new line item
                            recordObject.commitLine({
                                sublistId: 'item'
                            });


                        }
                    }
                }
            } catch (e) {
                log.error("Error in addTaxItemsToItemSublistOfCheckOrCashSale()", e);
            }


        }


        function addTaxItemsToExpenseSublistOfCheck(checkRecord, expenseSublistCount, isSuiteTaxEnabled) {

            try {

                let sublist = 'expense';

                let taxSum = 0;
                let taxCodeToSet = '';
                let taxAmount;
                let taxCodeValue = '';

                if (!isSuiteTaxEnabled) {
                 
                    taxCodeValue = getDefaultVatCode()
                    log.debug("taxCodeValue", taxCodeValue)
                }

                for (let i = 0; i < expenseSublistCount; i++) {

                    taxAmount = parseFloat(isNull(checkRecord.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_tax_amount',
                        line: i
                    })));

                    let taxCode = checkRecord.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_tax_code',
                        line: i
                    });

                    log.debug("taxCode" + i, taxCode);

                    log.debug("taxAmount" + i, taxAmount);

                    if (taxAmount > 0) {
                        taxSum = taxSum + taxAmount
                        taxCodeToSet = taxCode
                    }

                }


                log.debug("taxSum final: ", taxSum);
                log.debug("taxCodeToSet final: ", taxCodeToSet);


                let itemId = getItemId(taxCodeToSet, 'check')

                log.debug("itemId: ", itemId)

                let accountToSet = getItemAccount(itemId);

                checkRecord.selectNewLine({
                    sublistId: sublist
                });


                checkRecord.setCurrentSublistValue({
                    sublistId: sublist,
                    fieldId: 'account',
                    value: accountToSet
                });

                checkRecord.setCurrentSublistValue({
                    sublistId: sublist,
                    fieldId: 'amount',
                    value: taxSum * (-1)
                });

                if (!isSuiteTaxEnabled && taxCodeValue) {
                    checkRecord.setCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'taxcode',
                        value: taxCodeValue
                    })
                }


                checkRecord.commitLine({
                    sublistId: sublist
                });

            } catch (e) {
                log.error("Error in addTaxItemsToExpenseSublistOfCheck()", e)
            }

        }


        function getDefaultVatCode() {
            try {
                var taxCodeArray = []

                var salestaxitemSearchObj = search.create({
                    type: "salestaxitem",
                    filters:
                        [
                            ["country","anyof","TH"], 
                            "AND", 
                            ["rate","equalto","0"], 
                            "AND", 
                            ["availableon","anyof","BOTH"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "name",
                                sort: search.Sort.ASC,
                                label: "Name"
                            }),
                            search.createColumn({name: "internalid", label: "Internal ID"})
                        ]
                });

                var searchResultCount = salestaxitemSearchObj.runPaged().count;
                salestaxitemSearchObj.run().each(function (searchItem) {

                    var searchObj = {}
                    searchObj.internalId = searchItem.getValue({name: "internalid"});
                    searchObj.name = searchItem.getValue({name: "name"});

                    taxCodeArray.push(searchObj)
                    return true;
                });

                log.debug("taxCodeArray:", taxCodeArray);
                log.debug("taxCodeArray[0]:", taxCodeArray[0]);

                if (taxCodeArray.length > 0) {
                    return taxCodeArray[0].internalId
                } else {
                    return ""
                }

            } catch (e) {
                log.error("Error in getDefaultVatCode()", e)
            }

        }


        function getItemAccount(itemId) {


            let itemRecord = record.load({
                type: 'discountitem', //discountitem //record.Type.ITEM
                id: itemId,
                isDynamic: true

            });

            let accountId = itemRecord.getValue({
                fieldId: 'account'
            });

            log.debug('Account ID:', accountId);

            return accountId
        }


        function updateDataInQueueRecord(sequenceNo, pndCategory, tranDate, reportData, resultsData, tranType) {

            try {

                let splittedDate = splitDate(tranDate)
                let parsedDate = compileDate(splittedDate.mm, splittedDate.dd, splittedDate.yyyy);
                let tranDateNS = convertDateToNetSuiteFormat(parsedDate)
                log.debug('tranDateNS', tranDateNS);

                let queueRec = record.create({
                    type: taxJobRecordScriptId
                });

                queueRec.setValue({fieldId: 'custrecord_ps_wht_queue_status', value: 'Done'});
                // queueRec.setValue({ fieldId: 'custrecord_ps_wht_vendor_credit_data', value: '' });
                queueRec.setText({fieldId: 'custrecord_ps_wht_payment_date', text: tranDateNS});
                queueRec.setValue({fieldId: 'custrecord_ps_wht_trans_type', value: tranType});
                queueRec.setValue({fieldId: 'custrecord_ps_wht_sequence_no', value: sequenceNo});
                queueRec.setValue({fieldId: 'custrecord_ps_wht_result', value: JSON.stringify(resultsData)});
                queueRec.setValue({fieldId: 'custrecord_ps_wht_report_data', value: JSON.stringify(reportData)});
                queueRec.setValue({fieldId: 'custrecord_ps_wht_pnd_category', value: pndCategory});


                return queueRec.save({enableSourcing: true, ignoreMandatoryFields: true});
            } catch (e) {
                log.error('Error::updateDataInQueueRecord', e);
            }

        }


        function isTransactionAvailable(subsidiary, subsidiaryBranchCode, taxPeriod, filingStatus, pndCategory) {

            console.log("subsidiary-" + subsidiary)
            console.log("subsidiaryBranchCode-" + subsidiaryBranchCode)
            console.log("taxPeriod-" + taxPeriod)
            console.log("filingStatus-" + filingStatus)
            console.log("pndCategory-" + pndCategory)

            var isOneWorld = runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});

            console.log("isOneWorld: " + isOneWorld)

            //  isOneWorld = false


            if (!subsidiary && isOneWorld) {
                dialog.alert({
                    title: 'Subsidiary not found!',
                    message: "Please select Subsidiary.."
                })
                return
            } else if (!subsidiaryBranchCode && isOneWorld) {

                dialog.alert({
                    title: 'Subsidiary Branch not found!',
                    message: "Please select Subsidiary Branch.."
                })
                return
            } else if (!taxPeriod) {
                dialog.alert({
                    title: 'Tax Period not found!',
                    message: "Please select Tax Period.."
                })
                return
            } else if (!filingStatus) {

                dialog.alert({
                    title: 'Filing Status not found!',
                    message: "Please select Filing Status.."
                })
                return
            }

            // let PNDData = search_lib.getBillPaymentDataForBillData(subsidiary,subsidiaryBranch,whtTaxPeriod,filingStatus)
            let PNDData = getBillPaymentDataForBillData(subsidiary, subsidiaryBranchCode, taxPeriod, filingStatus)
            let isSelectedPndCategeroyAvailable = false;

            for (let i = 0; i < PNDData.length; i++) {
                let billData = JSON.parse(PNDData[i].billData)[0]


                console.log(billData)

                if (billData.length <= 1) {
                    continue
                }
                if (!billData[1].taxCode) {
                    continue
                }


                let itemPndCategoryValue = search.lookupFields({
                    type: 'customrecord_ps_tht_wht_tax_code',
                    id: billData[1].taxCode,
                    columns: ['custrecord_ps_wht_taxcode_category']
                }).custrecord_ps_wht_taxcode_category;


                if (itemPndCategoryValue.length > 0) {
                    itemPndCategoryValue = itemPndCategoryValue[0].value
                }


                if (pndCategory == itemPndCategoryValue) {
                    isSelectedPndCategeroyAvailable = true
                    return isSelectedPndCategeroyAvailable
                } else {
                    isSelectedPndCategeroyAvailable = false
                }


            }


            if (!isSelectedPndCategeroyAvailable) {

                dialog.alert({
                    title: 'Transaction not found!',
                    message: "No transactions are available for the provided filters.."
                })
            }


        }


        // function renderHtmlContent(link, dataSource) {
        //     let pageRenderer = render.create(); //pageRenderer will combine datasource and template
        //     let templateFile = file.load({
        //         id: link
        //     });
        //     pageRenderer.templateContent = templateFile.getContents(); // template is set

        //     pageRenderer.addCustomDataSource({ //datasource is set now the template is going to recognize the ds object
        //         format: render.DataSource.OBJECT,
        //         alias: 'ds',
        //         data: dataSource
        //     });

        //     let renderedPage = pageRenderer.renderAsString();

        //     return renderedPage
        // }

        function loadVendBill(internalId, templateData) {
            let sublistData = []
            let totalTax = 0
            let totalPaidAmount = 0
            vendBillObj = record.load({
                id: internalId,
                type: 'vendorbill',
                isDynamic: true
            });
            let subsidiaryBranchInternalId = vendBillObj.getValue({fieldId: 'cseg_subs_branch'});
            sublistCount = vendBillObj.getLineCount({sublistId: "item"})
            for (let i = 0; i < sublistCount; i++) {
                lineObj = {}

                let whtTaxCodeTxt = vendBillObj.getSublistText({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_tax_code',
                    line: i
                })
                let whtTaxCodeValue = vendBillObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_tax_code',
                    line: i
                })


                if (whtTaxCodeValue) {
                    let taxSectionCode = getWHTTaxCode(whtTaxCodeValue)
                    log.debug("check taxSectionCode", taxSectionCode)

                    let typeOfIncome
                    log.debug("check whtTaxCode", whtTaxCodeTxt)

                    //mark check box obj
                    if (whtTaxCodeTxt) {
                        whtTaxCodeTxt = whtTaxCodeTxt.split("(")
                        if (whtTaxCodeTxt.length > 0) {
                            typeOfIncome = whtTaxCodeTxt[0].replace(/\s/g, '')
                            whtTaxCodeTxt = whtTaxCodeTxt[1]
                            whtTaxCodeTxt = whtTaxCodeTxt.replace(")", "")
                            whtTaxCodeTxt = whtTaxCodeTxt.replace(/\./g, "");
                            whtTaxCodeTxt = whtTaxCodeTxt.replace(/\s/g, '');
                            whtTaxCodeTxt = whtTaxCodeTxt.toLowerCase();
                            templateData[whtTaxCodeTxt] = true
                        }
                    }

                    log.debug("check whtTaxCode", whtTaxCodeTxt)
                    let taxAmount = isNull(vendBillObj.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_tax_amount',
                        line: i
                    }))
                    let paidAmount = isNull(vendBillObj.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_net_amount',
                        line: i
                    }))

                    if (templateData["taxAmount" + taxSectionCode]) {
                        templateData["taxAmount" + taxSectionCode] += taxAmount
                    } else {
                        templateData["taxAmount" + taxSectionCode] = taxAmount
                    }
                    if (templateData["paidAmount" + taxSectionCode]) {
                        templateData["paidAmount" + taxSectionCode] += paidAmount
                    } else {
                        templateData["paidAmount" + taxSectionCode] = paidAmount
                    }

                    taxCode = templateData["taxAmount" + taxSectionCode]
                    // templateData["paidAmount"+taxSectionCode] = Number(templateData["paidAmount"+taxSectionCode]) - Number(taxCode)


                    billDate = templateData["billDate"]
                    templateData["date" + taxSectionCode] = billDate

                    totalTax += Number(taxAmount)
                    totalPaidAmount += Number(paidAmount)

                    log.debug("item totalTax", totalPaidAmount)

                    templateData["totalTax"] = totalTax
                    templateData["totalPaidAmount"] = totalPaidAmount

                    // templateData["totalPaidAmount"]  = Number(totalPaidAmount ) -  Number(totalTax)


                    loadSubsidiaryBranch(subsidiaryBranchInternalId, templateData)

                }
            }

        }

        function getPaidAndTaxAmounts(internalId, templateData, recordType) {

            let sublistData = []
            let mergedPayload
            let totalTax = 0
            let totalPaidAmount = 0

            let vendPaymentObj = record.load({
                id: internalId,
                type: recordType,
                isDynamic: true
            });

            let billData = vendPaymentObj.getValue({fieldId: 'custbody_ps_wht_bill_lines_data'});
            let subsidiaryBranchInternalId = vendPaymentObj.getValue({fieldId: 'cseg_subs_branch'});
            let paymentDate = vendPaymentObj.getText({fieldId: 'trandate'});
            templateData["paymentDate"] = paymentDate
            templateData = getHoldingTaxTemplateTaxCode(templateData)


            let itemLineWithTaxCodeArray = []

            if (billData) {
                billDataParse = JSON.parse(billData)

                if (billDataParse.length >= 1) {

                    for (let j = 0; j < billDataParse.length; j++) {

                        let billDataLines = billDataParse[j]
                        log.debug("billData", billDataLines)
                        //           sublistCount = vendBillObj.getLineCount({ sublistId: "item" })
                        for (let i = 1; i < billDataLines.length; i++) {

                            // let  whtTaxCodeTxt   = vendBillObj.getSublistText({ sublistId: 'item', fieldId: 'custcol_ps_wht_tax_code', line: i })
                            let whtTaxCodeValue = billDataLines[i].taxCode
                            if (!whtTaxCodeValue) {
                                continue
                            }
                            let taxAmount = 0
                            let paidAmount = 0

                            //Add additional code

                            let whtTaxCodeCategory = search.lookupFields({
                                type: 'customrecord_ps_tht_wht_tax_code',
                                id: whtTaxCodeValue,
                                columns: ['custrecord_ps_wht_taxcode_category']
                            });
                            let whtTaxIncomeType = search.lookupFields({
                                type: 'customrecord_ps_tht_wht_tax_code',
                                id: whtTaxCodeValue,
                                columns: ['custrecord_ps_wht_taxcode_income_type']
                            }).custrecord_ps_wht_taxcode_income_type;
                            if (whtTaxIncomeType.length > 0) {
                                whtTaxIncomeType = whtTaxIncomeType[0].text

                            }

                            log.debug("whtTaxCodeValue", whtTaxIncomeType)
                            if (whtTaxCodeCategory) {
                                whtTaxCodeCategory = whtTaxCodeCategory.custrecord_ps_wht_taxcode_category[0].text
                                whtTaxCodeCategory = whtTaxCodeCategory.replace(/\./g, "")
                                whtTaxCodeCategory = whtTaxCodeCategory.toLowerCase();
                                whtTaxCodeCategory = whtTaxCodeCategory.replace(/ /g, '')
                                templateData[whtTaxCodeCategory] = true
                            }
                            if (billDataLines[i].isPartialPayment) {
                                taxAmount = Number(billDataLines[i].partialTaxAmount)
                                paidAmount = Number(billDataLines[i].partialAmount)
                            } else if (!billDataLines[i].isPartialPayment) {
                                taxAmount = Number(billDataLines[i].taxAmount)
                                paidAmount = Number(billDataLines[i].amount)

                            }

                            log.debug("fieldLookUp", whtTaxCodeCategory)
                            let taxSectionCode = getWHTTaxCode(whtTaxCodeValue)
                            log.debug("check taxSectionCode", taxSectionCode)


                            let lineObj = {}
                            let lineArray = []

                            lineArray.push({
                                taxAmount: Number(taxAmount),
                                paidAmount: Number(paidAmount),
                                paymentDate: paymentDate,
                                whtTaxIncomeType: translateToThai(whtTaxIncomeType)

                            })


                            lineObj[whtTaxCodeValue + ":taxCode" + taxSectionCode] = lineArray

                            itemLineWithTaxCodeArray.push(lineObj)

                            if (templateData["taxAmount" + taxSectionCode]) {
                                templateData["taxAmount" + taxSectionCode] = convertInToCurrency(format.parse({
                                    value: templateData["taxAmount" + taxSectionCode],
                                    type: format.Type.CURRENCY
                                }) + Number(taxAmount))
                            } else {
                                templateData["taxAmount" + taxSectionCode] = isNull(convertInToCurrency(taxAmount))
                            }

                            if (templateData["paidAmount" + taxSectionCode]) {
                                // templateData["paidAmount"+taxSectionCode] += isNull(convertInToCurrency(paidAmount))
                                templateData["paidAmount" + taxSectionCode] = convertInToCurrency(format.parse({
                                    value: templateData["paidAmount" + taxSectionCode],
                                    type: format.Type.CURRENCY
                                }) + Number(paidAmount))


                            } else {

                                templateData["paidAmount" + taxSectionCode] = isNull(convertInToCurrency(paidAmount))
                            }


                            let billDate = templateData["billDate"]
                            templateData["date" + taxSectionCode] = billDate

                            totalTax += Number(taxAmount)
                            totalPaidAmount += Number(paidAmount)

                            templateData["taxInWords"] = amountsTowords(totalTax)
                            templateData["totalTax"] = isNull(convertInToCurrency(totalTax))
                            templateData["totalPaidAmount"] = isNull(convertInToCurrency(totalPaidAmount))

                            // templateData["totalPaidAmount"]  = Number(totalPaidAmount ) -  Number(totalTax)

                            if (subsidiaryBranchInternalId) {
                                loadSubsidiaryBranch(subsidiaryBranchInternalId, templateData)
                            }

                        }
                    }

                    log.debug("templateData", templateData)

                    const result = {};

                    itemLineWithTaxCodeArray.forEach(entry => {
                        const taxCode = Object.keys(entry)[0];
                        const {taxAmount, paidAmount, paymentDate, whtTaxIncomeType} = entry[taxCode][0];

                        if (!result[taxCode]) {
                            result[taxCode] = {
                                taxAmount: 0,
                                paidAmount: 0,
                            };
                        }


                        result[taxCode].taxAmount += taxAmount;
                        result[taxCode].paidAmount += paidAmount;
                        result[taxCode].paymentDate = paymentDate
                        result[taxCode].whtTaxIncomeType = whtTaxIncomeType
                    });

                    log.debug("result", result)

                    const groupedData = Object.entries(result).map(([taxCode, values]) => ({

                        [taxCode]: [{
                            taxAmount: convertInToCurrency(values.taxAmount),
                            paidAmount: convertInToCurrency(values.paidAmount),
                            paymentDate: getDATEINTODDMMYY(paymentDate),
                            whtTaxIncomeType: values.whtTaxIncomeType
                        }]
                    }));

                    const convertedPayload = [];

                    groupedData.forEach(item => {
                        const key = Object.keys(item)[0];
                        const value = item[key][0];
                        const taxCode = key.split(':')[1];

                        const existingEntry = convertedPayload.find(entry => entry.hasOwnProperty(taxCode));

                        if (existingEntry) {
                            existingEntry[taxCode].push(value);
                        } else {
                            convertedPayload.push({
                                [taxCode]: [value]
                            });
                        }

                    });

                    mergedPayload = {...templateData};

                    convertedPayload.forEach(entry => {
                        let taxCode = Object.keys(entry)[0];
                        mergedPayload[taxCode] = entry[taxCode];
                    });


                }

            }


            return mergedPayload

        }

        function loadSubsidiaryBranch(internalId, templateData) {
            if (internalId) {

                let subsidiaryBranchObj = record.load({
                    id: internalId,
                    type: 'customrecord_cseg_subs_branch',
                    isDynamic: true
                });

                let branchName = subsidiaryBranchObj.getText({fieldId: 'name'});

                let branchAdd1 = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_subs_branch_addr1'});
                let branchAdd2 = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_subs_branch_addr2'});
                let branchAdd3 = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_subs_branch_addr3'});
                if (branchName) {
                    branchName = branchName.split(":")
                    templateData["branchName"] = branchName[1]
                }


                templateData["branchAdd"] = branchAdd1 + " " + branchAdd2 + " " + branchAdd3
            }

        }

        function getWHTTaxCode(internalId) {

            let taxSection
            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'customrecord_ps_tht_wht_tax_code',
                isDynamic: true
            });

            let whtTaxCertificationValue = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_taxcode_cert_sect'});

            whtCerficateSectionObj = record.load({
                id: whtTaxCertificationValue,
                type: 'customrecord_ps_tht_wht_cert_section',
                isDynamic: true
            });

            taxSection = whtCerficateSectionObj.getValue({fieldId: 'custrecord_ps_wht_certificate_sect_code'});
            taxSection = taxSection.replace(/\s/g, '');
            taxSection = taxSection.replace(/[^a-zA-Z0-9]/g, "");
            taxSection = taxSection.toLowerCase();

            return taxSection


        }

        function getWHTTAXIncomeType(internalId) {
            subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'customrecord_ps_tht_wht_tax_code',
                isDynamic: true
            });

            let whtTaxIncomeType = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_taxcode_income_type'});
            let whtTaxIncomeTypeCode = ""
            if (whtTaxIncomeType) {
                if (whtTaxIncomeType.indexOf(".") <= 0) {
                    return ""
                }
                whtTaxIncomeTypeArray = whtTaxIncomeType.split(".")
                if (whtTaxIncomeTypeArray.length > 0) {
                    whtTaxIncomeTypeCode = whtTaxIncomeTypeArray[0]
                }
            }
            log.debug(" getWHTTAXIncomeType(internalId) :", whtTaxIncomeTypeCode)


            return whtTaxIncomeTypeCode
        }

        function loadTaxPeriod(internalId, templateData) {

            let taxPeriodObj = record.load({
                id: internalId,
                type: 'taxperiod',
                isDynamic: true
            });

            let periodName = taxPeriodObj.getValue({fieldId: 'periodname'});
            periodName = periodName.replace(/[^a-zA-Z]/g, '');
            periodName = periodName.toLowerCase();

            templateData[periodName] = true
        }

        function loadSubsidiaryBranchCode(internalId, templateData, pndCategory, printType) {
            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'customrecord_cseg_subs_branch',
                isDynamic: true
            });

            let branchNameCode = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_code'}).toString();
            let brnCodetd
            let brnCodeLine

            for (let i = 0; i < branchNameCode.length; i++) {
                brnCodetd += `<td  border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${branchNameCode[i]}</td>`
                brnCodeLine += `<td   border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${branchNameCode[i]}</td>`
            }

            templateData["branchCode"] = brnCodetd
            templateData["brnCodeLine"] = brnCodeLine


            log.debug("templateDatabranchCode", templateData["branchCode"])
        }


        function loadSubsidiaryBranchCodePND3(internalId, templateData, printType) {

            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'customrecord_cseg_subs_branch',
                isDynamic: true
            });

            let branchNameCode = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_code'}).toString();
            let branchName = subsidiaryBranchObj.getValue({fieldId: 'name'});

            let adderess1 = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr1'});
            let adderess2 = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr2'});
            let adderess3 = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr3'});
            let zipCode = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_zip'});
            let zipCodetd = ""

            templateData["address1"] = adderess1
            templateData["address23"] = adderess2 + " " + adderess3

            if (branchName) {
                branchName = branchName.split(":")
                branchName = branchName[1]

            }

            log.debug("branchNameCode", branchNameCode)
            let brnCodetd = ``
            log.debug("branchNameCode", branchNameCode.length)


            for (let i = 0; i < zipCode.length; i++) {
                if (i == 0) {
                    zipCodetd += `<td align="center"  width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`
                } else if (i > 0 && i != zipCode.length - 1) {
                    zipCodetd += `<td align="center"   width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`
                } else if (i == zipCode.length - 1) {
                    zipCodetd += `<td align="center" width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`
                }

            }


            templateData["branchName"] = branchName
            templateData["zipCode"] = zipCodetd

            log.debug("templateDatabranchCode", templateData["branchCode"])
        }

        function loadSubsidiaryBranchCodepnd2a(internalId, templateData, pndCategory) {

            let colorCode = ""
            if (pndCategory == "1") {
                colorCode = "#001B54;"
            } else if (pndCategory == "2") {
                colorCode = "#237e6d;"
            }

            subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'customrecord_cseg_subs_branch',
                isDynamic: true
            });

            branchNameCode = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_code'}).toString();
            let brnCodetd
            let brnCodeLine

            for (let i = 0; i < branchNameCode.length; i++) {
                brnCodetd += `<td border="0.5" align="center" style="border-color:${colorCode}">${branchNameCode[i]}</td>`
                brnCodeLine += `<td   border="0.5" align="center" style="border-color:${colorCode}">${branchNameCode[i]}</td>`
            }

            templateData["branchCode"] = brnCodetd
            templateData["brnCodeLine"] = brnCodeLine


            log.debug("templateDatabranchCode", templateData["branchCode"])
        }


        function convertInToCurrency(amount) {
            let myFormat = formati.getCurrencyFormatter({currency: "USD"});
            let newCur = myFormat.format({
                number: Number(amount)
            });

            newCur = newCur.replace("$", "")
            return newCur

        }


        function getLineData(billPaymentObj, pndCategoryValue, printType, templateData) {

            let attachmentArray = []

            for (let i = 0; i < billPaymentObj.length; i++) {

                let billData = JSON.parse(billPaymentObj[i].billData)
                let tranDate = billPaymentObj[i].trandate
                let name = billPaymentObj[i].entityid

                // log.debug("billData[j].taxCode : attachmentArray", billData)
                for (let j = 0; j < billData.length; j++) {

                    let sublist = billData[j]
                    for (let k = 1; k < sublist.length; k++) {
                        if (!sublist[k].taxCode) {
                            continue
                        }
                        if (sublist[k].taxCode == null) {
                            continue
                        }

                        let itemPndCategoryValue = search.lookupFields({
                            type: 'customrecord_ps_tht_wht_tax_code',
                            id: sublist[k].taxCode,
                            columns: ['custrecord_ps_wht_taxcode_category']
                        }).custrecord_ps_wht_taxcode_category;

                        if (itemPndCategoryValue.length > 0) {
                            itemPndCategoryValue = itemPndCategoryValue[0].value
                        }

                        log.debug("billData[j].taxCode :billData[j]", sublist[k])
                        if (itemPndCategoryValue != pndCategoryValue) {
                            continue
                        }

                        let whtTaxCodeTxt = search.lookupFields({
                            type: 'customrecord_ps_tht_wht_tax_code',
                            id: sublist[k].taxCode,
                            columns: ['name', 'custrecord_ps_wht_taxcode_rate']
                        });
                        let whtTaxRate = whtTaxCodeTxt.custrecord_ps_wht_taxcode_rate
                        //  search.lookupFields({ type: 'customrecord_ps_tht_wht_tax_code', id: sublist[k].taxCode, columns: ['custrecord_ps_wht_taxcode_rate'] }).custrecord_ps_wht_taxcode_rate
                        whtTaxRate = whtTaxRate.replace("%", "")


                        let incomeTaxTypeCode = getWHTTAXIncomeType(sublist[k].taxCode)
                        log.debug("incomeTaxType", incomeTaxTypeCode)
                        incomeTaxTypeCode = "incomeTaxTypeCode" + incomeTaxTypeCode
                        templateData[incomeTaxTypeCode] = true
                        templateData[incomeTaxTypeCode + "Count"] = templateData[incomeTaxTypeCode + "Count"] + 1

                        //  log.debug("incomeTaxType",incomeTaxType)

                        let paidAmount = 0
                        let taxAmount = 0

                        if (sublist[k].isPartialPayment) {
                            paidAmount = sublist[k].partialAmount
                            taxAmount = sublist[k].partialTaxAmount

                        } else if (!sublist[k].isPartialPayment) {
                            paidAmount = sublist[k].amount
                            taxAmount = sublist[k].taxAmount
                        }
                        templateData[incomeTaxTypeCode + "Income"] = templateData[incomeTaxTypeCode + "Income"] + paidAmount

                        templateData[incomeTaxTypeCode + "Tax"] = templateData[incomeTaxTypeCode + "Tax"] + taxAmount

                        let date = moment(getDATEINTODDMMYY(billPaymentObj[i].trandate), "DD/MM/YY");
                        let year = getThaiYear(date.year());
                        let month = date.month() + 1;
                        let day = date.date();
                        let thaiDate = day + "/" + month + "/" + year

                        attachmentArray.push({
                            internalId: billPaymentObj[i].internalId,
                            tranDate: thaiDate,
                            entityid: billPaymentObj[i].entityid,
                            firstname: billPaymentObj[i].firstname,
                            lastname: billPaymentObj[i].lastname,
                            vendorAddress: billPaymentObj[i].vendorAddress,
                            vendorTaxId: billPaymentObj[i].vendorTaxId,
                            vendorTaxIdHtml: getPND3ATaxIdHTML(billPaymentObj[i].vendorTaxId, pndCategoryValue, printType),
                            sequenceNumber: billPaymentObj[i].sequenceNumber,
                            taxcode: getTaxCode(whtTaxCodeTxt.name),

                            taxRate: whtTaxRate,
                            amount: paidAmount,
                            taxamount: taxAmount,
                            whtCondition: billPaymentObj[i].whtCondition,

                            billaddressee: billPaymentObj[i].billaddressee,
                            billaddress1: billPaymentObj[i].billaddress1,
                            billaddress2: billPaymentObj[i].billaddress2,
                            billcity: billPaymentObj[i].billcity,
                            billstate: billPaymentObj[i].billstate,
                            billzipcode: billPaymentObj[i].billzipcode,
                            billcountry: billPaymentObj[i].billcountry
                        })
                    }
                }


            }

            let uniqueArray = attachmentArray;

            // Group the objects
            let uniqueKey = {};
            let sno = 1
            uniqueArray.forEach(function (obj) {
                let key = obj.entityid + '_' + obj.tranDate + '_' + obj.taxcode + '_' + obj.whtCondition + "_" + obj.sequenceNumber;
                if (!uniqueKey.hasOwnProperty(key)) {
                    uniqueKey[key] = {
                        // sno: sno++,
                        entityId: obj.entityid,
                        firstName: obj.firstname,
                        lastName: obj.lastname,
                        vendorAddress: obj.vendorAddress,
                        vendorTaxId: obj.vendorTaxId,
                        vendorTaxIdHtml: obj.vendorTaxIdHtml,
                        tranDate: obj.tranDate,
                        rate: obj.rate,
                        taxCode: obj.taxcode,
                        sno: obj.sequenceNumber,
                        amount: 0,
                        taxAmount: 0,
                        taxRate: obj.taxRate,
                        whtCondition: obj.whtCondition,
                        billaddressee: obj.billaddressee,
                        billaddress1: obj.billaddress1,
                        billaddress2: obj.billaddress2,
                        billcity: obj.billcity,
                        billstate: obj.billstate,
                        billzipcode: obj.billzipcode,
                        billcountry: obj.billcountry
                    };
                }
                uniqueKey[key].amount += obj.amount;
                uniqueKey[key].taxAmount += obj.taxamount;
            });

            let result = [];
            for (let key in uniqueKey) {
                if (uniqueKey.hasOwnProperty(key)) {
                    result.push(uniqueKey[key]);
                }
            }

            return result

        }

        function getTaxCode(whtTaxCodeTxt) {
            let taxCodeString = whtTaxCodeTxt
            if (taxCodeString) {
                taxCodeString = taxCodeString.split("(")
                if (taxCodeString.length > 0) {
                    taxCodeString = taxCodeString[0]
                    taxCodeString = taxCodeString.replace(/\s/g, '');
                }
            }
            return taxCodeString
        }

        function getLineDataTotal(lineDataObj, templateData) {
            let totalAmount = 0
            let totalTax = 0

            for (let i = 0; i < lineDataObj.length; i++) {
                totalAmount += lineDataObj[i].amount
                totalTax += lineDataObj[i].taxAmount
            }

            templateData.totalAmount = convertInToCurrency(totalAmount)
            templateData.totalTaxAmount = convertInToCurrency(totalTax)

            return templateData
        }


        function getHoldingTaxTemplateTaxCode(templateData) {
            templateData["taxCode6"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode5"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b25"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b24"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b23"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b22"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b14"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b13"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b12"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4b11"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode3"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode4a"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode2"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]
            templateData["taxCode1"] = [{taxAmount: "", paidAmount: "", paymentDate: ""}]

            return templateData

        }


        function getPND3ATaxIdHTML(vendorTaxId, pndCategory, printType) {

            let taxIdHTMLBox = ""

            // for (let i = 0; i < vendorTaxId.length; i++) {
            //     taxIdHTMLBox += `<td border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${vendorTaxId[i]}</td>`
            // }

            for (let i = 0; i < vendorTaxId.length; i++) {

                if (i == 0) {
                    taxIdHTMLBox += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]}  " >${vendorTaxId[i]}</td>`
                }

                if (i == 1) {
                    taxIdHTMLBox += ` <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }
                if (i == 2) {
                    taxIdHTMLBox += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }
                if (i == 3) {
                    taxIdHTMLBox += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }

                if (i == 4) {
                    taxIdHTMLBox += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}" >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 5) {
                    taxIdHTMLBox += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>
                                                        <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="center" font-size="12px" width="17px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 6) {
                    taxIdHTMLBox += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 7) {
                    taxIdHTMLBox += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 8) {
                    taxIdHTMLBox += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 9) {
                    taxIdHTMLBox += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 10) {
                    taxIdHTMLBox += ` <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                            ${vendorTaxId[i]}
                                                        </td>`
                }


                if (i == 11) {
                    taxIdHTMLBox += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right:  1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                            ${vendorTaxId[i]}
                                                        </td>`
                }

                if (i == 12) {
                    taxIdHTMLBox += ` <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                        <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                        </td>`
                }

            }
            return taxIdHTMLBox


        }


        function getPNDAttachmentTemplateData(isOneWorld, param, pndCategoryValue, efile) {
            let incomeTaxPayLoad = JSON.parse(param.incomeTaxRetrunPayLoad)
            let printType = param.type
            log.debug("incomeTaxPayLoad", incomeTaxPayLoad)
            let templateData = {
                regularfiling: false,
                additionalfiling: false,
                incomeTaxTypeCode1: false,
                incomeTaxTypeCode2: false,
                incomeTaxTypeCode3: false,
                incomeTaxTypeCode4: false,
                incomeTaxTypeCode5: false,

                incomeTaxTypeCode1Count: 0,
                incomeTaxTypeCode2Count: 0,
                incomeTaxTypeCode3Count: 0,
                incomeTaxTypeCode4Count: 0,
                incomeTaxTypeCode5Count: 0,

                incomeTaxTypeCode1Income: 0,
                incomeTaxTypeCode2Income: 0,
                incomeTaxTypeCode3Income: 0,
                incomeTaxTypeCode4Income: 0,
                incomeTaxTypeCode5Income: 0,

                incomeTaxTypeCode1Tax: 0,
                incomeTaxTypeCode2Tax: 0,
                incomeTaxTypeCode3Tax: 0,
                incomeTaxTypeCode4Tax: 0,
                incomeTaxTypeCode5Tax: 0,
            }

            let subsidiary = incomeTaxPayLoad.subsidiary
            let subsidiaryBranch = incomeTaxPayLoad.subsidiaryBranch
            let whtTaxPeriod = incomeTaxPayLoad.whtPeriod
            let whtTaxPeriodText = incomeTaxPayLoad.whtPeriodText
            let filingStatus = incomeTaxPayLoad.filingStatus
            let accountingBook = incomeTaxPayLoad.accountingBook
            let surcharge = incomeTaxPayLoad.surcharge
            let totalAttachmentPage = incomeTaxPayLoad.totalAttachmentPage

            if (efile) {
                let billLines = getLineData(search_lib.getBillPaymentDataForBillData(isOneWorld, subsidiary, subsidiaryBranch, whtTaxPeriod, filingStatus), pndCategoryValue, printType, templateData)

                fileContent = convertJsonIntoEFileContent(billLines)
                return fileContent
            }

            let billLines = getLineData(search_lib.getBillPaymentDataForBillData(isOneWorld, subsidiary, subsidiaryBranch, whtTaxPeriod, filingStatus), pndCategoryValue, printType, templateData)
            log.debug("convertedPayload", templateData)
            templateData["lineData"] = billLines
            templateData = getLineDataTotal(billLines, templateData)
            isOneWorld ? loadSubsidiaryBRNNumberForPND53(subsidiary, templateData, printType) : true
            loadSubsidiaryBranchCode(subsidiaryBranch, templateData, pndCategoryValue, printType)
            //loadSubsidiaryBranchCodeForPND53(subsidiary, templateData,printType)
            log.debug("templateData", templateData["lineData"])

            const convertedPayLoad = {
                lineData: []
            };

            const lineDataMap = {};

            templateData.lineData.forEach(line => {
                let {
                    entityId,
                    firstName,
                    lastName,
                    vendorAddress,
                    tranDate,
                    taxCode,
                    vendorTaxId,
                    vendorTaxIdHtml,
                    sno,
                    amount,
                    taxAmount,
                    taxRate,
                    whtCondition
                } = line;

                if (!lineDataMap[sno]) {
                    lineDataMap[sno] = {
                        entityId,
                        firstName,
                        lastName,
                        vendorAddress,
                        vendorTaxIdHtml,
                        vendorTaxId,
                        sno,
                        tranDates: [],
                        taxCodes: [],
                        amounts: [],
                        taxAmounts: [],
                        taxRates: [],
                        whtConditions: []
                    };
                }


                log.debug("line:", line)
                amount = convertInToCurrency(amount) ? convertInToCurrency(amount) : 0
                taxAmount = convertInToCurrency(taxAmount)
                taxRate = convertInToCurrency(taxRate)


                lineDataMap[sno].tranDates.push({tranDate});
                lineDataMap[sno].taxCodes.push({taxCode});
                lineDataMap[sno].amounts.push({amount});
                lineDataMap[sno].taxAmounts.push({taxAmount});
                lineDataMap[sno].taxRates.push({taxRate});
                lineDataMap[sno].whtConditions.push({whtCondition});

            });

            Object.values(lineDataMap).forEach(value => {
                convertedPayLoad.lineData.push(value);
            });


            templateData.lineData = convertedPayLoad.lineData

            return templateData

        }

        function loadSubsidiaryBRN(internalId, templateData, pndCategory, printType) {

            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'subsidiary',
                isDynamic: true
            });

            let brnNumber = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_brn'});
            log.debug("constant_lib.colorCodeObj[printType]-", constant_lib.colorCodeObj[printType])
            let brntd
            let brnLine

            for (let i = 0; i < brnNumber.length; i++) {
                brntd += `<td margin-top="26px" border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${brnNumber[i]}</td>`
                brnLine += `<td border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">-</td>`

                //   brntd += `<td margin-top="26px" border="0.5" align="center" style="border-color:#001B54;">${brnNumber[i]}</td>`
                //  brnLine += `<td border="0.5" align="center" style="border-color:#001B54;">${brnNumber[i]}</td>`
                templateData["brnNumber"] = brntd
                templateData["brnNumberLine"] = brnLine
            }

            //log.debug("brntd", brntd)

        }

        function getPNDCoverTemplateData(isOneWorld, param, pndCategoryValue) {

            let incomeTaxPayLoad = JSON.parse(param.incomeTaxRetrunPayLoad)
            let printType = param.type

            let currentDate = new Date()
            let year = currentDate.getFullYear()

            log.debug("incomeTaxPayLoad", incomeTaxPayLoad)
            templateData = {

                ordinaryfiling: false,
                additionalfiling: false,
                jan: false,
                feb: false,
                mar: false,
                apr: false,
                may: false,
                jun: false,
                jul: false,
                aug: false,
                sep: false,
                oct: false,
                nov: false,
                dec: false,

                incomeTaxTypeCode1Count: 0,
                incomeTaxTypeCode2Count: 0,
                incomeTaxTypeCode3Count: 0,
                incomeTaxTypeCode4Count: 0,
                incomeTaxTypeCode5Count: 0,

                incomeTaxTypeCode1Income: 0,
                incomeTaxTypeCode2Income: 0,
                incomeTaxTypeCode3Income: 0,
                incomeTaxTypeCode4Income: 0,
                incomeTaxTypeCode5Income: 0,

                incomeTaxTypeCode1IncomeAfterDot: 0,
                incomeTaxTypeCode2IncomeAfterDot: 0,
                incomeTaxTypeCode3IncomeAfterDot: 0,
                incomeTaxTypeCode4IncomeAfterDot: 0,
                incomeTaxTypeCode5IncomeAfterDot: 0,


                incomeTaxTypeCode1Tax: 0,
                incomeTaxTypeCode2Tax: 0,
                incomeTaxTypeCode3Tax: 0,
                incomeTaxTypeCode4Tax: 0,
                incomeTaxTypeCode5Tax: 0,

                incomeTaxTypeCode1TaxAfterDot: 0,
                incomeTaxTypeCode2TaxAfterDot: 0,
                incomeTaxTypeCode3TaxAfterDot: 0,
                incomeTaxTypeCode4TaxAfterDot: 0,
                incomeTaxTypeCode5TaxAfterDot: 0,

                thaiYear: getThaiYear(year)
            }

            let subsidiary = incomeTaxPayLoad.subsidiary
            let subsidiaryBranch = incomeTaxPayLoad.subsidiaryBranch
            let whtTaxPeriod = incomeTaxPayLoad.whtPeriod
            let filingStatus = incomeTaxPayLoad.filingStatus
            let filingStatusText = incomeTaxPayLoad.filingStatusText
            let accountingBook = incomeTaxPayLoad.accountingBook
            let surcharge = incomeTaxPayLoad.surcharge
            let totalAttachmentPage = incomeTaxPayLoad.totalAttachmentPage

            log.debug("filingStatus1", filingStatus)

            let totalTax = 0
            let billLines = getLineData(search_lib.getBillPaymentDataForBillData(isOneWorld, subsidiary, subsidiaryBranch, whtTaxPeriod, filingStatus), pndCategoryValue, printType, templateData)

            log.debug("billLines", billLines)

            templateData["count"] = billLines.length
            templateData["totalVendor"] = getTotalVendor(billLines)

            log.debug("billLines", billLines)

            // filingStatus Mark check & additional Filing number

            filingStatusText = filingStatusText.replace(/\s/g, '');
            filingStatusText = filingStatusText.toLowerCase();
            log.debug("filingStatusText12", filingStatusText)
            let additinalFileNumber = filingStatusText.replace(/[^0-9]/g, '');
            filingStatusText = filingStatusText.replace(/[0-9]/g, "");

            log.debug("additinalFileNumber", additinalFileNumber)
            filingStatus = filingStatus.replace(additinalFileNumber, "")

            templateData[filingStatusText] = true

            templateData["additionalFilingNumber"] = additinalFileNumber
            log.debug("filingStatus", filingStatus)

            // filingStatus Mark check & additional Filing number
            // log.debug("count",count)

            if (surcharge) {
                let surcharge1 = convertInToCurrency(surcharge)
                surcharge1 = surcharge1.split(".")
                if (surcharge1.length > 1) {
                    templateData["surcharge"] = surcharge1[0]
                    templateData["surchargeAfterDot"] = surcharge1[1]
                } else {
                    templateData["surcharge"] = surcharge1
                    templateData["surchargeAfterDot"] = "00"
                }
            }

            templateData = getLineDataTotal(billLines, templateData)
            // log.debug("billLines templateData Total",templateData)
            if (templateData["totalTaxAmount"]) {
                totalTax = templateData["totalTaxAmount"]
                let totalTax1 = totalTax.split(".")

                if (totalTax1.length > 1) {
                    templateData["totalTaxAmount"] = totalTax1[0]
                    templateData["totalTaxAmountAfterDot"] = totalTax1[1]
                } else {
                    templateData["totalTaxAmount"] = totalTax1[0]
                    templateData["totalTaxAmountAfterDot"] = "00"
                }

            }
            if (templateData["totalAmount"]) {
                let totalBase = templateData["totalAmount"]
                totalBase = totalBase.split(".")

                if (totalBase.length > 1) {
                    templateData["totalAmount"] = totalBase[0]
                    templateData["totalAmountAfterDot"] = totalBase[1]
                } else {
                    templateData["totalAmount"] = totalBase[0]
                    templateData["totalAmountAfterDot"] = "00"
                }

            }
            log.debug("typeof totalTax", typeof totalTax)

            let plus23 = (Number(totalTax.replace(/,/g, "")) + Number(surcharge.replace(/,/g, ""))).toString()
            plus23 = convertInToCurrency(plus23)

            //  // plus23 = helper_lib.convertInToCurrency(plus23)
            if (plus23) {
                plus23 = plus23.split(".")

                if (plus23.length > 1) {
                    templateData["plus"] = plus23[0]
                    templateData["plusAfter0"] = plus23[1]
                } else {
                    log.debug("plus23", plus23)
                    templateData["plus"] = plus23
                    templateData["plusAfter0"] = "00"
                }

            }
            log.debug("plus23 templateData", templateData)
            isOneWorld ? loadSubsidiaryBRNNumberForPND53(subsidiary, templateData, printType) : true
            loadSubsidiaryBranchCodeForPND53(subsidiary, templateData, printType)
            // if (printType == "pnd53" || printType == "pnd53a")
            // {
            //     loadSubsidiaryBRNNumberForPND53(subsidiary, templateData,printType)
            //     loadSubsidiaryBranchCodeForPND53(subsidiary, templateData,printType)
            //     log.debug("loadSubsidiaryBRNNumberForPND53()", templateData)
            // }

            log.debug("templateData", templateData)

            if (printType == "pnd3" || printType == "pnd2" || printType == "pnd3a" || printType == "pp30") {
                isOneWorld ? loadSubsidiaryPND3(subsidiary, templateData, printType) : true
                loadSubsidiaryBranchCodePND3(subsidiaryBranch, templateData, printType)
            }

            loadTaxPeriod(whtTaxPeriod, templateData)


            return templateData

        }

        function loadSubsidiaryPND3(internalId, templateData, printType) {
            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'subsidiary',
                isDynamic: true
            });

            let brnNumber = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_brn'});
            log.debug("brnNumber-", brnNumber)
            let brntd = `<td align="center"  width="10px" height="5px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]} " > ${brnNumber[0]}</td>`
            brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`

            for (let i = 1; i < brnNumber.length; i++) {
                if (i == 1) {
                    brntd += `<td align="center" font-size="12px" width="10px" height="5px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                        ${brnNumber[i]} </td>`
                }

                if (i < 4 && i > 1) {
                    brntd += `<td align="center" font-size="12px" width="10px" height="5px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed${constant_lib.colorCodeObj[printType]}; " >
                        ${brnNumber[i]} </td>`

                } else if (i == 4) {
                    brntd += `<td align="center" font-size="12px" width="10px" height="5px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};  " >
                        ${brnNumber[i]} </td>`
                } else if (i == 5) {
                    brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`
                    brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                            ${brnNumber[i]} </td>`
                } else if (i == 6) {
                    brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};" >
                            ${brnNumber[i]} </td>`

                } else if (i > 6 && i < 10) {
                    brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                            ${brnNumber[i]} </td>`
                } else if (i == 10) {
                    brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px solid ${constant_lib.colorCodeObj[printType]}; " >
                            ${brnNumber[i]} </td>`
                } else if (i == 11) {
                    brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`

                    brntd += `	<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]};" >
                        ${brnNumber[i]}</td>`
                } else if (i > 11 && i < 12) {
                    brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                        ${brnNumber[i]}</td>`
                } else if (i == 12) {
                    brntd += `	<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                        ${brnNumber[i]}</td>`
                } else if (i == 13) {
                    brntd += `<td>-</td>
                                <td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                        ${brnNumber[i]} </td>`
                }

                templateData["brnNumber"] = brntd


            }

        }

        function loadSubsidiaryBRNNumberForPND53(internalId, templateData, printType) {

            log.debug("loadSubsidiaryBRNNumberForPND53()");

            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'subsidiary',
                isDynamic: true
            });

            let brnNumber = subsidiaryBranchObj.getText({fieldId: 'custrecord_ps_wht_brn'});

            let brntd = `h`
            log.debug("brnNumber i", brnNumber[0])
            log.debug("brnNumber i", brnNumber.length)
            brnLength = brnNumber.length


            for (let i = 0; i < brnNumber.length; i++) {

                if (i == 0) {
                    brntd += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]};  " >${brnNumber[i]}</td>`
                }

                if (i == 1) {
                    brntd += ` <td align="center" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                        
                                                        <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                            ${brnNumber[i]}
                                                        </td>`
                }
                if (i == 2) {
                    brntd += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                        </td>`
                }
                if (i == 3) {
                    brntd += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                        </td>`
                }

                if (i == 4) {
                    brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 5) {
                    brntd += `<td align="right" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                        
                                                        <td align="center" font-size="12px" width="17px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 6) {
                    brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 7) {
                    brntd += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                            ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 8) {
                    brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                            ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 9) {
                    brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 10) {
                    brntd += ` <td align="center" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                        
                                                        <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                            ${brnNumber[i]}
                                                        </td>`
                }


                if (i == 11) {
                    brntd += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right:  1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                            ${brnNumber[i]}
                                                        </td>`
                }

                if (i == 12) {
                    brntd += ` <td align="right" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                        
                                                        <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                            ${brnNumber[i]}
                                                        </td>`
                }


            }

            templateData["brnNumber"] = brntd

        }


        function loadSubsidiaryBranchCodeForPND53(internalId, templateData, printType) {
            let subsidiaryBranchObj = record.load({
                id: internalId,
                type: 'customrecord_cseg_subs_branch',
                isDynamic: true
            });

            let branchNameCode = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_code'}).toString();
            let branchName = subsidiaryBranchObj.getValue({fieldId: 'name'});

            log.debug("branchNameCode get", branchNameCode)

            let adderess1 = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr1'});
            let adderess2 = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr2'});
            let adderess3 = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr3'});
            let zipCode = subsidiaryBranchObj.getValue({fieldId: 'custrecord_ps_wht_subs_branch_zip'});
            let zipCodetd
            if (branchName) {
                branchName = branchName.split(":")
                branchName = branchName[1]
            }
            templateData["address1"] = adderess1
            templateData["address23"] = adderess2 + " " + adderess3
            templateData["branchName"] = branchName

            branchNameCodeHtml = ``

            if (branchNameCode.length == 4) {
                branchNameCodeHtml = ` <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[0]}</td>
                                                        <td align="center"  width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[1]}</td>
                                                        <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">${branchNameCode[2]}</td>
                                                        <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};">${branchNameCode[3]}</td>`
            } else if (branchNameCode.length == 5) {
                branchNameCodeHtml = ` <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[0]}</td>
                                                        <td align="center"  width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[1]}</td>
                                                        <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">${branchNameCode[2]}</td>
                                                        <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">${branchNameCode[3]}</td>
                                                        <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};">${branchNameCode[4]}</td>`
            } else {
                branchNameCodeHtml = ` <td align="center" width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">-</td>
                                                        <td align="center"  width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">-</td>
                                                        <td align="center" width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">-</td>
                                                        <td align="center" width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};">-</td>`

            }

            for (let i = 0; i < zipCode.length; i++) {

                if (i == 0) {
                    zipCodetd += ` <td align="center"  width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`
                }
                if (i > 0 && i < zipCode.length) {
                    zipCodetd += ` <td align="center"   width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`
                }
                if (i == zipCode.length - 1) {
                    zipCodetd += `  <td align="center" width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`
                }

            }

            templateData["branchCode"] = branchNameCodeHtml
            templateData["zipCode"] = zipCodetd
        }

        function getDATEINTODDMMYY(inputDate) {
            const outputFormat = 'DD/MM/YY';
            let userObj = runtime.getCurrentUser();
            let dateFormat = userObj.getPreference({name: 'DATEFORMAT'});
            dateFormat = dateFormat.replace("MONTH", "MMMM")
            dateFormat = dateFormat.replace("Month", "MMM")
            dateFormat = dateFormat.replace("Mon", "MMM")

            log.debug("check dateFormat", inputDate + "-" + dateFormat)

            const formattedDate = moment(inputDate, dateFormat).format(outputFormat);
            log.debug("check formattedDate", formattedDate)

            return formattedDate

        }

        function translateToThai(text) {
            return text
        }

        // function amountsTowords(amount) {


        //     if (amount === 0) {
        //         return 'ศูนย์บาทถ้วน';
        //     }

        //     const amountString = amount.toString();
        //     const parts = amountString.split('.');
        //     const integerPart = parseInt(parts[0]);
        //     const decimalPart = parseInt(parts[1]) || 0;

        //     // const integerWords = convertIntegerToWords(integerPart);
        //     // const decimalWords = convertDecimalToWords(decimalPart);

        //     let words = integerWords + 'บาท';
        //     if (decimalPart !== 0) {
        //         words += 'และ' + decimalWords + 'สตางค์';
        //     }

        //     return words;

        // }

        function convertIntegerToWords(integer) {

            const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ', 'สิบเอ็ด', 'สิบสอง', 'สิบสาม', 'สิบสี่', 'สิบห้า', 'สิบหก', 'สิบเจ็ด', 'สิบแปด', 'สิบเก้า'];
            const tens = ['', '', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ'];
            const scales = ['', 'พัน', 'ล้าน', 'พันล้าน', 'พันล้านล้าน', 'พันล้านล้านล้าน', 'พันล้านล้านล้านล้าน'];

            const chunks = integer.toString().match(/.{1,3}(?=(.{3})*$)/g).reverse();

            let words = '';

            for (let i = 0; i < chunks.length; i++) {
                const chunk = parseInt(chunks[i]);
                if (chunk !== 0) {
                    let chunkWords = '';
                    const hundreds = Math.floor(chunk / 100);
                    const tensAndUnits = chunk % 100;

                    if (hundreds !== 0) {
                        chunkWords += units[hundreds] + 'ร้อย';
                    }

                    if (tensAndUnits !== 0) {
                        if (tensAndUnits < 20) {
                            if (hundreds !== 0) {
                                chunkWords += 'และ';
                            }
                            chunkWords += units[tensAndUnits];
                        } else {
                            const tensDigit = Math.floor(tensAndUnits / 10);
                            const unitsDigit = tensAndUnits % 10;

                            if (hundreds !== 0) {
                                chunkWords += 'และ';
                            }
                            chunkWords += tens[tensDigit] + ' ' + units[unitsDigit];
                        }
                    }

                    chunkWords += ' ' + scales[i] + ' ';
                    words = chunkWords + words;
                }
            }

            return words.trim();
        }

        // function convertDecimalToWords(decimal) {
        //     if (decimal === 0) {
        //         return '';
        //     }

        //     const decimalWords = convertIntegerToWords(decimal);
        //     return decimalWords.replace(/ศูนย์/g, '');
        // }

        function getThaiYear(year) {
            let currentThaiYear = parseInt(year) + 543;
            return currentThaiYear
        }

        function sendAttachementEmail(renderPDFLayout, subject, body) {

            let pdfFile = render.xmlToPdf({
                xmlString: renderPDFLayout
            });

            pdfFile.name = "whtTaxCertificate.pdf";

            let emailOptions = {
                author: runtime.getCurrentUser().id,
                recipients: ["musab@point-star.com", "jasim@point-star.com"],
                subject: subject,
                body: body,
                attachments: [pdfFile]
            };

            try {
                email.send(emailOptions);
                log.debug('Email Sent', 'Email sent successfully');
            } catch (error) {
                log.error('Email Send Failed', error.message);
            }

        }

        function getTotalVendor(billLines) {

            let vendorArray = []

            for (let i = 0; i < billLines.length; i++) {

                if (vendorArray.indexOf(billLines[i].entityId) < 0) {
                    vendorArray.push(billLines[i].entityId)
                }
            }

            return vendorArray.length
        }

        function convertJsonIntoEFileContent(billLines) {
            let textFileContent = ""

            for (let i = 0; i < billLines.length; i++) {

                let date = moment(billLines[i].tranDate, "DD/MM/YY");
                let year = getThaiYear(date.year());
                let month = date.month() + 1;
                let day = date.date();

                thaiDate = day + "/" + month + "/" + year


                if (i > 0) {
                    textFileContent += "\n"
                }
                // else
                // {
                textFileContent += "|" + billLines[i].sno + "|" + billLines[i].vendorTaxId + "|00000||" + billLines[i].entityId + "|" + billLines[i].billaddressee + " |||||||" + billLines[i].billaddress1 + "||" + billLines[i].billaddress2 + "|" + billLines[i].billstate + "|" + billLines[i].billzipcode + "|" + thaiDate + "|" + billLines[i].taxCode + "|" + billLines[i].taxRate + "|" + billLines[i].amount + "|" + billLines[i].taxAmount + "|" + billLines[i].whtCondition + "||||||||||||"

                //}
                log.debug("billLines[i].entityId", billLines[i].entityId)


            }

            // let fileId  = writeFileContent(textFileContent)
            // let fileURl = getFileURL(fileId)

            return textFileContent
        }


        function getWHTCertificateTemplateData(isOneWorld, billPaymentObj, internalId, recordType) {


            if (billPaymentObj.length > 0) {

                // let vendBillInternalId = billPaymentObj[0].values["appliedToTransaction.internalid"][0].text
                let subsidiary = billPaymentObj[0].values["subsidiary.custrecord_ps_wht_brn"]
                let taxId = billPaymentObj[0].values["vendor.custentity_ps_wht_tax_id"]

                let trBrnNumber = ""

                if (isOneWorld) {
                    for (let i = 0; i < subsidiary.length; i++) {
                        trBrnNumber += '<td border="0.5" align="center">'
                        trBrnNumber += subsidiary[i]
                        trBrnNumber += '</td>'
                    }
                }


                let vendorTaxId = ""
                for (let i = 0; i < taxId.length; i++) {
                    vendorTaxId += '<td border="0.5" align="center">'
                    vendorTaxId += taxId[i]
                    vendorTaxId += '</td>'
                }

                templateData = {
                    entity: billPaymentObj[0].values.entity[0]["text"],
                    vendorAddress: billPaymentObj[0].values["vendor.address"],
                    billDate: billPaymentObj[0].values["trandate"],
                    taxCertificateNo: billPaymentObj[0].values["custbody_ps_wht_certificate_no"],
                    sequenceNumber: billPaymentObj[0].values["custbody_ps_wht_sequence_no"],
                    pnd1a: false,
                    pnd1aex: false,
                    pnd2: false,
                    pnd3: false,
                    pnd2a: false,
                    pnd3a: false,
                    pnd53: false,
                    withholdatsource: false,
                    payeverytime: false,
                    payonetime: false,
                    other: false,
                    trBrnNumber: trBrnNumber,
                    vendorTaxId: vendorTaxId
                }
                if (billPaymentObj[0].values.custbody_ps_wht_condition.length > 0) {
                    let psWHtCondition = billPaymentObj[0].values.custbody_ps_wht_condition[0]["text"]
                    psWHtCondition = psWHtCondition.replace(/\s/g, '');
                    psWHtCondition = psWHtCondition.replace(/\./g, "");
                    psWHtCondition = psWHtCondition.toLowerCase();
                    templateData[psWHtCondition] = true
                }
                // helper_lib.loadVendBill(vendBillInternalId,templateData)
                templateData = getPaidAndTaxAmounts(internalId, templateData, recordType)
            }
            return templateData
        }

        function getFileURL(fileId) {
            fileUrl = file.load({
                id: fileId
            }).url;
            return fileUrl
        }

        function writeFileContent(textFileContent) {
            let fileName = 'textfile.txt';

            let fileObj = file.create({
                name: fileName,
                fileType: file.Type.PLAINTEXT,
                contents: textFileContent,
                encoding: file.Encoding.UTF8,
                folder: "-15",
                isOnline: true
            });
            let fileId = fileObj.save();
            log.debug('Text File Saved', 'File ID: ' + fileId);
            return fileId

        }

        function cleanInventoryValuationData(json) {
            let jsonArray = []


            for (var i = 0; i < json.length; i++) {
                // log.debug("json-"+i,json[i].values)
                if (!json[i].values["locationnohierarchy"]) {
                    continue
                }
                let itemLocation = (json[i].values["locationnohierarchy"] ? json[i].values["locationnohierarchy"][0]["text"] : "_") + (" _ " + json[i].values["item"] ? json[i].values["item"][0]["value"] : "_")
                jsonArray.push({
                    itemLocation: itemLocation,
                    location: json[i].values["locationnohierarchy"] ? json[i].values["locationnohierarchy"][0]["text"] : "_",
                    // item                : `${json[i].values["item"] ? json[i].values["item"][0]["text"] : "_"}`,
                    itemValue: `${json[i].values["item"] ? json[i].values["item"][0]["value"] : "_"}`,
                    itemName: `${json[i].values["item"] ? json[i].values["item"][0]["text"] : "_"}`,
                    tranDate: json[i].values["trandate"],
                    tranId: json[i].values["tranid"],
                    documentType: json[i].values["type"] ? json[i].values["type"][0]["text"] : "_",
                    referenceNumber: (json[i].values["type"] ? json[i].values["type"][0]["text"] : "_").replace(/\s/g, '').toUpperCase(),
                    quantity: json[i].values["quantity"],
                    rate: json[i].values["rate"],
                    amount: json[i].values["amount"],
                    debitAmount: json[i].values["debitamount"],
                    creditAmount: json[i].values["creditamount"],
                    type: json[i].values["formulatext"],
                    cumulativeAmount: json[i].values["formulatext_1"],
                    cumulativeQuantity: json[i].values["formulatext_2"],
                    cumulativeRate: (parseFloat(json[i].values["formulatext_1"]) / parseInt(json[i].values["formulatext_2"]).toFixed(2)),

                })
            }

            return jsonArray
        }

        function cleanOpeningBalanceData(json) {
            let jsonArray = []

            //log.debug("json",json[0].values)
            for (var i = 0; i < json.length; i++) {
                let itemLocation = (json[i].values["GROUP(item)"] ? json[i].values["GROUP(item)"][0]["text"] : "_") + (" _ " + json[i].values["GROUP(locationnohierarchy)"] ? json[i].values["GROUP(locationnohierarchy)"] : "None")
                jsonArray.push({
                    location: json[i].values["GROUP(locationnohierarchy)"] ? json[i].values["GROUP(locationnohierarchy)"] : "None",
                    itemName: `${json[i].values["GROUP(item)"] ? json[i].values["GROUP(item)"][0]["text"] : "_"}`,
                    itemValue: `${json[i].values["GROUP(item)"] ? json[i].values["GROUP(item)"][0]["value"] : "_"}`,
                    quantity: json[i].values["SUM(quantity)"],
                    rate: (parseFloat(json[i].values["SUM(formulanumeric)"]) / parseInt(json[i].values["SUM(quantity)"])).toFixed(2),
                    amount: parseFloat(json[i].values["SUM(formulanumeric)"]).toFixed(2),

                })
            }


            return jsonArray
        }

        function margeBothSavedSearchData(inventoryValuationData, openingBalance) {
            for (var i = 0; i < inventoryValuationData.length; i++) {
                let location = inventoryValuationData[i].location
                let itemValue = inventoryValuationData[i].itemValue

                // log.debug("warehouseItem",inventoryValuationData[i])

                var warehouseItem = openingBalance.find(function (element) {
                    return element.location === location && element.itemValue === itemValue;
                });
                //log.debug("warehouseItem",warehouseItem)
                if (warehouseItem) {
                    inventoryValuationData[i]["openingQuantity"] = warehouseItem.quantity
                    inventoryValuationData[i]["openingAmount"] = warehouseItem.amount ? warehouseItem.amount : 0
                    inventoryValuationData[i]["openingRate"] = (parseFloat(warehouseItem.amount ? warehouseItem.amount : 0) / parseInt(warehouseItem.quantity)).toFixed(2)
                } else {
                    inventoryValuationData[i]["openingQuantity"] = 0
                    inventoryValuationData[i]["openingAmount"] = 0
                    inventoryValuationData[i]["openingRate"] = 0
                }

            }
            //log.debug("inventoryValuationData",inventoryValuationData)
            // log.debug("openingBalance",openingBalance)

            return inventoryValuationData

        }

        function createDataSetForInventoryValuationReport(array1) {
            let finalArray = [];
            let jsonFinal = []
            log.debug("length", array1.length)

            // Create a helper function to find or create a warehouse item entry in the final array
            function findOrCreateWarehouseItem(location, itemValue, itemName, openingQuantity, openingAmount, openingRate) {
                let warehouseItem = finalArray.find(function (entry) {
                    return entry.location === location && entry.itemValue === itemValue;
                });

                if (!warehouseItem) {

                    warehouseItem = {
                        location: location,
                        itemValue: itemValue,
                        itemName: itemName,
                        openingQuantity: openingQuantity,
                        openingAmount: openingAmount,
                        openingRate: openingRate,
                        transactionDetail: []
                    };

                    finalArray.push(warehouseItem);
                }


                return warehouseItem;
            }

            // Iterate over the initial array and transform the data
            for (var i = 0; i < array1.length; i++) {
                let entry = array1[i];
                let location = entry.location;
                let itemValue = entry.itemValue;
                let itemLocation = entry.itemLocation;
                let openingQuantity = parseInt(entry.openingQuantity);
                let openingAmount = parseFloat(entry.openingAmount ? entry.openingAmount : 0);
                let openingRate = (openingAmount / openingQuantity ? openingAmount / openingQuantity : 0).toFixed(2);
                let itemName = entry.itemName

                let warehouseItem = findOrCreateWarehouseItem(location, itemValue, itemName, openingQuantity, openingAmount, openingRate);


                if (warehouseItem.transactionDetail.length > 0) {
                    openingQuantity = warehouseItem.transactionDetail[warehouseItem.transactionDetail.length - 1].openingQuantity
                    openingAmount = warehouseItem.transactionDetail[warehouseItem.transactionDetail.length - 1].openingAmount ? warehouseItem.transactionDetail[warehouseItem.transactionDetail.length - 1].openingAmount : 0
                    openingRate = warehouseItem.transactionDetail[warehouseItem.transactionDetail.length - 1].openingRate ? warehouseItem.transactionDetail[warehouseItem.transactionDetail.length - 1].openingRate : 0
                    // log.debug("qty-"+i, openingQuantity)
                    //  log.debug("qty-"+i, warehouseItem.transactionDetail[warehouseItem.transactionDetail.length-1])
                }

                let tranDetailQuantity = Number(openingQuantity) + Number(entry.quantity)
                let tranDetailAmount = Number(openingAmount) + Number(entry.amount)
                let tranDetailRate = 0
                if (tranDetailAmount == 0) {
                    tranDetailRate = 0
                } else {
                    tranDetailRate = tranDetailAmount / tranDetailQuantity
                }

                var transactionDetail = {
                    location: location,
                    itemValue: itemValue,
                    tranDate: entry.tranDate,
                    tranId: entry.tranId,
                    documentType: entry.documentType,
                    referenceNumber: entry.referenceNumber,
                    quantity: entry.quantity,
                    rate: entry.rate,
                    amount: entry.amount,
                    debitAmount: entry.debitAmount,
                    creditAmount: entry.creditAmount,

                    rateInCurrency: convertInToCurrency(entry.rate),
                    amountInCurrency: convertInToCurrency(entry.amount),
                    debitAmount: entry.debitAmount,
                    creditAmount: entry.creditAmount,

                    type: entry.type,
                    cumulativeAmount: entry.cumulativeAmount,
                    cumulativeQuantity: entry.cumulativeQuantity,
                    cumulativeRate: entry.cumulativeRate,
                    openingQuantity: tranDetailQuantity,
                    openingAmount: tranDetailAmount.toFixed(2),
                    openingRate: tranDetailRate.toFixed(2),

                    openingAmountInCurrency: convertInToCurrency(tranDetailAmount.toFixed(2)),
                    openingRateInCurrency: convertInToCurrency(tranDetailRate.toFixed(2))


                };


                warehouseItem.transactionDetail.push(transactionDetail);

            }


            return finalArray


        }

        function getTotalByIncomeTaxTypeForPND2(templateData) {
            for (let key in templateData) {
                if (key.indexOf("incomeTaxTypeCode") >= 0 && key.indexOf("Count") < 0 && key.indexOf("AfterDot") < 0) {
                    // log.debug("check number",key)
                    log.debug("check number " + key, templateData[key])

                    templateData[key] = convertInToCurrency(templateData[key])
                    let valueAfterSplit = (templateData[key].toString()).split(".")
                    if (valueAfterSplit.length > 0) {
                        let firstTwoNumber = valueAfterSplit[1].slice(0, 2);
                        templateData[key + "AfterDot"] = firstTwoNumber
                        templateData[key] = valueAfterSplit[0]
                    } else {
                        templateData[key + "AfterDot"] = "00"
                    }
                }
            }

            return templateData
        }


        function CalculateTaxAmountANDCountTotalForPND2(templateData) {

            templateData["incomeTaxTypeCodeTotalCount"] = 0
            templateData["incomeTaxTypeCodeTotalTax"] = 0
            templateData["incomeTaxTypeCodeTotalIncome"] = 0

            templateData["incomeTaxTypeCodeTotalTaxAfterDot"] = 0
            templateData["incomeTaxTypeCodeTotalIncomeAfterDot"] = 0

            for (let key in templateData) {
                if (key.startsWith("incomeTaxTypeCode") && key.endsWith("Count") && key.indexOf("Total") < 0) // totalCount
                {
                    templateData["incomeTaxTypeCodeTotalCount"] = templateData["incomeTaxTypeCodeTotalCount"] + templateData[key]
                    log.debug("check log " + key, templateData["incomeTaxTypeCodeTotalCount"])
                } else if (key.startsWith("incomeTaxTypeCode") && key.endsWith("Income") && key.indexOf("Total") < 0) // totalCount
                {
                    templateData["incomeTaxTypeCodeTotalIncome"] = templateData["incomeTaxTypeCodeTotalIncome"] + templateData[key]
                } else if (key.startsWith("incomeTaxTypeCode") && key.endsWith("Tax") && key.indexOf("Total") < 0) // totalCount
                {
                    templateData["incomeTaxTypeCodeTotalTax"] = templateData["incomeTaxTypeCodeTotalTax"] + templateData[key]
                }
            }

            //templateData["incomeTaxTypeCodeTotalIncome"] = convertInToCurrency(templateData["incomeTaxTypeCodeTotalIncome"])
            //templateData["incomeTaxTypeCodeTotalTax"] = convertInToCurrency(templateData["incomeTaxTypeCodeTotalTax"])


            return templateData
        }

        function createReversalJournalEntry(data, paymentAmount, customerPaymentId, recordType, debitAcc, creditAcc, billId) {

            try {

                log.debug("billId: ", billId);

                let totalAmountBeforeVat = 0


                let transactionObj = record.load({
                    type: 'vendorbill',
                    id: billId,
                    isDynamic: false
                });


                let sublist = transactionObj.getLineCount({sublistId: 'item'}) > 0 ? 'item' :
                    transactionObj.getLineCount({sublistId: 'expense'}) > 0 ? 'expense' : ""

                let sublistCount = transactionObj.getLineCount({sublistId: sublist})
                log.debug("sublistCount: ", sublistCount)


                for (var i = 0; i < sublistCount; i++) {

                    let amount = parseFloat(isNull(transactionObj.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'amount',
                        line: i
                    })));

                    log.debug("amount " + i, amount)

                    totalAmountBeforeVat = totalAmountBeforeVat + amount

                }

                log.debug("totalAmountBeforeVat: ", totalAmountBeforeVat)

                log.debug("Journal entry data : ", data);

                var journalEntry = record.create({
                    type: record.Type.JOURNAL_ENTRY,
                    isDynamic: true
                });

                journalEntry.setValue({
                    fieldId: 'memo',
                    value: 'Reverse Undue VAT'
                });


                journalEntry.setValue({
                    fieldId: 'trandate',
                    value: new Date()
                });


                journalEntry.setValue({
                    fieldId: 'custbody_ps_wht_related_transaction',
                    value: customerPaymentId
                    // value: data.internalid
                });


                journalEntry.setValue({
                    fieldId: 'custbody_ps_wht_filing_status',
                    value: data.filingstatus
                });

                journalEntry.setValue({
                    fieldId: 'cseg_subs_branch',
                    value: data.subsidiarybranch
                });

                journalEntry.setValue({
                    fieldId: 'custbody_ps_wht_vendor',
                    value: data.entity
                });

                journalEntry.setValue({
                    fieldId: 'custbody_ps_wht_total_bill_amt_bef_vat',
                    value: totalAmountBeforeVat
                });


                // Create debit line
                journalEntry.selectNewLine('line');

                journalEntry.setCurrentSublistValue('line', 'account', creditAcc);
                // journalEntry.setCurrentSublistValue('line', 'class', jouralEntryProjectId);
                journalEntry.setCurrentSublistValue('line', 'credit', paymentAmount);

                journalEntry.commitLine('line');

                // Create credit line
                journalEntry.selectNewLine('line');

                journalEntry.setCurrentSublistValue('line', 'account', debitAcc);
                // journalEntry.setCurrentSublistValue('line', 'class', jouralEntryProjectId);
                journalEntry.setCurrentSublistValue('line', 'debit', paymentAmount);

                journalEntry.commitLine('line');

                let journalEntryId = journalEntry.save({enableSourcing: true, ignoreMandatoryFields: true});
                log.debug("journalEntryId: ", journalEntryId);

                if (journalEntryId) {
                    transactionObj.setValue('custbody_ps_wht_ref_journal_entry', journalEntryId)

                    transactionObj.save({enableSourcing: true, ignoreMandatoryFields: true});

                }

                return journalEntryId;

            } catch (e) {
                log.error("Error in createReversalJournalEntry()", e)
            }

        }


        function isReversalJournalChecked(vatCodeOnTransaction) {

            let customrecord_ps_tht_wht_tax_codeSearchObj = search.create({
                type: "customrecord_ps_tht_wht_tax_code",
                filters: [
                    ["name", "is", vatCodeOnTransaction]
                ],
                columns: [
                    "custrecord_ps_wht_include_auto_journal"
                ]
            });


            log.debug("whtTaxCode", vatCodeOnTransaction);


            let results = customrecord_ps_tht_wht_tax_codeSearchObj.run().getRange({start: 0, end: 1000});
            log.debug("results", results);


            let isReversalJournalFldChecked = false

            for (let i = 0; i < results.length; i++) {
                isReversalJournalFldChecked = results[i].getValue({name: 'custrecord_ps_wht_include_auto_journal'});
            }

            log.debug("isReversalJournalFldChecked: ", isReversalJournalFldChecked);

            return isReversalJournalFldChecked

        }


        function checkVatTaxCodeOnTransaction(internalId, type) {

            log.debug(" checkVatTaxCodeOnTransaction()");
            log.debug(" internalId", internalId);
            log.debug(" type", type);


            let transObj = record.load({
                type: type,
                id: internalId,
                isDynamic: true
            });

            let taxCodeApplied = '';

            let itemsSublistCount = transObj.getLineCount({
                sublistId: 'item'
            });

            let expenseSublistCount = transObj.getLineCount({
                sublistId: 'expense'
            });


            let taxCodeOnItemsSublist = itemsSublistCount > 0 ? checkIfVatCodeExist(transObj, 'item') : false
            let taxCodeOnExpenseSublist = expenseSublistCount > 0 ? checkIfVatCodeExist(transObj, 'expense') : false


            if (taxCodeOnItemsSublist) {
                taxCodeApplied = taxCodeOnItemsSublist
            } else if (taxCodeOnExpenseSublist) {
                taxCodeApplied = taxCodeOnExpenseSublist
            }

            log.debug("taxCodeApplied : ", taxCodeApplied);

            return taxCodeApplied

        }

        function checkStandardVatTaxCodeOnTransaction(internalId, type) {
            try {


                log.debug(" checkStandardVatTaxCodeOnTransaction()");
                log.debug(" internalId", internalId);
                log.debug(" type", type);


                let transObj = record.load({
                    type: type,
                    id: internalId,
                    isDynamic: true
                });

                let taxCodeApplied = '';

                let itemsSublistCount = transObj.getLineCount({
                    sublistId: 'item'
                });

                let expenseSublistCount = transObj.getLineCount({
                    sublistId: 'expense'
                });


                let taxCodeOnItemsSublist = itemsSublistCount > 0 ? checkIfStandardVatCodeExist(transObj, 'item') : false
                let taxCodeOnExpenseSublist = expenseSublistCount > 0 ? checkIfStandardVatCodeExist(transObj, 'expense') : false


                if (taxCodeOnItemsSublist) {
                    taxCodeApplied = taxCodeOnItemsSublist
                } else if (taxCodeOnExpenseSublist) {
                    taxCodeApplied = taxCodeOnExpenseSublist
                }

                log.debug("taxCodeApplied : ", taxCodeApplied);

                return taxCodeApplied

            } catch (e) {
                log.error("Error in checkStandardVatTaxCodeOnTransaction()", e)
            }

        }


        function checkIfStandardVatCodeExist(billRecord, sublist) {

            log.debug("checkIfStandardVatCodeExist()");

            let vatTaxCodeApplied = '';

            let totalLines = billRecord.getLineCount({
                sublistId: sublist
            });

            for (let i = 0; i < totalLines; i++) {

                let vatTaxCode = billRecord.getSublistValue(sublist, 'taxcode', i);

                log.debug("vatTaxCode: ", vatTaxCode);

                if (vatTaxCode == undueCodeAR || vatTaxCode == undueCodeAP) {
                    vatTaxCodeApplied = vatTaxCode

                    return vatTaxCodeApplied
                }

            }

            log.debug("vatTaxCodeApplied : ", vatTaxCodeApplied);

            return vatTaxCodeApplied

        }


        function checkIfVatCodeExist(billRecord, sublist) {

            let vatTaxCodeApplied = '';

            let totalLines = billRecord.getLineCount({
                sublistId: sublist
            });

            for (let i = 0; i < totalLines; i++) {

                let vatTaxCode = billRecord.getSublistText(sublist, whtTaxCodeFld, i);

                log.debug("vatTaxCode: ", vatTaxCode);

                if (vatTaxCode == 'TH Undue Output VAT') {
                    vatTaxCodeApplied = vatTaxCode

                    return vatTaxCodeApplied
                }

            }

            log.debug("vatTaxCodeApplied : ", vatTaxCodeApplied);

            return vatTaxCodeApplied

        }


        function splitTransactionDetailIfMoreThen20(inputArray, maxTransactionDetailPerObject) {

            const finalArray = [];

            // Function to create a new object with limited transactionDetail entries
            function createNewObject(baseObj, details) {
                const newObject = {
                    ...baseObj,
                    transactionDetail: details
                };

                // Set a flag for the last transactionDetail entry in the new object
                newObject.transactionDetail.forEach((detail, index) => {
                    detail.lastDetailFlag = index === newObject.transactionDetail.length - 1;
                });

                return newObject;
            }

            let prevItemValue = null;
            let prevLocation = null;

            inputArray.forEach((entry, index) => {
                const {itemValue, location, openingAmount, openingRate, transactionDetail, ...baseObject} = entry;
                let nextItemValue = null;
                let nextLocation = null;

                if (index < inputArray.length - 1) {
                    nextItemValue = inputArray[index + 1].itemValue;
                    nextLocation = inputArray[index + 1].location;
                }

                if ((itemValue !== prevItemValue || location !== prevLocation) && finalArray.length > 0) {
                    // Add a flag outside the transactionDetail array when itemValue or location changes
                    finalArray[finalArray.length - 1].itemValueChanged = true;
                }

                prevItemValue = itemValue;
                prevLocation = location;

                if (transactionDetail.length <= maxTransactionDetailPerObject) {
                    // If the transactionDetail array has 2 or fewer entries, use the original object
                    finalArray.push({
                        ...baseObject,
                        itemValueChanged: false,
                        location,
                        openingAmountInCurrency: convertInToCurrency(openingAmount),
                        openingRateInCurrency: convertInToCurrency(openingRate),
                        transactionDetail: [...transactionDetail]
                    });
                } else {
                    // If there are more than 2 entries, split them into multiple objects
                    for (let i = 0; i < transactionDetail.length; i += maxTransactionDetailPerObject) {
                        const chunk = transactionDetail.slice(i, i + maxTransactionDetailPerObject);
                        const newObject = createNewObject({
                            ...baseObject,
                            location,
                            openingAmountInCurrency: convertInToCurrency(openingAmount),
                            openingRateInCurrency: convertInToCurrency(openingRate),
                        }, chunk);
                        newObject.itemValueChanged = false;
                        finalArray.push(newObject);
                    }
                }

                if (itemValue !== nextItemValue || location !== nextLocation) {
                    // Set lastFlag for the last transactionDetail entry if next itemValue or location is different
                    finalArray[finalArray.length - 1].transactionDetail[finalArray[finalArray.length - 1].transactionDetail.length - 1].lastFlag = true;
                }
            });

            return finalArray;


        }


        function getWhtConditionActualName(internalId) {

            try {

                var recordType = 'customrecord_ps_tht_wht_condition';
                var fieldId = 'custrecord_ps_wht_actual_name';

                var customRecord = record.load({
                    type: recordType,
                    id: internalId,
                    isDynamic: false
                });

                if (customRecord) {
                    var actualName = customRecord.getValue({
                        fieldId: fieldId
                    });
                    return actualName;
                }

                return null;
            } catch (e) {
                log.error("Error in getWhtConditionActualName()");
            }
        }

        function getInternalIdByActualName(actualName) {

            var recordType = 'customrecord_ps_tht_wht_condition';
            var fieldId = 'custrecord_ps_wht_actual_name';

            var customRecordSearch = search.create({
                type: recordType,
                columns: ['internalid'],
                filters: [
                    search.createFilter({
                        name: fieldId,
                        operator: search.Operator.IS,
                        values: actualName
                    })
                ]
            });

            var searchResult = customRecordSearch.run().getRange({start: 0, end: 1});

            if (searchResult && searchResult.length > 0) {
                return searchResult[0].getValue({name: 'internalid'});
            }

            return null;
        }


        function getVatRegistrationNoFromEntity(entityId) {

            var entitySearchObj = search.create({
                type: "entity",
                filters:
                    [
                        ["internalid", "anyof", entityId]
                    ],
                columns:
                    [
                        "custentity_ps_wht_vat_registration_no"
                    ]
            });


            let results = entitySearchObj.run().getRange({
                start: 0,
                end: 1000
            });

            let vatRegistrationNo;


            for (let i in results) {
                vatRegistrationNo = results[i].getValue('custentity_ps_wht_vat_registration_no')
            }

            log.debug("vatRegistrationNo", vatRegistrationNo);

            return vatRegistrationNo

        }


        function getCreditAccountFromTaxCode(isSuiteTaxEnabled, taxcode) {
            log.debug("in getCreditAccountFromTaxCode()");
            log.debug("isSuiteTaxEnabled", isSuiteTaxEnabled);

            try {

                if (isSuiteTaxEnabled) {

                    var salestaxitemSearchObj = search.create({
                        type: "salestaxitem",
                        filters:
                            [
                                ["internalid", "anyof", taxcode]
                            ],
                        columns:
                            [
                                "internalid",
                                search.createColumn({
                                    name: "receivablesaccount",
                                    join: "taxType"
                                })
                            ]
                    });

                    let results = salestaxitemSearchObj.run().getRange({start: 0, end: 1000});

                    log.debug("results", results);
                    log.debug("results.length", results.length);


                    let accountCredit;

                    for (var i = 0; i < results.length; i++) {

                        accountCredit = results[i].getValue({name: "receivablesaccount", join: "taxType"});

                    }


                    log.debug("accountCredit", accountCredit);


                    return accountCredit
                } else {
                    var salestaxitemSearchObj = search.create({
                        type: "salestaxitem",
                        filters:
                            [
                                ["internalid", "anyof", taxcode]
                            ],
                        columns:
                            [
                                "purchaseaccount",
                                "saleaccount"
                            ]
                    });

                    let results = salestaxitemSearchObj.run().getRange({start: 0, end: 1000});

                    log.debug("results", results);
                    log.debug("results.length", results.length);


                    let accountCredit;

                    for (var i = 0; i < results.length; i++) {

                        accountCredit = results[i].getValue({name: "purchaseaccount"});

                    }


                    log.debug("accountCredit", accountCredit);


                    return accountCredit
                }

            } catch (e) {
                log.error("Error in getCreditAccountFromTaxCode()", e);
            }
        }

        function getConfigurationRecordFields() {

            try {
                var customrecord_ps_tht_wht_configurationSearchObj = search.create({
                    type: "customrecord_ps_tht_wht_configuration",
                    filters:
                        [
                            ["custrecord_ps_wht_ispreferred", "is", "T"]
                        ],
                    columns:
                        [
                            "custrecord_ps_wht_enable_undue_je",
                            "custrecord_ps_wht_enable_pnd54",
                            "custrecord_ps_wht_suitetax_enabled",
                            "custrecord_ps_wht_international_tax_bndl",
                            "custrecord_ps_wht_undue_taxcode",
                            "custrecord_ps_wht_undue_debit_account"

                        ]
                });

                let results = customrecord_ps_tht_wht_configurationSearchObj.run().getRange({
                    start: 0,
                    end: 1
                });

                log.debug("results.length", results.length);

                let fieldsObj = [];

                for (var i = 0; i < results.length; i++) {

                    fieldsObj = {
                        'custrecord_ps_wht_enable_undue_je': results[i].getValue('custrecord_ps_wht_enable_undue_je'),
                        'custrecord_ps_wht_enable_pnd54': results[i].getValue('custrecord_ps_wht_enable_pnd54'),
                        'custrecord_ps_wht_suitetax_enabled': results[i].getValue('custrecord_ps_wht_suitetax_enabled'),
                        'custrecord_ps_wht_international_tax_bndl': results[i].getValue('custrecord_ps_wht_international_tax_bndl'),
                        'custrecord_ps_wht_undue_taxcode': results[i].getValue('custrecord_ps_wht_undue_taxcode'),
                        'custrecord_ps_wht_undue_debit_account': results[i].getValue('custrecord_ps_wht_undue_debit_account')
                    }
                }


                log.audit("ConfigurationRecord|checkboxValues:::", fieldsObj);

                return fieldsObj;
            } catch (error) {
                log.error({
                    title: 'Error in getConfigurationRecordFields()',
                    details: error.message,
                });
                return null;
            }
        }


        function getpreferredBranchSubsidiary(subsidiaryInternalId) {

            try {

                let subsidiaryBranchArray = []
                let customrecord_cseg_subs_branchSearchObj = search.create({
                    type: "customrecord_cseg_subs_branch",
                    filters:
                        [

                            ["custrecord_ps_wht_subs_brn_filterby_subs", "anyof", subsidiaryInternalId]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "internalid"}),
                        ]
                });

                let searchResultCount = customrecord_cseg_subs_branchSearchObj.runPaged().count;

                if (searchResultCount == 1) {

                    customrecord_cseg_subs_branchSearchObj.run().each(function (searchItem) {

                        subsidiaryBranchArray.push(searchItem.getValue({name: "internalid"}));

                        return true;
                    });

                    return subsidiaryBranchArray[0]

                } else {
                    return ""
                }

            } catch (e) {
                log.error("Error in getpreferredBranchSubsidiary()", e)
            }

        }


        function setPartialNetAmntFieldsForSuiteTax(transObj, whtTaxRate, sublist, line, isSuiteTaxEnabled, csvContext) {

            try {

                let partialAmount = transObj.getSublistValue({
                    sublistId: sublist,
                    fieldId: 'custcol_wht_partial_payment_amount',
                    line: line
                });

                let grossAmt = transObj.getSublistValue({
                    sublistId: sublist,
                    fieldId: 'grossamt',
                    line: line
                });

                let amount = transObj.getSublistValue({
                    sublistId: sublist,
                    fieldId: 'amount',
                    line: line
                });

                log.debug("amount: " + amount + " | grossAmt" + grossAmt);
                log.debug("grossAmt - amount", grossAmt - amount);
                log.debug("grossAmt - amount / amount", (grossAmt - amount) / amount);
                log.debug("(grossAmt - amount) * 100 / amount", (grossAmt - amount) * 100 / amount);

                if (!partialAmount) {
                    return
                }

                let vatTaxRate = 0;

                if (isSuiteTaxEnabled) {
                    log.debug("in if(isSuiteTaxEnabled)", (isSuiteTaxEnabled))
                    vatTaxRate = (grossAmt - amount) * 100 / amount
                } else {
                    vatTaxRate = (transObj.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'taxrate1',
                        line: line
                    }));
                }


                log.debug("vatTaxRate", vatTaxRate)
                log.debug("whtTaxRate", whtTaxRate)
                let denominator = 1 + (vatTaxRate / 100);
                log.debug("denominator", denominator)
                let denominator1 = partialAmount / denominator;
                log.debug("denominator1", denominator1)
                // let rateAmnt = parseFloat(whtTaxRate.replace('%', ''));
                // log.debug("rateAmnt", rateAmnt)
                let denominator2 = denominator1 * (whtTaxRate / 100)
                log.debug("denominator2", denominator2)

                // let partialTaxAmount = parseFloat (denominator2)

                let taxAmount = parseFloat(denominator2);
                let partialNetAmount = partialAmount - taxAmount

                log.debug("taxAmount", taxAmount)
                log.debug("check partialNetAmount", partialNetAmount)

                if (isSuiteTaxEnabled) {
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_apply_partial_payments',
                        value: true,
                        line: line
                    })
                    //transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_partial_wht_amount', value: taxAmount, line: line });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                        value: parseFloat(taxAmount).toFixed(4),
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                        value: parseFloat(taxAmount).toFixed(4),
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_net_amount',
                        value: convertInToCurrency(parseFloat(partialNetAmount).toFixed(4)),
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_net_amount',
                        value: '',
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_tax_amount',
                        value: '',
                        line: line
                    });
                    // transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_related_vat_rate', value: parseInt(vatTaxRate), line: line });

                } else if (!isSuiteTaxEnabled && csvContext == "CSVIMPORT") {
                    log.debug("in (!isSuiteTaxEnabled && csvContext)")

                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_apply_partial_payments',
                        value: true,
                        line: line
                    })
                    //transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_partial_wht_amount', value: taxAmount, line: line });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                        value: parseFloat(taxAmount).toFixed(4),
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                        value: parseFloat(taxAmount).toFixed(4),
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_net_amount',
                        value: convertInToCurrency(parseFloat(partialNetAmount).toFixed(4)),
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_net_amount',
                        value: '',
                        line: line
                    });
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_tax_amount',
                        value: '',
                        line: line
                    });
                    // transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_related_vat_rate', value: parseInt(vatTaxRate), line: line });


                } else if (!isSuiteTaxEnabled && csvContext != "CSVIMPORT") {
                    transObj.setSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                        value: parseFloat(taxAmount).toFixed(4),
                        line: line
                    });
                }

            } catch (e) {
                log.error("Error in setPartialNetAmntFieldsForSuiteTax()", e);
            }
        }

        function setFullNetAmntFieldsForSuiteTax(transObj, whtTaxRate, grossAmount, sublist, line, isSuiteTaxEnabled, csvContext) {
            try {

                transObj.setSublistValue({
                    sublistId: sublist,
                    fieldId: 'custcol_ps_wht_tax_rate',
                    value: parseFloat(whtTaxRate).toFixed(2),
                    line: line
                });

                log.debug("amount:--" + line, grossAmount); //amount

                let remainingAmount = isNullReturnEmpty(transObj.getSublistValue({
                    sublistId: sublist,
                    fieldId: 'custcol_ps_wht_remaining_amount',
                    line: line
                }));
                log.debug("remainingAmount:--" + line, remainingAmount);

                remainingAmount = remainingAmount === '' ? remainingAmount : parseFloat(remainingAmount)

                log.debug("csvContext: ", csvContext);
                log.debug("isSuiteTaxEnabled: ", isSuiteTaxEnabled)

                if (isSuiteTaxEnabled) {

                    if (remainingAmount === 0) {

                        log.debug("isSuiteTaxEnabled|remainingAmount === 0");

                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: '',
                            line: line
                        });


                    } else if (remainingAmount == '' || remainingAmount > 0) {

                        log.debug("isSuiteTaxEnabled|remainingAmount === ''");

                        // let taxAmount = (parseFloat(whtTaxRate) / 100) * grossAmount;

                        //added after JK production issue on 19dec. wht tax calculating from after vat

                        let amount = transObj.getSublistValue({
                            sublistId: sublist,
                            fieldId: 'amount',
                            line: line
                        });

                        let taxAmount = (parseFloat(whtTaxRate) / 100) * amount;

                        let grossAmt = transObj.getSublistValue({
                            sublistId: sublist,
                            fieldId: 'grossamt',
                            line: line
                        });

                        log.debug("grossAmt:--" + line, grossAmt); //gross amount

                        let vatTax = grossAmt - amount; //gross - amount
                        log.debug("vatTax:--" + line, vatTax);

                        log.debug("actualAmount - taxAmount:", grossAmount - taxAmount);
                        log.debug("'custcol_ps_wht_tax_amount':", taxAmount);

                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_net_amount',
                            value: grossAmount - taxAmount,
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_tax_amount',
                            value: taxAmount,
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: parseFloat(taxAmount).toFixed(4),
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                            value: '',
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_wht_partial_payment_amount',
                            value: '',
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_net_amount',
                            value: '',
                            line: line
                        });
                        // transObj.setSublistValue({ sublistId: sublist, fieldId: 'custcol_ps_wht_related_vat_rate', value: parseInt((vatTax/grossAmount)*100), line: line });


                    }
                } else if (!isSuiteTaxEnabled && csvContext == "CSVIMPORT") {
                    log.debug("in (!isSuiteTaxEnabled && csvContext)")

                    if (remainingAmount === 0) {

                        log.debug("remainingAmount === 0");

                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: '',
                            line: line
                        });


                    } else if (remainingAmount == '' || remainingAmount > 0) {

                        log.debug("remainingAmount === ''");

                        let netAmount = 0;

                        let amount = transObj.getSublistValue({sublistId: sublist, fieldId: 'amount', line: line});
                        netAmount = amount

                        let taxAmount = (parseFloat(whtTaxRate) / 100) * netAmount


                        let grossAmt = transObj.getSublistValue({
                            sublistId: sublist,
                            fieldId: 'grossamt',
                            line: line
                        });

                        log.debug("grossAmt:--" + line, grossAmt); //gross amount

                        let vatTax = grossAmt - amount; //gross - amount
                        log.debug("vatTax:--" + line, vatTax);

                        log.debug("actualAmount - taxAmount:", grossAmount - taxAmount);
                        log.debug("'custcol_ps_wht_tax_amount':", taxAmount);

                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_net_amount',
                            value: grossAmount - taxAmount,
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_tax_amount',
                            value: taxAmount,
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: parseFloat(taxAmount).toFixed(4),
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_new',
                            value: '',
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_wht_partial_payment_amount',
                            value: '',
                            line: line
                        });
                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_net_amount',
                            value: '',
                            line: line
                        });

                    }

                } else if (!isSuiteTaxEnabled && csvContext != "CSVIMPORT") {
                    log.debug("in (!isSuiteTaxEnabled && !csvContext)")
                    if (remainingAmount === 0) {

                        log.debug("remainingAmount === 0");

                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: '',
                            line: line
                        });


                    } else if (remainingAmount == '' || remainingAmount > 0) {


                        log.debug("remainingAmount === ''");

                        let netAmount = 0;

                        ////-----commented this after the issue | nfm and tax amount field was not same. (nfm considering gross)


                        // if (grossAmount) {
                        //     netAmount = grossAmount
                        // }
                        // else {

                        let amount = transObj.getSublistValue({sublistId: sublist, fieldId: 'amount', line: line});
                        netAmount = amount
                        // }

                        let taxAmount = (parseFloat(whtTaxRate) / 100) * netAmount

                        transObj.setSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_ps_wht_partial_wht_amount_nfm',
                            value: parseFloat(taxAmount).toFixed(4),
                            line: line
                        });

                    }
                }

            } catch (e) {
                log.error("Error in setFullNetAmntFieldsForSuiteTax()", e);
            }
        }

        function convertInToCurrency(amount) {


            if (amount == NaN || amount == null || !amount) {
                return "0"
            }


            let myFormat = formati.getCurrencyFormatter({currency: "USD"});
            let newCur = myFormat.format({
                number: Number(amount)
            });

            newCur = newCur.replace("$", "")
            newCur = newCur.replace("US", "")
            return newCur

        }


        function clearSublistRateAndAmountField(currentRec, lineAmountFld, finalAmount, sublistId) {

            try {


                currentRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'rate', value: 0});
                currentRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'amount', value: 0});

            } catch (e) {
                log.error("Error in clearSublistRateAndAmountField()", e);
            }

        }

        function clearAllSublistWHTField(currentRec, sublistId) {
            try {
                clearWhtFields(currentRec, sublistId)
                clearPartialAmountFields(currentRec, sublistId)
                clearRateAndRemainingAmountFields(currentRec, sublistId)
            } catch (e) {
                log.error("Error in clearAllSublistWHTField()", e);
            }

        }


        function getValueByKey(keyToFind, array) {

            try {

                for (let i = 0; i < array.length; i++) {
                    const obj = array[i];
                    if (obj.hasOwnProperty(keyToFind)) {
                        return obj[keyToFind];
                    }
                }
                // Return a default value (if needed) if the key is not found
                return undefined; // or any other default value you prefer

            } catch (e) {
                log.error("Error in getValueByKey()", e)
            }
        }

        function getFormId() {

            try {
                var customrecord_ps_tht_wht_configurationSearchObj = search.create({
                    type: "customrecord_ps_tht_wht_configuration",
                    filters:
                        [
                            ["custrecord_ps_wht_ispreferred", "is", "T"]
                        ],
                    columns:
                        [
                            "internalid",
                            search.createColumn({
                                name: "custrecord_ps_th_record_type",
                                join: "CUSTRECORD_PS_TH_CONFIGURATION"
                            }),
                            search.createColumn({
                                name: "custrecord_ps_th_trans_form",
                                join: "CUSTRECORD_PS_TH_CONFIGURATION"
                            })
                        ]
                });


                let results = customrecord_ps_tht_wht_configurationSearchObj.run().getRange({start: 0, end: 1000});

                log.debug("results", results);
                log.debug("results.length", results.length);

                const fieldsObj = []
                let type;

                for (var i = 0; i < results.length; i++) {

                    log.debug("i", i);

                    type = results[i].getText({
                        name: "custrecord_ps_th_record_type",
                        join: "CUSTRECORD_PS_TH_CONFIGURATION"
                    });


                    fieldsObj.push({
                        [type]: results[i].getValue({
                            name: "custrecord_ps_th_trans_form",
                            join: "CUSTRECORD_PS_TH_CONFIGURATION"
                        })
                    })

                    log.audit("ConfigurationRecord|FormIds:::", fieldsObj);
                }


                log.audit("ConfigurationRecord|FormIds:::", fieldsObj);

                return fieldsObj;
            } catch (error) {
                log.error({
                    title: 'Error retrieving Form Ids values',
                    details: error.message,
                });
                return null;
            }

        }


        function getAllThaiTaxCodes() {

            try {

                log.debug("in getAllThaiTaxCodes()");


                let customrecord_ps_tht_wht_tax_codeSearchObj = search.create({
                    type: "customrecord_ps_tht_wht_tax_code",
                    filters:
                        [],
                    columns:
                        [
                            search.createColumn({
                                name: "name",
                                sort: search.Sort.ASC,
                                label: "Name"
                            }),
                            search.createColumn({name: "custrecord_ps_wht_taxcode_ap_item", label: "AP Item"}),
                            search.createColumn({name: "custrecord_ps_wht_taxcode_ar_item", label: "AR Item"})
                        ]
                }).runPaged({pageSize: 1000})

                let savedSearchData = getAllResults(customrecord_ps_tht_wht_tax_codeSearchObj)
                var apItemValues = JSON.parse(JSON.stringify(savedSearchData)).map(item => item.values.custrecord_ps_wht_taxcode_ap_item.map(apItem => apItem.value));
                var flattenedApItemValues = [].concat(...apItemValues);


                return flattenedApItemValues;
            } catch (e) {
                log.error("Error in getAllThaiTaxCodes()", e);
            }

        }


        return {
            getValueByKey,
            getFormId,
            getSubsidiary,
            getpreferredBranchSubsidiary,
            getPaymentAmount,
            setBillPaymentAmount,
            getWhtTaxAmount,
            getWhtTaxAmountForVatLines,
            getVatAmountFromTransaction,
            setBillPaymentHeaderFields,
            getBillDate,
            getTransactionType,
            getTransactionLinesPayload,
            getBillOrInvoiceData,
            createQueueRecord,
            parseDate,
            formatDate,
            formatNumberWithCommas,
            convertToNetsuiteDateFormat,
            openRecInNewWindow,
            isNull,
            isNullReturnEmpty,
            isUndefined,
            isPartialAmountProvided,
            isPartialPaymentChecked,
            getSubsidaryBranch,
            getRecordsList,
            getTaxLineFieldValues,
            calculateRemainingAmountFull,
            calculateRemainingAmountPartial,
            setRemainingAmountOnBill,
            clearTaxFields,
            clearLineFieldsOnCopyContextOfNewRecord,
            updateBillPaymentAmountFull,
            updateBillPaymentAmountPartial,
            getItemId,
            updateQueueStatus,
            getRecordsToProcess,
            removeBillCreditLines,
            setBillCreditLines,
            // setCheckCreditLines,
            reSelectApplyCheckboxToApplyCredit,
            calculateAndSetWhtFields,
            clearPartialAmountFields,
            setPartialNetAmntFieldsForSuiteTax,
            setFullNetAmntFieldsForSuiteTax,
            clearRateAndRemainingAmountFields,
            clearAllSublistWHTField,
            calculateAndSetWhtPartialPayment,
            clearWhtFields,
            clearSublistRateAndAmountField,
            setPartialAmountFields,
            getTaxRate,
            calculateRemainingBillAmount,
            checkRelatedBillCredits,
            getThaiTaxTransactions,
            ispnd3TransactionAvailable,
            getRelatedBillCredit,
            deleteVendorCreditFromPayment,
            reCalculateAndSetRemainingAmountOnBill,
            updateRemainingAmountOfBill,
            disableSublistColumn,
            checkIfWhtCodeExist,
            checkIfWhtCodeExistBody,
            checkIfWhtCodeExistOnTransaction,
            getBillTaxCode,
            getWhtCategory,
            getLastSequenceNo,
            updateWhtTaxJobRecord,
            getMonthlyBillPaymentsCount,
            getLastDayOfMonth,
            convertToDigits,
            convertDateToNetSuiteFormat,
            compileDate,
            splitDate,
            generateCertificateNo,
            getTaxPeriod,
            addTaxItemsToItemSublistOfCheckOrCashSale,
            addTaxItemsToExpenseSublistOfCheck,
            updateDataInQueueRecord,
            isTransactionAvailable,
            getPndCategory,
            getPndCategoryOptimized,
            getQueueId,
            checkTaxCodeExpiry,
            calculateAndSetSequenceAndCertificateNo,
            createReversalJournalEntry,
            checkVatTaxCodeOnTransaction,
            checkStandardVatTaxCodeOnTransaction,
            isReversalJournalChecked,
            checkIfVatCodeExist,
            getWhtConditionActualName,
            getInternalIdByActualName,
            getVatRegistrationNoFromEntity,
            getConfigurationRecordFields,
            getCreditAccountFromTaxCode,
            getAllThaiTaxCodes,
            /* Musabs functions-----------start----> */
            //  addAssetsDataSource: addAssetsDataSource,
            //  renderHtmlContent: renderHtmlContent,
            loadTaxPeriod: loadTaxPeriod,
            loadVendBill: loadVendBill,
            getPaidAndTaxAmounts: getPaidAndTaxAmounts,
            loadSubsidiaryBranchCode: loadSubsidiaryBranchCode,
            loadSubsidiaryBranchCodePND3: loadSubsidiaryBranchCodePND3,
            convertInToCurrency: convertInToCurrency,
            getLineData: getLineData,
            getLineDataTotal: getLineDataTotal,
            getPNDAttachmentTemplateData: getPNDAttachmentTemplateData,
            getPNDCoverTemplateData: getPNDCoverTemplateData,
            getWHTCertificateTemplateData: getWHTCertificateTemplateData,
            // amountsTowords: amountsTowords,
            sendAttachementEmail: sendAttachementEmail,
            isNull: isNull,
            createDataSetForInventoryValuationReport: createDataSetForInventoryValuationReport,
            mergeBothSavedSearchData: margeBothSavedSearchData,
            cleanOpeningBalanceData: cleanOpeningBalanceData,
            cleanInventoryValuationData: cleanInventoryValuationData,
            getTotalByIncomeTaxTypeForPND2: getTotalByIncomeTaxTypeForPND2,
            CalculateTaxAmountANDCountTotalForPND2: CalculateTaxAmountANDCountTotalForPND2,
            splitTransactionDetailIfMoreThen20: splitTransactionDetailIfMoreThen20
            /* Musabs functions-----------end----> */
        }
    });
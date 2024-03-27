/**
 * @NApiVersion 2.1 
 * @NScriptType ClientScript
 */

define(['N/ui/dialog', 'N/url', 'N/search', 'N/record', 'N/ui/message', 'N/https', 'N/currentRecord', 'N/runtime', './lib/helper_lib.js'],
    function (dialog, url, search, record, message, http, currentRec, runtime, helperLib) {



        function pageInit(context) {

            try {

            console.log("page init!!! ");

            return true 

            }
            catch(e){
                log.error("Error in PageInit",e)
            }

        }   

        function createPartialPaymentOnClick(recordId, sublist) {

            try {
            console.log("createPartialPaymentOnClick()!");

            console.log("button clicked!");

            
                log.audit("checking : load()")

                 let makePayment = helperLib.isPartialAmountProvided(recordId, sublist, 'vendorbill')

                    if (makePayment) {

                         startLoader()
                         setTimeout(function () {
                         
                             console.log("after click...");
                        
                           let billPaymentId = createPartialBillPayment(recordId)
                           helperLib.openRecInNewWindow('vendorpayment', billPaymentId)
                          var element = document.getElementById("spinner")
                          element.classList.remove("loader")
                          document.getElementById("modalheader").innerHTML = 'Payment Created Successfully!'

                         return true

                         
                        

                          }, 3000)
                     
                    }
                    else {
                      

                        alert("Please enter partial amount value!");
                        return false
                    } 

                }
                catch(e){
                    log.error("Error in createPartialPaymentOnClick()",e)
                }
        }

        function createPartialCustomerPaymentOnClick(recordId, sublist) {

            try {

            console.log("createPartialCustomerPaymentOnClick()!");
            console.log("button clicked!");

                log.audit("checking : load()")
               

                    let makePayment = helperLib.isPartialAmountProvided(recordId, sublist, 'invoice')

                    if (makePayment) {

                        startLoader()

                       setTimeout(function () {
                         let customerPayment = createPartialCustomerPayment(recordId)
                        helperLib.openRecInNewWindow('customerpayment', customerPayment)

                        var element = document.getElementById("spinner")
                        element.classList.remove("loader")
                        document.getElementById("modalheader").innerHTML = 'Payment Created Successfully!'

                        return true

                          }, 3000)
                       
                    }

                    else 
                    {
                        alert("Please enter partial amount value!");
                        return false
                    }
                }
                catch(e){
                    log.error("Error in createPartialCustomerPaymentOnClick()",e)
                }
        }
        
        
     

        function createPartialBillPayment(billId) {
            
            try {

            console.log("createPartialBillPayment()!");
            console.log("billId", billId);

            var billPaymentRecord = record.transform({
                fromType: "vendorbill",
                fromId: billId,
                toType: "vendorpayment",
                isDynamic: true,
            });

            // Fetch the currency from the original bill record
            var billRecord = record.load({
                type: "vendorbill",
                id: billId,
            });
            var billCurrency = billRecord.getValue({
                fieldId: "currency",
            });

            console.log("billCurrency", billCurrency)

            let paymentCurrency1 = billPaymentRecord.getValue('currency');

            console.log("paymentCurrency1", paymentCurrency1)

            //   Set the currency in the bill payment record
            billPaymentRecord.setValue({
                fieldId: "currency",
                value: billCurrency,
            });

            let paymentCurrency2 = billPaymentRecord.getValue('currency');

            console.log("paymentCurrency2", paymentCurrency2)

            console.log("billPaymentRecord transform", billPaymentRecord);
            log.debug("billPaymentRecord", billPaymentRecord)


            billPaymentRecord.setValue({
                fieldId: "currency",
                value: billCurrency,
            });

            var applyLineCount = billPaymentRecord.getLineCount({
                sublistId: 'apply'
            });

            
            console.log("applyLineCount", applyLineCount)

            for (var i = 0; i < applyLineCount; i++) {  

                let currentBillId = billPaymentRecord.getSublistValue('apply', 'doc', i);

                console.log(`i |billID | currentBillId ${i} ${billId} ${currentBillId}`);

                if(billId == currentBillId){

                    billPaymentRecord.selectLine('apply',i)

                    billPaymentRecord.setCurrentSublistValue('apply','apply',true);
        
                    billPaymentRecord.commitLine('apply')


                    break;
                }

            }

            var billPaymentId = billPaymentRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
            console.log("billPaymentId", billPaymentId)
            log.debug("billPaymentId", billPaymentId)
            // helperLib.openRecInNewWindow('vendorpayment', billPaymentId)
            return billPaymentId

            }
            catch(e){
                log.error("Error in createPartialBillPayment()",e)
            }
                
 
        }

        function createPartialCustomerPayment(invoiceId) {

            try {

            console.log("createPartialCustomerPayment()!");
            console.log("invoiceId", invoiceId);

            var customerPaymentRecord = record.transform({
                fromType: "invoice",
                fromId: invoiceId,
                toType: "customerpayment",
                isDynamic: true,
            });

            // Fetch the currency from the original bill record
            var invoiceRecord = record.load({
            type: "invoice",
            id: invoiceId,
            });

            var invoiceCurrency = invoiceRecord.getValue({
                fieldId: "currency",
            });

            // Set the currency in the payment customer record
            customerPaymentRecord.setValue({
                fieldId: "currency",
                value: invoiceCurrency,
            });

            console.log("customerPaymentRecord transform", customerPaymentRecord);

        
            var applyLineCount = customerPaymentRecord.getLineCount({
                sublistId: 'apply'
            });


            for (var i = 0; i < applyLineCount; i++) {

                let currentInvoiceId = customerPaymentRecord.getSublistValue('apply', 'doc', i);

                console.log("currentInvoiceId", currentInvoiceId);

                if(invoiceId == currentInvoiceId){

                    customerPaymentRecord.selectLine('apply',i)

                    customerPaymentRecord.setCurrentSublistValue('apply','apply',true);
        
                    customerPaymentRecord.commitLine('apply')

                }
            }


            var customerPaymentId = customerPaymentRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

            console.log("customerPaymentId", customerPaymentId)

            log.debug("customerPaymentId", customerPaymentId)
            // helperLib.openRecInNewWindow('vendorpayment', customerPaymentId)
            return customerPaymentId

            }
            catch(e){
                log.error("Error in createPartialCustomerPayment()",e)
            }
        }

           
        function startLoader() {
            try {
                
            var element = document.getElementById("spinner")
            element.classList.add("loader")

            var modalButton = document.getElementById("btn_modalopen");
            modalButton.click();

            return true
            }
            catch(e){
                log.error("Error in startLoader()",e)
            }
        }
       

        

        return {
            pageInit,
            createPartialPaymentOnClick,
            createPartialCustomerPaymentOnClick
        };

    }


);


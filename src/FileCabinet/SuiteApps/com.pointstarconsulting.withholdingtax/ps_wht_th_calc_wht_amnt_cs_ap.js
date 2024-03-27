        /** 
         * @NApiVersion 2.1 
         * @NScriptType ClientScript
         * @NModuleScope public  
         */
     

        define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/search', 'N/log', 'N/runtime', './lib/helper_lib.js'],
            function(currentRecord, nsRecord, dialog, search, log, runtime, helper_lib) {


                let whtTaxCodeFld = 'custcol_ps_wht_tax_code';
                let lineAmountFld = 'grossamt';
                let isApplyWhtPartialAmountFld = 'custcol_ps_wht_apply_partial_payments';
                let whtBillLineNoFld = 'custcol_ps_wht_bill_line_no';
                var configurationRecordFields = ''
                var isSuiteTaxEnabled = ''
  

                function pageInit(context) {
                    console.log("Page init!"); 
                    
                    try {

                    configurationRecordFields = helper_lib.getConfigurationRecordFields(); 
                    isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled;

                    let subsidiaryBranchFld = context.currentRecord.getField({fieldId: 'cseg_subs_branch'});
                    console.log('subsidiaryField: ',subsidiaryBranchFld);
                
                    subsidiaryBranchFld.isMandatory = true;

                    // document.getElementById("inpt_cseg_subs_branch6").attributes["required"] = true;
 
                }
                
                catch (e){
                    log.error("Error in Page Init!");
                }
                    
                } 

                function fieldChanged(context) {
                    let currentRec = currentRecord.get();
                    var currentRec2 = context.currentRecord; //withholding me loop wale kam k lye 
                    let sublistId = context.sublistId;
                    let fldId = context.fieldId;
                    var line = context.line;
    
 
                    try {

                         
                        if (currentRec.type !== 'vendorbill' && currentRec.type !== 'check' && currentRec.type !== 'vendorcredit') return;


                        // if (runtime.executionContext === runtime.ContextType.USER_INTERFACE || runtime.executionContext == "CSVIMPORT") {

                            // log.debug("in fieldChange.. ");

                            // console.log("runtime.executionContext ",runtime.executionContext );
                            // log.debug("runtime.executionContext ",runtime.executionContext );
                            
                        if ((sublistId === 'item' || sublistId === 'expense') && fldId === whtTaxCodeFld) {
                            
                            let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                            let taxCodeText = currentRec.getCurrentSublistText(sublistId, whtTaxCodeFld);
                            let isTaxCodeExpired = helper_lib.checkTaxCodeExpiry(taxCode)
    
                            if (isTaxCodeExpired) {
                                dialog.alert({
                                    title: 'Tax code expired!',
                                    message: 'Tax Code "' + taxCodeText + '" used on line no : ' + (line + 1) + ' is expired!'
                                })
                                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxCodeFld, value: '' });
                                return; 
                            }       

 
                            if(isSuiteTaxEnabled && currentRec.type !== 'check'){
                            return
                            }

                           
                            let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                            let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);
                            let whtCondition = currentRec.getValue('custbody_ps_wht_condition');
                            let baseAmount = parseFloat(helper_lib.isNull(currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_cond_base_amount')));
                            let lineAmount = parseFloat(currentRec.getCurrentSublistValue(sublistId, lineAmountFld));
                            let whtConditionName = helper_lib.getWhtConditionActualName(whtCondition);

                            console.log('whtConditionName', whtConditionName);
                            console.log('taxCode', taxCode);
                            console.log('taxCodeText', taxCodeText);


                            console.log('!taxCode', !taxCode);

                            if (!taxCode) {
                                console.log('in condition :  if (!taxCode)');
                            helper_lib.clearAllSublistWHTField(currentRec, sublistId)
                                return;
                            }

                            // if(taxCodeText=='TH Undue Output VAT'){
                            //     dialog.alert({
                            //         title: 'Incorrect Tax Code!',
                            //         message: "Tax Code '"+ taxCodeText + "' can not be used on AP transactions.."
                            //     })
                            //     currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxCodeFld, value: '' });
                            //     return;
                            // }

 
                            if (whtConditionName == 'payeverytime' || whtConditionName == 'payonetime') {
                                console.log("baseAmount", baseAmount);
                                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_ps_wht_cond_base_amount', value: baseAmount });
                            
                            }

                            if (whtConditionName == 'withholdatsource') {
                                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_ps_wht_cond_base_amount', value: '' });
                            }
 
                            

                            isPartialPayment ?
                                helper_lib.calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) :
                                helper_lib.calculateAndSetWhtFields(currentRec, sublistId, taxRate)

                      


                        } 
                        else if ((sublistId === 'item' || sublistId === 'expense') && fldId === 'custcol_wht_partial_payment_amount') {

                            let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                            let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                            let partialAmount = (currentRec.getCurrentSublistValue(sublistId, 'custcol_wht_partial_payment_amount'));
                            let remainingAmount = helper_lib.isNullReturnEmpty(currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_remaining_amount'));
                            let grossAmnt = currentRec.getCurrentSublistValue(sublistId, 'grossamt');
                            let amount;

                            amount =  grossAmnt ? grossAmnt : currentRec.getCurrentSublistValue(sublistId, 'amount')

                            if (remainingAmount) {  //added after isNullReturnEmpty() applied
                                let value = remainingAmount.toString().replace(/,/g, "")
                                remainingAmount = parseFloat(value)
                            }  

                            console.log("remainingAmount parsed", remainingAmount);
                            console.log("partialAmount", partialAmount);

                            if(isSuiteTaxEnabled){
                       
                                if (partialAmount > amount) {
                                    alert("Partial amount can not be greater than the gross amount!")
                                    helper_lib.clearPartialAmountFields(currentRec, sublistId)
                                    return
                                } else if (remainingAmount === '' || partialAmount <= remainingAmount) {
                                    helper_lib.clearWhtFields(currentRec, sublistId)
                                } else {
                                    alert("Partial amount exceeding the remaining amount!")
                                    helper_lib.clearPartialAmountFields(currentRec, sublistId)
                                    return
                                }  
                            }
                            else{

                            if (partialAmount === '') {
                                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount_new', value: '' });
                                return;
                            }

                            if (partialAmount == 0) {
                                helper_lib.setPartialAmountFields(currentRec, sublistId, taxRate, partialAmount)
                                helper_lib.clearWhtFields(currentRec, sublistId)
                            } else if (partialAmount > amount) {
                               
                                alert("Partial amount can not be greater than the gross amount!")
                                helper_lib.clearPartialAmountFields(currentRec, sublistId)
                                return
                            } else if (remainingAmount === '' || partialAmount <= remainingAmount) {
                                console.log("else if (remainingAmount === '' || partialAmount <= remainingAmount)");
                                helper_lib.setPartialAmountFields(currentRec, sublistId, taxRate, partialAmount)
                                helper_lib.clearWhtFields(currentRec, sublistId)
                            } else {
                                alert("Partial amount exceeding the remaining amount!")
                                helper_lib.clearPartialAmountFields(currentRec, sublistId)
                                return
                            }

                        }
                        } 
                        else if ((sublistId === 'item' || sublistId === 'expense') && fldId === isApplyWhtPartialAmountFld) {

                            if(isSuiteTaxEnabled && currentRec.type !== 'check'){
                                return
                                }
    

                            let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                            let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                            let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);
                            let remainingAmount = helper_lib.isNullReturnEmpty(currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_remaining_amount'));

                            if (remainingAmount) {
                                let value = remainingAmount.toString().replace(/,/g, "")
                                remainingAmount = parseFloat(value)
                            }

                            if (!!isPartialPayment) {
                                helper_lib.clearWhtFields(currentRec, sublistId)
                            } else {
                                if (remainingAmount !== '' && remainingAmount >= 0) {
                                    alert("Partial Payment Already Created. You can not create full payment.");
                                    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: isApplyWhtPartialAmountFld, value: true });
                                    helper_lib.clearWhtFields(currentRec, sublistId)
                                } else {
                                    helper_lib.clearPartialAmountFields(currentRec, sublistId);
                                    helper_lib.calculateAndSetWhtFields(currentRec, sublistId, taxRate);
                                }
                            }

                        } 
                        else if ((sublistId === 'item' || sublistId === 'expense') && (fldId === 'grossamt' ||  fldId === 'amount' || fldId === 'rate' || fldId === 'quantity')) {

                            if(isSuiteTaxEnabled && currentRec.type !== 'check'){
                                return
                                }

                                
                            let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                            let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                            let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);

                            if (!taxCode) return {}

                            isPartialPayment ?
                                helper_lib.calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) :
                                helper_lib.calculateAndSetWhtFields(currentRec, sublistId, taxRate)


                        } 
                        else if ((sublistId === 'item' || sublistId === 'expense') && fldId === 'custcol_ps_wht_cond_base_amount') {

                            let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                            let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                            let whtCondition = currentRec.getValue('custbody_ps_wht_condition');
                            let baseAmount = parseFloat(currentRec.getCurrentSublistValue(sublistId, fldId));
                            let amount = parseFloat(currentRec.getCurrentSublistValue(sublistId, lineAmountFld));
                            let whtConditionName = helper_lib.getWhtConditionActualName(whtCondition);

                            console.log('whtConditionName', whtConditionName);
                            console.log("taxCode", taxCode);
                            console.log("taxRate", taxRate);
                            console.log("whtCondition", whtCondition);

                            if (!taxCode) return

                            if (whtConditionName == 'payeverytime') { //PayEveryTime
                                let taxRateAmt = parseFloat(taxRate.replace('%', ''));
                                let denominator = 100 - taxRateAmt;
                                let finalAmount = (baseAmount / denominator) * 100;
                                console.log("taxRateAmt", taxRateAmt);
                                console.log("denominator", denominator);
                                console.log("finalAmount", finalAmount);
                              
                                helper_lib.clearSublistRateAndAmountField(currentRec, lineAmountFld, finalAmount, sublistId)
                                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "amount", value: finalAmount });
                               
                            } 
                            else if (whtConditionName == 'payonetime') { //PayOneTime
                                let taxRateAmt = parseFloat(taxRate.replace('%', ''));
                                let taxRateAfterDivision = taxRateAmt / 100;
                                let taxPlusWhtRate = 1 + taxRateAfterDivision; //100% + WHT rate
                                let finalAmount = baseAmount * taxPlusWhtRate
                                console.log("taxRateAmt", taxRateAmt);
                                console.log("taxRateAfterDivision", taxRateAfterDivision);
                                console.log("taxPlusWhtRate", taxPlusWhtRate);
                                console.log("finalAmount", finalAmount);
                               
                                helper_lib.clearSublistRateAndAmountField(currentRec, lineAmountFld, finalAmount, sublistId)

                               // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: lineAmountFld, value: finalAmount });
                                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "amount", value: finalAmount });
        
                               
        
        
                            }
                                
                                


                        } 
                        else if (fldId === 'custbody_ps_wht_condition') {

                        
                            let whtCondition = currentRec.getValue('custbody_ps_wht_condition');
                            console.log("whtCondition", whtCondition);
                            
                            let whtConditionName = helper_lib.getWhtConditionActualName(whtCondition);
                            console.log('whtConditionName', whtConditionName);
                    

                            let itemSublistCount = currentRec.getLineCount({ sublistId: 'item' });
                            let expenseSublistCount = currentRec.getLineCount({ sublistId: 'expense' });

                            console.log("itemSublistCount",itemSublistCount);
                            console.log("expenseSublistCount",expenseSublistCount);

                            let sublistId = '';
``
                            sublistId = (itemSublistCount > 0) ? 'item' : ((expenseSublistCount > 0) ? 'expense' : undefined);
                            console.log("sublistId",sublistId);

                            if (whtConditionName == 'payeverytime' || whtConditionName == 'payonetime' && sublistId) {

                                var lineCount = nlapiGetLineItemCount(sublistId);

                                for (var i = 0; i < lineCount; i++) {

                                    currentRec2.selectLine({ sublistId:sublistId, line: i });
                                    currentRec2.setCurrentSublistValue({ sublistId:sublistId, fieldId: 'rate', value: '0' });
                                    currentRec2.setCurrentSublistValue({ sublistId:sublistId, fieldId: 'amount', value: '0' });
                                    currentRec2.commitLine({ sublistId: sublistId });
                                }

                                nlapiDisableLineItemField(sublistId, 'custcol_ps_wht_cond_base_amount', false)
                                nlapiDisableLineItemField(sublistId, lineAmountFld, true)
                                nlapiDisableLineItemField(sublistId, 'rate', true)
                                nlapiDisableLineItemField(sublistId, 'quantity', true)
                                nlapiSetCurrentLineItemValue(sublistId,lineAmountFld,'')
                                nlapiSetCurrentLineItemValue(sublistId,'rate','')
                            
                            } else if (whtConditionName == 'withholdatsource' && sublistId)  {

                                var lineCount = nlapiGetLineItemCount(sublistId);

                                for (var i = 0; i < lineCount; i++) {
        
                                    currentRec2.selectLine({ sublistId:sublistId, line: i });
                                    currentRec2.setCurrentSublistValue({ sublistId:sublistId, fieldId: 'custcol_ps_wht_cond_base_amount', value: '' });
                                    currentRec2.commitLine({ sublistId: sublistId });
                                }

                                nlapiDisableLineItemField(sublistId, 'custcol_ps_wht_cond_base_amount', true)
                                nlapiDisableLineItemField(sublistId, lineAmountFld, false)
                                nlapiDisableLineItemField(sublistId, 'rate', false)
                                nlapiDisableLineItemField(sublistId, 'quantity', false)
                                nlapiSetCurrentLineItemValue(sublistId,'custcol_ps_wht_cond_base_amount','')
                                
                            }

                        } 
                        else if (fldId == 'trandate') {

                            if(isSuiteTaxEnabled){
                                return;
                            }

                            let tranDate = currentRec.getValue('trandate')
                            let taxPeriod = helper_lib.getTaxPeriod(tranDate);

                            currentRec.setValue('custbody_ps_wht_tax_period', taxPeriod)
                        }



                        
                        // }



    
                    } catch (e) {
                        log.error({ title: 'Error executing fieldChanged:', details: e });
                    }



                }


                function postSourcing(context) {

                    try {
                    let currentRec = currentRecord.get();
                    let sublistId = context.sublistId;
                    let fldId = context.fieldId;
                    var line = context.line;

                    console.log("post sourcing...");
                
                    if ((sublistId === 'item' || sublistId === 'expense') && fldId === 'taxcode' && !isSuiteTaxEnabled) {

                    
                            let taxCode = currentRec.getCurrentSublistValue(sublistId, 'taxcode');
                            let whtTaxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                            let taxRate = currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_tax_rate');
                            let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);
                            let grossAmount = currentRec.getCurrentSublistValue(sublistId, 'grossamt');

                            console.log("taxCode (standard)",taxCode);
                            console.log("taxRate",taxRate);
                            console.log("grossAmount",grossAmount);
                            console.log("isPartialPayment",isPartialPayment);
                            console.log("whtTaxCode",whtTaxCode);
                            console.log("(!whtTaxCode)",(!whtTaxCode));

                            if (!taxCode) return {} 
                            if (!whtTaxCode) return {} 
                            

                            isPartialPayment ?
                                helper_lib.calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) :
                                helper_lib.calculateAndSetWhtFields(currentRec, sublistId, taxRate)

                
                        }
                    }
                    catch(e){
                        log.error("Error in PostSourcing",e)
                    }
                }
            


                return {
                   pageInit: pageInit,
                   fieldChanged: fieldChanged,
                   postSourcing : postSourcing
                
                };

            }
        );
/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/search', 'N/log', 'N/ui/message', './lib/helper_lib.js'],
    function(currentRecord, nsRecord, dialog, search, log, message, helper_lib) {


        let whtTaxCodeFld = 'custcol_ps_wht_tax_code';
        let lineAmountFld = 'grossamt';
        let isApplyWhtPartialAmountFld = 'custcol_ps_wht_apply_partial_payments';
        let whtBillLineNoFld = 'custcol_ps_wht_bill_line_no';
        var configurationRecordFields = ''
        var isSuiteTaxEnabled = ''
 
 
        function pageInit(context) { 

            try {

            

            console.log("Page init!");   

            configurationRecordFields = helper_lib.getConfigurationRecordFields(); 
            isSuiteTaxEnabled = configurationRecordFields.custrecord_ps_wht_suitetax_enabled;
            }

            catch(e){
                log.error("Error in PageInit",e);
            }

             } 


        function fieldChanged(context) {
            let currentRec = currentRecord.get();
            var currentRec2 = context.currentRecord; //withholding me loop wale kam k lye 
            let sublistId = context.sublistId;
            let fldId = context.fieldId;
            var line = context.line;
 
            try {
                if (currentRec.type !== 'invoice' && currentRec.type !== 'cashsale' && currentRec.type !== 'creditmemo') return;

                if ((sublistId === 'item') && fldId === whtTaxCodeFld) {
                    
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
                    
 
                    if(isSuiteTaxEnabled){
                        return
                        }
                   
                    let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                    let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);
                    let whtCondition = currentRec.getValue('custbody_ps_wht_condition');
                    let baseAmount = parseFloat(helper_lib.isNull(currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_cond_base_amount')));
                    let whtConditionName = helper_lib.getWhtConditionActualName(whtCondition);

                    console.log('whtConditionName', whtConditionName);

                    console.log('taxCode', taxCode);

                    if (!taxCode) {
                      helper_lib.clearAllSublistWHTField(currentRec, sublistId)
                        return;
                    } 


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

                } else if ((sublistId === 'item') && fldId === 'custcol_wht_partial_payment_amount') {

                    let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                    let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                    let partialAmount = (currentRec.getCurrentSublistValue(sublistId, 'custcol_wht_partial_payment_amount'));
                    let remainingAmount = helper_lib.isNullReturnEmpty(currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_remaining_amount'))
                    let grossAmnt = currentRec.getCurrentSublistValue(sublistId, 'grossamt');
                    let amount;

                    amount =  grossAmnt ? grossAmnt : currentRec.getCurrentSublistValue(sublistId, 'amount')

                    if (remainingAmount) {
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
                            helper_lib.setPartialAmountFields(currentRec, sublistId, taxRate, partialAmount)
                            helper_lib.clearWhtFields(currentRec, sublistId)
                        } else {
                            alert("Partial amount exceeding the remaining amount!")
                            helper_lib.clearPartialAmountFields(currentRec, sublistId)
                            return
                        }   
                    }

                   

                } else if ((sublistId === 'item') && fldId === isApplyWhtPartialAmountFld && !isSuiteTaxEnabled) {

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


                } else if ((sublistId === 'item') && (fldId === 'grossamt' || fldId === 'rate' || fldId === 'quantity') && !isSuiteTaxEnabled) {

                    let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                    let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                    let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);

                    if (!taxCode) return

                    isPartialPayment ?
                        helper_lib.calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) :
                        helper_lib.calculateAndSetWhtFields(currentRec, sublistId, taxRate)

 
                } else if ((sublistId === 'item') && fldId === 'custcol_ps_wht_cond_base_amount') {

                    let taxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                    let taxRate = taxCode ? helper_lib.getTaxRate(taxCode) : '';
                    let whtCondition = currentRec.getValue('custbody_ps_wht_condition');
                    let baseAmount = parseFloat(currentRec.getCurrentSublistValue(sublistId, fldId));
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
                
                else if (fldId == 'subsidiary')
                {
                  let subsidiary = currentRec.getValue(fldId)
                  let preferredBranchCode = helper_lib.getpreferredBranchSubsidiary(subsidiary)
      
                  console.log("preferredBranchCode", preferredBranchCode)
                 
                  if (preferredBranchCode) {
                    currentRec.setValue({ fieldId: 'cseg_subs_branch', value: preferredBranchCode });
                  }
      
                }   
            




            } catch (e) {
                log.error({ title: 'Error executing fieldChanged:', details: e });
            }

        }


        function postSourcing(context) {
            let currentRec = currentRecord.get();
            let sublistId = context.sublistId;
            let fldId = context.fieldId; 
            var line = context.line;

            try{

             if ((sublistId === 'item' || sublistId === 'expense') && fldId === 'taxcode' && !isSuiteTaxEnabled) {

            
                    let taxCode = currentRec.getCurrentSublistValue(sublistId, 'taxcode');
                    let whtTaxCode = currentRec.getCurrentSublistValue(sublistId, whtTaxCodeFld);
                    let taxRate =  currentRec.getCurrentSublistValue(sublistId, 'custcol_ps_wht_tax_rate');
                    let isPartialPayment = currentRec.getCurrentSublistValue(sublistId, isApplyWhtPartialAmountFld);
                    let grossAmount = currentRec.getCurrentSublistValue(sublistId, 'grossamt');

                    console.log("taxCode (standard)",taxCode);
                    console.log("taxRate",taxRate);
                    console.log("grossAmount",grossAmount);

                    if (!taxCode) return {} 
                    if (!whtTaxCode) return {} 
                    

                    isPartialPayment ?
                        helper_lib.calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) :
                        helper_lib.calculateAndSetWhtFields(currentRec, sublistId, taxRate)
        
                }

            }
            catch(e){
                log.error("Error in postSourcing()",e);
            }
        }
         

        function saveRecord(context) {
            var currentRecordObj = currentRecord.get();
            
            // Replace 'custbody_custom_field_id' with your custom field's internal ID
            var customField = currentRecordObj.getValue({
                fieldId: 'cseg_subs_branch'
            });

            console.log("customField::",customField);
            
            if (!customField) {
                dialog.alert({
                    title: 'Warning',
                    message: 'Please enter Subsidiary Branch before saving the record.'
                });
                return false; // Prevents the record from being saved
            }
            
            return true; // Allows the record to be saved
        }
      

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing : postSourcing,
           // saveRecord : saveRecord
           
        };

    }
);
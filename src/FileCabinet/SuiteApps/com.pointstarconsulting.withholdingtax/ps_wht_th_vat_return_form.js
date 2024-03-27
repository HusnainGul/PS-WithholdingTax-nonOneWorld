/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/task', 'N/runtime', './lib/data_search_lib','./lib/constants_lib',
    './lib/template_helper_lib'],
    function(ui, search, record, nstask, runtime,search_lib, constant_lib, helper_lib) {

        function onRequest(context) {

            try {

                let request = context.request;
                let response = context.response;
                let params = request.parameters;


                if (request.method === 'GET') {
                    log.debug('GET params', params);
                    getHandler(request, response, params, context.request);
                } else {
                    postHandler(request, response, params);
                }
            } catch (e) {
                log.error('Error::onRequest', e);
              
            }

        }

        function getHandler(request, response, params, context) {

         

            // Check if the account is OneWorld and Multi-Book
            var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
            var isMultiBook = runtime.isFeatureInEffect({ feature: 'MULTIBOOK' });
            var configrationRecord = search_lib.getTaxConfigration()

            log.debug("isOneWorld", isOneWorld);
            log.debug("isMultiBook", isMultiBook);
            log.debug("configrationRecord", configrationRecord);

            let form = ui.createForm({
                title: 'VAT Return Form P.P.30'
            });
             form.clientScriptModulePath = './ps_wht_th_vat_return_cs.js';
            form.addButton({
                id: 'custpage_btn_refresh',
                label: 'Refresh',
                functionName: `refreshPage('coverpage')`
            });

            form.addButton({
                id: 'custpage_btn_print',
                label: 'Print',
                functionName: `printPdf('attachment')`
            });
        

            form.addFieldGroup({
                id: 'custpage_criteria',
                label: 'Criteria'
            });


            form.addFieldGroup({
                id: 'custpage_output_tax',
                label: 'Output Tax'
            });

            
            form.addFieldGroup({
                id: 'custpage_input_tax',
                label: 'Input Tax'
            });

                   
            form.addFieldGroup({
                id: 'custpage_vat_tax',
                label: 'Value Added Tax'
            });


            form.addFieldGroup({
                id: 'custpage_net_tax',
                label: 'Net Tax'
            });


            form.addFieldGroup({
                id: 'custpage_add_filing',
                label: 'In case of late filing and  payment, or additional filing'
            });

            log.debug("check log", params)

                let subsidiaryFld = form.addField({
                    id: 'custpage_subsidiary_fld_vat_form',
                    type: ui.FieldType.SELECT,
                    label: 'Subsidiary',
                    container: 'custpage_criteria'
                });

                let subsidiaryList = getRecordsList('subsidiary');
                subsidiaryFld.addSelectOption({
                    value: "",
                    text: ""
                });

                subsidiaryList.map(function(option) {
                    subsidiaryFld.addSelectOption({
                        value: option.id,
                        text: option.name
                    });

                })

                let subsidiaryBranchFld = form.addField({
                    id: 'custpage_subs_branch_fld',
                    type: ui.FieldType.SELECT,
                    label: 'Subsidiary Branch',
                    container: 'custpage_criteria'
                });

                let subsidiaryBranchList = getSubsidaryBranch(params.subsidiary)

                log.debug("subsidiaryBranchList", subsidiaryBranchList)

                subsidiaryBranchFld.addSelectOption({
                    value: "",
                    text: ""
                });
                if (subsidiaryBranchList) {
                    subsidiaryBranchList.map(function(option) {
                        subsidiaryBranchFld.addSelectOption({
                            value: option.id,
                            text: option.name
                        });
                    })

                }

                subsidiaryFld.defaultValue = isNull(params.subsidiary);
                subsidiaryBranchFld.defaultValue = isNull(params.subsidiaryBranch);
        
                let accountingBookFld = form.addField({
                    id: 'custpage_wht_acc_book_fld',
                    type: ui.FieldType.SELECT,
                    label: 'Accounting Book',
                    container: 'custpage_criteria'
                });

                let accountingBookList = getRecordsList('accountingbook');

                accountingBookFld.addSelectOption({
                    value: "",
                    text: ""
                });
                accountingBookList.map(function(option) {
                    accountingBookFld.addSelectOption({
                        value: option.id,
                        text: option.name
                    });
                })



                accountingBookFld.defaultValue = isNull(params.whtAccountingBook);


            let whtPeriodFld = form.addField({
                id: 'custpage_wht_period_fld',
                type: ui.FieldType.SELECT,
                label: 'WHT Period',
                container: 'custpage_criteria',
                source: 'accountingperiod'
            });
            whtPeriodFld.defaultValue = isNull(params.whtTaxPeriod)

            let whtFilingStatusFld = form.addField({
                id: 'custpage_wht_filing_status_fld',
                type: ui.FieldType.SELECT,
                label: 'WHT Filing Status',
                container: 'custpage_criteria',

            });

            let filingStatusList = getRecordsList('customrecord_ps_tht_wht_filing_status');
            whtFilingStatusFld.addSelectOption({
                value: "",
                text: ""
            });
            filingStatusList.map(function(option) {
                whtFilingStatusFld.addSelectOption({
                    value: option.id,
                    text: option.name
                });
            })

          
            whtFilingStatusFld.defaultValue =  isNull(params.whtFilingStatus)

            let surchargeFld = form.addField({
                id: 'custpage_wht_surcharge_fld',
                type: ui.FieldType.TEXT,
                label: 'Surcharge',
                container: 'custpage_cover_page'
            });

            surchargeFld.updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            });



            let salesAmountFld1 = form.addField({
                id: 'custpage_sales_amnt_fld',
                type: ui.FieldType.TEXT,
                label: '1. SALES AMOUNT THIS MONTH',
                container: 'custpage_output_tax'
            });

            salesAmountFld1.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            salesAmountFld1.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });

             
            let unDecSalesCheckboxFld = form.addField({
                id: 'custpage_undec_sales_fld',
                type: ui.FieldType.CHECKBOX,
                label: '(1.1) UNDECLARED SALES',
                container: 'custpage_output_tax'
            });

            unDecSalesCheckboxFld.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });


               
            let overDecPurchaseCheckboxFld = form.addField({
                id: 'custpage_overdec_purchase_fld',
                type: ui.FieldType.CHECKBOX,
                label: '(1.2) OVERDECLARED PURCHASES',
                container: 'custpage_output_tax'
            });

            overDecPurchaseCheckboxFld.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
    
            let lessSalesAmountFld2 = form.addField({
                id: 'custpage_less_sales_amnt_fld',
                type: ui.FieldType.TEXT,
                label: '2. LESS SALES SUBJECT TO 0% TAX RATE (IF ANY)',
                container: 'custpage_output_tax'
            });

            lessSalesAmountFld2.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            lessSalesAmountFld2.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });

            let lessExmptSalesAmntFld3 = form.addField({
                id: 'custpage_less_exempted_fld',
                type: ui.FieldType.TEXT,
                label: '3. LESS EXEMPTED SALES (IF ANY)',
                container: 'custpage_output_tax'
            });

            lessExmptSalesAmntFld3.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            
            lessExmptSalesAmntFld3.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
           
            let taxableSalesAmountFld4 = form.addField({
                id: 'custpage_txbl_sales_amnt_fld',
                type: ui.FieldType.TEXT,
                label: '4. TAXABLE SALES AMOUNT (1.-2.-3.)',
                container: 'custpage_output_tax'
            });

            taxableSalesAmountFld4.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            taxableSalesAmountFld4.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
           

            let thisMonthsOutputTaxFld5 = form.addField({
                id: 'custpage_this_mnth_opt_tax_fld',
                type: ui.FieldType.TEXT,
                label: "5. THIS MONTH'S OUTPUT TAX",
                container: 'custpage_output_tax'
            });

            thisMonthsOutputTaxFld5.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            thisMonthsOutputTaxFld5.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
           

            //Input Tab Fields

            let taxDeductionFld6 = form.addField({
                id: 'custpage_tax_deduct_fld',
                type: ui.FieldType.TEXT,
                label: "6. PURCHASE AMOUNT THAT IS ENTITLED TO DEDUCTION OF INPUT TAX FROM OUTPUT TAX IN THIS MONTH'S TAX COMPUTATION",
                container: 'custpage_input_tax'
            });

            taxDeductionFld6.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            // taxDeductionFld6.updateLayoutType({
            //     layoutType: ui.FieldLayoutType.STARTROW
            // }); 


               
            let unDecPurchaseCheckboxFld = form.addField({
                id: 'custpage_undec_purchase_fld',
                type: ui.FieldType.CHECKBOX,
                label: '(6.1) UNDERDECLARED PURCHASES',
                container: 'custpage_input_tax'
            });

            // unDecPurchaseCheckboxFld.updateLayoutType({
            //     layoutType: ui.FieldLayoutType.STARTROW
            // });
    
            let thisMonthsInputTax7 = form.addField({
                id: 'custpage_this_mnth_in_tax_fld',
                type: ui.FieldType.TEXT,
                label: "7. THIS MONTH'S INPUT TAX (ACCORDING TO INVOICE OF PURCHASE AMOUNT IN 6.)",
                container: 'custpage_input_tax'
            });

            thisMonthsInputTax7.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            // thisMonthsInputTax7.updateLayoutType({
            //     layoutType: ui.FieldLayoutType.STARTROW
            // });


            let overDecSalesCheckboxFld = form.addField({
                id: 'custpage_overdec_sales_fld',
                type: ui.FieldType.CHECKBOX,
                label: '(6.2) OVERDECLARED SALES',
                container: 'custpage_input_tax'
            });

           


           


            //Value Added Tab

            let thisMonthsTaxPayableFld8 = form.addField({
                id: 'custpage_this_mnth_tax_payble_fld',
                type: ui.FieldType.TEXT,
                label: "8. THIS MONTH'S TAX PAYABLE (IF 5 IS GREATER THAN 7)",
                container: 'custpage_vat_tax'
            });

            thisMonthsTaxPayableFld8.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            thisMonthsTaxPayableFld8.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });

            let thisMonthsExcessPayableFld9 = form.addField({
                id: 'custpage_this_exc_payble_fld',
                type: ui.FieldType.TEXT,
                label: "9. THIS MONTH'S EXCESS TAX PAYABLE (IF 5 IS LESS THAN 7)",
                container: 'custpage_vat_tax'
            });

            thisMonthsExcessPayableFld9.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            thisMonthsExcessPayableFld9.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });

            let thisMonthsExcessTaxPayment10 = form.addField({
                id: 'custpage_this_mnth_excess_tax_pymnt',
                type: ui.FieldType.TEXT,
                label: "10. EXCESS TAX PAYMENT CARRIED FORWARD FROM LAST MONTH",
                container: 'custpage_vat_tax'
            });


            thisMonthsExcessTaxPayment10.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });



            //Net Tax Tab
          

            let netTaxPayableFld11 = form.addField({
                id: 'custpage_net_tax_payble_fld',
                type: ui.FieldType.TEXT,
                label: "11. NET TAX PAYABLE (IF 8. IS GREATER THAN 10.)",
                container: 'custpage_net_tax'
            });

            netTaxPayableFld11.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            netTaxPayableFld11.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });

            let netExcessPayableFld12 = form.addField({
                id: 'custpage_net_exc_payble_fld',
                type: ui.FieldType.TEXT,
                label: "12. NET EXCESS TAX PAYABLE ((IF 10. IS GREATER THAN 8.) OR (9. PLUS 10.))",
                container: 'custpage_net_tax'
            });

            netExcessPayableFld12.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            netExcessPayableFld12.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
          


            //Additional Filing Tab


            let surchargeAddFilingFld13 = form.addField({
                id: 'custpage_this_surchare_add_filing',
                type: ui.FieldType.TEXT,
                label: "13. SURCHARGE",
                container: 'custpage_add_filing'
            });


            surchargeAddFilingFld13.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });


            let penaltyAddFilingFld14 = form.addField({
                id: 'custpage_penalty_add_filing',
                type: ui.FieldType.TEXT,
                label: "14. PENALTY",
                container: 'custpage_add_filing'
            });


            penaltyAddFilingFld14.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });


            let totalTaxPayableFld15 = form.addField({
                id: 'custpage_total_tax__payble_fld',
                type: ui.FieldType.TEXT,
                label: "15. TOTAL TAX PAYABLE: TAX, SURCHARGE, AND PENALTY ((11.+13.+14.) OR (13.+14.-12.))",
                container: 'custpage_add_filing'
            });

            totalTaxPayableFld15.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            totalTaxPayableFld15.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
          


            let totalExcessTaxPayableFld16 = form.addField({
                id: 'custpage_total_exc_payble_fld',
                type: ui.FieldType.TEXT,
                label: "16. TOTAL EXCESS TAX PAYABLE AFTER COMPUTATION OF SURCHARGE AND PENALTY (12.-13.-14.)",
                container: 'custpage_add_filing'
            });

            totalExcessTaxPayableFld16.updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            totalExcessTaxPayableFld16.updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            });
           

              if(params.action == "refresh")
             {  
                
                // output tax start
               let isSuiteTaxEnabled = configrationRecord.length>0? configrationRecord[0].values ["custrecord_ps_wht_suitetax_enabled"] :"false"

                log.debug("isSuiteTaxEnabled",isSuiteTaxEnabled)
                let outputTaxed = isSuiteTaxEnabled ? search_lib.getInvoicesForVATSuiteTaxEnabled(params): search_lib.getInvoicesFORVAT(params)
                
                // log.debug("outputTaxed",outputTaxed) 

                // log.debug("getInvoiceForVATSuiteTaxEnabled",search_lib.getInvoiceForVATSuiteTaxEnabled())

                 
                let taxCodePayloadFor0Percent = outputTaxed.filter(function (item)   //payload where taxcode is 0
                {
                   var percent = isSuiteTaxEnabled ? item.values["taxDetail.taxrate"] : item.values["taxItem.rate"]
                   percent  = percent.replace("%",'')
                    return parseFloat(percent) === 0;
                });

                let taxCodePayloadForMoreThen0Percent = outputTaxed.filter(function (item)     
                {
                    var percent = isSuiteTaxEnabled ? item.values["taxDetail.taxrate"] : item.values["taxItem.rate"]
                    percent  = percent.replace("%",'')
                    return parseFloat(percent) > 0;
                });

                // log.debug("taxCodeZeroPayload",taxCodePayloadFor0Percent.length)
                // log.debug("taxCodePayload",taxCodePayloadForMoreThen0Percent)

                let taxCodePayloadFor0PercentloadSum = 0 
               
               let outputZeroTaxSUM = getSUM( taxCodePayloadFor0Percent,"fxamount").toFixed(2);

                let outputTaxAmountSUM = getSUM(taxCodePayloadForMoreThen0Percent,"fxamount").toFixed(2);

                let thisMonthOutputTotalTax = isSuiteTaxEnabled
                  ? getSUM(taxCodePayloadForMoreThen0Percent,"taxDetail.taxfxamount",).toFixed(2)
                  : getSUM(taxCodePayloadForMoreThen0Percent,"formulanumeric",).toFixed(2);

                // log.debug("ZeroTaxSUM",outputZeroTaxSUM)
                // log.debug("taxAmountSUM",outputTaxAmountSUM)
                //  log.debug("totalTax",thisMonthOutputTotalTax)
                
                salesAmountFld1.defaultValue        = outputTaxAmountSUM
                lessSalesAmountFld2.defaultValue    = outputZeroTaxSUM
                taxableSalesAmountFld4.defaultValue = outputTaxAmountSUM -  outputZeroTaxSUM - 0
                thisMonthsOutputTaxFld5.defaultValue = thisMonthOutputTotalTax


              // /////////////////////////output tax end/////////////////////////


              // /////////////////////////input tax start////////////////////////

               let inputTaxed = isSuiteTaxEnabled ? search_lib.getBillForVATSuiteTaxEnabled(params): search_lib.getBillForVAT(params)

               log.debug("inputTaxed",inputTaxed)

            

               let inputZeroTaxCodePayload = inputTaxed.filter(function (item) 
                {

                   var percent = isSuiteTaxEnabled ? item.values["taxDetail.taxrate"] : item.values["taxItem.rate"]
                    percent  = percent.replace("%",'')
                    return parseFloat(percent) == 0;
                 });
                log.debug("inputZeroTaxCodePayload",inputZeroTaxCodePayload.length)

                let inputTaxCodePayload = inputTaxed.filter(function (item) 
                {
                    var percent = isSuiteTaxEnabled ? item.values["taxDetail.taxrate"] : item.values["taxItem.rate"]
                    percent  = percent.replace("%",'')
                    return parseFloat(percent) > 0;

                   // return parseFloat(item.values["formulanumeric"]) > 0 || parseFloat(item.values["formulanumeric"]) <0;
                });

                 log.debug("inputTaxCodePayload", inputTaxCodePayload[0]);
                  log.debug("inputTaxCodePayload", inputTaxCodePayload[1]);
                   log.debug("inputTaxCodePayload", inputTaxCodePayload[2]);


                 log.debug("inputTaxCodePayload",inputTaxCodePayload.length)

               

                 let inputTaxAmountSUM = getSUM(inputTaxCodePayload,"fxamount").toFixed(2)
                 let inputTotalTax = isSuiteTaxEnabled? (getSUM(inputTaxCodePayload,"taxDetail.taxfxamount") ).toFixed(2) : (getSUM(inputTaxCodePayload,"formulanumeric")).toFixed(2)
                  
                taxDeductionFld6.defaultValue            = inputTaxAmountSUM
                thisMonthsInputTax7.defaultValue         =  inputTotalTax
                thisMonthsExcessTaxPayment10.defaultValue = params.vatExsessTaxAmount

                log.debug("inputTaxAmountSUM",inputTaxAmountSUM)
                log.debug("inputTotalTax",inputTotalTax)
              
                   // /////////////////////////input tax end/////////////////////////


                   // /////////////////////////VAT tax Start/////////////////////////

                    let thisMonthTax       = thisMonthOutputTotalTax - inputTaxAmountSUM
                    let thisMonthExcessTax = thisMonthOutputTotalTax < inputTotalTax ? inputTotalTax - thisMonthOutputTotalTax : "1"
                    let netTaxPayable      =  thisMonthTax>isNull(params.vatExsessTaxAmount) ? isNull(params.vatExsessTaxAmount)- thisMonthTax :thisMonthExcessTax + isNull(params.vatExsessTaxAmount)

                    log.debug("thisMonthOutputTotalTax-inputTaxAmountSUM",thisMonthOutputTotalTax+"-"+inputTotalTax)
                    var f8 = (thisMonthOutputTotalTax - inputTotalTax) <0 ? 0 :  (thisMonthOutputTotalTax - inputTotalTax)
                    var f9 = inputTotalTax - thisMonthOutputTotalTax
                    thisMonthsTaxPayableFld8.defaultValue = f8  // F5 - F7, If F5 < F7, Set As 0
                    thisMonthsExcessPayableFld9.defaultValue = f9  // F7 - F5, If F5 > F7, Set As 0

                      // /////////////////////////VAT tax end/////////////////////////

                       // /////////////////////////net tax Start/////////////////////////
                        let netTaxPayable11 = 0
                    //    if((params.vatExsessTaxAmount) == 0)
                    //    {
                    //       netTaxPayable11 = thisMonthTax
                    //    }
                    //    else if((params.vatExsessTaxAmount) > 0 && (params.vatExsessTaxAmount < thisMonthTax) )
                    //    {
                    //             netTaxPayable11 = thisMonthTax - params.vatExsessTaxAmount
                    //    }
                    //    else if((params.vatExsessTaxAmount) > thisMonthTax)
                    //    {
                    //             netTaxPayable11 = "0"
                    //             // netExcessPayable12 =  params.vatExsessTaxAmount - thisMonthTax
                    //    }


                      // let netTaxPayable11 = thisMonthTax > (params.vatExsessTaxAmount) ? 0 : 0
                    //    let netExcessPayable12 = isNull(params.vatExsessTaxAmount) > thisMonthTax ? isNull(params.vatExsessTaxAmount) - thisMonthTax : isNull(params.vatExsessTaxAmount) + thisMonthExcessTax 
                       var f10 = isNull(params.vatExsessTaxAmount)  
                       var f11 = (f8 - f10)<0 ? 0 : f8 - f10  //F8 - F10, If F8 < F10, Set As 0, f8 is vatExcessTaxAmount
                       netTaxPayableFld11.defaultValue    =   f11  
                       var f12 = (f10 - f8 ) <0 ?  0: f10 - f8 //F10 - F8, If F8 > F10, Set As 0
                       netExcessPayableFld12.defaultValue =  f12  


                       var f13 = isNull(params.surcharge)
                       var f14 = isNull(params.panalty)

                       var f15 = Number(f11) >0 ? Number(f11)+ Number(f13)+Number(f14)  : Number(f12) > 0 ? Number(f13)+ Number(f14) - Number(f12) : 0               //F11 + F13 + F14 Has Amount on F11 , 

                       totalTaxPayableFld15.defaultValue     = f15
                       totalExcessTaxPayableFld16.defaultValue =  Number(f12) - Number(f13) - Number(f14)     //F12 - F13 - F14
                                        
                    
                

                       surchargeAddFilingFld13.defaultValue = params.surcharge
                       penaltyAddFilingFld14.defaultValue   = params.panalty 





             }

            response.writePage(form);

        }


        function postHandler(request, response) {


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
                    data.push({ id: internalId, name: name })
                }

                log.debug("data: ", data)

                return data

            } catch (e) {
                log.debug("error: ", e.message)
                return [{ id: '', name: '' }]
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
                data.push({ id: internalId, name: name })
            }

            log.debug("data: ", data)

            return data
        }


        function isNull(value) {
            if ((value != null) && (value != 'null') && (value != '') && (value != undefined) && (value != 'undefined') && (value != 'NaN') && (value != ' ')) return value;
            else return '';
        }

        function getSUM(array,key)
        {
            try
            {
               var sum = 0

                    for (var i = 0; i < array.length; i++) 
                        {
                            var amount = parseFloat(array[i].values[key]);
                    
                            if (!isNaN(amount)) 
                            {
                                sum += amount;
                            }
                        }

                    return sum
            }
            catch(e)
            {
                 log.error("getSUM function",e)
            }
            
        }



        return {
            onRequest: onRequest
        };
    });
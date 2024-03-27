/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/url', 'N/search', 'N/https', 'N/runtime','./lib/template_helper_lib'],
    function(nsCurrentRec, nsRecord, url, search, https, runtime,helper_lib,) {

        function pageInit(context) {

            console.log("page init!");
            jQuery('#custpage_attachment').val("🖨️| Attachment (PDF)");

             var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });

             console.log("isOneWorld",isOneWorld)

        }

        function fieldChanged(context) {
            var currentRecord = context.currentRecord;

            var fieldName = context.fieldId;


            if (fieldName == "custpage_subsidiary_fld_vat_form") 
            {
                console.log("fieldName", fieldName)
                var subsidiary = currentRecord.getValue({ fieldId: 'custpage_subsidiary_fld_vat_form' });
                var subsidiaryBranch = currentRecord.getValue({ fieldId: 'custpage_subs_branch_fld' });
                var whtTaxPeriod = currentRecord.getValue({ fieldId: 'custpage_wht_period_fld' });
                var whtFilingStatus = currentRecord.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                var whtAccountingBook = currentRecord.getValue({ fieldId: 'custpage_wht_acc_book_fld' });

                window.onbeforeunload = null;


                window.location = url.resolveScript({
                    scriptId: 'customscript_ps_wht_vat_return_pp30_sl',
                    deploymentId: 'customdeploy_ps_wht_vat_return_pp30_sl',
                    params: {
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        whtTaxPeriod: whtTaxPeriod,
                        whtFilingStatus: whtFilingStatus,
                        whtAccountingBook: whtAccountingBook,
                      
                    }
                });

            }
             if (fieldName == "custpage_this_mnth_excess_tax_pymnt") 
             {
                 var f10 = currentRecord.getValue({ fieldId: 'custpage_this_mnth_excess_tax_pymnt' });
                 var f8 = currentRecord.getValue({ fieldId: 'custpage_this_mnth_tax_payble_fld' });


                       var f11 = (f8 - f10)<0 ? 0 : f8 - f10  //F8 - F10, If F8 < F10, Set As 0, f8 is vatExcessTaxAmount
                      currentRecord.setValue({ fieldId: 'custpage_net_tax_payble_fld',value:f11 });  
                       var f12 = (f10 - f8 ) <0 ?  0: f10 - f8 //F10 - F8, If F8 > F10, Set As 0
                       currentRecord.setValue({ fieldId: 'custpage_net_exc_payble_fld',value:f12 });  

             }
             if(fieldName == "custpage_this_surchare_add_filing")
             {
                var f13 = currentRecord.getValue({ fieldId: 'custpage_this_surchare_add_filing' });
                var f14 = currentRecord.getValue({ fieldId: 'custpage_penalty_add_filing' });
                var f10 = currentRecord.getValue({ fieldId: 'custpage_this_mnth_excess_tax_pymnt' });
                var f8 = currentRecord.getValue({ fieldId: 'custpage_this_mnth_tax_payble_fld' });
                var f16 = currentRecord.getValue({ fieldId: 'custpage_net_exc_payble_fld'});

                var f11 = (f8 - f10)<0 ? 0 : f8 - f10
                var f12 = (f10 - f8 ) <0 ?  0: f10 - f8
               //currentRecord.setValue({fieldId:'custpage_net_exc_payble_fld',value:f12})

                if(f11)
                {
                    var f15 = Number(f11) ? Number(f11)+ Number(f13)+Number(f14)  : Number(f12) > 0 ? Number(f13)+ Number(f14) - Number(f12) : 0               //F11 + F13 + F14 Has Amount on F11 , 

                   currentRecord.setValue({ fieldId: 'custpage_total_tax__payble_fld',value:f15 });  
                   var f16 =  Number(f12) - Number(f13) - Number(f14)     //F12 - F13 - F14
                   currentRecord.setValue({ fieldId: 'custpage_total_exc_payble_fld',value:f16 }); 

                }
                else 
                {
                     currentRecord.setValue({ fieldId: 'custpage_net_exc_payble_fld',value:f12-f13 });  
                }
                
                   // currentRecord.setValue({ fieldId: 'custpage_net_exc_payble_fld',value:0 });  

             }





        }

        function printPdf(type) {

            var req = nsCurrentRec.get()
           
            var subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' })
            var subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            var whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            var whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            var filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            var filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            var accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
            var surcharge = req.getValue({ fieldId: 'custpage_this_surchare_add_filing' })
            var panalty = req.getValue({ fieldId: 'custpage_penalty_add_filing' })
             var isUnDeclaredSales11 = req.getValue({ fieldId: 'custpage_undec_sales_fld' })
            var isOverDeclaredPurchase12 = req.getValue({ fieldId: 'custpage_overdec_purchase_fld' })
            var isUnDeclaredPurchase61 = req.getValue({ fieldId: 'custpage_undec_purchase_fld' })
            var isOverDeclaredSales62 = req.getValue({ fieldId: 'custpage_overdec_sales_fld' })
        
            var payLoad = {
                subsidiary: subsidiary,
                subsidiaryBranch: subsidiaryBranch,
                whtPeriod: whtPeriod,
                whtPeriodText: whtPeriodText,
                filingStatus: filingStatus,
                filingStatusText: filingStatusText,
                accountingBook: accountingBook,
                surcharge: surcharge,
                panalty:panalty,
                isUnDeclaredSales11 : isUnDeclaredSales11,
                isOverDeclaredPurchase12 :isOverDeclaredPurchase12,
                isUnDeclaredPurchase61:isUnDeclaredPurchase61,
                isOverDeclaredSales62:isOverDeclaredSales62,
                "field1" : req.getValue({ fieldId: 'custpage_sales_amnt_fld' }),
                "field2" : req.getValue({ fieldId: 'custpage_less_sales_amnt_fld' }),
                "field3" : req.getValue({ fieldId: 'custpage_less_exempted_fld' })? req.getValue({ fieldId: 'custpage_less_exempted_fld' }) : "0" ,
                "field4" : req.getValue({ fieldId: 'custpage_txbl_sales_amnt_fld' }),
                "field5" : req.getValue({ fieldId: 'custpage_this_mnth_opt_tax_fld' }),
                "field6" : req.getValue({ fieldId: 'custpage_tax_deduct_fld' }),
                "field7" : req.getValue({ fieldId: 'custpage_this_mnth_in_tax_fld' }),
                "field8" : req.getValue({ fieldId: 'custpage_this_mnth_tax_payble_fld' }),
                "field9" : req.getValue({ fieldId: 'custpage_this_exc_payble_fld' }),
                "field10" : req.getValue({ fieldId: 'custpage_this_mnth_excess_tax_pymnt' }),
                "field11" : req.getValue({ fieldId: 'custpage_net_tax_payble_fld' }),
                "field12" : req.getValue({ fieldId: 'custpage_net_exc_payble_fld' }),
                "field13" : req.getValue({ fieldId: 'custpage_this_surchare_add_filing' }),
                "field14" : req.getValue({ fieldId: 'custpage_penalty_add_filing' }),
                "field15" : req.getValue({ fieldId: 'custpage_total_tax__payble_fld' }),
                "field16" : req.getValue({ fieldId: 'custpage_total_exc_payble_fld' }),
            }

            console.log("payLoad",payLoad)

            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                params: {
                    VATPayLoad: JSON.stringify(payLoad)
                }
               });

              window.open(suiteletUrl+"&type=" + 'pp30', '_blank');


            // console.log("pndCategoryValue: ", pndCategoryValue);
            // console.log("type: ", type);
            // if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus, pndCategoryValue)) {
            //     suiteletUrl = suiteletUrl + "&type=" + pndCategory + "&pndCategoryValue=" + pndCategoryValue
            //     window.open(suiteletUrl, '_blank');
            // }


        }

       

        function refreshPage()
        {
           
            var req = nsCurrentRec.get()

         
        
            var subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld_vat_form' })
            var subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            var whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            var whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            var filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            var filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            var accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
            var vatExsessTaxAmount = req.getValue({ fieldId: 'custpage_this_mnth_excess_tax_pymnt' }) 
            var surcharge = req.getValue({ fieldId: 'custpage_this_surchare_add_filing' })
            var panalty = req.getValue({ fieldId: 'custpage_penalty_add_filing' })
            var isUnDeclaredSales11 = req.getValue({ fieldId: 'custpage_undec_sales_fld' })
            var isOverDeclaredPurchase12 = req.getValue({ fieldId: 'custpage_overdec_purchase_fld' })
            var isUnDeclaredPurchase61 = req.getValue({ fieldId: 'custpage_undec_purchase_fld' })
            var isOverDeclaredSales62 = req.getValue({ fieldId: 'custpage_overdec_sales_fld' })
           

             

                window.onbeforeunload = null;

                window.location = url.resolveScript({
                    scriptId: 'customscript_ps_wht_vat_return_pp30_sl',
                    deploymentId: 'customdeploy_ps_wht_vat_return_pp30_sl',
                    params: {
                      action: "refresh",
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        whtTaxPeriod: whtPeriod,
                        whtFilingStatus: filingStatus,
                        whtAccountingBook: accountingBook,
                        vatExsessTaxAmount: vatExsessTaxAmount,
                        surcharge:surcharge,
                        panalty:panalty,
                        isUnDeclaredSales11 : isUnDeclaredSales11,
                        isOverDeclaredPurchase12 :isOverDeclaredPurchase12,
                        isUnDeclaredPurchase61:isUnDeclaredPurchase61,
                        isOverDeclaredSales62:isOverDeclaredSales62,

                    }
                });
        }


        return {

            pageInit: pageInit,
            printPdf: printPdf,
            fieldChanged: fieldChanged,
           
            refreshPage : refreshPage
        };

    }
);
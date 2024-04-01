/** 
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/url', 'N/search', 'N/https', 'N/runtime'],
    function(nsCurrentRec, nsRecord, url, search, https, runtime) {



        function pageInit(context) {

            console.log("page init!");
          //  jQuery('#custpage_attachment').val("🖨️| Attachment (PDF)");

             var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });

             console.log("isOneWorld",isOneWorld)



        }

        function fieldChanged(context) {
            var currentRecord = context.currentRecord;

            var fieldName = context.fieldId;


            if (fieldName == "custpage_subsidiary_fld") {


                console.log("fieldName", fieldName)
                var subsidiary = currentRecord.getValue({ fieldId: 'custpage_subsidiary_fld' });
                var subsidiaryBranch = currentRecord.getValue({ fieldId: 'custpage_subs_branch_fld' });
                var whtTaxPeriod = currentRecord.getValue({ fieldId: 'custpage_wht_period_fld' });
                var whtFilingStatus = currentRecord.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                var whtAccountingBook = currentRecord.getValue({ fieldId: 'custpage_wht_acc_book_fld' });

                window.onbeforeunload = null;

                window.location = url.resolveScript({
                    scriptId: 'customscript_ps_wht_sl_supple_tax_report',
                    deploymentId: 'customdeploy_ps_wht_sl_supple_tax_report',
                    params: {
                        
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        whtTaxPeriod: whtTaxPeriod,
                        whtFilingStatus: whtFilingStatus,
                        whtAccountingBook: whtAccountingBook,
                      
                    }
                });



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
             var taxCodes = req.getValue({ fieldId: 'custpage_taxcode_fld'})
            var groupByTaxCode = req.getValue({ fieldId: 'custpage_grptaxcode_chk' })

            var nonEmptyTaxCodeArray = taxCodes.filter(function (element) {
              return element.trim() !== "";
            });

            if(!subsidiary)
            {
                alert("Please Select Subsidiary")
                return
            }
            if(!subsidiaryBranch)
            {
                alert("Please Select Subsidiary Branch")
                return
            }
             if (!whtPeriod) {
               alert("Please Select Tax Period");
               return;
             }
           
        
            var payLoad = {
              subsidiary: subsidiary,
              subsidiaryBranch: subsidiaryBranch,
              whtPeriod: whtPeriod,
              whtPeriodText: whtPeriodText,
              filingStatus: filingStatus,
              filingStatusText: filingStatusText,
              accountingBook: accountingBook,
              groupByTaxCode: groupByTaxCode,
              taxCodes: nonEmptyTaxCodeArray,
            };

            console.log("payLoad",payLoad)
         

            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                params: {
                    VATPayLoad: JSON.stringify(payLoad)
                }
               });

              window.open(suiteletUrl+"&type="+type,'_blank');


            // console.log("pndCategoryValue: ", pndCategoryValue);
            // console.log("type: ", type);
            // if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus, pndCategoryValue)) {
            //     suiteletUrl = suiteletUrl + "&type=" + pndCategory + "&pndCategoryValue=" + pndCategoryValue
            //     window.open(suiteletUrl, '_blank');
            // }


        }

        function downloadExcel(type)
        {


            var req = nsCurrentRec.get()
           
            var subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' })
            var subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            var whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            var whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            var filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            var filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            var accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
             var taxCodes = req.getValue({ fieldId: 'custpage_taxcode_fld'})
            var groupByTaxCode = req.getValue({ fieldId: 'custpage_grptaxcode_chk' })

            
            var nonEmptyTaxCodeArray = taxCodes.filter(function (element) {
              return element.trim() !== "";
            });
           
            if(!subsidiary)
            {
                alert("Please Select Subsidiary")
                return
            }
            if(!subsidiaryBranch)
            {
                alert("Please Select Subsidiary Branch")
                return
            }
        
            var payLoad = {
              subsidiary: subsidiary,
              subsidiaryBranch: subsidiaryBranch,
              whtPeriod: whtPeriod,
              whtPeriodText: whtPeriodText,
              filingStatus: filingStatus,
              filingStatusText: filingStatusText,
              accountingBook: accountingBook,
              groupByTaxCode: groupByTaxCode,
              taxCodes: nonEmptyTaxCodeArray,
            };

             var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                params: {
                    VATPayLoad: JSON.stringify(payLoad),
                    type:type
                }
               });

               var res = https.get({
                    url: suiteletUrl,
                    body: {}
                });

             
                  console.log("res",res)
                    console.log("check after post")
                if (res.code == 200) {

                  
                    resBody = JSON.parse(res.body)
                    console.log(resBody)
                    fileContent = resBody.fileContent

                    
                    const filename = "efile.xls";
                   // downloadTextFile(filename, fileContent);
                    downloadBase64AsExcelFile(fileContent, type);
                   

                    // element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
                }







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
           

             

                window.onbeforeunload = null;

                window.location = url.resolveScript({
                    scriptId: 'customscript_ps_wht_vat_rerutn_form_sl',
                    deploymentId: 'customdeploy_ps_wht_vat_rerutn_form_sl',
                    params: {
                      action: "refresh",
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        whtTaxPeriod: whtPeriod,
                        whtFilingStatus: filingStatus,
                        whtAccountingBook: accountingBook,
                        vatExsessTaxAmount: vatExsessTaxAmount,
                        surcharge:surcharge,
                        panalty:panalty
                      
                    }
                });
        }

        // Create a function to decode and save the Excel file
        function downloadBase64AsExcelFile(base64String, type) {
          // Decode the Base64 string
          const binaryString = atob(base64String);
          fileName = type = "inputtaxreportexcel"? "Input Report" : "Output Report"

          // Convert the binary string to an array buffer
          const buffer = new ArrayBuffer(binaryString.length);
          const view = new Uint8Array(buffer);
          for (let i = 0; i < binaryString.length; i++) {
            view[i] = binaryString.charCodeAt(i);
          }

          // Create a Blob with the decoded data
          const blob = new Blob([buffer], { type: "application/vnd.ms-excel" });

          // Create a URL for the Blob
          const url = URL.createObjectURL(blob);

          // Create a download link and trigger the download
          const a = document.createElement("a");
          a.href = url;
          a.download = type + ".xls";
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();

          // Clean up
          URL.revokeObjectURL(url);
        }




        return {

            pageInit: pageInit,
            printPdf: printPdf,
            fieldChanged: fieldChanged,
           downloadExcel:downloadExcel,
            refreshPage : refreshPage
        };

    }
);
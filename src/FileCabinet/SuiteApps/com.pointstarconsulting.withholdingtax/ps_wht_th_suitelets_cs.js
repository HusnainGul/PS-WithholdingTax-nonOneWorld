/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/url', 'N/search', 'N/https', 'N/runtime'],
    function(nsCurrentRec, nsRecord, url, search, https, runtime) {



        function pageInit(context) {

            console.log("page init!");
           jQuery('#custpage_attachment').val("🖨️| Attachment (PDF)");

             var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });

             console.log("isOneWorld",isOneWorld)



        }

        function fieldChanged(context) {
            var currentRecord = context.currentRecord;

            var fieldName = context.fieldId;


            if (fieldName == "custpage_subsidiary_fld") {
                console.log("fieldName", fieldName)

                var pndCategory = currentRecord.getValue({ fieldId: 'custpage_pnd_category_fld' });
                var subsidiary = currentRecord.getValue({ fieldId: 'custpage_subsidiary_fld' });
                var subsidiaryBranch = currentRecord.getValue({ fieldId: 'custpage_subs_branch_fld' });
                var whtTaxPeriod = currentRecord.getValue({ fieldId: 'custpage_wht_period_fld' });
                var whtFilingStatus = currentRecord.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                var whtAccountingBook = currentRecord.getValue({ fieldId: 'custpage_wht_acc_book_fld' });
                var surcharge = currentRecord.getValue({ fieldId: 'custpage_wht_surcharge_fld' });
                var totalAttachmentPage = currentRecord.getValue({ fieldId: 'custpage_total_attch_fld' });
                var whtTaxCertificationValue = currentRecord.getValue({ fieldId: 'custpage_show_wht_cert_fld' });

                window.onbeforeunload = null;


                window.location = url.resolveScript({
                    scriptId: 'customscript_ps_wht_sl_income_tax_return',
                    deploymentId: 'customdeploy_ps_wht_sl_income_tax_return',
                    params: {
                        pndCategory: pndCategory,
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        whtTaxPeriod: whtTaxPeriod,
                        whtFilingStatus: whtFilingStatus,
                        whtAccountingBook: whtAccountingBook,
                        surcharge: surcharge,
                        totalAttachmentPage: totalAttachmentPage,
                        whtTaxCertificationValue: whtTaxCertificationValue
                    }
                });



            }



        }

        function printPdf(type) {

            var req = nsCurrentRec.get()

            var pndCategory = document.getElementById('inpt_custpage_pnd_category_fld1').value;
            var pndCategoryValue = req.getValue({ fieldId: 'custpage_pnd_category_fld' })
            var subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' })
            var subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            var whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            var whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            var filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            var filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            var accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
            var surcharge = req.getValue({ fieldId: 'custpage_wht_surcharge_fld' })
            var totalAttachmentPage = req.getValue({ fieldId: 'custpage_total_attch_fld' })
             var whtFilingType = req.getValue({ fieldId: 'custpage_wht_filing_type_fld' })

            var payLoad = {
                subsidiary: subsidiary,
                subsidiaryBranch: subsidiaryBranch,
                whtPeriod: whtPeriod,
                whtPeriodText: whtPeriodText,
                filingStatus: filingStatus,
                whtFilingType:whtFilingType,
                filingStatusText: filingStatusText,
                accountingBook: accountingBook,
                surcharge: surcharge,
                totalAttachmentPage: totalAttachmentPage
            }

            pndCategory = pndCategory.replace(/[^a-zA-Z0-9]/g, "")
            pndCategory = pndCategory.replace(/\s/g, '');
            pndCategory = pndCategory.toLowerCase();
            if (type == "attachment") { pndCategory = pndCategory + "a" }

            console.log("pndCategory", pndCategory)
            if (pndCategory == "pnd54" || pndCategory == "pnd54a"){alert("Print PND54 from bill payment")}


            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                params: {
                    incomeTaxRetrunPayLoad: JSON.stringify(payLoad)
                }
            });

            console.log("pndCategoryValue: ", pndCategoryValue);
            console.log("type: ", type);
           // if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus, pndCategoryValue)) {
                suiteletUrl = suiteletUrl + "&type=" + pndCategory + "&pndCategoryValue=" + pndCategoryValue
                window.open(suiteletUrl, '_blank');
            //}


        }

        function downloadEFile() {

           
            var req = nsCurrentRec.get()
           

            let pndCategory = document.getElementById('inpt_custpage_pnd_category_fld1').value;
            var pndCategoryValue = req.getValue({ fieldId: 'custpage_pnd_category_fld' })
            var subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' })
            var subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            var whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            var whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            var filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            var filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            var accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
            var surcharge = req.getValue({ fieldId: 'custpage_wht_surcharge_fld' })
            var totalAttachmentPage = req.getValue({ fieldId: 'custpage_total_attch_fld' })

            var payLoad = {
                subsidiary: subsidiary,
                subsidiaryBranch: subsidiaryBranch,
                whtPeriod: whtPeriod,
                whtPeriodText: whtPeriodText,
                filingStatus: filingStatus,
                filingStatusText: filingStatusText,
                accountingBook: accountingBook,
                surcharge: surcharge,
                totalAttachmentPage: totalAttachmentPage
            }
            

           // if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus, pndCategoryValue)) {

                var suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_ps_wht_sl_print_certificate',
                    deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                });


                var res = https.post({
                    url: suiteletUrl,
                    body: {
                        incomeTaxRetrunPayLoad: JSON.stringify(payLoad),
                        pndCategoryValue: pndCategoryValue
                    }
                });

             
                 
                if (res.code == 200) {

                 
                    resBody = JSON.parse(res.body)

                  console.log("resBody",resBody)
                    fileContent = resBody.fileContent

                 

                    const filename = "efile -" + pndCategory + ".txt";
                    downloadTextFile(filename, fileContent);

                    // element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
                    // element.setAttribute('download', `efile - ${new Date().toISOString()}.csv`);
                }
           // }



            //  if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus,pndCategoryValue)) {
            //         suiteletUrl = suiteletUrl + "&type=pnd3a&pndCategoryValue="+pndCategoryValue+"&etextfile=1"
            //         window.open(suiteletUrl, '_blank');
            //     }


        }

        function downloadTextFile(filename, content) {
            // Create a new Blob object with the specified content
            const blob = new Blob([content], { type: 'text/plain' });

            // Create a temporary link element
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);

            // Set the filename for the downloaded file
            link.download = filename;

            // Append the link to the document body
            document.body.appendChild(link);

            // Simulate a click on the link to trigger the download
            link.click();

            // Clean up resources
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }


        return {

            pageInit: pageInit,
            printPdf: printPdf,
            fieldChanged: fieldChanged,
            downloadEFile: downloadEFile
        };

    }
);
/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/url', 'N/search', 'N/https', './lib/helper_lib','N/format'],
    function(nsCurrentRec, nsRecord, url, search, https, helper_lib, format) {



        function pageInit(context) {


            window.onbeforeunload = null;

				let suiteletName = document.getElementsByClassName('uir-record-type')[0].textContent;

				console.log("suiteletName: ", suiteletName);

            console.log("page init!");
            jQuery('#custpage_attachment').val("🖨️| Attachment (PDF)");


        } 

        function fieldChanged(context) {
            let currentRecord = context.currentRecord;

            var currentRec = context.currentRecord;
			var sublistId = context.sublistId;
			var fieldId = context.fieldId;
			var line = context.line;
          

            console.log('sublistId',sublistId);
            console.log('fieldId',fieldId);

            // if (fieldId == "custpage_subsidiary_fld") {
            //     console.log("fieldId", fieldId)

            //     let pndCategory = currentRecord.getValue({ fieldId: 'custpage_pnd_category_fld' });
            //     let subsidiary = currentRecord.getValue({ fieldId: 'custpage_subsidiary_fld' });
            //     let subsidiaryBranch = currentRecord.getValue({ fieldId: 'custpage_subs_branch_fld' });
            //     let whtTaxPeriod = currentRecord.getValue({ fieldId: 'custpage_wht_period_fld' });
            //     let whtFilingStatus = currentRecord.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
            //     let whtAccountingBook = currentRecord.getValue({ fieldId: 'custpage_wht_acc_book_fld' });
            //     let surcharge = currentRecord.getValue({ fieldId: 'custpage_wht_surcharge_fld' });
            //     let totalAttachmentPage = currentRecord.getValue({ fieldId: 'custpage_total_attch_fld' });
            //     let whtTaxCertificationValue = currentRecord.getValue({ fieldId: 'custpage_show_wht_cert_fld' });

            //     window.onbeforeunload = null;


            //     window.location = url.resolveScript({
            //         scriptId: 'customscript_ps_wht_sl_income_tax_return',
            //         deploymentId: 'customdeploy_ps_wht_sl_income_tax_return',
            //         params: {
            //             pndCategory: pndCategory,
            //             subsidiary: subsidiary,
            //             subsidiaryBranch: subsidiaryBranch,
            //             whtTaxPeriod: whtTaxPeriod,
            //             whtFilingStatus: whtFilingStatus,
            //             whtAccountingBook: whtAccountingBook,
            //             surcharge: surcharge,
            //             totalAttachmentPage: totalAttachmentPage,
            //             whtTaxCertificationValue: whtTaxCertificationValue
            //         }
            //     });

            // }

			try {
				if (!!sublistId) {
					console.log('!!sublistId');
					if (fieldId == 'custpage_select') {
						currentRec.selectLine({
							sublistId: sublistId,
							line: line
						});
						var isLineSelected = currentRec.getCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custpage_select'
						});

						log.audit("isLineSelected", isLineSelected);

						(isLineSelected == true || isLineSelected == 'T') ?
							updateSelectedCount(currentRec, 1) : updateSelectedCount(currentRec, -1)
					}
				}

				else if (!sublistId) {
                    console.log('!sublistId');

					var url = getSuiteletURL();

					var urlArray = [url];

					// if (fieldId == 'custpage_total_date_from' || fieldId == 'custpage_total_date_to') {
						
					// 	var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
					// 	var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
					// 	var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
					// 	var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                    //     var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                    //     var subsidiaryBranchFld = currentRec.getValue({ fieldId: 'custpage_subs_branch_fld' });
          


					// 	if (!!fromDate && !!toDate) {
					// 		urlArray.push('subsidiary=' + subsidiary)
					// 		urlArray.push('whtperiod=' + whtPeriod)
                    //         urlArray.push('filingstatus=' + filingStatus)
                    //         urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld)
					// 		urlArray.push('setdefaultdate=' + 'F')
					// 		passDateFilters(currentRec, urlArray);
					// 		redirect(urlArray);
					// 	}

					// 	if (!fromDate && !toDate && hasToRedirect) {
					// 		redirect(urlArray)
					// 	}

					// }
					// else if (fieldId == 'custpage_subsidiary_fld') {

                    //     var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
					// 	var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
					// 	var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
					// 	var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                    //     var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                    //     var subsidiaryBranchFld = currentRec.getValue({ fieldId: 'custpage_subs_branch_fld' });
          

					// 	var hasDates = !!fromDate && !!toDate
					// 	var hasToRedirect = true

					// 	if (!!subsidiary) {
					// 		urlArray.push('subsidiary=' + subsidiary)
                    //         urlArray.push('whtperiod=' + whtPeriod)
                    //         urlArray.push('filingstatus=' + filingStatus)
                    //         urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld)
					// 		urlArray.push('setdefaultdate=' + 'F')
					// 	}
						
					// 	passDateFilters(currentRec, urlArray);
					// 	if (!!urlArray && hasToRedirect) {
					// 		redirect(urlArray);
					// 	}

					// }
                    // else if (fieldId == 'custpage_wht_period_fld') {

                    //     var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
					// 	var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
					// 	var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
					// 	var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                    //     var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                    //     var subsidiaryBranchFld = currentRec.getValue({ fieldId: 'custpage_subs_branch_fld' });
          

					// 	var hasDates = !!fromDate && !!toDate
					// 	var hasToRedirect = true

					// 	if (!!whtPeriod) {
					// 		urlArray.push('subsidiary=' + subsidiary)
                    //         urlArray.push('whtperiod=' + whtPeriod)
                    //         urlArray.push('filingstatus=' + filingStatus)
                    //         urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld)
					// 		urlArray.push('setdefaultdate=' + 'F')
					// 	}
						
					// 	passDateFilters(currentRec, urlArray);
					// 	if (!!urlArray && hasToRedirect) {
					// 		redirect(urlArray);
					// 	}

					// }
                    // else if (fieldId == 'custpage_wht_filing_status_fld') {

                    //     var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
					// 	var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
					// 	var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
					// 	var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                    //     var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                    //     var subsidiaryBranchFld = currentRec.getValue({ fieldId: 'custpage_subs_branch_fld' });
          

					// 	var hasDates = !!fromDate && !!toDate
					// 	var hasToRedirect = true

					// 	if (!!filingStatus) {
					// 		urlArray.push('subsidiary=' + subsidiary)
                    //         urlArray.push('whtperiod=' + whtPeriod)
                    //         urlArray.push('filingstatus=' + filingStatus)
                    //         urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld)
					// 		urlArray.push('setdefaultdate=' + 'F')
					// 	}
                    //     else{
                    //         console.log("field is empty condition..");
                    //         urlArray.push('subsidiary=' + subsidiary)
                    //         urlArray.push('whtperiod=' + whtPeriod)
                    //         urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld)
					// 		urlArray.push('setdefaultdate=' + 'F')
                    //     }
						
					// 	passDateFilters(currentRec, urlArray);
					// 	if (!!urlArray && hasToRedirect) {
					// 		redirect(urlArray);
					// 	}

					// }
                    // else if(fieldId == 'custpage_subs_branch_fld'){

                    //     var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
					// 	var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
					// 	var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
					// 	var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                    //     var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
                    //     var subsidiaryBranchFld = currentRec.getValue({ fieldId: 'custpage_subs_branch_fld' });
                        
          

					// 	var hasDates = !!fromDate && !!toDate
					// 	var hasToRedirect = true

					// 	if (!!subsidiaryBranchFld) {
					// 		urlArray.push('subsidiary=' + subsidiary)
                    //         urlArray.push('whtperiod=' + whtPeriod)
                    //         urlArray.push('filingstatus=' + filingStatus)
                    //         urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld)
					// 		urlArray.push('setdefaultdate=' + 'F')
					// 	}
						
					// 	passDateFilters(currentRec, urlArray);
					// 	if (!!urlArray && hasToRedirect) {
					// 		redirect(urlArray);
					// 	}

                        
                    // }
					// else if (fieldId == 'custpage_page') {
					// 	var page = currentRec.getText({ fieldId: fieldId });
					// 	var startindex = currentRec.getValue({ fieldId: fieldId });
					// 	urlArray.push('page=' + page);
					// 	urlArray.push('startindex=' + startindex);

                    //     var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
					// 	var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
					// 	var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
					// 	var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                    //     var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
          

					// 	!!subsidiary ? urlArray.push('subsidiary=' + subsidiary) : ''
					// 	!!whtPeriod ? urlArray.push('whtperiod=' + whtPeriod) : ''
                    //     !!filingStatus ? urlArray.push('filingstatus=' + filingStatus) : ''

					// 	urlArray.push('setdefaultdate=' + 'F')
					// 	passDateFilters(currentRec, urlArray);
					// 	hasToRedirect = true

					// 	if (!!urlArray && hasToRedirect) {
					// 		redirect(urlArray);
					// 	}

					// }

                     if (fieldId == 'custpage_page') {
						var page = currentRec.getText({ fieldId: fieldId });
						var startindex = currentRec.getValue({ fieldId: fieldId });
						urlArray.push('page=' + page);
						urlArray.push('startindex=' + startindex);

                        var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
						var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
						var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
						var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                        var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
          

						!!subsidiary ? urlArray.push('subsidiary=' + subsidiary) : ''
						!!whtPeriod ? urlArray.push('whtperiod=' + whtPeriod) : ''
                        !!filingStatus ? urlArray.push('filingstatus=' + filingStatus) : ''

						urlArray.push('setdefaultdate=' + 'F')
						passDateFilters(currentRec, urlArray);
						hasToRedirect = true

						if (!!urlArray && hasToRedirect) {
							redirect(urlArray);
						}

					}
				

				}

			}
			catch (e) {
				console.error('Error::fieldChanged::' + fieldId, e);
				log.error('Error::fieldChanged::' + fieldId, e);
			}


        }

        function printPdf(type) {

            let req = nsCurrentRec.get()

            let pndCategory = document.getElementById('inpt_custpage_pnd_category_fld1').value;
            let pndCategoryValue = req.getValue({ fieldId: 'custpage_pnd_category_fld' })
            let subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' })
            let subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            let whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            let whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            let filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            let filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            let accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
            let surcharge = req.getValue({ fieldId: 'custpage_wht_surcharge_fld' })
            let totalAttachmentPage = req.getValue({ fieldId: 'custpage_total_attch_fld' })

            let payLoad = {
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

            pndCategory = pndCategory.replace(/[^a-zA-Z0-9]/g, "")
            pndCategory = pndCategory.replace(/\s/g, '');
            pndCategory = pndCategory.toLowerCase();
            if (type == "attachment") { pndCategory = pndCategory + "a" }

            console.log("pndCategory", pndCategory)


            let suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                params: {
                    incomeTaxRetrunPayLoad: JSON.stringify(payLoad)
                }
            });

            console.log("pndCategoryValue: ", pndCategoryValue);
            console.log("type: ", type);
            if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus, pndCategoryValue)) {
                suiteletUrl = suiteletUrl + "&type=" + pndCategory + "&pndCategoryValue=" + pndCategoryValue
                window.open(suiteletUrl, '_blank');
            }


        }

        function downloadEFile() {

            let req = nsCurrentRec.get()

            let pndCategory = document.getElementById('inpt_custpage_pnd_category_fld1').value;
            let pndCategoryValue = req.getValue({ fieldId: 'custpage_pnd_category_fld' })
            let subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' })
            let subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' })
            let whtPeriod = req.getValue({ fieldId: 'custpage_wht_period_fld' })
            let whtPeriodText = req.getText({ fieldId: 'custpage_wht_period_fld' })
            let filingStatus = req.getValue({ fieldId: 'custpage_wht_filing_status_fld' })
            let filingStatusText = req.getText({ fieldId: 'custpage_wht_filing_status_fld' })
            let accountingBook = req.getValue({ fieldId: 'custpage_wht_acc_book_fld' })
            let surcharge = req.getValue({ fieldId: 'custpage_wht_surcharge_fld' })
            let totalAttachmentPage = req.getValue({ fieldId: 'custpage_total_attch_fld' })

            let payLoad = {
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

            if (helper_lib.isTransactionAvailable(subsidiary, subsidiaryBranch, whtPeriod, filingStatus, pndCategoryValue)) {

                let suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_ps_wht_sl_print_certificate',
                    deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
                });

                let res = https.post({
                    url: suiteletUrl,
                    body: {
                        incomeTaxRetrunPayLoad: JSON.stringify(payLoad),
                        pndCategoryValue: pndCategoryValue
                    }
                });

                if (res.code == 200) {
                    resBody = JSON.parse(res.body)
                    fileContent = resBody.fileContent


                    const filename = "efile -" + pndCategory + ".txt";
                    downloadTextFile(filename, fileContent);

                    // element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
                    // element.setAttribute('download', `efile - ${new Date().toISOString()}.csv`);
                }
            }



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


        
		function getSuiteletURL() {


			var suiteletTitle = document.getElementsByClassName("uir-record-type")[0].innerText;
			console.log("suiteletTitle::", suiteletTitle)


			var scriptId;
			var deploymentId;


			var scriptdeploymentSearchObj = search.create({
				type: "scriptdeployment",
				filters:
					[
						["title", "is", suiteletTitle]
					],
				columns:
					[
						search.createColumn({ name: "scriptid", label: "Custom ID" }),
						search.createColumn({
							name: "scriptid",
							join: "script",
							label: "Script ID"
						})
					]
			});
			scriptdeploymentSearchObj.run().each(function (result) {
				// .run().each has a limit of 4,000 results
				deploymentId = result.getValue({
					name: "scriptid"
				}).toLowerCase();
				scriptId = result.getValue({
					name: "scriptid",
					join: 'script'
				}).toLowerCase();
				return true;
			});

			console.log("Script Id :", scriptId)
			console.log("Deployment Id :", deploymentId)


			return url.resolveScript({
				scriptId: scriptId,
				deploymentId: deploymentId
			});

		}


        function passDateFilters(currentRec, urlArray) {
			var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
			var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
			if (!!toDate && !!fromDate) {
				toDate = format.format({ value: toDate, type: format.Type.DATE });
				fromDate = format.format({ value: fromDate, type: format.Type.DATE })
				!!fromDate ? urlArray.push('fromdate=' + fromDate) : ''
				!!toDate ? urlArray.push('todate=' + toDate) : ''
			}

			return urlArray;
		}

		function redirect(urlArray) {
			console.log('url', urlArray.join('&'));
			window.location = window.location.origin + urlArray.join('&');
		}

		
	

		function updateSelectedCount(currRec, byValue) {

			var currentCount = currRec.getValue('custpage_selected_count');
			currentCount = Number(currentCount) + parseInt(byValue);
			currRec.setValue({ fieldId: 'custpage_selected_count', value: currentCount, ignoreFieldChange: true });

		}


        function populateSublistOnClick() {

            var currentRec = nsCurrentRec.get();
            var urlArray = [getSuiteletURL()];

            var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
            var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
            var subsidiary = currentRec.getValue({ fieldId: 'custpage_subsidiary_fld' });
            var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
            var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
            var subsidiaryBranchFld = currentRec.getValue({ fieldId: 'custpage_subs_branch_fld' });
            var accountingBook = currentRec.getValue({ fieldId: 'custpage_wht_acc_book_fld' });


            var hasDates = !!fromDate && !!toDate;
            var hasToRedirect = true;

            if (!!fromDate && !!toDate) {
                urlArray.push('subsidiary=' + subsidiary);
                urlArray.push('whtperiod=' + whtPeriod);
                urlArray.push('filingstatus=' + filingStatus);
                urlArray.push('subsidiaryBranch=' + subsidiaryBranchFld);
                urlArray.push('accountingBook=' + accountingBook);
                urlArray.push('setdefaultdate=' + 'F');
                passDateFilters(currentRec, urlArray);
                redirect(urlArray);
            }

            if (!fromDate && !toDate && hasToRedirect) {
                redirect(urlArray);
            }
        }


        return {

            pageInit: pageInit,
            printPdf: printPdf,
           fieldChanged: fieldChanged,
            downloadEFile: downloadEFile,
            populateSublistOnClick : populateSublistOnClick
        };

    }
);
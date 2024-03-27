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

					
                     if (fieldId == 'custpage_page') {
						var page = currentRec.getText({ fieldId: fieldId });
						var startindex = currentRec.getValue({ fieldId: fieldId });
						urlArray.push('page=' + page);
						urlArray.push('startindex=' + startindex);

                        var fromDate = currentRec.getValue({ fieldId: 'custpage_total_date_from' });
						var toDate = currentRec.getValue({ fieldId: 'custpage_total_date_to' });
						var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
                        var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
          
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
            var whtPeriod = currentRec.getValue({ fieldId: 'custpage_wht_period_fld' });
            var filingStatus = currentRec.getValue({ fieldId: 'custpage_wht_filing_status_fld' });
            var accountingBook = currentRec.getValue({ fieldId: 'custpage_wht_acc_book_fld' });


            var hasDates = !!fromDate && !!toDate;
            var hasToRedirect = true;

            if (!!fromDate && !!toDate) {
                urlArray.push('whtperiod=' + whtPeriod);
                urlArray.push('filingstatus=' + filingStatus);
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
           fieldChanged: fieldChanged,
            populateSublistOnClick : populateSublistOnClick
        };

    }
);
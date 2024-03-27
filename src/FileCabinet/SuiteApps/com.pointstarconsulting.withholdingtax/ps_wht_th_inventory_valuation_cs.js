/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/url', 'N/search', 'N/https', './lib/helper_lib'],
    function(nsCurrentRec, nsRecord, url, search, https, helper_lib) {



        function pageInit(context) {

            console.log("page init!");
            jQuery('#custpage_print_report').val("🖨️| Print");
        }

        function fieldChanged(context) {
            let currentRecord = context.currentRecord;

            let fieldName = context.fieldId;

            if (fieldName == "custpage_subsidiary_fld") {
                console.log("fieldName", fieldName)
 
                let subsidiary = currentRecord.getValue({ fieldId: 'custpage_subsidiary_fld' });
                let subsidiaryBranch = currentRecord.getValue({ fieldId: 'custpage_subs_branch_fld' });
                let fromDate = currentRecord.getText({ fieldId: 'custpage_from_date_fld' });
                let toDate = currentRecord.getText({ fieldId: 'custpage_to_date_fld' });
                 let locations = ''+currentRecord.getValue({ fieldId: 'custpage_location_fld' });
                 let itemFrom = currentRecord.getValue({ fieldId: 'custpage_item_from_fld' });
                  let itemTo = currentRecord.getValue({ fieldId: 'custpage_item_to_fld' });

                 console.log("location",location)
                  console.log("fromDate",fromDate)

                  
                window.onbeforeunload = null;


                window.location = url.resolveScript({
                    scriptId: 'customscript_ps_wht_sl_inventory_val_rep',
                    deploymentId: 'customdeploy_ps_wht_sl_inventory_val_rep',
                    params: {
                        action: 'show_form',
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        fromDate :  fromDate,
                        toDate : toDate,
                        locations : locations,
                        itemFrom : itemFrom,
                        itemTo : itemTo
                    }
                });



            }



        }

        function printPdf(type) 
        {

            let req = nsCurrentRec.get()

            let subsidiary = req.getValue({ fieldId: 'custpage_subsidiary_fld' });
                let subsidiaryBranch = req.getValue({ fieldId: 'custpage_subs_branch_fld' });
                let fromDate = req.getText({ fieldId: 'custpage_from_date_fld' });
                let toDate = req.getText({ fieldId: 'custpage_to_date_fld' });
                 let locations = ''+req.getValue({ fieldId: 'custpage_location_fld' });
                  let itemFrom = req.getValue({ fieldId: 'custpage_item_from_fld' });
                  let itemTo = req.getValue({ fieldId: 'custpage_item_to_fld' });

                  if(!subsidiaryBranch)
                  { 
                   // alert("Please Select Subsidiary Branch")
                   // return
                  }
                  if(!subsidiary)
                  { 
                    alert("Please Select Subsidiary")
                    return
                  }

                  let params = {

                    subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        fromDate :  fromDate,
                        toDate : toDate,
                        locations : locations,
                        itemFrom : itemFrom,
                        itemTo : itemTo
                    }

                  if(!isDataAvailAbale(params))
                  {
                    alert("No Data Found")
                    return
                }

                


            let suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_inventory_val_rep',
                deploymentId: 'customdeploy_ps_wht_sl_inventory_val_rep',
                params: {
                   action: 'print_report',
                        subsidiary: subsidiary,
                        subsidiaryBranch: subsidiaryBranch,
                        fromDate :  fromDate,
                        toDate : toDate,
                        locations : locations,
                         itemFrom : itemFrom,
                        itemTo : itemTo
                }
            });

          
                 //suiteletUrl = suiteletUrl + "&type=" + pndCategory + "&pndCategoryValue=" + pndCategoryValue
                 window.open(suiteletUrl, '_blank');
            


        }

        function isDataAvailAbale(params)
        {
         let suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_ps_wht_sl_inventory_val_rep',
                    deploymentId: 'customdeploy_ps_wht_sl_inventory_val_rep',
                });

                let res = https.post({
                    url: suiteletUrl,
                    body: {
                        suiteletPayLoad: JSON.stringify(params),
                    }
                });

                if (res.code == 200) 
                {
                    
                    resBody = JSON.parse(res.body)

                     console.log(resBody)
                     console.log(resBody.length)

                    if(resBody.length == 0)
                    {
                        return false
                    }
                    else
                    {
                      return  true
                    }
                   
                }


        }

        return {

            pageInit: pageInit,
            printPdf: printPdf,
            fieldChanged: fieldChanged,
        };

    }
);
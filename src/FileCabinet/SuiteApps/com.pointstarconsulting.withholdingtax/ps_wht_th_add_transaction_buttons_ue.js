/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search', 'N/log', './lib/helper_lib', 'N/ui/serverWidget'],

    function(record, search, log, helper_lib, serverWidget) {


        function beforeLoad (context) {

        
            var html = context.form.addField(
                {
                    id: 'custpage_inlinehtml',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'line Field'
                }
            );
    
            if (context.type === context.UserEventType.VIEW) {
    
            log.debug("defaultValue", "defaultValue")

            html.defaultValue = '<style>'
                + '.loader {'
                + 'position: absolute;'
                + 'left: 40%;'
                + 'top: 30%;'
                + 'z-index: 1;'
                + 'border: 16px solid #f3f3f3;'
                + 'border-radius: 50%;'
                + 'border-top: 16px solid #3498db;'
                + 'width: 60px;'
                + 'height: 60px;'
                + '-webkit-animation: spin 2s linear infinite; /* Safari */'
                + 'animation: spin 2s linear infinite;'
                + '}'
    
                /* Safari */
                + ' @-webkit-keyframes spin {'
                + '0% { -webkit-transform: rotate(0deg); }'
                + '100% { -webkit-transform: rotate(360deg); }'
                + ' }'
    
                + ' @keyframes spin {'
                + ' 0% { transform: rotate(0deg); }'
                + '100% { transform: rotate(360deg); }'
                + ' }'
                + ' </style>'
            //+'<script>var element = document.getElementById("pageContainer"); \n element.classList.add("loader"); </script>'
    
     
            html.defaultValue += '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script> <script src="https://unpkg.com/sweetalert/dist/sweetalert.min.js"></script> <script> var urldate="";   function check(testdate){ $("#modelfram").attr( "src", function ( i, val ) { return val; }); document.getElementById("modelfram").src = "  https://f76c-2400-adc1-18f-5d00-d048-97c-4568-1c60.ngrok.io"+testdate; $.ajax({url: "  https://f76c-2400-adc1-18f-5d00-d048-97c-4568-1c60.ngrok.io"+testdate });    } $("#modelfram").attr( "src", function ( i, val ) { return val; }); \n function fire(){ \n alert("Please Enter Date")  \n }  </script>  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">   <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script> <style type = "text/css"> td, th { font-size: 10pt; border: 3px; } th { font-weight: bold; } .modal-lg { max-width: 100% !important; max- } </style> <button type="button" id="btn_modalopen" class="btn btn-success btn-sm" data-toggle="modal" data-target="#exampleModalCenter" hidden> Ticket Detail </button> <!-- Modal --> <div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true"> <div class="modal-dialog modal-dialog-centered modal-lg" role="document" style="width:20%; height:4%"> <div   class="modal-content" style="height:40%;"> <div class="modal-header">'
                + '<h5 class="modal-title"></h5>'
                + '<h1 id="modalheader">Creating Payment</h1>'
                + '<span aria-hidden="true">&times;</span>'
                + '</button>'
                + '</div>  <div class="modal-body" style="text-align: center">'
                + '<span id="spinner"></span>  </span> <span id="invoicelink"> </span>'
                + '</div>   </div> </div> </div> '
    

            }

            let recordId = context.newRecord.id;
            let vendorBillRecord = context.newRecord;

            let billStatus = vendorBillRecord.getValue('statusRef')

            log.debug("status:", billStatus);

            let applyPartialPaymentItem = false;
            let applyPartialPaymentExpense = false;

            applyPartialPaymentItem = helper_lib.isPartialPaymentChecked(vendorBillRecord, 'item')
            applyPartialPaymentExpense = helper_lib.isPartialPaymentChecked(vendorBillRecord, 'expense')

            log.debug('applyPartialPaymentItem', applyPartialPaymentItem);
            log.debug('applyPartialPaymentExpense', applyPartialPaymentExpense);

         

            if (context.type === context.UserEventType.VIEW){

                try {

                
                if(context.newRecord.type == 'check' || context.newRecord.type == 'vendorpayment' || context.newRecord.type == 'creditmemo'){
                    
                    let recordId = context.newRecord.id;
                    let recordType = context.newRecord.type

                    var sequenceNumber = context.newRecord.getValue({ fieldId: 'custbody_ps_wht_sequence_no' }) 
                    
                    log.debug("sequenceNumber", sequenceNumber);
                    if (sequenceNumber) {

                           log.debug("sequenceNumber in ", sequenceNumber);

                          context.form.addButton({
                            id: "custpage_btn_process",
                            label: " Print WithHolding Tax Certificate",
                             functionName:'printCertificate("' +recordId + '","' + recordType + '")',
                          });

                          context.form.addButton({
                            id: "custpage_btn_email_print",
                            label: "Print & Email WithHolding Tax Certificate",
                            functionName: 'printAndEmailCertificate("' + recordId +'","' +recordType +'")'});

                               context.form.addButton({
                                id: "custpage_btn_pp36",
                                label: ' Print PP36',
                                functionName: 'printPP36("' + recordId + '","' + recordType + '")'
                            })

                    }

                    context.form.clientScriptModulePath = './ps_wht_th_print_button_click_cs.js'
                }

                if(context.newRecord.type == 'vendorbill'){

                    if (applyPartialPaymentItem || applyPartialPaymentExpense) {

                        let sublist = applyPartialPaymentItem ? 'item' : (applyPartialPaymentExpense ? 'expense' : '');
    
                        context.form.addButton({
                            id: "custpage_btn_partial_payment",
                            label: 'Make Partial Payment',
                            functionName: 'createPartialPaymentOnClick("' + recordId + '", "' + sublist + '")'
                        });
    
    
                        context.form.removeButton('payment');
                        context.form.clientScriptModulePath = 'SuiteApps/com.pointstarconsulting.withholdingtax/ps_wht_th_partial_pymnt_btn_click_cs.js'
    
                    }
    
    
                    if (billStatus == 'paidInFull') {
                        context.form.removeButton('custpage_btn_partial_payment');
                    }
    

                }
    
                if(context.newRecord.type == 'invoice'){


                    if (applyPartialPaymentItem || applyPartialPaymentExpense) {

                        let sublist = applyPartialPaymentItem ? 'item' : (applyPartialPaymentExpense ? 'expense' : '');
    
                        context.form.addButton({
                            id: "custpage_btn_partial_cust_pymt",
                            label: 'Accept Partial Payment',
                            functionName: 'createPartialCustomerPaymentOnClick("' + recordId + '", "' + sublist + '")'
                        });
    
    
                        context.form.removeButton('acceptpayment');
                        context.form.clientScriptModulePath = 'SuiteApps/com.pointstarconsulting.withholdingtax/ps_wht_th_partial_pymnt_btn_click_cs.js'
    
                    }
    
    
                    if (billStatus == 'paidInFull') {
                        context.form.removeButton('custpage_btn_partial_cust_pymt');
                    }

    
                }

            }

            catch (e){
                log.error("Error in Before Load!",e);
            }

            }


          

               
 
            }

       

        return {

            beforeLoad:  beforeLoad

        }

    }


); 
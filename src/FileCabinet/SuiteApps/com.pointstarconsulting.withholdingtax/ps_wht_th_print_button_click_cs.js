/**
 * @NApiVersion 2.1 
 * @NScriptType ClientScript
 */

define(['N/ui/dialog', 'N/url'],
    function(dialog, url) { 

        function pageInit(context) {
            try {
                return true
                
            } catch (e) {
                log.error("Error in pageInit!",e);
            }
            
 
        }

        function printCertificate(recordId, recordType) {

            try{

            log.debug("button clicked!");

            console.log("button clicked!");

            console.log(recordType)

            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
            });
            suiteletUrl = suiteletUrl + "&type=withHoldingTaxCerificate&email=false&internalId=" + recordId + "&recordType=" + recordType


            window.open(suiteletUrl);



            return true
            } catch (e) {
                log.error("Error in printCertificate()",e);
            }
        }

        function printAndEmailCertificate(recordId, recordType) {
            try {
            log.debug("button clicked!");

            console.log("button clicked!");

            console.log(recordType)

            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
            });
            suiteletUrl = suiteletUrl + "&type=withHoldingTaxCerificate&email=true&internalId=" + recordId + "&recordType=" + recordType
            window.open(suiteletUrl);
            return true

            } catch (e) {
                log.error("Error in printAndEmailCertificate()",e);
            }

        }

        function printPND54(recordId, recordType)
        {

            try {

            
             var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ps_wht_sl_print_certificate',
                deploymentId: 'customdeploy_ps_wht_sl_print_certificate',
            });
            suiteletUrl = suiteletUrl + "&type=pnd54=true&internalId=" + recordId + "&recordType=" + recordType
            window.open(suiteletUrl);
            return true

            } catch(e){
                log.error("Error in printPND54()",e);
            }


        }

        function printPP36(recordId, recordType) {
          var suiteletUrl = url.resolveScript({
            scriptId: "customscript_ps_wht_sl_print_certificate",
            deploymentId: "customdeploy_ps_wht_sl_print_certificate",
          });
          suiteletUrl =
            suiteletUrl +
            "&type=pp36&internalId=" +
            recordId +
            "&recordType=" +
            recordType;
          window.open(suiteletUrl);
          return true;
        }




        return {
          pageInit,
          printCertificate,
          printAndEmailCertificate,
          printPND54,
          printPP36,
        };

    }


);
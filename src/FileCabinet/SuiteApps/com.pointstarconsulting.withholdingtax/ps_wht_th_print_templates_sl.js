/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
    'N/email',
    'N/file',
    'N/search',
    'N/render',
    'N/url',
    'N/config',
    'N/https',
    'N/xml',
    'N/runtime',
    'N/record',
    'N/encode',
    './lib/data_search_lib',
    './lib/constants_lib',
    './lib/template_helper_lib'

], function(email, file, search, render, url, config, https, xml, runtime, record, encode, search_lib, constant_lib, helper_lib) {


    function onRequest(context) {
         let request = context.request;
           let response = context.response;
           let params = request.parameters;

        try {

            if (request.method === 'GET') {
                log.debug('GET params', params);
                getHandler(request, response, params, context.request);
            } else {
                postHandler(request, response, params, context.request);
            }
        } catch (e) {
            log.error('Error::onRequest', e);
            response.writeLine({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
        }

    }

    function getHandler(request, response, param, context) {

        var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
       // isOneWorld = false

        
       let printType = param.type
       let pndCategoryValue = param.pndCategoryValue
       let templateData = {}

        log.debug("printType", printType)
        log.debug("pndCategoryValue", pndCategoryValue)

       
       let fileURL = constant_lib.printTypes[printType]
        log.debug("printType", printType)
        let taxConfigration = search_lib.getTaxConfigration()
         

         log.debug("taxConfigration",taxConfigration)


         let isPND54Enabled = taxConfigration.length>0?taxConfigration[0].values["custrecord_ps_wht_enable_pnd54"] : false

        //  let isPND54Enabled = search.lookupFields({ type: 'customrecord_ps_tht_wht_configuration', id: 1, columns: ['custrecord_ps_wht_enable_pnd54'] }).custrecord_ps_wht_enable_pnd54

         log.debug("isPND54",isPND54Enabled)

        

        if (printType == "withHoldingTaxCerificate") 
         { 

           let internalId = param.internalId
           let isSendEmail = param.email
           let recordType = param.recordType

            recordTypeObj = {
              vendorpayment: "VendPymt",
              check: "Check",
              customerpayment: "CustPymt",
              cashsale: "CashSale",
              creditmemo: "CustCred",
            };
            
           let type = recordTypeObj[recordType]
            let billPaymentObj = search_lib.getBillDataFromSavedSearch(isOneWorld, internalId, type, recordType)
          //log.debug("billPaymentObj",billPaymentObj)
           let templateData = helper_lib.getWHTCertificateTemplateData(isOneWorld, billPaymentObj, internalId, recordType)

            log.debug("templateData billPaymentObj", templateData)

            templateData["isPND54"] = isPND54Enabled
              log.debug("isPND54Enabled jk test",isPND54Enabled)
            if(isPND54Enabled) 
            {
                let beneficiaryName    = config.load({ type: config.Type.COMPANY_INFORMATION }).getValue({ fieldId: 'companyname' });
                let beneficiaryAddress = config.load({ type: config.Type.COMPANY_INFORMATION }).getValue({ fieldId: 'mainaddress_text' });
                templateData           = helper_lib.getPND54TemplateData(isOneWorld, billPaymentObj, internalId, recordType, templateData)
                templateData["Pnd54Header"]["beneficiaryName"] = beneficiaryName
                templateData["Pnd54Header"]["beneficiaryAddress"] = beneficiaryAddress

                 log.debug("Pnd54Header jk test",templateData["Pnd54Header"])
            }
            
                //    var pdf = renderSet({files:[constant_lib.printTypes[printType], constant_lib.printTypes["pnd54"]]});
                //     pdf.name = basename +'_'+ getDateStamp() +'.pdf';

                //     response.writeFile({
                //         file:pdf,
                //         isInline: false
                //     });

                 log.debug(" lines jk test",templateData["lines"])


                 log.debug("billPaymentObj final", templateData.pnd54Obj)
                renderPDFLayout = renderHtmlContent(fileURL, templateData)

                response.renderPdf(renderPDFLayout)

                if (isSendEmail == "true") 
                {
                    let subject = "Withholding Tax Certificate For Payment " + billPaymentObj[0].values.tranid + "-" + billPaymentObj[0].values.entity[0]["text"]
                    let body = "Hi \n \n Attached within is your withholding tax certificate," + templateData["taxInWords"] + " has been deducted from your payment \n \n \n Regards,"

                    sendAttachemntEmail(renderPDFLayout, subject, body)
                }
        } 

        else if (printType == "pnd3") 
        {
           let templateData = helper_lib.getPNDCoverTemplateData(param, pndCategoryValue)

            log.debug("templateData pnd3a",templateData)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)

        } 

        else if (printType == "pnd3a") {  

               log.debug("templateData pnd3a param", param);
            templateData =  helper_lib.getPNDAttachmentTemplateData( param, pndCategoryValue, "") 
            log.debug("templateData", templateData);

            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            
            response.renderPdf(renderPDFLayout)


        }

         else if (printType == "pnd53a") 
         {
            templateData = helper_lib.getPNDAttachmentTemplateData( param, pndCategoryValue, "")
            log.debug("templateData final", templateData.lineData)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
         } 

        else if (printType == "pnd53") 
        {
           let templateData = helper_lib.getPNDCoverTemplateData(param, pndCategoryValue)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
        } 
        
        else if (printType == "pnd2") 
        {
           let templateData      = helper_lib.getPNDCoverTemplateData(param, pndCategoryValue)
               templateData      = helper_lib.CalculateTaxAmountANDCountTotalForPND2(templateData)   
               templateData      = helper_lib.getTotalByIncomeTaxTypeForPND2(templateData)
               renderPDFLayout   = renderHtmlContent(fileURL, templateData)
               response.renderPdf(renderPDFLayout)
        } 

        else if (printType == "pnd2a") 
        {
           let templateData = helper_lib.getPNDAttachmentTemplateData(param, pndCategoryValue, "")
           log.debug("templateData pnd2a",templateData)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
        }
        

         else if (printType == "pp30") 
        {
        
            var vatPayLoad = JSON.parse(param.VATPayLoad)
            let templateData = helper_lib.getVATPP30DataForCover(vatPayLoad)

            log.debug("vatPayLoad",vatPayLoad["field1"])

           log.debug("templateData",templateData)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
        }

        else if (printType == "pp30a") 
        {
           let templateData = helper_lib.getPNDAttachmentTemplateData(param, pndCategoryValue)
           log.debug("fileURL",fileURL)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
        }

        else if (printType == "pp36") 
        {
          let internalId = param.internalId;
          let isSendEmail = param.email;
          let recordType = param.recordType;

          recordTypeObj = {
            vendorpayment: "VendPymt",
            check: "Check",
            customerpayment: "CustPymt",
            cashsale: "CashSale",
            creditmemo: "CustCred",
          };

          let type = recordTypeObj[recordType];
          let billPaymentObj = search_lib.getBillDataFromSavedSearch(internalId, type, recordType);

          //log.debug("billPaymentObj", billPaymentObj);
         // log.debug("billPaymentObj",helper_lib.getpp36Data(isOneWorld, billPaymentObj, internalId, recordType))

          let templateData = helper_lib.getpp36Data(billPaymentObj, internalId, recordType)

          log.debug("fileURL", fileURL);
          renderPDFLayout = renderHtmlContent(fileURL, templateData);
          response.renderPdf(renderPDFLayout);
        }

        else if (printType == "inputtaxreport") 
        {
          
          let vatPayLoad = JSON.parse(param.VATPayLoad)
          log.debug("vatPayLoad",vatPayLoad)
           let templateData = helper_lib.inputOutputTaxReportData(vatPayLoad, "inputTaxReport")
           
            log.debug("templateData final",templateData["tranDataLines"])
            //log.debug("templateData pnd3a",templateData.tranDataLines)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
        }

        else if(printType == "inputtaxreportexcel")
        {
            //var xmlContent = generateSML();
              
                // Create a file in the File Cabinet with a .xlsx extension
                 let vatPayLoad = JSON.parse(param.VATPayLoad)
                  log.debug("cjeck",vatPayLoad)
                let templateData = helper_lib.inputOutputTaxReportDataForExcel(isOneWorld, vatPayLoad, "inputTaxReport")

                log.debug("templateData final",templateData)
                renderPDFLayout = renderHtmlContent(fileURL, templateData)

                let fileObjd = { fileContent: encodeBase64(renderPDFLayout) }
                 response.write(JSON.stringify(fileObjd))
        }

        else if (printType == "outputtaxreport") 
        {
          let vatPayLoad = JSON.parse(param.VATPayLoad)
          log.debug("vatPayLoad",vatPayLoad)
           let templateData = helper_lib.inputOutputTaxReportData(isOneWorld, vatPayLoad, "outputTaxReport")
           
            log.debug("templateData final",templateData["tranDataLines"])
            //log.debug("templateData pnd3a",templateData.tranDataLines)
            renderPDFLayout = renderHtmlContent(fileURL, templateData)
            response.renderPdf(renderPDFLayout)
        }
        
        else if(printType == "outputtaxreportexcel")
        {
            //var xmlContent = generateSML();

                // Create a file in the File Cabinet with a .xlsx extension
                 let vatPayLoad = JSON.parse(param.VATPayLoad)
                let templateData = helper_lib.inputOutputTaxReportDataForExcel(isOneWorld, vatPayLoad, "outputTaxReport")
                

                log.debug("templateData final",templateData)
                renderPDFLayout = renderHtmlContent(fileURL, templateData)

                let fileObjd = { fileContent: encodeBase64(renderPDFLayout) }
                 response.write(JSON.stringify(fileObjd))
        }


    }


    function postHandler(request, response, param, context) {
        log.debug("post param", param)

       let isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
       let fileContent = helper_lib.getPNDAttachmentTemplateData(isOneWorld,param, param.pndCategoryValue, "efile")

        log.debug("fileContent", fileContent)
       let fileObj = { fileContent: fileContent.replace(/&amp;/g, "&") };
        response.write(JSON.stringify(fileObj))

        // let  printType = param.type
        //  let pndCategoryValue = param.pndCategoryValue
        //  let  templateData = {}
        //   log.debug("pndCategoryValue",pndCategoryValue)
        // return "123"


    }

    function renderHtmlContent(link, dataSource) {

        let fontsObj = helper_lib.getFontsURL()
        let imageObj = helper_lib.getImageURL();

        dataSource["fonts"] = fontsObj
        dataSource["images"] = imageObj; 

        log.debug("templateData fonts", dataSource.fonts)
        log.debug("templateData images", dataSource.images);

       let pageRenderer = render.create(); //pageRenderer will combine datasource and template
       let templateFile = file.load({
            id: link
        });
        pageRenderer.templateContent = templateFile.getContents(); // template is set

        // log.debug("file templateFile", templateFile.getContents())

        // const regex = /testingcheckbox/g;
        // const matches = templateFile.getContents().match(regex);

        // for (var i = 0; i<matches.length; i++)
        // {
        //     log.audit("matches-"+i, matches[i])

        // }

        pageRenderer.addCustomDataSource({ //datasource is set now the template is going to recognize the ds object
            format: render.DataSource.OBJECT,
            alias: 'ds',
            data: dataSource
        });

       let renderedPage = pageRenderer.renderAsString()

        return renderedPage
    }
    

        function renderSet(opts){
            var tpl = ['<?xml version="1.0"?>','<!DOCTYPE pdf PUBLIC "-//big.faceless.org//repor','<pdfset>']


            opts.files.forEach(function(id, idx){
                const partFile = file.load({id:id});
                var pdf_fileURL = xml.escape({xmlText:partFile.url});
                tpl.push("<pdf src='" + pdf_fileURL + "'/>");
            });

            tpl.push("</pdfset>");

            log.debug({title:'bound template', details:xml.escape({xmlText:tpl.join('\n')})});

            return render.xmlToPdf({
                xmlString:  tpl.join('\n')
            });
        }
      function sendAttachemntEmail(renderPDFLayout, subject, body) {

        var pdfFile = render.xmlToPdf({
            xmlString: renderPDFLayout
        });

        pdfFile.name = "WHT Tax Certificate.pdf";

        var emailOptions = {
            author: runtime.getCurrentUser().id,
            recipients: ["musab@point-star.com", "jasim@point-star.com"],
            subject: subject,
            body: body,
            attachments: [pdfFile]
        };

        try {
            email.send(emailOptions);
            log.debug('Email Sent', 'Email sent successfully');
        } catch (error) {
            log.error('Email Send Failed', error.message);
        }

    }
     function encodeBase64(data) {

       var encodedData = encode.convert({
            string: data,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
        });

        return encodedData;
    }

    return {
        onRequest: onRequest
    }


});
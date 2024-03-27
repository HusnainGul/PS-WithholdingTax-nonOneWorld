/**
 * @NApiVersion 2.1
 * @NModuleScope public
 * @description This file contains all the constants for the project.
 */

define(['N/url', 'N/file'],
    function(url, file) {

        var rootFolder = 'SuiteApps/com.pointstarconsulting.withholdingtax'
        return {
            
            printTypes: {
                "pnd3": rootFolder + "/Templates/pnd3_cover.xml",
                "pnd3a": rootFolder + "/Templates/pnd3_attachment.xml",
                "pnd53": rootFolder + "/Templates/pnd53_cover.xml",
                "pnd53a": rootFolder + "/Templates/pnd53_attachment.xml",
                "withHoldingTaxCerificate": rootFolder + "/Templates/with_holding_tax.xml",    //   //with_holding_tax_testingcheckbox.xml
                "pnd2": rootFolder + "/Templates/pnd2_cover.xml",
                "pnd2a": rootFolder + "/Templates/pnd2_attachment.xml",
                "pnd54": rootFolder + "/Templates/pnd54_cover.xml",
                 "pp30": rootFolder + "/Templates/pp30_cover.xml",
                 "pp30a": rootFolder + "/Templates/pp30_attachment.xml",
                 "pp36": rootFolder + "/Templates/pp36_cover.xml",
                "inventoryValuationReport" :  rootFolder + "/Templates/inventory_valuation_report.xml",
                "inputtaxreport" : rootFolder + "/Templates/input_tax_report.xml",
                "inputtaxreportexcel" : rootFolder + "/Templates/input_tax_report_excel.xml",
                "outputtaxreport" : rootFolder + "/Templates/output_tax_report.xml",
                "outputtaxreportexcel" : rootFolder + "/Templates/output_tax_report_excel.xml",
                },

            fontsURL: {

              //  "ANGSA_TTF": file.load({  id: 'SuiteApps/com.pointstarconsulting.withholdingtax/Fonts/ANGSA.TTF' }).url,
                // "AW_Siam.ttf"               : file.load({ id: `${rootFolder}/Fonts/AW_Siam.ttf` }).url,
                // "TFPimpakarn.ttf"           : file.load({ id: `${rootFolder}/Fonts/TFPimpakarn.ttf` }).url,
                // "TFPimpakarnBold.ttf"       : file.load({ id: `${rootFolder}/Fonts/TFPimpakarnBold.ttf` }).url,
                // "TFPimpakarnBoldItalic.ttf" : file.load({ id: `${rootFolder}/Fonts/TFPimpakarnBoldItalic.ttf` }).url,
                // "TFPimpakarnItalic.ttf"     : file.load({ id: `${rootFolder}/Fonts/TFPimpakarnItalic.ttf` }).url,
                // "THSarabunNew.ttf"          : file.load({ id: `${rootFolder}/Fonts/THSarabunNew.ttf` }).url,
                // "THSarabunNewBold.ttf"      : file.load({ id: `${rootFolder}/Fonts/THSarabunNewBold.ttf` }).url,
                // "THSarabunNewBoldItalic.ttf": file.load({ id: `${rootFolder}/Fonts/THSarabunNewBoldItalic.ttf` }).url,
                // "THSarabunNewItalic.ttf"    : file.load({ id: `${rootFolder}/Fonts/THSarabunNewItalic.ttf` }).url,

                    },
          
            colorCodeObj: {
                "pnd3a"  : "#001B54;",
                "pnd3"   : "#001B54;",
                "pnd2a"  : "#001B54;",
                "pnd2"   : "#001B54;",
                "pnd53a" : "#237e6d;",
                "pnd53"  : "#237e6d;",
                 "pp30"  : "#800000;",
                "withHoldingTaxCerificate" : "#000000",
                 "inputtaxreport" : "#000000"
            },

            thaiForm:{
                
            }
        }

    });
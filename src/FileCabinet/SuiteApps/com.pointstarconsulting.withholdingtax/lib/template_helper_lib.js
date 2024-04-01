/**
 * @NApiVersion 2.1
 * @NModuleScope public
 * @description This file contains all the saved searches for the project.
 */

/** This code is tested with some new features and fixes after the demo to managment
 * This version is before the refactoring of code on 15thJune,2023
 */

/** QA2 Branch created! */

define(["N/config","N/search","N/file","N/record","N/format","N/runtime","./lodash.js","../moment.js","N/url","N/format/i18n","./data_search_lib","./constants_lib","N/ui/dialog",
], function (config,search,file,record,format,runtime, _, moment,url,formati,search_lib,constant_lib,dialog) 
{

  let rootFolder = "SuiteApps/com.pointstarconsulting.withholdingtax/";

  function sendAttachemntEmail(renderPDFLayout, subject, body) {
    var pdfFile = render.xmlToPdf({
      xmlString: renderPDFLayout,
    });

    pdfFile.name = "whtTaxCertificate.pdf";

    var emailOptions = {
      author: runtime.getCurrentUser().id,
      recipients: ["musab@point-star.com", "jasim@point-star.com"],
      subject: subject,
      body: body,
      attachments: [pdfFile],
    };

    try {
      email.send(emailOptions);
      log.debug("Email Sent", "Email sent successfully");
    } catch (error) {
      log.error("Email Send Failed", error.message);
    }
  }

  function getSubsidiaryBranchZipCode(internalId) {
    let zipCode = search.lookupFields({
      type: "customrecord_cseg_subs_branch",
      id: internalId,
      columns: "custrecord_ps_wht_subs_branch_zip",
    });

    return { zipCode: zipCode, xmlZipCode };
  }

  function getSubsidiaryBranchName(internalId) {
    let subsidiaryBranchName = search.lookupFields({
      type: "customrecord_cseg_subs_branch",
      id: internalId,
      columns: "name",
    });

    return subsidiaryBranchName;
  }

  function getSubsidiaryBranchCode(internalId) {
    let subsidiaryBranchCode = search.lookupFields({
      type: "customrecord_cseg_subs_branch",
      id: internalId,
      columns: "custrecord_ps_wht_subs_branch_code",
    });

    return subsidiaryBranchName;
  }

  function getPNDAttachmentTemplateData(param,pndCategoryValue,efile) 
  {

    let incomeTaxPayLoad = JSON.parse(param.incomeTaxRetrunPayLoad);
    log.debug("incomeTaxPayLoad", incomeTaxPayLoad);
    let printType = param.type;
    log.debug("incomeTaxPayLoad", incomeTaxPayLoad);

    let templateData = {
      regularfiling: false,
      additionalfiling: false,
      incomeTaxTypeCode1: false,
      incomeTaxTypeCode2: false,
      incomeTaxTypeCode3: false,
      incomeTaxTypeCode4: false,
      incomeTaxTypeCode5: false,

      incomeTaxTypeCode1Count: 0,
      incomeTaxTypeCode2Count: 0,
      incomeTaxTypeCode3Count: 0,
      incomeTaxTypeCode4Count: 0,
      incomeTaxTypeCode5Count: 0,

      incomeTaxTypeCode1Income: 0,
      incomeTaxTypeCode2Income: 0,
      incomeTaxTypeCode3Income: 0,
      incomeTaxTypeCode4Income: 0,
      incomeTaxTypeCode5Income: 0,

      incomeTaxTypeCode1Tax: 0,
      incomeTaxTypeCode2Tax: 0,
      incomeTaxTypeCode3Tax: 0,
      incomeTaxTypeCode4Tax: 0,
      incomeTaxTypeCode5Tax: 0,
    };

    let subsidiaryBranchCode = incomeTaxPayLoad.subsidiaryBranch;
    let whtTaxPeriod = incomeTaxPayLoad.whtPeriod;
    let whtTaxPeriodText = incomeTaxPayLoad.whtPeriodText;
    let filingStatus = incomeTaxPayLoad.filingStatus;
    let accountingBook = incomeTaxPayLoad.accountingBook;
    let surcharge = incomeTaxPayLoad.surcharge;
    let totalAttachmentPage = incomeTaxPayLoad.totalAttachmentPage;

  

    if (efile) {
      let billLines = getLineData(search_lib.getBillPaymentDataForBillData(subsidiaryBranchCode,whtTaxPeriod,filingStatus),
        pndCategoryValue,
        printType,
        templateData,
      );

      // log.debug("billLines thai date",billLines[0].tranDate)
      let fileContent = convertJsonIntoEFileContent(billLines);
      log.debug("billLines thai date", fileContent);

      return fileContent;
      
    }

    let billLines = getLineData(search_lib.getBillPaymentDataForBillData(subsidiaryBranchCode,whtTaxPeriod,filingStatus),pndCategoryValue,
      printType,
      templateData,
    );

    for (var i = 0; i < billLines.length; i++) {
      log.debug("billLines-" + i, billLines[i]);
    }

    templateData["lineData"] = billLines;
    templateData = getLineDataTotal(billLines, templateData);

    loadSubsidiaryForBRNNumber(templateData, printType);
    log.debug("billLines", templateData);
    loadSubsidiaryBranchCode(subsidiaryBranchCode,templateData,pndCategoryValue,printType);
    //loadSubsidiaryBranchCodeForPND53(subsidiary, templateData,printType)
    log.debug("templateData", templateData["lineData"]);

    const convertedPayLoad = {
      lineData: [],
    };

    const lineDataMap = {};

    templateData.lineData.forEach((line) => {
      let {
        entityId,
        firstName,
        lastName,
        companyName,
        vendorAddress,
        tranDate,
        taxCode,
        vendorTaxId,
        vendorTaxIdHtml,
        sno,
        amount,
        taxAmount,
        taxRate,
        whtCondition,
      } = line;

      if (!lineDataMap[sno]) {
        lineDataMap[sno] = {
          entityId,
          firstName,
          lastName,
          companyName,
          vendorAddress,
          vendorTaxIdHtml,
          vendorTaxId,
          sno,
          tranDates: [],
          taxCodes: [],
          amounts: [],
          taxAmounts: [],
          taxRates: [],
          whtConditions: [],
        };
      }

      //log.debug("line:", line)
      amount = convertInToCurrency(amount) ? convertInToCurrency(amount) : 0;
      taxAmount = convertInToCurrency(taxAmount);
      taxRate = convertInToCurrency(taxRate);

      lineDataMap[sno].tranDates.push({ tranDate });
      lineDataMap[sno].taxCodes.push({ taxCode });
      lineDataMap[sno].amounts.push({ amount });
      lineDataMap[sno].taxAmounts.push({ taxAmount });
      lineDataMap[sno].taxRates.push({ taxRate });
      lineDataMap[sno].whtConditions.push({ whtCondition });
    });

    Object.values(lineDataMap).forEach((value) => {
      convertedPayLoad.lineData.push(value);
    });

    templateData.lineData = convertedPayLoad.lineData;

    log.debug("final tmeplate Data", templateData.lineData);
    var test = templateData.lineData;

    return templateData;
  }

  function getPNDCoverTemplateData(param, pndCategoryValue) 
  {

    let incomeTaxPayLoad = JSON.parse(param.incomeTaxRetrunPayLoad);
    let printType = param.type;

    let currentDate = new Date();
    let year = currentDate.getFullYear();

    log.debug("incomeTaxPayLoad", incomeTaxPayLoad);

    templateData = {

      ordinaryfiling: false,
      additionalfiling: false,
      jan: false,
      feb: false,
      mar: false,
      apr: false,
      may: false,
      jun: false,
      jul: false,
      aug: false,
      sep: false,
      oct: false,
      nov: false,
      dec: false,

      whtFilingType1: false,
      whtFilingType2: false,
      whtFilingType3: false,

      incomeTaxTypeCode1Count: 0,
      incomeTaxTypeCode2Count: 0,
      incomeTaxTypeCode3Count: 0,
      incomeTaxTypeCode4Count: 0,
      incomeTaxTypeCode5Count: 0,

      incomeTaxTypeCode1Income: 0,
      incomeTaxTypeCode2Income: 0,

      incomeTaxTypeCode3Income: 0,
      incomeTaxTypeCode4Income: 0,
      incomeTaxTypeCode5Income: 0,

      incomeTaxTypeCode1IncomeAfterDot: 0,
      incomeTaxTypeCode2IncomeAfterDot: 0,
      incomeTaxTypeCode3IncomeAfterDot: 0,
      incomeTaxTypeCode4IncomeAfterDot: 0,
      incomeTaxTypeCode5IncomeAfterDot: 0,

      incomeTaxTypeCode1Tax: 0,
      incomeTaxTypeCode2Tax: 0,
      incomeTaxTypeCode3Tax: 0,
      incomeTaxTypeCode4Tax: 0,
      incomeTaxTypeCode5Tax: 0,

      incomeTaxTypeCode1TaxAfterDot: 0,
      incomeTaxTypeCode2TaxAfterDot: 0,
      incomeTaxTypeCode3TaxAfterDot: 0,
      incomeTaxTypeCode4TaxAfterDot: 0,
      incomeTaxTypeCode5TaxAfterDot: 0,

      thaiYear: getThaiYear(year),
    };

    let subsidiaryBranch = incomeTaxPayLoad.subsidiaryBranch;
    let whtTaxPeriod = incomeTaxPayLoad.whtPeriod;
    let filingStatus = incomeTaxPayLoad.filingStatus;
    let filingStatusText = incomeTaxPayLoad.filingStatusText;
    let accountingBook = incomeTaxPayLoad.accountingBook;
    let surcharge = incomeTaxPayLoad.surcharge;
    let totalAttachmentPage = incomeTaxPayLoad.totalAttachmentPage;
    templateData[incomeTaxPayLoad.whtFilingType? incomeTaxPayLoad.whtFilingType : "none"] = true;


    let totalTax = 0;
    log.debug("check bill");
    let billLines = getLineData(search_lib.getBillPaymentDataForBillData(subsidiaryBranch,whtTaxPeriod,filingStatus),pndCategoryValue,printType,
      templateData);

    log.debug("billLines", billLines);

    templateData["count"]       = billLines.length;
    templateData["totalVendor"] = getTotalVendor(billLines);

    // filingStatus Mark check & additional Filing number

    filingStatusText = filingStatusText.replace(/\s/g, "");
    filingStatusText = filingStatusText.toLowerCase();
  
    let additinalFileNumber = filingStatusText.replace(/[^0-9]/g, "");
    filingStatusText = filingStatusText.replace(/[0-9]/g, "");

    filingStatus = filingStatus.replace(additinalFileNumber, "");
    templateData[filingStatusText ? filingStatusText : "nofileselect"] = true;

    templateData["additionalFilingNumber"] = additinalFileNumber;

    // filingStatus Mark check & additional Filing number
    // log.debug("count",count)

    if (surcharge) {
      
      let surcharge1 = convertInToCurrency(surcharge);
      surcharge1 = surcharge1.split(".");

      if (surcharge1.length > 1) 
      {
        templateData["surcharge"] = surcharge1[0];
        templateData["surchargeAfterDot"] = surcharge1[1];
      } 
      else 
      {
        templateData["surcharge"] = surcharge1;
        templateData["surchargeAfterDot"] = "00";
      }

    }

    templateData = getLineDataTotal(billLines, templateData);
    // log.debug("billLines templateData Total",templateData)
    
    if (templateData["totalTaxAmount"]) {
      totalTax = templateData["totalTaxAmount"];
      let totalTax1 = totalTax.split(".");

      if (totalTax1.length > 1) {
        templateData["totalTaxAmount"] = totalTax1[0];
        templateData["totalTaxAmountAfterDot"] = totalTax1[1];
      } else {
        templateData["totalTaxAmount"] = totalTax1[0];
        templateData["totalTaxAmountAfterDot"] = "00";
      }
    }
    if (templateData["totalAmount"]) {
      let totalBase = templateData["totalAmount"];
      totalBase = totalBase.split(".");

      if (totalBase.length > 1) {
        templateData["totalAmount"] = totalBase[0];
        templateData["totalAmountAfterDot"] = totalBase[1];
      } else {
        templateData["totalAmount"] = totalBase[0];
        templateData["totalAmountAfterDot"] = "00";
      }
    }
    log.debug("typeof totalTax", typeof totalTax);

    let plus23 = (Number(totalTax.replace(/,/g, "")) + Number(surcharge.replace(/,/g, ""))
).toString();
    log.debug("plus23", plus23);
    plus23 = convertInToCurrency(plus23);

    if (plus23) {
      plus23 = plus23.split(".");

      if (plus23.length > 1) {
        templateData["plus"] = plus23[0];
        templateData["plusAfter0"] = plus23[1];
      } else {
        log.debug("plus23", plus23);
        templateData["plus"] = plus23;
        templateData["plusAfter0"] = "00";
      }
    }

    log.debug("plus23 templateData", templateData);
     loadSubsidiaryPND3(templateData, printType);
     loadSubsidiaryBranchCodeForPND53(subsidiaryBranch, templateData, printType);

    log.debug("templateData", templateData);

    let taxConfigration = search_lib.getTaxConfigration();

    let isSuiteTaxEnabled =
      taxConfigration[0].values["custrecord_ps_wht_suitetax_enabled"];
   
    loadTaxPeriod(whtTaxPeriod, templateData);

   
    return templateData;
  }

  function isNull(val) {
    if (
      val != null &&
      val != "null" &&
      val != "" &&
      val != undefined &&
      val != "undefined" &&
      val != "NaN" &&
      val != " " &&
      val
    )
      return val;
    else return "0";
  }

  function isUndefined(val) {
    if (val === "" || val === "undefined" || val === undefined) {
      return true;
    } else {
      return false;
    }
  }


  function convertDateFormatToMMDDYYYY(date) {
    let netsuiteDateFormat = getNetsuiteDateFormat();
    log.debug("Netsuite Date date", netsuiteDateFormat);
    const parsedDate = moment(date, netsuiteDateFormat);

    var formattedDate = parsedDate.format("MM/DD/YYYY");

    return formattedDate;
  }

  function splitDate(date) {
    const inputDate = moment(date);
    const yy = inputDate.format("YY");
    const yyyy = inputDate.format("YYYY");
    const mm = inputDate.format("MM");
    const dd = inputDate.format("DD");

    let splittedDate = {
      dd: dd,
      mm: mm,
      yy: yy,
      yyyy: yyyy,
    };

    return splittedDate;
  }

  function convertToDigits(number, noOfDigits) {
    const numberString = number.toString();

    if (numberString.length >= noOfDigits) {
      return numberString;
    }

    const zerosToAdd = noOfDigits - numberString.length;
    const paddedString = "0".repeat(zerosToAdd) + numberString;

    return paddedString;
  }

  function getNetsuiteDateFormat() {
    let userObj = runtime.getCurrentUser();
    let dateFormat = userObj.getPreference({
      name: "DATEFORMAT",
    });

    let dateFormatNetsuiteAndMomentMap = {
      "D-Mon-YYYY": "D-MMM-YYYY",
      "DD-Mon-YYYY": "DD-MMM-YYYY",
      "D-MONTH-YYYY": "D-MMMM-YYYY",
      "D MONTH, YYYY": "D MMMM, YYYY",
      "DD-MONTH-YYYY": "DD-MMMM-YYYY",
      "DD MONTH, YYYY": "DD MMMM, YYYY",
    };

    dateFormat = dateFormatNetsuiteAndMomentMap[dateFormat]
      ? dateFormatNetsuiteAndMomentMap[dateFormat]
      : dateFormat;
    return dateFormat;
  }

  function isTransactionAvailable(
    subsidiary,
    subsidiaryBranchCode,
    taxPeriod,
    filingStatus,
    pndCategory,
  ) {
    var isOneWorld = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });

    //  isOneWorld = false

    if (!subsidiary && isOneWorld) {
      dialog.alert({
        title: "Subsidiary not found!",
        message: "Please select Subsidiary..",
      });
      return;
    } else if (!subsidiaryBranchCode) {
      dialog.alert({
        title: "Subsidiary Branch not found!",
        message: "Please select Subsidiary Branch..",
      });
      return;
    } else if (!taxPeriod) {
      dialog.alert({
        title: "Tax Period not found!",
        message: "Please select Tax Period..",
      });
      return;
    } else if (!filingStatus) {
      dialog.alert({
        title: "Filing Status not found!",
        message: "Please select Filing Status..",
      });
      return;
    }

    // let PNDData = search_lib.getBillPaymentDataForBillData(subsidiary,subsidiaryBranch,whtTaxPeriod,filingStatus)
    console.log("PNDData");
    let PNDData = search_lib.getBillPaymentDataForBillData(
      subsidiary,
      subsidiaryBranchCode,
      taxPeriod,
      filingStatus,
    );
    let isSelectedPndCategeroyAvailable = false;

    for (let i = 0; i < PNDData.length; i++) {
      let billData = JSON.parse(PNDData[i].billData)[0];

      if (billData.length <= 1) {
        continue;
      }
      if (!billData[1].taxCode) {
        continue;
      }

      let itemPndCategoryValue = search.lookupFields({
        type: "customrecord_ps_tht_wht_tax_code",
        id: billData[1].taxCode,
        columns: ["custrecord_ps_wht_taxcode_category"],
      }).custrecord_ps_wht_taxcode_category;

      if (itemPndCategoryValue.length > 0) {
        itemPndCategoryValue = itemPndCategoryValue[0].value;
      }

      if (pndCategory == itemPndCategoryValue) {
        isSelectedPndCategeroyAvailable = true;
        return isSelectedPndCategeroyAvailable;
      } else {
        isSelectedPndCategeroyAvailable = false;
      }
    }

    if (!isSelectedPndCategeroyAvailable) {
      dialog.alert({
        title: "Transaction not found!",
        message: "No transactions are available for the provided filters..",
      });
    }
  }

  function loadVendBill(internalId, templateData) {
    let sublistData = [];
    let totalTax = 0;
    let totalPaidAmount = 0;
    vendBillObj = record.load({
      id: internalId,
      type: "vendorbill",
      isDynamic: true,
    });
    let subsidiaryBranchInternalId = vendBillObj.getValue({
      fieldId: "cseg_subs_branch",
    });
    sublistCount = vendBillObj.getLineCount({ sublistId: "item" });
    for (let i = 0; i < sublistCount; i++) {
      lineObj = {};

      let whtTaxCodeTxt = vendBillObj.getSublistText({
        sublistId: "item",
        fieldId: "custcol_ps_wht_tax_code",
        line: i,
      });
      let whtTaxCodeValue = vendBillObj.getSublistValue({
        sublistId: "item",
        fieldId: "custcol_ps_wht_tax_code",
        line: i,
      });

      if (whtTaxCodeValue) {
        let taxSectionCode = getWHTTaxCode(whtTaxCodeValue);
        log.debug("check taxSectionCode", taxSectionCode);

        let typeOfIncome;
        log.debug("check whtTaxCode", whtTaxCodeTxt);

        //mark check box obj
        if (whtTaxCodeTxt) {
          whtTaxCodeTxt = whtTaxCodeTxt.split("(");
          if (whtTaxCodeTxt.length > 0) {
            typeOfIncome = whtTaxCodeTxt[0].replace(/\s/g, "");
            whtTaxCodeTxt = whtTaxCodeTxt[1];
            whtTaxCodeTxt = whtTaxCodeTxt.replace(")", "");
            whtTaxCodeTxt = whtTaxCodeTxt.replace(/\./g, "");
            whtTaxCodeTxt = whtTaxCodeTxt.replace(/\s/g, "");
            whtTaxCodeTxt = whtTaxCodeTxt.toLowerCase();
            templateData[whtTaxCodeTxt] = true;
          }
        }

        log.debug("check whtTaxCode", whtTaxCodeTxt);
        let taxAmount = vendBillObj.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_ps_wht_tax_amount",
          line: i,
        });
        let paidAmount = vendBillObj.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_ps_wht_base_amount",
          line: i,
        });

        if (templateData["taxAmount" + taxSectionCode]) {
          templateData["taxAmount" + taxSectionCode] += taxAmount;
        } else {
          templateData["taxAmount" + taxSectionCode] = taxAmount;
        }
        if (templateData["paidAmount" + taxSectionCode]) {
          templateData["paidAmount" + taxSectionCode] += paidAmount;
        } else {
          templateData["paidAmount" + taxSectionCode] = paidAmount;
        }

        taxCode = templateData["taxAmount" + taxSectionCode];
        // templateData["paidAmount"+taxSectionCode] = Number(templateData["paidAmount"+taxSectionCode]) - Number(taxCode)

        billDate = templateData["billDate"];
        templateData["date" + taxSectionCode] = billDate;

        totalTax += Number(taxAmount);
        totalPaidAmount += Number(paidAmount);

        log.debug("item totalTax", totalPaidAmount);

        templateData["totalTax"] = totalTax;
        templateData["totalPaidAmount"] = totalPaidAmount;

        // templateData["totalPaidAmount"]  = Number(totalPaidAmount ) -  Number(totalTax)

        loadSubsidiaryBranch(subsidiaryBranchInternalId, templateData);
        log.debug("after load subsidairy branch", templateData);
      }
    }
  }

  function getPaidAndTaxAmounts(
    internalId,
    templateData,
    recordType,
    exchangerate,
  ) {
    let sublistData = [];
    let mergedPayload;
    let totalTax = 0;
    let totalPaidAmount = 0;
    let remittance1 = false;
    let remittance2 = false;
    let taxCodeFound = 0;

    let vendPaymentObj = record.load({
      id: internalId,
      type: recordType,
      isDynamic: true,
    });

    let billData = vendPaymentObj.getValue({
      fieldId: "custbody_ps_wht_bill_lines_data",
    });
    let subsidiaryBranchInternalId = vendPaymentObj.getValue({
      fieldId: "cseg_subs_branch",
    });
    let paymentDateInThai = getThaiDate(vendPaymentObj.getText({ fieldId: "trandate" }));
    let paymentDate = vendPaymentObj.getText({ fieldId: "trandate" });
    templateData["paymentDate"] = paymentDateInThai;

    templateData = getHoldingTaxTemplateTaxCode(templateData);

    let itemLineWithTaxCodeArray = [];

    if (billData) {
      billDataParse = JSON.parse(billData);

      if (billDataParse.length >= 1) {
        for (let j = 0; j < billDataParse.length; j++) {
          let billDataLines = billDataParse[j];
          log.debug("billData", billDataLines);
          log.debug("billData", billDataLines);

          //           sublistCount = vendBillObj.getLineCount({ sublistId: "item" })

          for (let i = 1; i < billDataLines.length; i++) {
            // let  whtTaxCodeTxt   = vendBillObj.getSublistText({ sublistId: 'item', fieldId: 'custcol_ps_wht_tax_code', line: i })
            let whtTaxCodeValue = billDataLines[i].taxCode;
            let tranType = billDataLines[0].type;
            if (!whtTaxCodeValue) {
              continue;
            }
            let taxAmount = 0;
            let paidAmount = 0;
            let taxRate = 0;
            let remittance = "";
            remittance1 = false;
            remittance2 = false;
            //Add additional code
            let whtTaxCodeCategory = search.lookupFields({
              type: "customrecord_ps_tht_wht_tax_code",
              id: whtTaxCodeValue,
              columns: [
                "name",
                "custrecord_ps_wht_taxcode_category",
                "custrecord_ps_wht_taxcode_rate",
                "custrecord_ps_wht_taxcode_remittance",
              ],
            });
            taxRate = whtTaxCodeCategory.custrecord_ps_wht_taxcode_rate;
            remittance =
              whtTaxCodeCategory.custrecord_ps_wht_taxcode_remittance;
            let taxCodeName = whtTaxCodeCategory.name;
            let taxCodeNameWithoutBrackets = taxCodeName.replace(
              /\([^)]+\)/g,
              "",
            ); //remove brackets Subcontract fee (P.N.D 53)
            let taxCertificateSectionName =
              taxCodeNameWithoutBrackets + taxRate;

            if (remittance.length > 0) {
              log.debug("whtTaxCodeValue remittance", remittance);
              remittance = remittance[0]["text"].match(/\d+/)[0];
              if (remittance == "1") {
                remittance1 = true;
              }
              if (remittance == "2") {
                remittance2 = true;
              }
            }

            let whtTaxIncomeType = search.lookupFields({
              type: "customrecord_ps_tht_wht_tax_code",
              id: whtTaxCodeValue,
              columns: ["custrecord_ps_wht_taxcode_income_type"],
            }).custrecord_ps_wht_taxcode_income_type;
            if (whtTaxIncomeType.length > 0) {
              whtTaxIncomeType = whtTaxIncomeType[0].text;
            }

            log.debug("whtTaxCodeValue remittance", remittance);
            if (whtTaxCodeCategory) {
              whtTaxCodeCategory =
                whtTaxCodeCategory.custrecord_ps_wht_taxcode_category[0].text;
              whtTaxCodeCategory = whtTaxCodeCategory.replace(/\./g, "");
              whtTaxCodeCategory = whtTaxCodeCategory.toLowerCase();
              whtTaxCodeCategory = whtTaxCodeCategory.replace(/ /g, "");
              templateData[whtTaxCodeCategory] = checkedImageURL();
            }
            if (billDataLines[i].isPartialPayment) {
              taxAmount =
                Number(billDataLines[i].partialTaxAmount) * exchangerate;
              paidAmount =
                Number(billDataLines[i].partialAmount) * exchangerate;
            }
             else if (!billDataLines[i].isPartialPayment) {
              taxAmount = Number(billDataLines[i].taxAmount) * exchangerate;
              paidAmount = Number(billDataLines[i].amount) * exchangerate;
            }

            if (tranType == "vendorcredit") {
              paidAmount = paidAmount * -1;
              taxAmount = taxAmount * -1;
            }

            log.debug("fieldLookUp", whtTaxCodeCategory);
            let taxSectionCode = getWHTTaxCode(whtTaxCodeValue);

            let lineObj = {};
            let lineArray = [];

            log.debug("Number(taxAmount)", Number(taxAmount));

            lineArray.push({
              taxCertificateSectionName: taxCertificateSectionName,
              taxAmount: Number(taxAmount),
              paidAmount: Number(paidAmount),
              paymentDate: paymentDate,
              whtTaxIncomeType: translateToThai(whtTaxIncomeType),
              taxRate: taxRate,
              whtTaxCodeCategory: whtTaxCodeCategory,
              remittance1: remittance1,
              remittance2: remittance2,
            });

            lineObj[whtTaxCodeValue + ":taxCode" + taxSectionCode] = lineArray;

            log.debug("lineArray check",lineArray)

            itemLineWithTaxCodeArray.push(lineObj);

            if (templateData["taxAmount" + taxSectionCode]) {
              templateData["taxAmount" + taxSectionCode] = convertInToCurrency(
                format.parse({
                  value: templateData["taxAmount" + taxSectionCode],
                  type: format.Type.CURRENCY,
                }) + Number(taxAmount),
              );
            } else {
              templateData["taxAmount" + taxSectionCode] = isNull(
                convertInToCurrency(taxAmount),
              );
            }

            if (templateData["paidAmount" + taxSectionCode]) {
              // templateData["paidAmount"+taxSectionCode] += isNull(convertInToCurrency(paidAmount))
              templateData["paidAmount" + taxSectionCode] = convertInToCurrency(
                format.parse({
                  value: templateData["paidAmount" + taxSectionCode],
                  type: format.Type.CURRENCY,
                }) + Number(paidAmount),
              );
            } else {
              templateData["paidAmount" + taxSectionCode] = isNull(
                convertInToCurrency(paidAmount),
              );
            }

            let billDate = templateData["billDate"];
            templateData["date" + taxSectionCode] = billDate;

            totalTax += Number(taxAmount);
            totalPaidAmount += Number(paidAmount);

            log.debug("before amounts call function", totalTax);
            templateData["taxInWords"] = amountsTowords(totalTax.toFixed(2));
            templateData["totalTax"] = isNull(
              convertInToCurrency(totalTax.toFixed(2)),
            );
            templateData["totalPaidAmount"] = isNull(
              convertInToCurrency(totalPaidAmount.toFixed(2)),
            );

            // templateData["totalPaidAmount"]  = Number(totalPaidAmount ) -  Number(totalTax)
            log.debug("subsidiaryBranchInternalId", subsidiaryBranchInternalId);

            if (subsidiaryBranchInternalId) {
              loadSubsidiaryBranch(subsidiaryBranchInternalId, templateData);

              log.debug(
                "loadSubsidiaryBranch :itemLine",
                templateData["branchName"],
              );
            }
          }
        }

        const result = {};
        let certificateArray = [];

        itemLineWithTaxCodeArray.forEach((entry) => {
          const taxCode = Object.keys(entry)[0];
          const {
            taxCertificateSectionName,
            taxAmount,
            paidAmount,
            paymentDate,
            whtTaxIncomeType,
            taxRate,
            whtTaxCodeCategory,
            remittance1,
            remittance2,
          } = entry[taxCode][0];

          if (!result[taxCode]) {
            result[taxCode] = {
              taxAmount: 0,
              paidAmount: 0,
            };
          }

          //set in cerficateNumberArray

          result[taxCode].taxCertificateSectionName = taxCertificateSectionName;
          result[taxCode].taxAmount += taxAmount;
          result[taxCode].paidAmount += paidAmount;
          result[taxCode].paymentDate = paymentDate;
          result[taxCode].whtTaxIncomeType = whtTaxIncomeType;
          result[taxCode].taxRate = taxRate;
          result[taxCode].whtTaxCodeCategory = whtTaxCodeCategory;
          result[taxCode].remittance1 = remittance1;
          result[taxCode].remittance2 = remittance2;
        });

        log.debug("result", result);
        let counter = 0;

        const groupedData = Object.entries(result).map(([taxCode, values]) => ({
          [taxCode]: [
            {
              taxCertificateSectionName: values.taxCertificateSectionName,
              taxAmount: convertInToCurrency(values.taxAmount),
              paidAmount: convertInToCurrency(values.paidAmount),
              paymentDate: getThaiDate(paymentDate),
              whtTaxIncomeType: values.whtTaxIncomeType,
              taxRate: values.taxRate,
              taxInWords: amountsTowords(values.taxAmount),
              whtTaxCodeCategory: values.whtTaxCodeCategory,
              remittance1: values.remittance1,
              remittance2: values.remittance2,
              whtcounter: ++counter,
            },
          ],
        }));

        const convertedPayload = [];

        log.debug("templateData groupedData", groupedData);

        groupedData.forEach((item) => {
          const key = Object.keys(item)[0];
          const value = item[key][0];
          const taxCode = key.split(":")[1];

          const existingEntry = convertedPayload.find((entry) =>
            entry.hasOwnProperty(taxCode),
          );

          if (convertedPayload.length > 0) {
            convertedPayload.push({ ["taxCode6"]: [value] });
          } else {
            convertedPayload.push({ [taxCode]: [value] });
          }

          // if (existingEntry)
          // {
          //   existingEntry["taxCode6"].push(value);
          // }
          // else
          // {
          //   convertedPayload.push({[taxCode]: [value]});
          // }
        });

        mergedPayload = { ...templateData };
        mergedPayload["lines"] = [];

        // create TaxCode Array
        const taxCodeArray = convertedPayload.reduce((result, entry) => {
          const keys = Object.keys(entry);

          if (keys.length === 1) {
            // If the entry has only one key, it is the tax code
            const taxCode = keys[0];
            const taxCodeEntry = entry[taxCode];

            // Check if the tax code entry already exists in the result array
            const existingEntry = result.find(
              (item) => Object.keys(item)[0] === taxCode,
            );

            if (existingEntry) {
              existingEntry[taxCode].push(...taxCodeEntry);
            } else {
              result.push({ [taxCode]: taxCodeEntry });
            }
          } else {
            log.error("error", result);
          }

          return result;
        }, []);

        // log.debug("convertedPayload before loop",convertedPayload)
        taxCodeArray.forEach((entry) => {
          var taxCode = Object.keys(entry)[0];

          log.debug("taxCode", taxCode);
          log.debug("entry[taxCode]", entry[taxCode]);

          mergedPayload[taxCode] = entry[taxCode];

          log.debug("taxCodeFound in loop", taxCodeFound);
        });

        // convertedPayload.forEach((entry) => {
        //   let taxCode = Object.keys(entry)[0];

        //   log.debug("templateData before con taxCode", entry[taxCode]);

        //   for (var i = 0; i < entry[taxCode].length; i++) {
        //     var obj = {};
        //     log.debug("templateDataon itere", entry[taxCode][i]);
        //     obj[taxCode] = entry[taxCode][i];
        //     mergedPayload["lines"].push(obj);
        //   }

        //   //log.debug("entry[taxCode]",  entry[taxCode])
        //   // log.debug("entry[taxCode]", taxCode)

        //    for(var i=0; i <entry[taxCode].length; i++)
        //    {
        //          log.debug("entry[taxCode]",entry[taxCode][i])
        //          mergedPayload[taxCode] = mergedPayload[taxCode].push(entry[taxCode][i]);
        //    }

        // });

        log.debug("entry[mergedPayload]", mergedPayload["taxCode5"]);
        log.debug("entry[mergedPayload]66", mergedPayload["taxCode6"]);
        log.debug(
          "templateData before con mergedPayload",
          mergedPayload["lines"],
        );
      }
    }

    return mergedPayload;
  }

  function loadSubsidiaryBranch(internalId, templateData) {
    if (internalId) {
      let subsidiaryBranchObj = record.load({
        id: internalId,
        type: "customrecord_cseg_subs_branch",
        isDynamic: true,
      });

      let branchName = subsidiaryBranchObj.getText({ fieldId: "name" });

      let branchAdd1 = subsidiaryBranchObj.getText({
        fieldId: "custrecord_ps_wht_subs_branch_addr1",
      });
      let branchAdd2 = subsidiaryBranchObj.getText({
        fieldId: "custrecord_ps_wht_subs_branch_addr2",
      });
      let branchAdd3 = subsidiaryBranchObj.getText({
        fieldId: "custrecord_ps_wht_subs_branch_addr3",
      });

      let city = subsidiaryBranchObj.getText({
        fieldId: "custrecord_ps_wht_subs_branch_city",
      });

      let zipCode = subsidiaryBranchObj.getText({
        fieldId: "custrecord_ps_wht_subs_branch_zip",
      });

      log.debug("loadSubsidiaryBranch:branchName", branchName);
      if (branchName) {
        if (branchName.includes(":")) {
          branchName = branchName.split(":");
          templateData["branchName"] = branchName[1];
        } else {
          templateData["branchName"] = branchName;
        }

        log.debug("branchName tty", branchName);
      }

      templateData["branchAdd"] =
        branchAdd1 +
        " " +
        branchAdd2 +
        " " +
        branchAdd3 +
        " " +
        city +
        " " +
        zipCode;
    }
  }

  function getWHTTaxCode(internalId) {
    let taxSection;
    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "customrecord_ps_tht_wht_tax_code",
      isDynamic: true,
    });

    let whtTaxCertificationValue = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_taxcode_cert_sect",
    });

    whtCerficateSectionObj = record.load({
      id: whtTaxCertificationValue,
      type: "customrecord_ps_tht_wht_cert_section",
      isDynamic: true,
    });

    taxSection = whtCerficateSectionObj.getValue({
      fieldId: "custrecord_ps_wht_certificate_sect_code",
    });
    taxSection = taxSection.replace(/\s/g, "");
    taxSection = taxSection.replace(/[^a-zA-Z0-9]/g, "");
    taxSection = taxSection.toLowerCase();

    return taxSection;
  }

  function getWHTTAXIncomeType(internalId) {
    subsidiaryBranchObj = record.load({
      id: internalId,
      type: "customrecord_ps_tht_wht_tax_code",
      isDynamic: true,
    });

    let whtTaxIncomeType = subsidiaryBranchObj.getText({
      fieldId: "custrecord_ps_wht_taxcode_income_type",
    });
    let whtTaxIncomeTypeCode = "";
    if (whtTaxIncomeType) {
      if (whtTaxIncomeType.indexOf(".") <= 0) {
        return "";
      }
      whtTaxIncomeTypeArray = whtTaxIncomeType.split(".");
      if (whtTaxIncomeTypeArray.length > 0) {
        whtTaxIncomeTypeCode = whtTaxIncomeTypeArray[0];
      }
    }
    log.debug(" getWHTTAXIncomeType(internalId) :", whtTaxIncomeTypeCode);

    return whtTaxIncomeTypeCode;
  }

  function loadTaxPeriod(internalId, templateData) {
    // let taxPeriodObj = record.load({
    //     id: internalId,
    //     type: 'taxperiod',
    //     isDynamic: true
    // });

    // let periodName = taxPeriodObj.getValue({ fieldId: 'periodname' });

    let periodName = search_lib.getAccountingPeriodMonth(internalId);
    periodName =
      periodName.length > 0 ? periodName[0].values.formulatext : "none";
    //periodName = periodName.replace(/[^a-zA-Z]/g, '');
    periodName = periodName.toLowerCase();
    templateData[periodName] = true;
  }

  function loadSubsidiaryBranchCode(
    internalId,
    templateData,
    pndCategory,
    printType,
  ) {
    if (!internalId) {
      templateData["branchCode"] = "";
      templateData["brnCodeLine"] = "";

      return;
    }

    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "customrecord_cseg_subs_branch",
      isDynamic: true,
    });

    let branchNameCode = subsidiaryBranchObj
      .getValue({ fieldId: "custrecord_ps_wht_subs_branch_code" })
      .toString();
    let brnCodetd;
    let brnCodeLine;

    for (let i = 0; i < branchNameCode.length; i++) {
      brnCodetd += `<td  border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${branchNameCode[i]}</td>`;
      brnCodeLine += `<td   border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${branchNameCode[i]}</td>`;
    }

    templateData["branchCode"] = brnCodetd;
    templateData["brnCodeLine"] = brnCodeLine;

    log.debug("templateDatabranchCode", templateData["branchCode"]);
  }

  function loadSubsidiaryBranchCodePND3(internalId, templateData, printType) {
    templateData["address1"];
    if (!internalId) {
      templateData["branchCode"] = "";
      templateData["brnCodeLine"] = "";
      return;
    }

    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "customrecord_cseg_subs_branch",
      isDynamic: true,
    });

    let branchNameCode = subsidiaryBranchObj
      .getValue({ fieldId: "custrecord_ps_wht_subs_branch_code" })
      .toString();
    let branchName = subsidiaryBranchObj.getValue({ fieldId: "name" });

    let adderess1 = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_addr1",
    });
    let adderess2 = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_addr2",
    });
    let adderess3 = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_addr3",
    });
    let zipCode = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_zip",
    });
    let zipCodetd = "";

    log.debug("branchName 123", branchName);
    log.debug("branchName adderess1", adderess1);
    log.debug("branchName zipCode", zipCode);

    templateData["address1"] = adderess1
      ? adderess1.replace(/&/g, "&amp;")
      : adderess1;
    templateData["address23"] = adderess2
      ? adderess2.replace(/&/g, "&amp;")
      : adderess2 + " " + adderess3
      ? adderess3.replace(/&/g, "&amp;")
      : adderess3;

    // if (branchName) {
    //     branchName = branchName.split(":")
    //     branchName = branchName[1]

    // }

    log.debug("branchNameCode", branchNameCode);
    let brnCodetd = ``;
    let brnCodeLine;
    log.debug("branchNameCode", branchNameCode.length);

    for (let i = 0; i < zipCode.length; i++) {
      if (i == 0) {
        zipCodetd += `<td align="center"  width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`;
      } else if (i > 0 && i != zipCode.length - 1) {
        zipCodetd += `<td align="center"   width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`;
      } else if (i == zipCode.length - 1) {
        zipCodetd += `<td align="center" width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`;
      }
    }

    for (let i = 0; i < branchNameCode.length; i++) {
      brnCodetd += `<td  border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${branchNameCode[i]}</td>`;
      brnCodeLine += `<td   border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${branchNameCode[i]}</td>`;
    }

    templateData["branchCode"] = brnCodetd;
    templateData["brnCodeLine"] = brnCodeLine;

    log.debug("zipCode", zipCodetd);
    templateData["branchName"] = branchName
      ? branchName.replace(/&/g, "&amp;")
      : branchName;
    templateData["zipCode"] = zipCodetd;

    log.debug("templateDatabranchCode", templateData["branchCode"]);
  }

  function convertInToCurrency(amount) {
    if (amount == NaN || amount == null || !amount) {
      return "0";
    }

    let myFormat = formati.getCurrencyFormatter({ currency: "USD" });
    let newCur = myFormat.format({
      number: Number(amount),
    });

    newCur = newCur.replace("$", "");
    newCur = newCur.replace("US", "");
    return newCur;
  }

  function getLineData(
    billPaymentObj,
    pndCategoryValue,
    printType,
    templateData,
  ) {
    let attachmentArray = [];

    log.debug("billPaymentObj", billPaymentObj);

    for (let i = 0; i < billPaymentObj.length; i++) {
      let billData = JSON.parse(billPaymentObj[i].billData);
      let tranDate = billPaymentObj[i].trandate;
      let entityId;
      let entityFirstName = "";
      let entityLastName = "";
      let entityCompanyName = "";

      if (billPaymentObj[i].vendorEntityId) {
        entityId = billPaymentObj[i].vendorEntityId;
        if (billPaymentObj[i].vendorIsPerson) {
          entityFirstName = billPaymentObj[i].vendorFirstName
            ? billPaymentObj[i].vendorFirstName.replace(/&/g, "&amp;")
            : billPaymentObj[i].vendorFirstName;
          entityLastName = billPaymentObj[i].vendorLastName
            ? billPaymentObj[i].vendorLastName.replace(/&/g, "&amp;")
            : billPaymentObj[i].vendorLastName;
        } else {
          entityCompanyName = billPaymentObj[i].vendorCompanyName
            ? billPaymentObj[i].vendorCompanyName.replace(/&/g, "&amp;")
            : billPaymentObj[i].vendorCompanyName;
        }
      } else if (billPaymentObj[i].customerEntityId) {
        entityId = billPaymentObj[i].customerEntityId;
        if (billPaymentObj[i].customerIsPerson) {
          entityFirstName = billPaymentObj[i].customerFirstName;
          entityLastName = billPaymentObj[i].customerLastName;
        } 
        else {
          entityCompanyName = billPaymentObj[i].customerCompanyName
            ? billPaymentObj[i].customerCompanyName.replace(/&/g, "&amp;")
            : billPaymentObj[i].customerCompanyName;
        }
      }



      log.debug("entityId template entityCompanyName", entityCompanyName);

      // log.debug("billData[j].taxCode : attachmentArray", billData)
      for (let j = 0; j < billData.length; j++) {
        let sublist = billData[j];
        for (let k = 1; k < sublist.length; k++) {
          log.debug("billData[j].taxCode :billData[j]", sublist[k]);

          if (!sublist[k].taxCode) {
            continue;
          }
          if (sublist[k].taxCode == null) {
            continue;
          }

          let itemPndCategoryValue = search.lookupFields({
            type: "customrecord_ps_tht_wht_tax_code",
            id: sublist[k].taxCode,
            columns: ["custrecord_ps_wht_taxcode_category"],
          }).custrecord_ps_wht_taxcode_category;

          if (itemPndCategoryValue.length > 0) {
            itemPndCategoryValue = itemPndCategoryValue[0].value;
          }

          if (itemPndCategoryValue != pndCategoryValue) {
            continue;
          }

          let whtTaxCodeTxt = search.lookupFields({
            type: "customrecord_ps_tht_wht_tax_code",
            id: sublist[k].taxCode,
            columns: ["name", "custrecord_ps_wht_taxcode_rate"],
          });
          let whtTaxRate = whtTaxCodeTxt.custrecord_ps_wht_taxcode_rate;
          //  search.lookupFields({ type: 'customrecord_ps_tht_wht_tax_code', id: sublist[k].taxCode, columns: ['custrecord_ps_wht_taxcode_rate'] }).custrecord_ps_wht_taxcode_rate
          whtTaxRate = whtTaxRate.replace("%", "");

          log.debug("sublist[k].taxCode", sublist[k].taxCode);
          let incomeTaxTypeCode = getWHTTAXIncomeType(sublist[k].taxCode);
          log.debug("incomeTaxType", incomeTaxTypeCode);
          incomeTaxTypeCode = "incomeTaxTypeCode" + incomeTaxTypeCode;
          templateData[incomeTaxTypeCode] = true;
          templateData[incomeTaxTypeCode + "Count"] =
            templateData[incomeTaxTypeCode + "Count"] + 1;

          //  log.debug("incomeTaxType",incomeTaxType)

          let paidAmount = 0;
          let taxAmount = 0;

          if (sublist[k].isPartialPayment) {
            paidAmount = sublist[k].partialAmount;
            taxAmount = sublist[k].partialTaxAmount;
          } else if (!sublist[k].isPartialPayment) {
            paidAmount = sublist[k].amount;
            taxAmount = sublist[k].taxAmount;
          }
          templateData[incomeTaxTypeCode + "Income"] =
            templateData[incomeTaxTypeCode + "Income"] + paidAmount;

          templateData[incomeTaxTypeCode + "Tax"] =
            templateData[incomeTaxTypeCode + "Tax"] + taxAmount;

          let date = moment(getDATEINTODDMMYY(billPaymentObj[i].trandate),"DD/MM/YYYY");
          log.debug("thai date year", date + "--" + date.year());
          let year = getThaiYear(date.year());
          let month = date.month() + 1;
          let day = date.date();
          let thaiDate = day + "/" + month + "/" + year;

          attachmentArray.push({
            internalId: billPaymentObj[i].internalId,
            tranDate: thaiDate,
            entityid: entityId ? entityId.replace(/&/g, "&amp;") : entityId,
            firstname: entityFirstName
              ? entityFirstName.replace(/&/g, "&amp;")
              : entityFirstName,
            lastname: entityLastName
              ? entityLastName.replace(/&/g, "&amp;")
              : entityLastName,
            companyName: entityCompanyName
              ? entityCompanyName.replace(/&/g, "&amp;")
              : entityCompanyName,
            vendorAddress: billPaymentObj[i].vendorAddress
              ? billPaymentObj[i].vendorAddress.replace(/&/g, "&amp;")
              : billPaymentObj[i].vendorAddress,
            vendorTaxId: billPaymentObj[i].vendorTaxId,
            vendorTaxIdHtml: getPND3ATaxIdHTML(
              billPaymentObj[i].vendorTaxId,
              pndCategoryValue,
              printType,
            ),
            sequenceNumber: billPaymentObj[i].sequenceNumber,
            taxcode: getTaxCode(whtTaxCodeTxt.name),

            taxRate: whtTaxRate,
            amount: paidAmount,
            taxamount: taxAmount,
            whtCondition: billPaymentObj[i].whtCondition,

            billaddressee: billPaymentObj[i].billaddressee
              ? billPaymentObj[i].billaddressee.replace(/&/g, "&amp;")
              : billPaymentObj[i].billaddressee,
            billaddress1: billPaymentObj[i].billaddress1
              ? billPaymentObj[i].billaddress1.replace(/&/g, "&amp;")
              : billPaymentObj[i].billaddress1,
            billaddress2: billPaymentObj[i].billaddress2
              ? billPaymentObj[i].billaddress2.replace(/&/g, "&amp;")
              : billPaymentObj[i].billaddress2,
            billcity: billPaymentObj[i].billcity,
            billstate: billPaymentObj[i].billstate,
            billzipcode: billPaymentObj[i].billzipcode,
            billcountry: billPaymentObj[i].billcountry,
          });
        }
      }
    }

    let uniqueArray = attachmentArray;

    log.debug("uniqueArray for thai", uniqueArray);

    // Group the objects
    let uniqueKey = {};
    let sno = 1;
    uniqueArray.forEach(function (obj) {
      let key =
        obj.entityid +
        "_" +
        obj.tranDate +
        "_" +
        obj.taxcode +
        "_" +
        obj.whtCondition +
        "_" +
        obj.sequenceNumber;
      if (!uniqueKey.hasOwnProperty(key)) {
        uniqueKey[key] = {
          // sno: sno++,
          entityId: obj.entityid,
          firstName: obj.firstname,
          lastName: obj.lastname,
          companyName: obj.companyName,
          vendorAddress: obj.vendorAddress,
          vendorTaxId: obj.vendorTaxId,
          vendorTaxIdHtml: obj.vendorTaxIdHtml,
          tranDate: obj.tranDate,
          rate: obj.rate,
          taxCode: obj.taxcode,
          sno: obj.sequenceNumber,
          amount: 0,
          taxAmount: 0,
          taxRate: obj.taxRate,
          whtCondition: obj.whtCondition,
          billaddressee: obj.billaddressee,
          billaddress1: obj.billaddress1,
          billaddress2: obj.billaddress2,
          billcity: obj.billcity,
          billstate: obj.billstate,
          billzipcode: obj.billzipcode,
          billcountry: obj.billcountry,
        };
      }
      uniqueKey[key].amount += obj.amount;
      uniqueKey[key].taxAmount += obj.taxamount;
    });

    let result = [];
    for (let key in uniqueKey) {
      if (uniqueKey.hasOwnProperty(key)) {
        result.push(uniqueKey[key]);
      }
    }

    log.debug("result for thai", uniqueArray);
    return result;
  }

  function getTaxCode(whtTaxCodeTxt) {
    let taxCodeString = whtTaxCodeTxt;
    if (taxCodeString) {
      taxCodeString = taxCodeString.split("(");
      if (taxCodeString.length > 0) {
        taxCodeString = taxCodeString[0];
        taxCodeString = taxCodeString.replace(/\s/g, "");
      }
    }
    return taxCodeString;
  }

  function getLineDataTotal(lineDataObj, templateData) {
    let totalAmount = 0;
    let totalTax = 0;

    for (let i = 0; i < lineDataObj.length; i++) {
      totalAmount += lineDataObj[i].amount;
      totalTax += lineDataObj[i].taxAmount;
    }

    templateData.totalAmount = convertInToCurrency(totalAmount);
    templateData.totalTaxAmount = convertInToCurrency(totalTax);

    return templateData;
  }

  function getHoldingTaxTemplateTaxCode(templateData) {
    (templateData["taxCode6"] = {
      taxAmount: "",
      paidAmount: "",
      paymentDate: "",
    }),
      (templateData["taxCode5"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b25"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b24"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b23"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b21"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b22"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b14"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b13"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b12"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4b11"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode3"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode4a"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode2"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      }),
      (templateData["taxCode1"] = {
        taxAmount: "",
        paidAmount: "",
        paymentDate: "",
      });

    return templateData;
  }

  function getPND3ATaxIdHTML(vendorTaxId, pndCategory, printType) {
    let taxIdHTMLBox = "";

    // for (let i = 0; i < vendorTaxId.length; i++) {
    //     taxIdHTMLBox += `<td border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${vendorTaxId[i]}</td>`
    // }

    for (let i = 0; i < vendorTaxId.length; i++) {
      if (i == 0) {
        taxIdHTMLBox += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]}  " >${vendorTaxId[i]}</td>`;
      }

      if (i == 1) {
        taxIdHTMLBox += ` <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                       ${vendorTaxId[i]}
                                                      </td>`;
      }
      if (i == 2) {
        taxIdHTMLBox += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                    ${vendorTaxId[i]}
                                                      </td>`;
      }
      if (i == 3) {
        taxIdHTMLBox += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                      ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 4) {
        taxIdHTMLBox += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}" >
                                                     ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 5) {
        taxIdHTMLBox += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>
                                                      <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="center" font-size="12px" width="17px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                      ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 6) {
        taxIdHTMLBox += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                     ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 7) {
        taxIdHTMLBox += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                      ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 8) {
        taxIdHTMLBox += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} " >
                                                      ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 9) {
        taxIdHTMLBox += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                    ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 10) {
        taxIdHTMLBox += ` <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 11) {
        taxIdHTMLBox += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right:  1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                        ${vendorTaxId[i]}
                                                      </td>`;
      }

      if (i == 12) {
        taxIdHTMLBox += ` <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="right" width="2px" style="overflow: hidden; font-size:12px;" >-</td>
                                                      <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]} " >
                                                       ${vendorTaxId[i]}
                                                      </td>`;
      }
    }
    return taxIdHTMLBox;
  }

  function loadSubsidiaryBRN(internalId, templateData, pndCategory, printType) {


    // let subsidiaryBranchObj = record.load({
    //   id: internalId,
    //   type: "subsidiary",
    //   isDynamic: true,
    // });

    // let brnNumber = subsidiaryBranchObj.getText({
    //   fieldId: "custrecord_ps_wht_brn",
    // });
    // log.debug("constant_lib.colorCodeObj[printType]-",constant_lib.colorCodeObj[printType]);

    let brntd;
    let brnLine;

    for (let i = 0; i < brnNumber.length; i++) {
      brntd += `<td margin-top="26px" border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">${brnNumber[i]}</td>`;
      brnLine += `<td border="0.5" align="center" style="border-color:${constant_lib.colorCodeObj[printType]}">-</td>`;

      //   brntd += `<td margin-top="26px" border="0.5" align="center" style="border-color:#001B54;">${brnNumber[i]}</td>`
      //  brnLine += `<td border="0.5" align="center" style="border-color:#001B54;">${brnNumber[i]}</td>`
      templateData["brnNumber"] = brntd;
      templateData["brnNumberLine"] = brnLine;
    }

    //log.debug("brntd", brntd)
  }

  function loadSubsidiaryPND3(templateData, printType) {


  

    

    /////////////////// remove from  non-world account  ////////////////////// 
    // let subsidiaryBranchObj = record.load({
    //   id: internalId,
    //   type: "subsidiary",
    //   isDynamic: true,
    // });

    // let brnNumber = subsidiaryBranchObj.getText({
    //   fieldId: "custrecord_ps_wht_vat_registration_no", // change brn to vat
    // });
    // log.debug("brnNumber-", brnNumber);

    /////////////////// remove from  non-world account  ////////////////////// 

  let brnNumber =  config.load({ type: config.Type.COMPANY_INFORMATION }).getValue({ fieldId: 'custrecord_ps_wht_brn' });

    let brntd = `<td align="center"  width="10px" height="5px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]} " > ${brnNumber[0]}</td>`;
    brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`;

    for (let i = 1; i < brnNumber.length; i++) {
      if (i == 1) {
        brntd += `<td align="center" font-size="12px" width="10px" height="5px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                       ${brnNumber[i]} </td>`;
      }

      if (i < 4 && i > 1) {
        brntd += `<td align="center" font-size="12px" width="10px" height="5px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed${constant_lib.colorCodeObj[printType]}; " >
                       ${brnNumber[i]} </td>`;
      } 
      else if (i == 4) {
        brntd += `<td align="center" font-size="12px" width="10px" height="5px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};  " >
                       ${brnNumber[i]} </td>`;
      } else if (i == 5) {
        brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`;
        brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                         ${brnNumber[i]} </td>`;
      } else if (i == 6) {
        brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};" >
                         ${brnNumber[i]} </td>`;
      } 
      else if (i > 6 && i < 10) {
        brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                         ${brnNumber[i]} </td>`;
        
      } 

      else if (i == 10) {
        brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`;
        brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                         ${brnNumber[i]} </td>`;
      }
       else if (i == 11) {
        // brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`;

        brntd += `	<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};  ${constant_lib.colorCodeObj[printType]};" >
                      ${brnNumber[i]}</td>`;
      } 
      // else if (i > 11 && i < 12) {
      //   brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
      //                 ${brnNumber[i]}</td>`;
      // }
       else if (i == 12) {
         brntd += `<td align="right" width="2px" style="overflow: hidden; font-size:12pt;" >-</td>`;
        brntd += `<td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                         ${brnNumber[i]} </td>`;
      } 
      // else if (i == 13) {
      //   brntd += `<td>-</td>
      //                         <td align="center" font-size="12px" width="10px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
      //                ${brnNumber[i]} </td>`;
      // }

      templateData["brnNumber"] = brntd;
    }
  }

  function loadSubsidiaryForBRNNumber(templateData, printType) {

  let brnNumber  = config.load({ type: config.Type.COMPANY_INFORMATION }).getValue({ fieldId: 'custrecord_ps_wht_brn' });


  /////////////////  //////////////////////  remove for non-world account   /////////////////////////////
    // if (!internalId) {
    //   templateData["brnNumber"] = "";
    //   return;
    // }

    // let subsidiaryBranchObj = record.load({
    //   id: internalId,
    //   type: "subsidiary",
    //   isDynamic: true,
    // });

    // let brnNumber = subsidiaryBranchObj.getText({
    //   fieldId: "custrecord_ps_wht_vat_registration_no", //change brn to vat
    // });

    /////////////////  //////////////////////  remove for non-world account   /////////////////////////////


    let brntd = ``;
    //  log.debug("brnNumber i", brnNumber[0])
    //   log.debug("brnNumber i", brnNumber.length)
    brnLength = brnNumber.length;

    for (let i = 0; i < brnNumber.length; i++) {
      if (i == 0) {
        brntd += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]};  " >${brnNumber[i]}</td>`;
      }

      if (i == 1) {
        brntd += ` <td align="center" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                      
                                                       <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }
      if (i == 2) {
        brntd += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                      ${brnNumber[i]}
                                                       </td>`;
      }
      if (i == 3) {
        brntd += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 4) {
        brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 5) {
        brntd += `<td align="right" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                      
                                                       <td align="center" font-size="12px" width="17px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 6) {
        brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 7) {
        brntd += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 8) {
        brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 9) {
        brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 10) {
        brntd += ` <td align="center" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                      
                                                       <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                         ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 11) {
        brntd += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right:  1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                          ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 12) {
        brntd += ` <td align="right" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                     
                                                       <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                         ${brnNumber[i]}
                                                       </td>`;
      }
    }

    templateData["brnNumber"] = brntd;
  }

  function loadSubsidiaryForBRNNumberForInputTaxReport(
    templateData,
    printType,
  ) {
    if (!internalId) {
      templateData["brnNumber"] = "";
      return;
    }

    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "subsidiary",
      isDynamic: true,
    });

    let brnNumber = subsidiaryBranchObj.getText({
      fieldId: "custrecord_ps_wht_brn",
    });

    let brntd = ``;
    //  log.debug("brnNumber i", brnNumber[0])
    //   log.debug("brnNumber i", brnNumber.length)
    brnLength = brnNumber.length;

    for (let i = 0; i < brnNumber.length; i++) {
      if (i == 0) {
        brntd += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 0.5px solid ${constant_lib.colorCodeObj[printType]};  " >${brnNumber[i]}</td>`;
      }

      if (i == 1) {
        brntd += ` <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }
      if (i == 2) {
        brntd += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                      ${brnNumber[i]}
                                                       </td>`;
      }
      if (i == 3) {
        brntd += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 4) {
        brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 5) {
        brntd += ` <td align="center" font-size="12px" width="17px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 6) {
        brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 7) {
        brntd += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 8) {
        brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 9) {
        brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 10) {
        brntd += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                         ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 11) {
        brntd += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                          ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 12) {
        brntd += `<td align="center" font-size="12px" width="12px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                         ${brnNumber[i]}
                                                       </td>`;
      }
    }

    templateData["brnNumber"] = brntd;
  }

  function loadSubsidiaryBranchCodeForPND53(
    internalId,
    templateData,
    printType,
  ) {
    if (!internalId) {
      templateData["branchCode"] = "";
      templateData["zipCode"] = "";

      return;
    }
    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "customrecord_cseg_subs_branch",
      isDynamic: true,
    });

    let branchNameCode = subsidiaryBranchObj
      .getValue({ fieldId: "custrecord_ps_wht_subs_branch_code" })
      .toString();
    let branchName = subsidiaryBranchObj.getValue({ fieldId: "name" });

    // log.debug("branchNameCode get",branchNameCode)

    let adderess1 = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_addr1",
    });

    let adderess2 = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_addr2",
    });

    let adderess3 = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_addr3",
    });

    let zipCode = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_zip",
    });

    let city = subsidiaryBranchObj.getValue({
      fieldId: "custrecord_ps_wht_subs_branch_city",
    });

    let zipCodetd = "";
    // if (branchName) {
    //   branchName = branchName.split(":");
    //   branchName = branchName[1];
    // }
    templateData["address1"] = adderess1;
    templateData["address23"] = adderess2 + " " + adderess3 + " " + city;
    templateData["branchName"] = branchName;

    branchNameCodeHtml = ``;

    if (branchNameCode.length == 4) {
      branchNameCodeHtml = ` <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[0]}</td>
                                                       <td align="center"  width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[1]}</td>
                                                       <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">${branchNameCode[2]}</td>
                                                       <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};">${branchNameCode[3]}</td>`;
    } else if (branchNameCode.length == 5) {
      branchNameCodeHtml = ` <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[0]}</td>
                                                       <td align="center"  width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${branchNameCode[1]}</td>
                                                       <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">${branchNameCode[2]}</td>
                                                       <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">${branchNameCode[3]}</td>
                                                       <td align="center" width="2px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};">${branchNameCode[4]}</td>`;
    } else {
      branchNameCodeHtml = ` <td align="center" width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">-</td>
                                                       <td align="center"  width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">-</td>
                                                       <td align="center" width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]};  ">-</td>
                                                       <td align="center" width="3px" height="3px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};">-</td>`;
    }

    for (let i = 0; i < zipCode.length; i++) {
      if (i == 0) {
        zipCodetd += `<td align="center"  width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`;
      } else if (i > 0 && i != zipCode.length - 1) {
        zipCodetd += `<td align="center"   width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]} border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`;
      } else if (i == zipCode.length - 1) {
        zipCodetd += `<td align="center" width="12px" height="17px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};  border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; ">${zipCode[i]}</td>`;
      }
    }

    log.debug("loadSubsidiaryBranchCodeForPND53 :zipCode ");
    templateData["branchCode"] = branchNameCodeHtml;
    templateData["zipCode"] = zipCodetd;
  }

  function getDATEINTODDMMYY(inputDate) {
    const outputFormat = "DD/MM/YYYY";
    let userObj = runtime.getCurrentUser();
    let dateFormat = userObj.getPreference({ name: "DATEFORMAT" });
    dateFormat = dateFormat.replace("MONTH", "MMMM");
    dateFormat = dateFormat.replace("Month", "MMM");
    dateFormat = dateFormat.replace("Mon", "MMM");

     log.debug("check dateFormat", inputDate + "-" + dateFormat)

    const formattedDate = moment(inputDate, dateFormat).format(outputFormat);
     log.debug("check formattedDate", formattedDate)

    return formattedDate;
  }

  function translateToThai(text) {
    return text;
  }

 function amountsTowords(amount) {
    log.debug("amount amountstowords", amount);

    if (!amount || amount == null || amount == NaN) {
      amount = 0;
    }

    if (amount === 0) {
      return "ศูนย์บาทถ้วน";
    }

    const amountString = amount.toString();
    const parts = amountString.split(".");
    const integerPart = parseInt(parts[0]);
    const decimalPart = parseInt(parts[1]) || 0;

    let integerIntoString = integerPart.toString()
    let thaiformatWord = identifyPlacesForThaiFormat(integerPart)

    let fourDigitIntegerPart = parseInt(removeDigitsFromLeft(integerIntoString))

    const integerWords = convertIntegerToWords(fourDigitIntegerPart);
    const decimalWords = convertDecimalToWords(decimalPart);

    let words = thaiformatWord+integerWords + "บาท";
    if (decimalPart !== 0) {
     // words += "และ" + decimalWords + "สตางค์";  //remove and from thai word requested by north
      words +=  decimalWords + "สตางค์";
    }

    return words;
  }

 function convertIntegerToWords(integer) {

   const units = [
     "",
     "หนึ่ง",
     "สอง",
     "สาม",
     "สี่",
     "ห้า",
     "หก",
     "เจ็ด",
     "แปด",
     "เก้า",
     "สิบ",
     "สิบเอ็ด",
     "สิบสอง",
     "สิบสาม",
     "สิบสี่",
     "สิบห้า",
     "สิบหก",
     "สิบเจ็ด",
     "สิบแปด",
     "สิบเก้า",
   ];
   const tens = [
     "",
     "",
     "ยี่สิบ",
     "สามสิบ",
     "สี่สิบ",
     "ห้าสิบ",
     "หกสิบ",
     "เจ็ดสิบ",
     "แปดสิบ",
     "เก้าสิบ",
   ];
   const scales = [
     "",
     "พัน",
     "ล้าน",
     "พันล้าน",
     "พันล้านล้าน",
     "พันล้านล้านล้าน",
     "พันล้านล้านล้านล้าน",
   ];

   const chunks = integer
     .toString()
     .match(/.{1,3}(?=(.{3})*$)/g)
     .reverse();

   let words = "";

   
   for (let i = 0; i < chunks.length; i++) {
    
     const chunk = parseInt(chunks[i]);
     if (chunk !== 0) {
       let chunkWords = "";
       const hundreds = Math.floor(chunk / 100);
       const tensAndUnits = chunk % 100;

       if (hundreds !== 0) {
         chunkWords += units[hundreds] + "ร้อย";
       }

       if (tensAndUnits !== 0) {
         if (tensAndUnits < 20) {
           if (hundreds !== 0) {
            // chunkWords += "และ";
             chunkWords += "";
           }
           chunkWords += units[tensAndUnits];
         } else {
           const tensDigit = Math.floor(tensAndUnits / 10);
           const unitsDigit = tensAndUnits % 10;

           if (hundreds !== 0) {
            // chunkWords += "และ";
             chunkWords += "";
           }
           chunkWords += tens[tensDigit] + "" + units[unitsDigit];
         }
       }

       chunkWords += "" + scales[i] + "";
       words = chunkWords + words;
     }
   }

   return words.trim();
 }


  function convertDecimalToWords(decimal) {
    if (decimal === 0) {
      return "";
    }

    log.debug("decimal check ",decimal)
    const decimalWords = convertIntegerToWords(decimal);
     log.debug("decimalWords check ",decimalWords)
    return decimalWords.replace(/ศูนย์/g, "");
  }

  function getThaiYear(year) {
    let currentThaiYear = parseInt(year) + 543;
    return currentThaiYear;
  }

  function getThaiYear(year) {
    let currentThaiYear = parseInt(year) + 543;
    return currentThaiYear;
  }

  function sendAttachementEmail(renderPDFLayout, subject, body) {
    let pdfFile = render.xmlToPdf({
      xmlString: renderPDFLayout,
    });

    pdfFile.name = "whtTaxCertificate.pdf";

    let emailOptions = {
      author: runtime.getCurrentUser().id,
      recipients: ["musab@point-star.com", "jasim@point-star.com"],
      subject: subject,
      body: body,
      attachments: [pdfFile],
    };

    try {
      email.send(emailOptions);
      log.debug("Email Sent", "Email sent successfully");
    } catch (error) {
      log.error("Email Send Failed", error.message);
    }
  }

  function getTotalVendor(billLines) {
    let vendorArray = [];

    for (let i = 0; i < billLines.length; i++) {
      if (vendorArray.indexOf(billLines[i].entityId) < 0) {
        vendorArray.push(billLines[i].entityId);
      }
    }

    return vendorArray.length;
  }

  function convertJsonIntoEFileContent(billLines) {
    let textFileContent = "";

    for (let i = 0; i < billLines.length; i++) {
      let date = moment(billLines[i].tranDate, "DD/MM/YY");
      let year = getThaiYear(date.year());
      let month = date.month() + 1;
      let day = date.date();

      thaiDate = day + "/" + month + "/" + year;

      if (i > 0) {
        textFileContent += "\n";
      }
      // elseh
      // {
      textFileContent +=
        "|" +
        billLines[i].sno +
        "|" +
        billLines[i].vendorTaxId +
        "|00000||" +
        billLines[i].entityId +
        "|" +
        billLines[i].billaddressee +
        (billLines[i].billaddressee ? " |||||||" : "_") +
        billLines[i].billaddress1 +
        (billLines[i].billaddress1 ? "||" : "_") +
        billLines[i].billaddress2 +
        (billLines[i].billaddress2 ? "|" : "_|") +
        billLines[i].billstate +
        (billLines[i].billstate ? "|" : "_|") +
        billLines[i].billzipcode +
        (billLines[i].billzipcode ? "|" : "_|") +
        billLines[i].tranDate +
        (billLines[i].tranDate ? "|" : "_|") +
        billLines[i].taxCode +
        (billLines[i].taxCode ? "|" : "_|") +
        billLines[i].taxRate +
        (billLines[i].taxRate ? "|" : "_|") +
        billLines[i].amount +
        (billLines[i].amount ? "|" : "_|") +
        billLines[i].taxAmount +
        (billLines[i].taxAmount ? "|" : "_|") +
        billLines[i].whtCondition +
        "||||||||||||";

      //}
      log.debug("billLines[i].entityId", billLines[i].entityId);
    }

    // let fileId  = writeFileContent(textFileContent)
    // let fileURl = getFileURL(fileId)

    return textFileContent;
  }

  function getWHTCertificateTemplateData(isOneWorld,billPaymentObj,internalId,recordType) 
  {
    

    let entityRecordType = {
      creditmemo: "customer",
      vendorpayment: "vendor",
      check: "vendor",
    };

    let entityFilter = entityRecordType[recordType] + ".custentity_ps_wht_tax_id";

    log.debug("recordType on cm", entityRecordType[recordType]);
    log.debug("recordType on cm entityFilter", entityFilter);

    if (billPaymentObj.length > 0) {


      ////////////////////////// remove for non-world        ////////////////////////////

      // let vendBillInternalId = billPaymentObj[0].values["appliedToTransaction.internalid"][0].text
      // let subsidiary =
      //   billPaymentObj[0].values[
      //     "subsidiary.custrecord_ps_wht_vat_registration_no"
      //   ]; // change brn to vat
     ////////////////////////// remove for nonworld        ////////////////////////////
      //non-worldaccount123

       let subsidiary = config.load({ type: config.Type.COMPANY_INFORMATION }).getValue({ fieldId: 'custrecord_ps_wht_vat_registration_no' });

      let taxId = billPaymentObj[0].values[entityFilter];
      let currency = billPaymentObj[0].values["currency"];
      let exchangerate = billPaymentObj[0].values["exchangerate"];
      let name = billPaymentObj[0].values["formulatext"];
      let address = billPaymentObj[0].values["formulatext_1"];

      log.debug("formulatext", billPaymentObj[0].values["formulatext"]);

      if (currency.length > 0) {
        currency = currency[0].text;
      }
      if (currency == "Thailand Baht") {
        exchangerate = 1;
      }

      let VATRegistrationNumber = "";

   
        for (let i = 0; i < subsidiary.length; i++) {
          VATRegistrationNumber += '<td border="0.5" align="center">';
          VATRegistrationNumber += subsidiary[i];
          VATRegistrationNumber += "</td>";
        }
     

      let vendorTaxId = "";
      for (let i = 0; i < taxId.length; i++) {
        vendorTaxId += '<td border="0.5" align="center">';
        vendorTaxId += taxId[i];
        vendorTaxId += "</td>";
      }

      let entity = getEntity(recordType,billPaymentObj[0].values.entity[0]["value"]);

      templateData = {
        entity: name ? name.replace(/&/g, "&amp;") : "", //billPaymentObj[0].values.entity[0]["text"],
        vendorAddress: address ? address.replace(/&/g, "&amp;") : address,
        billDate: getThaiDate(billPaymentObj[0].values["trandate"]),
        taxCertificateNo:
          billPaymentObj[0].values["custbody_ps_wht_certificate_no"],
        sequenceNumber: billPaymentObj[0].values["custbody_ps_wht_sequence_no"],
        pnd1a: unCheckedImageURL(),
        pnd1aex: unCheckedImageURL(),
        pnd2: unCheckedImageURL(),
        pnd3: unCheckedImageURL(),
        pnd2a: unCheckedImageURL(),
        pnd3a: unCheckedImageURL(),
        pnd53: unCheckedImageURL(),
        withholdatsource: unCheckedImageURL(),
        payeverytime: unCheckedImageURL(),
        payonetime: unCheckedImageURL(),
        other: unCheckedImageURL(),
        trBrnNumber: VATRegistrationNumber,
        vendorTaxId: vendorTaxId,
      };
      if (billPaymentObj[0].values.custbody_ps_wht_condition.length > 0) {
        let psWHtCondition =
          billPaymentObj[0].values.custbody_ps_wht_condition[0]["text"];
        psWHtCondition = psWHtCondition.replace(/\s/g, "");
        psWHtCondition = psWHtCondition.replace(/\./g, "");
        psWHtCondition = psWHtCondition.toLowerCase();
        templateData[psWHtCondition] = checkedImageURL();
      }
      // helper_lib.loadVendBill(vendBillInternalId,templateData)

      log.debug("certificate templateData", templateData);

      templateData = getPaidAndTaxAmounts(internalId,templateData, recordType,exchangerate);
    }
    return templateData;
  }

  function getFileURL(fileId) {
    fileUrl = file.load({
      id: fileId,
    }).url;
    return fileUrl;
  }

  function writeFileContent(textFileContent) {
    let fileName = "textfile.txt";

    let fileObj = file.create({
      name: fileName,
      fileType: file.Type.PLAINTEXT,
      contents: textFileContent,
      encoding: file.Encoding.UTF8,
      folder: "-15",
      isOnline: true,
    });
    let fileId = fileObj.save();
    log.debug("Text File Saved", "File ID: " + fileId);
    return fileId;
  }

  function cleanInventoryValuationData(json) {

    let jsonArray = [];

    for (var i = 0; i < json.length; i++) {
      // log.debug("json-"+i,json[i].values)
      if (!json[i].values["locationnohierarchy"]) {
        continue;
      }
      let itemLocation =
        (json[i].values["locationnohierarchy"]
          ? json[i].values["locationnohierarchy"][0]["text"]
          : "_") +
        (" _ " + json[i].values["item"]
          ? json[i].values["item"][0]["value"]
          : "_");
      jsonArray.push({
        itemLocation: itemLocation,
        location: json[i].values["locationnohierarchy"]
          ? json[i].values["locationnohierarchy"][0]["text"]
          : "_",
        // item                : `${json[i].values["item"] ? json[i].values["item"][0]["text"] : "_"}`,
        itemValue: `${
          json[i].values["item"] ? json[i].values["item"][0]["value"] : "_"
        }`,
        itemName: `${
          json[i].values["item"]
            ? json[i].values["item"][0]["text"].replace(/&/g, "&amp;")
            : "_"
        }`,
        tranDate: getThaiDate(json[i].values["trandate"]),
        tranId: json[i].values["formulatext_3"], //json[i].values["tranid"],
        documentType: json[i].values["type"]
          ? json[i].values["type"][0]["text"]
          : "_",
        referenceNumber: (json[i].values["type"]
          ? json[i].values["type"][0]["text"]
          : "_"
        )
          .replace(/\s/g, "")
          .toUpperCase(),
        quantity: json[i].values["quantity"],
        rate: json[i].values["rate"],
        amount: json[i].values["fxamount"],
        debitAmount: json[i].values["debitfxamount"],
        creditAmount: json[i].values["creditfxamount"],
        type: json[i].values["formulatext"],
        cumulativeAmount: json[i].values["formulatext_1"],
        cumulativeQuantity: json[i].values["formulatext_2"],
        cumulativeRate:
          parseFloat(json[i].values["formulatext_1"]) /
          parseInt(json[i].values["formulatext_2"]).toFixed(2),
      });
    }

    return jsonArray;
  }

  function cleanOpeningBalanceData(json) {
    let jsonArray = [];

    //log.debug("json",json[0].values)
    for (var i = 0; i < json.length; i++) {
      let itemLocation =
        (json[i].values["GROUP(item)"]
          ? json[i].values["GROUP(item)"][0]["text"]
          : "_") +
        (" _ " + json[i].values["GROUP(locationnohierarchy)"]
          ? json[i].values["GROUP(locationnohierarchy)"]
          : "None");
      jsonArray.push({
        location: json[i].values["GROUP(locationnohierarchy)"]
          ? json[i].values["GROUP(locationnohierarchy)"]
          : "None",
        itemName: `${
          json[i].values["GROUP(item)"]
            ? json[i].values["GROUP(item)"][0]["text"]
            : "_"
        }`,
        itemValue: `${
          json[i].values["GROUP(item)"]
            ? json[i].values["GROUP(item)"][0]["value"]
            : "_"
        }`,
        quantity: json[i].values["SUM(quantity)"],
        rate: (
          parseFloat(json[i].values["SUM(formulanumeric)"]) /
          parseInt(json[i].values["SUM(quantity)"])
        ).toFixed(2),
        amount: parseFloat(json[i].values["SUM(formulanumeric)"]).toFixed(2),
      });
    }

    log.debug("jsonArray", jsonArray);
    return jsonArray;
  }

  function mergeBothSavedSearchData(inventoryValuationData, openingBalance) {
    log.debug("openingBalance", openingBalance);

    for (var i = 0; i < inventoryValuationData.length; i++) {
      let location = inventoryValuationData[i].location;
      let itemValue = inventoryValuationData[i].itemValue;

      // log.debug("warehouseItem",inventoryValuationData[i])

      var warehouseItem = openingBalance.find(function (element) {
        return element.location === location && element.itemValue === itemValue;
      });
      log.debug("warehouseItem", warehouseItem);
      if (warehouseItem) {
        inventoryValuationData[i]["openingQuantity"] = warehouseItem.quantity;
        inventoryValuationData[i]["openingAmount"] = warehouseItem.amount
          ? warehouseItem.amount
          : 0;
        inventoryValuationData[i]["openingRate"] = warehouseItem.rate; //(parseFloat(warehouseItem.amount ? warehouseItem.amount : 0) / parseInt(warehouseItem.quantity)).toFixed(2);
      } else {
        inventoryValuationData[i]["openingQuantity"] = 0;
        inventoryValuationData[i]["openingAmount"] = 0;
        inventoryValuationData[i]["openingRate"] = 0;
      }
    }
    //  log.debug("inventoryValuationData",inventoryValuationData)
    // log.debug("openingBalance",openingBalance)

    return inventoryValuationData;
  }

  function createDataSetForInventoryValuationReport(array1) {
    let finalArray = [];
    let jsonFinal = [];
    log.debug("length", array1.length);

    // Create a helper function to find or create a warehouse item entry in the final array
    function findOrCreateWarehouseItem(
      location,
      itemValue,
      itemName,
      openingQuantity,
      openingAmount,
      openingRate,
    ) {
      let warehouseItem = finalArray.find(function (entry) {
        return entry.location === location && entry.itemValue === itemValue;
      });

      if (!warehouseItem) {
        warehouseItem = {
          location: location,
          itemValue: itemValue,
          itemName: itemName,
          openingQuantity: openingQuantity,
          openingAmount: openingAmount,
          openingRate: openingRate,
          transactionDetail: [],
        };

        finalArray.push(warehouseItem);
      }

      return warehouseItem;
    }

    // Iterate over the initial array and transform the data
    for (var i = 0; i < array1.length; i++) {
      let entry = array1[i];

      log.debug("entry", entry);
      let location = entry.location;
      let itemValue = entry.itemValue;
      let itemLocation = entry.itemLocation;
      let openingQuantity = parseInt(entry.openingQuantity);
      let openingAmount = parseFloat(
        entry.openingAmount ? entry.openingAmount : 0,
      );
      let openingRate = (
        openingAmount / openingQuantity ? openingAmount / openingQuantity : 0
      ).toFixed(2);
      let itemName = entry.itemName;

      let warehouseItem = findOrCreateWarehouseItem(
        location,
        itemValue,
        itemName,
        openingQuantity,
        openingAmount,
        openingRate,
      );

      if (warehouseItem.transactionDetail.length > 0) {
        openingQuantity =
          warehouseItem.transactionDetail[
            warehouseItem.transactionDetail.length - 1
          ].openingQuantity;
        openingAmount = warehouseItem.transactionDetail[
          warehouseItem.transactionDetail.length - 1
        ].openingAmount
          ? warehouseItem.transactionDetail[
              warehouseItem.transactionDetail.length - 1
            ].openingAmount
          : 0;
        openingRate = warehouseItem.transactionDetail[
          warehouseItem.transactionDetail.length - 1
        ].openingRate
          ? warehouseItem.transactionDetail[
              warehouseItem.transactionDetail.length - 1
            ].openingRate
          : 0;
        // log.debug("qty-"+i, openingQuantity)
        //  log.debug("qty-"+i, warehouseItem.transactionDetail[warehouseItem.transactionDetail.length-1])
      }

      let tranDetailQuantity = Number(openingQuantity) + Number(entry.quantity);
      let tranDetailAmount = Number(openingAmount) + Number(entry.amount);
      let tranDetailRate = 0;
      if (tranDetailAmount == 0) {
        tranDetailRate = 0;
      } else {
        tranDetailRate =
          tranDetailAmount /
          (tranDetailQuantity == 0 ? (tranDetailQuantity = 1) : 1);
      }

      var transactionDetail = {
        location: location,
        itemValue: itemValue,
        tranDate: entry.tranDate,
        tranId: entry.tranId,
        documentType: entry.documentType,
        referenceNumber: entry.referenceNumber,
        quantity: entry.quantity,
        rate: entry.rate, //(entry.amount / entry.quantity).toFixed(2),
        amount: entry.amount, //(openingAmount / openingQuantity ? openingAmount / openingQuantity : 0).toFixed(2);
        debitAmount: entry.debitAmount,
        creditAmount: entry.creditAmount,

        rateInCurrency: formatNumberWithCommas(
          parseFloat(entry.rate).toFixed(2),
        ),
        amountInCurrency: formatNumberWithCommas(entry.amount),
        debitAmount: entry.debitAmount,
        creditAmount: entry.creditAmount,

        type: entry.type,
        cumulativeAmount: entry.cumulativeAmount,
        cumulativeQuantity: entry.cumulativeQuantity,
        cumulativeRate: entry.cumulativeRate,
        openingQuantity: tranDetailQuantity,
        openingAmount: tranDetailAmount.toFixed(2),
        openingRate: tranDetailRate.toFixed(2),

        openingAmountInCurrency: formatNumberWithCommas(
          tranDetailAmount.toFixed(2),
        ),
        openingRateInCurrency: formatNumberWithCommas(
          tranDetailRate.toFixed(2),
        ),
      };

      log.debug("warehouseItem", transactionDetail);

      warehouseItem.transactionDetail.push(transactionDetail);
    }

    log.debug("warehouseItem", finalArray["transactionDetail"]);

    return finalArray;
  }

  function getTotalByIncomeTaxTypeForPND2(templateData) {
    for (let key in templateData) {
      if (
        key.indexOf("incomeTaxTypeCode") >= 0 &&
        key.indexOf("Count") < 0 &&
        key.indexOf("AfterDot") < 0
      ) {
        // log.debug("check number",key)
        log.debug("check number " + key, templateData[key]);

        templateData[key] = convertInToCurrency(templateData[key]);
        let valueAfterSplit = templateData[key].toString().split(".");
        log.debug("valueAfterSplit", valueAfterSplit);
        if (valueAfterSplit.length > 1) {
          let firstTwoNumber = valueAfterSplit[1].slice(0, 2);
          templateData[key + "AfterDot"] = firstTwoNumber;
          templateData[key] = valueAfterSplit[0];
        } else {
          templateData[key + "AfterDot"] = "00";
        }
      }
    }

    return templateData;
  }

  function CalculateTaxAmountANDCountTotalForPND2(templateData) {
    templateData["incomeTaxTypeCodeTotalCount"] = 0;
    templateData["incomeTaxTypeCodeTotalTax"] = 0;
    templateData["incomeTaxTypeCodeTotalIncome"] = 0;

    templateData["incomeTaxTypeCodeTotalTaxAfterDot"] = 0;
    templateData["incomeTaxTypeCodeTotalIncomeAfterDot"] = 0;

    for (let key in templateData) {
      if (
        key.startsWith("incomeTaxTypeCode") &&
        key.endsWith("Count") &&
        key.indexOf("Total") < 0
      ) {
        // totalCount
        templateData["incomeTaxTypeCodeTotalCount"] =
          templateData["incomeTaxTypeCodeTotalCount"] + templateData[key];
        log.debug(
          "check log " + key,
          templateData["incomeTaxTypeCodeTotalCount"],
        );
      } else if (
        key.startsWith("incomeTaxTypeCode") &&
        key.endsWith("Income") &&
        key.indexOf("Total") < 0
      ) {
        // totalCount
        templateData["incomeTaxTypeCodeTotalIncome"] =
          templateData["incomeTaxTypeCodeTotalIncome"] + templateData[key];
      } else if (
        key.startsWith("incomeTaxTypeCode") &&
        key.endsWith("Tax") &&
        key.indexOf("Total") < 0
      ) {
        // totalCount
        templateData["incomeTaxTypeCodeTotalTax"] =
          templateData["incomeTaxTypeCodeTotalTax"] + templateData[key];
      }
    }

    //templateData["incomeTaxTypeCodeTotalIncome"] = convertInToCurrency(templateData["incomeTaxTypeCodeTotalIncome"])
    //templateData["incomeTaxTypeCodeTotalTax"] = convertInToCurrency(templateData["incomeTaxTypeCodeTotalTax"])

    return templateData;
  }

  function splitTransactionDetailIfMoreThen20(
    inputArray,
    maxTransactionDetailPerObject,
  ) {
    const finalArray = [];

    // Function to create a new object with limited transactionDetail entries
    function createNewObject(baseObj, details) {
      const newObject = {
        ...baseObj,
        transactionDetail: details,
      };

      // Set a flag for the last transactionDetail entry in the new object
      newObject.transactionDetail.forEach((detail, index) => {
        detail.lastDetailFlag =
          index === newObject.transactionDetail.length - 1;
      });

      return newObject;
    }

    let prevItemValue = null;
    let prevLocation = null;

    inputArray.forEach((entry, index) => {
      const {
        itemValue,
        location,
        openingAmount,
        openingRate,
        transactionDetail,
        ...baseObject
      } = entry;
      let nextItemValue = null;
      let nextLocation = null;

      if (index < inputArray.length - 1) {
        nextItemValue = inputArray[index + 1].itemValue;
        nextLocation = inputArray[index + 1].location;
      }

      if (
        (itemValue !== prevItemValue || location !== prevLocation) &&
        finalArray.length > 0
      ) {
        // Add a flag outside the transactionDetail array when itemValue or location changes
        finalArray[finalArray.length - 1].itemValueChanged = true;
      }

      prevItemValue = itemValue;
      prevLocation = location;

      if (transactionDetail.length <= maxTransactionDetailPerObject) {
        // If the transactionDetail array has 2 or fewer entries, use the original object
        finalArray.push({
          ...baseObject,
          itemValueChanged: false,
          location,
          openingAmountInCurrency: convertInToCurrency(openingAmount),
          openingRateInCurrency: convertInToCurrency(openingRate),
          transactionDetail: [...transactionDetail],
        });
      } else {
        // If there are more than 2 entries, split them into multiple objects
        for (
          let i = 0;
          i < transactionDetail.length;
          i += maxTransactionDetailPerObject
        ) {
          const chunk = transactionDetail.slice(
            i,
            i + maxTransactionDetailPerObject,
          );
          const newObject = createNewObject(
            {
              ...baseObject,
              location,
              openingAmountInCurrency: convertInToCurrency(openingAmount),
              openingRateInCurrency: convertInToCurrency(openingRate),
            },
            chunk,
          );
          newObject.itemValueChanged = false;
          finalArray.push(newObject);
        }
      }

      if (itemValue !== nextItemValue || location !== nextLocation) {
        // Set lastFlag for the last transactionDetail entry if next itemValue or location is different
        finalArray[finalArray.length - 1].transactionDetail[
          finalArray[finalArray.length - 1].transactionDetail.length - 1
        ].lastFlag = true;
      }
    });

    return finalArray;
  }

  function getPND54TemplateData(isOneWorld,billPaymentObj,internalId, recordType,templateData) {
    let templateDataLines = templateData.lines;
    templateDataLines = addPnd54IncomeType(templateDataLines);

    templateData.lines = templateDataLines;

    log.debug("billPaymentObj in pnd54 templateDataLines", billPaymentObj);
    let pnd54Obj = {};
    let zipCode = billPaymentObj[0].values["vendor.billzipcode"];
    let address = billPaymentObj[0].values["vendor.address1"];
    let state =
      billPaymentObj[0].values["vendor.billstate"].length > 0
        ? billPaymentObj[0].values["vendor.billstate"]
        : "-";
    let vendorTaxId =
      billPaymentObj[0].values["vendor.custentity_ps_wht_tax_id"];
    //let beneficiaryName = config.load({type:config.Type.COMPANY_INFORMATION}).getValue({fieldId:'companyname'});
    let companyAddress = "-";

    let branchCode =
      billPaymentObj[0].values[
        "cseg_subs_branch.custrecord_ps_wht_subs_branch_code"
      ];
    let branchName = billPaymentObj[0].values["cseg_subs_branch.name"];
    let branchAdd1 =
      billPaymentObj[0].values[
        "cseg_subs_branch.custrecord_ps_wht_subs_branch_addr1"
      ];
    pnd54Obj.pnd54BranchCodeHTML = pnd54BranchCodeInXML(branchCode);
    pnd54Obj.pnd54VednorTaxIdHTML = pnd54VendorTaxIdInXML(vendorTaxId);
    pnd54Obj.vendorName = billPaymentObj[0].values["entity"][0].text
      ? billPaymentObj[0].values["entity"][0].text.replace(/&/g, "&amp;")
      : billPaymentObj[0].values["entity"][0].text;
    pnd54Obj.vendorAddress = billPaymentObj[0].values["vendor.address"]
      ? billPaymentObj[0].values["vendor.address"].replace(/&/g, "&amp;")
      : billPaymentObj[0].values["vendor.address"];
    pnd54Obj.vendorAddressState =
      billPaymentObj[0].values["vendor.billstate"].length > 0
        ? billPaymentObj[0].values["vendor.billstate"][0].value
        : "-";
    pnd54Obj.vendorAddressDistrict = "-";
    pnd54Obj.vendorAddressSubDistrict = "-";
    pnd54Obj.vendorAddressZipCode = pnd54ZipCodeInHTML(zipCode);
    pnd54Obj.ordinaryfiling = false;
    pnd54Obj.additionalfiling = false;
    pnd54Obj.remittance1 = false;
    pnd54Obj.remittance2 = false;
    pnd54Obj.branchName = branchName;
    pnd54Obj.branchAdd1 = branchAdd1;
    pnd54Obj.exchangeRateDoc =
      billPaymentObj["custbody_ps_wht_exch_rate_doc_no"];

    // let remittance = billPaymentObj[0].values["custbody_ps_wht_remittance"].length > 0 ? billPaymentObj[0].values["custbody_ps_wht_remittance"][0].text : ""
    // if (remittance){remittance = remittance.match(/\d+/)[0]}

    let filingStatusText =
      billPaymentObj[0].values["custbody_ps_wht_filing_status"].length > 0
        ? billPaymentObj[0].values["custbody_ps_wht_filing_status"][0].text
        : "";

    filingStatusText = filingStatusText.replace(/\s/g, "");
    filingStatusText = filingStatusText.toLowerCase();
    log.debug("filingStatusText12", filingStatusText);
    let additinalFileNumber = filingStatusText.replace(/[^0-9]/g, "");
    filingStatusText = filingStatusText.replace(/[0-9]/g, "");

    pnd54Obj[filingStatusText ? filingStatusText : "noFilingStatus"] = true;
    pnd54Obj["additionalFilingNumber"] = additinalFileNumber;
    //  pnd54Obj["remittance"+remittance] = true
     let companyObj = config.load({ type: config.Type.COMPANY_INFORMATION })
  
      pnd54Obj["companyName"]          = companyObj.getValue({ fieldId: "companyname" }).replace(/&/g, "&amp;")
      pnd54Obj["companyAddress1"]      = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;") 
      pnd54Obj["companyAddress2"]      = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["companyAddress3"]      = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["companyZipCode"]       = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["companyZipCodeInHTML"] = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["companyCity"] = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["companyTaxIdInHTML"] = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["companyZipCodeInHTML"] = companyObj.getValue({ fieldId: "custrecord_ps_wht_address1" }).replace(/&/g, "&amp;")
      pnd54Obj["pnd54VendorTaxIdInXML"] = pnd54ZipCodeInHTML(companyObj.getValue({ fieldId: "custrecord_ps_wht_vat_registration_no" }))


      ///////////////////////// ///////// remove for non-world account /////////////////////////////////

    // if (isOneWorld) {
    //   subsidiary =
    //     billPaymentObj[0].values["subsidiary"].length > 0
    //       ? billPaymentObj[0].values["subsidiary"][0].value
    //       : "1";
    // }

    // let subsidiaryloopkup = search.lookupFields({
    //   type: "subsidiary",
    //   id: subsidiary,
    //   columns: [
    //     "legalname",
    //     "custrecord_ps_wht_address1",
    //     "custrecord_ps_wht_address2",
    //     "custrecord_ps_wht_address3",
    //     "custrecord_ps_wht_zip",
    //     "custrecord_ps_wht_city",
    //     "custrecord_ps_wht_vat_registration_no",
    //   ],
    // });

    // pnd54Obj["companyName"] = subsidiaryloopkup.legalname
    //   ? subsidiaryloopkup.legalname.replace(/&/g, "&amp;")
    //   : ".";

    // pnd54Obj["companyAddress1"] = subsidiaryloopkup.custrecord_ps_wht_address1
    //   ? subsidiaryloopkup.custrecord_ps_wht_address1.replace(/&/g, "&amp;")
    //   : ".";

    // pnd54Obj["companyAddress2"] = subsidiaryloopkup.custrecord_ps_wht_address2
    //   ? subsidiaryloopkup.custrecord_ps_wht_address2.replace(/&/g, "&amp;")
    //   : ".";

    // pnd54Obj["companyAddress3"] = subsidiaryloopkup.custrecord_ps_wht_address3
    //   ? subsidiaryloopkup.custrecord_ps_wht_address3.replace(/&/g, "&amp;")
    //   : ".";

    // pnd54Obj["companyZipCode"] = subsidiaryloopkup.custrecord_ps_wht_zip
    //   ? subsidiaryloopkup.custrecord_ps_wht_zip
    //   : ".";

    // pnd54Obj["companyZipCodeInHTML"] = pnd54ZipCodeInHTML(
    //   subsidiaryloopkup.custrecord_ps_wht_zip,
    // )
    //   ? pnd54ZipCodeInHTML(subsidiaryloopkup.custrecord_ps_wht_zip)
    //   : ".";

    // pnd54Obj["companyCity"] = subsidiaryloopkup.custrecord_ps_wht_city
    //   ? subsidiaryloopkup.custrecord_ps_wht_city
    //   : ".";

    // pnd54Obj["companyTaxIdInHTML"] = pnd54VendorTaxIdInXML(
    //   subsidiaryloopkup.custrecord_ps_wht_vat_registration_no,
    // )
    //   ? pnd54VendorTaxIdInXML(
    //       subsidiaryloopkup.custrecord_ps_wht_vat_registration_no,
    //     )
    //   : ".";

      ///////////////////////// ///////// remove for non-world account /////////////////////////////////

    templateData["Pnd54Header"] = { ...pnd54Obj };

    return templateData;
  }

  function pnd54VendorTaxIdInXML(vendorTaxId) {
    vendorTaxId = vendorTaxId.split("");
    let HTML = "";

    log.debug("vendorTaxId vendorTaxId", vendorTaxId);
    log.debug("vendorTaxId vendorTaxId length", vendorTaxId.length);

    for (var i = 0; i < vendorTaxId.length; i++) {
      if (i == 0) {
        HTML += " &nbsp; ";
        HTML += vendorTaxId[i];
      }

      if (i == 1) {
        HTML += " &nbsp;&nbsp; ";
        HTML += vendorTaxId[i];
      }
      if (i == 2) {
        HTML += "&nbsp; ";
        HTML += vendorTaxId[i];
      }
      if (i == 3) {
        HTML += "&nbsp; &nbsp; ";
        HTML += vendorTaxId[i];
      }
      if (i == 4) {
        HTML += "&nbsp; &nbsp; &nbsp;";
        HTML += vendorTaxId[i];
      }
      if (i == 5) {
        HTML += " &nbsp; ";
        HTML += vendorTaxId[i];
      }
      if (i == 6) {
        HTML += "&nbsp; ";
        HTML += vendorTaxId[i];
      }
      if (i == 7) {
        HTML += "&nbsp; &nbsp; &nbsp;";
        HTML += vendorTaxId[i];
      }
      if (i == 8) {
        HTML += " &nbsp; ";
        HTML += vendorTaxId[i];
      }
      if (i == 9) {
        HTML += " &nbsp;";
        HTML += vendorTaxId[i];
      }
      if (i == 10) {
        HTML += " &nbsp;";
        HTML += vendorTaxId[i];
      }
      if (i == 11) {
        HTML += " &nbsp; &nbsp;";
        HTML += vendorTaxId[i];
      }
      if (i == 12) {
        HTML += " &nbsp; &nbsp; ";
        HTML += vendorTaxId[i];
      }
    }
    return HTML;
  }
  function pnd54BranchCodeInXML(branchCode) {
    log.debug("pnd54BranchCodeINXML", branchCode);
    branchCode = branchCode.split("");
    let HTML = "";

    for (var i = 0; i < branchCode.length; i++) {
      if (i == 0) {
        HTML += branchCode[i];
      }
      if (i == 1) {
        HTML += " &nbsp;";
        HTML += branchCode[i];
      }
      if (i == 2) {
        HTML += " &nbsp; ";
        HTML += branchCode[i];
      }
      if (i == 3) {
        HTML += " &nbsp;";
        HTML += branchCode[i];
      }
      if (i == 4) {
        HTML += " &nbsp;";
        HTML += branchCode[i];
      }
    }

    return HTML;
  }
  function pnd54ZipCodeInHTML(zipCode) {
    zipCode = zipCode.split("");
    let HTML = "";

    for (var i = 0; i < zipCode.length; i++) {
      if (i == 0) {
        HTML += zipCode[i];
      }
      if (i == 1) {
        HTML += " &nbsp;";
        HTML += zipCode[i];
      }
      if (i == 2) {
        HTML += " &nbsp;";
        HTML += zipCode[i];
      }
      if (i == 3) {
        HTML += " &nbsp;";
        HTML += zipCode[i];
      }
      if (i == 4) {
        HTML += " &nbsp;";
        HTML += zipCode[i];
      }
    }

    return HTML;
  }
  function addPnd54IncomeType(templateLines) {
    let pnd54Obj = {};
    for (var i = 1; i < 13; i++) {
      pnd54Obj["checkPnd54IncomeType" + i] = false;
    }

    templateLines.forEach((line) => {
      for (const key in line) {
        const taxCodeObj = line[key];
        log.debug("taxCodeObj", taxCodeObj);

        if (taxCodeObj.whtTaxCodeCategory != "pnd54") {
          continue;
        }

        line.pnd54Obj = { ...pnd54Obj };
        line["ispnd54Obj"] = "true";
        let numericValue = taxCodeObj.whtTaxIncomeType;
        if (numericValue) {
          numericValue =
            taxCodeObj.whtTaxIncomeType.length > 0
              ? taxCodeObj.whtTaxIncomeType.match(/\d+/)[0]
              : "0";
        }
        log.debug("numericValue", numericValue);
        const propertyName = `checkPnd54IncomeType${numericValue}`;
        let amountWithOutVat = pnd54AmountInHTML(taxCodeObj.paidAmount);
        let taxRate = taxCodeObj.taxRate;
        let vatAmount = pnd54AmountInHTML(taxCodeObj.taxAmount);
        let parsedDate = moment(taxCodeObj.paymentDate, "DD/MM/YY");
        let formattedDate = parsedDate.format("DD/MM/YYYY");
        let paymentDateSplit = formattedDate.toString();
        const [day, month, year] = formattedDate.split("/");

        let HTMLDayArray = day.split("");
        let HTMLDay = HTMLDayArray.join(" &nbsp; ");
        let HTMLMonthArray = month.split("");
        let HTMLMonth = HTMLMonthArray.join(" &nbsp; ");
        let HTMLYearArray = year.split("");
        let HTMLYear = HTMLYearArray.join(" &nbsp; ");

        line.pnd54Obj[propertyName] = true;
        line.pnd54Obj["amountWithOutVat"] = amountWithOutVat;
        line.pnd54Obj["vatAmount"] = vatAmount;
        line.pnd54Obj["taxRate"] = parseInt(taxRate.replace("%", ""));
        line.pnd54Obj["day"] = HTMLDay;
        line.pnd54Obj["month"] = HTMLMonth;
        line.pnd54Obj["year"] = HTMLYear;
        line.pnd54Obj["remittance1"] = taxCodeObj.remittance1;
        line.pnd54Obj["remittance2"] = taxCodeObj.remittance2;
      }
    });

    templateLines.pnd54Obj = { ...pnd54Obj };

    return templateLines;
  }
  function pnd54AmountInHTML(amount) {
    let amountSplit = "";
    if (amount.indexOf(".") !== -1) {
      amountSplit = amount.split(".");
    }

    let amountHTMLAfterDot = "";
    let amountBeforeDot = "";
    let amountInHTMLBeforeDot = "";
    let finalAmountInHTML = "";
    if (amountSplit.length > 0) {
      amountBeforeDot = amountSplit[0].split("");
      amountHTMLAfterDot = amountSplit[1];
      amountHTMLAfterDot = amountHTMLAfterDot.split("");
      amountHTMLAfterDot =
        "&nbsp;" + amountHTMLAfterDot[0] + "&nbsp;" + amountHTMLAfterDot[1];

      for (var i = 0; i < amountBeforeDot.length; i++) {
        if (amountBeforeDot[i] == ",") {
          continue;
        } else {
          amountInHTMLBeforeDot += amountBeforeDot[i] + "&nbsp; ";
        }
      }
      return amountInHTMLBeforeDot + "&nbsp; " + amountHTMLAfterDot;
    } else {
      let amountSplit = amount.split("");
      for (var i = 0; i < amountSplit; i++) {
        finalAmountInHTML += "&nbsp;" + amountSplit[i];
      }
      return finalAmountInHTML;
    }
  }

  function getFontsURL() {
    fontNameArray = [
      "ANGSA.TTF",
      "AW_Siam.ttf",
      "TFPimpakarn.ttf",
      "TFPimpakarnBold.ttf",
      "TFPimpakarnBoldItalic.ttf",
      "TFPimpakarnItalic.ttf",
      "THSarabunNew.ttf",
      "THSarabunNewBold.ttf",
      "THSarabunNewBoldItalic.ttf",
      "THSarabunNewItalic.ttf",
    ];

    var output = url.resolveDomain({
      hostType: url.HostType.APPLICATION,
      accountId: runtime.accountId,
    });

    // var domain = url.resolveDomain({
    //     hostType: url.HostType.APPLICATION,
    //     accountId: '012345'
    // });

    fontURLArray = {};
    for (var i = 0; i < fontNameArray.length; i++) {
      let fontLink = file.load({
        id:
          "SuiteApps/com.pointstarconsulting.withholdingtax/Fonts/" +
          fontNameArray[i],
      }).url;
      newfontLink = fontLink.replace(/&/g, "&amp;");
      log.debug("fontLink", newfontLink);

      fontURLArray[fontNameArray[i].replace(".", "_")] =
        "https://" + output + newfontLink;
    }

    log.debug("check fonturl", fontURLArray);

    return fontURLArray;
  }

  function getImageURL() {
    var imageNameArray = [
      "checked.png",
      "pnd2_header.png",
      "pnd3_header.png",
      "pnd53_header.png",
      "pnd54.jpg",
      "pp30_header.png",
      "pp36_header.png",
      "pp36_rotate_1.png",
      "pp36_rotate_2.png",
      "pp36_rotate_3.png",
      "unchecked.png",
    ];

    var output = url.resolveDomain({
      hostType: url.HostType.APPLICATION,
      accountId: runtime.accountId,
    });

    imageURLArray = {};
    for (var i = 0; i < imageNameArray.length; i++) {
      let imageLink = file.load({
        id:
          "SuiteApps/com.pointstarconsulting.withholdingtax/header logo/" +
          imageNameArray[i],
      }).url;
      let newImageLink = imageLink.replace(/&/g, "&amp;");
      // newImageLink = imageLink.replace('&', '&amp;');
      log.debug("fontLink", newImageLink);
      imageURLArray[imageNameArray[i].replace(".", "_")] =
        "https://" + output + newImageLink;
    }

    log.debug("imageURLArray", imageURLArray);
    return imageURLArray;
  }

  function checkedImageURL() {
    let checkedImageName = "checked.png";
    let imageLink = file.load({
      id:
        "SuiteApps/com.pointstarconsulting.withholdingtax/header logo/" +
        checkedImageName,
    }).url;
    let replacelink = imageLink.replace(/&/g, "&amp;");
    //replacelink = imageLink.replace('&h', '&nbsp;h');

    log.debug(
      "replacelink",
      '<img style="width: 13px; height:13px;" src="' +
        replacelink +
        '" alt="Trulli" />',
    );
    return (
      '<img style="width: 13px; height:13px;" src="' +
      replacelink +
      '" alt="Trulli" />'
    );
  }
  function unCheckedImageURL() {
    let unCheckedImageName = "unchecked.png";
    let imageLink = file.load({
      id:
        "SuiteApps/com.pointstarconsulting.withholdingtax/header logo/" +
        unCheckedImageName,
    }).url;
    let replacelink = imageLink.replace(/&/g, "&amp;");

    log.debug("imageLink", replacelink);
    log.debug(
      "replacelink",
      '<img style="width: 13px; height:13px;" src="' +
        replacelink +
        '" alt="Trulli" />',
    );
    return (
      '<img style="width: 13px; height:13px;" src="' +
      replacelink +
      '" alt="Trulli" />'
    );
  }
  function getEntity(recordType, entityId) {
    let entityObj = {
      vendorpayment: "vendor",
      check: "vendor",
      customerpayment: "customer",
      cashsale: "customer",
      creditmemo: "customer",
    };

    log.debug("recordType[entityObj] ", entityObj[recordType]);
    log.debug("recordType[entityObj] ", recordType);
    log.debug("recordType[entityId] ", entityId);

    let entity = search.lookupFields({
      type: entityObj[recordType],
      id: entityId,
      columns: ["companyname", "isperson", "firstname", "lastname"],
    });

    log.debug("entity ", entity);
    entity = entity.isperson
      ? entity.firstname + " " + entity.lastname
      : entity.companyname;

    return entity;
  }

  function getVATPP30DataForCover(vatPayLoad) {
    let templateData = {
      field1IntPart: getIntegerPart(vatPayLoad["field1"]),
      field1DecimelPart: getDecimalPart(vatPayLoad["field1"]),
      field2IntPart: getIntegerPart(vatPayLoad["field2"]),
      field2DecimelPart: getDecimalPart(vatPayLoad["field2"]),
      field3IntPart: getIntegerPart(vatPayLoad["field3"]),
      field3DecimelPart: getDecimalPart(vatPayLoad["field3"]),
      field4IntPart: getIntegerPart(vatPayLoad["field4"]),
      field4DecimelPart: getDecimalPart(vatPayLoad["field4"]),
      field5IntPart: getIntegerPart(vatPayLoad["field5"]),
      field5DecimelPart: getDecimalPart(vatPayLoad["field5"]),
      field6IntPart: getIntegerPart(vatPayLoad["field6"]),
      field6DecimelPart: getDecimalPart(vatPayLoad["field6"]),
      field7IntPart: getIntegerPart(vatPayLoad["field7"]),
      field7DecimelPart: getDecimalPart(vatPayLoad["field7"]),
      field8IntPart: getIntegerPart(vatPayLoad["field8"]),
      field8DecimelPart: getDecimalPart(vatPayLoad["field8"]),
      field9IntPart: getIntegerPart(vatPayLoad["field9"]),
      field9DecimelPart: getDecimalPart(vatPayLoad["field9"]),
      field10IntPart: getIntegerPart(vatPayLoad["field10"]),
      field10DecimelPart: getDecimalPart(vatPayLoad["field10"]),
      field11IntPart: getIntegerPart(vatPayLoad["field11"]),
      field11DecimelPart: getDecimalPart(vatPayLoad["field11"]),
      field12IntPart: getIntegerPart(vatPayLoad["field12"]),
      field12DecimelPart: getDecimalPart(vatPayLoad["field12"]),
      field13IntPart: getIntegerPart(vatPayLoad["field13"]),
      field13DecimelPart: getDecimalPart(vatPayLoad["field13"]),
      field14IntPart: getIntegerPart(vatPayLoad["field14"]),
      field14DecimelPart: getDecimalPart(vatPayLoad["field14"]),
      field15IntPart: getIntegerPart(vatPayLoad["field15"]),
      field15DecimelPart: getDecimalPart(vatPayLoad["field15"]),
      field16IntPart: getIntegerPart(vatPayLoad["field16"]),
      field16DecimelPart: getDecimalPart(vatPayLoad["field16"]),
      isUnDeclaredSales11: vatPayLoad["isUnDeclaredSales11"],
      isOverDeclaredPurchase12: vatPayLoad["isOverDeclaredPurchase12"],
      isUnDeclaredPurchase61: vatPayLoad["isUnDeclaredPurchase61"],
      isOverDeclaredSales62: vatPayLoad["isOverDeclaredSales62"],
      jan: false,
      feb: false,
      mar: false,
      apr: false,
      may: false,
      jun: false,
      jul: false,
      aug: false,
      sep: false,
      oct: false,
      nov: false,
      dec: false,
    };

    var configrationRecord = search_lib.getTaxConfigration();
    let subsidiaryBranchInternalId = vatPayLoad["subsidiaryBranch"];
    log.debug("loadSubsidiaryBranch", subsidiaryBranchInternalId);
    let isSuiteTaxEnabled =
      configrationRecord.length > 0
        ? configrationRecord[0].values["custrecord_ps_wht_suitetax_enabled"]
        : "false";

    loadTaxPeriod(vatPayLoad["whtPeriod"], templateData);
    log.debug("after tax period", templateData);

    loadSubsidiaryBranchCodePND3(subsidiaryBranchInternalId,templateData,"pp30");

    let subsidairyBranchObj = "";
    let subsidairyInternalId;
    let branchName = "";
    if (subsidiaryBranchInternalId) {
      subsidairyBranchObj = search.lookupFields({
        type: "customrecord_cseg_subs_branch",
        id: subsidiaryBranchInternalId,
        columns: ["custrecord_ps_wht_subs_brn_filterby_subs", "name"],
      });

      log.debug("check branch code", subsidairyBranchObj);
      branchName = subsidairyBranchObj["name"];
      
      templateData["branchName"] = branchName;
      log.debug("loadSubsidiaryBranch", templateData["branchName"]);
    }

    loadSubsidiaryForBRNNumber( templateData, "pp30");
    loadSubsidiaryBranchCodeForPND53(subsidiaryBranchInternalId,templateData,"pp30");

    log.debug("loadSubsidiaryBranch", templateData["branchName"]);

    return templateData;
  }

  function getIntegerPart(number) {
    log.debug("getIntegerPart:number", number);
    return Math.floor(number).toString();
  }

  // Function to get the decimal part of a number as a string
  function getDecimalPart(number) {
    const decimalPart = number % 1;
    const decimalString = (decimalPart * 100).toFixed(0); // Get the two decimal places as a string
    return decimalString.padStart(2, "0"); // Ensure there are always two digits
  }

  function getIntegerPart(number) {
    log.debug("getIntegerPart:number", number);
    return Math.floor(number).toString();
  }

  // Function to get the decimal part of a number as a string
  function getDecimalPart(number) {
    const decimalPart = number % 1;
    const decimalString = (decimalPart * 100).toFixed(0); // Get the two decimal places as a string
    return decimalString.padStart(2, "0"); // Ensure there are always two digits
  }

  function getCompanyTaxIDFromSubsidiaryForExcel(internalId) {
    if (!internalId) {
      templateData["brnNumber"] = "";
      return;
    }

    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "subsidiary",
      isDynamic: true,
    });

    let companyTaxId = subsidiaryBranchObj.getText({
      fieldId: "custrecord_ps_wht_vat_registration_no",
    });
    companyTaxId = companyTaxId.split("");
    if (companyTaxId.length > 13) {
      companyTaxId.splice(13);
    }
    const newArr = companyTaxId.map(myFunction);

    function myFunction(num) {
      return { id: num };
    }

    return newArr;
  }

  function inputOutputTaxReportData(isOneWorld, param, taxReportType) {

    let templateData = {};
    let currentDate = new Date();
    let year = currentDate.getFullYear();

    let accountingPeriodDate = search_lib.getAccountingPeriodMonth(
      param.whtPeriod,
    );
    let subsidairyInternalId = search.lookupFields({
      type: "customrecord_cseg_subs_branch",
      id: param.subsidiaryBranch,
      columns: [
        "custrecord_ps_wht_subs_brn_filterby_subs",
        "custrecord_ps_wht_subs_branch_code",
        "name",
      ],
    });

    let accountingPeriodYear =
      accountingPeriodDate.length > 0
        ? accountingPeriodDate[0].values.formulatext_1
        : "none";
    let accountingPeriodMonth =
      accountingPeriodDate.length > 0
        ? accountingPeriodDate[0].values.formulatext_2
        : "none";

    let branchCode = subsidairyInternalId["custrecord_ps_wht_subs_branch_code"];
    templateData["hq"] = false;
    templateData["branch"] = false;
    templateData["year"] = accountingPeriodYear;
    templateData["monthInThai"] = convertToThaiMonthName(
      accountingPeriodMonth.trim(),
    );
    templateData["companyName"] = subsidairyInternalId.name;

    log.debug("year", search_lib.getAccountingPeriodMonth(param.whtPeriod));

    if (branchCode == "0000") {
      templateData["hq"] = true;
    } else if (branchCode != "0000") {
      templateData["branch"] = true;
    }

    subsidairyInternalId =
      subsidairyInternalId["custrecord_ps_wht_subs_brn_filterby_subs"];
    subsidairyInternalId =
      subsidairyInternalId.length > 0 ? subsidairyInternalId[0].value : "";

    log.debug("templateData branchCode ", templateData);

    loadSubsidiaryBranchCodePND3(
      param.subsidiaryBranch,
      templateData,
      "inputtaxreport",
    );
    log.debug("templateData tranData", templateData);
    loadSubsidiaryForBRNNumberForInputOutputTaxReport(
      subsidairyInternalId,
      templateData,
      "inputtaxreport",
    );
    let tranData = getInputOutputTaxFromSearch(taxReportType, param);

    log.debug("tranData", tranData);

    log.debug("templateData branchCode ", templateData);

    templateData["tranDataLines"] = tranData.dataLines;
    templateData["totalAmountWithOutVat"] = formatNumberWithCommas(
      tranData.totalAmountWithOutVat,
    );
    templateData["totalVatAmountPerBill"] = formatNumberWithCommas(
      tranData.totalVatAmountPerBill,
    );

    return templateData;
  }

  function inputOutputTaxReportDataForExcel(isOneWorld, param, taxReportType) {
    let templateData = {};
    log.debug("param param", param);
    log.debug("param param.subsidiaryBranch", param.subsidiaryBranch);
    log.debug("param param.whtPeriod", param.whtPeriod);

    let subsidiaryBranchObj = search.lookupFields({
      type: "customrecord_cseg_subs_branch",
      id: param.subsidiaryBranch,
      columns: [
        "custrecord_ps_wht_subs_brn_filterby_subs",
        "custrecord_ps_wht_subs_branch_code",
        "custrecord_ps_wht_subs_branch_addr1",
        "custrecord_ps_wht_subs_branch_addr2",
        "custrecord_ps_wht_subs_branch_addr3",
        "custrecord_ps_wht_subs_branch_zip",
        "name",
      ],
    });

    let accountingPeriodDate = search_lib.getAccountingPeriodMonth(
      param.whtPeriod,
    );

    let subsidairyInternalId =
      subsidiaryBranchObj["custrecord_ps_wht_subs_brn_filterby_subs"];
    subsidairyInternalId =
      subsidairyInternalId.length > 0 ? subsidairyInternalId[0].value : "";
    let currentDate = new Date();
    let year = currentDate.getFullYear();

    let accountingPeriodYear =
      accountingPeriodDate.length > 0
        ? accountingPeriodDate[0].values.formulatext_1
        : "none";
    let accountingPeriodMonth =
      accountingPeriodDate.length > 0
        ? accountingPeriodDate[0].values.formulatext_2
        : "none";

    templateData["address1"] =
      subsidiaryBranchObj["custrecord_ps_wht_subs_branch_addr1"];
    templateData["address2"] =
      subsidiaryBranchObj["custrecord_ps_wht_subs_branch_addr2"];
    templateData["address3"] =
      subsidiaryBranchObj["custrecord_ps_wht_subs_branch_addr3"];
    templateData["zipCode"] =
      subsidiaryBranchObj["custrecord_ps_wht_subs_branch_zip"];
    templateData["hq"] = false;
    templateData["branch"] = false;
    templateData["year"] = accountingPeriodYear;
    templateData["monthInThai"] = convertToThaiMonthName(
      accountingPeriodMonth.trim(),
    );
    templateData["companyName"] = subsidiaryBranchObj.name
      ? subsidiaryBranchObj.name.replace(/&/g, "&amp;")
      : subsidiaryBranchObj.name;

    let branchCode = subsidiaryBranchObj["custrecord_ps_wht_subs_branch_code"];
    if (branchCode == "0000") {
      templateData["hq"] = true;
    } else {
      templateData["branch"] = true;
    }
    branchCode = branchCode.split("");
    const branchCodeArr = branchCode.map(myFunction);
    function myFunction(num) {
      return { id: num };
    }
    templateData["branchCode"] = branchCodeArr;

    if (isOneWorld) {
      templateData["companyTaxId"] =
        getCompanyTaxIDFromSubsidiaryForExcel(subsidairyInternalId);
    } else if (!isOneWorld) {
      let companyTaxId = config
        .load({ type: config.Type.COMPANY_INFORMATION })
        .getValue({ fieldId: "custrecord_ps_wht_vat_registration_no" }); //change brn to vat
      templateData["companyTaxId"] = companyTaxId.split("");
    }

    log.debug("templateData", templateData);
    let tranData = getInputOutputTaxFromSearch(taxReportType, param);
    log.debug("templateData tranData", tranData);
    templateData["tranDataLines"] = tranData.dataLines;
    templateData["totalAmountWithOutVat"] = formatNumberWithCommas(
      tranData.totalAmountWithOutVat,
    );
    templateData["totalVatAmountPerBill"] = formatNumberWithCommas(
      tranData.totalVatAmountPerBill,
    );

    log.debug("templateData templateData", templateData);
    return templateData;
  }

  function getInputOutputTaxFromSearch(taxReportType, param) {

    let taxConfigration = search_lib.getTaxConfigration();
    log.debug("taxConfigration", taxConfigration);
    let isSuiteTaxEnabled =
      taxConfigration[0].values["custrecord_ps_wht_suitetax_enabled"];
    let undueAccountName =
      taxConfigration[0].values["custrecord_ps_wht_undue_debit_account"]
        .length > 0
        ? taxConfigration[0].values["custrecord_ps_wht_undue_debit_account"][0]
            .text
        : "";
    let filters = isSuiteTaxEnabled
      ? suiteTaxEnabledFilters(taxReportType, param, undueAccountName)
      : withoutSuiteTaxEnabledFilters(taxReportType, param, undueAccountName);
    log.debug("undueAccountName", undueAccountName);

    let inputTaxData = isSuiteTaxEnabled ? search_lib.getInputVATSavedSearchDataForSuiteTaxEnabled(filters,undueAccountName)
      : search_lib.getInputVatSavedSearchData(filters);
    let tranData = [];
    let totalAmountWithOutVat = 0;
    let totalVatAmountPerBill = 0;

    log.debug("inputTaxData", inputTaxData);

    for (var i = 0; i < inputTaxData.length; i++) {
      let parsedDate = inputTaxData[i].values["GROUP(trandate)"]; //moment(inputTaxData[i].values["GROUP(trandate)"]).format('MM-DD-YYYY');

      let tranLineObj = {};
      totalAmountWithOutVat += isSuiteTaxEnabled
        ? Number(inputTaxData[i].values["SUM(formulanumeric)"]) < 0
          ? Number(inputTaxData[i].values["SUM(formulanumeric)"]) * -1
          : Number(inputTaxData[i].values["SUM(formulanumeric)"])
        : Number(inputTaxData[i].values["SUM(formulanumeric)_1"]);

      totalVatAmountPerBill += isSuiteTaxEnabled
        ? Number(inputTaxData[i].values["SUM(formulanumeric)_1"])
        : Number(inputTaxData[i].values["SUM(formulanumeric)"]);

      tranLineObj["type"] =
        inputTaxData[i].values["GROUP(type)"][0]["text"].toUpperCase() == "BILL"
          ? inputTaxData[i].values["GROUP(type)"][0]["text"]
              .toUpperCase()
              .replace("VENDORBILL", "VENDBILL")
          : inputTaxData[i].values["GROUP(type)"][0]["text"].toUpperCase();

      tranLineObj["tranNumber"] =
        inputTaxData[i].values["GROUP(transactionnumber)"];
      tranLineObj["trandate"] = getThaiDate(parsedDate);
      tranLineObj["DocNumber"] = isSuiteTaxEnabled ? inputTaxData[i].values["GROUP(formulatext)_3"] :inputTaxData[i].values["GROUP(tranid)"];
      tranLineObj["whtMemo"] = inputTaxData[i].values["GROUP(custbody_ps_wht_memo)"]
        ? inputTaxData[i].values["GROUP(custbody_ps_wht_memo)"].replace(
            /&/g,
            "&amp;",
          )
        : inputTaxData[i].values["GROUP(custbody_ps_wht_memo)"];

      tranLineObj["vendorName"] = isSuiteTaxEnabled
        ? inputTaxData[i].values["GROUP(formulatext)"]
          ? inputTaxData[i].values["GROUP(formulatext)"].replace(/&/g, "&amp;")
          : inputTaxData[i].values["GROUP(formulatext)_1"]
        : inputTaxData[i].values["GROUP(formulatext)_1"]
        ? inputTaxData[i].values["GROUP(formulatext)_1"].replace(/&/g, "&amp;")
        : inputTaxData[i].values["GROUP(formulatext)_1"];

      tranLineObj["vendorTaxRegId"] =
        inputTaxData[i].values[
          "GROUP(vendor.custentity_ps_wht_vat_registration_no)"
        ];

      tranLineObj["customerName"] = inputTaxData[i].values["GROUP(formulatext)"]
        ? inputTaxData[i].values["GROUP(formulatext)"].replace(/&/g, "&amp;")
        : inputTaxData[i].values["GROUP(formulatext)"];

      tranLineObj["customerTaxRegId"] =
        inputTaxData[i].values[
          "GROUP(customer.custentity_ps_wht_vat_registration_no)"
        ];

      tranLineObj["vendorEntityBranch"] = isSuiteTaxEnabled
        ? inputTaxData[i].values["GROUP(formulatext)_1"]
        : inputTaxData[i].values["GROUP(formulatext)"];

      tranLineObj["customerEntityBranch"] = isSuiteTaxEnabled
        ? inputTaxData[i].values["GROUP(formulatext)_1"]
        : inputTaxData[i].values["GROUP(formulatext)"];

      tranLineObj["totalBillAmountWithOutVat"] = isSuiteTaxEnabled
        ? formatNumberWithCommas(
            inputTaxData[i].values["SUM(formulanumeric)"]
              ? inputTaxData[i].values["SUM(formulanumeric)"].replace("-", "")
              : "00",
          )
        : formatNumberWithCommas(
            inputTaxData[i].values["SUM(formulanumeric)_1"],
          );

      tranLineObj["totalVatAmountPerBill"] = isSuiteTaxEnabled
        ? formatNumberWithCommas(
            inputTaxData[i].values["SUM(formulanumeric)_1"],
          )
        : formatNumberWithCommas(inputTaxData[i].values["SUM(formulanumeric)"]);

      tranData.push(tranLineObj);
    }

    // log.debug("tranData",tranData)
    log.debug("totalAmountWithOutVat", totalAmountWithOutVat);
    //log.debug("tranData",tranData)

    return {
      totalAmountWithOutVat: totalAmountWithOutVat,
      totalVatAmountPerBill: totalVatAmountPerBill,
      dataLines: tranData,
    };
  }

  function loadSubsidiaryForBRNNumberForInputOutputTaxReport(
    internalId,
    templateData,
    printType,
  ) {
    if (!internalId) {
      templateData["brnNumber"] = "";
      return;
    }

    let subsidiaryBranchObj = record.load({
      id: internalId,
      type: "subsidiary",
      isDynamic: true,
    });

    let brnNumber = subsidiaryBranchObj.getText({
      fieldId: "custrecord_ps_wht_vat_registration_no", //change brn to vat
    });

    let brntd = ``;
    //  log.debug("brnNumber i", brnNumber[0])
    //   log.debug("brnNumber i", brnNumber.length)
    brnLength = brnNumber.length;

    for (let i = 0; i < brnNumber.length; i++) {
      if (i == 0) {
        brntd += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 0.5px solid ${constant_lib.colorCodeObj[printType]};  " >${brnNumber[i]}</td>`;
      }

      if (i == 1) {
        brntd += ` <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }
      if (i == 2) {
        brntd += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                      ${brnNumber[i]}
                                                       </td>`;
      }
      if (i == 3) {
        brntd += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 4) {
        brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 5) {
        brntd += ` <td align="center" font-size="12px" width="17px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 6) {
        brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 7) {
        brntd += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 8) {
        brntd += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                        ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 9) {
        brntd += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 10) {
        brntd += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                         ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 11) {
        brntd += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                          ${brnNumber[i]}
                                                       </td>`;
      }

      if (i == 12) {
        brntd += `<td align="center" font-size="12px" width="12px" style="overflow: hidden; border: 0.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                         ${brnNumber[i]}
                                                       </td>`;
      }
    }

    templateData["brnNumber"] = brntd;
  }

  function formatNumberWithCommas(number) {
    try {
      if (!number) {
        return "0.00";
      }
      let decimalPlaces = 2;
      let numberString = parseFloat(number).toFixed(decimalPlaces);
      let parts = numberString.split(".");
      let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      let decimalPart = parts.length > 1 ? "." + parts[1] : "";
      return integerPart + decimalPart;
    } catch (e) {
      log.error("Error in formatNumberWithCommas()", e);
    }
  }
  function suiteTaxEnabledFilters(taxReportType, params, undueAccountName) {
    let filters = [
      ["posting", "is", "T"],
      "AND",
      [
        "formulatext: case when {type}='Journal' then (case when {account}='" +
          undueAccountName +
          "' then 'JE undue account' else 'none' end ) else 'ff' end",
        "isnot",
        "none",
      ],
      "AND",
      [
        "formulatext: case when {type}='Journal' then 'suite tax not valid for je' else (case when {taxdetail.taxrate} is NULL then 'extra line' else 'valid' end) end",
        "isnot",
        "extra line",
      ],
    ];

    if (taxReportType == "outputTaxReport") {
      filters.push("AND");
      filters.push(["type", "anyof", "CustInvc"]);
    }
    if (taxReportType == "inputTaxReport") {
      filters.push("AND");
      filters.push(["type", "anyof", "VendBill", "Check", "Journal"]);
    }

    if (params.subsidiary) {
      filters.push("AND");
      filters.push(["subsidiary", "anyof", params.subsidiary]);
    }
    if (params.subsidiaryBranch) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", params.subsidiaryBranch]);
    }

    if (params.filingStatus) {
      filters.push("AND");
      filters.push([
        "custbody_ps_wht_filing_status",
        "anyof",
        params.filingStatus,
      ]);
    }
    if (params.whtPeriod) {
      filters.push("AND");

      filters.push(["postingperiod", "anyof", params.whtPeriod]);
      //filters.push(  ["custbody_ps_wht_tax_period", "anyof", params.whtPeriod])
    }

    if (params.taxCodes.length > 0) {
      let taxCode = params.taxCodes;
      if (taxCode[0]) {
        log.debug("taxCode", taxCode);
        taxCode = taxCode.sort();
        filters.push("AND");
        filters.push(["taxdetail.taxcode", "anyof", taxCode]);
      }
    }

    log.debug("filters", filters);
    log.debug("parseParams1", params.subsidiary);
    return filters;
  }

  function withoutSuiteTaxEnabledFilters(
    taxReportType,
    param,
    undueAccountName,
  ) {
    let filters = [
      ["mainline", "is", "F"],
      "AND",
      ["taxline", "is", "F"],
      "AND",
      [
        "formulatext: case when {type}='Journal' then (case when {account}='" +
          undueAccountName +
          "' then 'JE undue account' else 'none' end ) else 'ff' end",
        "isnot",
        "none",
      ],
    ];

    let parseParams = param;
    log.debug("parseParams1", parseParams.subsidiary);

    if (taxReportType == "outputTaxReport") {
      filters.push("AND");
      filters.push(["type", "anyof", "CustInvc"]);
    }

    if (taxReportType == "inputTaxReport") {
      filters.push("AND");
      filters.push(["type", "anyof", "VendBill", "Check", "Journal"]);
    }

    if (parseParams.subsidiary) {
      filters.push("AND");
      filters.push(["subsidiary", "anyof", parseParams.subsidiary]);
    }

    if (parseParams.subsidiaryBranch) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", parseParams.subsidiaryBranch]);
    }

    if (parseParams.filingStatus) {
      filters.push("AND");
      filters.push([
        "custbody_ps_wht_filing_status",
        "anyof",
        parseParams.filingStatus,
      ]);
      // filters.push([
      //   "applyingtransaction.custbody_ps_wht_filing_status",
      //   "anyof",
      //   parseParams.filingStatus,
      // ]);
    }
    if (parseParams.whtPeriod) {
      filters.push("AND");
      filters.push(["postingperiod", "anyof", parseParams.whtPeriod]);
    }

    if (parseParams.taxCodes.length > 1) {
      let taxCode = parseParams.taxCodes;
      taxCode = taxCode.sort();
      filters.push("AND");
      filters.push(["taxitem", "anyof", taxCode]);
    }

    log.debug("filters", filters);
    return filters;
  }

  function getHTMLBranchCode(branchCode, printType) {
    let html = "";
    if (branchCode == "0000") {
      for (var i = 0; i < 4; i++) {
        html += '<td border="0.5" align="center">';
        html += "-";
        html += "</td>";
      }
    } else {
      for (var i = 0; i < branchCode.length; i++) {
        html += '<td border="0.5" align="center">';
        html += branchCode[i];
        html += "</td>";
      }
    }

    return html;
  }

  function getZipCodeHTML(zipCode) {
    let html = "";

    for (var i = 0; i < zipCode.length; i++) {
      html += '<td border="0.5" align="center">';
      html += zipCode[i];
      html += "</td>";
    }

    return html;
  }
  function convert13DigitTaxIdIntoHTML(taxId, printType) {
    if (!taxId) {
      return "";
    }

    let html = "";

    for (let i = 0; i < taxId.length; i++) {
      if (i == 0) {
        html += `<td align="center"  width="15px" height="8px" font-size="12px" style="border: 1.5px solid ${constant_lib.colorCodeObj[printType]};  " >${taxId[i]}</td>`;
      }

      if (i == 1) {
        html += ` <td align="center" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                      
                                                       <td align="center" font-size="12px" width="15px" height="8px" margin-right="0.4px" style="border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${taxId[i]}
                                                       </td>`;
      }
      if (i == 2) {
        html += `   <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                      ${taxId[i]}
                                                       </td>`;
      }
      if (i == 3) {
        html += ` <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${taxId[i]}
                                                       </td>`;
      }

      if (i == 4) {
        html += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]};" >
                                                       ${taxId[i]}
                                                       </td>`;
      }

      if (i == 5) {
        html += `<td align="right" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                      
                                                       <td align="center" font-size="12px" width="17px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${taxId[i]}
                                                       </td>`;
      }

      if (i == 6) {
        html += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${taxId[i]}
                                                       </td>`;
      }

      if (i == 7) {
        html += `<td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${taxId[i]}
                                                       </td>`;
      }

      if (i == 8) {
        html += `  <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; " >
                                                        ${taxId[i]}
                                                       </td>`;
      }

      if (i == 9) {
        html += ` <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                       ${taxId[i]}
                                                       </td>`;
      }

      if (i == 10) {
        html += ` <td align="center" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                      
                                                       <td align="center" font-size="12px" width="15px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 0.3px dashed ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                         ${taxId[i]}
                                                       </td>`;
      }

      if (i == 11) {
        html += `  <td align="center" font-size="12px" width="15px"  style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]};border-right:  1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                          ${taxId[i]}
                                                       </td>`;
      }

      if (i == 12) {
        html += ` <td align="right" width="8px" style="overflow: hidden; font-size:15px;" >-</td>
                                                     
                                                       <td align="center" font-size="12px" width="12px" style="overflow: hidden; border-top: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-bottom: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-left: 1.5px solid ${constant_lib.colorCodeObj[printType]}; border-right: 1.5px solid ${constant_lib.colorCodeObj[printType]}; " >
                                                         ${taxId[i]}
                                                       </td>`;
      }
    }

    return html;
  }

  function getpp36Data(isOneWorld, billPaymentObj, internalId, recordType) {
    let templateData = {};

    log.debug("billPaymentObj", billPaymentObj);

    if (billPaymentObj.length > 0) {

       //////////////////// remove for non-world account  ///////////////////
      // let vendBillInternalId = billPaymentObj[0].values["appliedToTransaction.internalid"][0].text
      // let subsidiaryVATRegistrationNumber = isOneWorld
      //   ? billPaymentObj[0].values[
      //       "subsidiary.custrecord_ps_wht_vat_registration_no"
      //     ]
      //   : "";
      //////////////////// remove for non-world account  ///////////////////

    let subsidiaryVATRegistrationNumber =  config.load({ type: config.Type.COMPANY_INFORMATION }).getValue({ fieldId: 'custrecord_ps_wht_vat_registration_no' });


      let taxId = billPaymentObj[0].values["vendor.custentity_ps_wht_tax_id"];
      let currency = billPaymentObj[0].values["currency"];
      let exchangerate = billPaymentObj[0].values["exchangerate"];
      let branchCode =
        billPaymentObj[0].values[
          "cseg_subs_branch.custrecord_ps_wht_subs_branch_code"
        ];
      let branchName = billPaymentObj[0].values["cseg_subs_branch.name"];
      let branchAdd1 =
        billPaymentObj[0].values[
          "cseg_subs_branch.custrecord_ps_wht_subs_branch_addr1"
        ];
      let zipCode =
        billPaymentObj[0].values[
          "cseg_subs_branch.custrecord_ps_wht_subs_branch_zip"
        ];
      let vendorName = billPaymentObj[0].values["formulatext"];
      let vendorBillingAddress = billPaymentObj[0].values["formulatext_1"];
      let vendorBillingZipCode = billPaymentObj[0].values["formulatext_5"];
      let vendorBillingAddress1 = billPaymentObj[0].values["formulatext_2"];
      let vendorBillingCity = billPaymentObj[0].values["formulatext_3"];
      let vendorBillingCountry = billPaymentObj[0].values["formulatext_3"];
      let tranDateYear = billPaymentObj[0].values["formulatext_7"];
      let tranDateMonth = convertToThaiMonthName(
        billPaymentObj[0].values["formulatext_8"],
      );
      let tranDateDay = billPaymentObj[0].values["formulatext_9"];
      let pp36SectionId =
        billPaymentObj[0].values["custbody_ps_wht_pp36_section"].length > 0
          ? billPaymentObj[0].values["custbody_ps_wht_pp36_section"][0].value
          : "";
      let pp36SectionCode = "code";
      if (pp36SectionId) {
        pp36SectionCode = search.lookupFields({
          type: "customrecord_ps_tht_wht_pp36_section",
          id: pp36SectionId,
          columns: ["custrecord_ps_wht_pp36_code"],
        }).custrecord_ps_wht_pp36_code;
      }

      log.debug("pp36SectionCode", pp36SectionCode);

      let htmlBranchCode = getHTMLBranchCode(branchCode, "pp36");
      let htmlZipCode = getZipCodeHTML(zipCode);
      let vendorHtmlZipCode = getZipCodeHTML(vendorBillingZipCode);

      log.debug("branchCode", templateData);
      log.debug("branchName", branchName);

      if (currency.length > 0) {
        currency = currency[0].text;
      }
      if (currency == "Thailand Baht") {
        exchangerate = 1;
      }

      let VATRegistrationNumber = convert13DigitTaxIdIntoHTML(
        subsidiaryVATRegistrationNumber,
        "pp36",
      );

      log.debug("VATRegistrationNumber", VATRegistrationNumber);
      log.debug(
        "subsidiaryVATRegistrationNumber",
        subsidiaryVATRegistrationNumber,
      );

      let vendorTaxId = "";
      for (let i = 0; i < taxId.length; i++) {
        vendorTaxId += '<td border="0.5" align="center">';
        vendorTaxId += taxId[i];
        vendorTaxId += "</td>";
      }

      templateData = {
        entity: getEntity(
          recordType,
          billPaymentObj[0].values.entity[0]["value"],
        ), //billPaymentObj[0].values.entity[0]["text"],
        vendorAddress: billPaymentObj[0].values["vendor.address"],
        billDate: billPaymentObj[0].values["trandate"],
        taxCertificateNo:
          billPaymentObj[0].values["custbody_ps_wht_certificate_no"],
        sequenceNumber: billPaymentObj[0].values["custbody_ps_wht_sequence_no"],
        VATRegistrationNumber: VATRegistrationNumber,
        vendorTaxId: vendorTaxId,
        branchCode: htmlBranchCode,
        branchName: branchName,
        branchAdd1: branchAdd1,
        zipCode: htmlZipCode,
        vendorName: vendorName,
        vendorAddress1: vendorBillingAddress1,
        vendorCityCountry: vendorBillingCity + "," + vendorBillingCountry,
        vendorZipCode: vendorHtmlZipCode,
        month: tranDateMonth,
        day: tranDateDay,
        year: tranDateYear,
        ordinaryfiling: false,
        additionalfiling: false,
        pp36sectionCode1: false,
        pp36sectionCode2: false,
        pp36sectionCode3: false,
      };

      templateData["pp36sectionCode" + pp36SectionCode] = true;

      log.debug("templateData after pp36", templateData["pp36sectionCode1"]);

      if (billPaymentObj[0].values.custbody_ps_wht_condition.length > 0) {
        let psWHtCondition =
          billPaymentObj[0].values.custbody_ps_wht_condition[0]["text"];
        psWHtCondition = psWHtCondition.replace(/\s/g, "");
        psWHtCondition = psWHtCondition.replace(/\./g, "");
        psWHtCondition = psWHtCondition.toLowerCase();
        // templateData[psWHtCondition] =  checkedImageURL()
      }
      // helper_lib.loadVendBill(vendBillInternalId,templateData)

      log.debug("getPaidAndTaxAmounts", templateData);
      let filingStatusText =
        billPaymentObj[0].values["custbody_ps_wht_filing_status"].length > 0
          ? billPaymentObj[0].values["custbody_ps_wht_filing_status"][0].text
          : "";

      filingStatusText = filingStatusText.replace(/\s/g, "");
      filingStatusText = filingStatusText.toLowerCase();
      log.debug("filingStatusText12", filingStatusText);
      let additinalFileNumber = filingStatusText.replace(/[^0-9]/g, "");
      filingStatusText = filingStatusText.replace(/[0-9]/g, "");

      templateData[
        filingStatusText ? filingStatusText : "noFilingStatus"
      ] = true;
      templateData["additionalFilingNumber"] = additinalFileNumber;

      templateData = getPaidAndTaxAmounts(
        internalId,
        templateData,
        recordType,
        exchangerate,
      );

      templateData["totalPaidAmountIntegerPart"] =
        formatNumberWithCommasOnlyItegerPart(
          getIntegerPart(templateData["totalPaidAmount"].replace(/,/g, "")),
        );
      templateData["totalPaidAmountDecimalPart"] = getDecimalPart(
        templateData["totalPaidAmount"].replace(/,/g, ""),
      );

      templateData["totalTaxIntegerPart"] =
        formatNumberWithCommasOnlyItegerPart(
          getIntegerPart(templateData["totalTax"].replace(/,/g, "")),
        );
      templateData["totalTaxDecimalPart"] = getDecimalPart(
        templateData["totalTax"].replace(/,/g, ""),
      );

      log.debug("templateData", templateData);
    }
    return templateData;
  }

    function convertToThaiMonthName(monthName) {
    const months = {
      JANUARY: "มกราคม",
      FEBRUARY: "กุมภาพันธ์",
      MARCH: "มีนาคม",
      APRIL: "เมษายน",
      MAY: "พฤษภาคม",
      JUNE: "มิถุนายน",
      JULY: "กรกฎาคม",
      AUGUST: "สิงหาคม",
      SEPTEMBER: "กันยายน",
      OCTOBER: "ตุลาคม",
      NOVEMBER: "พฤศจิกายน",
      DECEMBER: "ธันวาคม",
    };

    return months[monthName.toUpperCase().trim()] || "Invalid month";
  }

  function formatNumberWithCommasOnlyItegerPart(number) {
    try {
      if (!number) {
        return "0.00";
      }
      let decimalPlaces = 2;
      let numberString = parseFloat(number).toFixed(decimalPlaces);
      let parts = numberString.split(".");
      let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      let decimalPart = parts.length > 1 ? "." + parts[1] : "";
      return integerPart;
    } catch (e) {
      log.error("Error in formatNumberWithCommas()", e);
    }
  }

  function formatNumberWithCommas(number) {
    try {
      if (!number) {
        return "0.00";
      }
      let decimalPlaces = 2;
      let numberString = parseFloat(number).toFixed(decimalPlaces);
      let parts = numberString.split(".");
      let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      let decimalPart = parts.length > 1 ? "." + parts[1] : "";
      return integerPart + decimalPart;
    } catch (e) {
      log.error("Error in formatNumberWithCommas()", e);
    }
  }

  function getThaiDate(tranDate) 
  {
    let date = moment(getDATEINTODDMMYY(tranDate), "DD/MM/YYYY");
    let year  =  getThaiYear(date.year());
    let month =  date.month() + 1;
    let day   =  date.date();
   
    if(month<10)
    {
      month = month+""
      month = 0+month
    }
    
    let thaiDate = day + "/" + month + "/" + year;

    return thaiDate;
  }

  function identifyPlacesForThaiFormat(number) 
  {
     let numberString = number.toString();
     log.debug("numberString",numberString.length)
     if (numberString.length < 5) {return "";}

    
     var wordobj = {"7" : "ล้าน","6": "แสน", "5":"หมื่น"}
     var rem =  numberString 
    var i = 0 
     var thaiformatWord = ""

      while(rem.length>4)
      {
        thaiformatWord +=""+convertIntegerToWords(parseInt(numberString[i]))+""+ wordobj[(rem.length).toString()]
        rem = rem.substring(1);
         i++
      }
      return thaiformatWord
     // console.log(thaiformatWord)
  }

  function removeDigitsFromLeft(string) {
    if (string.length > 4) {
        string = string.substring(string.length - 4);
    }
    return string;
}

  return {
    isNull,
    isUndefined,
    isTransactionAvailable,
    isTransactionAvailable,
    loadTaxPeriod: loadTaxPeriod,
    loadVendBill: loadVendBill,
    getPaidAndTaxAmounts: getPaidAndTaxAmounts,
    loadSubsidiaryBranchCode: loadSubsidiaryBranchCode,
    loadSubsidiaryBranchCodePND3: loadSubsidiaryBranchCodePND3,
    convertInToCurrency: convertInToCurrency,
    getLineData: getLineData,
    getLineDataTotal: getLineDataTotal,
    getPNDAttachmentTemplateData: getPNDAttachmentTemplateData,
    getPNDCoverTemplateData: getPNDCoverTemplateData,
    getWHTCertificateTemplateData: getWHTCertificateTemplateData,
    amountsTowords: amountsTowords,
    sendAttachementEmail: sendAttachementEmail,
    isNull: isNull,
    createDataSetForInventoryValuationReport:
      createDataSetForInventoryValuationReport,
    mergeBothSavedSearchData: mergeBothSavedSearchData,
    cleanOpeningBalanceData: cleanOpeningBalanceData,
    cleanInventoryValuationData: cleanInventoryValuationData,
    getTotalByIncomeTaxTypeForPND2: getTotalByIncomeTaxTypeForPND2,
    CalculateTaxAmountANDCountTotalForPND2:
      CalculateTaxAmountANDCountTotalForPND2,
    splitTransactionDetailIfMoreThen20: splitTransactionDetailIfMoreThen20,
    getPND54TemplateData: getPND54TemplateData,
    sendAttachemntEmail: sendAttachemntEmail,
    getFontsURL: getFontsURL,
    getImageURL: getImageURL,
    getIntegerPart: getIntegerPart,
    getDecimalPart: getDecimalPart,
    getVATPP30DataForCover: getVATPP30DataForCover,
    inputOutputTaxReportDataForExcel: inputOutputTaxReportDataForExcel,
    inputOutputTaxReportData: inputOutputTaxReportData,
    convertToThaiMonthName: convertToThaiMonthName,
    convertDateFormatToMMDDYYYY: convertDateFormatToMMDDYYYY,
    getpp36Data: getpp36Data,
  };
});

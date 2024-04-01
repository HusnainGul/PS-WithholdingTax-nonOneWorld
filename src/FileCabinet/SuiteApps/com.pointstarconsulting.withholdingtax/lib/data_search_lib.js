/**
 * @NApiVersion 2.1
 * @NModuleScope public
 * @description This file contains all the saved searches for the project.
 */

define([
  "N/search",
  "N/url",
  "N/https",
  "N/query",
  "./moment",
  "N/record",
], function (search, url, https, query, moment, record) {
  function getAccountingPeriodMonth(internalId) {
    var accountingperiodSearchObj = search.create({
      type: "accountingperiod",
      filters: [["internalid", "anyof", internalId]],
      columns: [
        search.createColumn({
          name: "periodname",
          sort: search.Sort.ASC,
          label: "Name",
        }),
        search.createColumn({ name: "startdate", label: "Start Date" }),
        search.createColumn({
          name: "formulatext",
          formula: "TO_CHAR({startdate},'MON')",
          label: "Formula (Text)",
        }),
        search.createColumn({
          name: "formulatext",
          formula: "TO_CHAR({startdate},'YYYY')",
          label: "Formula (Text)",
        }),
        search.createColumn({
          name: "formulatext",
          formula: "TO_CHAR({startdate},'MONTH')",
          label: "Formula (Text)",
        }),
      ],
    });

    var results = accountingperiodSearchObj.run();
    var range = results.getRange(0, 2);
    var parseData = JSON.parse(JSON.stringify(range));

    return parseData;
  }

  function getBillDataFromSavedSearch(
    isOneWorld,
    internalId,
    recordType,
    type,
  ) {
    log.debug("isOneWorld", isOneWorld);
    log.debug("recordType", recordType);
    log.debug("type", type);

    var columns = [
      search.createColumn({ name: "entity", label: "Name" }),
      search.createColumn({ name: "type", label: "type" }),
      search.createColumn({ name: "currency", label: "Currency" }),
      search.createColumn({ name: "exchangerate", label: "Exchange Rate" }),
      search.createColumn({
        name: "custbody_ps_wht_filing_status",
        label: "filing Status",
      }),
      search.createColumn({
        name: "custbody_ps_wht_sequence_no",
        label: "Sequence Number",
      }),
      search.createColumn({ name: "trandate", label: "trandate" }),
      search.createColumn({
        name: "formulacurrency",
        formula: "{total}",
        label: "Formula (Currency)",
      }),

      search.createColumn({
        name: "address",
        join: "vendor",
        label: "Address",
      }),
      search.createColumn({
        name: "address1",
        join: "vendor",
        label: "Address 1",
      }),
      search.createColumn({
        name: "billcity",
        join: "vendor",
        label: "Billing City",
      }),
      search.createColumn({
        name: "billstate",
        join: "vendor",
        label: "Billing State/Province",
      }),
      search.createColumn({
        name: "billzipcode",
        join: "vendor",
        label: "Billing Zip",
      }),

      search.createColumn({
        name: "appliedtolinktype",
        label: "Applied To Link Type",
      }),
      search.createColumn({
        name: "custentity_ps_wht_tax_id",
        join: "vendor",
        label: "Tax ID",
      }),
      search.createColumn({
        name: "trandate",
        join: "appliedToTransaction",
        label: "Date",
      }),
      search.createColumn({
        name: "internalid",
        join: "appliedToTransaction",
        label: "Internal ID",
      }),
      search.createColumn({
        name: "appliedtoforeignamount",
        label: "Applied To Link Amount (Foreign Currency)",
      }),
      search.createColumn({
        name: "custbody_ps_wht_certificate_no",
        label: "WHT Certificate No",
      }),
      search.createColumn({
        name: "custbody_ps_wht_condition",
        label: "WHT Condition",
      }),
      search.createColumn({ name: "tranid", label: "Tran Id" }),
      search.createColumn({
        name: "custrecord_ps_wht_subs_branch_code",
        join: "cseg_subs_branch",
        label: "Branch Code",
      }),
      search.createColumn({
        name: "custrecord_ps_wht_subs_branch_zip",
        join: "cseg_subs_branch",
        label: "branch Zip Code",
      }),
      search.createColumn({
        name: "name",
        join: "cseg_subs_branch",
        label: "Name",
      }),
      search.createColumn({
        name: "custrecord_ps_wht_subs_branch_addr1",
        join: "cseg_subs_branch",
        label: "Address 1",
      }),
      search.createColumn({
        name: "custbody_ps_wht_exch_rate_doc_no",
        label: "Exchange Rate Document",
      }), //
      search.createColumn({
        name: "formulatext",
        formula: "NVL({vendor.altname}, {customer.altname})",
      }), //0
      search.createColumn({
        name: "formulatext",
        formula:
          "NVL({vendor.address1} ,{customer.address1}) || ' ,' || NVL({vendor.billcity},{customer.billcity}) || ' ,' || NVL({vendor.zipcode},{customer.zipcode}) || ' ,' || NVL({vendor.billcountry},{customer.billcountry})",
        label: "Formula (Text)",
      }), //1
      search.createColumn({
        name: "formulatext",
        formula: "NVL({vendor.address1},{customer.address1})",
        label: "Formula (Text)",
      }), //2
      search.createColumn({
        name: "formulatext",
        formula: "NVL({vendor.billcity},{customer.billcity})",
        label: "Formula (Text)",
      }), //3
      search.createColumn({
        name: "formulatext",
        formula: "NVL({vendor.billcountry},{customer.billcountry})",
        label: "Formula (Text)",
      }), //4
      search.createColumn({
        name: "formulatext",
        formula: "NVL({vendor.zipcode},{customer.zipcode})",
        label: "Formula (Text)",
      }), //5
      search.createColumn({
        name: "formulatext",
        formula: "TO_CHAR({trandate},'MON')",
        label: "Formula (Text)",
      }), //6
      search.createColumn({
        name: "formulatext",
        formula: "TO_CHAR({trandate},'YYYY')",
        label: "Formula (Text)",
      }), //7
      search.createColumn({
        name: "formulatext",
        formula: "TO_CHAR({trandate},'MONTH')",
        label: "Formula (Text)",
      }), //8
      search.createColumn({
        name: "formulatext",
        formula: "TO_CHAR({trandate},'DD')",
        label: "Formula (Text)",
      }), //9
      search.createColumn({ name: "custbody_ps_wht_pp36_section" }),
    ];

    

    var vendorpaymentSearchObj = search.create({
      type: type,
      filters: [
        ["type", "anyof", recordType],
        "AND",
        ["mainline", "is", "T"],
        "AND",
        ["internalid", "anyof", internalId],
      ],
      columns,
    });

    var paymentData = vendorpaymentSearchObj.run();
    paymentData = paymentData.getRange(0, 999);
    var parseData = JSON.parse(JSON.stringify(paymentData));

    log.debug("parseData JSON", parseData);

    return parseData;
  }

  function getpnd3AttachmentData(subsidiary,subsidiaryBranchCode,taxPeriod,whtTaxPeriodText,filingStatus) 
  {
    var attachmentArray = [];
    var records = new Array();

    var internalIdFilter = getpnd3AttachmentNonAppliedData(subsidiary,subsidiaryBranchCode,taxPeriod,filingStatus);

    paymentInternalIds = internalIdFilter.slice(2);

    // log.debug("paymentInternalIds",paymentInternalIds)
    // log.debug("internalIdFilter",internalIdFilter)

    period = whtTaxPeriodText.split(":");
    period = period[2];

    log.debug("taxPeriod", period);
    relatedRecords = getRelatedRecords(paymentInternalIds, period);

    // log.debug("check releted",relatedRecords)

    //       // log.debug("PaymentNotAppliedObj",internalIdFilter)
    //       var queryString = `SELECT
    //  b.id AS bill_id,
    //  b.transactionnumber AS bill_number,
    //  bl.line AS line_number,
    //  bl.item AS item_id,
    //  bl.quantity AS quantity,
    //  bl.amount AS amount,
    //  bp.id AS bill_payment_id,
    //  bp.transactionnumber AS bill_payment_number
    //    FROM
    //       transaction AS b
    //    JOIN
    //       transaction.lines AS bl ON b.id = bl.transactionid
    //    JOIN
    //       transaction.linking AS tl ON b.id = tl.appliedtotransaction
    //    JOIN
    //       transaction AS bp ON tl.applyingtransaction = bp.id
    //    WHERE
    //       b.recordtype = 'vendorbill'
    //       AND bp.recordtype = 'vendorpayment'
    //    ORDER BY
    //       b.id, bl.line;`

    //       log.debug("queryString",queryString)

    // 		var queryResults = query.runSuiteQL( { query: queryString } ).asMappedResults();

    // 		records = records.concat( queryResults );

    // log.debug("records",records)

    //   var transactionSearchObj = search.create({
    //    type: "transaction",
    //    filters:
    //    [
    //       ["mainline","is","F"],
    //       "AND",
    //       ["posting","is","T"],
    //       "AND",
    //       ["subsidiary","anyof",subsidiary],
    //       "AND",
    //       ["custcol_ps_wht_tax_code","noneof","@NONE@"],
    //       "AND",
    //       ["custbody_wht_tax_subsidiarybranch_code","anyof",subsidiaryBranchCode],
    //       "AND",
    //    ["custbody_ps_wht_tax_period","anyof",taxPeriod]
    //    ],
    //    columns:
    //    [
    //       search.createColumn({name: "trandate", label: "Date"}),
    //       search.createColumn({name: "tranid", label: "Document Number"}),
    //       search.createColumn({name: "entity", label: "Name"}),
    //       search.createColumn({name: "amount", label: "Amount"}),
    //       search.createColumn({
    //          name: "entityid",
    //          join: "vendor",
    //          label: "Name"
    //       }),
    //       search.createColumn({
    //          name: "address",
    //          join: "vendor",
    //          label: "Address"
    //       }),
    //       search.createColumn({name: "item", label: "Item"}),
    //       search.createColumn({name: "custcol_ps_wht_tax_code", label: "WHT Tax Code"}),
    //       search.createColumn({name: "custcol_ps_wht_tax_amount", label: "WHT Tax Amount"}),
    //       search.createColumn({name: "custcol_ps_wht_base_amount", label: "WHT Base Amount"})
    //    ]
    //    });

    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["type", "anyof", "VendBill"],
        "AND",
        ["mainline", "is", "F"],
        "AND",
        ["subsidiary", "anyof", subsidiary],
        "AND",
        [
          "custbody_wht_tax_subsidiarybranch_code",
          "anyof",
          subsidiaryBranchCode,
        ],
        "AND",
        ["custbody_ps_wht_filing_status", "anyof", filingStatus],
        "AND",
        ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
        "AND",
        ["custcol_ps_wht_tax_code", "noneof", "@NONE@"],
        "AND",
        internalIdFilter,
      ],
      columns: [
        search.createColumn({
          name: "tranDate",
          summary: "GROUP",
          label: "tranDate",
        }),
        search.createColumn({
          name: "entityid",
          join: "vendor",
          summary: "GROUP",
          label: "Name",
        }),

        search.createColumn({
          name: "custcol_ps_wht_tax_code",
          summary: "GROUP",
          label: "WHT Tax Code",
        }),
        search.createColumn({
          name: "custcol_ps_wht_tax_rate",
          summary: "GROUP",
          label: "WHT Tax Rate",
        }),
        search.createColumn({
          name: "custcol_ps_wht_tax_amount",
          summary: "SUM",
          label: "WHT Tax Amount",
        }),
        search.createColumn({
          name: "address",
          join: "vendor",
          summary: "GROUP",
          label: "Address",
        }),
        search.createColumn({
          name: "amount",
          summary: "SUM",
          label: "Amount",
        }),
        search.createColumn({
          name: "custcol_ps_wht_base_amount",
          summary: "SUM",
          label: "WHT Base Amount",
        }),
        search.createColumn({
          name: "custcol_ps_wht_tax_amount",
          summary: "SUM",
          label: "WHT Tax Amount",
        }),
      ],
    });

    var searchResultCount = transactionSearchObj.runPaged().count;
    var sno = 0;

    transactionSearchObj.run().each(function (searchItem) {
      sno++;

      var searchObj = {};
      searchObj.sno = sno;
      searchObj.internalId = searchItem.getValue({
        name: "internalid",
        summary: search.Summary.GROUP,
      });
      searchObj.tranDate = searchItem.getValue({
        name: "trandate",
        summary: search.Summary.GROUP,
      });
      searchObj.entityId = searchItem.getValue({
        name: "entityid",
        join: "vendor",
        summary: search.Summary.GROUP,
      });
      searchObj.adderess = searchItem.getValue({
        name: "address",
        join: "vendor",
        summary: search.Summary.GROUP,
      });
      searchObj.item = searchItem.getText({
        name: "item",
        summary: search.Summary.GROUP,
      });
      searchObj.taxCode = getTaxCode(
        searchItem.getText({
          name: "custcol_ps_wht_tax_code",
          summary: search.Summary.GROUP,
        }),
      );
      searchObj.rate = searchItem.getValue({
        name: "amount",
        summary: search.Summary.SUM,
      });
      searchObj.baseAmount = searchItem.getValue({
        name: "custcol_ps_wht_base_amount",
        summary: search.Summary.SUM,
      });
      searchObj.taxAmount = searchItem.getValue({
        name: "custcol_ps_wht_tax_amount",
        summary: search.Summary.SUM,
      });

      attachmentArray.push(searchObj);
      return true;
    });

    //  log.debug("attachmentArray",attachmentArray)
    //  log.debug("relatedRecords",relatedRecords)

    const combinedArr = [];

    relatedRecords.forEach((relatedRecordsArray) => {
      attachmentArray.forEach((sublistLineArray) => {
        if (relatedRecordsArray.entityid === sublistLineArray.entityid) {
          combinedArr.push({
            ...relatedRecordsArray,
            ...sublistLineArray,
          });
        }
      });
    });

    // log.debug("combinedArr",combinedArr)

    return attachmentArray;
  }

  function pnd3Total(
    subsidiary,
    subsidiaryBranchCode,
    taxPeriod,
    templateData,
  ) {
    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["mainline", "is", "F"],
        "AND",
        ["posting", "is", "T"],
        "AND",
        ["subsidiary", "anyof", subsidiary],
        "AND",
        ["custcol_ps_wht_tax_code", "noneof", "@NONE@"],
        "AND",
        [
          "custbody_wht_tax_subsidiarybranch_code",
          "anyof",
          subsidiaryBranchCode,
        ],
        "AND",
        ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
      ],
      columns: [
        search.createColumn({
          name: "custcol_ps_wht_tax_amount",
          summary: "SUM",
          label: "WHT Tax Amount",
        }),
        search.createColumn({
          name: "custcol_ps_wht_base_amount",
          summary: "SUM",
          label: "WHT Base Amount",
        }),
      ],
    });

    var searchResultCount = transactionSearchObj.runPaged().count;

    transactionSearchObj.run().each(function (searchItem) {
      templateData.totalBaseAmount = searchItem.getValue({
        name: "custcol_ps_wht_base_amount",
        summary: "SUM",
      });
      templateData.totalTaxAmount = searchItem.getValue({
        name: "custcol_ps_wht_tax_amount",
        summary: "SUM",
      });

      return false;
    });

    return templateData;
  }

  function getTaxCode(whtTaxCodeTxt) {
    var taxCodeString = whtTaxCodeTxt;
    if (taxCodeString) {
      taxCodeString = taxCodeString.split("(");
      if (taxCodeString.length > 0) {
        taxCodeString = taxCodeString[0];
        taxCodeString = taxCodeString.replace(/\s/g, "");
      }
    }
    return taxCodeString;
  }

  function loadCountTaxCode(
    subsidiary,
    subsidiaryBranchCode,
    taxPeriod,
    templateData,
  ) {
    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [
        ["mainline", "is", "F"],
        "AND",
        ["posting", "is", "T"],
        "AND",
        ["subsidiary", "anyof", subsidiary],
        "AND",
        ["custcol_ps_wht_tax_code", "noneof", "@NONE@"],
        "AND",
        [
          "custbody_wht_tax_subsidiarybranch_code",
          "anyof",
          subsidiaryBranchCode,
        ],
        "AND",
        ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
      ],
      columns: [
        search.createColumn({
          name: "custcol_ps_wht_tax_code",
          summary: "COUNT",
          label: "WHT Tax Code",
        }),
      ],
    });

    var searchResultCount = transactionSearchObj.runPaged().count;

    transactionSearchObj.run().each(function (searchItem) {
      templateData.count = searchItem.getValue({
        name: "custcol_ps_wht_tax_code",
        summary: "COUNT",
      });
      return false;
    });

    return templateData;
  }

  function getpnd3AttachmentNonAppliedData(subsidiary,subsidiaryBranchCode,taxPeriod,filingStatus ) {
    var attachmentArray = ["internalid", "anyof"];

    var transactionSearchObj = search.create({
      type: "vendorbill",
      filters: [
        ["type", "anyof", "VendBill"],
        "AND",
        ["subsidiary", "anyof", subsidiary],
        "AND",
        [
          "custbody_wht_tax_subsidiarybranch_code",
          "anyof",
          subsidiaryBranchCode,
        ],
        "AND",
        ["custbody_ps_wht_filing_status", "anyof", filingStatus],
        "AND",
        ["custbody_ps_wht_tax_period", "anyof", taxPeriod],
        "AND",
        ["applyingtransaction", "noneof", "@NONE@"],
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          summary: "GROUP",
          label: "Internal ID",
        }),
      ],
    });

    var searchResultCount = transactionSearchObj.runPaged().count;

    transactionSearchObj.run().each(function (searchItem) {
      attachmentArray.push(
        searchItem.getValue({
          name: "internalid",
          summary: search.Summary.GROUP,
        }),
      );

      return true;
    });

    return attachmentArray;
  }

  function getRelatedRecords(billInternalIds, period) {
    var relatedRecords = [];

    for (var i = 0; i < billInternalIds.length; i++) {
      var vendorBill = record.load({
        type: record.Type.VENDOR_BILL,
        id: billInternalIds[i],
        isDynamic: false, // use false if you don't need to edit the record
      });

      entityid = vendorBill.getText({ fieldId: "entity" });

      var numLines = vendorBill.getLineCount({
        sublistId: "links",
      });
      log.debug("check numLines", numLines);

      for (var j = 0; j < numLines; j++) {
        var tranDate = vendorBill.getSublistText({
          sublistId: "links",
          line: j,
          fieldId: "trandate",
        });
        var billPaymentAmount = vendorBill.getSublistText({
          sublistId: "links",
          line: j,
          fieldId: "total",
        });

        if (tranDate) {
          var paymentDate = moment(tranDate).format("MMM YYYY");
          log.debug("check numLines", paymentDate + "paymentDate" + period);
          if (paymentDate.trim() == period.trim()) {
            relatedRecords.push({
              internalId: billInternalIds[i],
              paymentDate: paymentDate,
              billPaymentAmount: billPaymentAmount,
              entityid: entityid,
            });
          }
        }
      }

      log.debug("relatedRecords", relatedRecords);
    }
    return relatedRecords;
  }

  function getBillPaymentDataForBillData(subsidiaryBranchCode,taxPeriod,filingStatus) {

    var attachmentArray = [];


    let filters = [
      ["type", "anyof", "VendPymt", "Check", "CustPymt"],
      "AND",
      ["postingperiod", "anyof", taxPeriod],
      "AND",
      ["custbody_ps_wht_bill_lines_data", "isnotempty", ""],
      "AND",
      ["mainline", "is", "T"],
    ];

   
    if (filingStatus) {
      filters.push("AND");
      filters.push(["custbody_ps_wht_filing_status", "anyof", filingStatus]);
    }
    if (subsidiaryBranchCode) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", subsidiaryBranchCode]);
    }

    var vendorpaymentSearchObj = search.create({
      type: "transaction",
      filters: filters,
      columns: [
        search.createColumn({ name: "trandate", label: "Date" }),
        search.createColumn({
          name: "custbody_ps_wht_sequence_no",
          label: "Sequence Number",
        }),
        search.createColumn({ name: "internalid", label: "InternalId" }),
        search.createColumn({
          name: "custbody_ps_wht_bill_lines_data",
          label: "Bill Data",
        }),
        search.createColumn({
          name: "custbody_ps_wht_condition",
          label: "WHT Condition",
        }),
        search.createColumn({
          name: "entityid",
          join: "vendor",
          label: "Name",
        }),
        search.createColumn({
          name: "isperson",
          join: "vendor",
          label: "isperson",
        }),
        search.createColumn({
          name: "companyname",
          join: "vendor",
          label: "isperson",
        }),
        search.createColumn({
          name: "firstname",
          join: "vendor",
          label: "isperson",
        }),
        search.createColumn({
          name: "lastname",
          join: "vendor",
          label: "isperson",
        }),

        search.createColumn({
          name: "entityid",
          join: "customer",
          label: "Name",
        }),
        search.createColumn({
          name: "isperson",
          join: "customer",
          label: "isperson",
        }),
        search.createColumn({
          name: "companyname",
          join: "customer",
          label: "isperson",
        }),
        search.createColumn({
          name: "firstname",
          join: "customer",
          label: "isperson",
        }),
        search.createColumn({
          name: "lastname",
          join: "customer",
          label: "isperson",
        }),

        search.createColumn({
          name: "address",
          join: "vendor",
          label: "Address",
        }),
        search.createColumn({
          name: "billaddressee",
          join: "vendor",
          label: "Billing Addressee",
        }),
        search.createColumn({
          name: "billaddress1",
          join: "vendor",
          label: "Billing Address 1",
        }),
        search.createColumn({
          name: "billaddress2",
          join: "vendor",
          label: "Billing Address 2",
        }),
        search.createColumn({
          name: "billcity",
          join: "vendor",
          label: "Billing City",
        }),
        search.createColumn({
          name: "billstate",
          join: "vendor",
          label: "Billing State/Province",
        }),
        search.createColumn({
          name: "billzipcode",
          join: "vendor",
          label: "Billing Zip",
        }),
        search.createColumn({
          name: "billcountry",
          join: "vendor",
          label: "Billing Country",
        }),
        search.createColumn({
          name: "custentity_ps_wht_tax_id",
          join: "vendor",
          label: "Tax ID",
        }),
        // search.createColumn({ name: "custentity_ps_wht_tax_id", label: "Tax ID" }),
      ],
    });

    var searchResultCount = vendorpaymentSearchObj.runPaged().count;

    vendorpaymentSearchObj.run().each(function (searchItem) {
      var searchObj = {};
      searchObj.internalId = searchItem.getValue({ name: "internalid" });
      searchObj.trandate = searchItem.getValue({ name: "trandate" });
      searchObj.vendorEntityId = searchItem.getValue({
        name: "entityid",
        join: "vendor",
      });
      searchObj.vendorIsPerson = searchItem.getValue({
        name: "isperson",
        join: "vendor",
      });
      searchObj.vendorCompanyName = searchItem.getValue({
        name: "companyname",
        join: "vendor",
      });
      searchObj.vendorFirstName = searchItem.getValue({
        name: "firstname",
        join: "vendor",
      });
      searchObj.vendorLastName = searchItem.getValue({
        name: "lastname",
        join: "vendor",
      });

      searchObj.customerEntityId = searchItem.getValue({
        name: "entityid",
        join: "customer",
      });
      searchObj.customerIsPerson = searchItem.getValue({
        name: "isperson",
        join: "customer",
      });
      searchObj.customerCompanyName = searchItem.getValue({
        name: "companyname",
        join: "customer",
      });
      searchObj.customerFirstName = searchItem.getValue({
        name: "firstname",
        join: "customer",
      });
      searchObj.customerLastName = searchItem.getValue({
        name: "lastname",
        join: "customer",
      });

      searchObj.billData = searchItem.getValue({
        name: "custbody_ps_wht_bill_lines_data",
      });
      searchObj.vendorAddress = searchItem.getValue({
        name: "address",
        join: "vendor",
      });
      searchObj.vendorTaxId = searchItem.getValue({
        name: "custentity_ps_wht_tax_id",
        join: "vendor",
      });

      searchObj.sequenceNumber = searchItem.getValue({
        name: "custbody_ps_wht_sequence_no",
      });
      searchObj.whtCondition = searchItem.getValue({
        name: "custbody_ps_wht_condition",
      });

      searchObj.billaddressee = searchItem.getValue({
        name: "billaddressee",
        join: "vendor",
      });
      searchObj.billaddress1 = searchItem.getValue({
        name: "billaddress1",
        join: "vendor",
      });
      searchObj.billaddress2 = searchItem.getValue({
        name: "billaddress2",
        join: "vendor",
      });
      searchObj.billcity = searchItem.getValue({
        name: "billcity",
        join: "vendor",
      });
      searchObj.billstate = searchItem.getValue({
        name: "billstate",
        join: "vendor",
      });
      searchObj.billzipcode = searchItem.getValue({
        name: "billzipcode",
        join: "vendor",
      });
      searchObj.billcountry = searchItem.getValue({
        name: "billcountry",
        join: "vendor",
      });

      if (searchObj.whtCondition) {
        searchObj.whtCondition = search.lookupFields({
          type: "customrecord_ps_tht_wht_condition",
          id: searchItem.getValue({ name: "custbody_ps_wht_condition" }),
          columns: ["custrecord_ps_wht_condition_code"],
        }).custrecord_ps_wht_condition_code;
      }

      attachmentArray.push(searchObj);
      return true;
    });

    for (var i = 0; i < attachmentArray.length; i++) {
      log.debug("attachmentArray", attachmentArray[i]);
    }

    return attachmentArray;
  }

  function countVendorForPNDCover(
    subsidiary,
    subsidiaryBranchCode,
    taxPeriod,
    filingStatus,
  ) {
    var vendorpaymentSearchObj = search.create({
      type: "transaction",
      filters: [
        ["type", "anyof", "VendPymt", "Check"],
        "AND",
        ["postingperiod", "anyof", taxPeriod],
        "AND",
        ["subsidiary", "anyof", subsidiary],
        "AND",
        ["custbody_ps_wht_filing_status", "anyof", filingStatus],
        "AND",
        ["cseg_subs_branch", "anyof", subsidiaryBranchCode],
        "AND",
        ["custbody_ps_wht_bill_lines_data", "isnotempty", ""],
        "AND",
        ["mainline", "is", "F"],
      ],
      columns: [
        search.createColumn({
          name: "internalid",
          summary: "COUNT",
          label: "Internal ID",
        }),
        search.createColumn({
          name: "entity",
          summary: "GROUP",
          label: "Name",
        }),
      ],
    });

    var paymentData = vendorpaymentSearchObj.run();
    paymentData = paymentData.getRange(0, 999);
    var parseData = JSON.parse(JSON.stringify(paymentData));

    return parseData.length;
  }

  function getOpeningBalanceData(filters) {
    log.debug("getOpeningBalanceData filters", filters);
    var transactionSearchObj = search
      .create({
        type: "transaction",
        filters: filters,
        columns: [
          search.createColumn({
            name: "locationnohierarchy",
            summary: "GROUP",
            label: "Location (no hierarchy)",
          }),
          search.createColumn({
            name: "item",
            summary: "GROUP",
            label: "Item",
          }),
          search.createColumn({
            name: "trandate",
            summary: "MAX",
            label: "Date",
          }),
          search.createColumn({
            name: "quantity",
            summary: "SUM",
            label: "Quantity",
          }),
          search.createColumn({
            name: "debitfxamount",
            summary: "SUM",
            label: "Amount (Debit)",
          }),
          search.createColumn({
            name: "creditfxamount",
            summary: "SUM",
            label: "Amount (Credit)",
          }),
          search.createColumn({
            name: "formulanumeric",
            summary: "SUM",
            formula: "nvl({debitfxamount},0)-nvl({creditfxamount},0)",
            label: "Formula (Numeric)",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(transactionSearchObj);
    //  savedSearchData = cleanOpeningBalance(JSON.parse(JSON.stringify(savedSearchData)))
    //  createDataSetForTemplate(savedSearchData)

    // log.debug("savedSearchData",savedSearchData)

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getInventoryValuationDataForAvailbleData(filters) {
    var transactionSearchObj = search.create({
      type: "transaction",
      filters: filters,
      columns: [
        search.createColumn({
          name: "locationnohierarchy",
          label: "Location (no hierarchy)",
        }),
        search.createColumn({ name: "item", label: "Item" }),
        search.createColumn({ name: "trandate", label: "Date" }),
        search.createColumn({ name: "quantity", label: "Quantity" }),
        search.createColumn({ name: "rate", label: "Item Rate" }),
        search.createColumn({ name: "fxamount", label: "Amount" }),
        search.createColumn({ name: "account", label: "Account" }),
        search.createColumn({
          name: "debitfxamount",
          label: "Amount (Debit)",
        }),
        search.createColumn({
          name: "creditfxamount",
          label: "Amount (Credit)",
        }),
        search.createColumn({
          name: "formulatext",
          formula:
            "case when {fxamount}<0 OR {type} ='Invoice' then 'OUT' else 'IN' end",
          label: "Stock",
        }),
        //search.createColumn({name: "itemtotal", label: "Item Total"}),
        search.createColumn({ name: "tranid", label: "Document Number" }),
        search.createColumn({
          name: "internalid",
          join: "item",
          label: "Internal ID",
        }),
        search.createColumn({
          name: "totalvalue",
          join: "item",
          label: "Total Value",
        }),
        search.createColumn({
          name: "formulatext",
          formula:
            "sum/* comment */({fxamount})     OVER(PARTITION BY {item}     ORDER BY {internalid}     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
          label: "cml amount",
        }),
        search.createColumn({
          name: "formulatext",
          formula:
            "sum/* comment */({quantity})     OVER(PARTITION BY {item}     ORDER BY {item}     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
          label: "cml qty",
        }),
        search.createColumn({ name: "type", label: "Type" }),
      ],
    });

    var results = transactionSearchObj.run();
    var range = results.getRange(0, 2);
    var parseData = JSON.parse(JSON.stringify(range));

    return parseData;
  }

  function getOpeningBalanceData(filters) {
    log.debug("getOpeningBalanceData filters", filters);
    var transactionSearchObj = search
      .create({
        type: "transaction",
        filters: filters,
        columns: [
          search.createColumn({
            name: "locationnohierarchy",
            summary: "GROUP",
            label: "Location (no hierarchy)",
          }),
          search.createColumn({
            name: "item",
            summary: "GROUP",
            label: "Item",
          }),
          search.createColumn({
            name: "trandate",
            summary: "MAX",
            label: "Date",
          }),
          search.createColumn({
            name: "quantity",
            summary: "SUM",
            label: "Quantity",
          }),
          search.createColumn({
            name: "debitfxamount",
            summary: "SUM",
            label: "Amount (Debit)",
          }),
          search.createColumn({
            name: "creditfxamount",
            summary: "SUM",
            label: "Amount (Credit)",
          }),
          search.createColumn({
            name: "formulanumeric",
            summary: "SUM",
            formula: "nvl({debitfxamount},0)-nvl({creditfxamount},0)",
            label: "Formula (Numeric)",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(transactionSearchObj);
    //  savedSearchData = cleanOpeningBalance(JSON.parse(JSON.stringify(savedSearchData)))
    //  createDataSetForTemplate(savedSearchData)

    // log.debug("savedSearchData",savedSearchData)

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getInventoryValuationData(filters) {
    log.debug("getInventoryValuationData : filters", filters);

    var transactionSearchObj = search
      .create({
        type: "transaction",
        filters: filters,
        columns: [
          search.createColumn({
            name: "locationnohierarchy",
            label: "Location (no hierarchy)",
          }),
          search.createColumn({ name: "item", label: "Item" }),
          search.createColumn({ name: "trandate", label: "Date" }),
          search.createColumn({ name: "quantity", label: "Quantity" }),
          search.createColumn({ name: "rate", label: "Item Rate" }),
          search.createColumn({ name: "fxamount", label: "Amount" }),
          search.createColumn({ name: "account", label: "Account" }),
          search.createColumn({
            name: "debitfxamount",
            label: "Amount (Debit)",
          }),
          search.createColumn({
            name: "creditfxamount",
            label: "Amount (Credit)",
          }),
          search.createColumn({
            name: "formulatext",
            formula:
              "case when {fxamount}<0 OR {type} ='Invoice' then 'OUT' else 'IN' end",
            label: "Stock",
          }),
          //search.createColumn({name: "itemtotal", label: "Item Total"}),
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({
            name: "internalid",
            join: "item",
            label: "Internal ID",
          }),
          search.createColumn({
            name: "totalvalue",
            join: "item",
            label: "Total Value",
          }),
          search.createColumn({
            name: "formulatext",
            formula:
              "sum/* comment */({fxamount})     OVER(PARTITION BY {item}     ORDER BY {internalid}     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
            label: "cml amount",
          }),
          search.createColumn({
            name: "formulatext",
            formula:
              "sum/* comment */({quantity})     OVER(PARTITION BY {item}     ORDER BY {item}     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
            label: "cml qty",
          }),
          search.createColumn({
            name: "formulatext",
            formula:
              "case when {type} = 'Journal' then NVL({custbody_ps_wht_tax_invoice_no},{tranid}) else {tranid} end",
            label: "document Number",
          }),

          search.createColumn({ name: "type", label: "Type" }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(transactionSearchObj);
    //   savedSearchData   =  cleanInventoryValuationData(JSON.parse(JSON.stringify(savedSearchData)))

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getTaxConfigration() {
    var customrecord_ps_tht_wht_configurationSearchObj = search
      .create({
        type: "customrecord_ps_tht_wht_configuration",
        filters: [["custrecord_ps_wht_ispreferred", "is", "T"]],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name",
          }),
          search.createColumn({ name: "scriptid", label: "Script ID" }),
          search.createColumn({
            name: "custrecord_ps_wht_cert_print_copies",
            label: "Withholding Tax Certificate Print Copies",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_cert_no_format",
            label: "Withholding Tax Certificate No. Format",
          }),
          // search.createColumn({name: "custrecord_wht_enable_pnd2", label: "Enable P.N.D.2"}),
          // search.createColumn({name: "custrecord_wht_enable_pnd1", label: "Enable P.N.D.1"}),
          search.createColumn({
            name: "custrecord_ps_wht_ispreferred",
            label: "Is Preferred",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_enable_pnd54",
            label: "Enable Pnd 54",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_enable_undue_je",
            label: "Enable Auto Create Undue Vat JE",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_international_tax_bndl",
            label: "Is International Tax Bundle",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_suitetax_enabled",
            label: "Is Suite Tax Bundle",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_undue_debit_account",
            label: "Undue Debit Account",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(
      customrecord_ps_tht_wht_configurationSearchObj,
    );

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getAllResults(search) {
    var all = [];
    log.debug("search PAge", search.pageRanges);

    search.pageRanges.forEach(function (pageRange) {
      var this_page = search.fetch({ index: pageRange.index });
      all = all.concat(this_page.data);
    });

    return all;
  }

  function getInvoicesFORVAT(params) {
    let filters = [
      ["type", "anyof", "CustInvc"],
      "AND",
      ["mainline", "is", "F"],
      "AND",
      ["taxline", "is", "F"],
    ];

    if (params.subsidiary) {
      filters.push("AND");
      filters.push(["subsidiary", "anyof", params.subsidiary]);
    }

    if (params.filingStatus) {
      filters.push("AND");
      filters.push([
        "custbody_ps_wht_filing_status",
        "anyof",
        params.filingStatus,
      ]);
    }

    if (params.subsidiaryBranchCode) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", params.subsidiaryBranchCode]);
    }

    if (params.whtTaxPeriod) {
      filters.push("AND");
      filters.push(["postingperiod", "anyof", params.whtTaxPeriod]);
    }

    log.debug("filters", filters);
    var invoiceSearchObj = search
      .create({
        type: "invoice",
        filters: filters,
        columns: [
          search.createColumn({
            name: "custbody_ps_wht_sequence_no",
            label: "PS|THT|Sequence Number",
          }),
          search.createColumn({
            name: "tranid",
            label: "Document Number",
          }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({ name: "trandate", label: "Date" }),
          search.createColumn({
            name: "custentity_ps_wht_vat_registration_no",
            join: "customer",
            label: "PS|THT|Vat Registration No",
          }),
          search.createColumn({ name: "amount", label: "Amount" }),
          search.createColumn({
            name: "taxamount",
            label: "Amount (Tax)",
          }),
          search.createColumn({
            name: "rate",
            join: "taxItem",
            label: "Rate",
          }),
          search.createColumn({
            name: "fxamount",
            label: "Amount (Foreign Currency)",
          }),
          //  search.createColumn({
          //    name: "formulanumeric",
          //    formula:
          //      "case when {taxamount} is NULL then 0  else {taxamount} end",
          //    label: "Formula (Numeric)",
          //  }),
          search.createColumn({
            name: "taxcode",
            label: "Tax Item",
          }),
          search.createColumn({
            name: "formulanumeric",
            formula: "({taxitem.rate}/100)*{fxamount}",
            label: "tax amount",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(invoiceSearchObj);
    //   savedSearchData   =  cleanInventoryValuationData(JSON.parse(JSON.stringify(savedSearchData)))

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getInvoicesForVATSuiteTaxEnabled(params) {
    let filters = [
      ["taxline", "is", "F"],
      "AND",
      ["taxdetail.taxamount", "isnotempty", ""],
      "AND",
      ["type", "anyof", "CustInvc"],
      "AND",
      ["posting", "is", "T"],
    ];

    if (params.subsidiary) {
      filters.push("AND");
      filters.push(["subsidiary", "anyof", params.subsidiary]);
    }
    if (params.filingStatus) {
      filters.push("AND");
      filters.push([
        "custbody_ps_wht_filing_status",
        "anyof",
        params.filingStatus,
      ]);
    }
    if (params.subsidiaryBranchCode) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", params.subsidiaryBranchCode]);
    }

    if (params.whtTaxPeriod) {
      filters.push("AND");
      filters.push(["postingperiod", "anyof", params.whtTaxPeriod]);
    }

    var invoiceSearchObj = search
      .create({
        type: "invoice",
        filters: filters,
        columns: [
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({
            name: "trandate",
            sort: search.Sort.ASC,
            label: "Date",
          }),
          search.createColumn({
            name: "formulacurrency",
            formula:
              "Case When {type} IN ('Credit Memo', 'Credit Note') and {accountingtransaction.fxamount} > 0 Then {accountingtransaction.fxamount}*-1 ELSE {accountingtransaction.fxamount} END",
            label: "Net Amount",
          }),
          search.createColumn({
            name: "taxtype",
            join: "taxDetail",
            label: "Tax Type",
          }),
          search.createColumn({
            name: "taxcode",
            join: "taxDetail",
            label: "Tax Code",
          }),
          search.createColumn({
            name: "taxrate",
            join: "taxDetail",
            label: "Tax Rate",
          }),
          search.createColumn({
            name: "taxfxamount",
            join: "taxDetail",
            label: "Tax Amount",
          }),
          search.createColumn({ name: "nexus", label: "Nexus" }),
          search.createColumn({
            name: "amount",
            join: "accountingTransaction",
            label: "Amount",
          }),
          search.createColumn({
            name: "accounttype",
            join: "accountingTransaction",
            label: "Account Type",
          }),
          search.createColumn({
            name: "accountingbook",
            join: "accountingTransaction",
            label: "Accounting Book",
          }),
          search.createColumn({ name: "netamount", label: "Amount (Net)" }),
          search.createColumn({ name: "mainname", label: "Main Line Name" }),
          search.createColumn({
            name: "companyname",
            join: "customer",
            label: "Company Name",
          }),
          search.createColumn({
            name: "name",
            join: "CUSTBODY_SPS_CUSTOMER_LABEL",
            label: "Name",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(invoiceSearchObj);

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getBillForVATSuiteTaxEnabled(params) {
    log.debug("check 0", "getBillForVATSuiteTaxEnabled");
    let filters = [
      ["taxline", "is", "F"],
      "AND",
      ["taxdetail.taxamount", "isnotempty", ""],
      "AND",
      ["type", "anyof", "VendBill"],
      "AND",
      ["posting", "is", "T"],
    ];

    if (params.subsidiary) {
      filters.push("AND");
      filters.push(["subsidiary", "anyof", params.subsidiary]);
    }
    if (params.filingStatus) {
      filters.push("AND");
      filters.push([
        "custbody_ps_wht_filing_status",
        "anyof",
        params.filingStatus,
      ]);
    }
    if (params.subsidiaryBranchCode) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", params.subsidiaryBranchCode]);
    }

    if (params.whtTaxPeriod) {
      filters.push("AND");
      filters.push(["postingperiod", "anyof", params.whtTaxPeriod]);
    }

    var vendorbillSearchObj = search
      .create({
        type: "vendorbill",
        filters: filters,
        columns: [
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({
            name: "trandate",
            sort: search.Sort.ASC,
            label: "Date",
          }),
          search.createColumn({
            name: "formulacurrency",
            formula:
              "Case When {type} IN ('Credit Memo', 'Credit Note') and {accountingtransaction.fxamount} > 0 Then {accountingtransaction.fxamount}*-1 ELSE {accountingtransaction.fxamount} END",
            label: "Net Amount",
          }),
          search.createColumn({
            name: "taxtype",
            join: "taxDetail",
            label: "Tax Type",
          }),
          search.createColumn({
            name: "taxcode",
            join: "taxDetail",
            label: "Tax Code",
          }),
          search.createColumn({
            name: "taxrate",
            join: "taxDetail",
            label: "Tax Rate",
          }),
          search.createColumn({
            name: "taxfxamount",
            join: "taxDetail",
            label: "Tax Amount",
          }),
          search.createColumn({
            name: "fxamount",
            label: "FX Amount",
          }),
          search.createColumn({ name: "nexus", label: "Nexus" }),
          search.createColumn({
            name: "amount",
            join: "accountingTransaction",
            label: "Amount",
          }),
          search.createColumn({
            name: "accounttype",
            join: "accountingTransaction",
            label: "Account Type",
          }),
          search.createColumn({
            name: "accountingbook",
            join: "accountingTransaction",
            label: "Accounting Book",
          }),
          search.createColumn({ name: "netamount", label: "Amount (Net)" }),
          search.createColumn({ name: "amount", label: "Amount" }),
          search.createColumn({
            name: "companyname",
            join: "customer",
            label: "Company Name",
          }),
          search.createColumn({
            name: "companyname",
            join: "vendor",
            label: "Company Name",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(vendorbillSearchObj);

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getBillForVAT(params) {
    log.debug("check 0", "getBillForVAT");
    let filters = [
      ["type", "anyof", "VendBill"],
      "AND",
      ["mainline", "is", "F"],
      "AND",
      ["taxline", "is", "F"],
    ];

    if (params.subsidiary) {
      filters.push("AND");
      filters.push(["subsidiary", "anyof", params.subsidiary]);
    }
    if (params.filingStatus) {
      filters.push("AND");
      filters.push([
        "custbody_ps_wht_filing_status",
        "anyof",
        params.filingStatus,
      ]);
    }
    if (params.subsidiaryBranchCode) {
      filters.push("AND");
      filters.push(["cseg_subs_branch", "anyof", params.subsidiaryBranchCode]);
    }

    if (params.whtTaxPeriod) {
      filters.push("AND");
      filters.push(["postingperiod", "anyof", params.whtTaxPeriod]);
    }

    log.debug("getBillForVAT: filters", filters);

    var vendorbillSearchObj = search
      .create({
        type: "vendorbill",
        filters: filters,
        columns: [
          search.createColumn({
            name: "custbody_ps_wht_sequence_no",
            label: "PS|THT|Sequence Number",
          }),
          search.createColumn({
            name: "tranid",
            label: "Document Number",
          }),
          search.createColumn({
            name: "entityid",
            join: "vendor",
            label: "Name",
          }),
          search.createColumn({ name: "trandate", label: "Date" }),
          search.createColumn({
            name: "custentity_ps_wht_vat_registration_no",
            join: "customer",
            label: "PS|THT|Vat Registration No",
          }),
          search.createColumn({ name: "amount", label: "Amount" }),
          search.createColumn({
            name: "taxamount",
            label: "Amount (Tax)",
          }),
          search.createColumn({
            name: "rate",
            join: "taxItem",
            label: "Rate",
          }),
          search.createColumn({
            name: "fxamount",
            label: "Amount (Foreign Currency)",
          }),
          //  search.createColumn({name: "taxfxamount", label: "Tax Amount (Foreign Currency)"}),
          search.createColumn({ name: "taxcode", label: "Tax Item" }),
          search.createColumn({
            name: "formulanumeric",
            formula: "({taxitem.rate}/100)*{fxamount}",
            label: "tax amount",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(vendorbillSearchObj);
    //   savedSearchData   =  cleanInventoryValuationData(JSON.parse(JSON.stringify(savedSearchData)))

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getInputVatSavedSearchData(filters, undueAccountName) {
    var transactionSearchObj = search
      .create({
        type: "transaction",
        filters: filters,
        columns: [
          search.createColumn({
            name: "trandate",
            summary: "GROUP",
            label: "Date",
          }),
          search.createColumn({
            name: "transactionnumber",
            summary: "GROUP",
            label: "Transaction Number",
          }),
          search.createColumn({
            name: "trandate",
            summary: "GROUP",
            label: "Date",
          }),
          search.createColumn({
            name: "tranid",
            summary: "GROUP",
            label: "Document Number",
          }),
          search.createColumn({
            name: "type",
            summary: "GROUP",
            label: "Type",
          }),
          search.createColumn({
            name: "entity",
            summary: "GROUP",
            label: "Name",
          }),
          search.createColumn({
            name: "custentity_ps_wht_vat_registration_no",
            summary: "GROUP",
            join: "vendor",
            label: "PS|THT|Vat Registration No",
          }),
          search.createColumn({
            name: "amount",
            summary: "SUM",
            label: "Amount",
          }),
          search.createColumn({
            name: "fxamount",
            summary: "SUM",
            label: "Amount",
          }),
          search.createColumn({
            name: "taxamount",
            summary: "SUM",
            label: "Amount (Tax)",
          }),
          search.createColumn({
            name: "entityid",
            join: "vendor",
            summary: "GROUP",
            label: "Name",
          }),
          search.createColumn({
            name: "custentity_ps_wht_entity_branch",
            join: "vendor",
            summary: "GROUP",
            label: "Name",
          }),
          search.createColumn({
            name: "custentity_ps_wht_entity_branch",
            join: "customer",
            summary: "GROUP",
            label: "Name",
          }),
          search.createColumn({
            name: "altname",
            join: "customer",
            summary: "GROUP",
            label: "Name",
          }),
          search.createColumn({
            name: "custbody_ps_wht_memo",
            summary: "GROUP",
            label: "wht Memo",
          }),
          search.createColumn({
            name: "custentity_ps_wht_vat_registration_no",
            summary: "GROUP",
            join: "customer",
            label: "PS|THT|Vat Registration No",
          }),
          search.createColumn({
            name: "formulanumeric",
            summary: "SUM",
            formula: "({taxitem.rate}/100)*{fxamount}",
            label: "tax amount",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "NVL(NVL({vendor.custentity_ps_wht_entity_branch}, {customer.custentity_ps_wht_entity_branch}), 'สำนักงานใหญ่')",
            label: "Entity Brnach",
          }),

          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "NVL(NVL({customer.altname},{vendor.altname}),{custbody_ps_wht_vendor.altname})",
          }),

          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "NVL(NVL({vendor.custentity_ps_wht_entity_branch}, {customer.custentity_ps_wht_entity_branch}), 'สำนักงานใหญ่')",
            label: "Entity Brnach",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "case when {type}='Journal' then (case when {account}='" +
              undueAccountName +
              "' then 'JE undue account' else 'none' end ) else 'ff' end",
            label: "Formula (Text)",
          }),

          search.createColumn({
            name: "formulanumeric",
            summary: "SUM",
            formula:
              "case when {type}='Journal' then {custbody_ps_wht_total_bill_amt_bef_vat} else {fxamount} end  ",
            label: "Formula (Numeric)",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "case when {type} = 'Journal' then NVL({custbody_ps_wht_tax_invoice_no},{tranid}) else {tranid} end",
            label: "Formula (Text)",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(transactionSearchObj);

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getInputVATSavedSearchDataForSuiteTaxEnabled(
    filters,
    undueAccountName,
  ) {
    var transactionSearchObj = search
      .create({
        type: "transaction",
        filters: filters,
        columns: [
          search.createColumn({
            name: "cseg_subs_branch",
            summary: "GROUP",
            label: "PS|WHT|Subsidiary Branch",
          }),
          search.createColumn({
            name: "internalid",
            summary: "GROUP",
            label: "internalid",
          }),
          search.createColumn({
            name: "tranid",
            summary: "GROUP",
            label: "Document Number",
          }),
          search.createColumn({
            name: "entity",
            summary: "GROUP",
            label: "Name",
          }),
          search.createColumn({
            name: "trandate",
            summary: "GROUP",
            sort: search.Sort.ASC,
            label: "Date",
          }),
          search.createColumn({
            name: "formulacurrency",
            summary: "SUM",
            formula:
              "Case When {type} IN ('Credit Memo', 'Credit Note') and {accountingtransaction.fxamount} > 0 Then {accountingtransaction.fxamount}*-1 ELSE {accountingtransaction.fxamount} END",
            label: "Formula (Currency)",
          }),
          search.createColumn({
            name: "taxfxamount",
            join: "taxDetail",
            summary: "SUM",
            label: "Tax Amount (Foreign Currency)",
          }),
          search.createColumn({
            name: "companyname",
            join: "vendor",
            summary: "GROUP",
            label: "Company Name",
          }),
          search.createColumn({
            name: "custentity_ps_wht_entity_branch",
            join: "vendor",
            summary: "GROUP",
            label: "entityId",
          }),
          search.createColumn({
            name: "type",
            summary: "GROUP",
            label: "Type",
          }),
          search.createColumn({
            name: "amount",
            summary: "SUM",
            label: "Amount",
          }),
          search.createColumn({
            name: "fxamount",
            summary: "SUM",
            label: "Amount",
          }),
          search.createColumn({
            name: "custentity_ps_wht_vat_registration_no",
            join: "vendor",
            summary: "GROUP",
            label: "PS|THT|Vat Registration No",
          }),
          search.createColumn({
            name: "transactionnumber",
            summary: "GROUP",
            label: "Transaction Number",
          }),
          search.createColumn({
            name: "taxcode",
            join: "taxDetail",
            summary: "GROUP",
            label: "Tax Code",
          }),

          search.createColumn({
            name: "custbody_ps_wht_memo",
            summary: "GROUP",
            label: "wht Memo",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "NVL(NVL({customer.altname},{vendor.altname}),{custbody_ps_wht_vendor.altname})",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "NVL(NVL({vendor.custentity_ps_wht_entity_branch}, {customer.custentity_ps_wht_entity_branch}), 'สำนักงานใหญ่')",
            label: "Entity Brnach",
          }),
          search.createColumn({
            name: "taxrate",
            summary: "GROUP",
            join: "taxdetail",
          }),

          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "case when {type}='Journal' then (case when {account}='" +
              undueAccountName +
              "' then 'JE undue account' else 'none' end ) else 'ff' end",
            label: "Formula (Text)",
          }),

          search.createColumn({
            name: "formulanumeric",
            summary: "SUM",
            formula:
              "case when {type}='Journal' then {custbody_ps_wht_total_bill_amt_bef_vat} else {fxamount} end  ",
            label: "Formula (Numeric)",
          }),

          search.createColumn({
            name: "formulanumeric",
            summary: "SUM",
            formula:
              "case when {type}='Journal' then {fxamount} else {taxDetail.taxfxamount} end  ",
            label: "Formula (Numeric)",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "case when {type} = 'Journal' then NVL({custbody_ps_wht_tax_invoice_no},{tranid}) else {tranid} end",
            label: "Formula (Text)",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(transactionSearchObj);

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  function getAllThaiTaxCodes() {
    var customrecord_ps_tht_wht_tax_codeSearchObj = search
      .create({
        type: "customrecord_ps_tht_wht_tax_code",
        filters: [],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_taxcode_ap_item",
            label: "AP Item",
          }),
          search.createColumn({
            name: "custrecord_ps_wht_taxcode_ar_item",
            label: "AR Item",
          }),
        ],
      })
      .runPaged({ pageSize: 1000 });

    let savedSearchData = getAllResults(transactionSearchObj);

    return JSON.parse(JSON.stringify(savedSearchData));
  }

  // function getTaxConfigration()
  // {

  //     var customrecord_ps_tht_wht_configurationSearchObj = search.create({
  //     type: "customrecord_ps_tht_wht_configuration",
  //     filters:
  //     [
  //         ["custrecord_ps_wht_ispreferred","is","T"]
  //     ],
  //     columns:
  //     [
  //         search.createColumn({
  //             name: "name",
  //             sort: search.Sort.ASC,
  //             label: "Name"
  //         }),
  //         search.createColumn({name: "scriptid", label: "Script ID"}),
  //         search.createColumn({name: "custrecord_ps_wht_cert_print_copies", label: "Withholding Tax Certificate Print Copies"}),
  //         search.createColumn({name: "custrecord_ps_wht_cert_no_format", label: "Withholding Tax Certificate No. Format"}),
  //        // search.createColumn({name: "custrecord_wht_enable_pnd2", label: "Enable P.N.D.2"}),
  //        // search.createColumn({name: "custrecord_wht_enable_pnd1", label: "Enable P.N.D.1"}),
  //         search.createColumn({name: "custrecord_ps_wht_ispreferred", label: "Is Preferred"}),
  //         search.createColumn({name: "custrecord_ps_wht_enable_pnd54", label: "Enable Pnd 54"}),
  //         search.createColumn({name: "custrecord_ps_wht_enable_undue_je", label: "Enable Auto Create Undue Vat JE"}),
  //         search.createColumn({name: "custrecord_ps_wht_international_tax_bndl", label: "Is International Tax Bundle"}),
  //         search.createColumn({name: "custrecord_ps_wht_suitetax_enabled", label: "Is Suite Tax Bundle"})
  //     ]
  //     }).runPaged({pageSize : 1000})

  //     let savedSearchData  =  getAllResults(customrecord_ps_tht_wht_configurationSearchObj)

  //    return  JSON.parse(JSON.stringify(savedSearchData))

  // }

  return {
    getBillDataFromSavedSearch: getBillDataFromSavedSearch,
    getpnd3AttachmentData: getpnd3AttachmentData,
    pnd3Total: pnd3Total,
    loadCountTaxCode: loadCountTaxCode,
    getBillPaymentDataForBillData: getBillPaymentDataForBillData,
    countVendorForPNDCover: countVendorForPNDCover,
    getOpeningBalanceData: getOpeningBalanceData,
    getInventoryValuationData: getInventoryValuationData,
    getInventoryValuationDataForAvailbleData:
      getInventoryValuationDataForAvailbleData,
    getInvoicesFORVAT: getInvoicesFORVAT,
    getBillForVAT: getBillForVAT,
    getInputVatSavedSearchData: getInputVatSavedSearchData,
    getTaxConfigration: getTaxConfigration,
    getInvoicesForVATSuiteTaxEnabled: getInvoicesForVATSuiteTaxEnabled,
    getBillForVATSuiteTaxEnabled: getBillForVATSuiteTaxEnabled,
    getInputVATSavedSearchDataForSuiteTaxEnabled:
      getInputVATSavedSearchDataForSuiteTaxEnabled,
    getAccountingPeriodMonth: getAccountingPeriodMonth,
  };
});

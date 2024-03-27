/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
  "N/ui/serverWidget",
  "N/search",
  "N/record",
  "N/task",
  "N/runtime",
], function (ui, search, record, nstask, runtime) {
  function onRequest(context) {
    try {
      let request = context.request;
      let response = context.response;
      let params = request.parameters;

      if (request.method === "GET") {
        log.debug("GET params", params);
        getHandler(request, response, params, context.request);
      } else {
        postHandler(request, response, params);
      }
    } catch (e) {
      log.error("Error::onRequest", e);
      response.writeLine({
        output: "Error: " + e.name + " , Details: " + e.message,
      });
    }
  }

  function getHandler(request, response, params, context) {
    log.debug("check log", params);

    // Check if the account is OneWorld and Multi-Book
    var isOneWorld = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
    var isMultiBook = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });

    // isOneWorld = false
    log.debug("isOneWorld", isOneWorld);
    log.debug("isMultiBook", isMultiBook);

    let form = ui.createForm({
      title: "Withholding Income Tax Return",
    });
    form.clientScriptModulePath = "./ps_wht_th_suitelets_cs.js";
    form.addButton({
      id: "custpage_cover_page",
      label: "Cover Page (PDF)",
      functionName: `printPdf('coverpage')`,
    });

    form.addButton({
      id: "custpage_attachment",
      label: "Attachment (PDF)",
      functionName: `printPdf('attachment')`,
    });

    form.addButton({
      id: "custpage_efilling",
      label: "e-Filing (Text)",
      functionName: `downloadEFile()`,
    });

    form.addFieldGroup({
      id: "custpage_wht_income_tax_return",
      label: "Withholding Income Tax Return",
    });

    form.addFieldGroup({
      id: "custpage_criteria",
      label: "Criteria",
    });

    form.addFieldGroup({
      id: "custpage_cover_page",
      label: "Cover Page",
    });

    form.addFieldGroup({
      id: "custpage_attachment",
      label: "Attachment",
    });

    form.addFieldGroup({
      id: "custpage_information",
      label: "Information",
    });

    log.debug("check log", params);

    let categoryField = form.addField({
      id: "custpage_pnd_category_fld",
      type: ui.FieldType.SELECT,
      label: "P.N.D Category",
      container: "custpage_wht_income_tax_return",
      // source: 'customrecord_ps_tht_wht_category'
    });

    let categoryList = getRecordsList("customrecord_ps_tht_wht_category");

    categoryField.addSelectOption({ value: "", text: "" });

    categoryList.map(function (option) {
      let catName = option.name;

      catName = catName.replace(/[^a-zA-Z0-9]/g, "");
      catName = catName.replace(/\s/g, "");
      catName = catName.toLowerCase();
      if (catName == "pnd54") {
        return;
      }
      if (catName == "pnd1") {
        return;
      }
      categoryField.addSelectOption({
        value: option.id,
        text: option.name,
      });
    });

    if (isOneWorld) {
      let subsidiaryFld = form.addField({
        id: "custpage_subsidiary_fld",
        type: ui.FieldType.SELECT,
        label: "Subsidiary",
        container: "custpage_criteria",
      });

      let subsidiaryList = getRecordsList("subsidiary");
      subsidiaryFld.addSelectOption({
        value: "",
        text: "",
      });

      subsidiaryList.map(function (option) {
        subsidiaryFld.addSelectOption({
          value: option.id,
          text: option.name,
        });
      });

      let subsidiaryBranchFld = form.addField({
        id: "custpage_subs_branch_fld",
        type: ui.FieldType.SELECT,
        label: "Subsidiary Branch",
        container: "custpage_criteria",
      });

      let subsidiaryBranchList = getSubsidaryBranch(isNull(params.subsidiary));

      log.debug("subsidiaryBranchList", subsidiaryBranchList);

      subsidiaryBranchFld.addSelectOption({
        value: "",
        text: "",
      });
      if (subsidiaryBranchList) {
        subsidiaryBranchList.map(function (option) {
          subsidiaryBranchFld.addSelectOption({
            value: option.id,
            text: option.name,
          });
        });
      }

      subsidiaryFld.defaultValue = isNull(params.subsidiary);

      subsidiaryBranchFld.defaultValue = isNull(params.subsidiaryBranch);
    }

    if (isMultiBook) {
      let accountingBookFld = form.addField({
        id: "custpage_wht_acc_book_fld",
        type: ui.FieldType.SELECT,
        label: "Accounting Book",
        container: "custpage_criteria",
      });

      let accountingBookList = getRecordsList("accountingbook");

      accountingBookFld.addSelectOption({
        value: "",
        text: "",
      });
      accountingBookList.map(function (option) {
        accountingBookFld.addSelectOption({
          value: option.id,
          text: option.name,
        });
      });

      accountingBookFld.defaultValue = isNull(params.whtAccountingBook);
    }

    let whtPeriodFld = form.addField({
      id: "custpage_wht_period_fld",
      type: ui.FieldType.SELECT,
      label: "WHT Period",
      container: "custpage_criteria",
      source: "accountingperiod",
    });

    let whtFilingStatusFld = form.addField({
      id: "custpage_wht_filing_status_fld",
      type: ui.FieldType.SELECT,
      label: "WHT Filing Status",
      container: "custpage_criteria",
    });

    let filingStatusList = getRecordsList(
      "customrecord_ps_tht_wht_filing_status",
    );
    whtFilingStatusFld.addSelectOption({
      value: "",
      text: "",
    });
    filingStatusList.map(function (option) {
      whtFilingStatusFld.addSelectOption({
        value: option.id,
        text: option.name,
      });
    });

    let whtFilingTypeArray = [
      { id: "", name: "" },
      { id: "whtFilingType1", name: "(1) มาตรา 3 เตรส" },
      { id: "whtFilingType2", name: "(2) มาตรา 48 ทวิ/ 65 จัตวา" },
      { id: "whtFilingType3", name: "(3) มาตรา 50 (3) (4) (5)/  69 ทวิ " },
    ];

    let whtFilingTypeField = form.addField({
      id: "custpage_wht_filing_type_fld",
      type: ui.FieldType.SELECT,
      label: "WHT Filing Type",
      container: "custpage_criteria",
    });
    whtFilingTypeArray.map(function (option) {
      log.debug("options", option);
      whtFilingTypeField.addSelectOption({
        value: option.id,
        text: option.name,
      });
    });

    let surchargeFld = form.addField({
      id: "custpage_wht_surcharge_fld",
      type: ui.FieldType.TEXT,
      label: "Surcharge",
      container: "custpage_cover_page",
    });

    surchargeFld.updateDisplayType({
      displayType: ui.FieldDisplayType.HIDDEN,
    });

    let totalAttachmentPage = form.addField({
      id: "custpage_total_attch_fld",
      type: ui.FieldType.TEXT,
      label: "Total Attachment Page",
      container: "custpage_cover_page",
    });

    totalAttachmentPage.updateDisplayType({
      displayType: ui.FieldDisplayType.HIDDEN,
    });

    let informationFld = form.addField({
      id: "custpage_information_fld",
      type: ui.FieldType.INLINEHTML,
      label: "Information",
      container: "custpage_information",
    });

    categoryField.defaultValue = isNull(params.pndCategory);

    whtFilingStatusFld.defaultValue = isNull(params.whtFilingStatus);

    surchargeFld.defaultValue = isNull(params.surcharge);
    whtPeriodFld.defaultValue = isNull(params.whtTaxPeriod);

    informationFld.defaultValue =
      "<p>e-filing program, manual and troubleshooting</p>";

    response.writePage(form);
  }

  function postHandler(request, response) {}

  function getRecordsList(type) {
    try {
      let customrecord_ps_tht_wht_categorySearchObj = search.create({
        type: type,
        filters: [],
        columns: ["internalid", "name"],
      });
      let reportResults = customrecord_ps_tht_wht_categorySearchObj
        .run()
        .getRange({
          start: 0,
          end: 1000,
        });

      let internalId;
      let name;
      let data = [];

      log.debug("reportResults: " + type, reportResults);

      for (let i in reportResults) {
        internalId = reportResults[i].getValue("internalid");
        name = reportResults[i].getValue("name");
        data.push({ id: internalId, name: name });
      }

      log.debug("data: ", data);

      return data;
    } catch (e) {
      log.debug("error: ", e.message);
      return [{ id: "", name: "" }];
    }
  }

  function getRecordsListAccountingPeriod(type) {
    try {
      let customrecord_ps_tht_wht_categorySearchObj = search.create({
        type: type,
        filters: [],
        columns: ["internalid", "periodname"],
      });
      let reportResults = customrecord_ps_tht_wht_categorySearchObj
        .run()
        .getRange({
          start: 0,
          end: 1000,
        });

      let internalId;
      let name;
      let data = [];

      log.debug("reportResults: " + type, reportResults);

      for (let i in reportResults) {
        internalId = reportResults[i].getValue("internalid");
        name = reportResults[i].getValue("periodname");
        data.push({ id: internalId, name: name });
      }

      log.debug("data: ", data);

      return data;
    } catch (e) {
      log.debug("error: ", e.message);
      return [{ id: "", name: "" }];
    }
  }

  function getSubsidaryBranch(subsidiary) {
    log.debug("subsidiary in function", subsidiary);
    if (!subsidiary) {
      return;
    }

    let customrecord_cseg_subs_branchSearchObj = search.create({
      type: "customrecord_cseg_subs_branch",
      filters: [
        ["custrecord_ps_wht_subs_brn_filterby_subs", "anyof", subsidiary],
      ],
      columns: [
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
          label: "Name",
        }),
        search.createColumn({
          name: "internalid",
          label: "Internal Id",
        }),
      ],
    });

    let reportResults = customrecord_cseg_subs_branchSearchObj.run().getRange({
      start: 0,
      end: 1000,
    });

    let internalId;
    let name;
    let data = [];

    for (let i in reportResults) {
      internalId = reportResults[i].getValue("internalid");
      name = reportResults[i].getValue("name");
      data.push({ id: internalId, name: name });
    }

    log.debug("data: ", data);

    return data;
  }

  function isNull(value) {
    if (
      value != null &&
      value != "null" &&
      value != "" &&
      value != undefined &&
      value != "undefined" &&
      value != "NaN" &&
      value != " "
    )
      return value;
    else return "";
  }

  return {
    onRequest: onRequest,
  };
});

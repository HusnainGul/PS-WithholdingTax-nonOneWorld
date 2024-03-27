/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
  "N/ui/serverWidget",
  "N/search",
  "N/record",
  "N/task",
  "N/render",
  "N/file",
  "N/runtime",
  "./lib/moment",
  "./lib/data_search_lib",
  "./lib/constants_lib",
  "./lib/template_helper_lib",
  "N/config",
], function (
  ui,
  search,
  record,
  nstask,
  render,
  file,
  runtime,
  moment,
  search_lib,
  constant_lib,
  helper_lib,
  config,
) {
  function onRequest(context) {
    try {
      var request = context.request;
      var response = context.response;
      var params = request.parameters;

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
    let isOneWorld = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
    let isMultiBook = runtime.isFeatureInEffect({ feature: "MULTIBOOK" });
    log.debug("isOneWorld", isOneWorld);

    if (params.action == "show_form" || !params.action) {
      let form = ui.createForm({
        title: "Inventory Valuation Report",
      });
      let subsidiaryFld;
      let subsidiaryBranchFld;

      form.clientScriptModulePath = "./ps_wht_th_inventory_valuation_cs.js";
      form.addButton({
        id: "custpage_print_report",
        label: "Print",
        functionName: `printPdf('coverpage')`,
      });

      form.addFieldGroup({
        id: "custpage_criteria",
        label: "Criteria",
      });

      if (isOneWorld) {
        subsidiaryFld = form.addField({
          id: "custpage_subsidiary_fld",
          type: ui.FieldType.SELECT,
          label: "Subsidiary",
          container: "custpage_criteria",
          source: "subsidiary",
        });
        subsidiaryFld.isMandatory = true;

        subsidiaryBranchFld = form.addField({
          id: "custpage_subs_branch_fld",
          type: ui.FieldType.SELECT,
          label: "Subsidiary Branch",
          container: "custpage_criteria",
        });
        subsidiaryBranchFld.isMandatory = true;
      }

      let fromDate = form.addField({
        id: "custpage_from_date_fld",
        type: ui.FieldType.DATE,
        label: "From Date",
      });

      let toDate = form.addField({
        id: "custpage_to_date_fld",
        type: ui.FieldType.DATE,
        label: "To Date",
      });

      let itemTo = form.addField({
        id: "custpage_item_to_fld",
        type: ui.FieldType.SELECT,
        label: "Item",
        container: "custpage_criteria",
        source: "item",
      });

      let subsidiaryBranchList = getSubsidaryBranch(
        helper_lib.isNull(params.subsidiary),
      );

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

      log.debug("location", params.locations);
      if (params.locations) {
        let location = params.locations;
        log.debug("location", location);
        location.defaultValue = location;
      }

      subsidiaryFld.defaultValue = helper_lib.isNull(params.subsidiary);
      // subsidiaryBranchFld.defaultValue = helper_lib.isNull(params.subsidiaryBranch);

      // itemFrom.defaultValue = helper_lib.isNull(params.itemFrom);
      itemTo.defaultValue = helper_lib.isNull(params.itemTo);

      if (params.toDate || params.fromDate) {
        toDate.defaultValue = helper_lib.isNull(params.toDate);
        fromDate.defaultValue = helper_lib.isNull(params.fromDate);
      }

      response.writePage(form);
    } else if (params.action == "print_report") {
      log.debug("check log on print", params);
      let fromDate = params.fromDate;
      let toDate = params.toDate;
      let subsidiaryBranch = params.subsidiaryBranch;
      let subsidiary = params.subsidiary;
      let location = params.location;
      let itemFrom = params.itemTo;
      let getSubsidaryBranchParent;

      log.debug("check date", helper_lib.convertDateFormatToMMDDYYYY(toDate));
      let parsedDate = new Date(helper_lib.convertDateFormatToMMDDYYYY(toDate));
      let monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      let month = monthNames[parsedDate.getMonth()];
      let year = parsedDate.getFullYear();
      let day = parsedDate.getDate();

      if (subsidiaryBranch) {
        getSubsidaryBranchParent = search.lookupFields({
          type: "customrecord_cseg_subs_branch",
          id: subsidiaryBranch,
          columns: ["parent", "custrecord_ps_wht_subs_branch_code", "name"],
        });
      }

      log.debug("getSubsidaryBranchParent", getSubsidaryBranchParent);

      let savedSearchFilters = getSavedSearchFilterArray(
        fromDate,
        toDate,
        subsidiaryBranch,
        subsidiary,
        location,
        itemFrom,
      );
      let inventoryValationSavedSearchResult =
        search_lib.getInventoryValuationData(savedSearchFilters);

      log.debug(
        "inventoryValationSavedSearchResult",
        inventoryValationSavedSearchResult,
      );
      log.debug("removeTran", removeTranDateObject(savedSearchFilters));

      let openingBalanceFilters = removeTranDateObject(savedSearchFilters);

      openingBalanceFilters.push({
        name: "trandate",
        operator: "before",
        values: [fromDate],
        isor: false,
        isnot: false,
        leftparens: 0,
        rightparens: 0,
      });

      log.debug("removeTran", openingBalanceFilters);

      let openingBalanceSavedSearchResult = search_lib.getOpeningBalanceData(
        openingBalanceFilters,
      );

      log.debug(
        "openingBalanceSavedSearchResult",
        openingBalanceSavedSearchResult,
      );
      let mergeDataSet = helper_lib.mergeBothSavedSearchData(
        helper_lib.cleanInventoryValuationData(
          inventoryValationSavedSearchResult,
        ),
        helper_lib.cleanOpeningBalanceData(openingBalanceSavedSearchResult),
      );
      //  log.debug("mergeDataSet",mergeDataSet)

      let templateDataSet =
        helper_lib.createDataSetForInventoryValuationReport(mergeDataSet);

      templateDataSet = helper_lib.splitTransactionDetailIfMoreThen20(
        templateDataSet,
        17,
      );

      let finalDataSet = {};
      finalDataSet["templateDataSet"] = templateDataSet;

      if (getSubsidaryBranchParent) {
        finalDataSet["hq"] = false;
        finalDataSet["branch"] = true;
        finalDataSet["branchCode"] =
          getSubsidaryBranchParent["custrecord_ps_wht_subs_branch_code"];
      } else {
        finalDataSet["hq"] = true;
        finalDataSet["branch"] = false;
      }

      finalDataSet["monthInThai"] = helper_lib.convertToThaiMonthName(
        month.toUpperCase(),
      );
      finalDataSet["year"] = year;
      finalDataSet["day"] = day;
      finalDataSet["companyName"] = config
        .load({ type: config.Type.COMPANY_INFORMATION })
        .getValue({ fieldId: "companyname" });
      finalDataSet["branchName"] = getSubsidaryBranchParent
        ? getSubsidaryBranchParent.name
        : "";
      log.debug("monthInThai", finalDataSet["monthInThai"]);
      log.debug("companyname", finalDataSet["companyName"]);
      // log.debug("templateDataSet",templateDataSet)

      log.debug("branchName", finalDataSet["branchName"]);
      let fileURL = constant_lib.printTypes["inventoryValuationReport"];
      renderPDFLayout = renderHtmlContent(fileURL, finalDataSet);

      response.renderPdf(renderPDFLayout);
    }
  }

  function postHandler(request, response, params, context) {
    log.debug("post param", params);

    suiteletParams = JSON.parse(params.suiteletPayLoad);
    let fromDate = suiteletParams.fromDate;
    let toDate = suiteletParams.toDate;
    let subsidiaryBranch = suiteletParams.subsidiaryBranch;
    let subsidiary = suiteletParams.subsidiary;
    let location = suiteletParams.location;
    let itemFrom = suiteletParams.itemTo; //remove itemFrom

    let savedSearchFilters = getSavedSearchFilterArray(
      fromDate,
      toDate,
      subsidiaryBranch,
      subsidiary,
      location,
      itemFrom,
    );

    log.debug("savedSearchFilters", savedSearchFilters);

    let inventoryValationSavedSearchResult =
      search_lib.getInventoryValuationDataForAvailbleData(savedSearchFilters);

    log.debug("savedSearchFilters", inventoryValationSavedSearchResult);

    response.write(JSON.stringify(inventoryValationSavedSearchResult));
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

  function renderHtmlContent(link, dataSource) {
    let fontsObj = helper_lib.getFontsURL();
    dataSource["fonts"] = fontsObj;
    let pageRenderer = render.create(); //pageRenderer will combine datasource and template

    let templateFile = file.load({
      id: link,
    });
    pageRenderer.templateContent = templateFile.getContents(); // template is set

    pageRenderer.addCustomDataSource({
      //datasource is set now the template is going to recognize the ds object
      format: render.DataSource.OBJECT,
      alias: "ds",
      data: dataSource,
    });

    let renderedPage = pageRenderer.renderAsString();

    return renderedPage;
  }

  function getSavedSearchFilterArray(
    fromDate,
    toDate,
    subsidiaryBranch,
    subsidiary,
    location,
    itemFrom,
  ) {
    var objSearch = search.load({
      id: "customsearch_ps_wht_inv_valuation_search",
    });
    var defaultFilters = objSearch.filters;

    log.debug("default Filters", defaultFilters);

    let customSavedSearchFilters = [];

    // let customSavedSearchFilters = [
    //         ["posting","is","T"],
    //         "AND",
    //         ["item.type","anyof","InvtPart"],
    //         "AND",
    //         ["account.specialaccounttype","anyof","InvtAsset"],

    //     ]

    if (fromDate && toDate) {
      defaultFilters.push({
        name: "trandate",
        operator: "within",
        values: [fromDate, toDate],
        isor: false,
        isnot: false,
        leftparens: 0,
        rightparens: 0,
      });
      // customSavedSearchFilters.push("AND");
      // customSavedSearchFilters.push([["trandate","within",fromDate,toDate]])
    }
    //     if(location)
    //     {
    //          defaultFilters.push({
    //            name: "location",
    //            operator: "anyof",
    //            values: [location],
    //            isor: false,
    //            isnot: false,
    //            leftparens: 0,
    //            rightparens: 0,
    //          });
    //         //customSavedSearchFilters.push("AND");
    //        // customSavedSearchFilters.push([["location","anyof",location]])

    //     }
    if (subsidiary) {
      defaultFilters.push({
        name: "subsidiary",
        operator: "anyof",
        values: [subsidiary],
        isor: false,
        isnot: false,
        leftparens: 0,
        rightparens: 0,
      });

      //  customSavedSearchFilters.push("AND");
      //  customSavedSearchFilters.push([["subsidiary","anyof",subsidiary]])
    }
    if (subsidiaryBranch) {
      defaultFilters.push({
        name: "cseg_subs_branch",
        operator: "anyof",
        values: [subsidiaryBranch],
        isor: false,
        isnot: false,
        leftparens: 0,
        rightparens: 0,
      });

      //  customSavedSearchFilters.push("AND");
      //  customSavedSearchFilters.push([["cseg_subs_branch","anyof",subsidiaryBranch]])
    }

    //   if ((itemFrom) && (itemFrom>0))
    //     {
    //          customSavedSearchFilters.push("AND");
    //         customSavedSearchFilters.push([["item","anyof",itemFrom]])

    //     }
    //    // defaultFilters.push(customSavedSearchFilters);

    //     log.debug("check final filters", defaultFilters);
    return defaultFilters;
  }
  function removeTranDateObject(data) {
    const modifiedData = data.filter((item) => item.name !== "trandate");
    return modifiedData;
  }

  return {
    onRequest: onRequest,
  };
});

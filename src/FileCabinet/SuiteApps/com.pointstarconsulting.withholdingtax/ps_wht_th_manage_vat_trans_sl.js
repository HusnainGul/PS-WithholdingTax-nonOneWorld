/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/task', 'N/runtime', 'N/url', 'N/format'],
    function(ui, search, record, nstask, runtime, url, format) {

        // let undueTaxCodeId = '28' //DEV
        let undueTaxCodeId =  '1325027' // JK

        function onRequest(context) {

            let request = context.request;
            let response = context.response;
            let params = request.parameters;
      
            try {

                if (request.method === 'GET') {
                    log.debug('GET params', params);
                    getHandler(request, response, params, context.request);
                } else {
                    postHandler(request, response, params);
                }
            } catch (e) {
                log.error('Error::onRequest', e);
                response.writeLine({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
            }

        }

        function getHandler(request, response, params, context) {

            var hasDateParams = (!!params.fromdate && !!params.todate)
            var setDefaultDate = params.setdefaultdate || 'T'
            let url = request.url;
            let param = request.parameters;
            
            log.debug("script id : ",param.script)

            // Check if the account is OneWorld and Multi-Book
            var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
            var isMultiBook = runtime.isFeatureInEffect({ feature: 'MULTIBOOK' });

            log.debug("isOneWorld", isOneWorld);
            log.debug("isMultiBook", isMultiBook);

            let form = ui.createForm({
                title: 'Manage VAT Transaction'
            });
            form.clientScriptModulePath = './ps_wht_th_suitelets_vat_n_wht_cs.js'; 
            form.addButton({
                id: 'custpage_btn_refresh',
                label: 'Search',
                functionName: `populateSublistOnClick()`
            });

        

            form.addFieldGroup({
                id: 'custpage_criteria',
                label: 'Search Criteria'
            });


            form.addFieldGroup({
                id: 'custpage_transaction',
                label: 'Transaction'
            });


        
                let accountingBookFld = form.addField({
                    id: 'custpage_wht_acc_book_fld',
                    type: ui.FieldType.SELECT,
                    label: 'Accounting Book',
                    container: 'custpage_criteria'
                });

                let accountingBookList = getRecordsList('accountingbook');

                accountingBookFld.addSelectOption({
                    value: "",
                    text: ""
                });
                accountingBookList.map(function(option) {
                    accountingBookFld.addSelectOption({
                        value: option.id,
                        text: option.name
                    });
                })


                accountingBookFld.defaultValue = isNull(params.whtAccountingBook);


            let whtPeriodFld = form.addField({
                id: 'custpage_wht_period_fld',
                type: ui.FieldType.SELECT,
                label: 'WHT Period',
                container: 'custpage_criteria',
                source: 'accountingperiod'
            });

            whtPeriodFld.isMandatory = true;

            let whtFilingStatusFld = form.addField({
                id: 'custpage_wht_filing_status_fld',
                type: ui.FieldType.SELECT,
                label: 'Tax Filing Status',
                container: 'custpage_criteria',

            });

            let filingStatusList = getRecordsList('customrecord_ps_tht_wht_filing_status');
            whtFilingStatusFld.addSelectOption({
                value: "",
                text: ""
            });
            filingStatusList.map(function(option) {
                whtFilingStatusFld.addSelectOption({
                    value: option.id,
                    text: option.name
                });
            })

            

            // let certNoFrom = form.addField({
            //     id: 'custpage_certno_from',
            //     type: ui.FieldType.TEXT,
            //     label: 'WHT CERTIFICATE NO. FROM',
            //     container: 'custpage_criteria'
            // });

            // let certNoTo = form.addField({
            //     id: 'custpage_certno_to',
            //     type: ui.FieldType.TEXT,
            //     label: 'WHT CERTIFICATE NO. TO',
            //     container: 'custpage_criteria'
            // });


            let dateFrom = form.addField({
                id: 'custpage_total_date_from',
               type: ui.FieldType.DATE,
                label: 'WHT DATE FROM',
                container: 'custpage_criteria'
            });

            let dateTo = form.addField({
                id: 'custpage_total_date_to',
               type: ui.FieldType.DATE,
                label: 'WHT DATE TO',
                container: 'custpage_criteria'
            });


            form.addSubtab({ id: 'custpage_tab', label: 'Transactions' });
            
    
            //adding sublist
            var sublist = form.addSublist({
                id: 'custpage_results',
                label: 'Transactions',
                type: ui.SublistType.LIST,
                tab: 'custpage_tab'
            });

        
            var taxperiod = '';
            var filingstatus = '';
            var accountingBook = '';

            
            if (!hasDateParams && setDefaultDate == 'T') {

                var fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - 7);
                var toDate = new Date();
                toDate.setDate(toDate.getDate() + 1);

                fromDate = format.format({
                    value: fromDate,
                    type: format.Type.DATE
                });
                toDate = format.format({
                    value: toDate,
                    type: format.Type.DATE
                });

                dateFrom.defaultValue = fromDate
                dateTo.defaultValue = toDate
                params.fromdate = fromDate
                params.todate = toDate

                whtPeriodFld.defaultValue = taxperiod
                params.whtperiod = taxperiod


                whtFilingStatusFld.defaultValue = filingstatus
                params.filingstatus = filingstatus

                
                accountingBookFld.defaultValue = accountingBook
                params.accountingBook = accountingBook


            log.audit(" if (!hasDateParams && setDefaultDate == 'T') ");
            log.audit(" whtFilingStatusFld",whtFilingStatusFld);
            log.audit(" whtPeriodFld",whtPeriodFld);
             

            } else {

                
            log.audit(" else ");
            log.audit(" params.filingstatus", params.filingstatus);
            log.audit(" params.whtperiod", params.whtperiod);


                dateFrom.defaultValue = params.fromdate ? format.format({
                    value: params.fromdate,
                    type: format.Type.DATE
                }) : '';

                dateTo.defaultValue = params.todate ? format.format({
                    value: params.todate,
                    type: format.Type.DATE
                }) : '';

               
                     
                whtPeriodFld.defaultValue = params.whtperiod ? format.format({
                    value: params.whtperiod,
                    type: format.Type.TEXT
                }) : '';


                whtFilingStatusFld.defaultValue = params.filingstatus ? format.format({
                    value: params.filingstatus,
                    type: format.Type.TEXT
                }) : '';

                
                accountingBookFld.defaultValue = params.accountingBook ? format.format({
                    value: params.accountingBook,
                    type: format.Type.TEXT
                }) : '';

            }


            sublist.addMarkAllButtons(); 

            if (!!params.fromdate && !!params.todate) {
                var toDate = params.todate;
                var fromDate = params.fromdate;

                if (!!params.whtperiod) {
                    taxperiod = params.whtperiod;
                }
            
                if (!!params.filingstatus) {
                    filingstatus = params.filingstatus;
                }

                if (!!params.accountingBook) {
                    accountingBook = params.accountingBook;
                }


                let page;
                let startindex;

                if (!!params.page) {
                    page = params.page;
                }

                if (!!params.startindex) {
                    startindex = params.startindex;
                }
                
                var transactionsData = getTransactionsData(toDate, fromDate, taxperiod, filingstatus);

                if (!!transactionsData && transactionsData.length > 0) {
    
                    addPagination(form,transactionsData.length,getPageRangeMap(transactionsData.length), params.page || '1');
                        
                    // let pageSize = constant.PAGE_SIZE;
                    let pageSize = 10;
                    startindex = parseInt(startindex)
                    startindex = startindex ? startindex : 0;
                    let range = parseInt(startindex+pageSize);
                    let j=0;
                    let transactionsPagedList = [];
    
                    log.debug("pageSize: ",pageSize);
    
                    log.debug("startindex: ",startindex);
                    log.debug("range: ",range);
    
                    log.debug("transactionsData before: ",transactionsData);
    
                    for(var i=startindex; i<range; i++){
                        if(transactionsData[i]){
                            transactionsPagedList[j] = transactionsData[i];
                            j++;
                        }
                       
                    }
    
                    log.audit("transactionsPagedList ",transactionsPagedList);
    
    
                    populateSublist(sublist, transactionsPagedList);
    
                }
            }

            response.writePage(form);

        }


        function postHandler(request, response) {


        }

        function addPagination(form, total, pageMap, currentPage) {
            try {
                var pageField = form.addField({
                    id: 'custpage_page',
                    type: ui.FieldType.SELECT,
                    label: 'Select Page',
                    container: 'custpage_tab'
    
                });
    
                // var totalRecordsFld = form.addField({
                //     id: 'custpage_selected_count',
                //     type: ui.FieldType.TEXT,
                //     label: 'Total Records To Process',
                //     container: 'custpage_tab'
                // });
    
    
                // totalRecordsFld.updateDisplayType({
                //     displayType: ui.FieldDisplayType.INLINE
                // });
    
    
    
                Object.keys(pageMap).forEach(function (page) {
    
                    pageField.addSelectOption({
                        value: pageMap[page.toString()],
                        text: page
                    });
                    pageField.defaultValue = pageMap[currentPage.toString()];
                });
            }
            catch (e) {
                log.error('Error::addPagination', e);
            }
    
    
        }
    

        function getPageRangeMap(totalCount) {
            try {
    
    
                // let pageSize = constant.PAGE_SIZE; 
                let pageSize = 10;
                var pages = Math.ceil(totalCount / pageSize);
                log.debug("totalCount ::  ", totalCount);
                log.debug("pageSize ::  ", pageSize);
                log.debug("pages :  ", pages);
                var limit = 0;
                var pageMap = {}
                pageMap['1'] = 0
                for (var i = 2; i <= pages; i++) {
                    limit = limit + pageSize
                    pageMap[i.toString()] = limit
                }
                log.debug("pages :  ", pageMap);
                return pageMap;
            }
            catch (e) {
                log.error('Error::getPageRangeMap', e);
            }
    
        }


        
    function populateSublist(sublist, results) {

        log.audit("results[0].id: ", results[0].id);
        log.audit("results[0].columns : ", results[0].columns);


        var columns = results[0].columns;

        log.debug("columns", columns)
        log.debug("columns[0].name", columns[0].name)
        log.debug("columns[0].label", columns[0].label)
        log.debug("columns[0].type", columns[0].type)
 

        columns = JSON.parse(JSON.stringify(columns));

        sublist.addField({ id: 'custpage_select', label: 'Select', type: ui.FieldType.CHECKBOX });

        for (var i = 0; i < columns.length; i++) {
            var subFieldObj = { id: 'custpage_' + columns[i].name, label: columns[i].label, type: 'text' };

            log.audit("subFieldObj", subFieldObj);
            if (columns[i].type == 'select' && columns[i].name == 'postingperiod') {
                subFieldObj['source'] = 'accountingperiod';
            }

            if (columns[i].type == 'select' && columns[i].name == 'class') {
                subFieldObj['source'] = '-101';
            }

            if (columns[i].type == 'select' && columns[i].name == 'entity') {
                subFieldObj['source'] = '-2';
            }

            if (columns[i].type == 'select' && columns[i].name == 'accountingperiod') {
                subFieldObj['source'] = '-127'
            } 

            
            // if (columns[i].type == 'date' && columns[i].name == 'trandate') {
            //     subFieldObj['type'] = ui.FieldType.DATETIMETZ;
            // }

            var fld = sublist.addField(subFieldObj);
            if (subFieldObj.type == 'select') {
                fld.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
            }
            if (columns[i].type == 'select' && columns[i].name == 'internalid') {
                fld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
            }
            if (columns[i].type == 'select' && columns[i].name == 'postingperiod') {
                fld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
            }
        }


        let recordId = '';
        let recordType = '';

        for (var i = 0; i < results.length; i++) {
            for (var j = 0; j < columns.length; j++) {
                
                if (columns[j].name === 'type') {
                    recordType = results[i].getValue(columns[j]);
                }
                if (columns[j].name === 'internalid') {
                    recordId = results[i].getValue(columns[j]);
                }
            }
        }

        log.audit('recordId',recordId);
        log.audit('recordType',recordType);

        if(recordType=='VendPymt'){
            recordType = 'vendorpayment'
        }
        if(recordType=='CustPymt'){
            recordType = 'customerpayment'
        }

        log.audit('recordType after',recordType);
        


        for (var i = 0; i < results.length; i++) {
            for (var j = 0; j < columns.length; j++) {

            
                var val  = '';

                if(columns[j].type == 'select'){
                    val = results[i].getText(columns[j]);
                }
                else{
                    val = results[i].getValue(columns[j]);
                }



                log.audit('columns[j]',columns[j].name);
                
                log.audit('val',val);
        
                
                log.audit('recordType',recordType);
                
             
                


                if (columns[j].name === 'tranid' && !!val) {

                    var transactionURL = url.resolveRecord({
                        recordType: recordType,
                        recordId: recordId
                    });

                     log.audit('transactionURL',transactionURL);
        
        
                    sublist.setSublistValue({
                        id: 'custpage_' + columns[j].name,
                        value: '<a href="' + transactionURL + '" target="_blank">' + val + '</a>',
                        line: i
                    });
                } else if(!!val) {
                    sublist.setSublistValue({
                        id: 'custpage_' + columns[j].name,
                        value: val,
                        line: i
                    });
                }
            }
        }
        
    
        // for (var i = 0; i < results.length; i++) {
        //     for (var j = 0; j < columns.length; j++) {
        //         var val = results[i].getValue(columns[j]);
        //         !!val ? sublist.setSublistValue({ id: 'custpage_' + columns[j].name, value: val, line: i }) : ''
        //     } 
        // }

    }
    
       
    function getTransactionsData(toDate, fromDate, taxperiod, filingstatus) {
        try {

        
            var filters1 = [
                ["mainline", "is", "F"],
                "AND",
                ["custcol_ps_wht_tax_code", "anyof", undueTaxCodeId],
                "AND",
                ["type", "anyof", "Check", "CashSale"],
                "AND",
                ["trandate", "within", fromDate, toDate],
                // "AND",
                // ["custbody_ps_wht_tax_period", "anyof", taxperiod],
                // "AND",
                // ["custbody_ps_wht_filing_status", "anyof", filingstatus],
               
            ];
    
            var filters2 = [
                ["type", "anyof", "VendPymt", "CustPymt"],
                "AND",
                ["mainline", "is", "T"],
                // "AND",
                // ["custbody_ps_wht_bill_lines_data", "contains", "\"taxCode\":\"28\""],
                "AND",
                ["trandate", "within", fromDate, toDate],
                // "AND",
                // ["custbody_ps_wht_tax_period", "anyof", taxperiod],
                // "AND",
                // ["custbody_ps_wht_filing_status", "anyof", filingstatus],
             
            ];

            if (taxperiod) {
                filters1.push("AND",["custbody_ps_wht_tax_period","anyof",taxperiod])
                filters2.push("AND",["custbody_ps_wht_tax_period","anyof",taxperiod])
            }

            if (filingstatus) {
                filters1.push("AND", ["custbody_ps_wht_filing_status","anyof",filingstatus])
                filters2.push("AND", ["custbody_ps_wht_filing_status","anyof",filingstatus])
            }

         
            
    
            // Combine both sets of filters using OR condition
            var combinedFilters = filters1.concat("OR", filters2);
    
            var transactionSearchObj = search.create({
                type: "transaction",
                filters: combinedFilters,
                columns: [
                    search.createColumn({
                        name: "trandate",
                        summary: "GROUP",
                        label: "Date"
                    }),
                    search.createColumn({
                        name: "tranid",
                        summary: "GROUP",
                        label: "Document Number"
                    }),
                    search.createColumn({
                        name: "type",
                        summary: "GROUP",
                        label: "Type"
                    }),
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "Internal Id"
                    }),
                    search.createColumn({
                        name: "taxperiod",
                        summary: "GROUP",
                        label: "Tax Period"
                    }),
                    search.createColumn({
                        name: "entity",
                        summary: "GROUP",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "amount",
                        summary: "SUM",
                        label: "Amount"
                    }),
                    search.createColumn({
                        name: "custbody_ps_wht_condition",
                        summary: "GROUP",
                        label: "PS WHT Condition"
                    }),
                    search.createColumn({
                        name: "custbody_ps_wht_filing_status",
                        summary: "GROUP",
                        label: "PS Filing Status"
                    })
                ]
            });
    
            var searchResults = transactionSearchObj.run();
            var whtTransactionsList = searchResults.getRange({
                start: 0,
                end: 1000
            });
    

            log.error('whtTransactionsList',whtTransactionsList);



            return whtTransactionsList;
        } catch (e) {
            log.error('Error::getTransactionsData', e);
        }
    }
    

        function getRecordsList(type) {
            try {

                let customrecord_ps_tht_wht_categorySearchObj = search.create({
                    type: type,
                    filters: [],
                    columns: [
                        "internalid", "name"
                    ]
                });
                let reportResults = customrecord_ps_tht_wht_categorySearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });

                let internalId;
                let name;
                let data = [];

                log.debug("reportResults: " + type, reportResults)

                for (let i in reportResults) {
                    internalId = reportResults[i].getValue('internalid')
                    name = reportResults[i].getValue('name')
                    data.push({ id: internalId, name: name })
                }

                log.debug("data: ", data)

                return data

            } catch (e) {
                log.debug("error: ", e.message)
                return [{ id: '', name: '' }]
            }

        }


       
        


        function isNull(value) {
            if ((value != null) && (value != 'null') && (value != '') && (value != undefined) && (value != 'undefined') && (value != 'NaN') && (value != ' ')) return value;
            else return '';
        }


       


        return {
            onRequest: onRequest
        };
    });